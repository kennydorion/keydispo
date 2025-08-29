const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs, connectFirestoreEmulator } = require('firebase/firestore')
const { getDatabase, ref, set, connectDatabaseEmulator, get } = require('firebase/database')

// Configuration pour l'émulateur
const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "keydispo-dev.firebaseapp.com",
  databaseURL: "http://127.0.0.1:9000?ns=keydispo-dev-default-rtdb",
  projectId: "keydispo-dev",
  storageBucket: "keydispo-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "fake-app-id"
}

console.log('🔧 Migration sur émulateur...')

const app = initializeApp(firebaseConfig)
const firestore = getFirestore(app)
const database = getDatabase(app)

// Connecter aux émulateurs
connectFirestoreEmulator(firestore, 'localhost', 8080)
connectDatabaseEmulator(database, 'localhost', 9000)

function generateCollaborateurId(nom, prenom, email) {
  const nomClean = (nom || '').replace(/[^a-zA-Z0-9]/g, '_')
  const prenomClean = (prenom || '').replace(/[^a-zA-Z0-9]/g, '_')
  const emailClean = (email || '').replace(/[^a-zA-Z0-9@.]/g, '_')
  return `${nomClean}_${prenomClean}_${emailClean}`
}

async function migrateData() {
  try {
    console.log('📥 Récupération des disponibilités depuis Firestore...')
    
    const disposQuery = collection(firestore, 'dispos')
    const disposSnapshot = await getDocs(disposQuery)
    
    console.log(`📊 ${disposSnapshot.size} disponibilités trouvées dans Firestore`)
    
    if (disposSnapshot.empty) {
      console.log('⚠️ Aucune donnée à migrer')
      return
    }
    
    // Vérifier si RTDB a déjà des données
    const rtdbRef = ref(database, 'dispos')
    const rtdbSnapshot = await get(rtdbRef)
    
    if (rtdbSnapshot.exists()) {
      console.log('⚠️ RTDB contient déjà des données:')
      const existingData = rtdbSnapshot.val()
      console.log(`   - ${Object.keys(existingData).length} entrées existantes`)
      console.log('🔄 Suppression des données existantes...')
      await set(rtdbRef, null)
    }
    
    console.log('💾 Migration vers RTDB...')
    let migratedCount = 0
    
    for (const doc of disposSnapshot.docs) {
      const data = doc.data()
      
      // Générer l'ID collaborateur consistant
      const collaborateurId = generateCollaborateurId(data.nom, data.prenom, data.email)
      
      const rtdbData = {
        id: doc.id,
        tenantId: data.tenantId || 'keydispo',
        collaborateurId: collaborateurId,
        nom: data.nom || '',
        prenom: data.prenom || '',
        metier: data.metier || '',
        phone: data.phone || '',
        email: data.email || '',
        ville: data.ville || '',
        date: data.date || '',
        lieu: data.lieu || '',
        heure_debut: data.heure_debut || '',
        heure_fin: data.heure_fin || '',
        version: data.version || 1,
        updatedAt: data.updatedAt?.toMillis() || Date.now(),
        updatedBy: data.updatedBy || 'migration'
      }
      
      // Sauvegarder dans RTDB avec l'ID du document comme clé
      await set(ref(database, `dispos/${doc.id}`), rtdbData)
      migratedCount++
      
      if (migratedCount % 50 === 0) {
        console.log(`📊 ${migratedCount}/${disposSnapshot.size} migrées...`)
      }
    }
    
    console.log(`✅ Migration terminée: ${migratedCount} disponibilités migrées vers RTDB`)
    
    // Vérification finale
    const finalCheck = await get(rtdbRef)
    if (finalCheck.exists()) {
      const finalData = finalCheck.val()
      console.log(`🔍 Vérification: ${Object.keys(finalData).length} entrées dans RTDB`)
      
      // Afficher un exemple
      const exemple = Object.values(finalData)[0]
      console.log('📋 Exemple de données migrées:', {
        id: exemple.id,
        collaborateurId: exemple.collaborateurId,
        nom: exemple.nom,
        prenom: exemple.prenom,
        date: exemple.date
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  }
}

migrateData().then(() => {
  console.log('🎉 Migration terminée avec succès!')
  process.exit(0)
})
