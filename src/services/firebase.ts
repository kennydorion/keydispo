import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

// Activer l'émulateur uniquement en local ET si VITE_USE_EMULATOR=1
const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
let useEmulator = (import.meta.env.VITE_USE_EMULATOR === '1') && isLocalhost

// Sécurité: si on détecte un projectId prod forcé dans variables, on désactive l'émulateur
if (import.meta.env.VITE_FB_PROJECT_ID && String(import.meta.env.VITE_FB_PROJECT_ID).includes('-ec1ba')) {
  useEmulator = false
}

// Configuration Firebase
// Important:
// - En mode émulateur, n'utilisez PAS une databaseURL HTTP avec getDatabase(app) ET connectDatabaseEmulator,
//   cela peut créer un état incohérent interne (erreur _repo null). On laisse databaseURL vide et on
//   connecte explicitement l'instance via connectDatabaseEmulator.
const firebaseConfig = {
  // Préfère VITE_FB_PROJECT_ID (ou ancien nom), fallback dev UNIQUEMENT si émulateur
  projectId: (import.meta.env.VITE_FB_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID) || (useEmulator ? 'keydispo-ec1ba' : ''),
  apiKey: useEmulator ? 'fake-api-key' : import.meta.env.VITE_FB_API_KEY,
  authDomain: useEmulator ? 'localhost' : import.meta.env.VITE_FB_AUTH_DOMAIN,
  // Ne pas forcer une URL HTTP en émulateur; connectDatabaseEmulator fera foi
  databaseURL: !useEmulator ? import.meta.env.VITE_FB_DATABASE_URL : undefined,
  storageBucket: useEmulator ? '' : import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: useEmulator ? '0' : import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: useEmulator ? 'app-fake' : import.meta.env.VITE_FB_APP_ID,
} as const

// Log compact supprimé en prod (géré par garde globale)

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
  } else {
    try {
      // Vérifier si des apps existent déjà
      const existingApps = getApps()
      if (existingApps.length > 0) {
  app = existingApps[0]
      } else {
  app = initializeApp(firebaseConfig)
      }
      // Stocker dans le cache global
      window.__FIREBASE_APP__ = app
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        app = getApp()
        window.__FIREBASE_APP__ = app
  // duplicate handled silently
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
// Firestore: transport configuré dynamiquement pour éviter les "Listen 400" (proxys/antivirus/Safari)
// Règle:
// - Si VITE_FORCE_LONG_POLL=1 OU Safari détecté: forcer le long-polling (sans auto-detect)
// - Sinon: auto-détection du long-polling (true) + options de timeout
function detectSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua)
  const isIOSWebKit = /iP(ad|hone|od)/.test(ua)
  return isSafari || isIOSWebKit
}

const forceLongPollFromEnv = import.meta.env.VITE_FORCE_LONG_POLL === '1'
const shouldForceLongPolling = forceLongPollFromEnv || detectSafari()

let dbSettings: any
if (shouldForceLongPolling) {
  dbSettings = {
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: { timeoutSeconds: 25 },
  }
  // transport info suppressed (debug-only)
} else {
  dbSettings = {
    experimentalAutoDetectLongPolling: true,
    experimentalLongPollingOptions: { timeoutSeconds: 25 },
  }
  // transport info suppressed (debug-only)
}

export const db = initializeFirestore(app, dbSettings)
// Créer l'instance RTDB sans URL forcée; l'émulateur est géré plus bas
export const rtdb = getDatabase(app)

// Connexion aux émulateurs (local uniquement)
if (useEmulator) {
  const firestorePort = parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8180')
  const authPort = parseInt(import.meta.env.VITE_AUTH_EMULATOR_PORT || '9199')
  const rtdbPort = parseInt(import.meta.env.VITE_DATABASE_EMULATOR_PORT || '9200')
  
  try {
    connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true })
  // emulator auth connected
  } catch (error) {
    console.warn('⚠️ Auth émulateur déjà connecté ou erreur:', error instanceof Error ? error.message : String(error))
  }
  
  try {
    connectFirestoreEmulator(db, '127.0.0.1', firestorePort)
  // emulator firestore connected
  } catch (error) {
    console.warn('⚠️ Firestore émulateur déjà connecté ou erreur:', error instanceof Error ? error.message : String(error))
  }
  
  try {
  connectDatabaseEmulator(rtdb, '127.0.0.1', rtdbPort)
  // emulator rtdb connected
  } catch (error) {
    console.warn('⚠️ Realtime Database émulateur déjà connecté ou erreur:', error instanceof Error ? error.message : String(error))
  }
}

export default app
