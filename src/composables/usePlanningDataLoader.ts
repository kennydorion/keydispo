import { ref, type Ref, type ComputedRef } from 'vue'
import { disponibilitesRTDBService, type DisponibiliteRTDB } from '@/services/disponibilitesRTDBService'
import { addDaysStr } from '@/utils/dateHelpers'
import { canonicalizeLieu as canonicalizeLieuShared, normalizeDispo as normalizeDispoShared } from '@/services/normalization'

/**
 * Composable pour le chargement des disponibilités depuis RTDB
 */

export interface Disponibilite {
  id?: string
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  ville: string
  note?: string
  date: string
  lieu: string
  heure_debut: string
  heure_fin: string
  tenantId: string
  collaborateurId?: string
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  slots?: string[]
  isFullDay?: boolean
  version?: number
  updatedAt?: any
  updatedBy?: string
}

export interface UsePlanningDataLoaderOptions {
  /** Cache des disponibilités par date */
  disponibilitesCache: Ref<Map<string, Disponibilite[]>>
  /** Plages de dates déjà chargées */
  loadedDateRanges: Ref<Array<{ start: string; end: string }>>
  /** Jours chargés */
  loadedDays: Ref<Array<{ date: string; isToday?: boolean }>>
  /** Flag de chargement */
  loadingDisponibilites: Ref<boolean>
  /** Flag de chargement des plages */
  fetchingRanges: Ref<boolean>
  /** Fonction pour notifier les changements du cache */
  notifyDisponibilitesChanged: () => void
  /** Fonction pour ajouter une plage chargée */
  addLoadedRange: (start: string, end: string) => void
  /** Callback après vérification du planning */
  checkPlanningReadiness: () => void
  /** Fonction pour mettre à jour les options de lieux */
  updateLieuxOptions: () => void
  /** Fonction pour mettre à jour le cache */
  setCacheDispos: (date: string, dispos: Disponibilite[]) => void
}

// Helpers de date
function nextDayStr(dateStr: string) { return addDaysStr(dateStr, 1) }
function prevDayStr(dateStr: string) { return addDaysStr(dateStr, -1) }

// Mapper les types RTDB vers les types legacy
function mapRTDBTypeToLegacy(rtdbType: string | undefined) {
  switch (rtdbType) {
    case 'standard': return 'disponible'
    case 'formation': return 'mission'
    case 'urgence': return 'mission'
    case 'maintenance': return 'indisponible'
    default: return 'disponible'
  }
}

function mapRTDBTimeKindToLegacy(rtdbTimeKind: string | undefined, isFullDay?: boolean): 'range' | 'slot' | 'full-day' | 'overnight' {
  switch (rtdbTimeKind) {
    case 'fixed': return 'slot'
    case 'flexible': return isFullDay ? 'full-day' : 'range'
    case 'overnight': return 'overnight'
    default: return 'range'
  }
}

