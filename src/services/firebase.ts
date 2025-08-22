import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Activer l'émulateur uniquement en local ET si VITE_USE_EMULATOR=1
const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const useEmulator = (import.meta.env.VITE_USE_EMULATOR === '1') && isLocalhost

// Configuration Firebase
const firebaseConfig = {
  // Préfère VITE_FB_PROJECT_ID (ou ancien nom), fallback dev UNIQUEMENT si émulateur
  projectId: (import.meta.env.VITE_FB_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID) || (useEmulator ? 'keydispo-dev' : ''),
  apiKey: useEmulator ? 'fake-api-key' : import.meta.env.VITE_FB_API_KEY,
  authDomain: useEmulator ? 'localhost' : import.meta.env.VITE_FB_AUTH_DOMAIN,
  storageBucket: useEmulator ? '' : import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: useEmulator ? '0' : import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: useEmulator ? 'app-fake' : import.meta.env.VITE_FB_APP_ID,
} as const

// Log compact sans exposer les secrets, pour diagnostiquer les manques en prod
console.log('🔧 Configuration Firebase:', {
  useEmulator,
  projectId: firebaseConfig.projectId,
  hasApiKey: Boolean(firebaseConfig.apiKey),
  hasAuthDomain: Boolean(firebaseConfig.authDomain),
  hasAppId: Boolean(firebaseConfig.appId)
})

// Détection d'une apiKey factice en prod
if (!useEmulator && firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('fake')) {
  console.error('❌ apiKey Firebase invalide (valeur factice). Vérifiez vos variables VITE_FB_API_KEY.*')
}

if (!firebaseConfig.projectId) {
  console.error('Firebase projectId manquant. Définissez VITE_FB_PROJECT_ID (prod) ou activez VITE_USE_EMULATOR=1 en local.')
}

// En production, s'assurer que les variables critiques sont présentes
if (!useEmulator) {
  const missing: string[] = []
  if (!firebaseConfig.apiKey) missing.push('VITE_FB_API_KEY')
  if (!firebaseConfig.authDomain) missing.push('VITE_FB_AUTH_DOMAIN')
  if (!firebaseConfig.projectId) missing.push('VITE_FB_PROJECT_ID')
  if (!firebaseConfig.appId) missing.push('VITE_FB_APP_ID')
  if (missing.length) {
    console.error('❌ Variables d\'env Firebase manquantes en production:', { missing })
  }
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Connexion aux émulateurs (local uniquement)
if (useEmulator) {
  console.log('🧪 Connexion aux émulateurs Firebase...')
  const firestorePort = parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8080')
  const authPort = parseInt(import.meta.env.VITE_AUTH_EMULATOR_PORT || '9099')
  try {
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
} else {
  console.log('📡 Mode production - services Firebase réels')
}

export default app
