/**
 * useDispoConflicts.ts - Composable pour la détection des conflits de disponibilités
 * Gère la validation des chevauchements, conflits d'horaires et règles métier
 */

import type { Disponibilite } from '@/types'

// Type pour resolveDispoKind (injecté)
type ResolveDispoKindFn = (d: Disponibilite) => { type: string; timeKind: string; slots?: string[] }
// Type pour sanitizeDisposition (optionnel, injecté)
type SanitizeDispoFn = (d: Partial<Disponibilite>) => Partial<Disponibilite>

export interface UseDispoConflictsOptions {
  resolveDispoKind: ResolveDispoKindFn
  sanitizeDisposition?: SanitizeDispoFn
}

// Helpers horaires (exportés pour usage standalone)
export function toMinutesConflict(hhmm?: string): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

export function normalizeRange(start?: string, end?: string): { s: number | null; e: number | null; overnight: boolean } {
  const s = toMinutesConflict(start)
  const e = toMinutesConflict(end)
  if (s == null || e == null) return { s, e, overnight: false }
  if (e < s) return { s, e: e + 24 * 60, overnight: true }
  return { s, e, overnight: false }
}

export function rangesOverlap(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE
}

export function slotsToRanges(slots: string[]): Array<[number, number]> {
  const map: Record<string, [number, number]> = {
    morning: [8 * 60, 12 * 60],
    midday: [12 * 60, 14 * 60],
    afternoon: [14 * 60, 18 * 60],
    evening: [18 * 60, 22 * 60],
    night: [22 * 60, 30 * 60],
  }
  return slots.map(s => map[s]).filter(Boolean) as Array<[number, number]>
}

