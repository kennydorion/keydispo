#!/usr/bin/env node

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function checkUserInTenant() {
  try {
    // Configuration pour l'émulateur
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    
    const app = initializeApp({ 
      projectId: 'keydispo-dev'
    });
    
    const db = getFirestore(app);
    const tenantId = 'keydispo';
    
    console.log('🔍 Vérification des utilisateurs dans le tenant:', tenantId);
    
    // Lister tous les utilisateurs du tenant
    const usersRef = db.collection(`tenants/${tenantId}/users`);
    const snapshot = await usersRef.get();
    
    console.log(`📊 Nombre d'utilisateurs trouvés: ${snapshot.size}`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`👤 Utilisateur ${doc.id}:`, {
        email: data.email,
        role: data.role,
        displayName: data.displayName || 'N/A'
      });
    });
    
    // Vérifier spécifiquement l'utilisateur connecté
    const currentUserEmail = 'kdorion@thecompagnie.eu';
    console.log(`\n🔍 Recherche de l'utilisateur: ${currentUserEmail}`);
    
    const userQuery = await usersRef.where('email', '==', currentUserEmail).get();
    if (userQuery.empty) {
      console.log('❌ Utilisateur non trouvé dans le tenant');
      
      // Essayer de trouver l'UID de cet utilisateur
      const allUsers = await db.collection('tenants').get();
      console.log('🔍 Recherche dans tous les tenants...');
      
      for (const tenantDoc of allUsers.docs) {
        const users = await tenantDoc.ref.collection('users').where('email', '==', currentUserEmail).get();
        if (!users.empty) {
          console.log(`✅ Utilisateur trouvé dans le tenant: ${tenantDoc.id}`);
          users.forEach(userDoc => {
            console.log(`   - UID: ${userDoc.id}, Data:`, userDoc.data());
          });
        }
      }
    } else {
      console.log('✅ Utilisateur trouvé dans le tenant');
      userQuery.forEach(doc => {
        console.log(`   - UID: ${doc.id}, Data:`, doc.data());
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkUserInTenant();
