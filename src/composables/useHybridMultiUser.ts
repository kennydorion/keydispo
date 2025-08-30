/**
 * Composable pour le système hybride multi-utilisateur
 * 
 * Simplifie l'utilisation du service hybride avec une API réactive Vue 3
 * Gère automatiquement le cycle de vie et les états
 */

import { ref, computed, onUnmounted, watch } from 'vue'
import { hybridMultiUserService } from '@/services/hybridMultiUserService'
import { auth } from '@/services/firebase'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { AuthService } from '@/services/auth'

// ==========================================
// ÉTAT GLOBAL RÉACTIF
// ==========================================

const isActive = ref(false)
const isInitialized = ref(false)
const users = ref(new Map())
const activities = ref(new Map())
const locks = ref(new Map())
const stats = ref({
  sessions: 0,
  presences: 0,
  activities: 0,
  locks: 0
})

// État auth réactif
const currentUser = ref<User | null>(null)
const tenantId = ref<string | null>(null)
const isAuthenticated = ref(false)

// Initialiser l'état auth
onAuthStateChanged(auth, async (user) => {
  currentUser.value = user
  isAuthenticated.value = !!user
  
  if (user) {
    try {
      // Récupérer le rôle utilisateur pour validation
      await AuthService.getUserRole(user.uid)
      tenantId.value = 'keyplacement' // Default tenant pour le moment
    } catch (error) {
      console.warn('⚠️ Erreur récupération tenant:', error)
      tenantId.value = 'keyplacement' // Fallback
    }
  } else {
    tenantId.value = null
  }
})

// ==========================================
// COMPOSABLE PRINCIPAL
// ==========================================