export function useDispoConflicts(options: UseDispoConflictsOptions) {
  const { resolveDispoKind, sanitizeDisposition: sanitize } = options
  const identity = (d: Partial<Disponibilite>) => d
  const sanitizeDisposition = sanitize || identity

  // Vérifie si une dispo candidate chevauche des missions existantes
  function violatesMissionDispoOverlap(existing: Partial<Disponibilite>[], candidate: Partial<Disponibilite>): boolean {
    const kC = resolveDispoKind(candidate as Disponibilite)
    
    if (kC.type === 'disponible' && kC.timeKind === 'range' && candidate.heure_debut && candidate.heure_fin) {
      const c = normalizeRange(candidate.heure_debut, candidate.heure_fin)
      for (const d of existing) {
        const k = resolveDispoKind(d as Disponibilite)
        if (k.type !== 'mission') continue
        if (k.timeKind === 'full-day') return true
        if (k.timeKind === 'range' && d.heure_debut && d.heure_fin) {
          const r = normalizeRange(d.heure_debut, d.heure_fin)
          if (c.s != null && c.e != null && r.s != null && r.e != null && rangesOverlap(c.s, c.e, r.s, r.e)) return true
        }
        if (k.timeKind === 'slot' && k.slots?.length) {
          const ranges = slotsToRanges(k.slots)
          if (c.s != null && c.e != null && ranges.some(([s, e]) => rangesOverlap(c.s!, c.e!, s, e))) return true
        }
      }
    }
    
    if (kC.type === 'disponible' && kC.timeKind === 'slot' && kC.slots?.length) {
      const cRanges = slotsToRanges(kC.slots)
      for (const d of existing) {
        const k = resolveDispoKind(d as Disponibilite)
        if (k.type !== 'mission') continue
        if (k.timeKind === 'full-day') return true
        if (k.timeKind === 'range' && d.heure_debut && d.heure_fin) {
          const r = normalizeRange(d.heure_debut, d.heure_fin)
          if (r.s != null && r.e != null && cRanges.some(([s, e]) => rangesOverlap(s, e, r.s!, r.e!))) return true
        }
        if (k.timeKind === 'slot' && k.slots?.length) {
          if (k.slots.some(s => kC.slots!.includes(s))) return true
        }
      }
    }
    return false
  }

  // Helpers pour détecter les types de dispos dans une liste
  function listHasIndispo(list: Partial<Disponibilite>[]) {
    return list.some(d => resolveDispoKind(d as Disponibilite).type === 'indisponible')
  }
  
  function listHasDispoAny(list: Partial<Disponibilite>[]) {
    return list.some(d => resolveDispoKind(d as Disponibilite).type === 'disponible')
  }
  
  function listHasDispoFullDay(list: Partial<Disponibilite>[]) {
    return list.some(d => {
      const k = resolveDispoKind(d as Disponibilite)
      return k.type === 'disponible' && k.timeKind === 'full-day'
    })
  }
  
  function listHasDispoPartial(list: Partial<Disponibilite>[]) {
    return list.some(d => {
      const k = resolveDispoKind(d as Disponibilite)
      return k.type === 'disponible' && (k.timeKind === 'slot' || k.timeKind === 'range')
    })
  }

  function isOvernightContinuationFromPrevDay(dispo: Partial<Disponibilite>): boolean {
    return (dispo as any)._cont === 'end'
  }

  // Vérifie les conflits d'exclusivité dans une liste de dispos
  function wouldConflict(list: Partial<Disponibilite>[]): boolean {
    const hasIndispo = listHasIndispo(list)
    const hasDispo = listHasDispoAny(list)
    const hasDispoFD = listHasDispoFullDay(list)
    const hasDispoPartial = listHasDispoPartial(list)
    
    if (hasIndispo && hasDispo) return true
    if (hasDispoFD && hasDispoPartial) return true
    
    const hasMission = list.some(d => resolveDispoKind(d as Disponibilite).type === 'mission')
    if (hasMission) {
      const hasIndispoFD = list.some(d => {
        const k = resolveDispoKind(d as Disponibilite)
        return k.type === 'indisponible' && k.timeKind === 'full-day'
      })
      if (hasIndispoFD) return true
    }
    return false
  }

  // Vérifie si ajouter un candidat créerait un conflit
  function wouldConflictWithCandidate(existing: Partial<Disponibilite>[], candidate: Partial<Disponibilite>): boolean {
    const candidateKind = resolveDispoKind(sanitizeDisposition({ ...candidate }) as Disponibilite)
    
    if (candidateKind.timeKind === 'full-day') {
      const onlyOvernightContinuations = existing.every(d => isOvernightContinuationFromPrevDay(d))
      if (onlyOvernightContinuations) return false
      
      const realExisting = existing.filter(d => !isOvernightContinuationFromPrevDay(d))
      const list = [...realExisting.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })]
      return wouldConflict(list)
    }
    
    const list = [...existing.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })]
    return wouldConflict(list)
  }

  // Génère un message de conflit pour une liste
  function getConflictMessage(list: Partial<Disponibilite>[]): string | null {
    const hasIndispo = listHasIndispo(list)
    const hasDispo = listHasDispoAny(list)
    const hasDispoFD = listHasDispoFullDay(list)
    const hasDispoPartial = listHasDispoPartial(list)
    
    if (hasIndispo && hasDispo) return 'Conflit: "Indisponible (journée)" ne peut pas coexister avec "Disponible" le même jour.'
    if (hasDispoFD && hasDispoPartial) return 'Conflit: "Disponible (journée)" ne peut pas coexister avec des créneaux ou une plage horaire le même jour.'
    
    const hasMission = list.some(d => resolveDispoKind(d as Disponibilite).type === 'mission')
    if (hasMission) {
      if (list.some(d => { 
        const k = resolveDispoKind(d as Disponibilite)
        return k.type === 'indisponible' && k.timeKind === 'full-day' 
      })) {
        return 'Conflit: "Indisponible (journée)" ne peut pas coexister avec une mission le même jour.'
      }
    }
    return null
  }

  function getConflictMessageWithCandidate(existing: Partial<Disponibilite>[], candidate: Partial<Disponibilite>): string | null {
    const candidateKind = resolveDispoKind(sanitizeDisposition({ ...candidate }) as Disponibilite)
    
    if (candidateKind.timeKind === 'full-day') {
      const onlyOvernightContinuations = existing.every(d => isOvernightContinuationFromPrevDay(d))
      if (onlyOvernightContinuations) return null
      
      const realExisting = existing.filter(d => !isOvernightContinuationFromPrevDay(d))
      return getConflictMessage([...realExisting.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })])
    }
    
    return getConflictMessage([...existing.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })])
  }

  // Génère une signature unique pour une dispo (détection doublons)
  function dispoSignature(d: Partial<Disponibilite>): string {
    const t = (d as any).type as string | undefined
    const k = (d as any).timeKind as string | undefined
    const slots = (d as any).slots as string[] | undefined
    if (t === 'indisponible') return 'indisponible:full-day'
    if (t === 'mission') {
      if (k === 'slot') return `mission:slot:${(slots || []).slice().sort().join(',')}:${d.lieu || ''}`
      if (k === 'range') return `mission:range:${d.lieu || ''}:${d.heure_debut || ''}-${d.heure_fin || ''}`
      return `mission:full-day:${d.lieu || ''}`
    }
    if (t === 'disponible') {
      if (k === 'slot') return `disponible:slot:${(slots || []).slice().sort().join(',')}`
      if (k === 'range') return `disponible:range:${d.heure_debut || ''}-${d.heure_fin || ''}`
      return 'disponible:full-day'
    }
    return 'other'
  }

  return {
    // Détection de conflits
    violatesMissionDispoOverlap,
    wouldConflict,
    wouldConflictWithCandidate,
    getConflictMessage,
    getConflictMessageWithCandidate,
    
    // Helpers
    dispoSignature,
    isOvernightContinuationFromPrevDay,
    listHasIndispo,
    listHasDispoAny,
    listHasDispoFullDay,
    listHasDispoPartial,
  }
}
