/**
 * Script de test simple pour les services collaborateurs
 */

console.log('🔄 Test des services collaborateurs...')

// Import des services depuis le projet
import('./src/services/collaborateursV2.js').then(async ({ CollaborateursServiceV2 }) => {
  try {
    console.log('✅ Service importé avec succès')
    
    const tenantId = 'keydispo'
    
    // Test 1: Charger les collaborateurs existants
    console.log('📋 Test 1: Chargement des collaborateurs existants...')
    const collaborateurs = await CollaborateursServiceV2.loadCollaborateursFromImport(tenantId)
    console.log(`✅ ${collaborateurs.length} collaborateurs chargés`, collaborateurs.slice(0, 3))
    
    // Test 2: Obtenir un collaborateur spécifique
    if (collaborateurs.length > 0) {
      const premierCollab = collaborateurs[0]
      console.log('📋 Test 2: Récupération collaborateur par ID...')
      const collab = await CollaborateursServiceV2.getCollaborateur(tenantId, premierCollab.id)
      console.log('✅ Collaborateur récupéré:', collab)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  }
}).catch(error => {
  console.error('❌ Erreur import service:', error)
})
