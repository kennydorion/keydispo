#!/usr/bin/env node

// Script pour pousser des données test dans RTDB
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, connectDatabaseEmulator } = require('firebase/database');

const app = initializeApp({
  projectId: 'keydispo-dev',
  databaseURL: 'http://127.0.0.1:9000?ns=keydispo-dev-default-rtdb'
});

const rtdb = getDatabase(app);
connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);

async function createTestData() {
  console.log('🧪 Création de données test dans RTDB...');
  
  // Activité de survol test
  const activityData = {
    userId: 'test-user-123',
    userName: 'Utilisateur Test',
    cellId: 'john.doe-2024-08-28-morning',
    timestamp: Date.now(),
    type: 'hover'
  };
  
  // Verrou test
  const lockData = {
    userId: 'test-user-123',
    userName: 'Utilisateur Test',
    cellId: 'jane.smith-2024-08-28-afternoon',
    timestamp: Date.now(),
    expiresAt: Date.now() + (2 * 60 * 1000) // 2 minutes
  };
  
  try {
    // Pousser l'activité avec le bon chemin
    await set(ref(rtdb, 'cellActivities/keydispo/test-activity-1'), activityData);
    console.log('✅ Activité test créée dans cellActivities/keydispo/');
    
    // Pousser le verrou avec le bon chemin
    await set(ref(rtdb, 'cellLocks/keydispo/test-lock-1'), lockData);
    console.log('✅ Verrou test créé dans cellLocks/keydispo/');
    
    console.log('🎉 Données test créées avec succès !');
    console.log('📍 Vérifiez votre application ou le test de réception...');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
  }
}

createTestData();
