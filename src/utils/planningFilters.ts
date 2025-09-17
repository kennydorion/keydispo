// Utilitaires de filtrage pour le planning (purs et testables)
// Ces fonctions acceptent des callbacks d’accès aux données afin d’être testées sans dépendances UI

export type DispoLike = {
  type?: string | null
  timeKind?: 'full-day' | 'range' | 'slot'
  slots?: string[]
  heure_debut?: string | null
  heure_fin?: string | null
  lieu?: string | null
  [k: string]: any
}

export type GetDisposFn = (collaborateurId: string, date: string) => DispoLike[]
export type ResolveKindFn = (d: DispoLike) => { type: 'disponible' | 'indisponible' | 'mission'; timeKind?: 'full-day' | 'range' | 'slot'; slots?: string[] }
export type CanonicalizeLieuFn = (lieu: string) => string

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getDayStatus(
  collaborateurId: string,
  date: string,
  getDispos: GetDisposFn,
  resolveKind: ResolveKindFn,
): 'disponible' | 'indisponible' | 'unknown' {
  const dispos = getDispos(collaborateurId, date)
  if (!dispos.length) return 'unknown'
  let hasDispo = false
  for (const d of dispos) {
    const kind = resolveKind(d)
    if (kind.type === 'indisponible' || kind.type === 'mission') return 'indisponible'
    if (kind.type === 'disponible') hasDispo = true
  }
  return hasDispo ? 'disponible' : 'unknown'
}

export function isAvailableOnDate(
  collaborateurId: string,
  date: string,
  getDispos: GetDisposFn,
  resolveKind: ResolveKindFn,
): boolean {
  return getDayStatus(collaborateurId, date, getDispos, resolveKind) === 'disponible'
}

export function eachDateInRange(a: string, b: string): string[] {
  const start = a <= b ? a : b
  const end = a <= b ? b : a
  const out: string[] = []
  const cur = new Date(start)
  const endD = new Date(end)
  while (cur <= endD) {
    out.push(toDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export function isAvailableInRange(
  collaborateurId: string,
  a: string,
  b: string | undefined,
  getDispos: GetDisposFn,
  resolveKind: ResolveKindFn,
): boolean {
  if (!a) return true
  const days = b ? eachDateInRange(a, b) : [a]
  if (!days.length) return false
  return days.every(d => isAvailableOnDate(collaborateurId, d, getDispos, resolveKind))
}

export function hasExplicitIndispoInRange(
  collaborateurId: string,
  a: string,
  b: string | undefined,
  getDispos: GetDisposFn,
  resolveKind: ResolveKindFn,
): boolean {
  if (!a) return false
  const days = b ? eachDateInRange(a, b) : [a]
  for (const date of days) {
    const dispos = getDispos(collaborateurId, date)
    if (dispos.some(d => {
      const k = resolveKind(d)
      return k.type === 'indisponible' || k.type === 'mission'
    })) return true
  }
  return false
}

export function hasLieuInRange(
  collaborateurId: string,
  lieu: string,
  a: string,
  b: string | undefined,
  getDispos: GetDisposFn,
  canonicalizeLieu: CanonicalizeLieuFn,
): boolean {
  const canon = canonicalizeLieu(lieu)
  if (!canon) return true
  const days = b ? eachDateInRange(a, b) : [a]
  for (const date of days) {
    const dispos = getDispos(collaborateurId, date)
    if (dispos.some(d => canonicalizeLieu(d.lieu || '') === canon)) return true
  }
  return false
}
