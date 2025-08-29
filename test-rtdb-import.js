/**
 * Test de l'import RTDB avec données de test
 */

const { initializeApp } = require('firebase/app')
const { getDatabase, ref, set, get, connectDatabaseEmulator } = require('firebase/database')
const XLSX = require('xlsx')

// Configuration Firebase pour les émulateurs
const firebaseConfig = {
  projectId: 'keydispo-ec1ba',
  databaseURL: 'http://127.0.0.1:9000?ns=keydispo-dev-default-rtdb'
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

// Connecter à l'émulateur RTDB
try {
  connectDatabaseEmulator(database, '127.0.0.1', 9000)
  console.log('🔗 Connecté à l\'émulateur RTDB')
} catch (error) {
  console.log('⚠️ Émulateur déjà connecté')
}

async function testRTDBImport() {
  try {
    console.log('🧪 Test de l\'import RTDB')
    
    const tenantId = 'keydispo'
    
    // Données de test
    const testData = [
      {
        nom: 'Martin',
        prenom: 'Jean',
        metier: 'Serveur',
        phone: '0123456789',
        email: 'jean.martin@test.com',
        ville: 'Paris',
        date: '2024-01-15',
        lieu: 'Restaurant Le Gourmet',
        heure_debut: '18:00',
        heure_fin: '02:00'
      },
      {
        nom: 'Dubois',
        prenom: 'Marie',
        metier: 'Barman',
        phone: '0987654321',
        email: 'marie.dubois@test.com',
        ville: 'Lyon',
        date: '2024-01-15',
        lieu: 'Bar Central',
        heure_debut: '20:00',
        heure_fin: '04:00'
      }
    ]
    
    console.log('📝 Données à importer:', testData.length, 'enregistrements')
    
    // Import des données
    for (let i = 0; i < testData.length; i++) {
      const item = testData[i]
      const dispoId = `dispo_${Date.now()}_${i}`
      
      const dispoData = {
        ...item,
        tenantId,
        version: 1,
        updatedAt: new Date().toISOString(),
        updatedBy: 'test-import'
      }
      
      const dispoRef = ref(database, `tenants/${tenantId}/dispos/${dispoId}`)
      await set(dispoRef, dispoData)
      
      console.log(`✅ Importé: ${item.prenom} ${item.nom} - ${item.date}`)
    }
    
    // Vérification des données importées
    const disposRef = ref(database, `tenants/${tenantId}/dispos`)
    const snapshot = await get(disposRef)
    
    if (snapshot.exists()) {
      const dispos = snapshot.val()
      const count = Object.keys(dispos).length
      console.log(`🎉 Import réussi ! ${count} disponibilités trouvées dans RTDB`)
      
      // Afficher quelques exemples
      Object.values(dispos).slice(0, 2).forEach(dispo => {
        console.log(`   📋 ${dispo.prenom} ${dispo.nom} - ${dispo.date} (${dispo.lieu})`)
      })
    } else {
      console.log('❌ Aucune donnée trouvée dans RTDB')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  }
}

// Lancer le test
testRTDBImport()
