import { EMERGENCY_FIRESTORE_CONFIG, isFeatureDisabled } from '../config/emergencyConfig'

/**
 * MIDDLEWARE D'URGENCE FIRESTORE
 * Désactive temporairement les fonctionnalités coûteuses
 */
export class EmergencyFirestoreMiddleware {
  private static instance: EmergencyFirestoreMiddleware
  private disabledFeatures: Set<string> = new Set()

  static getInstance(): EmergencyFirestoreMiddleware {
    if (!this.instance) {
      this.instance = new EmergencyFirestoreMiddleware()
    }
    return this.instance
  }

  /**
   * Vérifier si un listener peut être créé
   */
  canCreateListener(listenerType: string): boolean {
    // Vérifier la configuration d'urgence
    switch (listenerType) {
      case 'cellActivities':
        return !isFeatureDisabled('DISABLE_REALTIME_CELL_ACTIVITIES')
      case 'presence':
        return !isFeatureDisabled('DISABLE_REALTIME_PRESENCE')
      case 'sessions':
        return !isFeatureDisabled('DISABLE_DETAILED_SESSIONS')
      default:
        return true
    }
  }

  /**
   * Loguer les opérations bloquées
   */
  logBlockedOperation(operation: string, reason: string) {
    console.warn(`🚫 [URGENCE] ${operation} bloqué: ${reason}`)
  }

  /**
   * Wrapper sécurisé pour les listeners Firestore
   */
  safeCreateListener<T>(
    listenerType: string,
    createListener: () => T,
    fallback?: () => void
  ): T | null {
    if (this.canCreateListener(listenerType)) {
      try {
        return createListener()
      } catch (error) {
        console.error(`❌ Erreur création listener ${listenerType}:`, error)
        return null
      }
    } else {
      this.logBlockedOperation(
        `Listener ${listenerType}`,
        'Désactivé pour économiser Firestore'
      )
      if (fallback) {
        fallback()
      }
      return null
    }
  }

  /**
   * Désactiver temporairement une fonctionnalité
   */
  disableFeature(feature: string, duration?: number) {
    this.disabledFeatures.add(feature)
    console.warn(`🚫 Fonctionnalité ${feature} désactivée temporairement`)
    
    if (duration) {
      setTimeout(() => {
        this.enableFeature(feature)
      }, duration)
    }
  }

  /**
   * Réactiver une fonctionnalité
   */
  enableFeature(feature: string) {
    this.disabledFeatures.delete(feature)
    console.log(`✅ Fonctionnalité ${feature} réactivée`)
  }

  /**
   * Vérifier si une fonctionnalité est désactivée
   */
  isFeatureDisabled(feature: string): boolean {
    return this.disabledFeatures.has(feature)
  }

  /**
   * Activer le mode d'urgence complet
   */
  enableEmergencyMode() {
    console.warn('🚨 MODE D\'URGENCE FIRESTORE ACTIVÉ')
    
    // Désactiver toutes les fonctionnalités non critiques
    this.disableFeature('cellActivities')
    this.disableFeature('presence')
    this.disableFeature('detailedSessions')
    this.disableFeature('realTimeSync')
    
    // Afficher les conseils
    console.log(`
🔧 MODE D'URGENCE ACTIVÉ - Actions recommandées:
1. Recharger uniquement si nécessaire
2. Éviter les navigations rapides
3. Fermer les onglets inutiles
4. Les données s'afficheront en mode simplifié
    `)
  }

  /**
   * Désactiver le mode d'urgence
   */
  disableEmergencyMode() {
    console.log('✅ Mode d\'urgence Firestore désactivé')
    this.disabledFeatures.clear()
  }
}

// Instance globale
export const emergencyMiddleware = EmergencyFirestoreMiddleware.getInstance()

// Activer automatiquement en mode développement si besoin
if (EMERGENCY_FIRESTORE_CONFIG.ENABLE_READ_TRACKING) {
  console.log('🔍 Audit Firestore activé - Surveillez la console')
}
