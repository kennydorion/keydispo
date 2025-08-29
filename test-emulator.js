// Test simple de l'émulateur RTDB
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, connectDatabaseEmulator } from 'firebase/database';

const app = initializeApp({
  projectId: 'keydispo-dev',
  databaseURL: 'http://127.0.0.1:9200?ns=keydispo-dev-default-rtdb'
});

const database = getDatabase(app);

// Connecter à l'émulateur (important !)
try {
  connectDatabaseEmulator(database, '127.0.0.1', 9200);
  console.log('✅ Connecté à l\'émulateur RTDB');
} catch (error) {
  console.log('⚠️ Émulateur déjà connecté');
}

async function testEmulatorRTDB() {
  console.log('🧪 Test de l\'émulateur RTDB...\n');
  
  try {
    // Test d'écriture d'un collaborateur
    const collabData = {
      id: 'test_emulator_001',
      nom: 'Testeur',
      prenom: 'Emulateur',
      email: 'test@emulator.dev',
      tenantId: 'keydispo',
      createdAt: Date.now()
    };
    
    const collabRef = ref(database, 'tenants/keydispo/collaborateurs/test_emulator_001');
    await set(collabRef, collabData);
    console.log('✅ Collaborateur écrit dans l\'émulateur');
    
    // Test d'écriture d'une disponibilité
    const dispoData = {
      id: 'dispo_emulator_001',
      collaborateurId: 'test_emulator_001',
      date: '2025-08-29',
      heure_debut: '08:00',
      heure_fin: '16:00',
      lieu: 'Emulateur Office',
      nom: 'Testeur',
      prenom: 'Emulateur',
      tenantId: 'keydispo',
      createdAt: Date.now()
    };
    
    const dispoRef = ref(database, 'tenants/keydispo/disponibilites/dispo_emulator_001');
    await set(dispoRef, dispoData);
    console.log('✅ Disponibilité écrite dans l\'émulateur');
    
    // Test de lecture
    const collaborateursRef = ref(database, 'tenants/keydispo/collaborateurs');
    const collabSnapshot = await get(collaborateursRef);
    
    if (collabSnapshot.exists()) {
      const collaborateurs = collabSnapshot.val();
      console.log(`✅ ${Object.keys(collaborateurs).length} collaborateur(s) trouvé(s) dans l'émulateur`);
    }
    
    const disponibilitesRef = ref(database, 'tenants/keydispo/disponibilites');
    const dispoSnapshot = await get(disponibilitesRef);
    
    if (dispoSnapshot.exists()) {
      const disponibilites = dispoSnapshot.val();
      console.log(`✅ ${Object.keys(disponibilites).length} disponibilité(s) trouvée(s) dans l'émulateur`);
    }
    
    console.log('\n🎉 Émulateur RTDB fonctionnel !');
    console.log('👉 Votre application peut maintenant se connecter à http://127.0.0.1:9200');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
  
  process.exit(0);
}

testEmulatorRTDB();
