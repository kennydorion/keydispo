/**
 * Script d'activation immédiate du système multi-utilisateur
 * Ce script simule un utilisateur connecté pour tester le système
 */

// Fonction à exécuter dans la console du navigateur
function activateMultiUserDemo() {
  console.log('🚀 Activation du système multi-utilisateur de démonstration...')
  
  try {
    // Importer les services nécessaires
    import('./services/multiUserService.js').then(({ multiUserService }) => {
      console.log('📦 Service multi-utilisateur importé')
      
      // Simuler un utilisateur connecté
      const testUser = {
        uid: 'demo-user-' + Date.now(),
        displayName: 'Utilisateur Démo',
        email: 'demo@keydispo.com'
      }
      
      const tenantId = 'keydispo'
      
      // Initialiser le service
      return multiUserService.init(tenantId, testUser)
    }).then(() => {
      console.log('✅ Système multi-utilisateur activé avec succès !')
      console.log('🔄 Rechargez la page pour voir les changements')
      
      // Optionnel : recharger automatiquement
      setTimeout(() => {
        window.location.reload()
      }, 1000)
      
    }).catch(error => {
      console.error('❌ Erreur lors de l\'activation:', error)
    })
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

// Instructions pour l'utilisateur
console.log(`
🧪 INSTRUCTIONS DE TEST MULTI-UTILISATEUR

1. Ouvrez la console de développement (F12)
2. Exécutez: activateMultiUserDemo()
3. Allez sur la page /semaine
4. Ouvrez plusieurs onglets pour simuler plusieurs utilisateurs

📋 Fonctions disponibles:
- activateMultiUserDemo() : Active le système
- window.multiUserService : Accès direct au service
`)

// Rendre la fonction disponible globalement
window.activateMultiUserDemo = activateMultiUserDemo

export { activateMultiUserDemo }
