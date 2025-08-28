#!/usr/bin/env node

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function updateUserRole() {
  try {
    // Configuration pour l'émulateur
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    
    const app = initializeApp({ 
      projectId: 'keydispo-dev'
    });
    
    const db = getFirestore(app);
    const tenantId = 'keydispo';
    const userEmail = 'kdorion@thecompagnie.eu';
    const newRole = 'admin';
    
    console.log(`🔧 Mise à jour du rôle de ${userEmail} vers ${newRole}...`);
    
    // Trouver l'utilisateur par email
    const usersRef = db.collection(`tenants/${tenantId}/users`);
    const userQuery = await usersRef.where('email', '==', userEmail).get();
    
    if (userQuery.empty) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    // Mettre à jour le rôle
    const userDoc = userQuery.docs[0];
    await userDoc.ref.update({
      role: newRole,
      lastAccess: new Date()
    });
    
    console.log(`✅ Rôle mis à jour avec succès!`);
    console.log(`👤 UID: ${userDoc.id}`);
    console.log(`📧 Email: ${userEmail}`);
    console.log(`👑 Nouveau rôle: ${newRole}`);
    
    // Vérifier la mise à jour
    const updatedDoc = await userDoc.ref.get();
    console.log('📋 Données mises à jour:', updatedDoc.data());
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

updateUserRole();
