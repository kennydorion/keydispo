// Test rapide d'import RTDB avec données réduites
// Pour valider que la correction fonctionne avant de relancer l'import complet

import { createApp } from 'vue'
import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth'
import { importToRTDB } from './src/utils/importToRTDBDirect.ts'

// Configuration Firebase (identique à main.ts)
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

// Connexion aux émulateurs
connectAuthEmulator(auth, "http://127.0.0.1:9199")
connectDatabaseEmulator(rtdb, "127.0.0.1", 9200)

// Données de test réduites (seulement 3 collaborateurs, 6 disponibilités)
const testData = {
  collaborateurs: [
    {
      id: "test-collab-1",
      nom: "Dupont",
      prenom: "Jean",
      metier: "Développeur",
      phone: "0123456789",
      email: "jean.dupont@test.com",
      ville: "Paris"
    },
    {
      id: "test-collab-2", 
      nom: "Martin",
      prenom: "Marie",
      metier: "Designer",
      phone: "0123456788",
      email: "marie.martin@test.com",
      ville: "Lyon"
    },
    {
      id: "test-collab-3",
      nom: "Bernard",
      prenom: "Paul",
      metier: "Chef de projet",
      phone: "0123456787",
      email: "paul.bernard@test.com",
      ville: "Marseille"
    }
  ],
  disponibilites: [
    {
      id: "test-dispo-1",
      userId: "test-collab-1",
      tenantId: "test-tenant",
      nom: "Dupont",
      prenom: "Jean",
      metier: "Développeur",
      phone: "0123456789",
      email: "jean.dupont@test.com",
      ville: "Paris",
      date: "2024-01-15",
      lieu: "Paris Centre",
      heureDebut: "09:00",
      heureFin: "17:00"
    },
    {
      id: "test-dispo-2",
      userId: "test-collab-1",
      tenantId: "test-tenant",
      nom: "Dupont",
      prenom: "Jean",
      metier: "Développeur",
      phone: "0123456789",
      email: "jean.dupont@test.com",
      ville: "Paris",
      date: "2024-01-16",
      lieu: "Paris Centre",
      heureDebut: "09:00",
      heureFin: "17:00"
    },
    {
      id: "test-dispo-3",
      userId: "test-collab-2",
      tenantId: "test-tenant",
      nom: "Martin",
      prenom: "Marie",
      metier: "Designer",
      phone: "0123456788",
      email: "marie.martin@test.com",
      ville: "Lyon",
      date: "2024-01-15",
      lieu: "Lyon Centre",
      heureDebut: "10:00",
      heureFin: "18:00"
    },
    {
      id: "test-dispo-4",
      userId: "test-collab-2",
      tenantId: "test-tenant",
      nom: "Martin",
      prenom: "Marie",
      metier: "Designer",
      phone: "0123456788",
      email: "marie.martin@test.com",
      ville: "Lyon",
      date: "2024-01-16",
      lieu: "Lyon Centre",
      heureDebut: "10:00",
      heureFin: "18:00"
    },
    {
      id: "test-dispo-5",
      userId: "test-collab-3",
      tenantId: "test-tenant",
      nom: "Bernard",
      prenom: "Paul",
      metier: "Chef de projet",
      phone: "0123456787",
      email: "paul.bernard@test.com",
      ville: "Marseille",
      date: "2024-01-15",
      lieu: "Marseille Centre",
      heureDebut: "08:00",
      heureFin: "16:00"
    },
    {
      id: "test-dispo-6",
      userId: "test-collab-3",
      tenantId: "test-tenant",
      nom: "Bernard",
      prenom: "Paul",
      metier: "Chef de projet",
      phone: "0123456787",
      email: "paul.bernard@test.com",
      ville: "Marseille",
      date: "2024-01-16",
      lieu: "Marseille Centre",
      heureDebut: "08:00",
      heureFin: "16:00"
    }
  ]
}

async function testRTDBImport() {
  console.log('🧪 Test de l\'import RTDB avec données réduites')
  console.log('===============================================')
  
  try {
    // Authentification anonyme
    console.log('🔐 Authentification...')
    await signInAnonymously(auth)
    console.log('✅ Authentifié')
    
    // Test d'import
    console.log('📦 Lancement de l\'import...')
    
    const result = await importToRTDB(
      testData,
      'test-tenant',
      (phase, message) => {
        console.log(`[${phase}] ${message}`)
      }
    )
    
    console.log('✅ Import terminé avec succès !')
    console.log('📊 Résultats:', result)
    
    if (result.errors.length > 0) {
      console.log('⚠️ Erreurs détectées:')
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    } else {
      console.log('🎉 Aucune erreur détectée !')
    }
    
    console.log('')
    console.log('🔍 Pour vérifier les données dans RTDB:')
    console.log('   1. Ouvrez http://localhost:4000')
    console.log('   2. Allez dans l\'onglet Realtime Database')
    console.log('   3. Vérifiez les données sous collaborateurs/test-tenant/')
    console.log('   4. Vérifiez les données sous dispos/test-tenant/')
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  }
}

// Exécution du test
testRTDBImport()
