import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'keydispo-local'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

try {
  connectFirestoreEmulator(db, 'localhost', 8081);
} catch (error) {
  console.log('Émulateur déjà connecté');
}

async function testAppQuery() {
  try {
    console.log('🧪 Test de la requête de l\'application...');
    
    // Reproduire exactement la requête du DisponibiliteService
    const tenantId = 'keydispo'; // AuthService.currentTenantId
    
    let q = query(
      collection(db, 'dispos'),
      where('tenantId', '==', tenantId),
      orderBy('date', 'asc'),
      orderBy('heure_debut', 'asc')
    );
    
    console.log(`🔍 Requête pour tenantId: "${tenantId}"`);
    
    const querySnapshot = await getDocs(q);
    
    console.log(`✅ ${querySnapshot.size} documents trouvés`);
    
    if (querySnapshot.size > 0) {
      console.log('\n📋 Premiers résultats:');
      querySnapshot.docs.slice(0, 5).forEach((doc, i) => {
        const data = doc.data();
        console.log(`  ${i+1}. ${data.nom} ${data.prenom} - ${data.date} ${data.heure_debut} - ${data.lieu}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testAppQuery();
