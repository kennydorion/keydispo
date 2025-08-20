import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs } from 'firebase/firestore';

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

async function countAll() {
  try {
    console.log('📊 Comptage de tous les documents...');
    
    const disposRef = collection(db, 'dispos');
    const snapshot = await getDocs(disposRef);
    
    console.log(`📁 Collection "dispos": ${snapshot.size} documents`);
    
    // Grouper par tenantId
    const byTenant = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const tenant = data.tenantId || 'undefined';
      if (!byTenant[tenant]) byTenant[tenant] = 0;
      byTenant[tenant]++;
    });
    
    console.log('📊 Répartition par tenant:');
    Object.entries(byTenant).forEach(([tenant, count]) => {
      console.log(`  - ${tenant}: ${count} documents`);
    });
    
    // Afficher quelques échantillons
    if (snapshot.size > 0) {
      console.log('\n📋 Échantillons:');
      snapshot.docs.slice(0, 3).forEach((doc, i) => {
        const data = doc.data();
        console.log(`  ${i+1}. ${data.nom} ${data.prenom} - ${data.date} - ${data.lieu}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

countAll();
