/**
 * Service multi-utilisateur RTDB-only optimisé
 * 
 * Architecture simplifiée Firebase :
 * - Realtime Database : Tous les états temps réel (présence, survols, locks, sessions)
 * 
 * Avantages :
 * ✅ Très fluide : tous les événements temps réel via RTDB (latence très faible)
 * ✅ Économique : une seule base de données temps réel
 * ✅ Robuste : onDisconnect libère automatiquement les ressources
 * ✅ Simple : architecture unifiée RTDB
 */

import { 
  // Realtime Database pour tous les états temps réel
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
  remove,
  off,
  child,
  update
} from 'firebase/database'

import { rtdb } from './firebase'

// ==========================================
// INTERFACES ET TYPES
// ==========================================

interface UserSession {
  sessionId: string
  userId: string
  userName: string
  userEmail: string
  tenantId: string
  status: 'online' | 'idle' | 'background' | 'offline'
  lastActivity: any // RTDB Timestamp
  createdAt: any // RTDB Timestamp
  currentAction?: {
    type: string
    cellId: string
    collaborateurId: string
    date: string
    startedAt: any // RTDB Timestamp
  }
  deviceInfo?: {
    userAgent: string
    platform: string
    isMobile: boolean
  }
}

interface UserPresence {
  userId: string
  userName: string
  status: 'online' | 'idle' | 'away'
  lastSeen: any // RTDB ServerValue.TIMESTAMP
  sessionId: string
  tenantId: string
}

interface CellActivity {
  type: 'editing' | 'hovering' | 'locked'
  cellId: string
  collaborateurId: string
  date: string
  userId: string
  userName: string
  userEmail: string
  sessionId: string
  startedAt: any // RTDB Timestamp
  tenantId: string
}

interface CellLock {
  cellId: string
  collaborateurId: string
  date: string
  userId: string
  userName: string
  sessionId: string
  lockedAt: any // RTDB Timestamp
  tenantId: string
  expiresAt?: number // timestamp pour auto-expiration
}

// ==========================================
// SERVICE PRINCIPAL
// ==========================================

class HybridMultiUserService {
  private rtdb = rtdb
  
  // Identifiants de session
  public currentUserId: string | null = null
  public currentUserName: string | null = null
  public currentUserEmail: string | null = null
  public currentSessionId: string | null = null
  public currentTenantId: string | null = null
  private presenceRef: any = null
  private sessionRef: any = null
  
  // Configuration
  private presenceWritesEnabled = false
  
  // Callbacks pour les changements
  private lockChangeCallbacks: ((locks: Map<string, CellLock>) => void)[] = []
  private presenceChangeCallbacks: ((presence: Map<string, UserPresence>) => void)[] = []
  private userChangeCallbacks: ((users: Map<string, UserSession>) => void)[] = []
  private activityChangeCallbacks: ((activities: Map<string, CellActivity>) => void)[] = []
  private selectionChangeCallbacks: ((selections: Map<string, any>) => void)[] = []
  
  // État local réactif
  private _isActive = false
  private _users = new Map<string, UserSession>()
  private _presence = new Map<string, UserPresence>()
  private _activities = new Map<string, CellActivity>()
  private _locks = new Map<string, CellLock>()
  private _remoteSelections = new Map<string, any>() // Sélections des autres utilisateurs
  private _currentHover: { collaborateurId: string; date: string } | null = null
  
  // Listeners pour cleanup
  private rtdbListeners: Function[] = []

  // ==========================================
  // GETTERS PUBLIC
  // ==========================================

  get isActive() { return this._isActive }
  get users() { return new Map(this._users) }
  get presence() { return new Map(this._presence) }
  get activities() { return new Map(this._activities) }
  get locks() { return new Map(this._locks) }
  get remoteSelections() { return new Map(this._remoteSelections) }
  get currentHover() { return this._currentHover }

  // ==========================================
  // CALLBACKS REGISTRATION
  // ==========================================

