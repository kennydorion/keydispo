import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, addDoc } from 'firebase/firestore';

// Configuration Firebase pour l'émulateur
const firebaseConfig = {
  projectId: 'keydispo-local'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connecter à l'émulateur sur le bon port
connectFirestoreEmulator(db, '127.0.0.1', 8081);

async function createTestData() {
  console.log('🚀 Création de données de test V2...');
  
  try {
    const tenantId = 'keydispo-local';
    
    // Créer un collaborateur test
    const collabRef = await addDoc(collection(db, `tenants/${tenantId}/collaborateurs`), {
      nom: 'GARCIA',
      prenom: 'Marie',
      metier: 'CT',
      phone: '0123456789',
      email: 'marie.garcia@test.com',
      ville: 'Lyon',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Collaborateur créé:', collabRef.id);
    
    // Créer quelques disponibilités pour ce collaborateur
    const dispoRef1 = await addDoc(collection(db, `tenants/${tenantId}/collaborateurs/${collabRef.id}/disponibilites`), {
      date: '2025-01-15',
      lieu: 'DISPONIBLE',
      heure_debut: '08:00',
      heure_fin: '18:00',
      createdAt: new Date()
    });
    
    const dispoRef2 = await addDoc(collection(db, `tenants/${tenantId}/collaborateurs/${collabRef.id}/disponibilites`), {
      date: '2025-01-16',
      lieu: 'SOUS BALME',
      heure_debut: '09:00',
      heure_fin: '17:00',
      createdAt: new Date()
    });
    
    console.log('✅ Disponibilités créées:', dispoRef1.id, dispoRef2.id);
    console.log('🎉 Données de test créées avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createTestData().then(() => {
  console.log('✅ Script terminé');
  process.exit(0);
});
