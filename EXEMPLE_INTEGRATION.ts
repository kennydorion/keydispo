/**
 * Exemple d'intégration du nouveau système multi-utilisateur
 * 
 * Ce fichier montre les modifications à apporter à SemaineVirtualClean.vue
 * pour intégrer le nouveau système de collaboration.
 * 
 * Changements requis : MINIMAL - juste l'import et le composant d'affichage
 */

// ==========================================
// 1. CHANGEMENT D'IMPORT (UNE SEULE LIGNE)
// ==========================================

// ANCIEN (à remplacer)
// import { newCollaborationService as collaborationService } from '../services/newCollaborationService'

// NOUVEAU (remplacement direct)
import { newCollaborationService as collaborationService } from '../services/multiUserMigrationService'

// ==========================================
// 2. IMPORT DU NOUVEAU COMPOSANT
// ==========================================

import SessionStatusBar from '../components/SessionStatusBar.vue'

// ==========================================
// 3. AJOUT DU COMPOSANT AU TEMPLATE
// ==========================================

/*
Dans le template, remplacer le panneau de statut existant par :

<SessionStatusBar
  :display-users="collaborationService.getDisplayUsers()"
  :sorted-users="collaborationService.getSortedUsers()"
  :stats="collaborationService.getStats().display"
  :important-activities="collaborationService.getImportantActivities()"
  :conflicts="collaborationService.getCurrentConflicts()"
  :realtime-active="isRealtimeActive"
  :realtime-listeners="realtimeListeners.length"
  :is-emulator-mode="isEmulatorMode"
  @cleanup-sessions="cleanupSessions"
  @show-realtime-stats="showRealtimeStats"
  @debug-multi-user="debugMultiUser"
/>
*/

// ==========================================
// 4. FONCTIONS UTILITAIRES AMÉLIORÉES
// ==========================================

/**
 * Obtenir les utilisateurs connectés (format amélioré)
 */
function getConnectedUsers() {
  return collaborationService.getDisplayUsers()
}

/**
 * Obtenir les utilisateurs uniques
 */
function getUniqueUsersCount(): number {
  return collaborationService.getStats().display.uniqueUsers
}

/**
 * Obtenir le nombre total de sessions
 */
function getTotalSessionsCount(): number {
  return collaborationService.getStats().display.totalSessions
}

/**
 * Vérifier si un utilisateur a plusieurs sessions
 */
function isUserWithMultipleSessions(uid: string): boolean {
  const user = collaborationService.getDisplayUsers().find(u => u.uid === uid)
  return user?.isMultiSession || false
}

/**
 * Obtenir le nombre de sessions pour un utilisateur
 */
function getUserSessionCount(uid: string): number {
  const user = collaborationService.getDisplayUsers().find(u => u.uid === uid)
  return user?.sessionCount || 0
}

/**
 * Obtenir un tooltip formaté pour un utilisateur
 */
function getUserStatusTooltip(user: any): string {
  // Si c'est un utilisateur du nouveau format
  if (user.isMultiSession !== undefined) {
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
        activityInfo = ` • ${activityText} ${user.currentActivity.collaborateurId}-${user.currentActivity.date}`
      }
    }
    
    return `${user.displayName} - ${user.status}${sessionInfo}${activityInfo}`
  }
  
  // Fallback pour l'ancien format
  const sessionCount = getUserSessionCount(user.uid)
  const sessionInfo = sessionCount > 1 ? ` (${sessionCount} onglets)` : ''
  return `${user.displayName} - ${user.status}${sessionInfo}`
}

/**
 * Obtenir une couleur consistante pour un utilisateur
 */
function getUserColor(uid: string): string {
  return collaborationService.getUserColor(uid)
}

/**
 * Obtenir les utilisateurs qui survolent une cellule (version améliorée)
 */
function getHoveringUsers(collaborateurId: string, date: string) {
  return collaborationService.getHoveringUsers(collaborateurId, date)
}

/**
 * Vérifier si un utilisateur édite une cellule
 */
function isUserEditingCell(user: any, collaborateurId: string, date: string): boolean {
  return collaborationService.isUserEditingCell(user, collaborateurId, date)
}

/**
 * Nettoyer les sessions expirées
 */
async function cleanupSessions() {
  try {
    await collaborationService.cleanupSessions()
    console.log('🧹 Nettoyage des sessions terminé')
  } catch (error) {
    console.error('❌ Erreur nettoyage sessions:', error)
  }
}

/**
 * Afficher les statistiques de synchronisation
 */
function showRealtimeStats() {
  const stats = collaborationService.getStats()
  console.log('📊 Statistiques multi-utilisateur:', stats)
  
  notify({
    message: `👥 ${stats.display.uniqueUsers} utilisateur(s) • 📱 ${stats.display.totalSessions} session(s) • 🔒 ${stats.display.activities.total} activité(s)`,
    color: 'info',
    position: 'top-right',
    duration: 4000
  })
}

/**
 * Debug du système multi-utilisateur
 */
