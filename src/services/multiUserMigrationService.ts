/**
 * Service de migration et d'intégration du nouveau système multi-utilisateur
 * 
 * Ce service fait le pont entre l'ancien système et le nouveau, permettant :
 * - Migration progressive sans casser l'existant
 * - Interface de compatibilité avec l'ancien code
 * - Intégration transparente dans SemaineVirtualClean.vue
 */

import { hybridMultiUserService } from './hybridMultiUserService'
import { sessionDisplayService } from './sessionDisplayService'
import { ref, computed } from 'vue'

// ==========================================
// SERVICE DE MIGRATION
// ==========================================

class MultiUserMigrationService {
  private isInitialized = false
  private currentUserId: string | null = null
  
  // État réactif pour la compatibilité
  private readonly _connectedUsers = ref<any[]>([])
  private readonly _lockUpdateCounter = ref(0)
  
  // Getters pour la compatibilité avec l'ancien code
  readonly connectedUsers = computed(() => this._connectedUsers.value)
  readonly lockUpdateCounter = computed(() => this._lockUpdateCounter.value)
  
  // Statistiques
  readonly stats = computed(() => sessionDisplayService.stats.value)
  
  // Exposer les données réactives du sessionDisplayService
  readonly cellIndicators = computed(() => sessionDisplayService.cellIndicators.value)
  readonly users = computed(() => sessionDisplayService.users.value)

  // ==========================================
  // INITIALISATION
  // ==========================================

  /**
   * Initialiser le nouveau système multi-utilisateur
   */
  async init(tenantId: string, user: { uid: string; displayName?: string; email?: string }) {
    if (this.isInitialized) {
      console.warn('⚠️ MultiUserMigrationService déjà initialisé')
      return
    }

    this.currentUserId = user.uid
    
    try {
      // Initialiser le service principal
      await hybridMultiUserService.init(tenantId, user)
      
      // Démarrer la synchronisation avec le service d'affichage
      this.startDisplaySync()
      
      this.isInitialized = true
      
    } catch (error) {
      console.error('❌ Erreur initialisation multi-utilisateur:', error)
      throw error
    }
  }

  /**
   * Démarrer la synchronisation avec le service d'affichage
   */
  private startDisplaySync() {
    // Synchronisation périodique pour mettre à jour l'affichage
    const syncInterval = setInterval(() => {
      if (!this.isInitialized) {
        clearInterval(syncInterval)
        return
      }
      
      try {
        // Obtenir l'état actuel du service hybride et créer un état compatible
        if (this.currentUserId) {
          // Créer un état compatible pour le service d'affichage
          const multiUserState = this.createMultiUserStateFromHybrid()
          
          // Mettre à jour le service d'affichage
          sessionDisplayService.updateFromMultiUserState(multiUserState, this.currentUserId)
        }
      } catch (error) {
        console.warn('⚠️ Erreur synchronisation affichage:', error)
      }
    }, 250) // Synchronisation chaque 250ms (au lieu de 1000ms)
    
    // Démarrer la synchronisation affichage
  }

  /**
   * Déclencher une synchronisation immédiate de l'affichage
   */
  private triggerImmediateDisplaySync(): void {
    if (!this.isInitialized || !this.currentUserId) return
    
    try {
      const multiUserState = this.createMultiUserStateFromHybrid()
      sessionDisplayService.updateFromMultiUserState(multiUserState, this.currentUserId)
    } catch (error) {
      console.warn('⚠️ Erreur sync immédiate:', error)
    }
  }

