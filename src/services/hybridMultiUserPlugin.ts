/**
 * Plugin Vue 3 pour le service hybride multi-utilisateur
 * 
 * Auto-initialise le service hybride optimisé quand l'utilisateur se connecte
 * Utilise l'architecture recommandée Firebase :
 * - Firestore : Données persistantes (sessions, historique)
 * - Realtime Database : États éphémères (présence, survols, locks temporaires)
 */

import type { App } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'
import { hybridMultiUserService } from '@/services/hybridMultiUserService'
import { AuthService } from '@/services/auth'

let isInitialized = false

export const hybridMultiUserPlugin = {
  install(_app: App) {

    
    if (isInitialized) {
      console.warn('⚠️ Plugin hybride déjà initialisé')
      return
    }
    
    // Écouter les changements d'authentification
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {

          
          // Récupérer le tenant de l'utilisateur
          let tenantId = 'keyplacement' // Default pour le moment
          
          try {
            const userRole = await AuthService.getUserRole(user.uid)
            if (userRole) {

            }
          } catch (error) {
            console.warn('⚠️ Erreur récupération rôle utilisateur:', error)
          }
          
          // Initialiser le service hybride
          await hybridMultiUserService.init(tenantId, {
            uid: user.uid,
            displayName: user.displayName || undefined,
            email: user.email || undefined
          })
          

          
          // Logs de diagnostic
          setTimeout(() => {
            hybridMultiUserService.getStats()

          }, 2000)
          
        } catch (error) {
          console.error('❌ Erreur lors de l\'initialisation du service hybride:', error)
        }
      } else {

        
        try {
          await hybridMultiUserService.destroy()

        } catch (error) {
          console.error('❌ Erreur lors de l\'arrêt du service hybride:', error)
        }
      }
    })
    
    isInitialized = true

  }
}

// Export fonction d'installation pour main.ts
export function installHybridMultiUserSystem(app: App) {
  app.use(hybridMultiUserPlugin)
}

export default hybridMultiUserPlugin
