// Normalisation métier (lieux, statuts encodés dans "lieu")

export const STATUS_SET = new Set<string>([
  'INDISPONIBLE',
  'DISPONIBLE',
  'DISPO',
  'DISPO JOURNEE',
  'DISPO JOURNÉE',
])

function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function canonicalizeLieu(lieu: string | null | undefined): string {
  if (!lieu) return ''
  const raw = String(lieu).trim()
  if (!raw) return ''
  const s = stripDiacritics(raw).toLowerCase()

  // Statuts fréquents encodés comme lieux
  if (s === 'indisponible' || s === 'absent' || s === 'unavailable' || s === 'indispo') return 'INDISPONIBLE'
  if (s === 'disponible' || s === 'dispo' || s === 'dispo journee' || s === 'dispo journe' || s === 'journee' || s === 'journe') return 'DISPO JOURNEE'

  // Lieux usuels
  if (s === 'sous balme' || s === 'sous-balme') return 'SOUS BALME'

  // Par défaut: upper-case sans diacritiques
  return stripDiacritics(raw).toUpperCase()
}

export function isStatusLieu(lieu: string | null | undefined): boolean {
  const c = canonicalizeLieu(lieu)
  return c === 'INDISPONIBLE' || c === 'DISPO JOURNEE'
}

export type DispoType = 'mission' | 'disponible' | 'indisponible'
export type TimeKind = 'range' | 'slot' | 'full-day'
export type Slot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'

const SLOT_PATTERNS: Array<{re: RegExp, slot: Slot}> = [
  { re: /\bmatin(ee)?\b/i, slot: 'morning' },
  { re: /\bmi\s?-?journ[ée]e?\b/i, slot: 'midday' },
  { re: /apres[ -]?midi|après[ -]?midi|pm\b/i, slot: 'afternoon' },
  { re: /\bsoir(ée)?\b/i, slot: 'evening' },
  { re: /\bnuit\b/i, slot: 'night' },
]

export function detectSlotsFromText(text: string | null | undefined): Slot[] {
  if (!text) return []
  const slots = new Set<Slot>()
  for (const { re, slot } of SLOT_PATTERNS) {
    if (re.test(text)) slots.add(slot)
  }
  return Array.from(slots)
}

export function normalizeDispo(input: {
  date: string
  lieu?: string | null
  heure_debut?: string | null
  heure_fin?: string | null
}): {
  type: DispoType
  timeKind: TimeKind
  slots?: Slot[]
  isFullDay?: boolean
  lieu?: string | null
  heure_debut?: string | null
  heure_fin?: string | null
} {
  const canon = canonicalizeLieu(input.lieu || '')
  const slots = detectSlotsFromText(input.lieu || '')
  const hasHours = !!(input.heure_debut && input.heure_fin)

  // Indisponible (prioritaire et journée entière par défaut)
  if (canon === 'INDISPONIBLE') {
    return {
      type: 'indisponible',
      timeKind: 'full-day',
      isFullDay: true,
      lieu: null,
      heure_debut: null,
      heure_fin: null,
    }
  }

  // Disponible (sans mission): via mots-clés ou DISPO JOURNEE
  if (canon === 'DISPO JOURNEE' || slots.length > 0 || (hasHours && (canon === '' || canon === 'DISPONIBLE'))) {
    if (slots.length > 0) {
      return {
        type: 'disponible',
        timeKind: 'slot',
        slots,
        lieu: null,
        heure_debut: null,
        heure_fin: null,
      }
    }
    if (hasHours) {
      return {
        type: 'disponible',
        timeKind: 'range',
        lieu: null,
        heure_debut: input.heure_debut!,
        heure_fin: input.heure_fin!,
      }
    }
    // Dispo journée entière
    return {
      type: 'disponible',
      timeKind: 'full-day',
      isFullDay: true,
      lieu: null,
      heure_debut: null,
      heure_fin: null,
    }
  }

  // Mission: un vrai lieu non-statutaire
  if (canon && !isStatusLieu(canon)) {
    if (hasHours) {
      return {
        type: 'mission',
        timeKind: 'range',
        lieu: canon,
        heure_debut: input.heure_debut!,
        heure_fin: input.heure_fin!,
      }
    }
    // Mission sans heures précises => considérer journée entière
    return {
      type: 'mission',
      timeKind: 'full-day',
      isFullDay: true,
      lieu: canon,
      heure_debut: null,
      heure_fin: null,
    }
  }

  // Fallback: considérer disponible plage si heures, sinon disponible journée
  if (hasHours) {
    return {
      type: 'disponible',
      timeKind: 'range',
      lieu: null,
      heure_debut: input.heure_debut!,
      heure_fin: input.heure_fin!,
    }
  }
  return {
    type: 'disponible',
    timeKind: 'full-day',
    isFullDay: true,
    lieu: null,
    heure_debut: null,
    heure_fin: null,
  }
}
// Export par défaut pour compatibilité
export default normalizeDispo
