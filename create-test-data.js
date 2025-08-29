// Création de données de test dans l'émulateur RTDB
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, connectDatabaseEmulator } from 'firebase/database';

const app = initializeApp({
  projectId: 'keydispo-dev',
  databaseURL: 'http://127.0.0.1:9200?ns=keydispo-dev-default-rtdb'
});

const database = getDatabase(app);

try {
  connectDatabaseEmulator(database, '127.0.0.1', 9200);
  console.log('✅ Connecté à l\'émulateur RTDB');
} catch (error) {
  console.log('⚠️ Émulateur déjà connecté');
}

async function createTestData() {
  console.log('🧪 Création de données de test...\n');
  
  try {
    // Créer des collaborateurs de test
    const collaborateurs = [
      {
        id: 'collab_001',
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@test.com',
        metier: 'Développeur',
        phone: '0123456789',
        ville: 'Paris',
        tenantId: 'keydispo',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'collab_002', 
        nom: 'Martin',
        prenom: 'Sophie',
        email: 'sophie.martin@test.com',
        metier: 'Designer',
        phone: '0987654321',
        ville: 'Lyon',
        tenantId: 'keydispo',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
    
    // Sauvegarder les collaborateurs
    for (const collab of collaborateurs) {
      const collabRef = ref(database, `tenants/keydispo/collaborateurs/${collab.id}`);
      await set(collabRef, collab);
      console.log(`✅ Collaborateur créé: ${collab.nom} ${collab.prenom}`);
    }
    
    // Créer des disponibilités de test
    const disponibilites = [
      {
        id: 'dispo_001',
        collaborateurId: 'collab_001',
        date: '2025-08-29',
        heure_debut: '09:00',
        heure_fin: '17:00',
        lieu: 'Bureau Paris',
        nom: 'Dupont',
        prenom: 'Jean',
        metier: 'Développeur',
        phone: '0123456789',
        email: 'jean.dupont@test.com',
        ville: 'Paris',
        tenantId: 'keydispo',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'dispo_002',
        collaborateurId: 'collab_002',
        date: '2025-08-29',
        heure_debut: '10:00',
        heure_fin: '18:00',
        lieu: 'Bureau Lyon',
        nom: 'Martin',
        prenom: 'Sophie',
        metier: 'Designer',
        phone: '0987654321',
        email: 'sophie.martin@test.com',
        ville: 'Lyon',
        tenantId: 'keydispo',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'dispo_003',
        collaborateurId: 'collab_001',
        date: '2025-08-30',
        heure_debut: '08:00',
        heure_fin: '16:00',
        lieu: 'Remote',
        nom: 'Dupont',
        prenom: 'Jean',
        metier: 'Développeur',
        phone: '0123456789',
        email: 'jean.dupont@test.com',
        ville: 'Paris',
        tenantId: 'keydispo',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
    
    // Sauvegarder les disponibilités
    for (const dispo of disponibilites) {
      const dispoRef = ref(database, `tenants/keydispo/disponibilites/${dispo.id}`);
      await set(dispoRef, dispo);
      console.log(`✅ Disponibilité créée: ${dispo.nom} ${dispo.prenom} - ${dispo.date}`);
    }
    
    console.log('\n🎉 Données de test créées avec succès !');
    console.log(`👥 ${collaborateurs.length} collaborateurs`);
    console.log(`📅 ${disponibilites.length} disponibilités`);
    console.log('\n👉 Rafraîchissez votre application sur http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
  }
  
  process.exit(0);
}

createTestData();
