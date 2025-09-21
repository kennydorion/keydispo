import * as XLSX from 'xlsx'
import type { 
  NormalizedRow, 
  ParseResult
} from './types'

/**
 * Détecte dynamiquement la ligne d'entête avec Nom/Prénom/METIER
 */
export function detectHeaderRow(aoa: any[][]): number {
  for (let r = 0; r < Math.min(50, aoa.length); r++) {
    const row = (aoa[r] || []).map(String).map(s => s.trim().toLowerCase())
    
    const iNom = row.findIndex(c => c === 'nom')
    const hasPrenom = row.some(c => c === 'prénom' || c === 'prenom')
    const hasMetier = row.some(c => c === 'métier' || c === 'metier')
    
    if (iNom >= 0 && hasPrenom && hasMetier) {
      console.log(`📍 Entête détecté ligne ${r + 1}:`, row.slice(0, 10))
      return r
    }
  }
  throw new Error('❌ Entête Nom/Prénom/METIER introuvable dans les 50 premières lignes')
}

/**
 * Parse une date française en format ISO YYYY-MM-DD
 */
export function parseFrDate(val: unknown): string | null {
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
  
  // Gestion des accents
  const normalizedMonth = month.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const mm = monthMap[month] || monthMap[normalizedMonth]
  
  if (!mm) {
    console.warn(`⚠️ Mois non reconnu: "${month}"`)
    return null
  }
  
  return `${year}-${mm}-${String(Number(day)).padStart(2, '0')}`
}

/**
 * Convertit une heure Excel en format HH:MM
 */
