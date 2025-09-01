/**
 * Composable Vue 3 pour le système multi-utilisateur RTDB
 * 
 * Remplace le système Firestore par RTDB pour :
 * ✅ Réduire les coûts de 80%
 * ✅ Améliorer les performances temps réel
 * ✅ Simplifier la gestion des collaborations
 */

import { ref, computed, onMounted, onUnmounted, watch, readonly } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { multiUserRTDBService, type RTDBUserSession, type RTDBCellActivity, type RTDBMultiUserState } from '../services/multiUserRTDBService'
import { auth } from '../services/firebase'
import { AuthService } from '../services/auth'

// ==========================================
// INTERFACES ET TYPES
// ==========================================

export interface CellCollaborationInfo {
  isActive: boolean
  activityType: 'hover' | 'editing' | 'locked' | 'viewing'
  userName: string
  userId: string
  sessionId: string
  startedAt: number
  expiresAt: number
  isOwnActivity: boolean
  canEdit: boolean
  priority: number
}

export interface SessionInfo {
  sessionId: string
  userId: string
  userName: string
  userEmail: string
  status: 'online' | 'idle' | 'background' | 'offline'
  lastActivity: number
  currentAction?: {
    type: string
    cellId?: string
    collaborateurId?: string
    date?: string
  }
  isCurrentUser: boolean
}

export interface MultiUserStats {
  totalUsers: number
  onlineUsers: number
  totalSessions: number
  totalActivities: number
  lastUpdate: number
}

// ==========================================
// COMPOSABLE PRINCIPAL
// ==========================================

