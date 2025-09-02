// Script simple pour vérifier les données avec la vraie config
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, collection, getDocs } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator, ref, get } from 'firebase/database'

// Configuration pour émulateur
const firebaseConfig = {
  projectId: 'keydispo-dev'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const rtdb = getDatabase(app)

// Connexion émulateurs
try {
  connectFirestoreEmulator(db, '127.0.0.1', 8180)
  connectDatabaseEmulator(rtdb, '127.0.0.1', 9200)
} catch (e) {
  console.log('Émulateurs déjà connectés')
}

async function checkData() {
  try {
    console.log('🔍 Vérification des collaborateurs...')
    
    // Vérifier RTDB d'abord  
    console.log('\n=== RTDB ===')
    const rtdbRef = ref(rtdb, 'tenants/keydispo/collaborateurs')
    const rtdbSnapshot = await get(rtdbRef)
    
    if (rtdbSnapshot.exists()) {
      const rtdbData = rtdbSnapshot.val()
      console.log(`✅ RTDB: ${Object.keys(rtdbData).length} collaborateurs`)
      Object.keys(rtdbData).slice(0, 3).forEach(key => {
        const c = rtdbData[key]
        console.log(`   - ${c.nom} ${c.prenom} (${c.metier})`)
      })
    } else {
      console.log('❌ RTDB: Aucun collaborateur')
    }
    
    // Vérifier Firestore
    console.log('\n=== Firestore ===')
    const firestoreSnapshot = await getDocs(collection(db, 'tenants/keydispo/collaborateurs'))
    
    if (!firestoreSnapshot.empty) {
      console.log(`✅ Firestore: ${firestoreSnapshot.size} collaborateurs`)
      firestoreSnapshot.docs.slice(0, 3).forEach(doc => {
        const d = doc.data()
        console.log(`   - ${d.nom} ${d.prenom} (${d.metier})`)
      })
    } else {
      console.log('❌ Firestore: Aucun collaborateur')
    }
    
    // Vérifier ancienne collection dispos
    console.log('\n=== Collection dispos ===')
    const disposSnapshot = await getDocs(collection(db, 'dispos'))
    console.log(`📊 ${disposSnapshot.size} documents dans dispos`)
    
    if (disposSnapshot.size > 0) {
      const collaborateurs = new Set()
      disposSnapshot.docs.slice(0, 10).forEach(doc => {
        const d = doc.data()
        if (d.tenantId === 'keydispo') {
          collaborateurs.add(`${d.nom} ${d.prenom}`)
        }
      })
      console.log(`   - ${collaborateurs.size} collaborateurs uniques pour tenant keydispo:`)
      Array.from(collaborateurs).slice(0, 5).forEach(name => {
        console.log(`     ${name}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

checkData().then(() => process.exit(0))
