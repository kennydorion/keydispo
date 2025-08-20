import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'keydispo-local'
};

// Configurer pour utiliser l'émulateur
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connecter à l'émulateur Firestore
try {
  // Port Firestore emulator d'après firebase.json: 8080
  connectFirestoreEmulator(db, 'localhost', 8080);
} catch (error) {
  console.log('Émulateur déjà connecté ou erreur de connexion');
}

async function checkFirestoreData() {
  try {
    console.log('🔍 Vérification des données Firestore...');
    
    // Vérifier tenants
    const tenantsSnap = await getDocs(query(collection(db, 'tenants'), limit(5)));
    console.log('📁 Collection tenants:', tenantsSnap.size, 'documents');
    
    if (tenantsSnap.size > 0) {
      tenantsSnap.forEach(doc => {
        console.log('- Tenant:', doc.id, doc.data());
      });
      
      const firstTenant = tenantsSnap.docs[0];
      console.log('\n👥 Vérification des collaborateurs...');
      
      // Vérifier collaborateurs
      try {
        const collabsSnap = await getDocs(query(collection(db, `tenants/${firstTenant.id}/collaborateurs`), limit(3)));
        console.log('Collaborateurs trouvés:', collabsSnap.size);
        
        if (collabsSnap.size > 0) {
          collabsSnap.forEach(doc => {
            console.log('- Collaborateur:', doc.id, doc.data());
          });
          
          // Vérifier disponibilités
          const firstCollab = collabsSnap.docs[0];
          console.log('\n📅 Vérification des disponibilités...');
          
          const disposSnap = await getDocs(query(collection(db, `tenants/${firstTenant.id}/collaborateurs/${firstCollab.id}/disponibilites`), limit(3)));
          console.log('Disponibilités trouvées:', disposSnap.size);
          
          if (disposSnap.size > 0) {
            disposSnap.forEach(doc => {
              console.log('- Disponibilité:', doc.id, doc.data());
            });
          }
        }
      } catch (collabError) {
        console.log('❌ Erreur collaborateurs:', collabError.message);
      }
    }
    
    // Vérifier anciennes collections
    console.log('\n📊 Vérification des anciennes collections...');
    
    try {
      const oldDisposSnap = await getDocs(query(collection(db, 'dispos'), limit(3)));
      console.log('Collection "dispos":', oldDisposSnap.size, 'documents');
      if (oldDisposSnap.size > 0) {
        console.log('Premier doc dispos:', oldDisposSnap.docs[0].data());
      }
    } catch (error) {
      console.log('Collection "dispos" introuvable ou vide');
    }
    
    try {
      const oldDisponibilitesSnap = await getDocs(query(collection(db, 'disponibilites'), limit(3)));
      console.log('Collection "disponibilites":', oldDisponibilitesSnap.size, 'documents');
      if (oldDisponibilitesSnap.size > 0) {
        console.log('Premier doc disponibilites:', oldDisponibilitesSnap.docs[0].data());
      }
    } catch (error) {
      console.log('Collection "disponibilites" introuvable ou vide');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkFirestoreData();
