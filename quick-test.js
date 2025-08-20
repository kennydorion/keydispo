// Test de connectivité simple à l'émulateur
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Configuration pour l'émulateur
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const app = initializeApp({ projectId: 'keydispo-dev' });
const db = getFirestore(app);

async function quickTest() {
  console.log('🧪 Test de connectivité Firestore...');
  
  try {
    // Test d'écriture
    const docRef = db.collection('test').doc('connectivity');
    await docRef.set({
      message: 'Test de connectivité',
      timestamp: new Date(),
      source: 'quick-test'
    });
    console.log('✅ Écriture réussie');
    
    // Test de lecture
    const doc = await docRef.get();
    if (doc.exists) {
      console.log('✅ Lecture réussie:', doc.data().message);
    } else {
      console.log('❌ Document non trouvé');
    }
    
    // Test avec collection dispos
    await db.collection('dispos').doc('test').set({
      tenantId: 'keydispo',
      nom: 'Test',
      prenom: 'User',
      date: '2025-08-13'
    });
    console.log('✅ Collection dispos accessible');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

quickTest().then(() => process.exit(0));
