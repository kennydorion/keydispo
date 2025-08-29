// Script de diagnostic pour vérifier l'état des émulateurs
// À exécuter dans la console du navigateur

console.log('🔍 === DIAGNOSTIC KEYDISPO ===')

// 1. Vérifier la configuration Firebase
if (typeof firebase !== 'undefined') {
  console.log('✅ Firebase SDK détecté')
} else {
  console.log('❌ Firebase SDK non détecté')
}

// 2. Vérifier les variables d'environnement
console.log('📋 Variables d\'environnement:')
console.log('- VITE_USE_EMULATOR:', import.meta.env.VITE_USE_EMULATOR)
console.log('- VITE_FB_PROJECT_ID:', import.meta.env.VITE_FB_PROJECT_ID)
console.log('- VITE_TENANT_ID:', import.meta.env.VITE_TENANT_ID)

// 3. Vérifier la connexion aux émulateurs
console.log('🔌 Test de connexion Firestore...')
fetch('http://127.0.0.1:8080/')
  .then(() => console.log('✅ Émulateur Firestore accessible'))
  .catch(() => console.log('❌ Émulateur Firestore inaccessible'))

console.log('🔌 Test de connexion RTDB...')  
fetch('http://127.0.0.1:9000/')
  .then(() => console.log('✅ Émulateur RTDB accessible'))
  .catch(() => console.log('❌ Émulateur RTDB inaccessible'))

// 4. Vérifier les services de l'app (si disponible)
if (typeof AuthService !== 'undefined') {
  console.log('✅ AuthService disponible, tenant:', AuthService.currentTenantId)
} else {
  console.log('⚠️ AuthService non détecté')
}

console.log('🔍 === FIN DIAGNOSTIC ===')
console.log('💡 Copiez et collez ce script dans la console de votre navigateur')
