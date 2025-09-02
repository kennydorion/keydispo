/**
 * SERVICE D'URGENCE - DÉSACTIVATION TEMPORAIRE
 * Permet de désactiver rapidement les services les plus gourmands
 * en cas de pic de consommation
 */

export class EmergencyOptimizationService {
  private static instance: EmergencyOptimizationService
  
  // Flags d'urgence pour désactiver des fonctionnalités
  public static EMERGENCY_MODE = {
    DISABLE_PRESENCE_TRACKING: true,     // Désactiver le tracking de présence
    DISABLE_CELL_STATE_SYNC: true,       // Désactiver la sync des états de cellules
    DISABLE_AUTO_CLEANUP: true,          // Désactiver le nettoyage automatique
    DISABLE_REALTIME_STATS: true,        // Désactiver les stats temps réel
    REDUCE_LISTENER_COUNT: true,         // Réduire le nombre de listeners
    FORCE_CACHE_MODE: true               // Forcer l'utilisation du cache
  }
  
  // Limites d'urgence
  public static EMERGENCY_LIMITS = {
    MAX_FIRESTORE_READS_PER_MINUTE: 100,   // Limite absolue de lectures/minute
    MAX_CONCURRENT_LISTENERS: 3,           // Max listeners simultanés
    MAX_DOCS_PER_QUERY: 20,               // Max documents par requête
    CACHE_TTL_SECONDS: 30,                // TTL cache ultra-court
    MAX_SESSIONS_TO_CLEANUP: 10           // Max sessions à nettoyer d'un coup
  }
  
  // Compteurs de surveillance
  private readCountThisMinute = 0
  private lastMinuteReset = Date.now()
  private activeListenersCount = 0
  
  static getInstance(): EmergencyOptimizationService {
    if (!this.instance) {
      this.instance = new EmergencyOptimizationService()
    }
    return this.instance
  }
  
  /**
   * Vérifier si on peut effectuer une lecture Firestore
   */
  canPerformFirestoreRead(): boolean {
    this.resetCounterIfNeeded()
    
    if (this.readCountThisMinute >= EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_FIRESTORE_READS_PER_MINUTE) {
      console.warn(`🚨 LIMITE ATTEINTE: ${this.readCountThisMinute} lectures/minute`)
      return false
    }
    
    this.readCountThisMinute++
    return true
  }
  
  /**
   * Vérifier si on peut créer un nouveau listener
   */
  canCreateListener(): boolean {
    if (this.activeListenersCount >= EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_CONCURRENT_LISTENERS) {
      console.warn(`🚨 LIMITE LISTENERS: ${this.activeListenersCount} actifs`)
      return false
    }
    
    this.activeListenersCount++
    return true
  }
  
  /**
   * Notifier qu'un listener a été fermé
   */
  notifyListenerClosed(): void {
    this.activeListenersCount = Math.max(0, this.activeListenersCount - 1)
  }
  
  /**
   * Obtenir la limite de documents pour une requête
   */
  getDocumentLimit(): number {
    return EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_DOCS_PER_QUERY
  }
  
  /**
   * Obtenir le TTL du cache d'urgence
   */
  getCacheTTL(): number {
    return EmergencyOptimizationService.EMERGENCY_LIMITS.CACHE_TTL_SECONDS * 1000
  }
  
  /**
   * Vérifier si un service doit être désactivé
   */
  isServiceDisabled(service: keyof typeof EmergencyOptimizationService.EMERGENCY_MODE): boolean {
    return EmergencyOptimizationService.EMERGENCY_MODE[service]
  }
  
  /**
   * Reset du compteur à chaque minute
   */
  private resetCounterIfNeeded(): void {
    const now = Date.now()
    if (now - this.lastMinuteReset >= 60000) { // 1 minute
      this.readCountThisMinute = 0
      this.lastMinuteReset = now
      console.log(`📊 Reset compteur lectures: ${this.activeListenersCount} listeners actifs`)
    }
  }
  
  /**
   * Obtenir les statistiques actuelles
   */
  getStats() {
    this.resetCounterIfNeeded()
    return {
      readsThisMinute: this.readCountThisMinute,
      maxReadsPerMinute: EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_FIRESTORE_READS_PER_MINUTE,
      activeListeners: this.activeListenersCount,
      maxListeners: EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_CONCURRENT_LISTENERS,
      emergencyModeActive: Object.values(EmergencyOptimizationService.EMERGENCY_MODE).some(Boolean)
    }
  }
  
  /**
   * Mode d'urgence totale - désactiver tout sauf l'essentiel
   */
  activateFullEmergencyMode(): void {
    console.warn('🚨🚨🚨 ACTIVATION MODE D\'URGENCE TOTALE 🚨🚨🚨')
    
    EmergencyOptimizationService.EMERGENCY_MODE = {
      DISABLE_PRESENCE_TRACKING: true,
      DISABLE_CELL_STATE_SYNC: true,
      DISABLE_AUTO_CLEANUP: true,
      DISABLE_REALTIME_STATS: true,
      REDUCE_LISTENER_COUNT: true,
      FORCE_CACHE_MODE: true
    }
    
    EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_FIRESTORE_READS_PER_MINUTE = 50
    EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_CONCURRENT_LISTENERS = 2
    EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_DOCS_PER_QUERY = 10
  }
  
  /**
   * Désactiver le mode d'urgence
   */
  deactivateEmergencyMode(): void {
    console.log('✅ Désactivation du mode d\'urgence')
    
    EmergencyOptimizationService.EMERGENCY_MODE = {
      DISABLE_PRESENCE_TRACKING: false,
      DISABLE_CELL_STATE_SYNC: false,
      DISABLE_AUTO_CLEANUP: false,
      DISABLE_REALTIME_STATS: false,
      REDUCE_LISTENER_COUNT: false,
      FORCE_CACHE_MODE: false
    }
    
    EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_FIRESTORE_READS_PER_MINUTE = 200
    EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_CONCURRENT_LISTENERS = 5
    EmergencyOptimizationService.EMERGENCY_LIMITS.MAX_DOCS_PER_QUERY = 50
  }
}

// Instance globale
export const emergencyOptimization = EmergencyOptimizationService.getInstance()

// Export des flags pour usage direct
export const EMERGENCY_FLAGS = EmergencyOptimizationService.EMERGENCY_MODE
export const EMERGENCY_LIMITS = EmergencyOptimizationService.EMERGENCY_LIMITS
