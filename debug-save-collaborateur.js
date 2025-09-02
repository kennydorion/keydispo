/**
 * Script de debug pour le bouton sauvegarder du collaborateur
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyA8Z8kx3JaI5cF9OqWL5FuJ9QhL6lCgVOM",
  authDomain: "keydispo-a5db1.firebaseapp.com",
  databaseURL: "https://keydispo-a5db1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "keydispo-a5db1",
  storageBucket: "keydispo-a5db1.firebasestorage.app",
  messagingSenderId: "469468936368",
  appId: "1:469468936368:web:c2e7e4669f47f03dbbaa0e"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

async function testSaveCollaborateur() {
  try {
    console.log('🔄 Test de sauvegarde collaborateur...')

    // Se connecter
    const userCredential = await signInWithEmailAndPassword(auth, 'kenny@dorion.dev', 'Test1234')
    console.log('✅ Connexion réussie:', userCredential.user.uid)

    const tenantId = 'keydispo'
    const userId = userCredential.user.uid

    // Test création d'un collaborateur
    const testData = {
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@test.com',
      phone: '+41 79 123 45 67',
      metier: 'Développeur',
      ville: 'Genève',
      tenantId: tenantId,
      actif: true
    }

    console.log('📝 Données à sauvegarder:', testData)

    // Créer un nouveau document
    const collaborateurRef = doc(db, `tenants/${tenantId}/collaborateurs/test-${Date.now()}`)
    
    const collaborateurData = {
      ...testData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: userId,
      version: 1
    }

    await setDoc(collaborateurRef, collaborateurData)
    console.log('✅ Collaborateur créé avec succès:', collaborateurRef.id)

    // Vérifier que le document a été créé
    const docSnapshot = await getDoc(collaborateurRef)
    if (docSnapshot.exists()) {
      console.log('✅ Document vérifié dans Firestore:', docSnapshot.data())
    } else {
      console.error('❌ Document non trouvé après création')
    }

    // Test modification
    const updateData = {
      phone: '+41 78 987 65 43',
      updatedAt: serverTimestamp(),
      updatedBy: userId,
      version: 2
    }

    await setDoc(collaborateurRef, updateData, { merge: true })
    console.log('✅ Collaborateur modifié avec succès')

    // Vérifier la modification
    const updatedSnapshot = await getDoc(collaborateurRef)
    if (updatedSnapshot.exists()) {
      console.log('✅ Modification vérifiée:', updatedSnapshot.data())
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
    
    if (error.code) {
      console.error('Code d\'erreur Firebase:', error.code)
    }
    if (error.message) {
      console.error('Message d\'erreur:', error.message)
    }
  }
}

testSaveCollaborateur()
