#!/usr/bin/env ts-node
/*
  tools/import_dispos.ts
  - Parse Excel sheet (default: "Dispos") provided as CLI arg
  - Detect header row (Nom/Prénom/METIER ...), find dates row above, expand triplets [Lieu, Heure DEBUT, Heure FIN]
  - Normalize rows into long format per person/date
  - Idempotent upsert into Firestore via firebase-admin
  - Use emulator if EMULATOR=1
  - Option --csv to export normalized CSV instead of writing
*/

import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import XLSX from 'xlsx'
import Papa from 'papaparse'
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Types
export interface RecordLong {
  tenantId: string
  nom: string
  prenom: string
  metier?: string
  phone?: string
  email?: string
  ville?: string
  date: string // YYYY-MM-DD
  lieu?: string
  heure_debut?: string // HH:MM
  heure_fin?: string // HH:MM
}

function isExcelTime(value: unknown): boolean {
  return typeof value === 'number' && value >= 0 && value < 1.0
}

export function excelTimeToHHMM(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  if (typeof value === 'string') {
    // Already a time-like string
    const m = value.match(/^(\d{1,2}):(\d{2})/)
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  }
  if (!isExcelTime(value)) return undefined
  const totalMinutes = Math.round((value as number) * 24 * 60)
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function normalizeDate(input: any): string | undefined {
  // Accept Excel date number or string like dd/mm/yyyy or yyyy-mm-dd
  if (input == null || input === '') return undefined
  if (typeof input === 'number') {
    const d = XLSX.SSF.parse_date_code(input)
    if (!d) return undefined
    const yyyy = String(d.y).padStart(4, '0')
    const mm = String(d.m).padStart(2, '0')
    const dd = String(d.d).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  const s = String(input).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const fr = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)
  if (fr) {
    const dd = fr[1].padStart(2, '0')
    const mm = fr[2].padStart(2, '0')
    const yyyy = fr[3].length === 2 ? `20${fr[3]}` : fr[3]
    return `${yyyy}-${mm}-${dd}`
  }
  return undefined
}

function detectHeaderRow(matrix: any[][]): { headerRow: number; dateRow: number; columns: string[] } {
  // Find row containing Nom & Prénom & METIER (case-insensitive)
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r].map((x) => (x == null ? '' : String(x).toLowerCase()))
    const hasNom = row.some((c) => c.includes('nom'))
    const hasPrenom = row.some((c) => c.includes('prénom') || c.includes('prenom'))
    const hasMetier = row.some((c) => c.includes('métier') || c.includes('metier'))
    if (hasNom && hasPrenom && hasMetier) {
      const dateRow = Math.max(0, r - 1)
      return { headerRow: r, dateRow, columns: matrix[r].map((x) => (x == null ? '' : String(x))) }
    }
  }
  throw new Error('Impossible de détecter la ligne d\'entête (Nom/Prénom/METIER).')
}

function expandDateTriplets(dateRow: any[], startCol: number): { dateColRanges: Array<{ date: string; from: number; to: number }> } {
  const ranges: Array<{ date: string; from: number; to: number }> = []
  let c = startCol
  while (c < dateRow.length) {
    const d = normalizeDate(dateRow[c])
    if (!d) break
    ranges.push({ date: d, from: c, to: c + 2 })
    c += 3
  }
  return { dateColRanges: ranges }
}

