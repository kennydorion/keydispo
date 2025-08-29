/**
 * Script pour créer des données de test dans RTDB  
 * Version compatible Node.js
 */

const { initializeApp } = require('firebase/app')
const { getDatabase, connectDatabaseEmulator, ref: rtdbRef, set: rtdbSet } = require('firebase/database')
const { getAuth, connectAuthEmulator } = require('firebase/auth')

// Configuration Firebase pour émulateurs
const firebaseConfig = {
  apiKey: "test",
  authDomain: "test.firebaseapp.com", 
  projectId: "engaged-truth-467420-e5",
  databaseURL: "http://localhost:9000?ns=engaged-truth-467420-e5-default-rtdb",
  storageBucket: "test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:test"
}

console.log('🚀 Initialisation Firebase...')
const app = initializeApp(firebaseConfig)
const rtdb = getDatabase(app)
const auth = getAuth(app)

// Connecter aux émulateurs
try {
  connectDatabaseEmulator(rtdb, 'localhost', 9000)
  connectAuthEmulator(auth, 'http://localhost:9099')
  console.log('✅ Connecté aux émulateurs RTDB et Auth')
} catch (error) {
  console.log('⚠️ Émulateurs déjà connectés ou erreur:', error.message)
}

const tenantId = 'keydispo'

// Données de test
const collaborateurs = [
  { id: 'collab-1', nom: 'Dupont', prenom: 'Jean', metier: 'EDUC' },
  { id: 'collab-2', nom: 'Martin', prenom: 'Sophie', metier: 'TECH' },
  { id: 'collab-3', nom: 'Bernard', prenom: 'Paul', metier: 'ADMIN' }
]

async function createTestData() {
  console.log('📝 Création des données de test RTDB...')
  
  try {
    // Créer des disponibilités pour les 7 prochains jours
    const today = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      
      for (const collab of collaborateurs) {
        // Créer 1-2 disponibilités par collaborateur par jour
        const nbDispos = Math.floor(Math.random() * 2) + 1
        
        for (let j = 0; j < nbDispos; j++) {
          const dispoId = `dispo-${collab.id}-${dateStr}-${j}`
          
          const disponibilite = {
            id: dispoId,
            collaborateurId: collab.id,
            tenantId: tenantId,
            nom: collab.nom,
            prenom: collab.prenom,
            metier: collab.metier,
            phone: '+33.6.12.34.56.78',
            email: `${collab.prenom.toLowerCase()}.${collab.nom.toLowerCase()}@example.com`,
            ville: 'Lyon',
            date: dateStr,
            lieu: j === 0 ? 'Bureau' : 'Terrain',
            heure_debut: j === 0 ? '08:30' : '14:00',
            heure_fin: j === 0 ? '12:30' : '18:00',
            type: 'standard',
            timeKind: 'flexible',
            slots: [],
            isFullDay: false,
            version: 1,
            updatedAt: Date.now(),
            updatedBy: 'test-script'
          }
          
          // Écrire dans RTDB
          const dispoRef = rtdbRef(rtdb, `tenants/${tenantId}/disponibilites/${dispoId}`)
          await rtdbSet(dispoRef, disponibilite)
          
          console.log(`✅ Créé: ${collab.prenom} ${collab.nom} - ${dateStr} - ${disponibilite.lieu}`)
        }
      }
    }
    
    console.log('')
    console.log('🎉 Données de test créées avec succès!')
    console.log(`📊 Total: ${collaborateurs.length} collaborateurs x 7 jours x ~1.5 dispos = ${Math.floor(collaborateurs.length * 7 * 1.5)} disponibilités`)
    console.log('')
    console.log('🔍 Pour vérifier dans Firebase Console:')
    console.log(`   Chemin: tenants/${tenantId}/disponibilites/`)
    console.log('')
    console.log('🧪 Pour tester dans l\'app:')
    console.log('   1. Recharger l\'application')
    console.log('   2. Vérifier que les cellules contiennent des données')
    console.log('   3. Utiliser la console dev pour débugger si nécessaire')
    
  } catch (error) {
    console.error('❌ Erreur création données:', error)
  }
}

// Exécuter le script
createTestData().then(() => {
  console.log('✅ Script terminé')
  process.exit(0)
}).catch(error => {
  console.error('❌ Erreur:', error)
  process.exit(1)
})
