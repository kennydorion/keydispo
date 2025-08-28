import { 
  collection, 
  addDoc, 
  serverTimestamp,
  connectFirestoreEmulator,
  getFirestore
} from 'firebase/firestore'
import { initializeApp } from 'firebase/app'

// Configuration Firebase pour l'émulateur
const firebaseConfig = {
  apiKey: "test-key",
  authDomain: "test.firebaseapp.com",
  projectId: "keydispo-ec1ba",
  storageBucket: "test.appspot.com",
  messagingSenderId: "123456789",
  appId: "test-app-id"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Connexion à l'émulateur
try {
  connectFirestoreEmulator(db, 'localhost', 8080)
} catch (error) {
  console.log('Émulateur déjà connecté')
}

const COULEURS = ['default', 'blue', 'green', 'red', 'orange', 'purple', 'pink']

const collaborateursTest = [
  {
    nom: 'Martin',
    prenom: 'Jean',
    email: 'jean.martin@example.com',
    phone: '06 12 34 56 78',
    metier: 'Développeur Full-Stack',
    ville: 'Paris',
    notes: 'Spécialisé en React et Node.js. Disponible pour missions courtes.',
    color: 'blue'
  },
  {
    nom: 'Dubois',
    prenom: 'Marie',
    email: 'marie.dubois@example.com',
    phone: '06 23 45 67 89',
    metier: 'Designer UX/UI',
    ville: 'Lyon',
    notes: 'Expert en design systems et prototypage. Préfère les missions en remote.',
    color: 'green'
  },
  {
    nom: 'Bernard',
    prenom: 'Pierre',
    email: 'pierre.bernard@example.com',
    phone: '06 34 56 78 90',
    metier: 'Chef de projet',
    ville: 'Marseille',
    notes: 'Très expérimenté en gestion d\'équipe. Agile et Scrum Master certifié.',
    color: 'orange'
  },
  {
    nom: 'Moreau',
    prenom: 'Sophie',
    email: 'sophie.moreau@example.com',
    phone: '06 45 67 89 01',
    metier: 'Développeuse Backend',
    ville: 'Toulouse',
    notes: 'Spécialiste Python/Django et architecture microservices.',
    color: 'purple'
  },
  {
    nom: 'Leroy',
    prenom: 'Thomas',
    email: 'thomas.leroy@example.com',
    phone: '06 56 78 90 12',
    metier: 'DevOps Engineer',
    ville: 'Nantes',
    notes: 'Expert AWS et Kubernetes. Disponible pour missions urgentes.',
    color: 'red'
  },
  {
    nom: 'Garcia',
    prenom: 'Laura',
    email: 'laura.garcia@example.com',
    phone: '06 67 89 01 23',
    metier: 'Product Manager',
    ville: 'Bordeaux',
    notes: 'Forte expérience en produits digitaux B2B. Bilingue anglais.',
    color: 'pink'
  },
  {
    nom: 'Roux',
    prenom: 'Antoine',
    email: 'antoine.roux@example.com',
    phone: '06 78 90 12 34',
    metier: 'Consultant Cybersécurité',
    ville: 'Lille',
    notes: 'Certifié CISSP. Spécialisé en audits de sécurité et conformité.',
    color: 'default'
  },
  {
    nom: 'David',
    prenom: 'Émilie',
    email: 'emilie.david@example.com',
    phone: '06 89 01 23 45',
    metier: 'Data Scientist',
    ville: 'Strasbourg',
    notes: 'Expert en ML et IA. Doctorat en informatique, spécialité NLP.',
    color: 'blue'
  },
  {
    nom: 'Petit',
    prenom: 'Julien',
    email: 'julien.petit@example.com',
    phone: '06 90 12 34 56',
    metier: 'Architecte Solution',
    ville: 'Nice',
    notes: 'Plus de 15 ans d\'expérience. Expert en transformations digitales.',
    color: 'green'
  },
  {
    nom: 'Rousseau',
    prenom: 'Camille',
    email: 'camille.rousseau@example.com',
    phone: '07 01 23 45 67',
    metier: 'Développeuse Mobile',
    ville: 'Montpellier',
    notes: 'Spécialisée React Native et Flutter. Portfolio d\'apps grand public.',
    color: 'orange'
  }
]

async function createTestCollaborateurs() {
  console.log('🚀 Création des collaborateurs de test...')
  
  const tenantId = 'keydispo'
  const collabRef = collection(db, `tenants/${tenantId}/collaborateurs`)
  
  try {
    for (const collaborateur of collaborateursTest) {
      const docRef = await addDoc(collabRef, {
        ...collaborateur,
        tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      console.log(`✅ Collaborateur créé: ${collaborateur.prenom} ${collaborateur.nom} (${docRef.id})`)
    }
    
    console.log(`🎉 ${collaborateursTest.length} collaborateurs créés avec succès !`)
  } catch (error) {
    console.error('❌ Erreur lors de la création des collaborateurs:', error)
  }
}

// Fonction pour créer des disponibilités de test
async function createTestDisponibilites() {
  console.log('🚀 Création des disponibilités de test...')
  
  const tenantId = 'keydispo'
  const disposRef = collection(db, 'dispos')
  
  // Dates de la semaine prochaine
  const aujourdhui = new Date()
  const lundi = new Date(aujourdhui)
  lundi.setDate(aujourdhui.getDate() + (1 - aujourdhui.getDay()) % 7)
  
  const creneaux = [
    { debut: '09:00', fin: '12:00' },
    { debut: '14:00', fin: '18:00' },
    { debut: '09:00', fin: '17:00' },
    { debut: '10:00', fin: '16:00' }
  ]
  
  const types = ['disponible', 'indisponible', 'mission']
  const lieux = ['Paris La Défense', 'Lyon Part-Dieu', 'Marseille Canebière', 'Remote', 'Client sur site']
  
  try {
    let count = 0
    
    for (let i = 0; i < 5; i++) { // 5 jours
      const date = new Date(lundi)
      date.setDate(lundi.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      for (const collaborateur of collaborateursTest.slice(0, 6)) { // 6 premiers collaborateurs
        if (Math.random() > 0.3) { // 70% de chance d'avoir une dispo
          const creneau = creneaux[Math.floor(Math.random() * creneaux.length)]
          const type = types[Math.floor(Math.random() * types.length)]
          const lieu = type === 'mission' ? lieux[Math.floor(Math.random() * lieux.length)] : ''
          
          await addDoc(disposRef, {
            nom: collaborateur.nom,
            prenom: collaborateur.prenom,
            metier: collaborateur.metier,
            phone: collaborateur.phone,
            email: collaborateur.email,
            ville: collaborateur.ville,
            date: dateStr,
            lieu,
            heure_debut: creneau.debut,
            heure_fin: creneau.fin,
            type,
            version: 1,
            tenantId,
            updatedAt: serverTimestamp(),
            updatedBy: 'test-system'
          })
          
          count++
        }
      }
    }
    
    console.log(`🎉 ${count} disponibilités créées avec succès !`)
  } catch (error) {
    console.error('❌ Erreur lors de la création des disponibilités:', error)
  }
}

async function main() {
  await createTestCollaborateurs()
  await createTestDisponibilites()
  console.log('✨ Données de test créées avec succès !')
  process.exit(0)
}

main().catch(console.error)