  /**
   * Créer un état MultiUserState à partir du service hybride
   */
  private createMultiUserStateFromHybrid(): any {
    try {
      // Récupérer les vraies données du service hybride
      const connectedUsers = hybridMultiUserService.getConnectedUsers()
      const allActivities = hybridMultiUserService.getAllActivities()
      
      // Convertir au format attendu par sessionDisplayService
      const sessions = new Map()
      const usersBySessions = new Map()
      const activities = new Map()
      
      // Traiter les utilisateurs connectés
      connectedUsers.forEach(userSession => {
        sessions.set(userSession.sessionId, userSession)
        
        // Grouper par utilisateur
        if (!usersBySessions.has(userSession.userId)) {
          usersBySessions.set(userSession.userId, [])
        }
        usersBySessions.get(userSession.userId).push(userSession)
      })
      
      // Traiter les activités - Format Map<string, CellActivity> attendu par sessionDisplayService
      allActivities.forEach((activity) => {
        // Vérifier que l'activité a un cellId valide
        if (activity.cellId && typeof activity.cellId === 'string') {
          // Utiliser un ID unique pour chaque activité (pas le cellId comme clé)
          const activityId = `${activity.sessionId}_${activity.type}_${activity.cellId}_${activity.timestamp}`
          // Adapter le format attendu par sessionDisplayService (activityType au lieu de type)
          const adapted: any = {
            ...activity,
            // Normaliser: le display service attend 'hover'
            activityType: activity.type === 'hovering' ? 'hover' : activity.type
          }
          activities.set(activityId, adapted)
        } else {
          console.warn('⚠️ Activité sans cellId valide ignorée:', activity)
        }
      })
      
      // État hybride mis à jour
      if (activities.size > 0) {
        // Activités collectées (log supprimé pour performance)
      }
      return { sessions, usersBySessions, activities }
      
    } catch (error) {
      console.warn('⚠️ Erreur récupération état hybride:', error)
      // Fallback: retourner un état vide en cas d'erreur
      return { 
        sessions: new Map(), 
        usersBySessions: new Map(), 
        activities: new Map() 
      }
    }
  }

  // ==========================================
  // COMPATIBILITÉ AVEC L'ANCIEN SYSTÈME
  // ==========================================

  /**
   * Méthodes pour maintenir la compatibilité avec SemaineVirtualClean.vue
   */
  
  // Méthodes pour les hovers (interface unifiée) - LECTURE DIRECTE RTDB  
  getHoveringUsers(cellIdOrCollaborateur: string, date?: string): any[] {
    let cellId: string
    
    if (date) {
      cellId = `${cellIdOrCollaborateur}_${date}`
    } else {
      cellId = cellIdOrCollaborateur
    }

    // LECTURE DIRECTE RTDB pour maximum performance
    try {
      // Récupérer directement depuis hybridMultiUserService les activités en cours
      const activities = hybridMultiUserService.getAllActivities()
      const usersOnCell = activities.filter(activity => 
        activity.cellId === cellId && 
        activity.type === 'hovering' &&
        activity.sessionId !== hybridMultiUserService.getSessionId()
      )

      // Mapper directement sans passer par 10 services
      return usersOnCell.map(activity => ({
        uid: activity.userId,
        displayName: activity.userName,
        sessionId: activity.sessionId,
        currentActivity: {
          type: 'hovering',
          cellId: activity.cellId,
          timestamp: activity.timestamp
        }
      }))
    } catch (error) {
      console.warn('⚠️ Erreur getHoveringUsers direct RTDB:', error)
      return []
    }
  }
  
  isCellLockedByOther(cellId: string): boolean {
    // LECTURE DIRECTE RTDB pour maximum performance
    const [collaborateurId, date] = cellId.split('_')
    if (!collaborateurId || !date) return false
    
    return hybridMultiUserService.isCellLocked(collaborateurId, date)
  }
  
  // Version avec paramètres séparés (interface legacy)
  isCellLocked(collaborateurId: string, date: string): boolean {
    return hybridMultiUserService.isCellLocked(collaborateurId, date)
  }
  
  getCellLockingUser(cellId: string): any | null {
    // Convertir cellId (format cellule) vers format collab_date
    const [collaborateurId, date] = cellId.split('_')
    if (!collaborateurId || !date) return null
    
    return sessionDisplayService.getCellLockInfo(collaborateurId, date)
  }
  
