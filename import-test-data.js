const { initializeApp } = require('firebase/app')
const { getFirestore, connectFirestoreEmulator, collection, doc, setDoc, writeBatch } = require('firebase/firestore')

// Configuration Firebase pour émulateur
const firebaseConfig = {
  projectId: "engaged-truth-467420-e5"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Connecter à l'émulateur
try {
  connectFirestoreEmulator(db, 'localhost', 8081)
  console.log('✅ Connecté à l\'émulateur Firestore')
} catch (error) {
  console.log('⚠️ Émulateur déjà connecté')
}

// Fonction pour créer des données de test
async function createTestData() {
  const tenantId = 'keydispo'
  const batch = writeBatch(db)
  
  console.log('🚀 Création de données de test...')
  
  // Créer le tenant
  const tenantRef = doc(db, 'tenants', tenantId)
  batch.set(tenantRef, {
    name: 'KeyDispo Demo',
    createdAt: new Date(),
    settings: {
      allowAutoImport: true,
      defaultView: 'matrix'
    }
  })
  
  // Collaborateurs de test
  const collaborateurs = [
    { nom: 'Dupont', prenom: 'Jean', metier: 'EDUC', ville: 'Lyon', email: 'jean.dupont@test.com', phone: '0123456789' },
    { nom: 'Martin', prenom: 'Sophie', metier: 'TECH', ville: 'Paris', email: 'sophie.martin@test.com', phone: '0987654321' },
    { nom: 'Bernard', prenom: 'Pierre', metier: 'ADMIN', ville: 'Marseille', email: 'pierre.bernard@test.com', phone: '0147258369' },
    { nom: 'Dubois', prenom: 'Marie', metier: 'EDUC', ville: 'Lyon', email: 'marie.dubois@test.com', phone: '0369852147' },
    { nom: 'Morel', prenom: 'Paul', metier: 'TECH', ville: 'Toulouse', email: 'paul.morel@test.com', phone: '0258147963' }
  ]
  
  // Créer collaborateurs
  collaborateurs.forEach((collab, index) => {
    const collabId = `collab-${index + 1}`
    const collabRef = doc(db, 'tenants', tenantId, 'collaborateurs', collabId)
    batch.set(collabRef, {
      ...collab,
      tenantId,
      actif: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  })
  
  // Créer des disponibilités pour la semaine
  const today = new Date()
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  collaborateurs.forEach((collab, collabIndex) => {
    dates.forEach((date, dateIndex) => {
      if (Math.random() > 0.3) { // 70% de chance d'avoir une disponibilité
        const dispoId = `${collabIndex}-${dateIndex}`
        const dispoRef = doc(db, 'tenants', tenantId, 'collaborateurs', `collab-${collabIndex + 1}`, 'disponibilites', date)
        batch.set(dispoRef, {
          tenantId,
          nom: collab.nom,
          prenom: collab.prenom,
          metier: collab.metier,
          ville: collab.ville,
          email: collab.email,
          phone: collab.phone,
          date,
          lieu: ['Centre-ville', 'Banlieue', 'Zone industrielle'][Math.floor(Math.random() * 3)],
          heure_debut: ['08:00', '09:00', '10:00'][Math.floor(Math.random() * 3)],
          heure_fin: ['16:00', '17:00', '18:00'][Math.floor(Math.random() * 3)],
          version: 1,
          updatedAt: new Date(),
          updatedBy: 'test-script'
        })
      }
    })
  })
  
  await batch.commit()
  console.log('✅ Données de test créées avec succès!')
  console.log(`👥 ${collaborateurs.length} collaborateurs créés`)
  console.log(`📅 Disponibilités créées pour ${dates.length} jours`)
}

// Exécuter
createTestData().catch(console.error)
