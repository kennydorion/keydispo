/**
 * usePlanningDispos.ts
 * 
 * Composable gérant la logique des disponibilités dans le planning :
 * - Récupération et cache des disponibilités
 * - Résolution du type/timeKind des disponibilités
 * - Tri et formatage pour l'affichage
 * - Détection des continuations overnight
 */

import { type Ref } from 'vue'
import { addDaysStr } from '@/utils/dateHelpers'

// Types
interface Disponibilite {
  id?: string
  collaborateurId?: string
  date: string
  type?: string
  timeKind?: string
  slots?: string[]
  heure_debut?: string
  heure_fin?: string
  lieu?: string
  isFullDay?: boolean
  [key: string]: any
}

interface CellDispo extends Disponibilite {
  _cont?: 'start' | 'middle' | 'end'
}

interface ResolvedKind {
  type: string
  timeKind: string
  slots: string[]
}

interface UsePlanningDisposOptions {
  disponibilitesCache: Ref<Map<string, Disponibilite[]>>
  canonicalizeLieu: (lieu: string) => string
  detectSlotsFromText: (text: string) => string[]
  deriveTimeKindFromData: (dispo: Disponibilite) => string
}

// Ordre des slots pour le tri
const SLOT_ORDER: Record<string, number> = {
  morning: 1,
  midday: 2,
  afternoon: 3,
  evening: 4,
  night: 5,
}

