/**
 * Script de test pour vérifier le scroll virtuel des collaborateurs
 * Ce script simule une grande quantité de collaborateurs pour tester les performances
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, writeBatch, doc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "keydispo-dev",
  apiKey: "demo-key",
  authDomain: "keydispo-dev.firebaseapp.com",
  storageBucket: "keydispo-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configuration du test
const TENANT_ID = 'test-virtual-scroll';
const TARGET_COLLABORATORS = 200; // Créer 200 collaborateurs pour tester le scroll virtuel

const prenoms = ['Alexandre', 'Marie', 'Pierre', 'Sophie', 'Julien', 'Camille', 'Nicolas', 'Aurélie', 'Maxime', 'Laura', 'Thomas', 'Emilie', 'Romain', 'Clémentine', 'Baptiste', 'Margot', 'Antoine', 'Chloé', 'Florian', 'Manon'];
const noms = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];
const metiers = ['Développeur', 'Designer', 'Chef de projet', 'Consultant', 'Analyste', 'Commercial', 'Support', 'Marketing', 'RH', 'Finance'];
const villes = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateCollaborateur(index) {
  const prenom = getRandomElement(prenoms);
  const nom = getRandomElement(noms);
  
  return {
    nom,
    prenom,
    metier: getRandomElement(metiers),
    phone: `06${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@example.com`,
    ville: getRandomElement(villes),
    date: '2024-12-20', // Date fixe pour le test
    lieu: `Bureau ${getRandomElement(villes)}`,
    heure_debut: '09:00',
    heure_fin: '17:00',
    type: 'disponible',
    timeKind: 'range',
    tenantId: TENANT_ID,
    version: 1,
    updatedAt: new Date(),
    updatedBy: 'test-script'
  };
}

async function createTestCollaborators() {
  console.log('🚀 Création de', TARGET_COLLABORATORS, 'collaborateurs pour tester le scroll virtuel...');
  
  const batch = writeBatch(db);
  let batchCount = 0;
  const BATCH_SIZE = 500; // Firestore limite à 500 opérations par batch
  
  for (let i = 0; i < TARGET_COLLABORATORS; i++) {
    const collaborateur = generateCollaborateur(i);
    const docRef = doc(collection(db, 'dispos'));
    batch.set(docRef, collaborateur);
    batchCount++;
    
    // Exécuter le batch si on atteint la limite ou c'est le dernier
    if (batchCount === BATCH_SIZE || i === TARGET_COLLABORATORS - 1) {
      await batch.commit();
      console.log(`✅ Batch ${Math.ceil((i + 1) / BATCH_SIZE)} terminé (${i + 1}/${TARGET_COLLABORATORS})`);
      
      // Créer un nouveau batch pour la suite
      const newBatch = writeBatch(db);
      Object.assign(batch, newBatch);
      batchCount = 0;
    }
  }
  
  console.log('🎉 Tous les collaborateurs de test ont été créés !');
  console.log('📊 Pour tester le scroll virtuel :');
  console.log('1. Ouvrir http://localhost:3001');
  console.log('2. Se connecter avec le tenant', TENANT_ID);
  console.log('3. Aller dans le planning pour la date 2024-12-20');
  console.log('4. Tester le scroll vertical avec', TARGET_COLLABORATORS, 'collaborateurs');
  console.log('');
  console.log('🔍 Points à vérifier :');
  console.log('- Seules ~16-20 lignes sont rendues à la fois (DevTools)');
  console.log('- Le scroll vertical est fluide');
  console.log('- Les overlays de hover fonctionnent');
  console.log('- Les clics sur les cellules fonctionnent');
  console.log('- Performance générale améliorée');
}

async function cleanupTestData() {
  console.log('🧹 Nettoyage des données de test...');
  
  // Note: Ce script nécessiterait une requête pour supprimer les données
  // Pour l'instant, nous créons juste les données de test
  console.log('ℹ️  Pour nettoyer, supprimer manuellement les documents avec tenantId =', TENANT_ID);
}

// Exécuter le script
if (require.main === module) {
  createTestCollaborators()
    .then(() => {
      console.log('✨ Script terminé avec succès');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = {
  createTestCollaborators,
  cleanupTestData,
  TARGET_COLLABORATORS,
  TENANT_ID
};
