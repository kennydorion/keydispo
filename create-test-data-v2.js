import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, serverTimestamp, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'keydispo-local',
  host: 'localhost',
  port: 8080,
  ssl: false
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Connecter à l'émulateur Firestore (voir firebase.json: port 8080)
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('✅ Firestore connecté à l\'émulateur (localhost:8080)');
} catch (e) {
  console.warn('⚠️ Impossible de connecter l\'émulateur Firestore:', e?.message || e);
}

async function createTestDataV2() {
  try {
    console.log('🔄 Création de données de test V2...');
    
    const tenantId = 'keydispo';
    
    // Créer des collaborateurs de test
    const collaborateurs = [
      {
        nom: 'Dupont',
        prenom: 'Jean',
        metier: 'Technicien',
        phone: '0123456789',
        email: 'jean.dupont@test.com',
        ville: 'Paris'
      },
      {
        nom: 'Martin',
        prenom: 'Marie',
        metier: 'Ingénieur',
        phone: '0987654321',
        email: 'marie.martin@test.com',
        ville: 'Lyon'
      },
      {
        nom: 'Bernard',
        prenom: 'Pierre',
        metier: 'Chef de projet',
        phone: '0147258369',
        email: 'pierre.bernard@test.com',
        ville: 'Marseille'
      }
    ];
    
    // Créer les collaborateurs
    const collaborateurIds = [];
    for (let i = 0; i < collaborateurs.length; i++) {
      const collabRef = doc(collection(db, `tenants/${tenantId}/collaborateurs`));
      
      await setDoc(collabRef, {
        ...collaborateurs[i],
        tenantId,
        actif: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: 'test-user',
        version: 1
      });
      
      collaborateurIds.push(collabRef.id);
      console.log(`✅ Collaborateur créé: ${collaborateurs[i].nom} ${collaborateurs[i].prenom} (${collabRef.id})`);
    }
    
    // Créer des disponibilités pour chaque collaborateur
    const today = new Date();
    const lieux = ['Site A', 'Site B', 'Site C', 'Télétravail'];
    const statuts = ['disponible', 'indisponible', 'affecte'];
    
    for (let collabIndex = 0; collabIndex < collaborateurIds.length; collabIndex++) {
      const collaborateurId = collaborateurIds[collabIndex];
      
      // Créer des disponibilités pour les 30 prochains jours
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + dayOffset);
        const dateStr = date.toISOString().split('T')[0];
        
        // Ignorer les weekends parfois
        if (date.getDay() === 0 || date.getDay() === 6) {
          if (Math.random() > 0.3) continue; // 70% de chance d'ignorer les weekends
        }
        
        // Créer 1-3 créneaux par jour
        const nbCreneaux = Math.floor(Math.random() * 3) + 1;
        const creneaux = [];
        
        for (let c = 0; c < nbCreneaux; c++) {
          const heureDebut = ['08:00', '14:00', '20:00'][c] || '08:00';
          const heureFin = ['12:00', '18:00', '23:59'][c] || '17:00';
          const lieu = lieux[Math.floor(Math.random() * lieux.length)];
          const statut = statuts[Math.floor(Math.random() * statuts.length)];
          
          creneaux.push({
            lieu,
            heure_debut: heureDebut,
            heure_fin: heureFin,
            statut,
            commentaire: statut === 'indisponible' ? 'Congés' : undefined
          });
        }
        
        // Enregistrer la disponibilité
        const dispoRef = doc(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}/disponibilites/${dateStr}`);
        
        await setDoc(dispoRef, {
          date: dateStr,
          creneaux,
          updatedAt: serverTimestamp(),
          updatedBy: 'test-user',
          version: 1
        });
      }
      
      console.log(`✅ Disponibilités créées pour ${collaborateurs[collabIndex].nom}`);
    }
    
    console.log('🎉 Données de test V2 créées avec succès !');
    console.log(`📊 ${collaborateurs.length} collaborateurs avec 30 jours de disponibilités chacun`);
    
  } catch (error) {
    console.error('❌ Erreur création données test:', error);
  }
}

createTestDataV2();