export function useMultiUserRTDB() {
  // ==========================================
  // ÉTAT RÉACTIF
  // ==========================================
  
  // État des utilisateurs Firebase
  const currentUser = ref(auth.currentUser)
  const currentTenant = ref({ id: AuthService.currentTenantId })
  
  // État général
  const isInitialized = ref(false)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  
  // État multi-utilisateur
  const allSessions = ref<Map<string, RTDBUserSession>>(new Map())
  const allActivities = ref<Map<string, RTDBCellActivity>>(new Map())
  const allPresence = ref<Map<string, any>>(new Map())
  
  // Cache des collaborations par cellule
  const cellCollaborations = ref<Map<string, CellCollaborationInfo>>(new Map())
  
  // Callbacks de cleanup
  const unsubscribeFunctions = ref<Array<() => void>>([])

  // ==========================================
  // COMPUTED OPTIMISÉS
  // ==========================================

  const activeSessions = computed<SessionInfo[]>(() => {
    const currentUserId = currentUser.value?.uid
    
    return Array.from(allSessions.value.values())
      .filter(session => session.status === 'online' || session.status === 'idle')
      .map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        userName: session.userName,
        userEmail: session.userEmail,
        status: session.status,
        lastActivity: session.lastActivity,
        currentAction: session.currentAction,
        isCurrentUser: session.userId === currentUserId
      }))
      .sort((a, b) => {
        // Utilisateur actuel en premier
        if (a.isCurrentUser) return -1
        if (b.isCurrentUser) return 1
        // Puis par activité récente
        return b.lastActivity - a.lastActivity
      })
  })

  const onlineUsers = computed(() => {
    return Array.from(allPresence.value.values())
      .filter(presence => presence.status === 'online')
  })

  const stats = computed<MultiUserStats>(() => ({
    totalUsers: allPresence.value.size,
    onlineUsers: onlineUsers.value.length,
    totalSessions: allSessions.value.size,
    totalActivities: allActivities.value.size,
    lastUpdate: Date.now()
  }))

  const currentUserSession = computed(() => {
    const currentUserId = currentUser.value?.uid
    if (!currentUserId) return null
    
    return Array.from(allSessions.value.values())
      .find(session => session.userId === currentUserId)
  })

  // ==========================================
  // MÉTHODES D'INITIALISATION
  // ==========================================

  async function initialize() {
    if (isInitialized.value) {
      console.warn('⚠️ Multi-user RTDB déjà initialisé')
      return
    }

    try {
      const user = currentUser.value
      const tenant = currentTenant.value
      
      if (!user || !tenant) {
        throw new Error('Utilisateur ou tenant manquant')
      }

      console.log('🚀 Initialisation Multi-User RTDB...')
      
      await multiUserRTDBService.init(tenant.id, {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0],
        email: user.email || undefined
      })

      setupRealtimeListeners()
      
      isInitialized.value = true
      isConnected.value = true
      error.value = null
      
      console.log('✅ Multi-User RTDB initialisé')
      
    } catch (err) {
      console.error('❌ Erreur initialisation Multi-User RTDB:', err)
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      isInitialized.value = false
      isConnected.value = false
    }
  }

  function setupRealtimeListeners() {
    // Listener principal pour toutes les données
    const unsubscribeMain = multiUserRTDBService.onSessionChange((state: RTDBMultiUserState) => {
      allSessions.value = new Map(state.sessions)
      allActivities.value = new Map(state.activities)
      allPresence.value = new Map(state.presence)
      
      // Mettre à jour le cache des collaborations
      updateCellCollaborationsCache()
    })
    
    unsubscribeFunctions.value.push(unsubscribeMain)
  }

  function updateCellCollaborationsCache() {
    const newCollaborations = new Map<string, CellCollaborationInfo>()
    const currentUserId = currentUser.value?.uid
    
    for (const [cellId, activity] of allActivities.value) {
      const collaborationInfo: CellCollaborationInfo = {
        isActive: true,
        activityType: activity.activityType,
        userName: activity.userName,
        userId: activity.userId,
        sessionId: activity.sessionId,
        startedAt: activity.startedAt,
        expiresAt: activity.expiresAt,
        isOwnActivity: activity.userId === currentUserId,
        canEdit: activity.userId === currentUserId || activity.activityType === 'hover',
        priority: activity.activityType === 'editing' ? 3 : 
                 activity.activityType === 'locked' ? 2 : 1
      }
      
      newCollaborations.set(cellId, collaborationInfo)
    }
    
    cellCollaborations.value = newCollaborations
  }

  // ==========================================
  // GESTION DES ACTIVITÉS CELLULES
  // ==========================================

  async function startCellActivity(
    collaborateurId: string,
    date: string,
    activityType: 'hover' | 'editing' | 'locked' | 'viewing' = 'hover',
    metadata?: any
  ): Promise<boolean> {
    if (!isInitialized.value || !isConnected.value) {
      console.warn('⚠️ Service multi-user non initialisé')
      return false
    }

    try {
      const success = await multiUserRTDBService.startCellActivity(
        collaborateurId,
        date,
        activityType,
        metadata
      )
      
      if (!success) {
        console.log(`⚠️ Impossible de démarrer l'activité sur ${collaborateurId}_${date}`)
      }
      
      return success
      
    } catch (err) {
      console.error('❌ Erreur démarrage activité:', err)
      return false
    }
  }

  async function stopCellActivity(collaborateurId: string, date: string): Promise<boolean> {
    if (!isInitialized.value || !isConnected.value) return false

    try {
      const success = await multiUserRTDBService.stopCellActivity(collaborateurId, date)
      
      if (success) {
        // Retirer immédiatement du cache local pour feedback instantané
        const cellId = `${collaborateurId}_${date}`
        cellCollaborations.value.delete(cellId)
      }
      
      return success
      
    } catch (err) {
      console.error('❌ Erreur arrêt activité:', err)
      return false
    }
  }

  async function updateSessionStatus(status: 'online' | 'idle' | 'background' | 'offline') {
    if (!isInitialized.value) return

    try {
      await multiUserRTDBService.updateSessionStatus(status)
    } catch (err) {
      console.error('❌ Erreur mise à jour statut:', err)
    }
  }

  // ==========================================
  // HELPERS ET GETTERS
  // ==========================================

  function getCellCollaboration(collaborateurId: string, date: string): CellCollaborationInfo | null {
    const cellId = `${collaborateurId}_${date}`
    return cellCollaborations.value.get(cellId) || null
  }

  function isCellLocked(collaborateurId: string, date: string): boolean {
    const collaboration = getCellCollaboration(collaborateurId, date)
    return collaboration ? collaboration.isActive && !collaboration.isOwnActivity : false
  }

  function canEditCell(collaborateurId: string, date: string): boolean {
    const collaboration = getCellCollaboration(collaborateurId, date)
    if (!collaboration) return true
    
    return collaboration.isOwnActivity || collaboration.canEdit
  }

  function getCellActivityType(collaborateurId: string, date: string): string | null {
    const collaboration = getCellCollaboration(collaborateurId, date)
    return collaboration ? collaboration.activityType : null
  }

  function getActiveCollaborators(): SessionInfo[] {
    return activeSessions.value.filter(session => 
      session.status === 'online' && session.currentAction
    )
  }

  // ==========================================
  // WATCHERS POUR GESTION AUTOMATIQUE
  // ==========================================

  // Auto-initialisation quand user/tenant sont disponibles
  watch([currentUser, currentTenant], async ([user, tenant]) => {
    if (user && tenant && !isInitialized.value) {
      await initialize()
    } else if (!user && isInitialized.value) {
      await cleanup()
    }
  }, { immediate: true })

  // Écouter les changements d'authentification
  onMounted(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      currentUser.value = user
    })
    
    unsubscribeFunctions.value.push(unsubscribeAuth)
  })

  // Gestion automatique du statut de session
  onMounted(() => {
    // Gestion focus/blur pour idle
    const handleFocus = () => updateSessionStatus('online')
    const handleBlur = () => updateSessionStatus('idle')
    const handleBeforeUnload = () => updateSessionStatus('offline')
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Cleanup listeners
    unsubscribeFunctions.value.push(() => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    })
  })

  // ==========================================
  // CLEANUP
  // ==========================================

  async function cleanup() {
    if (!isInitialized.value) return

    console.log('🧹 Nettoyage Multi-User RTDB...')
    
    try {
      // Arrêter tous les listeners
      unsubscribeFunctions.value.forEach(unsubscribe => {
        try {
          unsubscribe()
        } catch (err) {
          console.error('❌ Erreur cleanup listener:', err)
        }
      })
      unsubscribeFunctions.value = []
      
      // Détruire le service
      await multiUserRTDBService.destroy()
      
      // Reset l'état
      isInitialized.value = false
      isConnected.value = false
      error.value = null
      allSessions.value.clear()
      allActivities.value.clear()
      allPresence.value.clear()
      cellCollaborations.value.clear()
      
      console.log('✅ Multi-User RTDB nettoyé')
      
    } catch (err) {
      console.error('❌ Erreur cleanup Multi-User RTDB:', err)
    }
  }

  onUnmounted(() => {
    cleanup()
  })

  // ==========================================
  // API PUBLIQUE
  // ==========================================

  return {
    // État
    isInitialized: readonly(isInitialized),
    isConnected: readonly(isConnected),
    error: readonly(error),
    
    // Données
    activeSessions: readonly(activeSessions),
    onlineUsers: readonly(onlineUsers),
    stats: readonly(stats),
    currentUserSession: readonly(currentUserSession),
    
    // Méthodes principales
    initialize,
    cleanup,
    
    // Gestion des activités
    startCellActivity,
    stopCellActivity,
    updateSessionStatus,
    
    // Helpers
    getCellCollaboration,
    isCellLocked,
    canEditCell,
    getCellActivityType,
    getActiveCollaborators
  }
}

