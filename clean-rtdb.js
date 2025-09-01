
// Nettoyage et test de l'import RTDB

import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator, ref, remove } from 'firebase/database'
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth'

// Configuration Firebase identique
const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "keydispo-default-rtdb.firebaseapp.com",
  databaseURL: "https://keydispo-default-rtdb-default-rtdb.firebaseio.com",
  projectId: "keydispo",
  storageBucket: "keydispo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}

const firebaseApp = initializeApp(firebaseConfig)
const auth = getAuth(firebaseApp)
const rtdb = getDatabase(firebaseApp)

// Connexion aux émulateurs
connectAuthEmulator(auth, "http://127.0.0.1:9199")
connectDatabaseEmulator(rtdb, "127.0.0.1", 9200)

async function cleanRTDB() {
  console.log('🧹 Nettoyage RTDB...')
  
  try {
    // Authentification
    await signInAnonymously(auth)
    
    // Suppression de toutes les données
    await remove(ref(rtdb))
    console.log('✅ RTDB nettoyée')
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error)
  }
}

// Exécution
cleanRTDB()