  // Version avec paramètres séparés (interface legacy)
  getCellLock(collaborateurId: string, date: string): any | null {
    return sessionDisplayService.getCellLockInfo(collaborateurId, date)
  }
  
  // Méthodes de gestion des événements
  onLockChange(callback: () => void): () => void {
    // Déléguer au service hybride qui gère les vrais événements RTDB
    return hybridMultiUserService.onLockChange(callback)
  }

  onActivityChange(callback: () => void): () => void {
    // Déléguer au service hybride qui gère les vrais événements RTDB
    return hybridMultiUserService.onActivityChange(callback)
  }
  
  onMouseLeavePlanning(): void {
    // Arrêter tous les survols actifs
  }
  
  onMouseLeaveWindow(): void {
    // Arrêter tous les survols actifs
  }
  
  // Méthodes de hover
  updateHoveredCell(collaborateurId: string, date: string): void {
    const cellId = `${collaborateurId}_${date}`
    this.startHover(cellId).catch(console.warn)
  }
  
  clearHoveredCell(): void {
    // Arrêter tous les survols pour cette session
    hybridMultiUserService.clearCurrentHover().catch(console.warn)
  }
  
  // Méthodes de verrouillage legacy
  async lockCellForEditing(collaborateurId: string, date: string): Promise<boolean> {
    const cellId = `${collaborateurId}_${date}`
    
    try {
      await this.startEdit(cellId)
      return true
    } catch (error) {
      console.warn('Erreur lors du verrouillage:', error)
      return false
    }
  }
  
  unlockCell(collaborateurId: string, date: string): void {
    const cellId = `${collaborateurId}_${date}`
    this.stopEdit(cellId).catch(console.warn)
  }
  
  // Statistiques
  getStats(): any {
    return sessionDisplayService.stats.value || {
      totalUsers: 0,
      onlineUsers: 0,
      activities: { total: 0, hover: 0, editing: 0, locked: 0 }
    }
  }
  
  // Actions multi-utilisateur
  async startHover(cellId: string): Promise<void> {
    try {
      const [collaborateurId, date] = cellId.split('_')
      if (!collaborateurId || !date) return
      
      await hybridMultiUserService.hoverCell(collaborateurId, date)
      // Sync immédiat pour visibilité rapide
      this.triggerImmediateDisplaySync()
    } catch (error) {
      console.warn('Erreur hover:', error)
    }
  }
  
  async stopHover(cellId: string): Promise<void> {
    try {
      const [collaborateurId, date] = cellId.split('_')
      if (!collaborateurId || !date) return
      
      await hybridMultiUserService.unhoverCell(collaborateurId, date)
    } catch (error) {
      console.warn('Erreur stop hover:', error)
    }
  }
  
  async startEdit(cellId: string): Promise<void> {
    try {
      const [collaborateurId, date] = cellId.split('_')
      if (!collaborateurId || !date) return
      
      await hybridMultiUserService.lockCell(collaborateurId, date, 'editing')
      // Sync immédiat pour visibilité rapide du lock
      this.triggerImmediateDisplaySync()
    } catch (error) {
      console.warn('Erreur start edit:', error)
    }
  }
  
  async stopEdit(cellId: string): Promise<void> {
    try {
      const [collaborateurId, date] = cellId.split('_')
      if (!collaborateurId || !date) return
      
      await hybridMultiUserService.unlockCell(collaborateurId, date)
    } catch (error) {
      console.warn('Erreur stop edit:', error)
    }
  }
  
  // Nettoyage
  async cleanup(): Promise<void> {
    try {
      await hybridMultiUserService.destroy()
      this.isInitialized = false
    } catch (error) {
      console.warn('Erreur cleanup:', error)
    }
  }
}

// ==========================================
// INSTANCE SINGLETON
// ==========================================

export const multiUserMigrationService = new MultiUserMigrationService()