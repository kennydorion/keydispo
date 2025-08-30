import { ref } from 'vue'
import { firestoreListenerManager } from '../services/firestoreListenerManager'
import { collection, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../services/firebase'

/**
 * Gestionnaire de listeners conditionnels pour optimiser les performances
 * N'active les listeners que pour les zones visibles à l'écran
 */
export class ConditionalListenerManager {
  private visibleRange = ref({ startDate: '', endDate: '', startRow: 0, endRow: 0 })
  private activeListeners = new Map<string, string>() // zone -> listenerId
  private tenantId = ''
  
  init(tenantId: string) {
    this.tenantId = tenantId
  }
  
  /**
   * Mettre à jour la zone visible et ajuster les listeners
   */
  updateVisibleRange(startDate: string, endDate: string, startRow: number, endRow: number) {
    const oldRange = this.visibleRange.value
    this.visibleRange.value = { startDate, endDate, startRow, endRow }
    
    
    // Si la zone a changé significativement, réorganiser les listeners
    if (this.hasRangeChangedSignificantly(oldRange, this.visibleRange.value)) {
      this.reorganizeListeners()
    }
  }
  
  /**
   * Vérifier si la zone visible a changé de manière significative
   */
  private hasRangeChangedSignificantly(
    oldRange: { startDate: string, endDate: string, startRow: number, endRow: number },
    newRange: { startDate: string, endDate: string, startRow: number, endRow: number }
  ): boolean {
    // Seuils pour déclencher une réorganisation
    const DATE_THRESHOLD = 3 // jours
    const ROW_THRESHOLD = 5  // lignes
    
    const dateChange = Math.abs(new Date(newRange.startDate).getTime() - new Date(oldRange.startDate).getTime()) 
      / (1000 * 60 * 60 * 24) // convertir en jours
    
    const rowChange = Math.abs(newRange.startRow - oldRange.startRow)
    
    return dateChange > DATE_THRESHOLD || rowChange > ROW_THRESHOLD
  }
  
  /**
   * Réorganiser les listeners selon la zone visible
   */
  private reorganizeListeners() {
    if (!this.tenantId) return
    
    const { startDate, endDate, startRow, endRow } = this.visibleRange.value
    
    // Nettoyer les anciens listeners
    this.cleanup()
    
    // Créer des listeners optimisés pour la zone visible
    this.createVisibleZoneListeners(startDate, endDate, startRow, endRow)
  }
  
  /**
   * Créer des listeners pour la zone visible uniquement
   */
  private createVisibleZoneListeners(startDate: string, endDate: string, startRow: number, endRow: number) {
    // Listener pour les disponibilités dans la plage de dates visible
    const dispoListenerId = this.createDisponibilitesListener(startDate, endDate)
    if (dispoListenerId) {
      this.activeListeners.set('disponibilites', dispoListenerId)
    }
    
    // Listener pour les activités cellules dans la zone visible
    const activitiesListenerId = this.createCellActivitiesListener(startDate, endDate)
    if (activitiesListenerId) {
      this.activeListeners.set('activities', activitiesListenerId)
    }
    
    // Listener pour les sessions utilisateurs actifs (toujours nécessaire)
    const sessionsListenerId = this.createActiveSessionsListener()
    if (sessionsListenerId) {
      this.activeListeners.set('sessions', sessionsListenerId)
    }
    
  }
  
  /**
   * Créer un listener pour les disponibilités dans la plage visible
   */
  private createDisponibilitesListener(startDate: string, endDate: string): string | null {
    try {
      const dispoQuery = query(
        collection(db, 'dispos'),
        where('tenantId', '==', this.tenantId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date'),
        orderBy('nom'),
        limit(100) // URGENCE: Réduction drastique
      )
      
      return firestoreListenerManager.subscribe(
        dispoQuery,
        (snapshot: any) => {
          // Émettre un événement pour notifier les composants
          document.dispatchEvent(new CustomEvent('disponibilites-updated', { 
            detail: { snapshot, dateRange: { startDate, endDate } } 
          }))
        },
        `dispos_${startDate}_${endDate}`
      )
    } catch (error) {
      console.error('❌ Erreur création listener disponibilités:', error)
      return null
    }
  }
  
  /**
   * Créer un listener pour les activités cellules dans la zone visible
   */
  private createCellActivitiesListener(startDate: string, endDate: string): string | null {
    try {
      const activitiesQuery = query(
        collection(db, `tenants/${this.tenantId}/cellActivities`),
        orderBy('lastUpdate', 'desc'),
        limit(30) // Très limité pour les performances
      )
      
      return firestoreListenerManager.subscribe(
        activitiesQuery,
        (snapshot: any) => {
          document.dispatchEvent(new CustomEvent('cell-activities-updated', { 
            detail: { snapshot } 
          }))
        },
        `activities_${startDate}_${endDate}`
      )
    } catch (error) {
      console.error('❌ Erreur création listener activités:', error)
      return null
    }
  }
  
  /**
   * Créer un listener pour les sessions utilisateurs actifs
   */
  private createActiveSessionsListener(): string | null {
    try {
      const sessionsQuery = query(
        collection(db, `tenants/${this.tenantId}/sessions`),
        where('status', 'in', ['online', 'idle']),
        orderBy('lastActivity', 'desc'),
        limit(10) // Très limité
      )
      
      return firestoreListenerManager.subscribe(
        sessionsQuery,
        (snapshot: any) => {
          document.dispatchEvent(new CustomEvent('active-sessions-updated', { 
            detail: { snapshot } 
          }))
        },
        'active_sessions'
      )
    } catch (error) {
      console.error('❌ Erreur création listener sessions:', error)
      return null
    }
  }
  
  /**
   * Nettoyer tous les listeners actifs
   */
  cleanup() {
    for (const [zone, listenerId] of this.activeListeners.entries()) {
      firestoreListenerManager.unsubscribe(listenerId)
    }
    this.activeListeners.clear()
  }
  
  /**
   * Obtenir les statistiques des listeners conditionnels
   */
  getStats() {
    return {
      activeListeners: this.activeListeners.size,
      visibleRange: this.visibleRange.value,
      zones: Array.from(this.activeListeners.keys()),
      firestoreStats: firestoreListenerManager.getStats()
    }
  }
  
  /**
   * Forcer la réorganisation des listeners
   */
  forceReorganize() {
    this.reorganizeListeners()
  }
}

// Instance singleton
export const conditionalListenerManager = new ConditionalListenerManager()

// Hook Vue pour utiliser le gestionnaire conditionnel
export function useConditionalListeners() {
  return {
    updateVisibleRange: conditionalListenerManager.updateVisibleRange.bind(conditionalListenerManager),
    cleanup: conditionalListenerManager.cleanup.bind(conditionalListenerManager),
    getStats: conditionalListenerManager.getStats.bind(conditionalListenerManager),
    forceReorganize: conditionalListenerManager.forceReorganize.bind(conditionalListenerManager)
  }
}
