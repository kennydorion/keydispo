import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  getDocs,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from './firebase'
import { AuthService } from './auth'

interface UserPresence {
  uid: string
  sessionId: string // Identifiant unique par onglet/session
  email: string
  displayName: string
  avatar?: string
  lastSeen: any // Timestamp Firestore, Date, ou number
  status: 'online' | 'away' | 'offline'
  presenceState: 'active' | 'idle' | 'background' // État de présence interne
  currentView?: {
    dateStart: string
    dateEnd: string
    scrollPosition?: number
    hoveredCell?: {
      date: string
      collaborateurId: string
    }
    activeCell?: {
      date: string
      collaborateurId: string
    }
    lockedCell?: {
      date: string
      collaborateurId: string
      lockType: 'editing' | 'viewing' | 'modal'
      lockStartTime: any
      lockTimeout?: number // durée en ms avant expiration automatique
    }
  }
  cursor?: {
    x: number
    y: number
    timestamp: any
  }
}

type PresenceCallback = (users: UserPresence[]) => void

class PresenceService {
  private tenantId: string | null = null
  private currentUser: UserPresence | null = null
  private sessionId: string = this.generateSessionId()
  private presenceRef: any = null
  private presenceListener: Unsubscribe | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private presenceCallbacks = new Set<PresenceCallback>()
  private otherUsers: UserPresence[] = []
  private lockChangeCallbacks = new Set<() => void>()
  
  // Configuration selon méthodologie "Session Heartbeat"
  private economicMode = false
  private hoverThrottleDelay = 25 // Ultra-réactif pour changements
  private heartbeatInterval_ms = 5000 // Heartbeat constant toutes les 5s
  private maxSessionAge = 30 * 1000 // 30s pour tolérer pannes réseau
  private idleThreshold = 15 * 1000 // 15s sans activité = idle (pas suppression)
  
  // Cache et throttling légers
  private lastHoverUpdate = 0
  private lastPresenceUpdate = 0
  private presenceUpdateThrottle = 50 // 50ms pour réactivité
  private lastHoveredCell: { collaborateurId: string; date: string } | null = null
  
  // Gestion état interne simple
  private lastActivityTime = Date.now()
  private isSessionDestroyed = false
  
  // Auto-nettoyage modéré
  private hoverClearTimer: ReturnType<typeof setTimeout> | null = null
  private hoverClearDelay = 2500 // 2.5s délai raisonnable
  
  // Monitoring
  private firebaseOperations = 0
  private sessionStartTime = Date.now()

  /**
   * Générer un identifiant de session unique
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Recréer une nouvelle session après destruction
   */
  private async recreateSession() {
    if (!this.currentUser) {
      console.log('❌ Impossible de recréer la session: pas d\'utilisateur')
      return
    }

    console.log(`🔄 Recréation de session après destruction`)
    
    // Générer un nouveau sessionId
    this.sessionId = this.generateSessionId()
    this.isSessionDestroyed = false
    this.sessionStartTime = Date.now()
    
    // Mettre à jour la référence Firebase
    this.presenceRef = doc(db, `tenants/${this.tenantId}/presence/${this.sessionId}`)
    
    // Mettre à jour l'utilisateur avec le nouveau sessionId
    this.currentUser.sessionId = this.sessionId
    
    // Redémarrer les services
    this.startHeartbeat()
    this.startAggressiveCleanup()
    
    console.log(`✅ Nouvelle session créée: ${this.sessionId}`)
  }

  /**
   * Mettre la session en pause (inactif mais pas supprimé)
   */
  async pauseUserSession() {
    if (!this.currentUser) return

    console.log('⏸️ Mise en pause de la session utilisateur')
    this.currentUser.presenceState = 'idle'
    
    // Nettoyer la case survolée avant la pause
    await this.clearHoveredCell()
    
    // Mettre à jour en base avec état paused
    await this.updatePresence({
      presenceState: 'idle',
      hoveredCell: null
    })
  }  /**
   * Réactiver la session (sortir de pause)
   */
  async resumeUserSession() {
    if (!this.currentUser) return

    console.log('▶️ Reprise de la session utilisateur')
    this.currentUser.presenceState = 'active'
    
    await this.updatePresence({
      presenceState: 'active',
      lastActivity: Timestamp.now()
    })
  }

