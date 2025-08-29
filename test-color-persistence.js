import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';

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
const db = getFirestore(app);
const auth = getAuth(app);

// Connecter aux émulateurs
try {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
} catch (error) {
  console.log('Émulateurs déjà connectés');
}

async function testColorPersistence() {
  console.log('🧪 Test de persistance des couleurs...\n');
  
  try {
    // 1. Se connecter avec un utilisateur test
    console.log('1️⃣ Connexion avec utilisateur test...');
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
    const userId = userCredential.user.uid;
    console.log(`✅ Connecté en tant que: ${userId}`);
    
    // 2. Définir le tenantId (normalement récupéré via AuthService)
    const tenantId = 'default'; // Same as in AuthService when VITE_TENANT_ID is not set
    console.log(`🏢 Tenant ID: ${tenantId}`);
    
    // 3. Tester la sauvegarde d'une couleur
    const testColor = '#ec4899'; // Rose
    console.log(`\n2️⃣ Test de sauvegarde de couleur: ${testColor}`);
    
    const userRef = doc(db, `tenants/${tenantId}/users/${userId}`);
    
    // Créer/mettre à jour le document avec la nouvelle couleur
    const updatedPreferences = {
      presenceColor: testColor,
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      language: 'fr',
      darkMode: false,
      notifications: {
        newAvailabilities: true,
        modifications: true,
        dailyReminders: false
      }
    };
    
    await setDoc(userRef, {
      preferences: updatedPreferences,
      updatedAt: new Date(),
      role: 'editor'
    }, { merge: true });
    
    console.log('✅ Couleur sauvegardée dans Firestore');
    
    // 4. Vérifier que la couleur a bien été sauvegardée
    console.log('\n3️⃣ Vérification de la sauvegarde...');
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const savedColor = userData.preferences?.presenceColor;
      
      console.log('📄 Document utilisateur:', JSON.stringify(userData, null, 2));
      
      if (savedColor === testColor) {
        console.log(`✅ SUCCESS: Couleur correctement sauvegardée: ${savedColor}`);
        return true;
      } else {
        console.log(`❌ ERROR: Couleur incorrecte. Attendu: ${testColor}, Trouvé: ${savedColor}`);
        return false;
      }
    } else {
      console.log('❌ ERROR: Document utilisateur non trouvé');
      return false;
    }
    
  } catch (error) {
    console.error('❌ ERROR during test:', error);
    return false;
  }
}

async function testDifferentColors() {
  console.log('\n🎨 Test avec différentes couleurs...\n');
  
  const colors = [
    { name: 'Bleu', value: '#3b82f6' },
    { name: 'Rouge', value: '#ef4444' },
    { name: 'Vert', value: '#10b981' },
    { name: 'Orange', value: '#f59e0b' }
  ];
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
    const userId = userCredential.user.uid;
    const tenantId = 'default';
    const userRef = doc(db, `tenants/${tenantId}/users/${userId}`);
    
    for (const color of colors) {
      console.log(`🎨 Test couleur ${color.name}: ${color.value}`);
      
      // Sauvegarder la couleur
      await setDoc(userRef, {
        preferences: {
          presenceColor: color.value,
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          language: 'fr',
          darkMode: false,
          notifications: {
            newAvailabilities: true,
            modifications: true,
            dailyReminders: false
          }
        },
        updatedAt: new Date()
      }, { merge: true });
      
      // Vérifier immédiatement
      const doc = await getDoc(userRef);
      const savedColor = doc.data()?.preferences?.presenceColor;
      
      if (savedColor === color.value) {
        console.log(`  ✅ ${color.name} sauvegardée correctement`);
      } else {
        console.log(`  ❌ ${color.name} échouée. Attendu: ${color.value}, Trouvé: ${savedColor}`);
      }
      
      // Petite pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.error('❌ Error during color tests:', error);
  }
}

// Exécuter les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests de persistance des couleurs\n');
  console.log('📊 Firestore Emulator: http://127.0.0.1:4001/firestore');
  console.log('🔐 Auth Emulator: http://127.0.0.1:4001/auth\n');
  
  const success = await testColorPersistence();
  
  if (success) {
    await testDifferentColors();
    console.log('\n🎉 Tous les tests sont passés !');
  } else {
    console.log('\n💥 Test principal échoué');
  }
  
  console.log('\n📊 Vérifiez les données dans l\'interface Firestore: http://127.0.0.1:4001/firestore');
  
  process.exit(0);
}

runAllTests().catch(console.error);
