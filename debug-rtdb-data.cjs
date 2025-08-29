/**
 * Test de debug pour vérifier les données RTDB
 */

const { initializeApp } = require('firebase/app')
const { getDatabase, ref, get, connectDatabaseEmulator } = require('firebase/database')

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

async function debugRTDBData() {
  try {
    const tenantId = 'keydispo'
    
    console.log('🔍 Vérification des données RTDB...')
    
    // Vérifier les collaborateurs
    const collaborateursRef = ref(database, `tenants/${tenantId}/collaborateurs`)
    const collabSnapshot = await get(collaborateursRef)
    
    if (collabSnapshot.exists()) {
      const collaborateurs = collabSnapshot.val()
      const collabCount = Object.keys(collaborateurs).length
      console.log(`👥 ${collabCount} collaborateurs trouvés dans RTDB:`)
      
      Object.entries(collaborateurs).slice(0, 3).forEach(([id, collab]) => {
        console.log(`   - ${id}: ${collab.prenom} ${collab.nom} (${collab.metier})`)
      })
    } else {
      console.log('👥 Aucun collaborateur trouvé dans RTDB')
    }
    
    // Vérifier les disponibilités  
    const disposRef = ref(database, `tenants/${tenantId}/disponibilites`)
    const disposSnapshot = await get(disposRef)
    
    if (disposSnapshot.exists()) {
      const disponibilites = disposSnapshot.val()
      const disposCount = Object.keys(disponibilites).length
      console.log(`📅 ${disposCount} disponibilités trouvées dans RTDB:`)
      
      Object.entries(disponibilites).slice(0, 3).forEach(([id, dispo]) => {
        console.log(`   - ${id}: ${dispo.prenom} ${dispo.nom} - ${dispo.date} (${dispo.lieu})`)
      })
    } else {
      console.log('📅 Aucune disponibilité trouvée dans RTDB')
    }
    
    // Vérifier la structure générale
    const tenantRef = ref(database, `tenants/${tenantId}`)
    const tenantSnapshot = await get(tenantRef)
    
    if (tenantSnapshot.exists()) {
      const tenantData = tenantSnapshot.val()
      console.log('🏢 Structure tenant:', Object.keys(tenantData))
    } else {
      console.log('🏢 Aucune donnée tenant trouvée')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du debug:', error)
  }
}

// Lancer le debug
debugRTDBData()
