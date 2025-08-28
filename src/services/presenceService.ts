import { 
  doc, 
  collection, 
  serverTimestamp,
  onSnapshot,
  query,
  where,
  deleteDoc,
  writeBatch,
  getDocs,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'

  // Types simplifiés et rationalisés pour le multi-utilisateur temps réel
export interface UserPresence {
  uid: string
  displayName: string
  email: string
  sessionId: string
  lastSeen: any // Timestamp ou FieldValue
  status: 'online' | 'offline'
  presenceState: 'active' | 'idle' | 'background'
  
  // Hover direct (pour synchronisation rapide)
  hoveredCell?: {
    collaborateurId: string
    date: string
  } | null
  
  // Vue complète (pour compatibilité et fonctionnalités avancées)
  currentView?: {
    hoveredCell?: {
      collaborateurId: string
      date: string
    } | null
    lockedCell?: {
      collaborateurId: string
      date: string
      lockType: string
    } | null
  }
}

export type PresenceCallback = (users: UserPresence[]) => void

/**
 * Service de présence selon méthodologie "Session Heartbeat avec États"
 * - Une session unique par onglet avec heartbeat constant
 * - Changements d'état internes seulement (pas de création/suppression)
 * - États: active (utilisation), idle (inactif), background (onglet caché)
 */
class PresenceService {
  private tenantId: string | null = null
  private currentUser: UserPresence | null = null
  private sessionId: string = this.generateSessionId()
  private presenceRef: any = null
  private presenceListener: Unsubscribe | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private presenceCallbacks = new Set<PresenceCallback>()
  private otherUsers: UserPresence[] = []
  
  // Configuration stable selon recherche
  private readonly HEARTBEAT_INTERVAL = 5000 // 5s heartbeat constant
  private readonly SESSION_TIMEOUT = 30000 // 30s timeout pour tolérer réseau
  private readonly IDLE_THRESHOLD = 15000 // 15s sans activité = état idle
  private readonly HOVER_THROTTLE = 100 // 100ms throttle pour hover
  
  // État local simple
  private lastActivityTime = Date.now()
  private lastHoverUpdate = 0
  private lastHoveredCell: { collaborateurId: string; date: string } | null = null
  private isDestroyed = false
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async init(tenantId: string, user: { uid: string; email?: string; displayName?: string }) {
    if (this.tenantId) {
      console.warn('⚠️ Service déjà initialisé')
      return
    }

    this.tenantId = tenantId
    
    // Créer la session utilisateur avec état initial 'active'
    this.currentUser = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
      email: user.email || '',
      sessionId: this.sessionId,
      lastSeen: serverTimestamp(),
      status: 'online',
      presenceState: 'active',
      hoveredCell: null,
      currentView: {
        hoveredCell: null,
        lockedCell: null
      }
    }

    // Référence Firestore unique pour cette session
    this.presenceRef = doc(db, `tenants/${this.tenantId}/presence/${this.sessionId}`)
    
    console.log(`🟢 Session initialisée: ${this.sessionId} pour ${this.currentUser?.displayName}`)

    // Créer la session en base
    await setDoc(this.presenceRef, this.currentUser)
    
    // Démarrer heartbeat et listeners
    this.startHeartbeat()
    this.setupPresenceListener()
    this.setupVisibilityHandlers()
    
    console.log(`✅ Service de présence actif (méthodologie Session Heartbeat)`)
  }

  /**
   * Heartbeat constant - méthodologie recommandée
   * Maintient la session en vie avec updates réguliers
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isDestroyed && this.presenceRef && this.currentUser) {
        // Update simple avec timestamp
        await updateDoc(this.presenceRef, {
          lastSeen: serverTimestamp(),
          status: 'online'
        })
        
        // Vérifier si passage en idle
        const timeSinceActivity = Date.now() - this.lastActivityTime
        if (timeSinceActivity > this.IDLE_THRESHOLD && this.currentUser.presenceState === 'active') {
          await this.setPresenceState('idle')
        }
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  /**
   * Changer l'état de présence interne (sans création/suppression)
   */
  private async setPresenceState(state: 'active' | 'idle' | 'background') {
    if (!this.presenceRef || !this.currentUser) return
    
    this.currentUser.presenceState = state
    await updateDoc(this.presenceRef, {
      presenceState: state,
      lastSeen: serverTimestamp()
    })
    
    console.log(`🔄 État de présence: ${state}`)
  }

  /**
   * Gestion des changements de visibilité d'onglet
   */
  private setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      // Utiliser une fonction async IIFE pour éviter l'erreur de listener
      (async () => {
        try {
          if (document.hidden) {
            await this.setPresenceState('background')
          } else {
            await this.setPresenceState('active')
            this.markActivity()
          }
        } catch (error) {
          console.warn('Erreur lors du changement de visibilité:', error)
        }
      })()
    })
  }

  /**
   * Marquer une activité utilisateur
   */
  markActivity() {
    this.lastActivityTime = Date.now()
    
    // Si on était idle, repasser en actif
    if (this.currentUser?.presenceState === 'idle') {
      this.setPresenceState('active')
    }
  }

  /**
   * Verrouiller une cellule pour édition (via présence uniquement - simplifié)
   */
  async lockCellForEditing(collaborateurId: string, date: string, lockType: string = 'editing'): Promise<boolean> {
    if (!this.currentUser || !this.presenceRef) return false
    
    console.log(`🔒 Verrouillage cellule: ${collaborateurId} - ${date} (${lockType})`)
    
    try {
      // Mettre à jour currentView avec le verrou
      const updatedCurrentView = {
        ...this.currentUser.currentView,
        lockedCell: {
          collaborateurId,
          date,
          lockType
        }
      }
      
      this.currentUser.currentView = updatedCurrentView
      
      await updateDoc(this.presenceRef, {
        currentView: updatedCurrentView,
        lastSeen: serverTimestamp()
      })
      
      this.markActivity()
      console.log(`✅ Cellule verrouillée: ${collaborateurId} - ${date}`)
      
      // Notifier les changements
      this.notifyLockChange()
      
      return true
    } catch (error) {
      console.error('❌ Erreur verrouillage cellule:', error)
      return false
    }
  }

  /**
   * Déverrouiller une cellule (via présence uniquement - simplifié)
   */
  async unlockCellFromEditing(collaborateurId: string, date: string): Promise<boolean> {
    if (!this.currentUser || !this.presenceRef) return false
    
    console.log(`🔓 Déverrouillage cellule: ${collaborateurId} - ${date}`)
    
    try {
      // Mettre à jour currentView en supprimant le verrou
      const updatedCurrentView = {
        ...this.currentUser.currentView,
        lockedCell: null
      }
      
      this.currentUser.currentView = updatedCurrentView
      
      await updateDoc(this.presenceRef, {
        currentView: updatedCurrentView,
        lastSeen: serverTimestamp()
      })
      
      this.markActivity()
      console.log(`✅ Cellule déverrouillée: ${collaborateurId} - ${date}`)
      
      // Notifier les changements
      this.notifyLockChange()
      
      return true
    } catch (error) {
      console.error('❌ Erreur déverrouillage cellule:', error)
      return false
    }
  }
  
  private hoverUpdateTimeout: ReturnType<typeof setTimeout> | null = null
  
  /**
   * Hover optimisé sur une cellule (debounced et minimal)
   */
  async setHoveredCell(collaborateurId: string, date: string) {
    const now = Date.now()
    if (now - this.lastHoverUpdate < this.HOVER_THROTTLE) {
      return // Throttling agressif
    }
    
    // Si c'est la même cellule, pas d'update
    if (this.lastHoveredCell && 
        this.lastHoveredCell.collaborateurId === collaborateurId && 
        this.lastHoveredCell.date === date) {
      return
    }
    
    this.lastHoverUpdate = now
    this.lastHoveredCell = { collaborateurId, date }
    this.markActivity()
    
    // Mettre à jour seulement localement
    if (this.currentUser) {
      this.currentUser.hoveredCell = { collaborateurId, date }
    }
    
    console.log(`👆 Hover local: ${collaborateurId} - ${date}`)
    
    // Débouncer l'update Firestore
    this.debouncedHoverUpdate()
  }
  
  private debouncedHoverUpdate() {
    if (this.hoverUpdateTimeout) {
      clearTimeout(this.hoverUpdateTimeout)
    }
    
    this.hoverUpdateTimeout = setTimeout(async () => {
      if (this.presenceRef && this.currentUser && this.lastHoveredCell) {
        try {
          await updateDoc(this.presenceRef, {
            hoveredCell: this.lastHoveredCell,
            lastSeen: serverTimestamp()
          })
        } catch (error) {
          console.warn('Hover update failed:', error)
        }
      }
    }, 300) // Debounce 300ms
  }

  /**
   * Nettoyer le hover (optimisé)
   */
  async clearHoveredCell() {
    if (!this.lastHoveredCell) return // Pas de hover à nettoyer
    
    this.lastHoveredCell = null
    
    // Nettoyer le timeout si en cours
    if (this.hoverUpdateTimeout) {
      clearTimeout(this.hoverUpdateTimeout)
      this.hoverUpdateTimeout = null
    }
    
    // Mettre à jour localement
    if (this.currentUser) {
      this.currentUser.hoveredCell = null
    }
    
    console.log(`🧹 Clear hover`)
    
    // Update Firestore immédiatement pour le clear
    if (this.presenceRef) {
      try {
        await updateDoc(this.presenceRef, {
          hoveredCell: null,
          lastSeen: serverTimestamp()
        })
      } catch (error) {
        console.warn('Clear hover failed:', error)
      }
    }
  }

  /**
   * Écouter les autres utilisateurs présents
   */
  private setupPresenceListener() {
    if (!this.tenantId) return

    const presenceQuery = query(
      collection(db, `tenants/${this.tenantId}/presence`),
      where('status', '==', 'online')
    )

    this.presenceListener = onSnapshot(presenceQuery, (snapshot) => {
      const users: UserPresence[] = []
      const now = Date.now()

      snapshot.forEach((doc) => {
        const data = doc.data() as UserPresence
        
        // Filtrer notre propre session
        if (data.sessionId === this.sessionId) return
        
        // Filtrer les sessions expirées
        const lastSeen = data.lastSeen?.toDate?.()?.getTime() || 0
        if (now - lastSeen < this.SESSION_TIMEOUT && data.presenceState !== 'background') {
          // Transformer les données pour conserver currentView depuis Firestore
          const userWithView: UserPresence = {
            ...data,
            currentView: {
              hoveredCell: data.hoveredCell || null,
              lockedCell: data.currentView?.lockedCell || null // Lire depuis Firestore
            }
          }
          users.push(userWithView)
        }
      })

      this.otherUsers = users
      this.notifyPresenceCallbacks(users)
    })
  }

  /**
   * S'abonner aux changements de présence
   */
  onPresenceChange(callback: PresenceCallback): () => void {
    this.presenceCallbacks.add(callback)
    
    // Appel initial
    callback(this.otherUsers)
    
    // Retourner fonction de nettoyage
    return () => {
      this.presenceCallbacks.delete(callback)
    }
  }

  private notifyPresenceCallbacks(users: UserPresence[]) {
    this.presenceCallbacks.forEach(callback => {
      try {
        callback(users)
      } catch (error) {
        console.error('❌ Erreur dans callback de présence:', error)
      }
    })
    
    // Notifier les changements de lock aussi
    this.notifyLockChange()
  }

  /**
   * Nettoyer tous les verrous de l'utilisateur actuel (méthode simplifiée)
   */
  private async cleanupUserLocks() {
    // Dans le système simplifié, pas de verrous persistants à nettoyer
    // Les verrous sont uniquement dans la présence et disparaissent automatiquement
    console.log(`🧹 Nettoyage des verrous pour session ${this.sessionId} (système simplifié)`)
  }

  /**
   * Nettoyage propre lors de la fermeture
   */
  async destroy() {
    this.isDestroyed = true
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    if (this.presenceListener) {
      this.presenceListener()
      this.presenceListener = null
    }
    
    // Nettoyer le timeout hover
    if (this.hoverUpdateTimeout) {
      clearTimeout(this.hoverUpdateTimeout)
      this.hoverUpdateTimeout = null
    }
    
    // Supprimer tous les verrous de cet utilisateur (simplifié)
    await this.cleanupUserLocks()
    
    // Supprimer la session de la base
    if (this.presenceRef) {
      try {
        await deleteDoc(this.presenceRef)
        console.log(`🗑️ Session supprimée: ${this.sessionId}`)
      } catch (error) {
        console.error('❌ Erreur suppression session:', error)
      }
    }
    
    this.presenceCallbacks.clear()
    this.lockChangeCallbacks.clear()
    this.currentUser = null
    this.tenantId = null
    
    console.log(`🔴 Service de présence arrêté`)
  }

  /**
   * Nettoyage des sessions expirées (maintenance)
   */
  async cleanupExpiredSessions() {
    if (!this.tenantId) return

    const expiredThreshold = Date.now() - this.SESSION_TIMEOUT
    const presenceQuery = query(collection(db, `tenants/${this.tenantId}/presence`))
    
    try {
      const snapshot = await getDocs(presenceQuery)
      const batch = writeBatch(db)
      let deletedCount = 0

      snapshot.forEach((doc) => {
        const data = doc.data()
        const lastSeen = data.lastSeen?.toDate?.()?.getTime() || 0
        
        if (lastSeen < expiredThreshold) {
          batch.delete(doc.ref)
          deletedCount++
        }
      })

      if (deletedCount > 0) {
        await batch.commit()
        console.log(`🧹 ${deletedCount} sessions expirées nettoyées`)
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage sessions:', error)
    }
  }

  // Getters pour compatibilité
  getCurrentUser(): UserPresence | null {
    return this.currentUser
  }

  getOtherUsers(): UserPresence[] {
    return this.otherUsers
  }

  getSessionId(): string {
    return this.sessionId
  }

  // Alias pour compatibilité
  getCurrentSessionId(): string {
    return this.sessionId
  }

  // Méthode pour mettre à jour la vue courante (pour compatibilité)
  async updateCurrentView(viewData: any) {
    this.markActivity()
    
    if (this.presenceRef) {
      await updateDoc(this.presenceRef, {
        currentView: viewData,
        lastSeen: serverTimestamp()
      })
    }
  }

  /**
   * Méthodes de compatibilité pour l'interface existante
   */
  
  // Vérifier si une cellule est verrouillée (simplifié - présence uniquement)
  isCellLocked(collaborateurId: string, date: string): boolean {
    // Vérifier les verrous dans les sessions actives
    const isLocked = this.otherUsers.some(user => 
      user.currentView?.lockedCell?.collaborateurId === collaborateurId && 
      user.currentView?.lockedCell?.date === date &&
      (user.currentView?.lockedCell?.lockType === 'editing' || user.currentView?.lockedCell?.lockType === 'modal') &&
      user.presenceState === 'active'
    )
    
    // Debug occasionnel
    if (isLocked || Math.random() < 0.02) { // 2% du temps ou si verrouillé
      console.log(`🔍 isCellLocked(${collaborateurId}, ${date}): ${isLocked}`, {
        otherUsersCount: this.otherUsers.length,
        lockingUsers: this.otherUsers.filter(u => u.currentView?.lockedCell).map(u => ({
          name: u.displayName,
          lockedCell: u.currentView?.lockedCell
        }))
      })
    }
    
    return isLocked
  }

  // Vérifier si une cellule est survolée (hover) par un autre utilisateur
  isCellHovered(collaborateurId: string, date: string): boolean {
    return this.otherUsers.some(user => 
      user.hoveredCell?.collaborateurId === collaborateurId && 
      user.hoveredCell?.date === date &&
      user.presenceState === 'active'
    )
  }

  // Obtenir les informations de verrouillage d'une cellule (simplifié)
  getCellLock(collaborateurId: string, date: string): any {
    // Chercher l'utilisateur qui verrouille cette cellule
    const lockingUser = this.otherUsers.find(user => 
      user.currentView?.lockedCell?.collaborateurId === collaborateurId && 
      user.currentView?.lockedCell?.date === date &&
      (user.currentView?.lockedCell?.lockType === 'editing' || user.currentView?.lockedCell?.lockType === 'modal') &&
      user.presenceState === 'active'
    )
    
    if (lockingUser) {
      return {
        userId: lockingUser.uid,
        userName: lockingUser.displayName,
        sessionId: lockingUser.sessionId,
        lockType: lockingUser.currentView?.lockedCell?.lockType || 'editing'
      }
    }
    
    return null
  }

  // Obtenir les informations de hover d'une cellule
  getCellHover(collaborateurId: string, date: string): any {
    const hoveringUser = this.otherUsers.find(user => 
      user.hoveredCell?.collaborateurId === collaborateurId && 
      user.hoveredCell?.date === date &&
      user.presenceState === 'active'
    )
    
    return hoveringUser ? {
      userId: hoveringUser.uid,
      userName: hoveringUser.displayName,
      sessionId: hoveringUser.sessionId,
      lockType: 'hover'
    } : null
  }

  // Callbacks pour changements de lock (pour compatibilité)
  private lockChangeCallbacks = new Set<() => void>()
  
  onLockChange(callback: () => void): () => void {
    this.lockChangeCallbacks.add(callback)
    return () => {
      this.lockChangeCallbacks.delete(callback)
    }
  }

  private notifyLockChange() {
    console.log(`🔄 notifyLockChange() appelé - ${this.lockChangeCallbacks.size} callback(s)`)
    this.lockChangeCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('❌ Erreur dans callback lock change:', error)
      }
    })
  }

  // Méthodes de gestion souris (pour compatibilité)
  onMouseLeavePlanning() {
    // Nettoyer le hover avec délai
    setTimeout(() => {
      this.clearHoveredCell()
    }, 100)
  }

  onMouseLeaveWindow() {
    // Nettoyer le hover avec délai
    setTimeout(() => {
      this.clearHoveredCell()
    }, 100)
  }

  // Alias pour compatibilité avec ancien code
  async lockCell(collaborateurId: string, date: string, lockType: string = 'editing'): Promise<boolean> {
    return this.lockCellForEditing(collaborateurId, date, lockType)
  }

  async unlockCell(collaborateurId: string, date: string): Promise<boolean> {
    return this.unlockCellFromEditing(collaborateurId, date)
  }

  // Méthode pour obtenir des statistiques
  getStats() {
    const uniqueUserIds = new Set(this.otherUsers.map(u => u.uid))
    if (this.currentUser) {
      uniqueUserIds.add(this.currentUser.uid)
    }
    
    return {
      totalUsers: this.otherUsers.length + (this.currentUser ? 1 : 0),
      uniqueUsers: uniqueUserIds.size,
      otherTabs: Math.max(0, this.otherUsers.length + (this.currentUser ? 1 : 0) - uniqueUserIds.size),
      activeSessions: this.otherUsers.filter(u => u.presenceState === 'active').length + (this.currentUser?.presenceState === 'active' ? 1 : 0),
      connectedUsers: this.otherUsers.filter(u => u.status === 'online').length + (this.currentUser?.status === 'online' ? 1 : 0),
      currentSession: {
        id: this.sessionId,
        userId: this.currentUser?.uid,
        userName: this.currentUser?.displayName
      },
      tenantId: this.tenantId
    }
  }

  // Méthode de debug pour afficher l'état complet
  debugState() {
    console.log('🔍 État du service de présence:', {
      ...this.getStats(),
      otherUsers: this.otherUsers.map(u => ({
        name: u.displayName,
        sessionId: u.sessionId,
        presenceState: u.presenceState,
        hoveredCell: u.hoveredCell,
        lockedCell: u.currentView?.lockedCell
      }))
    })
  }

  // Alias pour compatibilité avec ancien code
  async initializePresence(user: { uid: string; email?: string; displayName?: string }) {
    const tenantId = 'keydispo' // Valeur par défaut pour compatibilité
    return this.init(tenantId, user)
  }

  // Méthodes de compatibilité pour l'interface existante
  async updateHoveredCell(collaborateurId: string, date: string) {
    return this.setHoveredCell(collaborateurId, date)
  }

  async clearHover() {
    return this.clearHoveredCell()
  }
}

// Export singleton
export const presenceService = new PresenceService()

// Auto-nettoyage périodique
if (typeof window !== 'undefined') {
  // Nettoyage toutes les 5 minutes
  setInterval(() => {
    presenceService.cleanupExpiredSessions()
  }, 5 * 60 * 1000)
  
  // Nettoyage à la fermeture
  window.addEventListener('beforeunload', () => {
    presenceService.destroy()
  })
}
