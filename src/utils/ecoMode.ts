/**
 * 🔋 Mode Développement Économique
 * 
 * Ce module permet d'activer un mode économique pendant le développement
 * qui réduit la consommation de ressources et améliore les performances.
 */

export const ECO_MODE = import.meta.env.DEV // Actif en mode développement

export const ECO_CONFIG = {
  // Réduire les fréquences de mise à jour
  HEARTBEAT_INTERVAL: ECO_MODE ? 2 * 60 * 1000 : 60 * 1000, // 2 min en éco, 1 min normal
  CLEANUP_INTERVAL: ECO_MODE ? 5 * 60 * 1000 : 2 * 60 * 1000, // 5 min en éco, 2 min normal
  
  // Limiter les données chargées
  MAX_SESSIONS: ECO_MODE ? 5 : 20,           // 5 sessions max en éco
  MAX_ACTIVITIES: ECO_MODE ? 10 : 50,        // 10 activités max en éco
  
  // Cache plus agressif
  CACHE_DURATION: ECO_MODE ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10 min en éco, 5 min normal
  
  // Fonctionnalités optionnelles désactivées
  DISABLE_PRESENCE_TRACKING: ECO_MODE,       // Désactiver le tracking en éco
  DISABLE_DETAILED_LOGS: ECO_MODE,           // Réduire les logs en éco
  DISABLE_ANIMATIONS: ECO_MODE,              // Désactiver animations en éco
  
  // Optimisations réseau
  BATCH_REQUESTS: ECO_MODE,                  // Grouper les requêtes en éco
  DEBOUNCE_DELAY: ECO_MODE ? 500 : 200,      // Débounce plus long en éco
}

/**
 * Logger optimisé pour le mode éco
 */
export const ecoLog = ECO_CONFIG.DISABLE_DETAILED_LOGS 
  ? () => {} // No-op en mode éco
  : console.log

/**
 * Fonction utilitaire pour adapter les configurations
 */
export function getOptimizedConfig<T>(normalConfig: T, ecoConfig: Partial<T>): T {
  return ECO_MODE ? { ...normalConfig, ...ecoConfig } : normalConfig
}

/**
 * Hook pour conditions économiques
 */
export function useEcoMode() {
  return {
    isEcoMode: ECO_MODE,
    config: ECO_CONFIG,
    log: ecoLog,
    getOptimizedConfig
  }
}

if (ECO_MODE) {
  console.log('🔋 Mode développement économique activé')
  console.log('   - Heartbeat: 2 min')
  console.log('   - Sessions limitées: 5')  
  console.log('   - Cache: 10 min')
  console.log('   - Tracking présence: désactivé')
}
