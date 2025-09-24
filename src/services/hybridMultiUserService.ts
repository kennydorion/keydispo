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
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
  remove,
  off
} from 'firebase/database'

import { rtdb } from './firebase'
import { emergencyOptimization } from './emergencyOptimization'

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
  
  // Configuration (les écritures de présence sont gérées via emergencyOptimization)
  
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
  private hoverHeartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastLockAttemptPerCell = new Map<string, number>()
  private inFlightLockOps = new Set<string>()
  
  // Listeners pour cleanup
  private rtdbListeners: Function[] = []
  
  // Débounces pour éviter les appels excessifs
  private notifyDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

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
  getSessionId() { return this.currentSessionId }

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
    this.debounceNotify('locks', () => {
      this.lockChangeCallbacks.forEach(callback => callback(new Map(this._locks)))
    })
  }

  private notifyPresenceChanges() {
    this.debounceNotify('presence', () => {
      this.presenceChangeCallbacks.forEach(callback => callback(new Map(this._presence)))
    })
  }

  private notifyUserChanges() {
    this.debounceNotify('users', () => {
      this.userChangeCallbacks.forEach(callback => callback(new Map(this._users)))
    })
  }

  private notifyActivityChanges() {
    this.debounceNotify('activities', () => {
      this.activityChangeCallbacks.forEach(callback => callback(new Map(this._activities)))
    })
  }

  private notifySelectionChanges() {
    this.debounceNotify('selections', () => {
      this.selectionChangeCallbacks.forEach(callback => callback(new Map(this._remoteSelections)))
    })
  }

  /**
   * Méthode de débounce pour éviter les appels excessifs
   */
  private debounceNotify(key: string, callback: () => void, delay = 150) {
    // Annuler le timer précédent s'il existe
    const existingTimer = this.notifyDebounceTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // Programmer le nouveau callback
    const timer = setTimeout(() => {
      try {
        callback()
      } catch (error) {
        console.warn(`⚠️ Erreur dans callback ${key}:`, error)
      } finally {
        this.notifyDebounceTimers.delete(key)
      }
    }, delay)
    
    this.notifyDebounceTimers.set(key, timer)
  }

  // ==========================================
  // INITIALISATION
  // ==========================================

  private async setupRealtimePresence() {
    if (!this.currentUserId || !this.currentTenantId || !this.currentSessionId) return
    if (emergencyOptimization?.isServiceDisabled?.('DISABLE_PRESENCE_TRACKING')) {
      console.warn('🚨 [EMERGENCY] Presence tracking désactivé - mode lecture seule')
  // Présence non écrite (mode urgence)
      return
    }
    if (!this.rtdb) {
      console.warn('⚠️ RTDB non initialisée, annulation de setupRealtimePresence')
  // Présence non écrite (RTDB absente)
      return
    }

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

    try {
      await set(this.sessionRef, sessionData)
    } catch (e) {
      console.warn('⚠️ Échec écriture session RTDB:', (e as any)?.message || e)
  // Présence non écrite (échec session)
      return
    }

    // Configurer la présence
    const presenceData = {
      userId: this.currentUserId,
      userName: this.currentUserName,
      status: 'online',
      lastSeen: rtdbServerTimestamp(),
      sessionId: this.currentSessionId,
      tenantId: this.currentTenantId
    }

    try {
      await set(this.presenceRef, presenceData)
      await onDisconnect(this.presenceRef).remove()
      await onDisconnect(this.sessionRef).remove()
    } catch (e) {
      console.warn('⚠️ onDisconnect indisponible:', (e as any)?.message || e)
    }
    
    // Marquer comme configuré
  // Présence initialisée
  }

  private startRealtimeListeners() {
    if (!this.currentTenantId) return
    if (!this.rtdb) {
      console.warn('⚠️ RTDB non initialisée, listeners désactivés')
      return
    }
    if (emergencyOptimization?.isServiceDisabled?.('DISABLE_PRESENCE_TRACKING')) {
      return
    }

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
    // Timeout légèrement supérieur au heartbeat pour éviter le clignotement en cas de latence
    const ACTIVITY_TIMEOUT = 6000 // 6s max pour une activité hover (heartbeat à 1.5s)
        
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

    // 4. Écouter les locks en temps réel (incrémental)
    const locksRef = ref(this.rtdb, `cellLocks/${this.currentTenantId}`)
    const isLockExpired = (lock: any) => typeof lock?.expiresAt === 'number' && lock.expiresAt < Date.now()

    const childAdded = onChildAdded(locksRef, (snapshot) => {
      const lockId = snapshot.key as string
      const lock = snapshot.val()
      if (!isLockExpired(lock)) {
        this._locks.set(lockId, lock)
        this.notifyLockChanges()
      }
    })
    const childChanged = onChildChanged(locksRef, (snapshot) => {
      const lockId = snapshot.key as string
      const lock = snapshot.val()
      if (isLockExpired(lock)) {
        this._locks.delete(lockId)
      } else {
        this._locks.set(lockId, lock)
      }
      this.notifyLockChanges()
    })
    const childRemoved = onChildRemoved(locksRef, (snapshot) => {
      const lockId = snapshot.key as string
      this._locks.delete(lockId)
      this.notifyLockChanges()
    })
    this.rtdbListeners.push(() => off(locksRef, 'child_added', childAdded))
    this.rtdbListeners.push(() => off(locksRef, 'child_changed', childChanged))
    this.rtdbListeners.push(() => off(locksRef, 'child_removed', childRemoved))

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
    if (emergencyOptimization?.isServiceDisabled?.('DISABLE_PRESENCE_TRACKING')) {
      return false
    }
    if (!this.rtdb) return false

    const cellId = `${collaborateurId}_${date}`
    const lockId = `${cellId}_${this.currentSessionId}`
    const now = Date.now()
    const lastAttempt = this.lastLockAttemptPerCell.get(cellId) || 0
    if (now - lastAttempt < 200) {
      // Cooldown pour éviter spam
      return false
    }
    this.lastLockAttemptPerCell.set(cellId, now)
    if (this.inFlightLockOps.has(lockId)) {
      return false
    }
    
    // Vérifier si la cellule est déjà verrouillée par quelqu'un d'autre
    const existingLock = Array.from(this._locks.values()).find(
      lock => lock.cellId === cellId && (!lock.expiresAt || lock.expiresAt > now)
    )
    
    if (existingLock) {
      // Idempotent si déjà verrouillé par nous
      if (existingLock.sessionId === this.currentSessionId) {
        return true
      }
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
      this.inFlightLockOps.add(lockId)
      await set(lockRef, lock)
  try { await onDisconnect(lockRef).remove() } catch {}

      return true
    } catch (error) {
      console.error('❌ Erreur verrouillage cellule:', error)
      return false
    } finally {
      this.inFlightLockOps.delete(lockId)
    }
  }

  async unlockCell(collaborateurId: string, date: string): Promise<void> {
    if (!this._isActive || !this.currentTenantId || !this.currentSessionId) return
  if (!this.rtdb) return

    const cellId = `${collaborateurId}_${date}`
    const lockId = `${cellId}_${this.currentSessionId}`
    if (this.inFlightLockOps.has(lockId)) return

    try {
      // Supprimer de RTDB
      const lockRef = ref(this.rtdb, `cellLocks/${this.currentTenantId}/${lockId}`)
      this.inFlightLockOps.add(lockId)
      await remove(lockRef)
      
    } catch (error) {
      console.warn('⚠️ Erreur déverrouillage cellule:', error)
    } finally {
      this.inFlightLockOps.delete(lockId)
    }
  }

  // ==========================================
  // GESTION DES ACTIVITÉS
  // ==========================================

  async hoverCell(collaborateurId: string, date: string) {
    if (emergencyOptimization?.isServiceDisabled?.('DISABLE_HOVER_BROADCAST')) {
      return
    }
    if (!this._isActive) {
      console.warn('⚠️ Service non actif pour hover')
      return
    }

  // Si nous survolons déjà exactement cette cellule, on fait juste un refresh
  const sameAsCurrent = this._currentHover && this._currentHover.collaborateurId === collaborateurId && this._currentHover.date === date
  // IMPORTANT: Ne pas supprimer l'activité existante lors d'un changement de cellule.
  // On réécrit simplement la même entrée (un seul hover par user) avec la nouvelle cellId
  // pour éviter toute fenêtre sans activité qui provoquerait du flicker côté clients.

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
    
    // Petit throttle: n'écrire que si changement de cellule OU > 120ms depuis dernière écriture
    const now = Date.now()
    const lastWriteKey = `${userHoverId}_lastWrite`
    const lastWrite = (this as any)[lastWriteKey] as number | undefined
    const THROTTLE_MS = 120
  if (!sameAsCurrent || !lastWrite || (now - lastWrite) > THROTTLE_MS) {
      await this.writeActivityToRTDB(userHoverId, activity)
      ;(this as any)[lastWriteKey] = now
    }

    // Assurer le nettoyage automatique si la connexion se coupe
    try {
      const activityRef = ref(this.rtdb, `cellActivities/${this.currentTenantId}/${userHoverId}`)
      await onDisconnect(activityRef).remove()
    } catch {}

    // Démarrer/rafraîchir le heartbeat pour maintenir le hover vivant tant que la cellule est survolée
    if (this.hoverHeartbeatTimer) {
      clearInterval(this.hoverHeartbeatTimer)
      this.hoverHeartbeatTimer = null
    }
  this.hoverHeartbeatTimer = setInterval(async () => {
      try {
        // Si service inactif ou plus de hover courant, arrêter le heartbeat
        if (!this._isActive || !this._currentHover) {
          if (this.hoverHeartbeatTimer) {
            clearInterval(this.hoverHeartbeatTimer)
            this.hoverHeartbeatTimer = null
          }
          return
        }
        // Réécrire la même activité avec un nouveau timestamp pour garder l'entrée fraîche
        const heartbeatActivity: CellActivity = {
          type: 'hovering',
          cellId: `${this._currentHover.collaborateurId}_${this._currentHover.date}`,
          collaborateurId: this._currentHover.collaborateurId,
          date: this._currentHover.date,
          userId: this.currentUserId!,
          userName: this.currentUserName!,
          userEmail: this.currentUserEmail!,
          sessionId: this.currentSessionId!,
          startedAt: rtdbServerTimestamp(),
          tenantId: this.currentTenantId!
        }
        // Heartbeat toutes 1500ms - pas besoin de throttle supplémentaire ici
        await this.writeActivityToRTDB(userHoverId, heartbeatActivity)
      } catch {}
    }, 1500)
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
    if (!this._isActive) {
      console.warn('⚠️ Service non actif pour clear hover')
      return
    }
    
    // NOUVEAU SYSTÈME : Supprimer le hover unique de cet utilisateur
    const userHoverId = `${this.currentUserId}_hover`
    const activityRef = ref(this.rtdb, `cellActivities/${this.currentTenantId}/${userHoverId}`)
    await remove(activityRef)
    
    this._currentHover = null
    if (this.hoverHeartbeatTimer) {
      clearInterval(this.hoverHeartbeatTimer)
      this.hoverHeartbeatTimer = null
    }
  }

  // ==========================================
  // GESTION DES SÉLECTIONS MULTIPLES
  // ==========================================

  async updateSelectedCells(selectedCells: Set<string>) {
  if (!this._isActive || !this.currentTenantId || !this.currentSessionId) return
  if (emergencyOptimization?.isServiceDisabled?.('DISABLE_PRESENCE_TRACKING')) return
  if (!this.rtdb) return

    try {
      const selectedCellsRef = ref(this.rtdb, `selectedCells/${this.currentTenantId}/${this.currentSessionId}`)
      
      if (selectedCells.size === 0) {
        // Supprimer toutes les sélections si aucune cellule sélectionnée
        await remove(selectedCellsRef)
        // Sélections supprimées
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
  try { await onDisconnect(selectedCellsRef).remove() } catch {}
      
      // Sélections transmises
    } catch (error) {
      console.warn('⚠️ Erreur transmission sélections:', error)
    }
  }

  async clearSelectedCells() {
  if (!this._isActive || !this.currentTenantId || !this.currentSessionId) return
  if (!this.rtdb) return
    
    try {
      const selectedCellsRef = ref(this.rtdb, `selectedCells/${this.currentTenantId}/${this.currentSessionId}`)
      await remove(selectedCellsRef)
      // Sélections supprimées
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
      .filter(activity => {
        const isHovering = activity.type === 'hovering'
        const sameCell = activity.cellId === cellId
        const differentSession = activity.sessionId !== this.currentSessionId

        return isHovering && sameCell && differentSession
      })
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
    // Vérifier si déjà initialisé pour éviter les boucles infinies
    if (this._isActive && this.currentTenantId === tenantId && this.currentUserId === options?.userId) {
      console.warn('⚠️ HybridMultiUserService déjà initialisé pour ce tenant/utilisateur')
      return true
    }
    
    // Nettoyer l'ancienne session si elle existe
    if (this._isActive) {
      
      await this.cleanup()
    }
    
    // Initialiser le service avec les données utilisateur
    if (!options || !options.userId || !options.userName || !options.userEmail) {
      console.warn('⚠️ Options d\'initialisation manquantes pour hybridMultiUserService')
      return false
    }
    
    this.currentTenantId = tenantId
    this.currentUserId = options.userId
    this.currentUserName = options.userName
    this.currentUserEmail = options.userEmail
    this.currentSessionId = this.generateSessionId()
    
    
    
    // Initialiser RTDB si nécessaire
    if (!this.rtdb) {
      const { getDatabase } = await import('firebase/database')
      this.rtdb = getDatabase()
    }
    
    // Activer le service
    this._isActive = true

    // Démarrer les listeners en lecture (sessions/presence/activities/locks/selections)
    this.startRealtimeListeners()

    // Écrire la session/presence dans RTDB pour que les autres clients vous voient
    try {
      await this.setupRealtimePresence()
    } catch (e) {
      console.warn('⚠️ Impossible d’écrire la présence/session RTDB:', (e as any)?.message || e)
      // On continue: les activités/locks restent fonctionnels même sans présence
    }

    return true
  }
  
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
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

    // Nettoyage du service
    
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
    if (this.hoverHeartbeatTimer) {
      clearInterval(this.hoverHeartbeatTimer)
      this.hoverHeartbeatTimer = null
    }
    
    // Nettoyer les timers de débounce
    this.notifyDebounceTimers.forEach(timer => clearTimeout(timer))
    this.notifyDebounceTimers.clear()
    
    // Marquer comme inactif
    this._isActive = false
  // Présence désactivée au cleanup
    
    // Reset des identifiants
    this.currentUserId = null
    this.currentUserName = null
    this.currentUserEmail = null
    this.currentSessionId = null
    this.currentTenantId = null
    this.presenceRef = null
    this.sessionRef = null
    
    // Service nettoyé
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  // setPresenceWritesEnabled retiré; utiliser emergencyOptimization
}

// ==========================================
// INSTANCE SINGLETON
// ==========================================

export const hybridMultiUserService = new HybridMultiUserService()
export default hybridMultiUserService
