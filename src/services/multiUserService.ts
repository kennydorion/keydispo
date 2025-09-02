/**
 * Service unifié de collaboration multi-utilisateur
 * 
 * Ce service consolide et améliore la gestion multi-utilisateur en unifiant :
 * - La gestion des sessions utilisateur
 * - Le suivi des mouvements dans les cellules
 * - Le blocage intelligent des cellules
 * - L'affichage temps réel des présences
 * 
 * Objectifs :
 * ✅ Gestion efficace des sessions multi-onglets
 * ✅ Suivi précis des mouvements dans les cellules
 * ✅ Blocage intelligent sans conflits
 * ✅ Nettoyage automatique optimisé
 * ✅ Interface unifiée simple
 */

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp, 
  writeBatch,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore'
import { firestoreListenerManager } from './firestoreListenerManager'
import { hybridDataService } from './hybridDataService'
import { db } from '../firebase'
import type { Timestamp } from 'firebase/firestore'

// ==========================================
// TYPES ET INTERFACES
// ==========================================

export interface UserSession {
  sessionId: string
  userId: string
  userName: string
  userEmail: string
  tenantId: string
  
  // État de la session
  status: 'online' | 'idle' | 'background' | 'offline'
  lastActivity: Timestamp
  connectedAt: Timestamp
  expiresAt: Timestamp
  
  // Localisation utilisateur
  currentPath: string // URL actuelle
  userAgent: string
  
  // Actions actuelles
  currentAction?: {
    type: 'viewing' | 'hovering' | 'editing' | 'modal'
    cellId?: string // collaborateurId_date
    collaborateurId?: string
    date?: string
    startedAt: Timestamp
    metadata?: any
  }
}

export interface CellActivity {
  cellId: string // collaborateurId_date
  collaborateurId: string
  date: string
  tenantId: string
  
  // Session qui contrôle cette cellule
  sessionId: string
  userId: string
  userName: string
  
  // Type d'activité
  activityType: 'hover' | 'editing' | 'locked' | 'viewing'
  
  // Timestamps
  startedAt: Timestamp
  lastUpdate: Timestamp
  expiresAt: Timestamp
  
  // Métadonnées
  metadata?: {
    lockType?: 'editing' | 'modal' | 'viewing'
    priority?: number // Pour résoudre les conflits
    source?: string // Où l'action a été initiée
  }
}

export interface MultiUserState {
  sessions: Map<string, UserSession>
  activities: Map<string, CellActivity>
  usersBySessions: Map<string, UserSession[]> // userId -> sessions[]
}

// Callbacks
export type SessionChangeCallback = (state: MultiUserState) => void
export type CellActivityCallback = (cellId: string, activity: CellActivity | null) => void

// ==========================================
// SERVICE PRINCIPAL
// ==========================================

class MultiUserService {
  private tenantId: string | null = null
  private currentUserId: string | null = null
  private currentSessionId: string = this.generateSessionId()
  private currentSession: UserSession | null = null
  
  // Cache local optimisé
  private sessionsCache = new Map<string, UserSession>()
  private activitiesCache = new Map<string, CellActivity>()
  private userSessionsMap = new Map<string, UserSession[]>()
  
  // Listeners Firestore
  private sessionsListener: (() => void) | null = null
  private activitiesListener: (() => void) | null = null
  
  // Callbacks abonnés
  private sessionCallbacks = new Set<SessionChangeCallback>()
  private cellCallbacks = new Map<string, Set<CellActivityCallback>>()
  
  // Timers et cleanup
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private activityTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
  
  // Configuration optimisée pour les performances
  private readonly CONFIG = {
    HEARTBEAT_INTERVAL: 60000,       // 1min entre chaque heartbeat (était 10s)
    SESSION_TIMEOUT: 300000,         // 5min timeout pour session (était 45s)
    HOVER_TIMEOUT: 30000,            // 30s timeout pour hover (était 15s)
    EDITING_TIMEOUT: 120000,         // 2min timeout pour édition (inchangé)
    CLEANUP_INTERVAL: 120000,        // 2min entre les nettoyages (était 30s)
    MAX_SESSIONS_PER_USER: 3         // Limite sessions par utilisateur (était 10)
  }

