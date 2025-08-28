/**
 * Plugin d'initialisation du système multi-utilisateur unifié
 * Ce plugin démarre automatiquement tous les services multi-utilisateur
 */

import type { App } from 'vue'
import { multiUserService } from './multiUserService'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

export function installMultiUserSystem(app: App) {
  console.log('🚀 Initialisation du système multi-utilisateur unifié...')
  
  // Initialiser le service quand l'utilisateur est connecté
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('👤 Utilisateur connecté, démarrage du système multi-utilisateur')
      
      // Obtenir le tenantId (vous devrez l'adapter selon votre logique)
      const tenantId = 'keydispo' // À remplacer par la vraie logique
      
      // Démarrer le service
      multiUserService.init(tenantId, {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Utilisateur',
        email: user.email || ''
      }).then(() => {
        console.log('✅ Système multi-utilisateur démarré avec succès')
      }).catch((error: any) => {
        console.error('❌ Erreur lors du démarrage du système multi-utilisateur:', error)
      })
    } else {
      console.log('👤 Utilisateur déconnecté, arrêt du système multi-utilisateur')
      multiUserService.destroy()
    }
  })
  
  // Ajouter le service aux propriétés globales si nécessaire
  app.config.globalProperties.$multiUserService = multiUserService
  
  console.log('✅ Plugin système multi-utilisateur installé')
}

export default {
  install: installMultiUserSystem
}
