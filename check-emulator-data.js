// Test rapide de l'émulateur RTDB
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, connectDatabaseEmulator } from 'firebase/database';

const app = initializeApp({
  projectId: 'keydispo-dev',
  databaseURL: 'http://127.0.0.1:9200?ns=keydispo-dev-default-rtdb'
});

const database = getDatabase(app);

try {
  connectDatabaseEmulator(database, '127.0.0.1', 9200);
} catch (error) {
  // Émulateur déjà connecté
}

async function checkData() {
  try {
    console.log('🔍 Vérification des données dans l\'émulateur...\n');
    
    // Vérifier les collaborateurs
    const collabRef = ref(database, 'tenants/keydispo/collaborateurs');
    const collabSnapshot = await get(collabRef);
    
    if (collabSnapshot.exists()) {
      const collaborateurs = collabSnapshot.val();
      console.log(`👥 ${Object.keys(collaborateurs).length} collaborateurs trouvés`);
    } else {
      console.log('👥 Aucun collaborateur trouvé');
    }
    
    // Vérifier les disponibilités
    const dispoRef = ref(database, 'tenants/keydispo/disponibilites');
    const dispoSnapshot = await get(dispoRef);
    
    if (dispoSnapshot.exists()) {
      const disponibilites = dispoSnapshot.val();
      const dispoArray = Object.values(disponibilites);
      console.log(`📅 ${dispoArray.length} disponibilités trouvées`);
      
      // Afficher quelques exemples de dates
      const dates = dispoArray.map(d => d.date).slice(0, 5);
      console.log('📊 Exemples de dates:', dates);
    } else {
      console.log('📅 Aucune disponibilité trouvée');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
  
  process.exit(0);
}

checkData();
