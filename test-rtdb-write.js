// Test script pour vérifier l'import RTDB
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = {
  projectId: 'keydispo-ec1ba',
  apiKey: 'AIzaSyBwlkEH5oFG67KIXEjos79q3mMuXYb7YVs',
  authDomain: 'keydispo-ec1ba.firebaseapp.com',
  databaseURL: 'https://keydispo-ec1ba-default-rtdb.europe-west1.firebasedatabase.app/',
  storageBucket: 'keydispo-ec1ba.firebasestorage.app',
  messagingSenderId: '88160757893',
  appId: '1:88160757893:web:6032157699b59c187721ec'
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function testRTDBWrite() {
  console.log('🧪 Test d\'écriture RTDB...\n');
  
  try {
    // Test simple d'écriture
    const testData = {
      id: 'test_collab_001',
      nom: 'Test',
      prenom: 'Collaborateur',
      email: 'test@example.com',
      createdAt: Date.now()
    };
    
    const collaborateurRef = ref(database, 'tenants/keydispo/collaborateurs/test_collab_001');
    await set(collaborateurRef, testData);
    
    console.log('✅ Test d\'écriture réussi !');
    console.log('📊 Données écrites:', testData);
    
    // Test d'écriture d'une disponibilité
    const dispoTest = {
      id: 'test_dispo_001',
      collaborateurId: 'test_collab_001',
      date: '2025-08-29',
      heure_debut: '09:00',
      heure_fin: '17:00',
      lieu: 'Test Location',
      nom: 'Test',
      prenom: 'Collaborateur',
      tenantId: 'keydispo',
      createdAt: Date.now()
    };
    
    const dispoRef = ref(database, 'tenants/keydispo/disponibilites/test_dispo_001');
    await set(dispoRef, dispoTest);
    
    console.log('✅ Test disponibilité écrit !');
    console.log('📊 Disponibilité test:', dispoTest);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
  
  process.exit(0);
}

testRTDBWrite();
