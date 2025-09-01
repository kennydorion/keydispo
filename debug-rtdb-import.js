// Test debug de l'import RTDB pour identifier le problème

import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator, ref, set, get } from 'firebase/database'
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth'

// Configuration Firebase identique
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

async function debugRTDBImport() {
  console.log('🔍 DEBUG IMPORT RTDB')
  console.log('===================')
  
  try {
    // 1. Test authentification
    console.log('1️⃣ Test authentification...')
    await signInAnonymously(auth)
    console.log('✅ Authentification réussie')
    
    // 2. Test écriture simple
    console.log('2️⃣ Test écriture simple...')
    const testRef = ref(rtdb, 'test/simple')
    await set(testRef, { message: 'Hello RTDB!', timestamp: Date.now() })
    console.log('✅ Écriture simple réussie')
    
    // 3. Test lecture
    console.log('3️⃣ Test lecture...')
    const snapshot = await get(testRef)
    if (snapshot.exists()) {
      console.log('✅ Lecture réussie:', snapshot.val())
    } else {
      console.log('❌ Aucune donnée trouvée')
    }
    
    // 4. Test structure tenant
    console.log('4️⃣ Test structure tenant...')
    const tenantId = 'keydispo'
    
    // Test collaborateur
    const collabRef = ref(rtdb, `tenants/${tenantId}/collaborateurs/test-collab-1`)
    await set(collabRef, {
      nom: 'Test',
      prenom: 'User',
      metier: 'Développeur',
      phone: '0123456789',
      email: 'test@example.com',
      ville: 'Paris'
    })
    console.log('✅ Collaborateur test créé')
    
    // Test disponibilité
    const dispoRef = ref(rtdb, `tenants/${tenantId}/disponibilites/test-dispo-1`)
    await set(dispoRef, {
      tenantId: tenantId,
      userId: 'test-collab-1',
      nom: 'Test',
      prenom: 'User',
      metier: 'Développeur',
      phone: '0123456789',
      email: 'test@example.com',
      ville: 'Paris',
      date: '2024-01-15',
      lieu: 'Paris Centre',
      heureDebut: '09:00',
      heureFin: '17:00',
      version: 1,
      updatedAt: Date.now(),
      updatedBy: 'debug-test'
    })
    console.log('✅ Disponibilité test créée')
    
    // 5. Vérification structure complète
    console.log('5️⃣ Vérification structure...')
    const rootSnapshot = await get(ref(rtdb))
    if (rootSnapshot.exists()) {
      const data = rootSnapshot.val()
      console.log('✅ Structure RTDB:', Object.keys(data))
      
      if (data.tenants && data.tenants[tenantId]) {
        console.log('✅ Tenant trouvé:', Object.keys(data.tenants[tenantId]))
      }
    }
    
    console.log('🎉 DEBUG terminé avec succès')
    
  } catch (error) {
    console.error('❌ Erreur debug:', error)
  }
}

// Exécution
debugRTDBImport()
