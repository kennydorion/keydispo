/**
 * Vérifier l'état actuel de l'authentification et des permissions
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

// Config pour le mode émulateur
const firebaseConfig = {
  projectId: 'keydispo-dev',
  apiKey: 'fake-api-key-for-emulator',
  authDomain: 'localhost'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

console.log('🔍 Vérification de l\'état d\'authentification...')

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('✅ Utilisateur connecté:')
    console.log('  - UID:', user.uid)
    console.log('  - Email:', user.email)
    
    // Vérifier les permissions dans le tenant
    const tenantId = 'keydispo'
    const userRef = doc(db, `tenants/${tenantId}/users/${user.uid}`)
    
    try {
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        console.log('✅ Utilisateur trouvé dans le tenant:', userDoc.data())
      } else {
        console.log('❌ Utilisateur non trouvé dans le tenant. Création...')
        
        await setDoc(userRef, {
          role: 'admin',
          email: user.email,
          createdAt: serverTimestamp(),
          lastAccess: serverTimestamp()
        })
        
        console.log('✅ Utilisateur ajouté au tenant avec le rôle admin')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des permissions:', error)
    }
    
  } else {
    console.log('❌ Aucun utilisateur connecté')
  }
})