  /**
   * Initialiser la présence pour l'utilisateur actuel
   */
  async initializePresence(user: any) {
    this.tenantId = AuthService.currentTenantId || 'keydispo'
    
    if (!user || !this.tenantId) {
      console.log('❌ Impossible d\'initialiser la présence: utilisateur ou tenant manquant')
      return
    }

    // Nettoyer d'abord toutes les sessions existantes de cet utilisateur
    await this.cleanupUserSessions(user.uid)

    this.currentUser = {
      uid: user.uid,
      sessionId: this.sessionId,
      email: user.email || 'Anonyme',
      displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
      lastSeen: serverTimestamp(),
      status: 'online',
      presenceState: 'active' // Session active par défaut
    }

    // Référence du document de présence (utiliser sessionId au lieu de uid)
    this.presenceRef = doc(db, `tenants/${this.tenantId}/presence/${this.sessionId}`)

    console.log(`👋 Initialisation présence pour ${this.currentUser.displayName} (session: ${this.sessionId})`)

    // Créer/mettre à jour la présence
    await this.updatePresence()

    // Démarrer le heartbeat (toutes les 5 secondes)
    this.startHeartbeat()

    // Démarrer le nettoyage agressif périodique
    this.startAggressiveCleanup()

    // Nettoyage initial des sessions expirées
    await this.cleanupExpiredSessions()

    // Écouter les autres utilisateurs
    this.startListeningToOthers()

    // Nettoyage à la fermeture de la page
    this.setupCleanupHandlers()
  }

  /**
   * Nettoyer toutes les sessions d'un utilisateur spécifique
   */
  private async cleanupUserSessions(uid: string) {
    if (!this.tenantId) return
    
    try {
      console.log(`🧹 Nettoyage des sessions existantes pour ${uid}`)
      
      const presenceQuery = query(collection(db, `tenants/${this.tenantId}/presence`))
      const snapshot = await getDocs(presenceQuery)
      
      const sessionsToDelete: string[] = []
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserPresence
        if (data.uid === uid) {
          sessionsToDelete.push(docSnap.id)
        }
      })
      
      // Supprimer toutes les sessions de cet utilisateur
      for (const sessionId of sessionsToDelete) {
        try {
          await deleteDoc(doc(db, `tenants/${this.tenantId}/presence`, sessionId))
          console.log(`🗑️ Session supprimée: ${sessionId.slice(-8)}`)
        } catch (error) {
          console.warn(`⚠️ Erreur suppression session ${sessionId}:`, error)
        }
      }
      
