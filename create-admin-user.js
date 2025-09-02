/**
 * Script pour créer un utilisateur admin dans le tenant
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, serverTimestamp, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth'

// Configuration pour émulateur
const firebaseConfig = {
  projectId: 'keydispo-dev',
  apiKey: 'fake-api-key-for-emulator',
  authDomain: 'localhost'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Connecter aux émulateurs
connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 8180)

async function createAdminUser() {
  try {
    const email = 'admin@keydispo.local'
    const password = 'Test1234'
    const tenantId = 'keydispo'
    
    console.log('🔄 Création utilisateur admin...')
    
    // Essayer de se connecter d'abord
    let userCredential
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log('✅ Utilisateur admin connecté:', userCredential.user.uid)
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Créer l'utilisateur
        userCredential = await createUserWithEmailAndPassword(auth, email, password)
        console.log('✅ Utilisateur admin créé:', userCredential.user.uid)
      } else {
        throw error
      }
    }
    
    // Ajouter au tenant
    const userRef = doc(db, `tenants/${tenantId}/users/${userCredential.user.uid}`)
    await setDoc(userRef, {
      role: 'admin',
      email: email,
      createdAt: serverTimestamp(),
      lastAccess: serverTimestamp()
    })
    
    console.log('✅ Utilisateur ajouté au tenant avec le rôle admin')
    console.log('📧 Email:', email)
    console.log('🔑 Mot de passe:', password)
    
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }
}

// Attendre un peu que les émulateurs soient prêts
setTimeout(createAdminUser, 2000)
