const { initializeApp } = require('firebase/app')
const { getDatabase, ref, set, connectDatabaseEmulator } = require('firebase/database')

// Configuration pour l'émulateur
const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "keydispo-dev.firebaseapp.com",
  databaseURL: "http://127.0.0.1:9000?ns=keydispo-dev-default-rtdb",
  projectId: "keydispo-dev"
}

console.log('🔧 Création de données test RTDB...')

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

// Connecter à l'émulateur
connectDatabaseEmulator(database, 'localhost', 9000)

function generateCollaborateurId(nom, prenom, email) {
  const nomClean = (nom || '').replace(/[^a-zA-Z0-9]/g, '_')
  const prenomClean = (prenom || '').replace(/[^a-zA-Z0-9]/g, '_')
  const emailClean = (email || '').replace(/[^a-zA-Z0-9@.]/g, '_')
  return `${nomClean}_${prenomClean}_${emailClean}`
}

async function createTestData() {
  try {
    const tenantId = 'keydispo'
    
    // Données de test
    const testDispos = [
      {
        id: 'test_1',
        tenantId: tenantId,
        collaborateurId: generateCollaborateurId('Dupont', 'Jean', 'jean.dupont@example.com'),
        nom: 'Dupont',
        prenom: 'Jean',
        metier: 'Développeur',
        phone: '0123456789',
        email: 'jean.dupont@example.com',
        ville: 'Paris',
        date: '2025-08-29',
        lieu: 'Bureau',
        heure_debut: '09:00',
        heure_fin: '17:00',
        version: 1,
        updatedAt: Date.now(),
        updatedBy: 'test'
      },
      {
        id: 'test_2',
        tenantId: tenantId,
        collaborateurId: generateCollaborateurId('Martin', 'Marie', 'marie.martin@example.com'),
        nom: 'Martin',
        prenom: 'Marie',
        metier: 'Designer',
        phone: '0123456788',
        email: 'marie.martin@example.com',
        ville: 'Lyon',
        date: '2025-08-29',
        lieu: 'Domicile',
        heure_debut: '08:00',
        heure_fin: '16:00',
        version: 1,
        updatedAt: Date.now(),
        updatedBy: 'test'
      },
      {
        id: 'test_3',
        tenantId: tenantId,
        collaborateurId: generateCollaborateurId('Dubois', 'Pierre', 'pierre.dubois@example.com'),
        nom: 'Dubois',
        prenom: 'Pierre',
        metier: 'Manager',
        phone: '0123456787',
        email: 'pierre.dubois@example.com',
        ville: 'Marseille',
        date: '2025-08-30',
        lieu: 'Bureau',
        heure_debut: '10:00',
        heure_fin: '18:00',
        version: 1,
        updatedAt: Date.now(),
        updatedBy: 'test'
      }
    ]
    
    console.log(`📊 Création de ${testDispos.length} disponibilités de test...`)
    
    // Utiliser le bon chemin avec tenant
    const disposRef = ref(database, `tenants/${tenantId}/disponibilites`)
    
    // Créer un objet avec les IDs comme clés
    const dataToSave = {}
    testDispos.forEach(dispo => {
      dataToSave[dispo.id] = dispo
    })
    
    await set(disposRef, dataToSave)
    
    console.log('✅ Données de test créées dans RTDB!')
    console.log(`📍 Chemin: tenants/${tenantId}/disponibilites`)
    console.log('📋 Exemples:', testDispos.map(d => ({
      id: d.id,
      collaborateurId: d.collaborateurId,
      nom: d.nom,
      prenom: d.prenom,
      date: d.date
    })))
    
  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }
}

createTestData().then(() => {
  console.log('🎉 Données de test créées!')
  process.exit(0)
})
