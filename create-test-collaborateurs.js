import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCs2Tq29CKHP-WYJHSlwTTqrZCo1tN5k6Y",
  authDomain: "keydispo.firebaseapp.com",
  databaseURL: "https://keydispo-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "keydispo",
  storageBucket: "keydispo.appspot.com",
  messagingSenderId: "1069134226734",
  appId: "1:1069134226734:web:26dc6c7a4efc0b1a7b3ecb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collaborateursTest = [
  {
    nom: 'Dupont',
    prenom: 'Jean',
    metier: 'Développeur',
    note: 'Senior React/Vue',
    email: 'jean.dupont@example.com',
    phone: '+41 79 123 45 67',
    actif: true
  },
  {
    nom: 'Martin',
    prenom: 'Sophie',
    metier: 'Designer',
    note: 'UI/UX spécialiste',
    email: 'sophie.martin@example.com',
    phone: '+41 78 234 56 78',
    actif: true
  },
  {
    nom: 'Bernard',
    prenom: 'Pierre',
    metier: 'Chef de projet',
    note: 'Agile/Scrum master',
    email: 'pierre.bernard@example.com',
    phone: '+41 77 345 67 89',
    actif: true
  },
  {
    nom: 'Lemoine',
    prenom: 'Claire',
    metier: 'Analyste',
    note: 'Business analyst',
    email: 'claire.lemoine@example.com',
    phone: '+41 76 456 78 90',
    actif: true
  }
];

async function createTestCollaborateurs() {
  const tenantId = 'keydispo';
  
  console.log('🔄 Création des collaborateurs de test...');
  
  try {
    for (const collab of collaborateursTest) {
      const docRef = doc(collection(db, `tenants/${tenantId}/collaborateurs`));
      
      const collaborateurData = {
        ...collab,
        tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1
      };
      
      await setDoc(docRef, collaborateurData);
      console.log(`✅ Collaborateur créé: ${collab.prenom} ${collab.nom} (${docRef.id})`);
    }
    
    console.log('🎉 Tous les collaborateurs de test ont été créés!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des collaborateurs:', error);
  }
  
  process.exit(0);
}

createTestCollaborateurs();
