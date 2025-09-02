const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'keydispo-dev',
    databaseURL: 'http://localhost:9000?ns=keydispo-dev-default-rtdb'
  });
}

const db = admin.firestore();
const rtdb = admin.database();

async function checkCollaborateurs() {
  try {
    console.log('🔍 Vérification des collaborateurs...\n');
    
    // Vérifier RTDB
    console.log('=== RTDB ===');
    const rtdbRef = rtdb.ref('tenants/keydispo/collaborateurs');
    const rtdbSnapshot = await rtdbRef.once('value');
    
    if (rtdbSnapshot.exists()) {
      const rtdbData = rtdbSnapshot.val();
      const rtdbKeys = Object.keys(rtdbData);
      console.log(`✅ RTDB: ${rtdbKeys.length} collaborateurs trouvés`);
      
      // Afficher les 3 premiers
      rtdbKeys.slice(0, 3).forEach(key => {
        const collab = rtdbData[key];
        console.log(`   - ${collab.nom} ${collab.prenom} (${collab.metier})`);
      });
    } else {
      console.log('❌ RTDB: Aucun collaborateur trouvé');
    }
    
    // Vérifier Firestore
    console.log('\n=== Firestore ===');
    const firestoreSnapshot = await db.collection('tenants/keydispo/collaborateurs').get();
    
    if (!firestoreSnapshot.empty) {
      console.log(`✅ Firestore: ${firestoreSnapshot.size} collaborateurs trouvés`);
      
      // Afficher les 3 premiers
      firestoreSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.nom} ${data.prenom} (${data.metier})`);
      });
    } else {
      console.log('❌ Firestore: Aucun collaborateur trouvé');
    }
    
    // Vérifier les anciennes collections
    console.log('\n=== Collections alternatives ===');
    const oldDisposSnapshot = await db.collection('dispos').where('tenantId', '==', 'keydispo').limit(5).get();
    console.log(`📊 Collection 'dispos': ${oldDisposSnapshot.size} documents trouvés`);
    
    if (!oldDisposSnapshot.empty) {
      const collaborateursSet = new Set();
      oldDisposSnapshot.forEach(doc => {
        const data = doc.data();
        collaborateursSet.add(`${data.nom} ${data.prenom}`);
      });
      console.log(`   - Collaborateurs uniques: ${collaborateursSet.size}`);
      Array.from(collaborateursSet).slice(0, 3).forEach(name => {
        console.log(`   - ${name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    process.exit(0);
  }
}

checkCollaborateurs();
