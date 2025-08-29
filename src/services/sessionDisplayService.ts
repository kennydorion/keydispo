/**
 * Service d'affichage des sessions utilisateur
 * 
 * Ce service se charge de l'affichage optimisé des sessions uti  }
  
  private readonly userColorMap = new Map<string, string>()t de leurs activités :
 * - Affichage en temps réel des utilisateurs connectés
 * - Visualisation des multi-onglets/sessions
 * - Indicateurs d'ac    // Grouper les activités par cellule
    const cellGroups = new Map<string, CellActivity[]>()
    activities.forEach(activity => {
      // Ignorer les activités sans cellId valide
      if (!activity.cellId || typeof activity.cellId !== 'string') {
        console.warn('⚠️ Activité ignorée (cellId invalide):', activity)
        return
      }
      
      if (!cellGroups.has(activity.cellId)) {
        cellGroups.set(activity.cellId, [])
      }
      cellGroups.get(activity.cellId)!.push(activity)
    })ur les cellules
 * - Status bar avec informations de présence
 * - Gestion des couleurs utilisateur cohérentes
 */

import { ref, computed } from 'vue'
import type { UserSession, CellActivity, MultiUserState } from './multiUserService'
import { getUserInitials, getUserColor } from './avatarUtils'

// ==========================================
// TYPES ET INTERFACES
// ==========================================

export interface DisplayUser {
  uid: string
  displayName: string
  email: string
  
  // Sessions
  sessionCount: number
  sessions: UserSession[]
  mainSession: UserSession // Session la plus récente/active
  
  // État d'activité
  status: 'online' | 'idle' | 'background' | 'offline'
  lastActivity: Date
  isMultiSession: boolean
  
  // Activité courante
  currentActivity?: {
    type: 'viewing' | 'hovering' | 'editing' | 'modal'
    cellId?: string
    collaborateurId?: string
    date?: string
    since: Date
  }
  
  // Visuel
  color: string
  initials: string
}

export interface CellIndicator {
  cellId: string
  collaborateurId: string
  date: string
  
  // Utilisateurs présents
  users: {
    uid: string
    displayName: string
    activityType: 'hover' | 'editing' | 'locked' | 'viewing'
    color: string
    sessionId: string
    isOwn: boolean
  }[]
  
  // État de la cellule
  isLocked: boolean
  isHovered: boolean
  lockOwner?: DisplayUser
  
  // Priorité d'affichage
  priority: 'low' | 'medium' | 'high'
}

export interface SessionStats {
  totalUsers: number
  uniqueUsers: number
  totalSessions: number
  multiSessionUsers: number
  
  byStatus: {
    online: number
    idle: number
    background: number
  }
  
  activities: {
    total: number
    hover: number
    editing: number
    locked: number
  }
}

// ==========================================
// SERVICE D'AFFICHAGE
// ==========================================

class SessionDisplayService {
  // État réactif
  private readonly _users = ref<Map<string, DisplayUser>>(new Map())
  private readonly _cellIndicators = ref<Map<string, CellIndicator>>(new Map())
  private readonly _stats = ref<SessionStats>({
    totalUsers: 0,
    uniqueUsers: 0,
    totalSessions: 0,
    multiSessionUsers: 0,
    byStatus: { online: 0, idle: 0, background: 0 },
    activities: { total: 0, hover: 0, editing: 0, locked: 0 }
  })
  
  private readonly userColorMap = new Map<string, string>()
  private currentUserId: string | null = null

  // ==========================================
  // PROPRIÉTÉS RÉACTIVES PUBLIQUES
  // ==========================================

  readonly users = computed(() => Array.from(this._users.value.values()))
  readonly cellIndicators = computed(() => Array.from(this._cellIndicators.value.values()))
  readonly stats = computed(() => this._stats.value)
  
  // Filtres et tris
  readonly onlineUsers = computed(() => 
    this.users.value.filter(user => user.status === 'online')
  )
  
  readonly multiSessionUsers = computed(() =>
    this.users.value.filter(user => user.isMultiSession)
  )
  
  readonly sortedUsers = computed(() =>
    [...this.users.value].sort((a, b) => {
      // Priorité : online > idle > background
      const statusPriority = { online: 3, idle: 2, background: 1, offline: 0 }
      const aPriority = statusPriority[a.status] || 0
      const bPriority = statusPriority[b.status] || 0
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      // Puis par dernière activité
      return b.lastActivity.getTime() - a.lastActivity.getTime()
    })
  )

  // ==========================================
  // GESTION DES COULEURS
  // ==========================================

