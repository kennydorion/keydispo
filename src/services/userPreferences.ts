import { ref as rtdbRef, get, set, update } from 'firebase/database'
import { ref, computed } from 'vue'
import { rtdb } from './firebase'
import { AuthService } from './auth'

export interface UserPreferences {
  presenceColor?: string
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat?: '24h' | '12h'
  language?: 'fr' | 'en' | 'es'
  darkMode?: boolean
  notifications?: {
    newAvailabilities?: boolean
    modifications?: boolean
    dailyReminders?: boolean
  }
}

const defaultPreferences: UserPreferences = {
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  language: 'fr',
  darkMode: false,
  notifications: {
    newAvailabilities: true,
    modifications: true,
    dailyReminders: false
  }
}

// État réactif global des préférences
const userPreferences = ref<UserPreferences>({ ...defaultPreferences })
const isLoading = ref(false)

// Cache des préférences pour éviter les requêtes répétées
const preferencesCache = new Map<string, { 
  preferences: UserPreferences, 
  timestamp: number 
}>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Callbacks pour notifier les changements
const changeCallbacks = new Set<(preferences: UserPreferences) => void>()

// Helper pour notifier les changements
function notifyPreferencesChange() {
  changeCallbacks.forEach(callback => {
    try {
      callback(userPreferences.value)
    } catch (error) {
      console.error('❌ Erreur dans callback préférences:', error)
    }
  })
  
  // Déclencher aussi un événement global pour les composants qui ne sont pas abonnés
  const event = new CustomEvent('globalPreferencesChanged', {
    detail: { preferences: userPreferences.value }
  })
  document.dispatchEvent(event)
}

export class UserPreferencesService {
  
  /**
   * Charger les préférences utilisateur depuis RTDB (avec cache)
   */
  static async loadUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      isLoading.value = true
      