  onLockChange(callback: (locks: Map<string, CellLock>) => void): () => void {
    this.lockChangeCallbacks.push(callback)
    return () => {
      const index = this.lockChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.lockChangeCallbacks.splice(index, 1)
      }
    }
  }

  onPresenceChange(callback: (presence: Map<string, UserPresence>) => void): () => void {
    this.presenceChangeCallbacks.push(callback)
    return () => {
      const index = this.presenceChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.presenceChangeCallbacks.splice(index, 1)
      }
    }
  }

  onUserChange(callback: (users: Map<string, UserSession>) => void): () => void {
    this.userChangeCallbacks.push(callback)
    return () => {
      const index = this.userChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.userChangeCallbacks.splice(index, 1)
      }
    }
  }

  onActivityChange(callback: (activities: Map<string, CellActivity>) => void): () => void {
    this.activityChangeCallbacks.push(callback)
    return () => {
      const index = this.activityChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.activityChangeCallbacks.splice(index, 1)
      }
    }
  }

  onSelectionChange(callback: (selections: Map<string, any>) => void): () => void {
    this.selectionChangeCallbacks.push(callback)
    return () => {
      const index = this.selectionChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.selectionChangeCallbacks.splice(index, 1)
      }
    }
  }

  // ==========================================
  // MÉTHODES PRIVÉES DE NOTIFICATION
  // ==========================================

  private notifyLockChanges() {
    this.lockChangeCallbacks.forEach(callback => callback(new Map(this._locks)))
  }

  private notifyPresenceChanges() {
    this.presenceChangeCallbacks.forEach(callback => callback(new Map(this._presence)))
  }

  private notifyUserChanges() {
    this.userChangeCallbacks.forEach(callback => callback(new Map(this._users)))
  }

  private notifyActivityChanges() {
    this.activityChangeCallbacks.forEach(callback => callback(new Map(this._activities)))
  }

  private notifySelectionChanges() {
    this.selectionChangeCallbacks.forEach(callback => callback(new Map(this._remoteSelections)))
  }

  // ==========================================
  // INITIALISATION
  // ==========================================

  async initialize(userId: string, userName: string, userEmail: string, tenantId: string) {
    if (this._isActive) {
      console.warn('⚠️ Service déjà initialisé')
      return
    }

    this.currentUserId = userId
    this.currentUserName = userName
    this.currentUserEmail = userEmail
    this.currentTenantId = tenantId
    this.currentSessionId = `${userId}_${Date.now()}`

    console.log('🚀 Initialisation du service multi-utilisateur RTDB-only', {
      userId,
      userName,
      tenantId,
      sessionId: this.currentSessionId
    })

    await this.setupRealtimePresence()
    this.startRealtimeListeners()
    
    this._isActive = true
    console.log('✅ Service multi-utilisateur RTDB initialisé')
  }

  private async setupRealtimePresence() {
    if (!this.currentUserId || !this.currentTenantId || !this.currentSessionId) return

    // Configuration de la présence RTDB
    this.presenceRef = ref(this.rtdb, `presence/${this.currentTenantId}/${this.currentUserId}`)
    this.sessionRef = ref(this.rtdb, `sessions/${this.currentTenantId}/${this.currentSessionId}`)

    // Créer la session dans RTDB
    const sessionData = {
      sessionId: this.currentSessionId,
      userId: this.currentUserId,
      userName: this.currentUserName,
      userEmail: this.currentUserEmail,
      tenantId: this.currentTenantId,
      status: 'online',
      lastActivity: rtdbServerTimestamp(),
      createdAt: rtdbServerTimestamp(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: /Mobi|Android/i.test(navigator.userAgent)
      }
    }

    await set(this.sessionRef, sessionData)

    // Configurer la présence
    const presenceData = {
      userId: this.currentUserId,
      userName: this.currentUserName,
      status: 'online',
      lastSeen: rtdbServerTimestamp(),
      sessionId: this.currentSessionId,
      tenantId: this.currentTenantId
    }

    await set(this.presenceRef, presenceData)
    await onDisconnect(this.presenceRef).remove()
    await onDisconnect(this.sessionRef).remove()
    
    // Marquer comme configuré
    this.presenceWritesEnabled = true
  }

  private startRealtimeListeners() {
    if (!this.currentTenantId) return

    // 1. Écouter les sessions en temps réel
    const sessionsRef = ref(this.rtdb, `sessions/${this.currentTenantId}`)
    const sessionsListener = onValue(sessionsRef, (snapshot) => {
      this._users.clear()
      if (snapshot.exists()) {
        const sessions = snapshot.val()
        Object.values(sessions).forEach((session: any) => {
          this._users.set(session.sessionId, session)
        })
      }
      this.notifyUserChanges()
    })
    this.rtdbListeners.push(() => off(sessionsRef, 'value', sessionsListener))

    // 2. Écouter la présence en temps réel
    const presenceRef = ref(this.rtdb, `presence/${this.currentTenantId}`)
    const presenceListener = onValue(presenceRef, (snapshot) => {
      this._presence.clear()
      if (snapshot.exists()) {
        const presence = snapshot.val()
        Object.values(presence).forEach((user: any) => {
          this._presence.set(user.userId, user)
        })
      }
      this.notifyPresenceChanges()
    })
    this.rtdbListeners.push(() => off(presenceRef, 'value', presenceListener))

    // 3. Écouter les activités cellules en temps réel
    const activitiesRef = ref(this.rtdb, `cellActivities/${this.currentTenantId}`)
    const activitiesListener = onValue(activitiesRef, (snapshot) => {
      this._activities.clear()
      if (snapshot.exists()) {
        const activities = snapshot.val()
        const now = Date.now()
        const ACTIVITY_TIMEOUT = 3000 // 3 secondes max pour une activité hover (réduit pour éviter les reliquats)
        
        Object.entries(activities).forEach(([activityId, activity]: [string, any]) => {
          // Nettoyer les activités trop anciennes
          if (activity.startedAt && (now - activity.startedAt) > ACTIVITY_TIMEOUT) {
            return
          }
          
          // Utiliser l'ID de l'activité comme clé unique
          this._activities.set(activityId, activity)
        })
      }
      this.notifyActivityChanges()
    })
    this.rtdbListeners.push(() => off(activitiesRef, 'value', activitiesListener))

    // 4. Écouter les locks en temps réel
    const locksRef = ref(this.rtdb, `cellLocks/${this.currentTenantId}`)
    const locksListener = onValue(locksRef, (snapshot) => {
      this._locks.clear()
      if (snapshot.exists()) {
        const locks = snapshot.val()
        Object.entries(locks).forEach(([lockId, lock]: [string, any]) => {
          // Utiliser l'ID du lock comme clé unique
          this._locks.set(lockId, lock)
        })
      }
      this.notifyLockChanges()
    })
    this.rtdbListeners.push(() => off(locksRef, 'value', locksListener))

    // 5. Écouter les sélections multiples des autres utilisateurs
    const selectionsRef = ref(this.rtdb, `selectedCells/${this.currentTenantId}`)
    const selectionsListener = onValue(selectionsRef, (snapshot) => {
      this._remoteSelections.clear()
      if (snapshot.exists()) {
        const selections = snapshot.val()
        Object.entries(selections).forEach(([sessionId, sessionSelections]: [string, any]) => {
          // Ignorer ses propres sélections
          if (sessionId === this.currentSessionId) return
          
          // Ajouter les sélections des autres utilisateurs
          Object.entries(sessionSelections).forEach(([cellKey, selection]: [string, any]) => {
            const selectionId = `${sessionId}_${cellKey}`
            this._remoteSelections.set(selectionId, selection)
          })
        })
      }
      this.notifySelectionChanges()
    })
    this.rtdbListeners.push(() => off(selectionsRef, 'value', selectionsListener))
  }

  // ==========================================
  // GESTION DES LOCKS
  // ==========================================

  async lockCell(collaborateurId: string, date: string): Promise<boolean> {
    if (!this._isActive || !this.currentTenantId || !this.currentSessionId) {
      console.warn('⚠️ Service non initialisé pour lock')
      return false
    }

    const cellId = `${collaborateurId}_${date}`
    const lockId = `${cellId}_${this.currentSessionId}`
    
    // Vérifier si la cellule est déjà verrouillée par quelqu'un d'autre
    const existingLock = Array.from(this._locks.values()).find(
      lock => lock.cellId === cellId && lock.sessionId !== this.currentSessionId
    )
    
    if (existingLock) {
      console.log('🔒 Cellule déjà verrouillée par', existingLock.userName)
      return false
    }

    try {
      const lock: CellLock = {
        cellId,
        collaborateurId,
        date,
        userId: this.currentUserId!,
        userName: this.currentUserName!,
        sessionId: this.currentSessionId,
        lockedAt: rtdbServerTimestamp(),
        tenantId: this.currentTenantId,
        expiresAt: Date.now() + (2 * 60 * 1000) // 2 minutes
      }

      // Écrire dans RTDB
      const lockRef = ref(this.rtdb, `cellLocks/${this.currentTenantId}/${lockId}`)
      await set(lockRef, lock)
      await onDisconnect(lockRef).remove()

      console.log('🔒 Cellule verrouillée:', cellId)
      return true
    } catch (error) {
      console.error('❌ Erreur verrouillage cellule:', error)
      return false
    }
  }

  async unlockCell(collaborateurId: string, date: string): Promise<void> {
    if (!this._isActive || !this.currentTenantId || !this.currentSessionId) return

    const cellId = `${collaborateurId}_${date}`
    const lockId = `${cellId}_${this.currentSessionId}`

    try {
      // Supprimer de RTDB
      const lockRef = ref(this.rtdb, `cellLocks/${this.currentTenantId}/${lockId}`)
      await remove(lockRef)
      
      console.log('🔓 Cellule déverrouillée:', cellId)
    } catch (error) {
      console.warn('⚠️ Erreur déverrouillage cellule:', error)
    }
  }

  // ==========================================
  // GESTION DES ACTIVITÉS
  // ==========================================

  async hoverCell(collaborateurId: string, date: string) {
    if (!this._isActive) return

    // Nettoyer le survol précédent
    await this.clearCurrentHover()

    // Mémoriser le nouveau survol
    this._currentHover = { collaborateurId, date }

    // NOUVEAU SYSTÈME : Un seul hover par utilisateur, on le remplace à chaque fois
    const userHoverId = `${this.currentUserId}_hover` // Un seul hover par utilisateur
    const activity: CellActivity = {
      type: 'hovering',
      cellId: `${collaborateurId}_${date}`,
      collaborateurId,
      date,
      userId: this.currentUserId!,
      userName: this.currentUserName!,
      userEmail: this.currentUserEmail!,
      sessionId: this.currentSessionId!,
      startedAt: rtdbServerTimestamp(),
      tenantId: this.currentTenantId!
    }

    await this.writeActivityToRTDB(userHoverId, activity)
  }

  private async writeActivityToRTDB(activityId: string, activity: CellActivity) {
    try {
      const activityRef = ref(this.rtdb, `cellActivities/${this.currentTenantId}/${activityId}`)
      await set(activityRef, activity)
    } catch (error) {
      console.warn('⚠️ Erreur écriture activité RTDB:', error)
    }
  }

  async unhoverCell(_collaborateurId: string, _date: string) {
    // Cette méthode est maintenant remplacée par clearCurrentHover
    return this.clearCurrentHover()
  }

  async clearCurrentHover() {
    if (!this._isActive) return
    
    // NOUVEAU SYSTÈME : Supprimer le hover unique de cet utilisateur
    const userHoverId = `${this.currentUserId}_hover`
    const activityRef = ref(this.rtdb, `cellActivities/${this.currentTenantId}/${userHoverId}`)
    await remove(activityRef)
    
    this._currentHover = null
  }

  // ==========================================
  // GESTION DES SÉLECTIONS MULTIPLES
  // ==========================================

  async updateSelectedCells(selectedCells: Set<string>) {
    if (!this._isActive || !this.currentTenantId || !this.currentSessionId) return

    try {
      const selectedCellsRef = ref(this.rtdb, `selectedCells/${this.currentTenantId}/${this.currentSessionId}`)
      
      if (selectedCells.size === 0) {
        // Supprimer toutes les sélections si aucune cellule sélectionnée
        await remove(selectedCellsRef)
        console.log('🧹 Sélections supprimées de RTDB')
        return
      }

      // Convertir le Set en objet pour RTDB
      const cellsData: Record<string, any> = {}
      selectedCells.forEach(cellId => {
        // Extraire collaborateurId et date du format "id-date"
        const parts = cellId.split('-')
        const date = parts.slice(-3).join('-') // Dernières 3 parties pour YYYY-MM-DD
        const collaborateurId = parts.slice(0, -3).join('-') // Tout le reste
        
        cellsData[cellId] = {
          cellId: `${collaborateurId}_${date}`, // Format pour compatibilité avec locks
          collaborateurId,
          date,
          userId: this.currentUserId!,
          userName: this.currentUserName!,
          userEmail: this.currentUserEmail!,
          sessionId: this.currentSessionId,
          selectedAt: rtdbServerTimestamp(),
          tenantId: this.currentTenantId,
          type: 'multiselect'
        }
      })

      await set(selectedCellsRef, cellsData)
      await onDisconnect(selectedCellsRef).remove()
      
      console.log('📋 Sélections transmises à RTDB:', selectedCells.size, 'cellules')
    } catch (error) {
      console.warn('⚠️ Erreur transmission sélections:', error)
    }
  }

  async clearSelectedCells() {
    if (!this._isActive || !this.currentTenantId || !this.currentSessionId) return
    
    try {
      const selectedCellsRef = ref(this.rtdb, `selectedCells/${this.currentTenantId}/${this.currentSessionId}`)
      await remove(selectedCellsRef)
      console.log('🧹 Sélections supprimées de RTDB')
    } catch (error) {
      console.warn('⚠️ Erreur suppression sélections:', error)
    }
  }

  // ==========================================
  // MÉTHODES DE COMPATIBILITÉ (ancien API)
  // ==========================================

  isCellLocked(collaborateurId: string, date: string): boolean {
    const cellId = `${collaborateurId}_${date}`
    return Array.from(this._locks.values()).some(lock => lock.cellId === cellId)
  }

  getCellLock(collaborateurId: string, date: string): CellLock | null {
    const cellId = `${collaborateurId}_${date}`
    return Array.from(this._locks.values()).find(lock => lock.cellId === cellId) || null
  }

  isCellSelectedByOthers(collaborateurId: string, date: string): boolean {
    const cellId = `${collaborateurId}_${date}`
    return Array.from(this._remoteSelections.values()).some(selection => selection.cellId === cellId)
  }

  getCellSelection(collaborateurId: string, date: string): any | null {
    const cellId = `${collaborateurId}_${date}`
    return Array.from(this._remoteSelections.values()).find(selection => selection.cellId === cellId) || null
  }

  getHoveringUsers(collaborateurId: string, date: string): any[] {
    const cellId = `${collaborateurId}_${date}`
    const users = Array.from(this._activities.values())
      .filter(activity => 
        activity.type === 'hovering' && 
        activity.cellId === cellId &&
        activity.sessionId !== this.currentSessionId  // Exclure seulement la session actuelle, pas l'utilisateur
      )
      .map(activity => ({
        userId: activity.userId,
        userName: activity.userName,
        userEmail: activity.userEmail,
        sessionId: activity.sessionId
      }))
    
    return users
  }

  updateHoveredCell(collaborateurId: string, date: string) {
    return this.hoverCell(collaborateurId, date)
  }

  clearHoveredCell() {
    return this.clearCurrentHover()
  }

  lockCellForEditing(collaborateurId: string, date: string): Promise<boolean> {
    return this.lockCell(collaborateurId, date)
  }

  async init(tenantId: string, options?: any) {
    // Adapter l'ancienne API d'initialisation
    if (!options || !options.userId || !options.userName || !options.userEmail) {
      console.warn('⚠️ Options d\'initialisation manquantes pour hybridMultiUserService')
      return
    }
    return this.initialize(options.userId, options.userName, options.userEmail, tenantId)
  }

  getStats() {
    return {
      totalUsers: this._users.size,
      totalActivities: this._activities.size,
      totalLocks: this._locks.size,
      presence: this._presence.size
    }
  }

  onMouseLeavePlanning() {
    // Nettoyage de tous les survols
    return this.clearCurrentHover()
  }

  onMouseLeaveWindow() {
    // Nettoyage de tous les survols (alias pour compatibilité)
    return this.clearCurrentHover()
  }

  // ==========================================
  // NETTOYAGE
  // ==========================================

  async cleanup() {
    if (!this._isActive) return

    console.log('🧹 Nettoyage du service multi-utilisateur...')
    
    // Nettoyer les listeners
    this.rtdbListeners.forEach(unsubscribe => unsubscribe())
    this.rtdbListeners = []
    
    // Nettoyer les callbacks
    this.lockChangeCallbacks = []
    this.presenceChangeCallbacks = []
    this.userChangeCallbacks = []
    this.activityChangeCallbacks = []
    this.selectionChangeCallbacks = []
    
    // Nettoyer l'état local
    this._users.clear()
    this._presence.clear()
    this._activities.clear()
    this._locks.clear()
    this._remoteSelections.clear()
    this._currentHover = null
    
    // Marquer comme inactif
    this._isActive = false
    this.presenceWritesEnabled = false
    
    // Reset des identifiants
    this.currentUserId = null
    this.currentUserName = null
    this.currentUserEmail = null
    this.currentSessionId = null
    this.currentTenantId = null
    this.presenceRef = null
    this.sessionRef = null
    
    console.log('✅ Service multi-utilisateur nettoyé')
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  setPresenceWritesEnabled(enabled: boolean) {
    this.presenceWritesEnabled = !!enabled
  }
}

// ==========================================
// INSTANCE SINGLETON
// ==========================================

export const hybridMultiUserService = new HybridMultiUserService()
export default hybridMultiUserService
