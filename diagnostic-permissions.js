/**
 * Script de diagnostic pour les permissions collaborateurs
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

// Configuration d'émulateur local
const firebaseConfig = {
  projectId: 'keydispo-dev',
  apiKey: 'fake-api-key-for-emulator',
  authDomain: 'localhost',
  databaseURL: 'http://127.0.0.1:9000?ns=keydispo-dev-default-rtdb',
  storageBucket: '',
  messagingSenderId: '0',
  appId: 'app-fake'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

async function diagnosticPermissions() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log('🔐 Utilisateur connecté:', user.uid, user.email)
          
          const tenantId = 'keydispo'
          
          // 1. Vérifier si l'utilisateur est membre du tenant
          console.log('🔍 Vérification membre du tenant...')
          const userRef = doc(db, `tenants/${tenantId}/users/${user.uid}`)
          const userDoc = await getDoc(userRef)
          
          if (!userDoc.exists()) {
            console.log('❌ Utilisateur non membre du tenant. Création du membre...')
            await setDoc(userRef, {
              role: 'admin',
              email: user.email,
              createdAt: serverTimestamp(),
              lastAccess: serverTimestamp()
            })
            console.log('✅ Utilisateur ajouté au tenant avec le rôle admin')
          } else {
            const userData = userDoc.data()
            console.log('✅ Utilisateur membre du tenant:', userData)
          }
          
          // 2. Tester la création d'un collaborateur
          console.log('🧪 Test création collaborateur...')
          const testCollabRef = doc(collection(db, `tenants/${tenantId}/collaborateurs`))
          
          const testData = {
            nom: 'Test',
            prenom: 'Debug',
            email: 'test.debug@example.com',
            phone: '+41 79 123 45 67',
            metier: 'Testeur',
            ville: 'Genève',
            tenantId: tenantId,
            actif: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            version: 1
          }
          
          await setDoc(testCollabRef, testData)
          console.log('✅ Collaborateur test créé avec succès:', testCollabRef.id)
          
          // 3. Vérifier que le collaborateur a été créé
          const createdDoc = await getDoc(testCollabRef)
          if (createdDoc.exists()) {
            console.log('✅ Collaborateur vérifié:', createdDoc.data())
          }
          
          console.log('🎉 Diagnostic terminé avec succès')
          
        } catch (error) {
          console.error('❌ Erreur lors du diagnostic:', error)
          if (error.code) {
            console.error('Code d\'erreur:', error.code)
          }
        }
      } else {
        console.log('❌ Aucun utilisateur connecté')
      }
      resolve()
    })
  })
}

// Attendre un peu pour que l'auth se connecte aux émulateurs
setTimeout(diagnosticPermissions, 1000)
