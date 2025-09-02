/**
 * Test direct de création de collaborateur
 * À exécuter dans la console du navigateur
 */

// Ce script peut être copié-collé dans la console du navigateur
// pendant que l'application est ouverte

window.testCreateCollaborateur = async function() {
  console.log('🧪 Test de création de collaborateur...')
  
  try {
    // Import du service
    const { CollaborateursServiceV2 } = await import('./src/services/collaborateursV2.js')
    const { auth } = await import('./src/services/firebase.js')
    
    console.log('✅ Services importés')
    console.log('👤 Utilisateur actuel:', auth.currentUser)
    
    if (!auth.currentUser) {
      console.error('❌ Aucun utilisateur connecté')
      return
    }
    
    const testData = {
      nom: 'Test',
      prenom: 'Navigateur',
      email: 'test.navigateur@example.com',
      phone: '+41 79 999 88 77',
      metier: 'Testeur',
      ville: 'Berne',
      tenantId: 'keydispo',
      actif: true
    }
    
    console.log('📝 Tentative de création avec les données:', testData)
    
    const newId = await CollaborateursServiceV2.createCollaborateur(
      'keydispo',
      testData,
      auth.currentUser.uid
    )
    
    console.log('✅ Collaborateur créé avec succès ! ID:', newId)
    
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error)
    console.error('❌ Code:', error?.code)
    console.error('❌ Message:', error?.message)
  }
}

console.log('🔧 Fonction testCreateCollaborateur() prête. Exécutez testCreateCollaborateur() dans la console.')