export function excelTimeToHHMM(val: unknown): string | null {
  if (val == null || val === '') return null
  
  // Heure Excel en nombre décimal (0.5 = 12:00)
  if (typeof val === 'number') {
    const minutes = Math.round(val * 24 * 60)
    const hh = Math.floor(minutes / 60)
    const mm = minutes % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  
  const s = String(val).trim()
  
  // Format HH:MM ou HH.MM ou HHhMM
  const match1 = s.match(/^(\d{1,2})[:h\.](\d{1,2})$/)
  if (match1) {
    return `${String(+match1[1]).padStart(2, '0')}:${String(+match1[2]).padStart(2, '0')}`
  }
  
  // Format HH seulement
  const match2 = s.match(/^(\d{1,2})$/)
  if (match2) {
    return `${String(+match2[1]).padStart(2, '0')}:00`
  }
  
  // Laisser tel quel si autre format
  return s.length > 0 ? s : null
}

/**
 * Génère un slug stable pour un collaborateur
 */
export function slugify(nom: string, prenom: string): string {
  const clean = (str: string) => str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  
  return `${clean(nom)}-${clean(prenom)}`
}

/**
 * Construit les blocs de colonnes par date
 */
export function buildDateBlocks(aoa: any[][], headerRow: number) {
  const dateRow = headerRow - 1
  const headers = aoa[headerRow] || []
  const dates = aoa[dateRow] || []

  // Collecte de toutes les colonnes contenant une date parseable (tolérant colonnes parasites)
  const dateCols: Array<{ col: number; date: string }> = []
  for (let c = 0; c < dates.length; c++) {
    const d = parseFrDate(dates[c])
    if (d) dateCols.push({ col: c, date: d })
  }
  if (!dateCols.length) {
    throw new Error('❌ Aucune date détectée dans la ligne des dates (au-dessus de l\'entête).')
  }

  // Heuristique: pour chaque date trouvée, rechercher dans une fenêtre [col, col+6]
  // les colonnes header correspondantes à Lieu / Heure DEBUT / Heure FIN (ordre quelconque)
  const blocks: Array<{ date: string; colLieu?: number; colHd?: number; colHf?: number }> = []
  for (const { col, date } of dateCols) {
    const windowStart = col
    const windowEnd = Math.min(headers.length - 1, col + 6) // limite de sécurité
    const slice = headers.slice(windowStart, windowEnd + 1).map((x: any) => String(x || '').toLowerCase())

    const local: { date: string; colLieu?: number; colHd?: number; colHf?: number } = { date }
    for (let i = 0; i < slice.length; i++) {
      const h = slice[i]
      if (local.colLieu == null && /lieu/.test(h)) local.colLieu = windowStart + i
      else if (local.colHd == null && /(debut|début)/.test(h)) local.colHd = windowStart + i
      else if (local.colHf == null && /fin/.test(h)) local.colHf = windowStart + i
    }
    // Même si on n'a pas les trois (certains statuts pleine journée ne fournissent que "Lieu"), on garde le bloc
    blocks.push(local)
  }

  // Détection d'un éventuel tronquage: dernière date trouvée vs dernière date textuelle brute
  const lastDetected = dateCols[dateCols.length - 1].date
  // Recherche naïve de la dernière date brute en scannant depuis la fin
  let lastRaw: string | null = null
  for (let c = dates.length - 1; c >= 0; c--) {
    const d = parseFrDate(dates[c])
    if (d) { lastRaw = d; break }
  }
  if (lastRaw && lastRaw !== lastDetected) {
    console.warn(`⚠️ Incohérence potentielle: dernière date détectée=${lastDetected} mais dernière date brute=${lastRaw}`)
  }

  console.log(`📊 ${blocks.length} blocs (dynamiques) détectés sur ${dateCols.length} colonnes date.`)
  return { startCol: dateCols[0].col, blocks }
}

/**
 * Parse un workbook Excel et retourne les données normalisées
 */
export function parseWorkbook(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Cherche l'onglet "Dispos"
        let sheetName = 'Dispos'
        if (!workbook.Sheets[sheetName]) {
          // Fallback sur le premier onglet
          sheetName = workbook.SheetNames[0]
          console.warn(`⚠️ Onglet "Dispos" introuvable, utilisation de "${sheetName}"`)
        }
        
        const worksheet = workbook.Sheets[sheetName]
        const aoa = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          raw: false,
          defval: null 
        }) as any[][]
        
        console.log(`📖 Lecture de l'onglet "${sheetName}" (${aoa.length} lignes)`)
        
        const result = parseAOA(aoa)
        resolve(result)
        
      } catch (error) {
        console.error('❌ Erreur parsing Excel:', error)
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Erreur lecture fichier'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse un array of arrays en données normalisées
 */
function parseAOA(aoa: any[][]): ParseResult {
  const warnings: string[] = []
  const data: NormalizedRow[] = []
  
  try {
    // 1. Détection de l'entête
    const headerRow = detectHeaderRow(aoa)
    const headers = aoa[headerRow] || []
    
    // 2. Mapping des colonnes fixes
    const colMapping = buildColumnMapping(headers)
    console.log('📋 Mapping colonnes:', colMapping)
    
    // 3. Détection des blocs de dates
    const { blocks } = buildDateBlocks(aoa, headerRow)
    
    // 4. Parse des données
    const collaborateurs = new Set<string>()
    
    for (let r = headerRow + 1; r < aoa.length; r++) {
      const row = aoa[r] || []
      if (row.length === 0) continue
      
      // Extraction des colonnes fixes
      const nom = String(row[colMapping.nom] || '').trim()
      const prenom = String(row[colMapping.prenom] || '').trim()
      const metier = String(row[colMapping.metier] || '').trim()
      
      if (!nom || !prenom) {
        warnings.push(`Ligne ${r + 1}: Nom ou prénom manquant`)
        continue
      }
      
      const collaborateurBase = {
        nom,
        prenom,
        metier,
        phone: String(row[colMapping.phone] || '').trim() || undefined,
        email: String(row[colMapping.email] || '').trim() || undefined,
        ville: String(row[colMapping.ville] || '').trim() || undefined
      }
      
      collaborateurs.add(slugify(nom, prenom))
      
      // Parse des disponibilités pour chaque date
      for (const block of blocks) {
        const rawLieu = block.colLieu !== undefined ? String(row[block.colLieu] || '').trim() : ''
        const lieu = rawLieu || null
        const heureDebut = block.colHd !== undefined ? excelTimeToHHMM(row[block.colHd]) : null
        const heureFin = block.colHf !== undefined ? excelTimeToHHMM(row[block.colHf]) : null

        // Interprétation des statuts textuels pleines journées dans la colonne "Lieu"
        const upperLieu = (rawLieu || '').toUpperCase()
        let interpreted = { lieu: lieu as string | null, heure_debut: heureDebut, heure_fin: heureFin }
        if (upperLieu === 'DISPO JOURNEE' || upperLieu === 'DISPO' || upperLieu === 'DISPONIBLE') {
          interpreted = { lieu: '', heure_debut: null, heure_fin: null }
        } else if (upperLieu === 'INDISPONIBLE') {
          interpreted = { lieu: 'INDISPONIBLE', heure_debut: null, heure_fin: null }
        }

        // Créer l'enregistrement si un des éléments est renseigné ou si statut interprété
        if (interpreted.lieu || interpreted.heure_debut || interpreted.heure_fin || upperLieu === 'INDISPONIBLE' || upperLieu.startsWith('DISPO')) {
          data.push({
            ...collaborateurBase,
            date: block.date,
            lieu: interpreted.lieu || undefined,
            heure_debut: interpreted.heure_debut || undefined,
            heure_fin: interpreted.heure_fin || undefined
          })
        }
      }
    }
    
    console.log(`✅ Parse terminé: ${data.length} disponibilités, ${collaborateurs.size} collaborateurs`)

    // Vérification couverture temporelle (simple warning si trous majeurs)
    const datesList = data.map(d => d.date).sort()
    if (datesList.length) {
      const first = datesList[0]
      const last = datesList[datesList.length - 1]
      const spanDays = (new Date(last).getTime() - new Date(first).getTime()) / 86400000
      // Si plus de 180 jours entre first & last mais moins de 60 dates distinctes => suspicion de trous
      const distinct = new Set(datesList).size
      if (spanDays > 180 && distinct < 60) {
        warnings.push('Couverture de dates clairsemée: de ' + first + ' à ' + last + ' mais seulement ' + distinct + ' jours distincts. Vérifier l\'alignement des colonnes dans Excel.')
      }
    }
    
    return {
      data,
      stats: {
        totalRows: aoa.length - headerRow - 1,
        validRows: data.length,
        collaborateursUniques: collaborateurs.size,
        warnings
      }
    }
    
  } catch (error) {
    throw new Error(`Erreur parsing: ${error}`)
  }
}

/**
 * Construit le mapping des colonnes fixes
 */
function buildColumnMapping(headers: any[]) {
  const headerStrings = headers.map(h => String(h || '').toLowerCase().trim())
  
  const mapping = {
    nom: findColumn(headerStrings, ['nom']),
    prenom: findColumn(headerStrings, ['prénom', 'prenom']),
  // Étend les synonymes et privilégie la correspondance exacte « metier/métier »
  metier: findColumn(headerStrings, ['métier', 'metier', 'profession', 'poste', 'fonction']),
    phone: findColumn(headerStrings, ['téléphone mobile', 'telephone', 'phone', 'mobile']),
    email: findColumn(headerStrings, ['e-mail', 'email', 'mail']),
    ville: findColumn(headerStrings, ['ville'])
  }
  
  // Vérification des colonnes obligatoires
  if (mapping.nom === -1) throw new Error('Colonne "Nom" introuvable')
  if (mapping.prenom === -1) throw new Error('Colonne "Prénom" introuvable')
  if (mapping.metier === -1) throw new Error('Colonne "Métier" introuvable')
  
  return mapping
}

/**
 * Trouve l'index d'une colonne par ses noms possibles
 */
function findColumn(headers: string[], possibleNames: string[]): number {
  // Normalisation: minuscules + suppression des accents
  const norm = (s: string) => s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

  const headersNorm = headers.map(norm)
  const namesNorm = possibleNames.map(norm)

  // 1) Correspondance exacte (meilleure priorité)
  for (const name of namesNorm) {
    const idx = headersNorm.findIndex(h => h === name)
    if (idx >= 0) return idx
  }

  // 2) Correspondance par token (mot isolé) en évitant "metier appris" & co
  for (const name of namesNorm) {
    for (let i = 0; i < headersNorm.length; i++) {
      const h = headersNorm[i]
      const tokens = h.split(/[^a-z0-9]+/).filter(Boolean)
      if (tokens.includes(name)) {
        // Évite les colonnes parasites type "métier appris", "apprentissage", etc.
        if (h.includes('appris') || h.includes('apprent')) continue
        return i
      }
    }
  }

  // 3) Fallback: recherche par inclusion avec scoring simple
  let bestIdx = -1
  let bestScore = -Infinity
  for (const name of namesNorm) {
    for (let i = 0; i < headersNorm.length; i++) {
      const h = headersNorm[i]
      if (!h.includes(name)) continue
      let score = 10
      if (h === name) score += 100
      if (h.startsWith(name)) score += 5
      // Favorise les libellés courts et pénalise les variantes "appris"
      score -= h.length
      if (h.includes('appris') || h.includes('apprent')) score -= 50
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
  }
  return bestIdx
}
