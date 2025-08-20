// Script pour créer des données de test dans les émulateurs
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// Configuration Firebase
const firebaseConfig = {
  apiKey: "test",
  authDomain: "test.firebaseapp.com", 
  projectId: "engaged-truth-467420-e5",
  storageBucket: "test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:test"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Connecter aux émulateurs
try {
  connectFirestoreEmulator(db, 'localhost', 8081)
  connectAuthEmulator(auth, 'http://localhost:9099')
  console.log('✅ Connecté aux émulateurs')
} catch (error) {
  console.log('⚠️ Émulateurs déjà connectés')
}

// Données de test
const collaborateurs = [
  {
    id: 'collab-1',
    tenantId: 'keydispo',
    nom: 'Dupont',
    prenom: 'Jean',
    metier: 'EDUC',
    email: 'jean.dupont@example.com',
    phone: '+33.6.12.34.56.78',
    ville: 'Lyon',
    actif: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'collab-2',
    tenantId: 'keydispo',
    nom: 'Martin',
    prenom: 'Sophie',
    metier: 'TECH',
    email: 'sophie.martin@example.com',
    phone: '+33.6.87.65.43.21',
    ville: 'Marseille',
    actif: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'collab-3',
    tenantId: 'keydispo',
    nom: 'Bernard',
    prenom: 'Pierre',
    metier: 'AS',
    email: 'pierre.bernard@example.com',
    phone: '+33.6.11.22.33.44',
    ville: 'Nice',
    actif: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// Disponibilités pour août 2025
const generateDisponibilites = () => {
  const dispos = []
  const startDate = new Date('2025-08-01')
  const endDate = new Date('2025-08-31')
  
  collaborateurs.forEach(collab => {
    const collaborateurDispos = new Map()
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayOfWeek = d.getDay()
      
      // Générer des disponibilités réalistes
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lundi à Vendredi
        if (Math.random() > 0.2) { // 80% de chance d'être disponible
          const dispoType = Math.random()
          let dispo
          
          if (dispoType < 0.6) {
            // Disponible toute la journée
            dispo = {
              date: dateStr,
              lieu: 'DISPO JOURNEE',
              heure_debut: null,
              heure_fin: null,
              statut: 'disponible'
            }
          } else if (dispoType < 0.8) {
            // Disponible sur un lieu spécifique
            const lieux = ['SOUS BALME', 'FOI YAMBA', 'FOJ OLAIA', 'CALANQUE']
            dispo = {
              date: dateStr,
              lieu: lieux[Math.floor(Math.random() * lieux.length)],
              heure_debut: '09:00',
              heure_fin: '17:00',
              statut: 'disponible'
            }
          } else {
            // Indisponible
            dispo = {
              date: dateStr,
              lieu: 'INDISPONIBLE',
              heure_debut: null,
              heure_fin: null,
              statut: 'indisponible'
            }
          }
          
          collaborateurDispos.set(dateStr, [dispo])
        }
      }
    }
    
    dispos.push({
      collaborateurId: collab.id,
      tenantId: 'keydispo',
      disponibilites: collaborateurDispos,
      version: 1,
      updatedAt: new Date(),
      updatedBy: 'test-script'
    })
  })
  
  return dispos
}

async function createTestData() {
  try {
    console.log('🚀 Création des données de test...')
    
    // 1. Créer les collaborateurs
    console.log('👥 Création des collaborateurs...')
    for (const collab of collaborateurs) {
      await setDoc(doc(db, 'collaborateurs_v2', collab.id), collab)
      console.log(`✅ Collaborateur créé: ${collab.prenom} ${collab.nom}`)
    }
    
    // 2. Créer les disponibilités
    console.log('📅 Création des disponibilités...')
    const disponibilites = generateDisponibilites()
    
    for (const dispo of disponibilites) {
      // Convertir la Map en objet pour Firestore
      const dispoData = {
        ...dispo,
        disponibilites: Object.fromEntries(
          Array.from(dispo.disponibilites.entries()).map(([date, dispos]) => [
            date.replace(/-/g, '_'), // Firestore n'aime pas les tirets dans les clés
            dispos
          ])
        )
      }
      
      await setDoc(doc(db, 'collaborateurs_dispos_v2', dispo.collaborateurId), dispoData)
      console.log(`✅ Disponibilités créées pour: ${dispo.collaborateurId}`)
    }
    
    console.log('🎉 Données de test créées avec succès!')
    console.log(`📊 ${collaborateurs.length} collaborateurs créés`)
    console.log(`📅 Disponibilités pour août 2025 générées`)
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

// Exécuter le script
createTestData()