      console.log(`✅ ${sessionsToDelete.length} session(s) nettoyée(s) pour ${uid}`)
    } catch (error) {
      console.error('❌ Erreur nettoyage sessions utilisateur:', error)
    }
  }

  /**
   * Nettoyer les valeurs undefined d'un objet
   */
  private cleanData(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanData(item))
    }
    
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = this.cleanData(value)
      }
    }
    return cleaned
  }

  /**
   * Mettre à jour la présence de l'utilisateur actuel
   */
  private async updatePresence(data?: Partial<UserPresence>, opts: { force?: boolean } = {}) {
    if (!this.currentUser || !this.tenantId || this.isSessionDestroyed) {
      return
    }

    // Enregistrer l'activité
    this.recordActivity()

    // Throttling pour éviter trop d'updates
    const now = Date.now()
  if (!opts.force && (now - this.lastPresenceUpdate < this.presenceUpdateThrottle)) {
      return
    }
    this.lastPresenceUpdate = now

    try {
      const serverNow = serverTimestamp()
      
      const presenceData = {
        uid: this.currentUser.uid,
        displayName: this.currentUser.displayName,
        email: this.currentUser.email,
        status: data?.status || this.currentUser.status || 'online',
        presenceState: data?.presenceState || this.currentUser.presenceState || 'active',
        lastSeen: serverNow,
        sessionId: this.sessionId,
        ...data
      }
      
      await setDoc(this.presenceRef, presenceData, { merge: true })
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la présence:', error)
      throw error
    }
  }  /**
   * Mettre à jour la vue actuelle de l'utilisateur
   */
  async updateCurrentView(dateStart: string, dateEnd: string, scrollPosition?: number) {
    await this.updatePresence({
      currentView: {
        dateStart,
        dateEnd,
        scrollPosition: scrollPosition || 0
      }
    })
  }

  /**
   * Mettre à jour la cellule active (en cours d'édition)
   */
  async updateActiveCell(date: string, collaborateurId: string) {
    await this.updatePresence({
      currentView: {
        ...this.currentUser?.currentView,
        dateStart: this.currentUser?.currentView?.dateStart || date,
        dateEnd: this.currentUser?.currentView?.dateEnd || date,
        activeCell: { date, collaborateurId }
      }
    })
  }

  /**
   * Supprimer la cellule active
   */
  async clearActiveCell() {
    if (this.currentUser?.currentView) {
      await this.updatePresence({
        currentView: {
          ...this.currentUser.currentView,
          activeCell: undefined
        }
      })
    }
  }

  /**
   * Mettre à jour la cellule survolée (avec throttling optimisé)
   */
  async updateHoveredCell(collaborateurId: string, date: string) {
    // Si la session est détruite, en recréer une nouvelle automatiquement
    if (this.isSessionDestroyed) {
      console.log(`🔄 Session détruite détectée - Recréation automatique pour hover`)
      await this.recreateSession()
    }
    // Si la session est en pause, la réactiver
    else if (this.currentUser?.presenceState === 'idle') {
      console.log(`▶️ Session en pause détectée - Réactivation pour hover`)
      await this.resumeUserSession()
    }
    
    this.recordActivity()
    
    const now = Date.now()
    
    // Annuler le timer de nettoyage précédent
    this.cancelHoverClearTimer()
    
    // Vérifier si c'est la même cellule que la dernière fois
    const isSameCell = this.lastHoveredCell?.collaborateurId === collaborateurId && 
                       this.lastHoveredCell?.date === date
    
    // Si c'est une NOUVELLE cellule, mise à jour immédiate sans throttle
    if (!isSameCell) {
      console.log(`⚡ Nouvelle cellule - Update immédiat: ${collaborateurId} ${date}`)
      this.lastHoverUpdate = now
      this.lastHoveredCell = { collaborateurId, date }
      
      await this.updatePresence({
        currentView: {
          ...this.currentUser?.currentView,
          dateStart: this.currentUser?.currentView?.dateStart || date,
          dateEnd: this.currentUser?.currentView?.dateEnd || date,
          hoveredCell: { date, collaborateurId }
        }
      }, { force: true }) // Force pour nouvelle cellule
      
      this.startHoverClearTimer()
      return
    }
    
    // Si c'est la même cellule ET que moins de 1 seconde s'est écoulée, ignorer
    if (isSameCell && (now - this.lastHoverUpdate < 1000)) {
      // Mais relancer le timer de nettoyage
      this.startHoverClearTimer()
      return // Pas besoin de mise à jour si c'est la même cellule récemment
    }
    
    // Utiliser un délai plus court pour plus de réactivité
    const throttleDelay = this.economicMode ? 100 : this.hoverThrottleDelay
    
    // Pour la même cellule seulement, vérifier le throttle
    if (now - this.lastHoverUpdate < throttleDelay) {
      return
    }
    
    this.lastHoverUpdate = now
    this.lastHoveredCell = { collaborateurId, date }
    
  await this.updatePresence({
      currentView: {
        ...this.currentUser?.currentView,
        dateStart: this.currentUser?.currentView?.dateStart || date,
        dateEnd: this.currentUser?.currentView?.dateEnd || date,
        hoveredCell: { date, collaborateurId }
      }
  }, { force: true })
    
    // Démarrer le timer de nettoyage automatique (3 secondes)
    this.startHoverClearTimer()
  }

  /**
   * Démarrer le nettoyage agressif périodique
   */
  private startAggressiveCleanup() {
    this.aggressiveCleanupTimer = setInterval(async () => {
      if (!this.isSessionDestroyed) {
        await this.cleanupExpiredSessions()
        await this.cleanupPausedSessions()
      }
    }, 5000) // Nettoyer toutes les 5 secondes pour réactivité
  }

  /**
   * Nettoyer les sessions en pause depuis trop longtemps
   */
  private async cleanupPausedSessions() {
    try {
      const presenceRef = collection(db, `tenants/${this.tenantId}/presence`)
      const snapshot = await getDocs(presenceRef)
      const now = Date.now()
      const maxPauseTime = 15000 // 15 secondes de pause maximum (réactivité)
      
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data() as UserPresence
        
        if (data.presenceState === 'idle') {
          const lastSeenTime = data.lastSeen?.toDate?.()?.getTime() || data.lastSeen
          const timeSincePause = now - lastSeenTime
          
          if (timeSincePause > maxPauseTime) {
            console.log(`🧹 Suppression session en pause trop longtemps: ${data.displayName} (${Math.round(timeSincePause/1000)}s)`)
            await deleteDoc(doc(db, `tenants/${this.tenantId}/presence/${data.sessionId}`))
          }
        }
      })
    } catch (error) {
      console.log('❌ Erreur lors du nettoyage des sessions en pause:', error)
    }
  }

  /**
   * Démarrer le timer de nettoyage automatique du hover
   */
  private startHoverClearTimer() {
    this.cancelHoverClearTimer()
    
    this.hoverClearTimer = setTimeout(async () => {
      await this.clearHoveredCell()
    }, this.hoverClearDelay)
  }

  /**
   * Annuler le timer de nettoyage automatique du hover
   */
  private cancelHoverClearTimer() {
    if (this.hoverClearTimer) {
      clearTimeout(this.hoverClearTimer)
      this.hoverClearTimer = null
    }
  }

  /**
   * Gérer la sortie de la souris du planning
   */
  async onMouseLeavePlanning() {
    if (this.isSessionDestroyed) return
    
    console.log(`🚪 Souris sortie du planning - Nettoyage hover immédiat`)
    
    // Annuler le timer de nettoyage automatique
    this.cancelHoverClearTimer()
    
    // Nettoyer immédiatement
    await this.clearHoveredCell()
  }

  /**
   * Gérer la sortie de la souris de la fenêtre
   */
  async onMouseLeaveWindow() {
    if (this.isSessionDestroyed) return
    
    console.log(`🪟 Souris sortie de la fenêtre - Nettoyage hover immédiat`)
    
    // Annuler le timer de nettoyage automatique
    this.cancelHoverClearTimer()
    
    // Nettoyer immédiatement
    await this.clearHoveredCell()
  }

  /**
   * Supprimer la cellule survolée
   */
  async clearHoveredCell() {
    if (this.isSessionDestroyed) return
    
    const wasHovering = !!this.lastHoveredCell
    
    this.lastHoveredCell = null
    this.cancelHoverClearTimer()
    
    if (wasHovering) {
      // Mettre à jour immédiatement pour retirer le hover visuel
      if (this.currentUser?.currentView) {
        await this.updatePresence({
          currentView: {
            ...this.currentUser.currentView,
            hoveredCell: undefined // Retirer le hover immédiatement
          }
        }, { force: true })
      }
      
      // Pause après un petit délai pour éviter pause/resume trop fréquents
      setTimeout(async () => {
        if (!this.lastHoveredCell && this.currentUser?.presenceState === 'active') {
          console.log(`🧹 Pause session (hover ended)`)
          await this.pauseUserSession()
        }
      }, 500) // 500ms de délai avant pause (plus tolérant)
    }
  }  /**
   * Verrouiller une cellule pour empêcher les interactions d'autres utilisateurs
   */
  async lockCell(collaborateurId: string, date: string, lockType: 'editing' | 'viewing' | 'modal' = 'editing', timeoutMs: number = 120000) {
    console.log(`🔒 Verrouillage cellule ${collaborateurId} ${date} (${lockType})`)
    
    // Vérifier si la cellule est déjà verrouillée par une autre session (même si même utilisateur)
    const existingLock = this.getCellLock(collaborateurId, date)
    if (existingLock && existingLock.sessionId !== this.sessionId) {
      console.warn(`⚠️ Cellule déjà verrouillée par ${existingLock.displayName} (session: ${existingLock.sessionId.slice(-6)})`)
      return false
    }

    await this.updatePresence({
      currentView: {
        ...this.currentUser?.currentView,
        dateStart: this.currentUser?.currentView?.dateStart || date,
        dateEnd: this.currentUser?.currentView?.dateEnd || date,
        lockedCell: {
          date,
          collaborateurId,
          lockType,
          lockStartTime: Date.now(),
          lockTimeout: timeoutMs
        }
      }
    })

    // Programmer la libération automatique du verrou
    if (timeoutMs > 0) {
      setTimeout(() => {
        this.unlockCell(collaborateurId, date)
      }, timeoutMs)
    }

    return true
  }

  /**
   * Libérer le verrou d'une cellule
   */
  async unlockCell(collaborateurId: string, date: string) {
    console.log(`🔓 Libération verrou cellule ${collaborateurId} ${date}`)
    
    if (this.currentUser?.currentView) {
      await this.updatePresence({
        currentView: {
          ...this.currentUser.currentView,
          lockedCell: undefined
        }
      })
    }
  }

  /**
   * Vérifier si une cellule est verrouillée
   */
  isCellLocked(collaborateurId: string, date: string): boolean {
    const lock = this.getCellLock(collaborateurId, date)
    if (!lock) return false

    // Vérifier si le verrou a expiré
    if (lock.lockTimeout && Date.now() - lock.lockStartTime > lock.lockTimeout) {
      console.log(`⏰ Verrou expiré pour ${collaborateurId} ${date}`)
      return false
    }

    // IMPORTANT: Verrouillée si c'est un autre utilisateur OU la même utilisateur mais autre session/onglet
    const isLocked = lock.sessionId !== this.sessionId // Pas verrouillée seulement pour la même session exacte
    console.log(`🔍 isCellLocked ${collaborateurId}-${date}: ${isLocked} (lock.sessionId: ${lock.sessionId?.slice(-6)}, current: ${this.sessionId?.slice(-6)})`)
    return isLocked
  }

  /**
   * Obtenir les informations de verrou d'une cellule
   */
  getCellLock(collaborateurId: string, date: string): (UserPresence & { lockStartTime: number, lockTimeout?: number }) | null {
    // D'abord vérifier la session courante
    if (this.currentUser?.currentView?.lockedCell) {
      const currentLock = this.currentUser.currentView.lockedCell
      if (currentLock.collaborateurId === collaborateurId && currentLock.date === date) {
        return {
          ...this.currentUser,
          lockStartTime: currentLock.lockStartTime,
          lockTimeout: currentLock.lockTimeout
        }
      }
    }

    // Ensuite vérifier les autres sessions
    for (const user of this.otherUsers) {
      const lockedCell = user.currentView?.lockedCell
      if (lockedCell && 
          lockedCell.collaborateurId === collaborateurId && 
          lockedCell.date === date) {
        return {
          ...user,
          lockStartTime: lockedCell.lockStartTime,
          lockTimeout: lockedCell.lockTimeout
        }
      }
    }
    return null
  }

  /**
   * Mettre à jour la position du curseur
   */
  async updateCursor(x: number, y: number) {
    // Throttle les mises à jour du curseur pour éviter trop de requêtes
    if (this.cursorThrottle) return
    
    this.cursorThrottle = true
    setTimeout(() => this.cursorThrottle = false, 100) // Throttle 100ms

    await this.updatePresence({
      cursor: {
        x,
        y,
        timestamp: serverTimestamp()
      }
    })
  }
  private cursorThrottle = false

  /**
   * Démarrer le heartbeat pour maintenir la présence
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    this.heartbeatInterval = setInterval(() => {
      if (!this.isSessionDestroyed && this.currentUser?.presenceState === 'active') {
        this.updatePresence(undefined, { force: false })
      }
    }, 3000) // 3s heartbeat ultra-fréquent pour réactivité
  }

  /**
   * Nettoyer manuellement toutes les sessions expirées
   */
  async cleanupAllExpiredSessions() {
    await this.cleanupExpiredSessions()
  }

  /**
   * Nettoyer les sessions expirées (plus de 2 minutes d'inactivité)
   */
  private async cleanupExpiredSessions() {
    if (!this.tenantId) return

    const now = new Date()
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)

    try {
      const presenceQuery = query(collection(db, `tenants/${this.tenantId}/presence`))
      const snapshot = await getDocs(presenceQuery)
      
      const expiredSessions: string[] = []
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserPresence
        
        // Gestion robuste de lastSeen (Timestamp ou Date)
        let lastSeen: Date | null = null
        if (data.lastSeen) {
          if (typeof data.lastSeen.toDate === 'function') {
            // C'est un Timestamp Firestore
            lastSeen = data.lastSeen.toDate()
          } else if (data.lastSeen instanceof Date) {
            // C'est déjà une Date
            lastSeen = data.lastSeen
          } else if (typeof data.lastSeen === 'number') {
            // C'est un timestamp numérique
            lastSeen = new Date(data.lastSeen)
          }
        }
        
        if (lastSeen && lastSeen < twoMinutesAgo) {
          expiredSessions.push(docSnap.id)
        }
      })

      // Supprimer les sessions expirées
      for (const sessionId of expiredSessions) {
        await deleteDoc(doc(db, `tenants/${this.tenantId}/presence/${sessionId}`))
        console.log(`🧹 Session expirée supprimée: ${sessionId.slice(-6)}`)
      }

      if (expiredSessions.length > 0) {
        console.log(`🧹 ${expiredSessions.length} session(s) expirée(s) nettoyée(s)`)
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage sessions expirées:', error)
    }
  }

  /**
   * Écouter la présence des autres utilisateurs
   */
  private startListeningToOthers() {
    if (!this.tenantId || !this.currentUser) return

    const presenceQuery = query(
      collection(db, `tenants/${this.tenantId}/presence`)
    )

    this.presenceListener = onSnapshot(
      presenceQuery, 
      async (snapshot) => {
        try {
          const now = new Date()
          const sessionExpirationThreshold = new Date(now.getTime() - this.maxSessionAge)
          
          console.log(`🔍 Snapshot reçu: ${snapshot.docs.length} documents`)
          
          const users: UserPresence[] = []
          
          snapshot.forEach((docSnap) => {
            try {
              const data = docSnap.data() as UserPresence
              
              // Gestion robuste de lastSeen (Timestamp ou Date)
              let lastSeen: Date | null = null
              
              if (data.lastSeen) {
                if (typeof data.lastSeen.toDate === 'function') {
                  lastSeen = data.lastSeen.toDate()
                } else if (data.lastSeen instanceof Date) {
                  lastSeen = data.lastSeen
                } else if (typeof data.lastSeen === 'number') {
                  lastSeen = new Date(data.lastSeen)
                }
              }
              
              const isActive = lastSeen && lastSeen > sessionExpirationThreshold
              const isSessionActive = data.presenceState !== 'idle' // Filtrer les sessions en pause
              
              if (isActive && isSessionActive) {
                users.push(data)
              }
            } catch (error) {
              console.error('❌ Erreur parsing document présence:', error, docSnap.id)
            }
          })

          // Stocker seulement les AUTRES sessions actives
          this.otherUsers = users.filter(u => u.sessionId !== this.sessionId)
          const userCount = users.length
          const uniqueUsers = new Set(users.map(u => u.uid)).size
          console.log(`👥 ${userCount} session(s) actives (${uniqueUsers} utilisateur(s))`)

          // Nettoyer les sessions expirées périodiquement
          if (Math.random() < 0.1) { // 10% de chance à chaque update
            await this.cleanupExpiredSessions()
          }

          // Notifier les callbacks de présence avec les sessions actives (hors locale) + possibilité d'utiliser getStats pour détails
          this.presenceCallbacks.forEach(callback => {
            try {
              callback(this.otherUsers)
            } catch (error) {
              console.error('❌ Erreur callback présence:', error)
            }
          })

          // Notifier les callbacks de changement de verrou
          this.lockChangeCallbacks.forEach(callback => {
            try {
              console.log('🔄 Notification callback verrou')
              callback()
            } catch (error) {
              console.error('❌ Erreur callback verrou:', error)
            }
          })
        } catch (error) {
          console.error('❌ Erreur globale listener présence:', error)
        }
      },
      (error) => {
        console.error('❌ Erreur listener présence Firestore:', error)
      }
    )
  }

  /**
   * S'abonner aux changements de présence
   */
  onPresenceChange(callback: PresenceCallback) {
    this.presenceCallbacks.add(callback)
    
    // Appeler immédiatement avec les données actuelles
    callback(this.otherUsers)

    // Retourner une fonction de désabonnement
    return () => {
      this.presenceCallbacks.delete(callback)
    }
  }

  /**
   * S'abonner aux changements de verrous de cellules
   */
  onLockChange(callback: () => void) {
    this.lockChangeCallbacks.add(callback)

    // Retourner une fonction de désabonnement
    return () => {
      this.lockChangeCallbacks.delete(callback)
    }
  }

  /**
   * Configurer le nettoyage automatique et surveillance d'inactivité
   */
  private setupCleanupHandlers() {
    const cleanup = async () => {
      await this.destroySession()
    }

    // Nettoyage immédiat à la fermeture de la page ET au reload
    window.addEventListener('beforeunload', cleanup)
    window.addEventListener('unload', cleanup)
    
    // IMPORTANT: Nettoyage au refresh/reload de la page
    window.addEventListener('pagehide', cleanup)
    
    // Surveillance d'inactivité et changements de visibilité
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Mise en pause rapide
        this.clearHoveredCell()
        this.pauseUserSession()
      } else {
        this.resumeUserSession()
      }
    })

    // Surveillance des interactions pour détecter l'activité
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    activityEvents.forEach(event => {
      document.addEventListener(event, () => this.recordActivity(), { passive: true })
    })

    // Démarrer la surveillance d'inactivité
    this.startInactivityTimer()
  }

  /**
   * Enregistrer une activité utilisateur
   */
  private recordActivity() {
    if (this.isSessionDestroyed) return
    
    this.lastActivityTime = Date.now()
    this.resetActivityTimer()
  }

  /**
   * Redémarrer le timer d'inactivité
   */
  private resetActivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
    }
    this.startInactivityTimer()
  }

  /**
   * Démarrer le timer d'inactivité
   */
  private startInactivityTimer() {
    if (this.isSessionDestroyed) return

    this.inactivityTimer = setTimeout(async () => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime
      
      if (timeSinceLastActivity >= this.idleThreshold) {
        if (this.currentUser?.presenceState === 'active') {
          console.log(`⏸️ Inactivité (${Math.round(timeSinceLastActivity / 1000)}s) -> pause session`)
          await this.pauseUserSession()
        }
      }
    }, this.inactivityTimeout)
  }

  /**
   * Nettoyer manuellement toutes les sessions expirées
   */

  /**
   * Détruire complètement la session
   */
  async destroySession() {
    if (this.isSessionDestroyed) return
    
    console.log(`🗑️ Destruction de la session ${this.sessionId?.slice(-8)}`)
    this.isSessionDestroyed = true

    // Arrêter tous les timers
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }

    if (this.aggressiveCleanupTimer) {
      clearInterval(this.aggressiveCleanupTimer)
      this.aggressiveCleanupTimer = null
    }

    // Arrêter le timer de nettoyage hover
    this.cancelHoverClearTimer()

    // Supprimer le document de présence
    await this.setOffline()

    // Arrêter l'écoute des autres utilisateurs
    if (this.presenceListener) {
      this.presenceListener()
      this.presenceListener = null
    }

    console.log(`✅ Session ${this.sessionId?.slice(-8)} détruite`)
  }

  /**
   * Marquer l'utilisateur comme hors ligne
   */
  async setOffline() {
    if (this.presenceRef) {
      try {
        await deleteDoc(this.presenceRef)
      } catch (error) {
        console.error('❌ Erreur suppression présence:', error)
      }
    }
  }

  /**
   * Nettoyer les ressources
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    if (this.presenceListener) {
      this.presenceListener()
    }

    this.setOffline()
  }

  /**
   * Configurer le mode économique
   */
  setEconomicMode(enabled: boolean) {
    this.economicMode = enabled
    console.log(`📊 Mode économique ${enabled ? 'activé' : 'désactivé'} - Délai: ${enabled ? 200 : this.hoverThrottleDelay}ms`)
  }

  /**
   * Obtenir les statistiques de présence
   */
  /**
   * Vérifier si une cellule est verrouillée par une AUTRE session
   */
  isCellLockedByOther(collaborateurId: string, date: string): boolean {
    return this.isCellLocked(collaborateurId, date) // Déjà filtre les autres sessions
  }

  /**
   * Obtenir l'ID de session actuel
   */
  getCurrentSessionId(): string | null {
    return this.sessionId
  }

  getStats() {
    // Compter les utilisateurs uniques et les sessions (incluant la session courante)
    const uniqueUsers = new Set(this.otherUsers.map(u => u.uid))
    const currentUserAllTabs = this.otherUsers.filter(u => u.uid === this.currentUser?.uid)
    
    const sessionDurationMinutes = Math.round((Date.now() - this.sessionStartTime) / 60000)
    const operationsPerMinute = sessionDurationMinutes > 0 ? Math.round(this.firebaseOperations / sessionDurationMinutes) : 0
    
    return {
      currentUser: this.currentUser?.displayName,
      currentSession: this.sessionId,
      totalSessions: this.otherUsers.length, // Total des sessions (y compris celle-ci)
      uniqueUsers: uniqueUsers.size,
      otherTabs: Math.max(0, currentUserAllTabs.length - 1), // Autres onglets (exclure cette session)
      users: Array.from(uniqueUsers).map(uid => {
        const userSessions = this.otherUsers.filter(u => u.uid === uid)
        const firstSession = userSessions[0]
        return {
          name: firstSession.displayName,
          sessions: userSessions.length,
          isCurrentUser: uid === this.currentUser?.uid,
          sessionIds: userSessions.map(s => s.sessionId.slice(-6))
        }
      }),
      // Métriques Firebase
      firebaseOperations: this.firebaseOperations,
      sessionDurationMinutes: sessionDurationMinutes,
      operationsPerMinute: operationsPerMinute,
      economicMode: this.economicMode
    }
  }
}

// Instance singleton
export const presenceService = new PresenceService()
export type { UserPresence }
