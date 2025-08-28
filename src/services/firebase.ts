import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

// Activer l'émulateur uniquement en local ET si VITE_USE_EMULATOR=1
const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
let useEmulator = (import.meta.env.VITE_USE_EMULATOR === '1') && isLocalhost

// Sécurité: si on détecte un projectId prod forcé dans variables, on désactive l'émulateur
if (import.meta.env.VITE_FB_PROJECT_ID && String(import.meta.env.VITE_FB_PROJECT_ID).includes('-ec1ba')) {
  useEmulator = false
}

// Configuration Firebase
const firebaseConfig = {
  // Préfère VITE_FB_PROJECT_ID (ou ancien nom), fallback dev UNIQUEMENT si émulateur
  projectId: (import.meta.env.VITE_FB_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID) || (useEmulator ? 'keydispo-dev' : ''),
  apiKey: useEmulator ? 'fake-api-key' : import.meta.env.VITE_FB_API_KEY,
  authDomain: useEmulator ? 'localhost' : import.meta.env.VITE_FB_AUTH_DOMAIN,
  databaseURL: useEmulator ? 'http://127.0.0.1:9000?ns=keydispo-dev-default-rtdb' : import.meta.env.VITE_FB_DATABASE_URL,
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

// Calcul statut de configuration (utile au front pour désactiver inscription)
const missingVars: string[] = []
if (!useEmulator) {
  if (!firebaseConfig.apiKey) missingVars.push('VITE_FB_API_KEY')
  if (!firebaseConfig.authDomain) missingVars.push('VITE_FB_AUTH_DOMAIN')
  if (!firebaseConfig.projectId) missingVars.push('VITE_FB_PROJECT_ID')
  if (!firebaseConfig.appId) missingVars.push('VITE_FB_APP_ID')
}
const fakeKey = !useEmulator && !!firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('fake')
export const firebaseStatus = {
  useEmulator,
  missing: missingVars,
  fakeKey,
  configValid: useEmulator || (missingVars.length === 0 && !fakeKey)
} as const

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

// Initialize Firebase with singleton pattern protection
declare global {
  interface Window {
    __FIREBASE_APP__: any
  }
}

let app: any

// Protection globale contre les multiples initialisations
if (typeof window !== 'undefined') {
  if (window.__FIREBASE_APP__) {
    app = window.__FIREBASE_APP__
    console.log('🔄 Firebase App récupérée depuis cache global')
  } else {
    try {
      // Vérifier si des apps existent déjà
      const existingApps = getApps()
      if (existingApps.length > 0) {
        app = existingApps[0]
        console.log('🔄 Firebase App existante récupérée')
      } else {
        app = initializeApp(firebaseConfig)
        console.log('🆕 Nouvelle Firebase App initialisée')
      }
      // Stocker dans le cache global
      window.__FIREBASE_APP__ = app
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        app = getApp()
        window.__FIREBASE_APP__ = app
        console.log('🔄 Firebase App récupérée après erreur duplicate')
      } else {
        throw error
      }
    }
  }
} else {
  // Mode SSR/Node.js
  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      app = existingApps[0]
    } else {
      app = initializeApp(firebaseConfig)
    }
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      app = getApp()
    } else {
      throw error
    }
  }
}

export { app }
export const auth = getAuth(app)
export const db = getFirestore(app)
export const rtdb = getDatabase(app)

// Connexion aux émulateurs (local uniquement)
if (useEmulator) {
  console.log('🧪 Connexion aux émulateurs Firebase...')
  const firestorePort = parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8080')
  const authPort = parseInt(import.meta.env.VITE_AUTH_EMULATOR_PORT || '9099')
  const rtdbPort = parseInt(import.meta.env.VITE_DATABASE_EMULATOR_PORT || '9000')
  
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
  
  try {
    connectDatabaseEmulator(rtdb, '127.0.0.1', rtdbPort)
    console.log(`✅ Émulateur Realtime Database connecté sur 127.0.0.1:${rtdbPort}`)
  } catch (error) {
    console.warn('⚠️ Realtime Database émulateur déjà connecté ou erreur:', error instanceof Error ? error.message : String(error))
  }
} else {
  console.log('📡 Mode production - services Firebase réels')
}

export default app
