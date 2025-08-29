/**
 * Test complet d'import RTDB avec clés problématiques
 */

const { initializeApp } = require('firebase/app')
const { getDatabase, ref, set, get, connectDatabaseEmulator, remove } = require('firebase/database')

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

// Fonction slugify corrigée (copie de importToRTDB.ts)
function slugify(nom, prenom) {
  const clean = (str) => str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  
  const result = `${clean(nom)}_${clean(prenom)}`
  
  // Firebase RTDB n'aime pas les clés qui commencent par un chiffre
  if (/^\d/.test(result)) {
    return `c${result}`
  }
  
  return result
}

async function testProblematicKeys() {
  try {
    console.log('🧪 Test d\'import RTDB avec clés problématiques')
    
    const tenantId = 'test'
    
    // Nettoyage préalable
    const tenantRef = ref(database, `tenants/${tenantId}`)
    await remove(tenantRef)
    console.log('🧹 Données de test nettoyées')
    
    // Données de test avec cas problématiques
    const testCollaborateurs = [
      { nom: '11', prenom: 'Allan' },           // Commence par chiffre
      { nom: 'Dupont', prenom: 'Jean' },        // Normal
      { nom: '2024', prenom: 'Test' },          // Commence par chiffre
      { nom: 'Smith', prenom: 'O\'Connor' },    // Apostrophe
      { nom: 'van-der', prenom: 'Berg' }        // Tirets
    ]
    
    console.log('📝 Données à importer:', testCollaborateurs.length, 'collaborateurs')
    
    // Test des clés générées
    console.log('🔑 Clés générées:')
    testCollaborateurs.forEach(collab => {
      const slug = slugify(collab.nom, collab.prenom)
      console.log(`   ${collab.nom} ${collab.prenom} → "${slug}"`)
    })
    
    // Import individuel pour éviter les problèmes de chemin
    console.log('📤 Import en cours...')
    for (const collab of testCollaborateurs) {
      const slug = slugify(collab.nom, collab.prenom)
      const collabRef = ref(database, `tenants/${tenantId}/collaborateurs/${slug}`)
      
      await set(collabRef, {
        id: slug,
        tenantId,
        nom: collab.nom,
        prenom: collab.prenom,
        metier: 'Test',
        phone: null,
        email: null,
        ville: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }
    
    // Vérification
    const collaborateursRef = ref(database, `tenants/${tenantId}/collaborateurs`)
    const snapshot = await get(collaborateursRef)
    
    if (snapshot.exists()) {
      const collaborateurs = snapshot.val()
      const count = Object.keys(collaborateurs).length
      console.log(`🎉 Import réussi ! ${count} collaborateurs trouvés dans RTDB`)
      
      Object.entries(collaborateurs).forEach(([key, collab]) => {
        console.log(`   ✅ ${key}: ${collab.prenom} ${collab.nom}`)
      })
    } else {
      console.log('❌ Aucune donnée trouvée dans RTDB')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Lancer le test
testProblematicKeys()
