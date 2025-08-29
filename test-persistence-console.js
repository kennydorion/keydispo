// Test de persistance des couleurs - Version console
// À copier-coller dans la console de l'application

console.log('🔄 === TEST DE PERSISTANCE DES COULEURS ===');

async function testColorPersistence() {
  
  // Étape 1: Vérifier l'état initial
  console.log('\n📋 1. État initial:');
  if (typeof auth !== 'undefined' && auth.currentUser) {
    console.log('✅ Utilisateur connecté:', auth.currentUser.uid);
    console.log('🏢 Tenant:', AuthService.currentTenantId);
  } else {
    console.error('❌ Pas d\'utilisateur connecté');
    return;
  }
  
  if (typeof preferences !== 'undefined') {
    console.log('🎨 Couleur actuelle:', preferences.value?.presenceColor || 'NON DÉFINIE');
  } else {
    console.error('❌ Préférences non accessibles');
    return;
  }
  
  // Étape 2: Tester la sauvegarde
  console.log('\n💾 2. Test de sauvegarde:');
  const testColor = '#ff0000'; // Rouge test
  const userId = auth.currentUser.uid;
  
  try {
    console.log(`🎨 Sauvegarde de la couleur ${testColor} pour l'utilisateur ${userId}`);
    await UserPreferencesService.updatePresenceColor(userId, testColor);
    console.log('✅ Sauvegarde réussie');
    
    // Vérifier l'état local immédiatement après sauvegarde
    console.log('🔍 Couleur locale après sauvegarde:', preferences.value?.presenceColor);
    
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
    return;
  }
  
  // Étape 3: Simuler un rechargement en rechargeant les préférences
  console.log('\n🔄 3. Test de rechargement:');
  try {
    if (typeof loadPreferences !== 'undefined') {
      console.log('🔄 Rechargement des préférences...');
      await loadPreferences(userId);
      console.log('✅ Rechargement réussi');
      console.log('🎨 Couleur après rechargement:', preferences.value?.presenceColor);
      
      if (preferences.value?.presenceColor === testColor) {
        console.log('✅ PERSISTANCE RÉUSSIE - La couleur est bien persistante');
      } else {
        console.error('❌ ÉCHEC PERSISTANCE - Couleur non persistée');
        console.log('Expected:', testColor);
        console.log('Actual:', preferences.value?.presenceColor);
      }
    } else {
      console.error('❌ loadPreferences non disponible');
    }
  } catch (error) {
    console.error('❌ Erreur lors du rechargement:', error);
  }
  
  // Étape 4: Vérification directe Firestore
  console.log('\n🔥 4. Vérification directe Firestore:');
  try {
    const userRef = doc(db, `tenants/${AuthService.currentTenantId}/users/${userId}`);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('📄 Document Firestore:', userData);
      console.log('🎨 Couleur dans Firestore:', userData.preferences?.presenceColor);
      
      if (userData.preferences?.presenceColor === testColor) {
        console.log('✅ FIRESTORE OK - Couleur bien sauvegardée dans la base');
      } else {
        console.error('❌ FIRESTORE ÉCHEC - Couleur pas dans la base');
      }
    } else {
      console.error('❌ Document utilisateur n\'existe pas dans Firestore');
    }
  } catch (error) {
    console.error('❌ Erreur accès Firestore:', error);
  }
  
  // Étape 5: Test avec une autre couleur pour confirmer
  console.log('\n🔄 5. Test avec une deuxième couleur:');
  const testColor2 = '#00ff00'; // Vert test
  try {
    await UserPreferencesService.updatePresenceColor(userId, testColor2);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
    await loadPreferences(userId);
    
    if (preferences.value?.presenceColor === testColor2) {
      console.log('✅ DOUBLE TEST RÉUSSI - La persistance fonctionne');
    } else {
      console.error('❌ DOUBLE TEST ÉCHEC');
    }
  } catch (error) {
    console.error('❌ Erreur double test:', error);
  }
  
  // Étape 6: Restaurer une couleur normale
  console.log('\n🏠 6. Restauration couleur normale:');
  try {
    await UserPreferencesService.updatePresenceColor(userId, '#3b82f6'); // Bleu par défaut
    console.log('✅ Couleur restaurée');
  } catch (error) {
    console.error('❌ Erreur restauration:', error);
  }
  
  console.log('\n🎯 === FIN DU TEST DE PERSISTANCE ===');
}

// Exécuter le test
testColorPersistence()
  .then(() => console.log('✅ Test de persistance terminé'))
  .catch(error => console.error('❌ Erreur pendant le test:', error));
