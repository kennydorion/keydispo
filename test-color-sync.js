// Test de synchronisation des couleurs d'avatars
// Ce script teste si les couleurs sont bien synchronisées entre différents utilisateurs

console.log('🎨 Test de synchronisation des couleurs d\'avatars')

// Simuler différents UIDs
const testUIDs = [
  'user123',
  'user456',
  'user789'
]

// Importer le service
import { UserColorsService } from '../src/services/userColorsService.js'

// Test 1: Vérifier les couleurs par défaut (basées sur hash)
console.log('\n📋 Test 1: Couleurs par défaut (hash)')
testUIDs.forEach(uid => {
  const color = UserColorsService.getUserColor(uid)
  console.log(`   ${uid}: ${color}`)
})

// Test 2: Simuler l'ajout d'une couleur personnalisée
console.log('\n📋 Test 2: Ajout couleur personnalisée')
UserColorsService.updateColorCache('user123', '#ff0000')
console.log(`   user123 (couleur personnalisée): ${UserColorsService.getUserColor('user123')}`)
console.log(`   user456 (couleur par défaut): ${UserColorsService.getUserColor('user456')}`)

// Test 3: Vérifier le cache
console.log('\n📋 Test 3: État du cache')
console.log(`   Cache complet:`, UserColorsService.getColorsCache())
console.log(`   user123 en cache: ${UserColorsService.hasColorInCache('user123')}`)
console.log(`   user456 en cache: ${UserColorsService.hasColorInCache('user456')}`)

// Test 4: Test de consistance
console.log('\n📋 Test 4: Consistance des couleurs')
const color1 = UserColorsService.getUserColor('user123')
const color2 = UserColorsService.getUserColor('user123')
console.log(`   Appel 1: ${color1}`)
console.log(`   Appel 2: ${color2}`)
console.log(`   Identiques: ${color1 === color2 ? '✅' : '❌'}`)

console.log('\n🎯 Tests terminés')