export function parseWorkbook(filePath: string, sheetName = 'Dispos') {
  if (!fs.existsSync(filePath)) throw new Error(`Fichier introuvable: ${filePath}`)
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error(`Onglet introuvable: ${sheetName}`)
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any
  if (!rows.length) return { records: [] as RecordLong[], columns: [] as string[] }

  const { headerRow, dateRow } = detectHeaderRow(rows)
  const header = rows[headerRow]

  // Find first date triplet column: immediately after fixed left columns (Nom/Prénom/METIER etc.)
  // We search for first column in dateRow that normalizes to a date
  let firstDateCol = header.length
  for (let c = 0; c < rows[dateRow].length; c++) {
    if (normalizeDate(rows[dateRow][c])) { firstDateCol = c; break }
  }
  const { dateColRanges } = expandDateTriplets(rows[dateRow], firstDateCol)

  // Map base columns indices
  const lower = header.map((h: any) => String(h || '').toLowerCase())
  const idxNom = lower.findIndex((c: string) => c.includes('nom'))
  const idxPrenom = lower.findIndex((c: string) => c.includes('prénom') || c.includes('prenom'))
  const idxMetier = lower.findIndex((c: string) => c.includes('métier') || c.includes('metier'))
  const idxPhone = lower.findIndex((c: string) => c.includes('téléphone') || c.includes('telephone') || c.includes('phone'))
  const idxEmail = lower.findIndex((c: string) => c.includes('email') || c.includes('mail'))
  const idxVille = lower.findIndex((c: string) => c.includes('ville'))

  const dataRows = rows.slice(headerRow + 1)
  const records: RecordLong[] = []

  for (const row of dataRows) {
    const nom = (row[idxNom] ?? '').toString().trim()
    const prenom = (row[idxPrenom] ?? '').toString().trim()
    const metier = idxMetier >= 0 ? (row[idxMetier] ?? '').toString().trim() : undefined
    const phone = idxPhone >= 0 ? (row[idxPhone] ?? '').toString().trim() : undefined
    const email = idxEmail >= 0 ? (row[idxEmail] ?? '').toString().trim() : undefined
    const ville = idxVille >= 0 ? (row[idxVille] ?? '').toString().trim() : undefined

    if (!nom && !prenom) continue

    for (const rng of dateColRanges) {
      const lieuRaw = row[rng.from]
      const hdRaw = row[rng.from + 1]
      const hfRaw = row[rng.from + 2]

      const lieu = lieuRaw ? String(lieuRaw).trim() : ''
      const heure_debut = excelTimeToHHMM(hdRaw) || (typeof hdRaw === 'string' ? hdRaw : undefined)
      const heure_fin = excelTimeToHHMM(hfRaw) || (typeof hfRaw === 'string' ? hfRaw : undefined)

      if (!lieu && !heure_debut && !heure_fin) continue // ignore empty

      records.push({
        tenantId: '', // filled later via CLI option
        nom,
        prenom,
        metier,
        phone,
        email,
        ville,
        date: rng.date,
        lieu: lieu || undefined,
        heure_debut,
        heure_fin,
      })
    }
  }

  return { records, columns: header }
}

export function deterministicId(tenantId: string, r: RecordLong): string {
  const base = `${tenantId}::${r.nom}::${r.prenom}::${r.date}`.toLowerCase()
  // Replace non URL-safe chars
  return base.replace(/[^a-z0-9:.-]/g, '_')
}

async function upsertDispos(records: RecordLong[], tenantId: string) {
  const db = getFirestore()
  const BATCH_LIMIT = 500
  let written = 0
  let skipped = 0

  for (let i = 0; i < records.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    const slice = records.slice(i, i + BATCH_LIMIT)
    for (const r of slice) {
      const id = deterministicId(tenantId, r)
      const ref = db.collection('dispos').doc(id)
      const payload: any = {
        tenantId,
        nom: r.nom,
        prenom: r.prenom,
        metier: r.metier ?? null,
        phone: r.phone ?? null,
        email: r.email ?? null,
        ville: r.ville ?? null,
        date: r.date,
        lieu: r.lieu ?? null,
        heure_debut: r.heure_debut ?? null,
        heure_fin: r.heure_fin ?? null,
        version: 1,
        updatedAt: new Date(),
        updatedBy: 'importer',
      }
      batch.set(ref, payload, { merge: true })
      written++
    }
    await batch.commit()
  }
  return { written, skipped }
}

function ensureFirebaseAdmin() {
  const useEmu = process.env.EMULATOR === '1' || process.env.FIRESTORE_EMULATOR_HOST
  if (useEmu) {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099'
  }

  if (!getFirestore as any) {
    // noop to satisfy TS guard
  }

  if (!(global as any).__firebase_admin_inited) {
    initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'keydispo-local' })
    ;(global as any).__firebase_admin_inited = true
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      sheet: { type: 'string', default: 'Dispos' },
      tenant: { type: 'string', default: 'tenant-dev' },
      csv: { type: 'boolean', default: false },
      emulator: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  })

  const [file] = positionals
  if (!file) {
    console.error('Usage: npx tsx tools/import_dispos.ts <path-to-excel> [--sheet Dispos] [--tenant keydispo] [--csv] [--emulator]')
    process.exit(1)
  }

  if (values.emulator) process.env.EMULATOR = '1'
  ensureFirebaseAdmin()

  const { records } = parseWorkbook(path.resolve(file), String(values.sheet))
  const tenantId = String(values.tenant)

  // Fill tenantId
  const filled = records.map((r) => ({ ...r, tenantId }))

  if (values.csv) {
    const csv = Papa.unparse(
      filled.map((r) => ({
        tenantId: r.tenantId,
        nom: r.nom,
        prenom: r.prenom,
        metier: r.metier || '',
        phone: r.phone || '',
        email: r.email || '',
        ville: r.ville || '',
        date: r.date,
        lieu: r.lieu || '',
        heure_debut: r.heure_debut || '',
        heure_fin: r.heure_fin || '',
      }))
    )
    const out = path.resolve(process.cwd(), 'dispos-normalise.csv')
    fs.writeFileSync(out, csv, 'utf8')
    console.log(`✅ CSV écrit: ${out}`)
    return
  }

  const stats = await upsertDispos(filled, tenantId)
  console.log(`✅ Import terminé. Écrits=${stats.written}, Ignorés=${stats.skipped}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('❌ Import échoué:', err)
    process.exit(1)
  })
}
