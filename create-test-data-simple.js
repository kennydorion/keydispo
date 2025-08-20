import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'keydispo-local'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connecter à l'émulateur
try {
  connectFirestoreEmulator(db, 'localhost', 8081);
} catch (error) {
  console.log('Émulateur déjà connecté');
}

async function createTestData() {
  try {
    console.log('🧪 Création de données de test...');
    
    const collaborateurs = [
      { nom: 'Dupont', prenom: 'Jean', metier: 'Technicien', ville: 'Paris' },
      { nom: 'Martin', prenom: 'Marie', metier: 'Ingénieur', ville: 'Lyon' },
      { nom: 'Bernard', prenom: 'Pierre', metier: 'Chef de projet', ville: 'Marseille' },
      { nom: 'Durand', prenom: 'Sophie', metier: 'Consultant', ville: 'Toulouse' },
      { nom: 'Moreau', prenom: 'Luc', metier: 'Technicien', ville: 'Nice' }
    ];
    
    const lieux = ['Site A', 'Site B', 'Site C', 'Télétravail', 'Client ABC'];
    
    // Créer des disponibilités pour les 15 prochains jours
    const today = new Date();
    const totalCreated = [];
    
    for (const collab of collaborateurs) {
      for (let day = 0; day < 15; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];
        
        // Ignorer quelques weekends
        if (date.getDay() === 0 || date.getDay() === 6) {
          if (Math.random() > 0.3) continue;
        }
        
        // Créer 1-2 créneaux par jour
        const nbCreneaux = Math.floor(Math.random() * 2) + 1;
        
        for (let c = 0; c < nbCreneaux; c++) {
          const lieu = lieux[Math.floor(Math.random() * lieux.length)];
          const heures = [
            { debut: '08:00', fin: '12:00' },
            { debut: '14:00', fin: '18:00' },
            { debut: '20:00', fin: '23:59' }
          ];
          
          const creneau = heures[c] || heures[0];
          
          const dispoData = {
            tenantId: 'keydispo',
            nom: collab.nom,
            prenom: collab.prenom,
            metier: collab.metier,
            phone: `06${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
            email: `${collab.prenom.toLowerCase()}.${collab.nom.toLowerCase()}@example.com`,
            ville: collab.ville,
            date: dateStr,
            lieu: lieu,
            heure_debut: creneau.debut,
            heure_fin: creneau.fin,
            version: 1,
            updatedAt: new Date(),
            updatedBy: 'test-script'
          };
          
          const docRef = await addDoc(collection(db, 'dispos'), dispoData);
          totalCreated.push(docRef.id);
        }
      }
      
      console.log(`✅ Disponibilités créées pour ${collab.nom} ${collab.prenom}`);
    }
    
    console.log(`🎉 ${totalCreated.length} disponibilités créées au total !`);
    console.log(`👥 ${collaborateurs.length} collaborateurs`);
    console.log(`📍 Lieux: ${lieux.join(', ')}`);
    console.log('🔗 Ouvrez http://localhost:4001/firestore pour voir les données');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createTestData();
