import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "keydispo.firebaseapp.com", 
  databaseURL: "http://127.0.0.1:9200/?ns=keydispo-default-rtdb",
  projectId: "keydispo-ec1ba",
  storageBucket: "keydispo-ec1ba.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

async function debugCollaborateurs() {
  try {
    console.log('🔍 Vérification des IDs des collaborateurs...\n');
    
    const collaborateursRef = ref(rtdb, 'tenants/keydispo/collaborateurs');
    const snapshot = await get(collaborateursRef);
    
    if (!snapshot.exists()) {
      console.log('❌ Aucun collaborateur trouvé dans RTDB');
      return;
    }
    
    const data = snapshot.val();
    const collaborateurs = Object.entries(data);
    
    console.log(`📊 ${collaborateurs.length} collaborateurs trouvés\n`);
    
    collaborateurs.forEach(([id, collabData], index) => {
      console.log(`${index + 1}. ID: "${id}"`);
      console.log(`   Nom: ${collabData.prenom} ${collabData.nom}`);
      console.log(`   Métier: ${collabData.metier}`);
      console.log(`   Ville: ${collabData.ville || 'Non définie'}`);
      console.log(`   Email: ${collabData.email || 'Non défini'}`);
      console.log(`   ID type: ${typeof id}, length: ${id.length}`);
      console.log('');
    });
    
    // Vérifier si tous ont des IDs valides
    const invalidIds = collaborateurs.filter(([id]) => !id || id.trim() === '');
    if (invalidIds.length > 0) {
      console.log('❌ Collaborateurs avec IDs invalides:', invalidIds.length);
    } else {
      console.log('✅ Tous les collaborateurs ont des IDs valides');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

debugCollaborateurs();