  private getUserColor(uid: string): string {
    // Utiliser la fonction centralisée depuis avatarUtils
    return getUserColor(uid)
  }

  private getUserInitials(displayName: string): string {
    // Utiliser la fonction centralisée d'avatarUtils
    return getUserInitials({ displayName })
  }

  // ==========================================
  // MISE À JOUR DES DONNÉES
  // ==========================================

  updateFromMultiUserState(state: MultiUserState, currentUserId: string) {
    this.currentUserId = currentUserId
    
    // 🔍 DEBUG: État multiuser reçu
    // console.log(`🔄 SESSION DISPLAY SERVICE - updateFromMultiUserState`)
    // console.log(`📊 État reçu:`, {
    //   sessions: state.sessions.size,
    //   usersBySessions: state.usersBySessions.size,
    //   activities: state.activities.size
    // })
    
    // Traiter les sessions pour créer les DisplayUser
    this.processUsers(state.sessions, state.usersBySessions)
    
    // Traiter les activités pour créer les indicateurs de cellules
    this.processCellIndicators(state.activities, state.sessions)
    
    // Calculer les statistiques
    this.calculateStats(state)
    
    // 🔍 DEBUG: Utilisateurs traités  
    // console.log(`✅ SESSION DISPLAY MAJ: ${this._users.value.size} utilisateurs traités`)
  }

  private processUsers(_sessions: Map<string, UserSession>, usersBySessions: Map<string, UserSession[]>) {
    const newUsers = new Map<string, DisplayUser>()
    
    usersBySessions.forEach((userSessions, userId) => {
      // Filtrer les sessions actives
      const activeSessions = userSessions.filter(session => 
        session.status === 'online' || session.status === 'idle' || session.status === 'background'
      )
      
      if (activeSessions.length === 0) return
      
      // Trouver la session principale (la plus récente)
      const mainSession = activeSessions.reduce((latest, session) => {
        const latestTime = latest.lastActivity?.toDate?.()?.getTime() || 0
        const sessionTime = session.lastActivity?.toDate?.()?.getTime() || 0
        return sessionTime > latestTime ? session : latest
      })
      
      // Créer le DisplayUser
      const displayUser: DisplayUser = {
        uid: userId,
        displayName: mainSession.userName,
        email: mainSession.userEmail,
        sessionCount: activeSessions.length,
        sessions: activeSessions,
        mainSession: mainSession,
        status: this.determineUserStatus(activeSessions),
        lastActivity: mainSession.lastActivity?.toDate?.() || new Date(),
        isMultiSession: activeSessions.length > 1,
        currentActivity: this.determineCurrentActivity(mainSession),
        color: this.getUserColor(userId),
        initials: this.getUserInitials(mainSession.userName)
      }
      
      newUsers.set(userId, displayUser)
    })
    
    this._users.value = newUsers
  }

  private determineUserStatus(sessions: UserSession[]): 'online' | 'idle' | 'background' | 'offline' {
    // Si au moins une session est online, l'utilisateur est online
    if (sessions.some(s => s.status === 'online')) return 'online'
    if (sessions.some(s => s.status === 'idle')) return 'idle'
    if (sessions.some(s => s.status === 'background')) return 'background'
    return 'offline'
  }

  private determineCurrentActivity(session: UserSession) {
    if (session.currentAction) {
      return {
        type: session.currentAction.type,
        cellId: session.currentAction.cellId,
        collaborateurId: session.currentAction.collaborateurId,
        date: session.currentAction.date,
        since: session.currentAction.startedAt?.toDate?.() || new Date()
      }
    }
    return undefined
  }

