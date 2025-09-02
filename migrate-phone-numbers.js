import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';
import { normalizePhone } from './src/utils/phoneFormatter.ts';

const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "keydispo.firebaseapp.com", 
  databaseURL: "http://127.0.0.1:9200/?ns=keydispo-default-rtdb",
  projectId: "keydispo-ec1ba",
  storageBucket: "keydispo-ec1ba.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

async function migratePhoneNumbers() {
  try {
    console.log('🔄 Migration des numéros de téléphone (00 -> +33)...\n');
    
    const collaborateursRef = ref(rtdb, 'tenants/keydispo/collaborateurs');
    const snapshot = await get(collaborateursRef);
    
    if (!snapshot.exists()) {
      console.log('❌ Aucun collaborateur trouvé dans RTDB');
      return;
    }
    
    const data = snapshot.val();
    const collaborateurs = Object.entries(data);
    
    console.log(`📊 ${collaborateurs.length} collaborateurs à vérifier\n`);
    
    let migratedCount = 0;
    
    for (const [id, collabData] of collaborateurs) {
      const originalPhone = collabData.phone;
      if (!originalPhone) continue;
      
      const normalizedPhone = normalizePhone(originalPhone);
      
      if (originalPhone !== normalizedPhone) {
        console.log(`🔄 Migration: ${collabData.prenom} ${collabData.nom}`);
        console.log(`   Avant: "${originalPhone}"`);
        console.log(`   Après: "${normalizedPhone}"`);
        
        // Mettre à jour le numéro dans la base
        const collaborateurRef = ref(rtdb, `tenants/keydispo/collaborateurs/${id}`);
        await set(collaborateurRef, {
          ...collabData,
          phone: normalizedPhone,
          updatedAt: Date.now()
        });
        
        migratedCount++;
        console.log(`   ✅ Migré\n`);
      } else {
        console.log(`✓ ${collabData.prenom} ${collabData.nom}: "${originalPhone}" (déjà normalisé)`);
      }
    }
    
    console.log(`\n🎉 Migration terminée !`);
    console.log(`📱 ${migratedCount} numéros migrés sur ${collaborateurs.length} collaborateurs`);
    
    if (migratedCount > 0) {
      console.log('\n📋 Résumé des migrations:');
      console.log('- Conversion automatique des numéros 00XX -> +XX');
      console.log('- Normalisation vers format international');
      console.log('- Préservation des numéros déjà corrects');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  }
}

// Fonction pour afficher un aperçu avant migration
async function previewMigration() {
  try {
    console.log('👀 Aperçu de la migration (mode lecture seule)...\n');
    
    const collaborateursRef = ref(rtdb, 'tenants/keydispo/collaborateurs');
    const snapshot = await get(collaborateursRef);
    
    if (!snapshot.exists()) {
      console.log('❌ Aucun collaborateur trouvé dans RTDB');
      return;
    }
    
    const data = snapshot.val();
    const collaborateurs = Object.entries(data);
    
    console.log(`📊 ${collaborateurs.length} collaborateurs analysés\n`);
    
    let toMigrateCount = 0;
    
    for (const [id, collabData] of collaborateurs) {
      const originalPhone = collabData.phone;
      if (!originalPhone) continue;
      
      const normalizedPhone = normalizePhone(originalPhone);
      
      if (originalPhone !== normalizedPhone) {
        console.log(`🔄 À migrer: ${collabData.prenom} ${collabData.nom}`);
        console.log(`   "${originalPhone}" -> "${normalizedPhone}"`);
        toMigrateCount++;
      }
    }
    
    if (toMigrateCount === 0) {
      console.log('✅ Aucune migration nécessaire - tous les numéros sont déjà normalisés !');
    } else {
      console.log(`\n📱 ${toMigrateCount} numéros nécessitent une migration`);
      console.log('\nPour effectuer la migration, exécutez:');
      console.log('node migrate-phone-numbers.js --migrate');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'aperçu:', error);
  }
}

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);
const shouldMigrate = args.includes('--migrate');

if (shouldMigrate) {
  migratePhoneNumbers();
} else {
  previewMigration();
}
