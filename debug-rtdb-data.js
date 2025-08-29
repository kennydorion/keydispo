// Debug script pour vérifier les données RTDB
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

// Utiliser la même configuration que l'application
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

async function debugRTDBData() {
  console.log('🔍 Vérification des données RTDB...\n');
  
  try {
    // Vérifier les collaborateurs
    console.log('👥 COLLABORATEURS:');
    const collaborateursRef = ref(database, 'tenants/keydispo/collaborateurs');
    const collaborateursSnapshot = await get(collaborateursRef);
    
    if (collaborateursSnapshot.exists()) {
      const collaborateurs = collaborateursSnapshot.val();
      console.log(`✅ ${Object.keys(collaborateurs).length} collaborateurs trouvés`);
      
      // Afficher les premiers collaborateurs
      const collabArray = Object.values(collaborateurs).slice(0, 3);
      collabArray.forEach((collab, index) => {
        console.log(`${index + 1}. ${collab.nom} ${collab.prenom} (ID: ${collab.id})`);
      });
    } else {
      console.log('❌ Aucun collaborateur trouvé dans RTDB');
    }
    
    console.log('\n📅 DISPONIBILITÉS:');
    const disposRef = ref(database, 'tenants/keydispo/disponibilites');
    const disposSnapshot = await get(disposRef);
    
    if (disposSnapshot.exists()) {
      const disponibilites = disposSnapshot.val();
      console.log(`✅ ${Object.keys(disponibilites).length} disponibilités trouvées`);
      
      // Analyser les disponibilités par collaborateur
      const disposByCollab = {};
      Object.values(disponibilites).forEach(dispo => {
        const collabId = dispo.collaborateurId;
        if (!disposByCollab[collabId]) {
          disposByCollab[collabId] = [];
        }
        disposByCollab[collabId].push(dispo);
      });
      
      console.log(`👥 Disponibilités réparties sur ${Object.keys(disposByCollab).length} collaborateurs:`);
      Object.entries(disposByCollab).slice(0, 5).forEach(([collabId, dispos]) => {
        console.log(`  - ${collabId}: ${dispos.length} disponibilités`);
      });
      
      // Afficher quelques exemples
      console.log('\n📋 Exemples de disponibilités:');
      Object.values(disponibilites).slice(0, 3).forEach((dispo, index) => {
        console.log(`${index + 1}. ${dispo.date} ${dispo.heure_debut}-${dispo.heure_fin} (${dispo.collaborateurId})`);
      });
      
    } else {
      console.log('❌ Aucune disponibilité trouvée dans RTDB');
    }
    
    console.log('\n🔍 Structure RTDB:');
    const tenantRef = ref(database, 'tenants/keydispo');
    const tenantSnapshot = await get(tenantRef);
    
    if (tenantSnapshot.exists()) {
      const tenantData = tenantSnapshot.val();
      console.log('📁 Dossiers dans tenant keydispo:', Object.keys(tenantData));
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
  
  process.exit(0);
}

debugRTDBData();
