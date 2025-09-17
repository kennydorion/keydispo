/**
 * Plugin d'initialisation du système multi-utilisateur unifié
 * Ce plugin démarre automatiquement tous les services multi-utilisateur
 */

import type { App } from 'vue'
import { multiUserService } from './multiUserService'
import { hybridMultiUserService } from './hybridMultiUserService'
import { auth } from './firebase'
import { AuthService } from './auth'
import { onAuthStateChanged } from 'firebase/auth'

// Variables pour éviter les initialisations multiples
let isPluginInstalled = false
let lastInitializedUserId: string | null = null

export function installMultiUserSystem(app: App) {
  if (isPluginInstalled) {
    console.warn('⚠️ Plugin multi-utilisateur déjà installé')
    return
  }
  
  console.log('🚀 Initialisation du système multi-utilisateur unifié...')
  isPluginInstalled = true
  
  // Initialiser le service quand l'utilisateur est connecté
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Éviter la ré-initialisation pour le même utilisateur
      if (lastInitializedUserId === user.uid) {
        console.log('👤 Utilisateur déjà initialisé, ignoré')
        return
      }
      
      console.log('👤 Utilisateur connecté, vérification du rôle...')
      
      try {
        // Attendre un petit délai pour permettre aux vérifications de rôle 
        // dans les composants de s'exécuter (ex: CollaborateurLogin.vue)
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Vérifier si l'utilisateur est toujours connecté après le délai
        if (!auth.currentUser) {
          console.log('👤 Utilisateur déconnecté pendant la vérification du rôle')
          return
        }
        
        // Vérifier le rôle de l'utilisateur
        const userRole = await AuthService.getUserRole(user.uid)
        
        // Le système multi-utilisateur n'est nécessaire que pour les admins et éditeurs
        // Les simples "viewer" n'ont pas besoin des fonctionnalités collaboratives avancées
        if (userRole?.role === 'viewer') {
          console.log('👥 Utilisateur avec rôle "viewer" détecté, système multi-utilisateur désactivé')
          return
        }
        
        // Si pas de rôle trouvé, probablement pas un membre du tenant
        if (!userRole) {
          console.log('❓ Aucun rôle trouvé, système multi-utilisateur désactivé')
          return
        }
        
        console.log(`👤 Utilisateur ${userRole.role} détecté, démarrage du système multi-utilisateur`)
        
        // Obtenir le tenantId depuis la configuration
        const tenantId = AuthService.currentTenantId || 'keydispo'
        
        // Démarrer le service principal RTDB
        await multiUserService.startSession(
          user.uid,
          user.displayName || user.email || 'Utilisateur',
          user.email || '',
          tenantId
        )
        
        // Démarrer AUSSI le service hybride pour la compatibilité
        try {
          await hybridMultiUserService.init(tenantId, {
            userId: user.uid,
            userName: user.displayName || user.email || 'Utilisateur',
            userEmail: user.email || 'user@keydispo.com'
          })
          console.log('✅ Service hybride multi-utilisateur démarré')
        } catch (error) {
          console.warn('⚠️ Service hybride ignoré:', error)
        }
        
        // Marquer cet utilisateur comme initialisé
        lastInitializedUserId = user.uid
        console.log('✅ Système multi-utilisateur démarré avec succès')
      } catch (error: any) {
        console.warn('⚠️ Erreur lors du démarrage du système multi-utilisateur (sera ignorée):', error)
      }
    } else {
      console.log('👤 Utilisateur déconnecté, arrêt du système multi-utilisateur')
      lastInitializedUserId = null
      try {
        // Indiquer une raison de signout pour éviter des écritures pendant teardown
        multiUserService.setShutdownReason('signout')
      } catch {}
      await multiUserService.endSession()
      
      // Arrêter aussi le service hybride
      try {
        await hybridMultiUserService.cleanup()
      } catch (error) {
        console.warn('⚠️ Erreur arrêt service hybride:', error)
      }
    }
  })
  
  // Ajouter le service aux propriétés globales si nécessaire
  app.config.globalProperties.$multiUserService = multiUserService
  
  console.log('✅ Plugin système multi-utilisateur installé')
}

export default {
  install: installMultiUserSystem
}
