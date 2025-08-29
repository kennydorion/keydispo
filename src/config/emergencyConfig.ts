/**
 * CONFIGURATION D'URGENCE - ÉCONOMIE FIRESTORE
 * Active/désactive des fonctionnalités pour réduire la consommation
 */

export const EMERGENCY_FIRESTORE_CONFIG = {
  // Activer l'audit des lectures
  ENABLE_READ_TRACKING: true,
  
  // Limitations de requêtes
  MAX_DISPONIBILITES_PER_QUERY: 150,
  MAX_SESSIONS_PER_QUERY: 15,
  MAX_ACTIVITIES_PER_QUERY: 20,
  
  // Désactiver des fonctionnalités coûteuses
  DISABLE_REALTIME_CELL_ACTIVITIES: true,
  DISABLE_REALTIME_PRESENCE: false,
  DISABLE_DETAILED_SESSIONS: true,
  
  // Migration RTDB
  USE_RTDB_FOR_SESSIONS: true,
  USE_RTDB_FOR_ACTIVITIES: true,
  USE_RTDB_FOR_PRESENCE: true,
  
  // Cache et optimisations
  ENABLE_LOCAL_CACHE: true,
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  
  // Debugging
  LOG_ALL_FIRESTORE_OPERATIONS: true,
  ALERT_ON_HIGH_READS: 500, // Alerte si > 500 lectures
}

/**
 * Helper pour vérifier si une fonctionnalité doit être désactivée
 */
export function isFeatureDisabled(feature: keyof typeof EMERGENCY_FIRESTORE_CONFIG): boolean {
  return EMERGENCY_FIRESTORE_CONFIG[feature] === true
}

/**
 * Helper pour obtenir une limite de requête
 */
export function getQueryLimit(type: 'disponibilites' | 'sessions' | 'activities'): number {
  switch (type) {
    case 'disponibilites':
      return EMERGENCY_FIRESTORE_CONFIG.MAX_DISPONIBILITES_PER_QUERY
    case 'sessions':
      return EMERGENCY_FIRESTORE_CONFIG.MAX_SESSIONS_PER_QUERY
    case 'activities':
      return EMERGENCY_FIRESTORE_CONFIG.MAX_ACTIVITIES_PER_QUERY
    default:
      return 50
  }
}

/**
 * Logger spécialisé pour l'audit Firestore
 */
export function logFirestoreOperation(operation: string, collection: string, count: number) {
  if (EMERGENCY_FIRESTORE_CONFIG.LOG_ALL_FIRESTORE_OPERATIONS) {
    console.log(`🔥 [${operation}] ${collection}: ${count} lectures`)
  }
  
  if (count > EMERGENCY_FIRESTORE_CONFIG.ALERT_ON_HIGH_READS) {
    console.warn(`🚨 ATTENTION: ${operation} sur ${collection} a lu ${count} documents!`)
  }
}
