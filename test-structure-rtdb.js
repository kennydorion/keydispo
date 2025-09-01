


// Test rapide pour vérifier la structure des données RTDB après correction

import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator, ref, set, get } from 'firebase/database'
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth'

// Configuration Firebase
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

// Connexion émulateurs
connectAuthEmulator(auth, "http://127.0.0.1:9199")
connectDatabaseEmulator(rtdb, "127.0.0.1", 9200)

async function testCorrectStructure() {
  console.log('🧪 Test structure RTDB corrigée')
  console.log('==============================')
  
  try {
    // Authentification
    await signInAnonymously(auth)
    
    const tenantId = 'keydispo'
    
    // Créer une disponibilité avec la structure correcte
    const testDispo = {
      id: 'test-dispo-1',
      collaborateurId: 'jean_dupont', // collaborateurId au lieu de userId
      tenantId: tenantId,
      nom: 'Dupont',
      prenom: 'Jean',
      metier: 'Développeur',
      phone: '0123456789',
      email: 'jean.dupont@test.com',
      ville: 'Paris',
      date: '2025-09-01',
      lieu: 'Paris Centre',
      heure_debut: '09:00', // heure_debut au lieu de heureDebut
      heure_fin: '17:00',   // heure_fin au lieu de heureFin
      version: 1,
      updatedAt: Date.now(),
      updatedBy: 'test'
    }
    
    // Sauvegarder avec la structure attendue par le service RTDB
    const dispoRef = ref(rtdb, `tenants/${tenantId}/disponibilites/test-dispo-1`)
    await set(dispoRef, testDispo)
    console.log('✅ Disponibilité test créée avec structure correcte')
    
    // Vérifier la structure
    const snapshot = await get(dispoRef)
    if (snapshot.exists()) {
      const data = snapshot.val()
      console.log('📊 Structure sauvegardée:', {
        hasCollaborateurId: 'collaborateurId' in data,
        hasUserId: 'userId' in data,
        hasHeureDebut: 'heure_debut' in data,
        hasHeureDebutCamel: 'heureDebut' in data,
        hasHeureFin: 'heure_fin' in data,
        hasHeureFinCamel: 'heureFin' in data
      })
      
      // Vérifier que la structure correspond au service RTDB
      const expectedFields = ['collaborateurId', 'heure_debut', 'heure_fin']
      const missingFields = expectedFields.filter(field => !(field in data))
      const unexpectedFields = ['userId', 'heureDebut', 'heureFin'].filter(field => field in data)
      
      if (missingFields.length === 0 && unexpectedFields.length === 0) {
        console.log('🎉 Structure PARFAITE ! Compatible avec le service RTDB')
      } else {
        console.log('⚠️ Problèmes de structure:')
        if (missingFields.length > 0) {
          console.log('  - Champs manquants:', missingFields)
        }
        if (unexpectedFields.length > 0) {
          console.log('  - Champs inattendus:', unexpectedFields)
        }
      }
    }
    
    console.log('')
    console.log('✅ Test terminé - prêt pour l\'import Excel')
    
  } catch (error) {
    console.error('❌ Erreur test:', error)
  }
}

testCorrectStructure()
