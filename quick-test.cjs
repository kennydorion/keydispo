// Test de connectivité simple à l'émulateur
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Configuration pour l'émulateur
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const app = initializeApp({ projectId: 'keydispo-dev' });
const db = getFirestore(app);

async function quickTest() {
  console.log('🧪 Test de connectivité et création de données...');
  
  try {
    // Créer quelques disponibilités de test pour l'app Vue
    const dispos = [
      {
        tenantId: 'keydispo',
        nom: 'Martin',
        prenom: 'Jean',
        metier: 'CT',
        phone: '06.12.34.56.78',
        email: 'jean.martin@test.fr',
        ville: 'Paris',
        date: '2025-08-13',
        lieu: 'DISPONIBLE',
        heure_debut: '08:00',
        heure_fin: '17:00',
        version: 1,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        tenantId: 'keydispo',
        nom: 'Dupont',
        prenom: 'Marie',
        metier: 'CT',
        phone: '06.98.76.54.32',
        email: 'marie.dupont@test.fr',
        ville: 'Lyon',
        date: '2025-08-13',
        lieu: 'FOI YAMBA',
        heure_debut: '09:00',
        heure_fin: '18:00',
        version: 1,
        updatedAt: new Date(),
        updatedBy: 'system'
      },
      {
        tenantId: 'keydispo',
        nom: 'Bernard',
        prenom: 'Pierre',
        metier: 'CT',
        phone: '06.11.22.33.44',
        email: 'pierre.bernard@test.fr',
        ville: 'Marseille',
        date: '2025-08-14',
        lieu: 'SOUS BALME',
        heure_debut: '07:30',
        heure_fin: '16:30',
        version: 1,
        updatedAt: new Date(),
        updatedBy: 'system'
      }
    ];
    
    // Insérer chaque disponibilité
    for (let i = 0; i < dispos.length; i++) {
      const dispo = dispos[i];
      const id = `${dispo.nom.toLowerCase()}_${dispo.prenom.toLowerCase()}_${dispo.date}`;
      await db.collection('dispos').doc(id).set(dispo);
      console.log(`✅ Disponibilité ${i + 1}/3 créée: ${dispo.prenom} ${dispo.nom}`);
    }
    
    console.log('🎯 Données de test créées pour l\'application Vue !');
    console.log('📱 Testez sur: http://localhost:3000/#/semaine');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

quickTest().then(() => process.exit(0));
