// Test de connexion RTDB simple
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, connectDatabaseEmulator } from 'firebase/database'
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "keydispo-default-rtdb.firebaseapp.com", 
  databaseURL: "https://keydispo-default-rtdb-default-rtdb.firebaseio.com",
  projectId: "keydispo",
  storageBucket: "keydispo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}

async function testRTDBConnection() {
  console.log('🧪 Test de connexion RTDB')
  
  try {
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const rtdb = getDatabase(app)
    
    // Connexion aux émulateurs
    connectAuthEmulator(auth, "http://127.0.0.1:9199")
    connectDatabaseEmulator(rtdb, "127.0.0.1", 9200)
    
    console.log('✅ Firebase initialisé')
    
    // Authentification
    await signInAnonymously(auth)
    console.log('✅ Authentifié')
    
    // Test d'écriture simple
    await set(ref(rtdb, 'test/connection'), {
      timestamp: Date.now(),
      message: 'Test de connexion'
    })
    
    console.log('✅ Écriture test réussie')
    
    // Test d'écriture pour un tenant
    await set(ref(rtdb, 'tenants/keydispo/disponibilites/test-dispo-1'), {
      nom: 'Test',
      prenom: 'User',
      date: '2024-01-15',
      lieu: 'Test Location'
    })
    
    console.log('✅ Écriture tenant réussie')
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

testRTDBConnection()
