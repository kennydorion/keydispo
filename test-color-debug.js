// Test des couleurs utilisateur - Diagnostic complet
console.log('🔍 === DIAGNOSTIC DES COULEURS UTILISATEUR ===')

// Fonction pour tester les couleurs
function testUserColors() {
  console.log('\n1. État actuel des préférences:')
  
  // Vérifier si le composable est accessible
  try {
    const { preferences } = Vue.useUserPreferences()
    console.log('✅ Préférences accessibles:', preferences.value)
    console.log('🎨 Couleur de présence actuelle:', preferences.value.presenceColor)
  } catch (error) {
    console.error('❌ Erreur accès préférences:', error)
  }
  
  console.log('\n2. Variables CSS actuelles:')
  const root = document.documentElement
  const currentUserColor = root.style.getPropertyValue('--current-user-color')
  const userIndicatorColor = root.style.getPropertyValue('--user-indicator-color')
  
  console.log('🎨 --current-user-color:', currentUserColor || 'NON DÉFINIE')
  console.log('🎨 --user-indicator-color:', userIndicatorColor || 'NON DÉFINIE')
  
  console.log('\n3. Test de getUserColor:')
  // Simuler différents UIDs
  const testUIDs = ['test-user-1', 'test-user-2', 'current-user']
  testUIDs.forEach(uid => {
    try {
      const color = getUserColor(uid)
      console.log(`🎨 getUserColor(${uid}):`, color)
    } catch (error) {
      console.error(`❌ Erreur getUserColor(${uid}):`, error)
    }
  })
  
  console.log('\n4. Test de getHoveringUserColor:')
  try {
    const testColor = getHoveringUserColor('collab-1', '2024-01-15')
    console.log('🎨 getHoveringUserColor(collab-1, 2024-01-15):', testColor)
  } catch (error) {
    console.error('❌ Erreur getHoveringUserColor:', error)
  }
  
  console.log('\n5. État Firebase Auth:')
  console.log('👤 currentUser:', auth.currentUser?.uid || 'NON CONNECTÉ')
  console.log('🏢 currentTenantId:', AuthService.currentTenantId || 'NON DÉFINI')
  
  console.log('\n6. Test des cellules avec couleurs:')
  const cellsWithColors = document.querySelectorAll('[style*="--hovering-user-color"]')
  console.log(`📊 Nombre de cellules avec --hovering-user-color: ${cellsWithColors.length}`)
  
  if (cellsWithColors.length > 0) {
    const firstCell = cellsWithColors[0]
    const computedColor = firstCell.style.getPropertyValue('--hovering-user-color')
    console.log('🎨 Première cellule couleur:', computedColor)
  }
  
  console.log('\n7. Test de sauvegarde couleur:')
  if (auth.currentUser) {
    UserPreferencesService.updatePresenceColor(auth.currentUser.uid, '#ff0000')
      .then(() => console.log('✅ Test sauvegarde couleur réussi'))
      .catch(error => console.error('❌ Test sauvegarde couleur échoué:', error))
  } else {
    console.warn('⚠️ Impossible de tester la sauvegarde - utilisateur non connecté')
  }
}

// Exécuter le test après un délai pour s'assurer que tout est chargé
setTimeout(testUserColors, 1000)

console.log('📋 Test programmé pour dans 1 seconde...')
