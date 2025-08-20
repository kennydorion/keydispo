import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'keydispo-ec1ba'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connecter à l'émulateur
connectFirestoreEmulator(db, 'localhost', 8081);

async function viewData() {
  try {
    console.log('🔍 Affichage des données Firestore...\n');
    
    // Vérifier le tenant
    const tenantRef = doc(db, 'tenants', 'keydispo');
    const tenantSnap = await getDoc(tenantRef);
    
    if (tenantSnap.exists()) {
      console.log('✅ Tenant trouvé:', tenantSnap.data());
    }
    
    // Lister les collaborateurs
    const collaborateursRef = collection(db, 'tenants', 'keydispo', 'collaborateurs');
    const collaborateursSnap = await getDocs(collaborateursRef);
    
    console.log(`\n👥 ${collaborateursSnap.size} collaborateurs trouvés:\n`);
    
    collaborateursSnap.forEach((doc) => {
      const data = doc.data();
      console.log(`📋 ${data.nom} ${data.prenom} (${data.metier}) - ${data.ville}`);
      console.log(`   📧 ${data.email} | 📱 ${data.phone}`);
      console.log(`   🆔 ID: ${doc.id}\n`);
    });
    
    console.log('\n🎯 Toutes les données sont bien présentes dans Firestore !');
    console.log('📍 URL directe: http://127.0.0.1:4001/firestore');
    console.log('🔧 Essayez de cliquer sur "Start collection" dans l\'interface');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

viewData();