  private processCellIndicators(activities: Map<string, CellActivity>, _sessions: Map<string, UserSession>) {
    // 🔍 DEBUG: Traitement des indicateurs de cellules
    // console.log(`🔄 TRAITEMENT INDICATEURS CELLULES:`, {
    //   activities: activities.size,
    //   activitiesList: Array.from(activities.values()).map(a => `${a.cellId}: ${a.userName} (${a.activityType})`)
    // })
    
    const newIndicators = new Map<string, CellIndicator>()
    
    // Grouper les activités par cellule
    const cellGroups = new Map<string, CellActivity[]>()
    activities.forEach((activity: any) => {
      if (!cellGroups.has(activity.cellId)) {
        cellGroups.set(activity.cellId, [])
      }
      // Normaliser la propriété d'activité: certains services utilisent 'type' au lieu de 'activityType'
      const rawType = activity.activityType || activity.type || 'unknown'
      const canonicalType = rawType === 'hovering' ? 'hover' : rawType // unifier 'hovering' en 'hover'
      if (!activity.activityType) {
        activity.activityType = canonicalType
      } else if (activity.activityType !== canonicalType) {
        activity.activityType = canonicalType
      }
      cellGroups.get(activity.cellId)!.push(activity)
    })
    
    // 🔍 DEBUG: Groupement par cellules
    // console.log(`📋 GROUPES CELLULES:`, Array.from(cellGroups.entries()).map(([cellId, acts]) => 
    //   `${cellId}: ${acts.length} activité(s) - ${acts.map(a => a.userName).join(', ')}`
    // ))
    
    cellGroups.forEach((cellActivities, cellId) => {
      // Vérification de sécurité pour cellId
      if (!cellId || typeof cellId !== 'string' || !cellId.includes('_')) {
        console.warn('⚠️ CellId invalide ignoré:', cellId)
        return
      }
      
      const [collaborateurId, date] = cellId.split('_')
      
      // Vérifier que le split a bien fonctionné
      if (!collaborateurId || !date) {
        console.warn('⚠️ CellId malformé ignoré:', cellId)
        return
      }
      
      // Créer les infos utilisateur pour cette cellule
  const users = cellActivities.map(activity => {
        return {
          uid: activity.userId,
          displayName: activity.userName,
          activityType: activity.activityType,
          color: this.getUserColor(activity.userId),
          sessionId: activity.sessionId,
          isOwn: activity.userId === this.currentUserId
        }
      })
      
      // Déterminer l'état de la cellule
  const hasLock = cellActivities.some(a => a.activityType === 'locked' || a.activityType === 'editing')
  const hasHover = cellActivities.some(a => a.activityType === 'hover')
      
  const lockActivity = cellActivities.find(a => a.activityType === 'locked' || a.activityType === 'editing')
      const lockOwner = lockActivity ? this._users.value.get(lockActivity.userId) : undefined
      
      // Déterminer la priorité d'affichage
      let priority: 'low' | 'medium' | 'high' = 'low'
      if (hasLock) priority = 'high'
      else if (hasHover) priority = 'medium'
      
      const indicator: CellIndicator = {
        cellId,
        collaborateurId,
        date,
        users,
        isLocked: hasLock,
        isHovered: hasHover,
        lockOwner,
        priority
      }
      
      newIndicators.set(cellId, indicator)
    })
    
    this._cellIndicators.value = newIndicators
    
    // 🔍 DEBUG: Indicateurs créés
    // console.log(`✅ INDICATEURS CELLULES CRÉÉS: ${newIndicators.size} cellules`)
    // console.log(`📍 CELLULES AVEC INDICATEURS:`, Array.from(newIndicators.entries()).map(([cellId, ind]) => 
    //   `${cellId}: ${ind.users.length} utilisateur(s) - hover:${ind.isHovered} lock:${ind.isLocked}`
    // ))
  }