export function usePlanningDataLoader(options: UsePlanningDataLoaderOptions) {
  const {
    disponibilitesCache,
    loadedDateRanges,
    loadedDays,
    loadingDisponibilites,
    fetchingRanges,
    notifyDisponibilitesChanged,
    addLoadedRange,
    checkPlanningReadiness,
    updateLieuxOptions,
    setCacheDispos
  } = options

  // Listeners temps réel actifs
  const realtimeListeners = ref<string[]>([])
  const isRealtimeActive = ref(false)

  /**
   * Calculer les sous-plages manquantes
   */
  function computeMissingSubranges(
    requestStart: string, 
    requestEnd: string, 
    ranges: Array<{ start: string; end: string }>
  ): Array<{ start: string; end: string }> {
    if (requestEnd < requestStart) return []
    
    // Fusionne et intersecte les ranges existants avec la fenêtre demandée
    const merged = [...ranges]
      .map(r => ({ start: r.start, end: r.end }))
      .filter(r => !(r.end < requestStart || r.start > requestEnd))
      .map(r => ({ 
        start: r.start < requestStart ? requestStart : r.start, 
        end: r.end > requestEnd ? requestEnd : r.end 
      }))
      .sort((a, b) => a.start.localeCompare(b.start))
      .reduce((acc: Array<{ start: string; end: string }>, r) => {
        if (!acc.length) return [{ ...r }]
        const last = acc[acc.length - 1]
        if (r.start <= nextDayStr(last.end)) {
          if (r.end > last.end) last.end = r.end
          return acc
        }
        acc.push({ ...r })
        return acc
      }, [])

    const missing: Array<{ start: string; end: string }> = []
    let cursor = requestStart
    for (const r of merged) {
      if (cursor < r.start) missing.push({ start: cursor, end: prevDayStr(r.start) })
      cursor = nextDayStr(r.end)
    }
    if (cursor <= requestEnd) missing.push({ start: cursor, end: requestEnd })
    return missing.filter(r => r.start <= r.end)
  }

  /**
   * Charger les disponibilités depuis RTDB
   */
  async function loadDisponibilitesFromRTDB(dateDebut: string, dateFin: string): Promise<Disponibilite[]> {
    if (loadingDisponibilites.value) return []
    
    try {
      loadingDisponibilites.value = true
      const disponibilites = await disponibilitesRTDBService.getDisponibilitesByDateRange(dateDebut, dateFin)
      
      // Transformer les données RTDB vers le format existant
      const formattedDisponibilites = disponibilites.map((dispo: DisponibiliteRTDB) => {
        const canonLieu = canonicalizeLieuShared(dispo.lieu || '')
        
        const formatted: Disponibilite = {
          id: dispo.id,
          collaborateurId: dispo.collaborateurId,
          date: dispo.date,
          lieu: canonLieu,
          heure_debut: dispo.heure_debut || '',
          heure_fin: dispo.heure_fin || '',
          type: mapRTDBTypeToLegacy(dispo.type) as any,
          timeKind: mapRTDBTimeKindToLegacy(dispo.timeKind, dispo.isFullDay),
          slots: Array.isArray(dispo.slots) ? dispo.slots : undefined,
          isFullDay: dispo.isFullDay ?? undefined,
          nom: dispo.nom || '',
          prenom: dispo.prenom || '',
          metier: dispo.metier || '',
          phone: dispo.phone || '',
          email: dispo.email || '',
          note: dispo.note || '',
          tenantId: dispo.tenantId,
          ville: dispo.ville || '',
          version: dispo.version || 1,
          updatedAt: new Date(dispo.updatedAt || Date.now()),
          updatedBy: dispo.updatedBy || 'system'
        }
        
        return formatted
      })
      
      return formattedDisponibilites
      
    } catch (error) {
      console.error('❌ Erreur chargement disponibilités RTDB:', error)
      return []
    } finally {
      loadingDisponibilites.value = false
      checkPlanningReadiness()
    }
  }

  /**
   * Générer les disponibilités pour une plage de dates
   */
  async function generateDisponibilitesForDateRange(dateDebutOpt?: string, dateFinOpt?: string) {
    const today = new Date().toISOString().split('T')[0]
    let dateDebut = dateDebutOpt || loadedDays.value[0]?.date || today
    let dateFin = dateFinOpt || loadedDays.value[loadedDays.value.length - 1]?.date || today
    
    if (dateFin < dateDebut) {
      const tmp = dateDebut
      dateDebut = dateFin
      dateFin = tmp
    }
    if (!dateDebut || !dateFin) return
    
    // Calculer les sous-plages réellement manquantes
    const missing = computeMissingSubranges(dateDebut, dateFin, loadedDateRanges.value)
    
    if (missing.length === 0) {
      // Rien à charger
    } else {
      fetchingRanges.value = true
      try {
        for (const sub of missing) {
          const disponibilites = await loadDisponibilitesFromRTDB(sub.start, sub.end)
          
          // Organiser par date et fusionner
          const byDate = new Map<string, Disponibilite[]>()
          
          if (Array.isArray(disponibilites)) {
            disponibilites.forEach(dispo => {
              const date = dispo.date
              if (!byDate.has(date)) byDate.set(date, [])
              byDate.get(date)!.push(dispo)
            })
          }
          
          for (const [date, dispos] of byDate) {
            const existing = disponibilitesCache.value.get(date) || []
            disponibilitesCache.value.set(date, dispos.length ? dispos : existing)
          }
          
          addLoadedRange(sub.start, sub.end)
          notifyDisponibilitesChanged()
        }
      } finally {
        fetchingRanges.value = false
        checkPlanningReadiness()
      }
    }
    
    updateLieuxOptions()
    
    // Listener temps réel
    setupRealtimeListener(dateDebut, dateFin)
  }

  /**
   * Configurer un listener temps réel pour une plage
   */
  function setupRealtimeListener(dateDebut: string, dateFin: string) {
    disponibilitesRTDBService.listenToDisponibilitesByDateRange(
      dateDebut,
      dateFin,
      (disponibilites) => {
        const byDate = new Map<string, Disponibilite[]>()
        
        if (Array.isArray(disponibilites)) {
          disponibilites.forEach(dispo => {
            const canonLieu = canonicalizeLieuShared(dispo.lieu || '')
            const normalized = (!dispo.type && !dispo.timeKind)
              ? normalizeDispoShared({
                  date: dispo.date,
                  lieu: dispo.lieu || '',
                  heure_debut: dispo.heure_debut || '',
                  heure_fin: dispo.heure_fin || ''
                })
              : null
            
            const formatted: Disponibilite = {
              id: dispo.id,
              collaborateurId: dispo.collaborateurId,
              date: dispo.date,
              lieu: canonLieu,
              heure_debut: dispo.heure_debut || '',
              heure_fin: dispo.heure_fin || '',
              type: (normalized ? normalized.type : mapRTDBTypeToLegacy(dispo.type as any)) as any,
              timeKind: normalized 
                ? normalized.timeKind 
                : mapRTDBTimeKindToLegacy(dispo.timeKind, dispo.isFullDay),
              slots: Array.isArray(dispo.slots) ? dispo.slots : undefined,
              isFullDay: dispo.isFullDay ?? undefined,
              nom: dispo.nom || '',
              prenom: dispo.prenom || '',
              metier: dispo.metier || '',
              phone: dispo.phone || '',
              email: dispo.email || '',
              note: dispo.note || '',
              tenantId: dispo.tenantId,
              ville: '',
              version: dispo.version || 1,
              updatedAt: dispo.updatedAt,
              updatedBy: dispo.updatedBy
            }
            
            if (!byDate.has(dispo.date)) byDate.set(dispo.date, [])
            byDate.get(dispo.date)!.push(formatted)
          })
          
          byDate.forEach((dispos, date) => {
            disponibilitesCache.value.set(date, dispos)
          })
          notifyDisponibilitesChanged()
        }
      }
    )
  }

  /**
   * Démarrer la synchronisation temps réel
   */
  function startRealtimeSync(visibleDays: Array<{ date: string }>) {
    if (!visibleDays.length) return
    
    const firstDay = visibleDays[0]
    const lastDay = visibleDays[visibleDays.length - 1]
    if (!firstDay || !lastDay) return
    
    const dateDebut = firstDay.date
    const dateFin = lastDay.date
    
    const currentListenerId = `${dateDebut}_${dateFin}`
    if (realtimeListeners.value.includes(currentListenerId)) return
    
    const listenerId = disponibilitesRTDBService.listenToDisponibilitesByDateRange(
      dateDebut,
      dateFin,
      (disponibilites) => {
        const byDate = new Map<string, Disponibilite[]>()
        
        disponibilites.forEach(dispo => {
          const date = dispo.date
          if (!byDate.has(date)) byDate.set(date, [])
          const canonLieu = canonicalizeLieuShared(dispo.lieu || '')
          
          byDate.get(date)!.push({
            id: dispo.id,
            collaborateurId: dispo.collaborateurId,
            nom: dispo.nom || '',
            prenom: dispo.prenom || '',
            metier: dispo.metier || '',
            phone: dispo.phone || '',
            email: dispo.email || '',
            note: dispo.note || '',
            date,
            lieu: canonLieu,
            heure_debut: dispo.heure_debut || '',
            heure_fin: dispo.heure_fin || '',
            type: mapRTDBTypeToLegacy(dispo.type as any) as any,
            timeKind: mapRTDBTimeKindToLegacy(dispo.timeKind, dispo.isFullDay),
            slots: Array.isArray(dispo.slots) ? dispo.slots : undefined,
            isFullDay: dispo.isFullDay ?? undefined,
            tenantId: dispo.tenantId,
            ville: '',
            version: dispo.version || 1,
            updatedAt: dispo.updatedAt,
            updatedBy: dispo.updatedBy
          })
        })
        
        // Nettoyer les dates de la plage puis appliquer
        for (const [key] of disponibilitesCache.value.entries()) {
          if (key.length === 10 && key >= dateDebut && key <= dateFin) {
            disponibilitesCache.value.delete(key)
          }
        }
        byDate.forEach((dispos, date) => {
          disponibilitesCache.value.set(date, dispos)
        })
        notifyDisponibilitesChanged()
      }
    )
    
    if (listenerId) {
      realtimeListeners.value.push(listenerId)
      isRealtimeActive.value = true
    }
  }

  /**
   * Arrêter la synchronisation temps réel
   */
  function stopRealtimeSync() {
    realtimeListeners.value.forEach(listenerId => {
      disponibilitesRTDBService.stopListener(listenerId)
    })
    realtimeListeners.value = []
    isRealtimeActive.value = false
  }

  /**
   * Rafraîchir les disponibilités
   */
  async function refreshDisponibilites(
    clearCache: boolean,
    visibleDays: Array<{ date: string }>,
    clearDisposCache: () => void
  ) {
    try {
      if (clearCache) {
        clearDisposCache()
        loadedDateRanges.value = []
      }
      
      if (visibleDays.length > 0) {
        const firstDay = visibleDays[0]
        const lastDay = visibleDays[visibleDays.length - 1]
        if (firstDay && lastDay) {
          await generateDisponibilitesForDateRange(firstDay.date, lastDay.date)
          updateLieuxOptions()
        }
      }
      
      if (clearCache && visibleDays.length > 0) {
        stopRealtimeSync()
        startRealtimeSync(visibleDays)
      }
    } catch (error) {
      console.error('❌ Erreur actualisation:', error)
    }
  }

  return {
    // État
    realtimeListeners,
    isRealtimeActive,
    
    // Fonctions
    computeMissingSubranges,
    loadDisponibilitesFromRTDB,
    generateDisponibilitesForDateRange,
    startRealtimeSync,
    stopRealtimeSync,
    refreshDisponibilites
  }
}
