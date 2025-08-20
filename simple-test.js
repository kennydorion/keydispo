// Test simple avec curl
const { exec } = require('child_process');

async function createTestData() {
  console.log('🧪 Création de données de test via API REST...');
  
  const baseUrl = 'http://localhost:8080/v1/projects/keydispo-dev/databases/(default)/documents';
  
  const dispos = [
    {
      fields: {
        tenantId: { stringValue: 'keydispo' },
        nom: { stringValue: 'Martin' },
        prenom: { stringValue: 'Jean' },
        metier: { stringValue: 'CT' },
        phone: { stringValue: '06.12.34.56.78' },
        email: { stringValue: 'jean.martin@test.fr' },
        ville: { stringValue: 'Paris' },
        date: { stringValue: '2025-08-13' },
        lieu: { stringValue: 'DISPONIBLE' },
        heure_debut: { stringValue: '08:00' },
        heure_fin: { stringValue: '17:00' },
        version: { integerValue: '1' },
        updatedBy: { stringValue: 'system' }
      }
    },
    {
      fields: {
        tenantId: { stringValue: 'keydispo' },
        nom: { stringValue: 'Dupont' },
        prenom: { stringValue: 'Marie' },
        metier: { stringValue: 'CT' },
        phone: { stringValue: '06.98.76.54.32' },
        email: { stringValue: 'marie.dupont@test.fr' },
        ville: { stringValue: 'Lyon' },
        date: { stringValue: '2025-08-13' },
        lieu: { stringValue: 'FOI YAMBA' },
        heure_debut: { stringValue: '09:00' },
        heure_fin: { stringValue: '18:00' },
        version: { integerValue: '1' },
        updatedBy: { stringValue: 'system' }
      }
    },
    {
      fields: {
        tenantId: { stringValue: 'keydispo' },
        nom: { stringValue: 'Bernard' },
        prenom: { stringValue: 'Pierre' },
        metier: { stringValue: 'CT' },
        phone: { stringValue: '06.11.22.33.44' },
        email: { stringValue: 'pierre.bernard@test.fr' },
        ville: { stringValue: 'Marseille' },
        date: { stringValue: '2025-08-14' },
        lieu: { stringValue: 'SOUS BALME' },
        heure_debut: { stringValue: '07:30' },
        heure_fin: { stringValue: '16:30' },
        version: { integerValue: '1' },
        updatedBy: { stringValue: 'system' }
      }
    }
  ];
  
  for (let i = 0; i < dispos.length; i++) {
    const dispo = dispos[i];
    const docId = `${dispo.fields.nom.stringValue.toLowerCase()}_${dispo.fields.prenom.stringValue.toLowerCase()}_${dispo.fields.date.stringValue}`;
    const url = `${baseUrl}/dispos/${docId}`;
    
    const curlCommand = `curl -X PATCH "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(dispo)}'`;
    
    try {
      await new Promise((resolve, reject) => {
        exec(curlCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Erreur pour ${docId}:`, error.message);
            reject(error);
          } else {
            console.log(`✅ Disponibilité ${i + 1}/3 créée: ${dispo.fields.prenom.stringValue} ${dispo.fields.nom.stringValue}`);
            resolve(stdout);
          }
        });
      });
    } catch (error) {
      console.error(`❌ Échec pour ${docId}`);
    }
  }
  
  console.log('🎯 Données de test créées !');
  console.log('📱 Testez sur: http://localhost:3001/#/semaine');
}

createTestData();