      // Vérifier le cache d'abord
      const cacheKey = `${AuthService.currentTenantId}_${userId}`
      const cached = preferencesCache.get(cacheKey)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        userPreferences.value = cached.preferences
        notifyPreferencesChange()
        return cached.preferences
      }
      
      if (!AuthService.currentTenantId) {
        console.warn('⚠️ Pas de tenantId disponible pour charger les préférences')
        userPreferences.value = { ...defaultPreferences }
        return userPreferences.value
      }
      
      const userRef = rtdbRef(rtdb, `tenants/${AuthService.currentTenantId}/users/${userId}`)
      const snapshot = await get(userRef)
      
      if (snapshot.exists()) {
        const userData = snapshot.val()
        const preferences = userData.preferences || {}
        
        // Merger avec les préférences par défaut
        const mergedPreferences = {
          ...defaultPreferences,
          ...preferences,
          notifications: {
            ...defaultPreferences.notifications,
            ...(preferences.notifications || {})
          }
        }
        
        // Mettre en cache
        preferencesCache.set(cacheKey, {
          preferences: mergedPreferences,
          timestamp: now
        })
        
        userPreferences.value = mergedPreferences
        notifyPreferencesChange()
        return mergedPreferences
      } else {
        // Document n'existe pas, créer avec les préférences par défaut
        console.log('📝 Création du document utilisateur avec préférences par défaut')
        await UserPreferencesService.initializeUserDocument(userId)
        userPreferences.value = { ...defaultPreferences }
        notifyPreferencesChange()
        return userPreferences.value
      }
      
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des préférences:', error)
      
      // Si erreur de permission, essayer de créer le document utilisateur
      if (error?.code === 'permission-denied') {
        console.log('🔐 Erreur de permission, tentative de création du document utilisateur')
        try {
          await UserPreferencesService.initializeUserDocument(userId)
          userPreferences.value = { ...defaultPreferences }
          notifyPreferencesChange()
          return userPreferences.value
        } catch (initError) {
          console.error('❌ Erreur lors de l\'initialisation du document utilisateur:', initError)
        }
      }
      
      userPreferences.value = { ...defaultPreferences }
      notifyPreferencesChange()
      return userPreferences.value
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Initialiser le document utilisateur avec les données de base
   */
  private static async initializeUserDocument(userId: string): Promise<void> {
    if (!AuthService.currentTenantId) return
    
    try {
      const userRef = rtdbRef(rtdb, `tenants/${AuthService.currentTenantId}/users/${userId}`)
      await set(userRef, {
        preferences: defaultPreferences,
        role: 'viewer', // Rôle par défaut
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      console.log('✅ Document utilisateur initialisé')
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du document utilisateur:', error)
      throw error
    }
  }

  /**
   * Sauvegarder les préférences utilisateur dans RTDB
   */
  static async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const userRef = rtdbRef(rtdb, `tenants/${AuthService.currentTenantId}/users/${userId}`)
      
      // Merger avec les préférences existantes
      const updatedPreferences = {
        ...userPreferences.value,
        ...preferences,
        notifications: {
          ...userPreferences.value.notifications,
          ...(preferences.notifications || {})
        }
      }
      
      // Mettre à jour l'état local immédiatement
      userPreferences.value = updatedPreferences
      
      // Invalider le cache pour forcer un rechargement
      const cacheKey = `${AuthService.currentTenantId}_${userId}`
      preferencesCache.delete(cacheKey)
      
      // Notifier les changements
      notifyPreferencesChange()
      
      await update(userRef, { 
        preferences: updatedPreferences,
        updatedAt: new Date().toISOString()
      })
      
      console.log('✅ Préférences sauvegardées')
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des préférences:', error)
      throw error
    }
  }

  /**
   * Mettre à jour uniquement la couleur de présence (optimiste)
   */
  static async updatePresenceColor(userId: string, color: string): Promise<void> {
    try {
      console.log(`🎨 [UserPreferencesService] updatePresenceColor called:`, {
        userId,
        color,
        currentTenantId: AuthService.currentTenantId
      })
      
      // 1. Mise à jour immédiate de l'état local (optimiste)
      userPreferences.value = {
        ...userPreferences.value,
        presenceColor: color
      }
      
      // 2. Notifier immédiatement le changement
      notifyPreferencesChange()
      
      console.log(`🎨 Couleur de présence mise à jour localement: ${color}`)
      
      // 3. Sauvegarder en arrière-plan avec la structure complète
      if (AuthService.currentTenantId) {
        const userRef = rtdbRef(rtdb, `tenants/${AuthService.currentTenantId}/users/${userId}`)
        
        console.log(`🔥 [RTDB] Tentative de sauvegarde vers:`, userRef.toString())
        
        // Récupérer les préférences actuelles et les mettre à jour
        const updatedPreferences = {
          ...userPreferences.value,
          presenceColor: color
        }
        
        console.log(`📝 [RTDB] Données à sauvegarder:`, {
          preferences: updatedPreferences,
          updatedAt: new Date().toISOString()
        })
        
        await update(userRef, {
          preferences: updatedPreferences,
          updatedAt: new Date().toISOString()
        })
        
        console.log(`✅ [RTDB] Couleur sauvegardée avec succès:`, color)
      } else {
        console.warn(`⚠️ [UserPreferencesService] Pas de tenantId disponible pour sauvegarder`)
      }
      
    } catch (error: any) {
      console.error('❌ [UserPreferencesService] Erreur lors de la mise à jour de la couleur de présence:', error)
      console.error('❌ [Error Details]:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      })
      // En cas d'erreur, on garde le changement local pour une meilleure UX
    }
  }

  /**
   * Obtenir la couleur de présence personnalisée (si définie)
   */
  static getPresenceColor(): string | null {
    return userPreferences.value.presenceColor || null
  }

  /**
   * Composables pour Vue
   */
  static useUserPreferences() {
    return {
      preferences: computed(() => userPreferences.value),
      isLoading: computed(() => isLoading.value),
      presenceColor: computed(() => userPreferences.value.presenceColor || '#3b82f6'),
      loadPreferences: UserPreferencesService.loadUserPreferences,
      savePreferences: UserPreferencesService.saveUserPreferences,
      updatePresenceColor: UserPreferencesService.updatePresenceColor
    }
  }

  /**
   * S'abonner aux changements de préférences
   */
  static onPreferencesChange(callback: (preferences: UserPreferences) => void): () => void {
    changeCallbacks.add(callback)
    
    // Appel initial avec les préférences actuelles
    callback(userPreferences.value)
    
    // Retourner une fonction de désabonnement
    return () => {
      changeCallbacks.delete(callback)
    }
  }

  /**
   * Forcer la notification des changements (utile pour debug)
   */
  static notifyChange() {
    notifyPreferencesChange()
  }

  /**
   * Couleurs prédéfinies pour la présence
   */
  static getAvailableColors(): Array<{ name: string; value: string; description: string }> {
    return [
      { name: 'Bleu', value: '#3b82f6', description: 'Couleur par défaut' },
      { name: 'Rouge', value: '#ef4444', description: 'Rouge vif' },
      { name: 'Vert', value: '#10b981', description: 'Vert émeraude' },
      { name: 'Orange', value: '#f59e0b', description: 'Orange ambré' },
      { name: 'Violet', value: '#8b5cf6', description: 'Violet moderne' },
      { name: 'Cyan', value: '#06b6d4', description: 'Cyan professionnel' },
      { name: 'Rose', value: '#ec4899', description: 'Rose dynamique' },
      { name: 'Indigo', value: '#6366f1', description: 'Indigo élégant' },
      { name: 'Lime', value: '#84cc16', description: 'Vert lime' },
      { name: 'Teal', value: '#14b8a6', description: 'Turquoise' }
    ]
  }

  /**
   * Réinitialiser les préférences aux valeurs par défaut
   */
  static async resetToDefaults(userId: string): Promise<void> {
    try {
      await this.saveUserPreferences(userId, defaultPreferences)
    } catch (error) {
      console.error('Erreur lors de la réinitialisation des préférences:', error)
      throw error
    }
  }
}

// Export du service et des composables
export const useUserPreferences = UserPreferencesService.useUserPreferences
export default UserPreferencesService