function debugMultiUser() {
  console.log('🔍 Debug multi-utilisateur')
  collaborationService.debugState()
  
  // Afficher les informations détaillées
  console.log('📊 Utilisateurs connectés:', getConnectedUsers())
  console.log('⚠️ Conflits actuels:', collaborationService.getCurrentConflicts())
  console.log('📱 Activités importantes:', collaborationService.getImportantActivities())
}

// ==========================================
// 5. GESTION DES CELLULES (INCHANGÉE)
// ==========================================

/*
Toutes les fonctions existantes continuent de fonctionner sans modification :

- handleCellMouseEnter()
- handleCellMouseLeave() 
- openDispoModal()
- isCellLockedByOther()
- getCellLockInfo()
- etc.

Le service de migration assure la compatibilité totale !
*/

// ==========================================
// 6. INITIALISATION (INCHANGÉE)
// ==========================================

/*
L'initialisation reste identique :

async function initializePresence() {
  // ... code existant inchangé
  await collaborationService.init('keydispo', {
    uid: user.uid,
    email: user.email || undefined,
    displayName: user.displayName || undefined
  })
  
  // S'abonner aux changements (inchangé)
  collaborationService.onPresenceChange((users) => {
    connectedUsers.value = users
    // ... reste du code inchangé
  })
}
*/

// ==========================================
// 7. EXEMPLE D'UTILISATION AVANCÉE
// ==========================================

/**
 * Obtenir des informations détaillées sur l'état collaboratif
 */
function getCollaborationStatus() {
  const stats = collaborationService.getStats()
  const conflicts = collaborationService.getCurrentConflicts()
  const activities = collaborationService.getImportantActivities()
  
  return {
    // Résumé
    summary: {
      users: stats.display.uniqueUsers,
      sessions: stats.display.totalSessions,
      conflicts: conflicts.count,
      activities: stats.display.activities.total
    },
    
    // Détails
    users: collaborationService.getDisplayUsers(),
    multiSessionUsers: collaborationService.getMultiSessionUsers(),
    onlineUsers: collaborationService.getOnlineUsers(),
    
    // Conflits et activités
    conflicts: conflicts.cells,
    importantActivities: activities,
    
    // État technique
    systemStats: stats
  }
}

/**
 * Surveiller les changements d'état collaboratif
 */
function watchCollaborationChanges() {
  // S'abonner aux changements de présence
  const unsubscribePresence = collaborationService.onPresenceChange((users) => {
    console.log(`👥 Changement de présence: ${users.length} utilisateur(s)`)
    
    // Détecter les nouveaux utilisateurs
    const currentUsers = connectedUsers.value || []
    const newUsers = users.filter(user => 
      !currentUsers.some(existing => existing.uid === user.uid)
    )
    
    newUsers.forEach(user => {
      console.log(`👋 Nouvel utilisateur connecté: ${user.displayName}`)
    })
    
    // Mettre à jour l'état
    connectedUsers.value = users
  })
  
  // S'abonner aux changements de verrous
  const unsubscribeLocks = collaborationService.onLockChange(() => {
    console.log('🔒 Changement d\'état des verrous détecté')
    lockUpdateCounter.value++
  })
  
  // Retourner fonction de nettoyage
  return () => {
    unsubscribePresence()
    unsubscribeLocks()
  }
}

/**
 * Exemple d'utilisation dans onMounted
 */
/*
onMounted(async () => {
  // Initialisation existante...
  await initializePresence()
  
  // Nouveau : surveiller les changements collaboratifs
  const unsubscribe = watchCollaborationChanges()
  
  // Nouveau : afficher l'état initial
  console.log('🚀 État collaboratif initial:', getCollaborationStatus())
  
  // Nettoyage
  onUnmounted(() => {
    unsubscribe()
    collaborationService.destroy()
  })
})
*/

// ==========================================
// RÉSUMÉ DES CHANGEMENTS
// ==========================================

/*
CHANGEMENTS OBLIGATOIRES (2 lignes) :
1. Changer l'import du service de collaboration
2. Ajouter l'import du composant SessionStatusBar

CHANGEMENTS OPTIONNELS (recommandés) :
1. Remplacer le status panel par SessionStatusBar
2. Utiliser les nouvelles fonctions utilitaires
3. Ajouter le monitoring avancé

AVANTAGES OBTENUS :
✅ Sessions multi-onglets gérées automatiquement
✅ Affichage moderne avec avatars colorés  
✅ Statistiques détaillées en temps réel
✅ Gestion intelligente des conflits
✅ Nettoyage automatique optimisé
✅ Debug et monitoring améliorés
✅ Performance accrue
✅ Compatibilité totale garantie
*/

export {
  // Fonctions utilitaires
  getConnectedUsers,
  getUniqueUsersCount,
  getTotalSessionsCount,
  isUserWithMultipleSessions,
  getUserSessionCount,
  getUserStatusTooltip,
  getUserColor,
  getHoveringUsers,
  isUserEditingCell,
  
  // Actions
  cleanupSessions,
  showRealtimeStats,
  debugMultiUser,
  
  // Monitoring avancé
  getCollaborationStatus,
  watchCollaborationChanges
}
