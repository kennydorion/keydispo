import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

// Réutilisation minimale des fonctions de parse (copie légère pour script Node)
function parseFrDate(val: unknown): string | null {
  if (val == null) return null
  const s = String(val).toLowerCase().replace(/\s+/g, ' ').trim()
    .replace(/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+/, '')
  const match = s.match(/(\d{1,2})\s+([a-zéèêàâîïôûùç]+)\s+(\d{4})/i)
  if (!match) return null
  const [, day, month, year] = match
  const monthMap: Record<string, string> = {
    janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05',
    juin: '06', juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10',
    novembre: '11', decembre: '12', décembre: '12'
  }
  const normalizedMonth = month.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const mm = monthMap[month] || monthMap[normalizedMonth]
  if (!mm) return null
  return `${year}-${mm}-${String(Number(day)).padStart(2, '0')}`
}

function excelTimeToHHMM(val: unknown): string | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') {
    const minutes = Math.round(val * 24 * 60)
    const hh = Math.floor(minutes / 60)
    const mm = minutes % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  const s = String(val).trim()
  const match1 = s.match(/^(\d{1,2})[:h\.](\d{1,2})$/)
  if (match1) return `${String(+match1[1]).padStart(2, '0')}:${String(+match1[2]).padStart(2, '0')}`
  const match2 = s.match(/^(\d{1,2})$/)
  if (match2) return `${String(+match2[1]).padStart(2, '0')}:00`
  return s.length > 0 ? s : null
}

interface DateBlock { date: string; colLieu?: number; colHd?: number; colHf?: number }

function buildDateBlocks(aoa: any[][], headerRow: number) {
  const dateRow = headerRow - 1
  const headers = aoa[headerRow] || []
  const dates = aoa[dateRow] || []
  const dateCols: Array<{ col: number; date: string }> = []
  for (let c = 0; c < dates.length; c++) {
    const d = parseFrDate(dates[c])
    if (d) dateCols.push({ col: c, date: d })
  }
  const blocks: DateBlock[] = []
  for (const { col, date } of dateCols) {
    const windowEnd = Math.min(headers.length - 1, col + 6)
    const slice = headers.slice(col, windowEnd + 1).map((x: any) => String(x || '').toLowerCase())
    const local: DateBlock = { date }
    for (let i = 0; i < slice.length; i++) {
      const h = slice[i]
      if (local.colLieu == null && /lieu/.test(h)) local.colLieu = col + i
      else if (local.colHd == null && /(debut|début)/.test(h)) local.colHd = col + i
      else if (local.colHf == null && /fin/.test(h)) local.colHf = col + i
    }
    blocks.push(local)
  }
  return blocks
}

function detectHeaderRow(aoa: any[][]): number {
  for (let r = 0; r < Math.min(50, aoa.length); r++) {
    const row = (aoa[r] || []).map(String).map(s => s.trim().toLowerCase())
    const iNom = row.findIndex(c => c === 'nom')
    const hasPrenom = row.some(c => c === 'prénom' || c === 'prenom')
    const hasMetier = row.some(c => c === 'métier' || c === 'metier')
    if (iNom >= 0 && hasPrenom && hasMetier) return r
  }
  throw new Error('Header introuvable')
}

function weekNumber(isoDate: string) {
  const d = new Date(isoDate + 'T00:00:00Z')
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.floor(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Usage: ts-node tools/validate_excel_dispos.ts <fichier.xlsx>')
    process.exit(1)
  }
  const full = path.resolve(fileArg)
  if (!fs.existsSync(full)) {
    console.error('Fichier introuvable:', full)
    process.exit(1)
  }
  const wb = XLSX.readFile(full, { cellDates: false })
  let sheetName = 'Dispos'
  if (!wb.Sheets[sheetName]) sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null })
  const headerRow = detectHeaderRow(aoa)
  const blocks = buildDateBlocks(aoa, headerRow)
  const dates = blocks.map(b => b.date)
  const distinct = Array.from(new Set(dates)).sort()
  const weeks = new Set(distinct.map(d => weekNumber(d)))
  const targetWeek = 39
  const week39Dates = distinct.filter(d => weekNumber(d) === targetWeek)
  console.log('--- Analyse Dates ---')
  console.log('Total colonnes date détectées:', dates.length)
  console.log('Jours distincts:', distinct.length)
  console.log('Semaines couvertes:', Array.from(weeks).sort().join(','))
  console.log(`Dates semaine ${targetWeek}:`, week39Dates.join(',') || '(aucune)')
  const missing = week39Dates.length === 0
  if (missing) {
    console.log('⚠️ Aucune date de la semaine 39 détectée')
  } else {
    console.log('✅ Semaine 39 couverte')
  }
}

if (require.main === module) {
  main()
}
