import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, connectFirestoreEmulator } from 'firebase/firestore';

// Même configuration que dans l'app
const firebaseConfig = {
  projectId: 'keydispo-local',
  apiKey: "AIzaSyBwlkEH5oFG67KIXEjos79q3mMuXYb7YVs",
  authDomain: "keydispo-ec1ba.firebaseapp.com",
  storageBucket: "keydispo-ec1ba.firebasestorage.app",
  messagingSenderId: "88160757893",
  appId: "1:88160757893:web:6032157699b59c187721ec"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connecter à l'émulateur
try {
  connectFirestoreEmulator(db, 'localhost', 8081);
  console.log('✅ Connecté à l\'émulateur sur port 8081');
} catch (error) {
  console.log('⚠️ Émulateur déjà connecté');
}

async function testAppConnection() {
  try {
    console.log('🧪 Test de connexion depuis l\'app...');
    
    // Test avec le même tenant que l'app
    const disposSnap = await getDocs(collection(db, 'dispos'));
    console.log('📊 Documents trouvés:', disposSnap.size);
    
    // Tester la logique de filtre par tenant
    const disponibilites = [];
    disposSnap.forEach(doc => {
      const data = doc.data();
      if (data.tenantId === 'keydispo') {
        disponibilites.push({
          id: doc.id,
          nom: data.nom,
          prenom: data.prenom,
          date: data.date,
          lieu: data.lieu
        });
      }
    });
    
    console.log('✅ Disponibilités pour tenant "keydispo":', disponibilites.length);
    if (disponibilites.length > 0) {
      console.log('Exemples:');
      disponibilites.slice(0, 3).forEach(d => {
        console.log(`- ${d.nom} ${d.prenom}: ${d.date} à ${d.lieu}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
  }
}

testAppConnection();
