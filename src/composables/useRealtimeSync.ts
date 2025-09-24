import { ref, nextTick } from 'vue'

/**
 * Composable pour gérer la synchronisation en temps réel
 * Centralise les mécanismes de rafraîchissement pour une UX fluide
 */

const refreshCallbacks = new Set<() => void>()
const isRefreshing = ref(false)

export function useRealtimeSync() {
  
  /**
   * Enregistre une fonction de callback pour les rafraîchissements
   */
  function registerRefreshCallback(callback: () => void) {
    refreshCallbacks.add(callback)
    
    // Retourne une fonction de désinscription
    return () => {
      refreshCallbacks.delete(callback)
    }
  }
  
  /**
   * Déclenche un rafraîchissement immédiat de tous les composants enregistrés
   */
  async function triggerGlobalRefresh(_reason = 'manual') {
    if (isRefreshing.value) return

    isRefreshing.value = true
    
    try {
      // Exécuter tous les callbacks enregistrés
      refreshCallbacks.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Erreur lors du refresh callback:', error)
        }
      })
      
      // Attendre que Vue traite les changements
      await nextTick()
      
      // Déclencher un second refresh après un court délai
      // pour s'assurer que les données RTDB sont complètement synchronisées
      setTimeout(() => {
        refreshCallbacks.forEach(callback => {
          try {
            callback()
          } catch (error) {
            console.error('Erreur lors du refresh callback (delayed):', error)
          }
        })
      }, 100)
      
    } finally {
      setTimeout(() => {
        isRefreshing.value = false
      }, 200)
    }
  }
  
  /**
   * Rafraîchissement spécifique après une action utilisateur
   */
  async function refreshAfterUserAction(actionType: 'create' | 'update' | 'delete') {
    await triggerGlobalRefresh(`user-action-${actionType}`)
  }
  
  /**
   * Rafraîchissement suite à une mise à jour temps réel
   */
  async function refreshFromRealtimeUpdate(source = 'rtdb') {
    await triggerGlobalRefresh(`realtime-${source}`)
  }
  
  return {
    isRefreshing,
    registerRefreshCallback,
    triggerGlobalRefresh,
    refreshAfterUserAction,
    refreshFromRealtimeUpdate
  }
}