  private calculateStats(state: MultiUserState) {
    const sessions = Array.from(state.sessions.values())
    const activities = Array.from(state.activities.values())
    const users = Array.from(this._users.value.values())
    
    this._stats.value = {
      totalUsers: users.length,
      uniqueUsers: users.length,
      totalSessions: sessions.length,
      multiSessionUsers: users.filter(u => u.isMultiSession).length,
      byStatus: {
        online: users.filter(u => u.status === 'online').length,
        idle: users.filter(u => u.status === 'idle').length,
        background: users.filter(u => u.status === 'background').length
      },
      activities: {
        total: activities.length,
        hover: activities.filter(a => a.activityType === 'hover').length,
        editing: activities.filter(a => a.activityType === 'editing').length,
        locked: activities.filter(a => a.activityType === 'locked').length
      }
    }
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  /**
   * Obtenir les utilisateurs qui interagissent avec une cellule
   */
  getUsersOnCell(cellKey: string): DisplayUser[] {
    // 🔍 DEBUG: Recherche utilisateurs sur cellule
    // console.log(`🎯 RECHERCHE UTILISATEURS SUR CELLULE: ${cellKey}`)
    
    const result = Array.from(this._users.value.values())
      .filter(user => user.currentActivity?.cellId === cellKey)
    
    // 🔍 DEBUG: Résultat de recherche
    // console.log(`👥 UTILISATEURS TROUVÉS SUR ${cellKey}:`, result.map(u => `${u.displayName} (${u.email}) - activité: ${u.currentActivity?.type}`))
    
    return result
  }

  /**
   * Vérifier si une cellule est verrouillée par un autre utilisateur
   */
  isCellLockedByOther(collaborateurId: string, date: string): boolean {
    const cellId = `${collaborateurId}_${date}`
    const indicator = this._cellIndicators.value.get(cellId)
    
    return indicator?.isLocked === true && 
           indicator.users.some(user => !user.isOwn && 
             (user.activityType === 'locked' || user.activityType === 'editing'))
  }

  /**
   * Obtenir les informations de verrouillage d'une cellule
   */
  getCellLockInfo(collaborateurId: string, date: string) {
    const cellId = `${collaborateurId}_${date}`
    const indicator = this._cellIndicators.value.get(cellId)
    
    if (!indicator?.isLocked) return null
    
    const lockUser = indicator.users.find(user => 
      !user.isOwn && (user.activityType === 'locked' || user.activityType === 'editing')
    )
    
    if (lockUser) {
      const displayUser = this._users.value.get(lockUser.uid)
      return {
        userId: lockUser.uid,
        userName: lockUser.displayName,
        displayUser,
        lockType: lockUser.activityType,
        color: lockUser.color
      }
    }
    
    return null
  }

  /**
   * Obtenir un utilisateur par son ID
   */
  getUser(userId: string): DisplayUser | undefined {
    return this._users.value.get(userId)
  }

  /**
   * Obtenir la couleur d'un utilisateur
   */
  getUserColorById(userId: string): string {
    return this.getUserColor(userId)
  }

  /**
   * Obtenir un tooltip formaté pour un utilisateur
   */
  getUserTooltip(user: DisplayUser): string {
    const sessionInfo = user.isMultiSession ? ` (${user.sessionCount} onglets)` : ''
    let activityInfo = ''
    
    if (user.currentActivity) {
      const activityText = {
        viewing: 'consulte',
        hovering: 'survole',
        editing: 'édite',
        modal: 'édite'
      }[user.currentActivity.type] || 'utilise'
      
      if (user.currentActivity.collaborateurId && user.currentActivity.date) {
        activityInfo = ` • ${activityText} une cellule`
      }
    }
    
    return `${user.displayName} - ${user.status}${sessionInfo}${activityInfo}`
  }

  /**
   * Obtenir les indicateurs de cellules avec priorité haute/moyenne
   */
  getImportantCellIndicators(): CellIndicator[] {
    return Array.from(this._cellIndicators.value.values())
      .filter(indicator => indicator.priority === 'high' || indicator.priority === 'medium')
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
  }

  /**
   * Obtenir un résumé des conflits actuels
   */
  getCurrentConflicts() {
    const lockedCells = Array.from(this._cellIndicators.value.values())
      .filter(indicator => indicator.isLocked)
    
    return {
      count: lockedCells.length,
      cells: lockedCells.map(indicator => ({
        cellId: indicator.cellId,
        collaborateurId: indicator.collaborateurId,
        date: indicator.date,
        lockOwner: indicator.lockOwner?.displayName || 'Inconnu'
      }))
    }
  }

  // ==========================================
  // MÉTHODES DE DEBUG
  // ==========================================

  debugInfo() {
    return {
      users: this.users.value.length,
      cellIndicators: this.cellIndicators.value.length,
      userColors: this.userColorMap.size,
      stats: this.stats.value,
      conflicts: this.getCurrentConflicts()
    }
  }

  logState() {
    // DEBUG: État du service
    // console.log('🎨 SessionDisplayService État:', this.debugInfo())
    // console.log('👥 Utilisateurs:', this.users.value)
    // console.log('📱 Indicateurs cellules:', this.cellIndicators.value)
  }
}

// ==========================================
// COMPOSABLE POUR VUE
// ==========================================

export function useSessionDisplay() {
  const service = new SessionDisplayService()
  
  return {
    // Données réactives
    users: service.users,
    onlineUsers: service.onlineUsers,
    multiSessionUsers: service.multiSessionUsers,
    sortedUsers: service.sortedUsers,
    cellIndicators: service.cellIndicators,
    stats: service.stats,
    
    // Méthodes
    updateFromMultiUserState: service.updateFromMultiUserState.bind(service),
    getUsersOnCell: service.getUsersOnCell.bind(service),
    isCellLockedByOther: service.isCellLockedByOther.bind(service),
    getCellLockInfo: service.getCellLockInfo.bind(service),
    getUser: service.getUser.bind(service),
    getUserColorById: service.getUserColorById.bind(service),
    getUserTooltip: service.getUserTooltip.bind(service),
    getImportantCellIndicators: service.getImportantCellIndicators.bind(service),
    getCurrentConflicts: service.getCurrentConflicts.bind(service),
    
    // Debug
    debugInfo: service.debugInfo.bind(service),
    logState: service.logState.bind(service)
  }
}

// Export du service singleton pour usage direct
export const sessionDisplayService = new SessionDisplayService()
