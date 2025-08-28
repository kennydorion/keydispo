import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

// Configuration Firebase (émulateur)
const firebaseConfig = {
  projectId: 'demo-project',
  authDomain: 'demo-project.firebaseapp.com',
  storageBucket: 'demo-project.appspot.com',
}

// Utiliser l'émulateur
import { connectFirestoreEmulator } from 'firebase/firestore'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Connecter à l'émulateur local
if (!db._settings?.host || db._settings.host === 'firestore.googleapis.com') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080)
    console.log('🔧 Connecté à l\'émulateur Firestore')
  } catch (error) {
    console.log('⚠️ Émulateur déjà connecté ou erreur:', error.message)
  }
}

async function createOvernightTestData() {
  try {
    console.log('🌙 Création de données de test overnight...')
    
    const testData = [
      {
        tenantId: 'test',
        collaborateurId: 'collab-1',
        nom: 'Dupont',
        prenom: 'Jean',
        metier: 'Infirmier',
        phone: '0123456789',
        email: 'jean.dupont@test.com',
        ville: 'Paris',
        date: '2025-08-26', // Aujourd'hui
        lieu: 'Hôpital Saint-Louis',
        heure_debut: '22:00',
        heure_fin: '06:00', // Fin le lendemain - overnight
        type: 'mission',
        timeKind: 'overnight',
        version: 1,
        updatedAt: new Date(),
        updatedBy: 'test-user'
      },
      {
        tenantId: 'test',
        collaborateurId: 'collab-2',
        nom: 'Martin',
        prenom: 'Sophie',
        metier: 'Aide-soignante',
        phone: '0123456790',
        email: 'sophie.martin@test.com',
        ville: 'Lyon',
        date: '2025-08-27', // Demain
        lieu: 'DISPONIBLE',
        heure_debut: '20:00',
        heure_fin: '04:00', // Fin le jour d'après - overnight disponibilité
        type: 'disponible',
        timeKind: 'overnight',
        version: 1,
        updatedAt: new Date(),
        updatedBy: 'test-user'
      },
      {
        tenantId: 'test',
        collaborateurId: 'collab-3',
        nom: 'Leroy',
        prenom: 'Paul',
        metier: 'Médecin',
        phone: '0123456791',
        email: 'paul.leroy@test.com',
        ville: 'Marseille',
        date: '2025-08-25', // Hier
        lieu: 'Clinique du Soleil',
        heure_debut: '23:30',
        heure_fin: '07:30', // Format legacy - sera détecté automatiquement
        type: 'mission',
        timeKind: 'range', // Pas marqué comme overnight, devrait être détecté
        version: 1,
        updatedAt: new Date(),
        updatedBy: 'test-user'
      }
    ]
    
    for (const dispo of testData) {
      const docRef = await addDoc(collection(db, 'tenants/test/dispos'), dispo)
      console.log(`✅ Créé dispo overnight: ${dispo.prenom} ${dispo.nom} (${dispo.heure_debut}-${dispo.heure_fin}) - ID: ${docRef.id}`)
    }
    
    console.log('🎉 Données de test overnight créées avec succès!')
    console.log('📊 Résumé:')
    console.log('- Mission overnight 26/08 22h-06h (Jean Dupont)')
    console.log('- Disponibilité overnight 27/08 20h-04h (Sophie Martin)')  
    console.log('- Mission legacy overnight 25/08 23h30-07h30 (Paul Leroy)')
    
  } catch (error) {
    console.error('❌ Erreur création données test:', error)
  }
}

createOvernightTestData()