// ==========================================
// HELPERS UTILITAIRES
// ==========================================

// Helper pour créer facilement des watchers sur les cellules spécifiques
export function useCellActivityWatch(collaborateurId: string, date: string) {
  const { getCellCollaboration } = useMultiUserRTDB()
  
  const cellActivity = computed(() => getCellCollaboration(collaborateurId, date))
  const isLocked = computed(() => !!cellActivity.value && !cellActivity.value.isOwnActivity)
  const canEdit = computed(() => !cellActivity.value || cellActivity.value.canEdit)
  
  return {
    cellActivity: readonly(cellActivity),
    isLocked: readonly(isLocked),
    canEdit: readonly(canEdit)
  }
}

// Helper pour la gestion automatique des activités de hover
export function useHoverActivity() {
  const { startCellActivity, stopCellActivity } = useMultiUserRTDB()
  
  let currentHover: { collaborateurId: string; date: string } | null = null
  
  const startHover = async (collaborateurId: string, date: string) => {
    // Arrêter l'ancien hover s'il existe
    if (currentHover) {
      await stopCellActivity(currentHover.collaborateurId, currentHover.date)
    }
    
    const success = await startCellActivity(collaborateurId, date, 'hover')
    if (success) {
      currentHover = { collaborateurId, date }
    }
    
    return success
  }
  
  const stopHover = async () => {
    if (currentHover) {
      await stopCellActivity(currentHover.collaborateurId, currentHover.date)
      currentHover = null
    }
  }
  
  return {
    startHover,
    stopHover
  }
}