  // ==========================================
  // INITIALISATION
  // ==========================================

  async init(tenantId: string, user: { uid: string; displayName?: string; email?: string }) {
    if (this.tenantId) {
      console.warn('⚠️ MultiUserService déjà initialisé')
      return
    }

    this.tenantId = tenantId
    this.currentUserId = user.uid
    
    console.log(`🚀 Initialisation MultiUserService pour ${user.displayName || user.email}`)
    
    // Créer la session utilisateur
    await this.createUserSession(user)
    
    // Démarrer les listeners temps réel
    this.setupSessionsListener()
    this.setupActivitiesListener()
    
    // Démarrer les timers
    this.startHeartbeat()
    this.startCleanupTimer()
    
    // Gestionnaires de page
    this.setupPageHandlers()
    
    console.log(`✅ MultiUserService initialisé (session: ${this.currentSessionId.slice(-8)})`)
  }

  private generateSessionId(): string {
    return `ms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async createUserSession(user: { uid: string; displayName?: string; email?: string }) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.CONFIG.SESSION_TIMEOUT)
    
    this.currentSession = {
      sessionId: this.currentSessionId,
      userId: user.uid,
      userName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
      userEmail: user.email || '',
      tenantId: this.tenantId!,
      status: 'online',
      lastActivity: serverTimestamp() as Timestamp,
      connectedAt: serverTimestamp() as Timestamp,
      expiresAt: expiresAt as any,
      currentPath: window.location.pathname,
      userAgent: navigator.userAgent.substring(0, 200) // Limiter la taille
    }

    const sessionRef = doc(db, `tenants/${this.tenantId}/sessions/${this.currentSessionId}`)
    await setDoc(sessionRef, this.currentSession)
    
    console.log(`📱 Session créée: ${this.currentSessionId}`)
  }

  // ==========================================
  // GESTION DES SESSIONS
  // ==========================================

  private setupSessionsListener() {
    if (!this.tenantId) return

    const sessionsQuery = query(
      collection(db, `tenants/${this.tenantId}/sessions`),
      where('status', 'in', ['online', 'idle', 'background']),
      orderBy('lastActivity', 'desc'),
      limit(20) // Limiter pour les performances (était 100)
    )

    const sessionsListenerId = firestoreListenerManager.subscribe(
      sessionsQuery, 
      (snapshot: any) => {
        // Sessions mises à jour
        
        this.sessionsCache.clear()
        this.userSessionsMap.clear()
        
        const now = Date.now()
        
        snapshot.forEach((doc: any) => {
          const session = doc.data() as UserSession
          
          // Vérifier si pas expirée
          const expiresAt = session.expiresAt?.toDate?.()?.getTime() || 0
          if (now < expiresAt) {
            this.sessionsCache.set(session.sessionId, session)
            
            // Indexer par utilisateur
            if (!this.userSessionsMap.has(session.userId)) {
              this.userSessionsMap.set(session.userId, [])
            }
            this.userSessionsMap.get(session.userId)!.push(session)
          }
        })
        
        this.notifySessionChange()
      },
      'multiuser_sessions'
    )
    
    this.sessionsListener = () => firestoreListenerManager.unsubscribe(sessionsListenerId)
  }

  private async updateSessionHeartbeat() {
    if (!this.currentSession || !this.tenantId) return

    try {
      const sessionRef = doc(db, `tenants/${this.tenantId}/sessions/${this.currentSessionId}`)
      const expiresAt = new Date(Date.now() + this.CONFIG.SESSION_TIMEOUT)
      
      // Utiliser setDoc avec merge pour créer le document si il n'existe pas
      await setDoc(sessionRef, {
        lastActivity: serverTimestamp(),
        expiresAt: expiresAt,
        currentPath: window.location.pathname,
        status: this.currentSession.status
      }, { merge: true })
      
      // Mettre à jour le cache local
      if (this.currentSession) {
        this.currentSession.lastActivity = serverTimestamp() as Timestamp
        this.currentSession.expiresAt = expiresAt as any
        this.currentSession.currentPath = window.location.pathname
      }
      
    } catch (error: any) {
      console.error('❌ Erreur heartbeat session:', error)
      // En cas d'erreur, essayer de recréer la session
      if (error?.message?.includes('NOT_FOUND') || error?.code === 'not-found') {
        console.log('🔄 Recréation de la session...')
        await this.recreateCurrentSession()
      }
    }
  }

  private async recreateCurrentSession() {
    if (!this.currentSession) return
    
    try {
      const sessionRef = doc(db, `tenants/${this.tenantId}/sessions/${this.currentSessionId}`)
      await setDoc(sessionRef, this.currentSession)
      console.log(`🔄 Session recréée: ${this.currentSessionId}`)
    } catch (error) {
      console.error('❌ Erreur recréation session:', error)
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.updateSessionHeartbeat()
    }, this.CONFIG.HEARTBEAT_INTERVAL)
  }

  // ==========================================
  // GESTION DES ACTIVITÉS CELLULES
  // ==========================================

  private setupActivitiesListener() {
    if (!this.tenantId) return

    const activitiesQuery = query(
      collection(db, `tenants/${this.tenantId}/cellActivities`),
      orderBy('lastUpdate', 'desc'),
      limit(50) // Limiter pour les performances (était 200)
    )

    const activitiesListenerId = firestoreListenerManager.subscribe(
      activitiesQuery,
      (snapshot: any) => {
        // Activités cellules mises à jour
        
        this.activitiesCache.clear()
        const now = Date.now()
        
        snapshot.forEach((doc: any) => {
          const activity = doc.data() as CellActivity
          
          // Vérifier si pas expirée
          const expiresAt = activity.expiresAt?.toDate?.()?.getTime() || 0
          if (now < expiresAt) {
            this.activitiesCache.set(activity.cellId, activity)
            
            // Notifier les callbacks spécifiques à cette cellule
            this.notifyCellActivity(activity.cellId, activity)
          }
        })
      },
      'multiuser_activities'
    )
    
    this.activitiesListener = () => firestoreListenerManager.unsubscribe(activitiesListenerId)
  }

  /**
   * Démarrer une activité sur une cellule
   */
  async startCellActivity(
    collaborateurId: string, 
    date: string, 
    activityType: 'hover' | 'editing' | 'locked' | 'viewing',
    metadata?: any
  ): Promise<boolean> {
    if (!this.tenantId || !this.currentSession) return false

    const cellId = `${collaborateurId}_${date}`
    
    // Vérifier si la cellule est déjà verrouillée par quelqu'un d'autre
    const existingActivity = this.activitiesCache.get(cellId)
    if (existingActivity && 
        existingActivity.sessionId !== this.currentSessionId &&
        (existingActivity.activityType === 'editing' || existingActivity.activityType === 'locked')) {
      
      console.log(`🔒 Cellule ${cellId} déjà verrouillée par ${existingActivity.userName}`)
      return false
    }

    try {
      // Calculer timeout selon le type
      let timeout: number
      switch (activityType) {
        case 'hover':
          timeout = this.CONFIG.HOVER_TIMEOUT
          break
        case 'editing':
        case 'locked':
          timeout = this.CONFIG.EDITING_TIMEOUT
          break
        case 'viewing':
        default:
          timeout = this.CONFIG.HOVER_TIMEOUT
      }

      const now = new Date()
      const activity: CellActivity = {
        cellId,
        collaborateurId,
        date,
        tenantId: this.tenantId,
        sessionId: this.currentSessionId,
        userId: this.currentSession.userId,
        userName: this.currentSession.userName,
        activityType,
        startedAt: serverTimestamp() as Timestamp,
        lastUpdate: serverTimestamp() as Timestamp,
        expiresAt: new Date(now.getTime() + timeout) as any,
        metadata: {
          ...metadata,
          source: window.location.pathname,
          userAgent: navigator.userAgent.substring(0, 100)
        }
      }

      const activityRef = doc(db, `tenants/${this.tenantId}/cellActivities/${cellId}`)
      await setDoc(activityRef, activity)
      
      // Programmer l'auto-nettoyage local
      this.scheduleActivityCleanup(cellId, timeout)
      
      // Mettre à jour la session courante
      if (this.currentSession) {
        this.currentSession.currentAction = {
          type: activityType === 'editing' ? 'editing' : 'viewing',
          cellId,
          collaborateurId,
          date,
          startedAt: serverTimestamp() as Timestamp,
          metadata
        }
        
        const sessionRef = doc(db, `tenants/${this.tenantId}/sessions/${this.currentSessionId}`)
        await setDoc(sessionRef, {
          currentAction: this.currentSession.currentAction,
          lastActivity: serverTimestamp()
        }, { merge: true })
      }
      
      console.log(`✅ Activité ${activityType} démarrée sur ${cellId}`)
      return true
      
    } catch (error) {
      console.error('❌ Erreur démarrage activité:', error)
      return false
    }
  }

  /**
   * Arrêter une activité sur une cellule
   */
  async stopCellActivity(collaborateurId: string, date: string): Promise<boolean> {
    if (!this.tenantId) return false

    const cellId = `${collaborateurId}_${date}`
    
    // Vérifier que c'est notre activité
    const activity = this.activitiesCache.get(cellId)
    if (!activity || activity.sessionId !== this.currentSessionId) {
      console.log(`⚠️ Tentative d'arrêt d'activité non possédée: ${cellId}`)
      return false
    }

    try {
      const activityRef = doc(db, `tenants/${this.tenantId}/cellActivities/${cellId}`)
      await deleteDoc(activityRef)
      
      // Nettoyer le timeout local
      this.clearActivityTimeout(cellId)
      
      // Mettre à jour la session courante
      if (this.currentSession) {
        this.currentSession.currentAction = undefined
        
        const sessionRef = doc(db, `tenants/${this.tenantId}/sessions/${this.currentSessionId}`)
        await setDoc(sessionRef, {
          currentAction: null,
          lastActivity: serverTimestamp()
        }, { merge: true })
      }
      
      console.log(`🛑 Activité arrêtée sur ${cellId}`)
      return true
      
    } catch (error) {
      console.error('❌ Erreur arrêt activité:', error)
      return false
    }
  }

  /**
   * Mettre à jour une activité existante (extend timeout)
   */
  async updateCellActivity(collaborateurId: string, date: string): Promise<boolean> {
    if (!this.tenantId) return false

    const cellId = `${collaborateurId}_${date}`
    const activity = this.activitiesCache.get(cellId)
    
    if (!activity || activity.sessionId !== this.currentSessionId) {
      return false
    }

    try {
      let timeout: number
      switch (activity.activityType) {
        case 'hover':
          timeout = this.CONFIG.HOVER_TIMEOUT
          break
        case 'editing':
        case 'locked':
          timeout = this.CONFIG.EDITING_TIMEOUT
          break
        default:
          timeout = this.CONFIG.HOVER_TIMEOUT
      }

      const expiresAt = new Date(Date.now() + timeout)
      
      const activityRef = doc(db, `tenants/${this.tenantId}/cellActivities/${cellId}`)
      await setDoc(activityRef, {
        lastUpdate: serverTimestamp(),
        expiresAt: expiresAt
      }, { merge: true })
      
      // Reprogrammer le timeout local
      this.scheduleActivityCleanup(cellId, timeout)
      
      return true
      
    } catch (error) {
      console.error('❌ Erreur update activité:', error)
      return false
    }
  }

  private scheduleActivityCleanup(cellId: string, timeout: number) {
    // Nettoyer l'ancien timeout
    this.clearActivityTimeout(cellId)
    
    // Programmer le nouveau
    const timeoutId = setTimeout(async () => {
      const [collaborateurId, date] = cellId.split('_')
      await this.stopCellActivity(collaborateurId, date)
    }, timeout + 1000) // +1s de marge
    
    this.activityTimeouts.set(cellId, timeoutId)
  }

  private clearActivityTimeout(cellId: string) {
    const timeoutId = this.activityTimeouts.get(cellId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.activityTimeouts.delete(cellId)
    }
  }

  // ==========================================
  // API PUBLIQUE - INTERFACE SIMPLE
  // ==========================================

  /**
   * Hover sur une cellule
   */
  async hoverCell(collaborateurId: string, date: string): Promise<boolean> {
    return this.startCellActivity(collaborateurId, date, 'hover')
  }

  /**
   * Verrouiller une cellule pour édition
   */
  async lockCell(collaborateurId: string, date: string, lockType: string = 'editing'): Promise<boolean> {
    return this.startCellActivity(collaborateurId, date, 'locked', { lockType })
  }

  /**
   * Déverrouiller une cellule
   */
  async unlockCell(collaborateurId: string, date: string): Promise<boolean> {
    return this.stopCellActivity(collaborateurId, date)
  }

  /**
   * Vérifier si une cellule est verrouillée par un autre
   */
  isCellLocked(collaborateurId: string, date: string): boolean {
    const cellId = `${collaborateurId}_${date}`
    const activity = this.activitiesCache.get(cellId)
    
    return activity !== undefined && 
           activity.sessionId !== this.currentSessionId &&
           (activity.activityType === 'editing' || activity.activityType === 'locked')
  }

  /**
   * Vérifier si une cellule est survolée par un autre
   */
  isCellHovered(collaborateurId: string, date: string): boolean {
    const cellId = `${collaborateurId}_${date}`
    const activity = this.activitiesCache.get(cellId)
    
    return activity !== undefined && 
           activity.sessionId !== this.currentSessionId &&
           activity.activityType === 'hover'
  }

  /**
   * Obtenir les informations de verrouillage d'une cellule
   */
  getCellLock(collaborateurId: string, date: string) {
    const cellId = `${collaborateurId}_${date}`
    const activity = this.activitiesCache.get(cellId)
    
    if (activity && 
        activity.sessionId !== this.currentSessionId &&
        (activity.activityType === 'editing' || activity.activityType === 'locked')) {
      
      return {
        userId: activity.userId,
        userName: activity.userName,
        sessionId: activity.sessionId,
        lockType: activity.metadata?.lockType || 'editing',
        startedAt: activity.startedAt
      }
    }
    
    return null
  }

  /**
   * Obtenir toutes les sessions actives
   */
  getActiveSessions(): UserSession[] {
    return Array.from(this.sessionsCache.values())
      .filter(session => session.status === 'online' || session.status === 'idle')
      .sort((a, b) => {
        const aTime = a.lastActivity?.toDate?.()?.getTime() || 0
        const bTime = b.lastActivity?.toDate?.()?.getTime() || 0
        return bTime - aTime
      })
  }

  /**
   * Obtenir les utilisateurs uniques connectés
   */
  getUniqueUsers(): { uid: string; displayName: string; sessionCount: number; lastActivity: Date }[] {
    const usersMap = new Map<string, { 
      uid: string; 
      displayName: string; 
      sessionCount: number; 
      lastActivity: Date 
    }>()
    
    this.userSessionsMap.forEach((sessions, userId) => {
      const activeSessions = sessions.filter(s => s.status === 'online' || s.status === 'idle')
      if (activeSessions.length > 0) {
        const latestSession = activeSessions.reduce((latest, session) => {
          const latestTime = latest.lastActivity?.toDate?.()?.getTime() || 0
          const sessionTime = session.lastActivity?.toDate?.()?.getTime() || 0
          return sessionTime > latestTime ? session : latest
        })
        
        usersMap.set(userId, {
          uid: userId,
          displayName: latestSession.userName,
          sessionCount: activeSessions.length,
          lastActivity: latestSession.lastActivity?.toDate?.() || new Date()
        })
      }
    })
    
    return Array.from(usersMap.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
  }

  /**
   * Obtenir les activités sur une cellule spécifique
   */
  getCellActivities(collaborateurId: string, date: string): CellActivity[] {
    const cellId = `${collaborateurId}_${date}`
    const activity = this.activitiesCache.get(cellId)
    return activity ? [activity] : []
  }

  // ==========================================
  // ABONNEMENTS ET CALLBACKS
  // ==========================================

  /**
   * S'abonner aux changements de sessions/présences
   */
  onSessionChange(callback: SessionChangeCallback): () => void {
    this.sessionCallbacks.add(callback)
    
    // Appel initial
    this.notifySessionChange()
    
    return () => {
      this.sessionCallbacks.delete(callback)
    }
  }

  /**
   * S'abonner aux changements d'activité d'une cellule
   */
  onCellActivityChange(collaborateurId: string, date: string, callback: CellActivityCallback): () => void {
    const cellId = `${collaborateurId}_${date}`
    
    if (!this.cellCallbacks.has(cellId)) {
      this.cellCallbacks.set(cellId, new Set())
    }
    
    this.cellCallbacks.get(cellId)!.add(callback)
    
    // Appel initial
    const activity = this.activitiesCache.get(cellId)
    callback(cellId, activity || null)
    
    return () => {
      const callbacks = this.cellCallbacks.get(cellId)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.cellCallbacks.delete(cellId)
        }
      }
    }
  }

  private notifySessionChange() {
    const state: MultiUserState = {
      sessions: new Map(this.sessionsCache),
      activities: new Map(this.activitiesCache),
      usersBySessions: new Map(this.userSessionsMap)
    }
    
    this.sessionCallbacks.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('❌ Erreur callback session:', error)
      }
    })
  }

  private notifyCellActivity(cellId: string, activity: CellActivity) {
    const callbacks = this.cellCallbacks.get(cellId)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(cellId, activity)
        } catch (error) {
          console.error('❌ Erreur callback cellule:', error)
        }
      })
    }
  }

  // ==========================================
  // NETTOYAGE ET MAINTENANCE
  // ==========================================

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup()
    }, this.CONFIG.CLEANUP_INTERVAL)
  }

  private async performCleanup() {
    if (!this.tenantId) return

    try {
      await Promise.all([
        this.cleanupExpiredSessions(),
        this.cleanupExpiredActivities(),
        this.cleanupOldSessions()
      ])
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error)
    }
  }

  private async cleanupExpiredSessions() {
    const sessionsQuery = query(
      collection(db, `tenants/${this.tenantId}/sessions`),
      limit(20) // OPTIMISATION URGENTE: Limiter le nettoyage à 20 sessions max
    )
    const snapshot = await getDocs(sessionsQuery)
    const batch = writeBatch(db)
    const now = Date.now()
    let deletedCount = 0

    snapshot.forEach((doc) => {
      const session = doc.data() as UserSession
      const expiresAt = session.expiresAt?.toDate?.()?.getTime() || 0
      
      if (now >= expiresAt) {
        batch.delete(doc.ref)
        deletedCount++
      }
    })

    if (deletedCount > 0) {
      await batch.commit()
      // ${deletedCount} session(s) expirée(s) supprimée(s)
    }
  }

  private async cleanupExpiredActivities() {
    const activitiesQuery = query(
      collection(db, `tenants/${this.tenantId}/cellActivities`),
      limit(20) // OPTIMISATION URGENTE: Limiter le nettoyage à 20 activités max
    )
    const snapshot = await getDocs(activitiesQuery)
    const batch = writeBatch(db)
    const now = Date.now()
    let deletedCount = 0

    snapshot.forEach((doc) => {
      const activity = doc.data() as CellActivity
      const expiresAt = activity.expiresAt?.toDate?.()?.getTime() || 0
      
      if (now >= expiresAt) {
        batch.delete(doc.ref)
        deletedCount++
      }
    })

    if (deletedCount > 0) {
      await batch.commit()
      console.log(`🧹 ${deletedCount} activité(s) expirée(s) supprimée(s)`)
    }
  }

  private async cleanupOldSessions() {
    // Nettoyer les sessions très anciennes (> 24h) même si pas expirées
    const oldThreshold = Date.now() - (24 * 60 * 60 * 1000)
    const sessionsQuery = query(collection(db, `tenants/${this.tenantId}/sessions`))
    const snapshot = await getDocs(sessionsQuery)
    const batch = writeBatch(db)
    let deletedCount = 0

    snapshot.forEach((doc) => {
      const session = doc.data() as UserSession
      const connectedAt = session.connectedAt?.toDate?.()?.getTime() || 0
      
      if (connectedAt < oldThreshold) {
        batch.delete(doc.ref)
        deletedCount++
      }
    })

    if (deletedCount > 0) {
      await batch.commit()
      // ${deletedCount} ancienne(s) session(s) supprimée(s)
    }
  }

  // ==========================================
  // GESTION DES ÉVÉNEMENTS PAGE
  // ==========================================

  private setupPageHandlers() {
    // Nettoyage à la fermeture
    window.addEventListener('beforeunload', () => {
      this.destroy()
    })

    // Gestion visibilité onglet
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateSessionStatus('background')
      } else {
        this.updateSessionStatus('online')
      }
    })

    // Gestion focus/blur
    window.addEventListener('focus', () => {
      this.updateSessionStatus('online')
    })

    window.addEventListener('blur', () => {
      this.updateSessionStatus('idle')
    })
  }

  private async updateSessionStatus(status: 'online' | 'idle' | 'background') {
    if (!this.currentSession || !this.tenantId) return

    try {
      const sessionRef = doc(db, `tenants/${this.tenantId}/sessions/${this.currentSessionId}`)
      
      // Utiliser setDoc avec merge pour créer le document si il n'existe pas
      await setDoc(sessionRef, {
        status,
        lastActivity: serverTimestamp()
      }, { merge: true })
      
      if (this.currentSession) {
        this.currentSession.status = status
      }
      
    } catch (error: any) {
      console.error('❌ Erreur update status:', error)
      // En cas d'erreur, essayer de recréer la session
      if (error?.message?.includes('NOT_FOUND') || error?.code === 'not-found') {
        console.log('🔄 Recréation de la session pour update status...')
        await this.recreateCurrentSession()
        // Réessayer le changement de statut
        try {
          const sessionRef = doc(db, `tenants/${this.tenantId}/sessions/${this.currentSessionId}`)
          await setDoc(sessionRef, {
            status,
            lastActivity: serverTimestamp()
          }, { merge: true })
          
          if (this.currentSession) {
            this.currentSession.status = status
          }
        } catch (retryError) {
          console.error('❌ Erreur retry update status:', retryError)
        }
      }
    }
  }

  // ==========================================
  // STATISTIQUES ET DEBUG
  // ==========================================

  getStats() {
    const activeSessions = this.getActiveSessions()
    const uniqueUsers = this.getUniqueUsers()
    const totalActivities = this.activitiesCache.size
    
    return {
      sessions: {
        total: this.sessionsCache.size,
        active: activeSessions.length,
        byStatus: {
          online: activeSessions.filter(s => s.status === 'online').length,
          idle: activeSessions.filter(s => s.status === 'idle').length,
          background: activeSessions.filter(s => s.status === 'background').length
        }
      },
      users: {
        unique: uniqueUsers.length,
        multiSession: uniqueUsers.filter(u => u.sessionCount > 1).length
      },
      activities: {
        total: totalActivities,
        byType: {
          hover: Array.from(this.activitiesCache.values()).filter(a => a.activityType === 'hover').length,
          editing: Array.from(this.activitiesCache.values()).filter(a => a.activityType === 'editing').length,
          locked: Array.from(this.activitiesCache.values()).filter(a => a.activityType === 'locked').length
        }
      },
      current: {
        sessionId: this.currentSessionId,
        userId: this.currentUserId,
        tenantId: this.tenantId
      }
    }
  }

  debugState() {
    console.log('🔍 État MultiUserService:', this.getStats())
    console.log('📋 Sessions détaillées:', Array.from(this.sessionsCache.values()))
    console.log('📋 Activités détaillées:', Array.from(this.activitiesCache.values()))
  }

  // ==========================================
  // DESTRUCTION
  // ==========================================

  async destroy() {
    console.log('🔴 Destruction MultiUserService...')
    
    // Arrêter les timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    // Nettoyer tous les timeouts d'activités
    this.activityTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.activityTimeouts.clear()
    
    // Arrêter les listeners
    if (this.sessionsListener) {
      this.sessionsListener()
      this.sessionsListener = null
    }
    
    if (this.activitiesListener) {
      this.activitiesListener()
      this.activitiesListener = null
    }
    
    // Nettoyer toutes les activités de cette session
    await this.cleanupCurrentSessionActivities()
    
    // Supprimer la session
    if (this.tenantId && this.currentSessionId) {
      try {
        const sessionRef = doc(db, `tenants/${this.tenantId}/sessions/${this.currentSessionId}`)
        await deleteDoc(sessionRef)
        console.log(`🗑️ Session supprimée: ${this.currentSessionId}`)
      } catch (error) {
        console.error('❌ Erreur suppression session:', error)
      }
    }
    
    // Vider les caches et callbacks
    this.sessionsCache.clear()
    this.activitiesCache.clear()
    this.userSessionsMap.clear()
    this.sessionCallbacks.clear()
    this.cellCallbacks.clear()
    
    // Reset des propriétés
    this.tenantId = null
    this.currentUserId = null
    this.currentSession = null
    
    console.log('✅ MultiUserService détruit')
  }

  private async cleanupCurrentSessionActivities() {
    if (!this.tenantId) return

    const activitiesQuery = query(
      collection(db, `tenants/${this.tenantId}/cellActivities`),
      where('sessionId', '==', this.currentSessionId)
    )
    
    try {
      const snapshot = await getDocs(activitiesQuery)
      const batch = writeBatch(db)
      
      snapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })
      
      if (snapshot.size > 0) {
        await batch.commit()
        console.log(`🧹 ${snapshot.size} activité(s) de session nettoyée(s)`)
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage activités session:', error)
    }
  }

  // ==========================================
  // GETTERS POUR COMPATIBILITÉ
  // ==========================================

  getCurrentUser() {
    return this.currentSession ? {
      uid: this.currentSession.userId,
      displayName: this.currentSession.userName,
      sessionId: this.currentSession.sessionId
    } : null
  }

  getSessionId(): string {
    return this.currentSessionId
  }

  getCurrentUserId(): string | null {
    return this.currentUserId
  }
}

// Export singleton
export const multiUserService = new MultiUserService()

// Exposer pour debug
if (typeof window !== 'undefined') {
  ;(window as any).multiUserService = multiUserService
}
