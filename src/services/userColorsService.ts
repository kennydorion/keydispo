import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { ref, computed } from 'vue'
import { db } from './firebase'
import { getUserColor } from './avatarUtils'
import { AuthService } from './auth'
import { emergencyOptimization } from './emergencyOptimization'

// Cache des couleurs de tous les utilisateurs
const userColorsCache = ref<Map<string, string>>(new Map())
const isLoading = ref(false)

// Écouteurs actifs pour les préférences utilisateur
const activeListeners = new Map<string, () => void>()

// ⚠️ CACHE LOCAL OPTIMISÉ
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes au lieu de temps réel
const cacheTimestamps = new Map<string, number>()

class UserColorsService {
  /**
   * Récupère la couleur d'un utilisateur (personnalisée ou par défaut)
   */
  static getUserColor(uid: string): string {
    // Vérifier d'abord le cache des couleurs personnalisées
    const customColor = userColorsCache.value.get(uid)
    if (customColor) {
      return customColor
    }
    
    // Sinon utiliser la couleur générée par hash
    return getUserColor(uid)
  }

  /**
   * Écouter les changements de couleur d'un utilisateur spécifique
   * ⚠️ OPTIMISÉ : Mode urgence avec cache local
   */
  static listenToUserColor(uid: string): void {
    // ⚠️ CONTRÔLE D'URGENCE : Désactiver les listeners temps réel
    if (emergencyOptimization.isServiceDisabled('DISABLE_PRESENCE_TRACKING')) {
      console.log('🚨 [EMERGENCY] Listeners couleurs désactivés - Utilisation cache local uniquement')
      // Utiliser directement la couleur par défaut en cache
      this.updateColorCache(uid, getUserColor(uid))
      return
    }

    // ⚠️ LIMITE : Max 3 listeners simultanés
    if (activeListeners.size >= 3) {
      console.warn(`🚨 [UserColors] Limite listeners atteinte (${activeListeners.size}) - Utilisation cache`)
      this.updateColorCache(uid, getUserColor(uid))
      return
    }

    // Vérifier le cache avec TTL
    const cacheTime = cacheTimestamps.get(uid)
    if (cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
      return
    }

    // Éviter les doublons
    if (activeListeners.has(uid)) {
      return
    }

    try {
      // Utiliser la même collection que useUserPreferences pour cohérence
      const userDoc = doc(db, `tenants/${AuthService.currentTenantId}/users/${uid}`)
      
      const unsubscribe = onSnapshot(userDoc, (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          // Les préférences sont stockées dans le champ 'preferences'
          const preferences = data.preferences || {}
          const presenceColor = preferences.presenceColor
          
          if (presenceColor) {
            // Mettre à jour le cache avec TTL
            userColorsCache.value.set(uid, presenceColor)
            cacheTimestamps.set(uid, Date.now())
            console.log(`🎨 Couleur mise à jour pour ${uid}:`, presenceColor)
          } else {
            // Supprimer du cache si plus de couleur personnalisée
            userColorsCache.value.delete(uid)
            cacheTimestamps.delete(uid)
            console.log(`🎨 Couleur par défaut pour ${uid}`)
          }
        } else {
          // Document n'existe pas, supprimer du cache
          userColorsCache.value.delete(uid)
          cacheTimestamps.delete(uid)
        }
      }, (error) => {
        console.error(`❌ Erreur écouteur couleur pour ${uid}:`, error)
      })

      // Stocker la fonction de désabonnement
      activeListeners.set(uid, unsubscribe)
      
    } catch (error) {
      console.error(`❌ Erreur création écouteur pour ${uid}:`, error)
    }
  }

  /**
   * Arrêter l'écoute d'un utilisateur
   */
  static stopListeningToUser(uid: string): void {
    const unsubscribe = activeListeners.get(uid)
    if (unsubscribe) {
      unsubscribe()
      activeListeners.delete(uid)
      // ⚠️ GARDER le cache plus longtemps pour éviter les re-lectures
      console.log(`🔇 Arrêt écoute couleur pour ${uid} (cache conservé)`)
    }
  }

  /**
   * Écouter les couleurs de plusieurs utilisateurs
   * ⚠️ OPTIMISÉ : Limite stricte et mode cache
   */
  static listenToMultipleUsers(userIds: string[]): void {
    // ⚠️ LIMITE STRICTE : Max 3 utilisateurs en mode urgence
    const maxUsers = emergencyOptimization.isServiceDisabled('DISABLE_PRESENCE_TRACKING') ? 0 : 3
    const limitedUserIds = userIds.slice(0, maxUsers)
    
    if (limitedUserIds.length < userIds.length) {
      console.warn(`🚨 [UserColors] Limitation ${limitedUserIds.length}/${userIds.length} utilisateurs`)
      
      // Mettre en cache les couleurs par défaut pour les utilisateurs non-écoutés
      userIds.slice(maxUsers).forEach(uid => {
        if (uid && uid.trim()) {
          this.updateColorCache(uid, getUserColor(uid))
        }
      })
    }
    
    limitedUserIds.forEach(uid => {
      if (uid && uid.trim()) {
        this.listenToUserColor(uid)
      }
    })
  }

  /**
   * Récupérer immédiatement la couleur d'un utilisateur (sans écoute)
   * ⚠️ OPTIMISÉ : Cache local avec TTL
   */
  static async fetchUserColor(uid: string): Promise<string> {
    try {
      // Vérifier le cache avec TTL
      const cachedColor = userColorsCache.value.get(uid)
      const cacheTime = cacheTimestamps.get(uid)
      
      if (cachedColor && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
        return cachedColor
      }

      // ⚠️ CONTRÔLE D'URGENCE
      if (!emergencyOptimization.canPerformFirestoreRead()) {
        console.warn(`🚨 [EMERGENCY] Lecture bloquée pour ${uid} - Utilisation couleur par défaut`)
        const defaultColor = getUserColor(uid)
        this.updateColorCache(uid, defaultColor)
        return defaultColor
      }

      // Récupérer depuis Firestore (même collection que useUserPreferences)
      const userDoc = doc(db, `tenants/${AuthService.currentTenantId}/users/${uid}`)
      const docSnap = await getDoc(userDoc)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        const preferences = data.preferences || {}
        const presenceColor = preferences.presenceColor
        
        if (presenceColor) {
          // Mettre en cache avec timestamp
          userColorsCache.value.set(uid, presenceColor)
          cacheTimestamps.set(uid, Date.now())
          return presenceColor
        }
      }
      
      // Retourner la couleur par défaut et la mettre en cache
      const defaultColor = getUserColor(uid)
      this.updateColorCache(uid, defaultColor)
      return defaultColor
      
    } catch (error) {
      console.error(`❌ Erreur récupération couleur pour ${uid}:`, error)
      const defaultColor = getUserColor(uid)
      this.updateColorCache(uid, defaultColor)
      return defaultColor
    }
  }

  /**
   * Nettoyer tous les écouteurs
   */
  static cleanup(): void {
    activeListeners.forEach((unsubscribe, uid) => {
      unsubscribe()
      console.log(`🔇 Nettoyage écouteur couleur pour ${uid}`)
    })
    activeListeners.clear()
    // ⚠️ NE PAS vider le cache pour éviter les re-lectures
    console.log(`🧹 Nettoyage UserColors terminé - Cache conservé (${userColorsCache.value.size} entrées)`)
  }

  /**
   * Obtenir le cache complet des couleurs
   */
  static getColorsCache(): Map<string, string> {
    return userColorsCache.value
  }

  /**
   * Forcer la mise à jour d'une couleur dans le cache
   */
  static updateColorCache(uid: string, color: string): void {
    userColorsCache.value.set(uid, color)
    cacheTimestamps.set(uid, Date.now())
    console.log(`🎨 Couleur forcée dans le cache pour ${uid}:`, color)
  }

  /**
   * Vérifier si une couleur est en cache
   */
  static hasColorInCache(uid: string): boolean {
    return userColorsCache.value.has(uid)
  }
}

// Computed pour exposer l'état réactif
export const useUserColors = () => {
  return {
    userColorsCache: computed(() => userColorsCache.value),
    isLoading: computed(() => isLoading.value),
    getUserColor: UserColorsService.getUserColor,
    listenToUserColor: UserColorsService.listenToUserColor,
    listenToMultipleUsers: UserColorsService.listenToMultipleUsers,
    fetchUserColor: UserColorsService.fetchUserColor,
    stopListeningToUser: UserColorsService.stopListeningToUser,
    cleanup: UserColorsService.cleanup,
    updateColorCache: UserColorsService.updateColorCache,
    hasColorInCache: UserColorsService.hasColorInCache
  }
}

export default UserColorsService
export { UserColorsService }
