/**
 * Service d'affichage des sessions utilisateur - Version RTDB simplifiée
 * 
 * Version simplifiée compatible avec le nouveau multiUserService RTDB
 * Fonctionnalités essentielles préservées, complexité réduite
 */

import { ref, computed } from 'vue'
import type { UserSession, CellActivity } from './multiUserService'
import { getUserInitials, getUserColor } from './avatarUtils'

// ==========================================
// TYPES ET INTERFACES SIMPLIFIÉS
// ==========================================

export interface DisplayUser {
  uid: string
  displayName: string
  email: string
  
  // Sessions
  sessionCount: number
  sessions: UserSession[]
  mainSession: UserSession
  
  // État d'activité
  status: 'online' | 'idle' | 'background' | 'offline'
  lastActivity: Date
  isMultiSession: boolean
  
  // Apparence
  color: string
  initials: string
  avatar?: string
}

export interface CellIndicator {
  cellId: string
  users: Array<{
    uid: string
    displayName: string
    color: string
    action: 'hover' | 'select' | 'edit' | 'lock'
    since: Date
  }>
  hasLock: boolean
  hasHover: boolean
  lockOwner?: string
}

export interface MultiUserState {
  sessions: UserSession[]
  activities: CellActivity[]
}

// ==========================================
// SERVICE PRINCIPAL SIMPLIFIÉ
// ==========================================

class SessionDisplayServiceRTDB {
  
  // État réactif
  private readonly displayUsers = ref<DisplayUser[]>([])
  private readonly cellIndicators = ref<Map<string, CellIndicator>>(new Map())
  private readonly userColorMap = new Map<string, string>()

  // ==========================================
  // INTERFACE PUBLIQUE
  // ==========================================

  readonly users = computed(() => this.displayUsers.value)
  readonly activeUserCount = computed(() => this.displayUsers.value.filter(u => u.status === 'online').length)
  readonly cellPresence = computed(() => this.cellIndicators.value)

  /**
   * Mettre à jour l'état des utilisateurs connectés
   */
  updateState(state: MultiUserState) {
    try {
      // Traiter les sessions utilisateur
      this.processUsers(state.sessions || [])
      
      // Traiter les indicateurs de cellules (version simplifiée)
      this.processCellIndicators(state.activities || [])
      
    } catch (error) {
      console.error('❌ Erreur mise à jour état sessions RTDB:', error)
    }
  }

  /**
   * Obtenir les utilisateurs actifs sur une cellule
   */
  getCellPresence(cellId: string): CellIndicator | null {
    return this.cellIndicators.value.get(cellId) || null
  }

  /**
   * Obtenir la couleur d'un utilisateur
   */
  getUserColor(userId: string): string {
    if (this.userColorMap.has(userId)) {
      return this.userColorMap.get(userId)!
    }
    
    const color = getUserColor(userId)
    this.userColorMap.set(userId, color)
    return color
  }

  // ==========================================
  // TRAITEMENT DES DONNÉES
  // ==========================================

  private processUsers(sessions: UserSession[]) {
    if (!Array.isArray(sessions)) {
      console.warn('⚠️ Sessions invalides reçues:', sessions)
      return
    }

    // Grouper les sessions par utilisateur
    const userGroups = new Map<string, UserSession[]>()
    
    sessions.forEach(session => {
      if (!session || typeof session !== 'object') return
      
      const userId = session.userId
      if (!userId) return
      
      if (!userGroups.has(userId)) {
        userGroups.set(userId, [])
      }
      userGroups.get(userId)!.push(session)
    })

    // Convertir en DisplayUsers
    const displayUsers: DisplayUser[] = []
    
    userGroups.forEach((userSessions, userId) => {
      const activeSessions = userSessions.filter(s => s.status !== 'offline')
      if (activeSessions.length === 0) return

      // Session principale (la plus récente)
      const mainSession = activeSessions.reduce((latest, session) => {
        const latestTime = typeof latest.lastActivity === 'number' ? latest.lastActivity : 0
        const sessionTime = typeof session.lastActivity === 'number' ? session.lastActivity : 0
        return sessionTime > latestTime ? session : latest
      })

      const displayUser: DisplayUser = {
        uid: userId,
        displayName: mainSession.userName || 'Utilisateur',
        email: mainSession.userEmail || '',
        sessionCount: activeSessions.length,
        sessions: activeSessions,
        mainSession: mainSession,
        status: this.determineUserStatus(activeSessions),
        lastActivity: new Date(typeof mainSession.lastActivity === 'number' ? mainSession.lastActivity : Date.now()),
        isMultiSession: activeSessions.length > 1,
        color: this.getUserColor(userId),
        initials: getUserInitials({ 
          displayName: mainSession.userName,
          email: mainSession.userEmail 
        })
      }

      displayUsers.push(displayUser)
    })

    // Trier par activité récente
    displayUsers.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    
    this.displayUsers.value = displayUsers
  }

  private processCellIndicators(activities: CellActivity[]) {
    if (!Array.isArray(activities)) {
      console.warn('⚠️ Activités invalides reçues:', activities)
      return
    }

    const cellMap = new Map<string, CellIndicator>()
    
    // Version simplifiée : on traite les activités basiques
    activities.forEach(activity => {
      if (!activity?.cellId || !activity?.userId) return
      
      const cellId = activity.cellId
      if (!cellMap.has(cellId)) {
        cellMap.set(cellId, {
          cellId,
          users: [],
          hasLock: false,
          hasHover: false
        })
      }
      
      const indicator = cellMap.get(cellId)!
      
      // Ajouter l'utilisateur s'il n'existe pas déjà
      const existingUser = indicator.users.find(u => u.uid === activity.userId)
      if (!existingUser) {
        indicator.users.push({
          uid: activity.userId,
          displayName: activity.userName || 'Utilisateur',
          color: this.getUserColor(activity.userId),
          action: activity.action || 'hover',
          since: new Date(activity.startedAt || Date.now())
        })
      }
      
      // Mettre à jour les flags
      if (activity.action === 'lock' || activity.action === 'edit') {
        indicator.hasLock = true
        indicator.lockOwner = activity.userId
      }
      if (activity.action === 'hover') {
        indicator.hasHover = true
      }
    })
    
    this.cellIndicators.value = cellMap
  }

  private determineUserStatus(sessions: UserSession[]): 'online' | 'idle' | 'background' | 'offline' {
    if (sessions.length === 0) return 'offline'
    
    const onlineSessions = sessions.filter(s => s.status === 'online')
    if (onlineSessions.length > 0) return 'online'
    
    const idleSessions = sessions.filter(s => s.status === 'idle')
    if (idleSessions.length > 0) return 'idle'
    
    return 'background'
  }

  // ==========================================
  // MÉTHODES DE COMPATIBILITÉ
  // ==========================================

  /**
   * Réinitialiser l'état
   */
  reset() {
    this.displayUsers.value = []
    this.cellIndicators.value.clear()
    this.userColorMap.clear()
  }

  /**
   * Obtenir les statistiques de présence
   */
  getPresenceStats() {
    const users = this.displayUsers.value
    return {
      totalUsers: users.length,
      onlineUsers: users.filter(u => u.status === 'online').length,
      idleUsers: users.filter(u => u.status === 'idle').length,
      multiSessionUsers: users.filter(u => u.isMultiSession).length,
      activeCells: this.cellIndicators.value.size
    }
  }
}

// ==========================================
// EXPORT SINGLETON
// ==========================================

export const sessionDisplayService = new SessionDisplayServiceRTDB()
