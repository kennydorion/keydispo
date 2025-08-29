// Test rapide des couleurs dans la console
// À exécuter dans la console de l'application

console.log('🔍 === TEST RAPIDE DES COULEURS ===')

// Test 1: Vérifier getUserColor
if (typeof getUserColor === 'function') {
  console.log('✅ getUserColor disponible')
  
  const testUIDs = ['user1', 'user2', 'current-test']
  testUIDs.forEach(uid => {
    try {
      const color = getUserColor(uid)
      console.log(`🎨 getUserColor("${uid}") = ${color}`)
    } catch (error) {
      console.error(`❌ Erreur getUserColor("${uid}"):`, error)
    }
  })
} else {
  console.error('❌ getUserColor non disponible')
}

// Test 2: Vérifier les préférences
if (typeof preferences !== 'undefined') {
  console.log('✅ Préférences disponibles:', preferences.value)
  console.log('🎨 Couleur actuelle:', preferences.value?.presenceColor || 'NON DÉFINIE')
} else {
  console.error('❌ Préférences non disponibles')
}

// Test 3: Vérifier l'utilisateur actuel
if (typeof auth !== 'undefined' && auth.currentUser) {
  console.log('✅ Utilisateur connecté:', auth.currentUser.uid)
  
  if (typeof getUserColor === 'function') {
    const userColor = getUserColor(auth.currentUser.uid)
    console.log('🎨 Couleur utilisateur actuel:', userColor)
  }
} else {
  console.warn('⚠️ Pas d\'utilisateur connecté ou auth non disponible')
}

// Test 4: Vérifier les variables CSS
const root = document.documentElement
const cssCurrentColor = root.style.getPropertyValue('--current-user-color')
const cssIndicatorColor = root.style.getPropertyValue('--user-indicator-color')

console.log('🎨 Variables CSS:')
console.log('  --current-user-color:', cssCurrentColor || 'NON DÉFINIE')
console.log('  --user-indicator-color:', cssIndicatorColor || 'NON DÉFINIE')

// Test 5: Forcer une mise à jour des couleurs
if (typeof updateUserColorVariables === 'function') {
  console.log('🔄 Mise à jour forcée des variables CSS...')
  updateUserColorVariables()
  
  // Revérifier après mise à jour
  setTimeout(() => {
    const newCurrentColor = root.style.getPropertyValue('--current-user-color')
    const newIndicatorColor = root.style.getPropertyValue('--user-indicator-color')
    console.log('🎨 Variables CSS après mise à jour:')
    console.log('  --current-user-color:', newCurrentColor || 'NON DÉFINIE')
    console.log('  --user-indicator-color:', newIndicatorColor || 'NON DÉFINIE')
  }, 100)
} else {
  console.error('❌ updateUserColorVariables non disponible')
}

console.log('✅ Test terminé - Vérifiez les résultats ci-dessus')
