import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Firebase client config loaded from Vite env vars
// Emulator toggle: VITE_USE_EMULATOR=1
const useEmulator = import.meta.env.VITE_USE_EMULATOR === '1'

// Provide safe defaults when using the emulator to prevent auth/invalid-api-key
const firebaseConfig = {
  apiKey: useEmulator ? 'fake-api-key' : import.meta.env.VITE_FB_API_KEY,
  authDomain: useEmulator ? 'localhost' : import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: (import.meta.env.VITE_FB_PROJECT_ID as string) || (useEmulator ? 'keydispo-dev' : ''),
  storageBucket: useEmulator ? '' : (import.meta.env.VITE_FB_STORAGE_BUCKET as string),
  messagingSenderId: useEmulator ? '0' : (import.meta.env.VITE_FB_MESSAGING_SENDER_ID as string),
  appId: useEmulator ? 'app-fake' : (import.meta.env.VITE_FB_APP_ID as string),
} as const

if (!firebaseConfig.projectId) {
  console.error('Firebase projectId manquant. Définissez VITE_FB_PROJECT_ID (prod) ou activez VITE_USE_EMULATOR=1.')
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

if (useEmulator) {
  try {
  // Utilise 127.0.0.1 pour éviter des soucis de résolution IPv6 de "localhost"
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  console.log('✅ Emulators connected (Auth:127.0.0.1:9099, Firestore:127.0.0.1:8080)')
  } catch (e) {
    console.warn('⚠️ Emulator connection warning', e)
  }
}

export default app
