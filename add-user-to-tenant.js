import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'keydispo-ec1ba',
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  appId: 'fake-app-id'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connecter à l'émulateur
try {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
} catch (error) {
  console.log('Émulateur déjà connecté');
}

async function addUserToTenant() {
  try {
    // UID d'un utilisateur existant dans l'émulateur (récupérez-le depuis l'interface)
    // Ou utilisez un UID générique pour le test
    const userUid = 'test-user-uid-123';
    const tenantId = 'keydispo';
    
    const tenantUserRef = doc(db, `tenants/${tenantId}/users/${userUid}`);
    
    await setDoc(tenantUserRef, {
      role: 'admin',
      email: 'test@keydispo.com',
      displayName: 'Utilisateur Test',
      createdAt: new Date(),
    });
    
    console.log('✅ Utilisateur ajouté au tenant avec le rôle admin');
    console.log('🆔 UID:', userUid);
    console.log('🏢 Tenant:', tenantId);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
  
  process.exit(0);
}

console.log('🔧 Ajout d\'un utilisateur au tenant...');
addUserToTenant();
