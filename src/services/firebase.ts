import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Configuration Firebase utilisant les variables d'environnement
const useEmulator = import.meta.env.VITE_USE_EMULATOR === '1'

const firebaseConfig = {
  // Tolère VITE_FB_PROJECT_ID (préférée) et VITE_FIREBASE_PROJECT_ID (ancien nom)
  projectId: import.meta.env.VITE_FB_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'keydispo-dev',
  apiKey: import.meta.env.VITE_FB_API_KEY || 'fake-api-key',
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || 'localhost',
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || 'keydispo-dev.appspot.com',
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FB_APP_ID || '1:123456789:web:abcdef123456'
}

console.log('🔧 Configuration Firebase:', { useEmulator, projectId: firebaseConfig.projectId })

if (!firebaseConfig.projectId) {
  console.error('Firebase projectId manquant. Définissez VITE_FB_PROJECT_ID (recommandé) ou VITE_FIREBASE_PROJECT_ID, ou activez VITE_USE_EMULATOR=1.')
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

// 🔧 CONNEXION AUX ÉMULATEURS SI ACTIVÉE
if (useEmulator || import.meta.env.DEV) {
  console.log('🧪 Connexion aux émulateurs Firebase...')
  
  const firestorePort = parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8080')
  const authPort = parseInt(import.meta.env.VITE_AUTH_EMULATOR_PORT || '9099')
  
  try {
  // Utilise 127.0.0.1 pour éviter des soucis de résolution IPv6 de "localhost"
  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true })
  console.log(`✅ Émulateur Auth connecté sur 127.0.0.1:${authPort}`)
  } catch (error) {
    console.warn('⚠️ Auth émulateur déjà connecté ou erreur:', error instanceof Error ? error.message : String(error))
  }
  
  try {
  connectFirestoreEmulator(db, '127.0.0.1', firestorePort)
  console.log(`✅ Émulateur Firestore connecté sur 127.0.0.1:${firestorePort}`)
  } catch (error) {
    console.warn('⚠️ Firestore émulateur déjà connecté ou erreur:', error instanceof Error ? error.message : String(error))
  }
  
  // Test de connectivité
  setTimeout(() => {
    console.log('🔍 Test de connectivité Firestore...')
    import('firebase/firestore').then(({ doc, setDoc }) => {
      const testDoc = doc(db, 'connectivity-test', 'test')
      setDoc(testDoc, { 
        timestamp: new Date(), 
        message: 'Test de connectivité depuis Vue',
        source: 'firebase.ts',
        emulator: true,
        config: firebaseConfig
      }).then(() => {
        console.log('✅ Test de connectivité Firestore réussi!')
      }).catch((error) => {
        console.error('❌ Test de connectivité Firestore échoué:', error)
      })
    })
  }, 1000)
} else {
  console.log('📡 Mode production - connexion aux services Firebase réels')
}

export default app
