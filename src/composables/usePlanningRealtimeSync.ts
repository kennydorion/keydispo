import { ref, type Ref } from 'vue'
import { disponibilitesRTDBService } from '@/services/disponibilitesRTDBService'
import { canonicalizeLieu as canonicalizeLieuShared, normalizeDispo as normalizeDispoShared } from '@/services/normalization'

/**
 * Composable pour la synchronisation temps réel des disponibilités
 * Gère les listeners RTDB pour maintenir le cache à jour
 */
export function usePlanningRealtimeSync(options: {
  visibleDays: Ref<any[]>
  disponibilitesCache: Ref<Map<string, any[]>>
  notifyDisponibilitesChanged: () => void
  addRealtimeListener: (listenerId: string) => void
  removeRealtimeListener: (listenerId: string) => void
  clearRealtimeListeners: () => void
}) {
  const {
    visibleDays,
    disponibilitesCache,
    notifyDisponibilitesChanged,
    addRealtimeListener,
    removeRealtimeListener,
    clearRealtimeListeners
  } = options
  
  // État de la synchronisation temps réel
  const isRealtimeActive = ref(false)
  const realtimeListeners = ref<string[]>([])
  
  /**
   * Mapper les types RTDB vers les types legacy
   */
  function mapTypeAnyToLegacy(t: string | undefined): 'mission' | 'disponible' | 'indisponible' {
    switch (t) {
      case 'mission': return 'mission'
      case 'disponible': return 'disponible'
      case 'indisponible': return 'indisponible'
      case 'standard': return 'disponible'
      case 'formation': return 'mission'
      case 'urgence': return 'mission'
      case 'maintenance': return 'indisponible'
      default: return 'disponible'
    }
  }
  
  /**
   * Mapper les timeKinds RTDB vers les timeKinds legacy
   */
  function mapTimeKindToLegacy(dispo: any): string {
    if (dispo.timeKind === 'overnight') return 'overnight'
    if (dispo.timeKind === 'fixed' && Array.isArray(dispo.slots) && dispo.slots.length > 0) return 'slot'
    if (dispo.timeKind === 'flexible') {
      if (dispo.heure_debut && dispo.heure_fin) return 'range'
      if (Array.isArray(dispo.slots) && dispo.slots.length > 0) return 'slot'
      return 'full-day'
    }
    if (dispo.heure_debut && dispo.heure_fin) return 'range'
    return 'full-day'
  }
  
  /**
   * Démarrer la synchronisation temps réel pour la zone visible
   */
  function startRealtimeSync() {
    if (!visibleDays.value.length) {
      return
    }
    
    const firstDay = visibleDays.value[0]
    const lastDay = visibleDays.value[visibleDays.value.length - 1]
    if (!firstDay || !lastDay) {
      console.warn('⚠️ Impossible de démarrer sync temps réel: jours non définis')
      return
    }
    
    const dateDebut = firstDay.date
    const dateFin = lastDay.date
    
    // Vérifier si on a déjà un listener pour cette plage exacte
    const currentListenerId = `${dateDebut}_${dateFin}`
    if (realtimeListeners.value.includes(currentListenerId)) {
      return
    }
    
    // Démarrer le listener RTDB pour cette plage
    const listenerId = disponibilitesRTDBService.listenToDisponibilitesByDateRange(
      dateDebut, 
      dateFin,
      (disponibilites) => {
        // Regrouper par date (clé = date) pour rester cohérent avec le cache
        const byDate = new Map<string, any[]>()

        disponibilites.forEach(dispo => {
          const date = dispo.date
          if (!byDate.has(date)) byDate.set(date, [])
          const canonLieu = canonicalizeLieuShared(dispo.lieu || '')
          const normalized = (!dispo.type && !dispo.timeKind)
            ? normalizeDispoShared({
                date: dispo.date,
                lieu: dispo.lieu || '',
                heure_debut: dispo.heure_debut || '',
                heure_fin: dispo.heure_fin || ''
              })
            : null
          
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
            type: normalized ? normalized.type : mapTypeAnyToLegacy(dispo.type as any),
            timeKind: normalized ? normalized.timeKind : mapTimeKindToLegacy(dispo),
            slots: Array.isArray(dispo.slots) ? dispo.slots : undefined,
            isFullDay: dispo.isFullDay ?? undefined,
            tenantId: dispo.tenantId,
            version: dispo.version || 1,
            updatedAt: dispo.updatedAt,
            updatedBy: dispo.updatedBy
          })
        })

        // Nettoyer les dates de la plage puis appliquer les nouvelles valeurs par date
        for (const [key] of disponibilitesCache.value.entries()) {
          // Clé du cache attendue = 'YYYY-MM-DD' (10 caractères)
          if (key.length === 10 && key >= dateDebut && key <= dateFin) {
            disponibilitesCache.value.delete(key)
          }
        }
        byDate.forEach((dispos, date) => {
          disponibilitesCache.value.set(date, dispos)
        })
        // Notifier une seule fois après toutes les mises à jour
        notifyDisponibilitesChanged()
      }
    )
    
    if (listenerId) {
      realtimeListeners.value.push(listenerId)
      addRealtimeListener(listenerId) // Synchroniser avec sessionDisplayService
      isRealtimeActive.value = true
    } else {
      console.error('❌ Échec création listener RTDB')
    }
    
    // Retourner une fonction de nettoyage
    return () => {
      if (listenerId) {
        disponibilitesRTDBService.stopListener(listenerId)
        realtimeListeners.value = realtimeListeners.value.filter(id => id !== listenerId)
        removeRealtimeListener(listenerId) // Synchroniser avec sessionDisplayService
        if (realtimeListeners.value.length === 0) {
          isRealtimeActive.value = false
        }
      }
    }
  }
  
  /**
   * Arrêter toute la synchronisation temps réel
   */
  function stopRealtimeSync() {
    // Arrêter tous les listeners RTDB
    realtimeListeners.value.forEach(listenerId => {
      disponibilitesRTDBService.stopListener(listenerId)
    })
    
    realtimeListeners.value = []
    clearRealtimeListeners() // Synchroniser avec sessionDisplayService
    isRealtimeActive.value = false
  }
  
  /**
   * Afficher les statistiques de synchronisation
   */
  function showRealtimeStats() {
    console.log('Listeners actifs:', realtimeListeners.value.length)
    console.log('IDs:', realtimeListeners.value)
  }
  
  return {
    // État
    isRealtimeActive,
    realtimeListeners,
    
    // Fonctions
    startRealtimeSync,
    stopRealtimeSync,
    showRealtimeStats
  }
}