export function usePlanningDispos(options: UsePlanningDisposOptions) {
  const { disponibilitesCache, canonicalizeLieu, detectSlotsFromText, deriveTimeKindFromData } = options

  // === CACHE ===
  const resolveDispoKindCache = new WeakMap<Disponibilite, ResolvedKind>()
  const cellDisposSortedCache = new Map<string, CellDispo[]>()
  let cellDisposCacheVersion = 0

  // === HELPERS TEMPS ===
  function toMinutes(hhmm?: string): number | null {
    if (!hhmm) return null
    const [h, m] = hhmm.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  // === RÉSOLUTION DU TYPE ===
  function resolveDispoKind(dispo: Disponibilite): ResolvedKind {
    const cached = resolveDispoKindCache.get(dispo)
    if (cached) return cached
    
    const result = resolveDispoKindUncached(dispo)
    resolveDispoKindCache.set(dispo, result)
    return result
  }

  function resolveDispoKindUncached(dispo: Disponibilite): ResolvedKind {
    let type = dispo.type as string | undefined
    let timeKind = dispo.timeKind as string | undefined
    const slots = dispo.slots || []

    // Mapper types alternatifs vers legacy pour l'UI
    const mapTypeAltToLegacy = (t: string | undefined) => {
      switch (t) {
        case 'maintenance': return 'indisponible'
        case 'urgence': return 'mission'
        case 'formation': return 'mission'
        case 'standard': return 'disponible'
        default: return t
      }
    }
    
    const mapTimeKindAltToLegacy = (k: string | undefined) => {
      switch (k) {
        case 'fixed':
          if (Array.isArray(dispo.slots) && dispo.slots.length > 0) return 'slot'
          if (dispo.heure_debut && dispo.heure_fin) return 'range'
          return 'range'
        case 'oncall': return 'slot'
        case 'flexible':
          if (dispo.heure_debut && dispo.heure_fin) return 'range'
          if (Array.isArray(dispo.slots) && dispo.slots.length > 0) return 'slot'
          return deriveTimeKindFromData(dispo)
        default: return k
      }
    }

    type = mapTypeAltToLegacy(type)
    timeKind = mapTimeKindAltToLegacy(timeKind)

    if (type) {
      return { type, timeKind: timeKind || 'full-day', slots: Array.isArray(slots) ? slots : [] }
    }
    
    // Fallback legacy via lieu/heures/slots implicites
    const canon = canonicalizeLieu(dispo.lieu || '')
    const originalLieu = dispo.lieu || ''
    
    if (canon === 'INDISPONIBLE') return { type: 'indisponible', timeKind: 'full-day', slots: [] }
    if (canon === 'DISPO JOURNEE') return { type: 'disponible', timeKind: 'full-day', slots: [] }
    
    const hasHours = !!(dispo.heure_debut && dispo.heure_fin)
    const inferredSlots = detectSlotsFromText(dispo.lieu || '')
    
    if ((canon === '' || canon === 'DISPONIBLE') && inferredSlots.length > 0) {
      return { type: 'disponible', timeKind: 'slot', slots: inferredSlots }
    }
    
    const hasSpecificLocation = originalLieu && 
      originalLieu !== 'DISPONIBLE' && 
      originalLieu !== 'DISPO' && 
      originalLieu !== 'INDISPONIBLE' &&
      originalLieu.trim() !== ''
    
    let detectedTimeKind = 'full-day'
    if (hasHours) {
      const startTime = parseInt(dispo.heure_debut!.split(':')[0])
      const endTime = parseInt(dispo.heure_fin!.split(':')[0])
      if (endTime < startTime) {
        detectedTimeKind = 'overnight'
      } else {
        detectedTimeKind = 'range'
      }
    }
    
    if (hasHours) {
      return { type: hasSpecificLocation ? 'mission' : 'disponible', timeKind: detectedTimeKind, slots: [] }
    }
    return { type: hasSpecificLocation ? 'mission' : 'disponible', timeKind: 'full-day', slots: [] }
  }

  // === PRIORITÉ ET TRI ===
  function typePriority(d: Disponibilite): number {
    const t = resolveDispoKind(d).type
    if (t === 'disponible') return 1
    if (t === 'mission') return 2
    if (t === 'indisponible') return 3
    return 4
  }

  function partForDay(d: Disponibilite, day: string): 'start' | 'middle' | 'end' | null {
    const k = resolveDispoKind(d)
    if ((k.timeKind !== 'range' && k.timeKind !== 'overnight') || !d.heure_debut || !d.heure_fin) return null
    
    const s = toMinutes(d.heure_debut)
    const e = toMinutes(d.heure_fin)
    if (s == null || e == null) return null
    
    const isOvernightMission = k.timeKind === 'overnight' || e < s
    
    if (d.date === day) return 'start'
    
    const next = addDaysStr(d.date, 1)
    if (next === day && isOvernightMission) return 'end'
    
    return null
  }

  // === RÉCUPÉRATION DES DISPONIBILITÉS ===
  function getDisponibilites(collaborateurId: string, date: string): Disponibilite[] {
    const dayDispos = disponibilitesCache.value.get(date) || []
    return dayDispos.filter(d => d.collaborateurId === collaborateurId)
  }

  function getCellDispos(collaborateurId: string, date: string): CellDispo[] {
    const list = getDisponibilites(collaborateurId, date)
    const out: CellDispo[] = []
    
    for (const d of list) {
      const k = resolveDispoKind(d)
      if (k.timeKind === 'overnight' || k.timeKind === 'range') {
        const part = partForDay(d, date)
        if (part) {
          out.push({ ...d, _cont: part })
        } else {
          out.push(d as CellDispo)
        }
      } else {
        out.push(d as CellDispo)
      }
    }
    
    // Ajouter les continuations de la veille (overnight)
    const prev = addDaysStr(date, -1)
    const prevDispos = disponibilitesCache.value.get(prev) || []
    for (const d of prevDispos) {
      if (d.collaborateurId !== collaborateurId) continue
      const k = resolveDispoKind(d)
      if (k.timeKind === 'overnight' || (k.timeKind === 'range' && d.heure_debut && d.heure_fin)) {
        const s = toMinutes(d.heure_debut)
        const e = toMinutes(d.heure_fin)
        if (s !== null && e !== null && e < s) {
          out.push({ ...d, _cont: 'end' })
        }
      }
    }
    
    return out
  }

  function getCellDisposSorted(collaborateurId: string, date: string): CellDispo[] {
    const key = `${collaborateurId}_${date}_${cellDisposCacheVersion}`
    const cached = cellDisposSortedCache.get(key)
    if (cached) return cached
    
    const dispos = getCellDispos(collaborateurId, date)
    
    // Trier: type priority, puis slots par ordre, puis heure début
    dispos.sort((a, b) => {
      const pA = typePriority(a)
      const pB = typePriority(b)
      if (pA !== pB) return pA - pB
      
      const kA = resolveDispoKind(a)
      const kB = resolveDispoKind(b)
      
      // Trier par slots si présents
      if (kA.timeKind === 'slot' && kB.timeKind === 'slot') {
        const sA = kA.slots[0] ? (SLOT_ORDER[kA.slots[0]] || 99) : 99
        const sB = kB.slots[0] ? (SLOT_ORDER[kB.slots[0]] || 99) : 99
        if (sA !== sB) return sA - sB
      }
      
      // Trier par heure début
      const tA = toMinutes(a.heure_debut) ?? 0
      const tB = toMinutes(b.heure_debut) ?? 0
      return tA - tB
    })
    
    cellDisposSortedCache.set(key, dispos)
    return dispos
  }

  // === STATUT ===
  function getDayStatus(collaborateurId: string, date: string): 'disponible' | 'indisponible' | 'mission' | 'unknown' {
    const dispos = getDisponibilites(collaborateurId, date)
    if (!dispos.length) return 'unknown'
    
    for (const d of dispos) {
      const k = resolveDispoKind(d)
      if (k.type === 'indisponible') return 'indisponible'
      if (k.type === 'mission') return 'mission'
    }
    
    return 'disponible'
  }

  function isAvailableOnDate(collaborateurId: string, date: string): boolean {
    const status = getDayStatus(collaborateurId, date)
    return status === 'disponible' || status === 'unknown'
  }

  // === CACHE MANAGEMENT ===
  function invalidateCellDisposCache(specificKey?: string) {
    if (specificKey) {
      for (const key of cellDisposSortedCache.keys()) {
        if (key.startsWith(specificKey)) {
          cellDisposSortedCache.delete(key)
        }
      }
    } else {
      cellDisposCacheVersion++
      cellDisposSortedCache.clear()
    }
  }

  function clearCaches() {
    cellDisposSortedCache.clear()
    cellDisposCacheVersion = 0
  }

  return {
    resolveDispoKind,
    typePriority,
    partForDay,
    getDisponibilites,
    getCellDispos,
    getCellDisposSorted,
    getDayStatus,
    isAvailableOnDate,
    invalidateCellDisposCache,
    clearCaches,
    toMinutes,
    SLOT_ORDER
  }
}