export function useHybridMultiUser() {

  // ==========================================
  // COMPUTED PROPERTIES
  // ==========================================

  const connectedUsers = computed(() => {
    return Array.from(users.value.values())
      .filter(user => user.status === 'online')
      .sort((a, b) => a.userName.localeCompare(b.userName))
  })

  const totalUsers = computed(() => connectedUsers.value.length)

  const currentUserSession = computed(() => {
    if (!currentUser.value || !isActive.value) return null
    
    return Array.from(users.value.values())
      .find(user => user.userId === currentUser.value!.uid)
  })

  const isUserActive = computed(() => 
    currentUserSession.value?.status === 'online'
  )

  // ==========================================
  // MÉTHODES D'INITIALISATION
  // ==========================================

  async function init() {
    if (isInitialized.value || !currentUser.value || !tenantId.value) {
      console.warn('⚠️ Service hybride : conditions d\'initialisation non remplies')
      return false
    }

    try {
      
      await hybridMultiUserService.init(tenantId.value, {
        uid: currentUser.value.uid,
        displayName: currentUser.value.displayName || undefined,
        email: currentUser.value.email || undefined
      })

      isActive.value = true
      isInitialized.value = true
      
      // Démarrer la synchronisation des états
      startReactiveSync()
      
      return true
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du service hybride:', error)
      isActive.value = false
      isInitialized.value = false
      return false
    }
  }

  async function destroy() {
    if (!isInitialized.value) return

    try {
      
      await hybridMultiUserService.destroy()
      
      isActive.value = false
      isInitialized.value = false
      users.value.clear()
      activities.value.clear()
      locks.value.clear()
      
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt du service hybride:', error)
    }
  }

  // ==========================================
  // SYNCHRONISATION RÉACTIVE
  // ==========================================

  function startReactiveSync() {
    // Synchroniser les états toutes les secondes
    const syncInterval = setInterval(() => {
      if (!isActive.value) {
        clearInterval(syncInterval)
        return
      }

      try {
        // Récupérer les données du service
        const serviceUsers = hybridMultiUserService.getConnectedUsers()
        const serviceStats = hybridMultiUserService.getStats()
        
        // Mettre à jour les refs réactifs
        users.value.clear()
        serviceUsers.forEach(user => {
          users.value.set(user.sessionId, user)
        })
        
        stats.value = {
          sessions: serviceStats.sessions,
          presences: serviceStats.presences,
          activities: serviceStats.activities,
          locks: serviceStats.locks
        }
        
      } catch (error) {
        console.warn('⚠️ Erreur synchronisation réactive:', error)
      }
    }, 1000)

    // Nettoyer à la destruction
    onUnmounted(() => {
      clearInterval(syncInterval)
    })
  }

  // ==========================================
  // API CELLULES - SURVOL
  // ==========================================

  async function hoverCell(collaborateurId: string, date: string) {
    if (!isActive.value) return false

    try {
      await hybridMultiUserService.hoverCell(collaborateurId, date)
      return true
    } catch (error) {
      console.warn(`⚠️ Erreur survol cellule ${collaborateurId}_${date}:`, error)
      return false
    }
  }

  async function unhoverCell(collaborateurId: string, date: string) {
    if (!isActive.value) return false

    try {
      await hybridMultiUserService.unhoverCell(collaborateurId, date)
      return true
    } catch (error) {
      console.warn(`⚠️ Erreur fin survol cellule ${collaborateurId}_${date}:`, error)
      return false
    }
  }

  // ==========================================
  // API CELLULES - VERROUILLAGE
  // ==========================================

  async function lockCell(collaborateurId: string, date: string, lockType: 'editing' | 'modal' = 'editing') {
    if (!isActive.value) return false

    try {
      const success = await hybridMultiUserService.lockCell(collaborateurId, date, lockType)
      
      if (success) {
      } else {
        console.warn(`⚠️ Impossible de verrouiller: ${collaborateurId}_${date}`)
      }
      
      return success
    } catch (error) {
      console.error(`❌ Erreur verrouillage cellule ${collaborateurId}_${date}:`, error)
      return false
    }
  }

  async function unlockCell(collaborateurId: string, date: string) {
    if (!isActive.value) return false

    try {
      await hybridMultiUserService.unlockCell(collaborateurId, date)
      return true
    } catch (error) {
      console.error(`❌ Erreur déverrouillage cellule ${collaborateurId}_${date}:`, error)
      return false
    }
  }

  // ==========================================
  // API CELLULES - REQUÊTES
  // ==========================================

  function isCellLocked(collaborateurId: string, date: string): boolean {
    if (!isActive.value) return false
    return hybridMultiUserService.isCellLocked(collaborateurId, date)
  }

  function getCellLockInfo(collaborateurId: string, date: string) {
    if (!isActive.value) return null
    return hybridMultiUserService.getCellLockInfo(collaborateurId, date)
  }

  function getUsersOnCell(collaborateurId: string, date: string) {
    if (!isActive.value) return []
    return hybridMultiUserService.getUsersOnCell(collaborateurId, date)
  }

  function isCellLockedByMe(collaborateurId: string, date: string): boolean {
    if (!isActive.value || !currentUser.value) return false
    
    const lockInfo = getCellLockInfo(collaborateurId, date)
    return lockInfo?.lockedBy.userId === currentUser.value.uid
  }

  function isCellLockedByOther(collaborateurId: string, date: string): boolean {
    if (!isActive.value || !currentUser.value) return false
    
    const lockInfo = getCellLockInfo(collaborateurId, date)
    return lockInfo ? lockInfo.lockedBy.userId !== currentUser.value.uid : false
  }

  // ==========================================
  // HELPERS POUR INTERFACE
  // ==========================================

  function getCellStateClass(collaborateurId: string, date: string): string {
    if (!isActive.value) return ''

    if (isCellLockedByMe(collaborateurId, date)) {
      return 'cell-locked-by-me'
    }
    
    if (isCellLockedByOther(collaborateurId, date)) {
      return 'cell-locked-by-other'
    }

    const usersOnCell = getUsersOnCell(collaborateurId, date)
    if (usersOnCell.length > 0) {
      return 'cell-has-activity'
    }

    return ''
  }

  function getCellTooltip(collaborateurId: string, date: string): string {
    if (!isActive.value) return ''

    const lockInfo = getCellLockInfo(collaborateurId, date)
    if (lockInfo) {
      const isMe = lockInfo.lockedBy.userId === currentUser.value?.uid
      return isMe 
        ? `🔒 Cellule verrouillée par vous (${lockInfo.lockType})`
        : `🔒 Cellule verrouillée par ${lockInfo.lockedBy.userName} (${lockInfo.lockType})`
    }

    const usersOnCell = getUsersOnCell(collaborateurId, date)
    if (usersOnCell.length > 0) {
      const names = usersOnCell.map(u => u.userName).join(', ')
      return `👀 Consultée par: ${names}`
    }

    return ''
  }

  // ==========================================
  // CYCLE DE VIE AUTOMATIQUE
  // ==========================================

  // Auto-initialisation quand l'utilisateur est connecté
  watch(
    () => [currentUser.value, tenantId.value, isAuthenticated.value],
    async ([user, tenantIdValue, isAuth]) => {
      if (isAuth && user && tenantIdValue && !isInitialized.value) {
        await init()
      } else if (!isAuth && isInitialized.value) {
        await destroy()
      }
    },
    { immediate: true }
  )

  // Nettoyage automatique
  onUnmounted(async () => {
    if (isInitialized.value) {
      await destroy()
    }
  })

  // ==========================================
  // API PUBLIQUE
  // ==========================================

  return {
    // État
    isActive: computed(() => isActive.value),
    isInitialized: computed(() => isInitialized.value),
    connectedUsers,
    totalUsers,
    currentUser: computed(() => currentUser.value),
    currentUserSession,
    isUserActive,
    stats: computed(() => stats.value),

    // Méthodes de contrôle
    init,
    destroy,

    // API cellules - survol
    hoverCell,
    unhoverCell,

    // API cellules - verrouillage
    lockCell,
    unlockCell,

    // API cellules - requêtes
    isCellLocked,
    getCellLockInfo,
    getUsersOnCell,
    isCellLockedByMe,
    isCellLockedByOther,

    // Helpers interface
    getCellStateClass,
    getCellTooltip
  }
}
