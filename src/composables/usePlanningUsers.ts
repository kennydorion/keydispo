import { ref, computed, watch, nextTick, type Ref } from 'vue'
import { auth, rtdb } from '@/services/firebase'
import { AuthService } from '@/services/auth'
import { useUserPreferences } from '@/services/userPreferences'
import { UserColorsService } from '@/services/userColorsService'
import { getUserInitials } from '@/services/avatarUtils'
import { ref as rtdbRef, onValue, off } from 'firebase/database'
import { emergencyOptimization } from '@/services/emergencyOptimization'
import { useSessionDisplay, type DisplayUser } from '@/services/sessionDisplayService'

/**
 * Composable pour la gestion des utilisateurs et de la présence
 * Centralise toute la logique liée aux utilisateurs connectés, couleurs, préférences
 */
export function usePlanningUsers(collaborationService: any) {
  // User preferences pour la couleur de présence
  const { preferences, loadPreferences } = useUserPreferences()
  
  // Listener pour synchronisation temps réel des préférences
  let preferencesUnsubscribe: (() => void) | null = null
  
  // Session display service pour les utilisateurs connectés
  const { users: realConnectedUsers, stats: sessionStats } = useSessionDisplay()
  
  // Utilisateurs connectés (computed depuis realConnectedUsers)
  const connectedUsers = computed(() => realConnectedUsers.value)
  
  /**
   * Obtenir les utilisateurs actifs sur le planning (présence, locks, sélections)
   */
  function getActiveUsers() {
    if (!collaborationService) return []
    
    const activeUsers = new Map()
    
    // Ajouter les utilisateurs avec présence active
    collaborationService.presence.forEach((user: any) => {
      if (user.status === 'online') {
        activeUsers.set(user.userId, {
          userId: user.userId,
          userName: user.userName,
          status: 'présent'
        })
      }
    })
    
    // Ajouter les utilisateurs avec locks actifs
    collaborationService.locks.forEach((lock: any) => {
      activeUsers.set(lock.userId, {
        userId: lock.userId,
        userName: lock.userName,
        status: 'modification'
      })
    })
    
    // Ajouter les utilisateurs avec sélections actives
    collaborationService.remoteSelections.forEach((selection: any) => {
      activeUsers.set(selection.userId, {
        userId: selection.userId,
        userName: selection.userName,
        status: 'sélection'
      })
    })
    
    return Array.from(activeUsers.values())
  }
  
  /**
   * Obtenir le nombre d'utilisateurs uniques connectés
   */
  function getUniqueUsersCount(): number {
    const uniqueIds = new Set(connectedUsers.value.map((u: any) => u.uid))
    return uniqueIds.size
  }
  
  /**
   * Obtenir le nombre total de sessions
   */
  function getTotalSessionsCount(): number {
    return connectedUsers.value.reduce((sum: number, u: any) => sum + (u.sessions?.length || 1), 0)
  }
  
  /**
   * Obtenir le tooltip de statut utilisateur
   */
  function getUserStatusTooltip(user: DisplayUser): string {
    const sessions = user.sessions?.length || 1
    return `${user.displayName || user.email} - ${sessions} session${sessions > 1 ? 's' : ''}`
  }
  
  /**
   * Wrapper pour obtenir la couleur utilisateur avec support des préférences
   */
  function getUserColorWrapper(uid: string): string {
    // Utiliser le service unifié de couleurs qui gère automatiquement 
    // les couleurs personnalisées et le cache temps réel
    return UserColorsService.getUserColor(uid)
  }
  
  /**
   * Mettre à jour les variables CSS pour la couleur de l'utilisateur actuel
   */
  function updateUserColorVariables() {
    if (!auth.currentUser) return
    
    const userColor = getUserColorWrapper(auth.currentUser.uid)
    const root = document.documentElement
    
    // Mettre à jour la variable CSS pour la couleur de l'utilisateur actuel
    root.style.setProperty('--current-user-color', userColor)
    
    // Mettre à jour également la variable pour les indicateurs
    root.style.setProperty('--user-indicator-color', userColor)
  }
  
  /**
   * Gestionnaire pour les mises à jour de préférences depuis d'autres composants
   */
  function handleUserPreferencesUpdate(event: Event) {
    const customEvent = event as CustomEvent
    
    if (customEvent.detail.colorChanged) {
      // Forcer la mise à jour des variables CSS
      updateUserColorVariables()
      
      // Déclencher un re-render des composants visuels qui affichent les couleurs
      nextTick(() => {
        // Forcer la mise à jour des éléments ayant des couleurs utilisateur
        const avatarElements = document.querySelectorAll('[data-user-avatar]')
        avatarElements.forEach(el => {
          const element = el as HTMLElement
          if (element.style.backgroundColor) {
            // Forcer une re-application de la couleur
            element.style.backgroundColor = getUserColorWrapper(customEvent.detail.userId)
          }
        })
      })
    }
  }
  
  /**
   * Configurer la synchronisation temps réel des préférences utilisateur
   */
  function setupRealtimePreferences() {
    if (!auth.currentUser || !AuthService.currentTenantId) return
    
    // ⚠️ CONTRÔLE D'URGENCE : Désactiver en mode urgence
    if (emergencyOptimization?.isServiceDisabled?.('DISABLE_PRESENCE_TRACKING')) {
      console.warn('🚨 [EMERGENCY] Sync préférences désactivée - Mode cache local')
      // Charger une seule fois les préférences puis utiliser le cache
      if (loadPreferences && auth.currentUser) {
        loadPreferences(auth.currentUser.uid).then(() => {
          updateUserColorVariables()
        })
      }
      return
    }
    
    const userRef = rtdbRef(rtdb, `tenants/${AuthService.currentTenantId}/users/${auth.currentUser.uid}`)
    
    // Nettoyer l'ancien listener s'il existe
    if (preferencesUnsubscribe) {
      preferencesUnsubscribe()
    }
    
    // ⚠️ LIMITE : Créer un listener seulement si on peut
    if (!emergencyOptimization?.canCreateListener?.()) {
      console.warn('🚨 [EMERGENCY] Limite listeners atteinte - Préférences en mode cache')
      return
    }
    
    // Créer un nouveau listener temps réel
    const unsubscribeFn = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val()
        const newPreferences = userData.preferences || {}
        
        // Vérifier si la couleur a changé
        const oldColor = preferences.value.presenceColor
        const newColor = newPreferences.presenceColor
        
        if (oldColor !== newColor && newColor) {
          // Recharger les préférences via le service pour mettre à jour l'état réactif
          if (loadPreferences && auth.currentUser) {
            loadPreferences(auth.currentUser.uid).then(() => {
              // Mettre à jour les variables CSS après rechargement
              updateUserColorVariables()
              
              // Forcer la mise à jour des composants qui utilisent getUserColorWrapper
              nextTick(() => {
                // Déclencher un re-render des éléments qui utilisent la couleur utilisateur
                const event = new CustomEvent('userPreferencesUpdated', { 
                  detail: { 
                    userId: auth.currentUser!.uid, 
                    preferences: newPreferences,
                    colorChanged: true,
                    oldColor: oldColor,
                    newColor: newColor
                  } 
                })
                document.dispatchEvent(event)
              })
            })
          }
        }
      }
    }, (error) => {
      console.error('❌ Erreur listener préférences:', error)
    })
    
    preferencesUnsubscribe = () => off(userRef, 'value', unsubscribeFn)
  }
  
  /**
   * Configurer la synchronisation des couleurs utilisateurs
   */
  function setupUserColorsSync() {
    if (!auth.currentUser) return

    // Écouter la couleur de l'utilisateur actuel
    UserColorsService.listenToUserColor(auth.currentUser.uid)
    
    // Watch pour ajouter des listeners pour les nouveaux utilisateurs connectés
    watch(connectedUsers, (newUsers) => {
      const userIds = newUsers.map((user: any) => user.uid).filter((uid: string) => uid)
      UserColorsService.listenToMultipleUsers(userIds)
    }, { immediate: true })
  }
  
  /**
   * Nettoyer les sessions expirées
   */
  async function cleanupSessions() {
    try {
      // Géré automatiquement dans le nouveau système
    } catch (error) {
      console.error('❌ Erreur nettoyage sessions:', error)
    }
  }
  
  /**
   * Nettoyer les listeners à la destruction du composable
   */
  function cleanup() {
    if (preferencesUnsubscribe) {
      preferencesUnsubscribe()
      preferencesUnsubscribe = null
    }
  }
  
  return {
    // État
    preferences,
    connectedUsers,
    sessionStats,
    
    // Fonctions
    getActiveUsers,
    getUniqueUsersCount,
    getTotalSessionsCount,
    getUserStatusTooltip,
    getUserColorWrapper,
    getUserInitials,
    updateUserColorVariables,
    handleUserPreferencesUpdate,
    setupRealtimePreferences,
    setupUserColorsSync,
    cleanupSessions,
    cleanup
  }
}
