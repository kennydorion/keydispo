import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "keydispo-dev.firebaseapp.com",
  projectId: "keydispo-dev",
  storageBucket: "keydispo-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Connecter aux émulateurs
try {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
} catch (error) {
  console.log('Émulateurs déjà connectés');
}

async function createTestUser() {
  console.log('👤 Création de l\'utilisateur de test...\n');
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'test@example.com', 'password123');
    const userId = userCredential.user.uid;
    console.log(`✅ Utilisateur créé avec succès: ${userId}`);
    console.log(`📧 Email: test@example.com`);
    console.log(`🔑 Password: password123`);
    return true;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ Utilisateur existe déjà: test@example.com');
      return true;
    } else {
      console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
      return false;
    }
  }
}

createTestUser().then(() => {
  console.log('\n🎉 Utilisateur de test prêt !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur:', error);
  process.exit(1);
});
