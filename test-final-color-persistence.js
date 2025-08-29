/*
 * Test Final - Persistance des Couleurs
 * 
 * Ce script valide que le système de couleurs est entièrement fonctionnel
 * et que les couleurs persistent correctement à travers toutes les interactions.
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

// Configuration Firebase (copier depuis votre config)
const firebaseConfig = {
  apiKey: "AIzaSyA8QWsLd4pfgP7FQpPwvSvJ7Hs5ygWGJWA",
  authDomain: "keydispo-demo.firebaseapp.com",
  databaseURL: "https://keydispo-demo-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "keydispo-demo",
  storageBucket: "keydispo-demo.firebasestorage.app",
  messagingSenderId: "308705149783",
  appId: "1:308705149783:web:0c9c5edee6da39e3abad5e",
  measurementId: "G-38STNFCP1N"
}

// Initialisation
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Couleurs de test
const testColors = [
  '#FF5733', // Rouge-orange
  '#33FF57', // Vert
  '#3357FF', // Bleu
  '#FF33F5', // Magenta
  '#F5FF33', // Jaune
  '#33F5FF'  // Cyan
]

// Fonction pour attendre
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function testColorPersistence() {
  console.log('🚀 Test Final de Persistance des Couleurs\n')
  
  try {
    // 1. Connexion utilisateur
    console.log('1️⃣ Connexion utilisateur...')
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'password123')
    const user = userCredential.user
    console.log(`✅ Connecté: ${user.email}`)
    
    // 2. Obtenir le tenant
    const tenantDoc = await getDoc(doc(db, 'users', user.uid))
    const tenantId = tenantDoc.data()?.tenantId
    if (!tenantId) {
      throw new Error('Pas de tenantId trouvé')
    }
    console.log(`✅ TenantId: ${tenantId}`)
    
    // 3. Test de sauvegarde et lecture pour chaque couleur
    console.log('\n2️⃣ Test de persistance pour chaque couleur...')
    
    for (let i = 0; i < testColors.length; i++) {
      const color = testColors[i]
      console.log(`\n--- Test couleur ${i + 1}: ${color} ---`)
      
      // Sauvegarder la couleur
      const userDocRef = doc(db, 'tenants', tenantId, 'users', user.uid)
      await updateDoc(userDocRef, {
        presenceColor: color,
        updatedAt: new Date()
      })
      console.log(`✅ Couleur sauvegardée: ${color}`)
      
      // Attendre un peu pour la propagation
      await sleep(500)
      
      // Relire la couleur
      const updatedDoc = await getDoc(userDocRef)
      const savedColor = updatedDoc.data()?.presenceColor
      
      if (savedColor === color) {
        console.log(`✅ Couleur vérifiée: ${savedColor}`)
      } else {
        console.log(`❌ ERREUR: Attendu ${color}, trouvé ${savedColor}`)
        return false
      }
    }
    
    // 4. Test de lecture après changement d'utilisateur (simulation)
    console.log('\n3️⃣ Test de lecture après déconnexion/reconnexion simulée...')
    
    // Simuler une nouvelle session en relisant les données
    const finalDocRef = doc(db, 'tenants', tenantId, 'users', user.uid)
    const finalDoc = await getDoc(finalDocRef)
    const finalColor = finalDoc.data()?.presenceColor
    const lastTestColor = testColors[testColors.length - 1]
    
    if (finalColor === lastTestColor) {
      console.log(`✅ Couleur persistante après simulation de reconnexion: ${finalColor}`)
    } else {
      console.log(`❌ ERREUR: Couleur non persistante. Attendu ${lastTestColor}, trouvé ${finalColor}`)
      return false
    }
    
    // 5. Test de structure complète du document
    console.log('\n4️⃣ Vérification de la structure du document...')
    const userData = finalDoc.data()
    console.log('Structure du document utilisateur:')
    console.log(JSON.stringify(userData, null, 2))
    
    // Vérifications de structure
    const requiredFields = ['presenceColor', 'updatedAt']
    for (const field of requiredFields) {
      if (userData.hasOwnProperty(field)) {
        console.log(`✅ Champ ${field} présent`)
      } else {
        console.log(`❌ Champ ${field} manquant`)
        return false
      }
    }
    
    console.log('\n🎉 TOUS LES TESTS PASSÉS !')
    console.log('✅ Le système de couleurs est entièrement fonctionnel')
    console.log('✅ La persistance fonctionne correctement')
    console.log('✅ La structure des données est valide')
    
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
    return false
  }
}

async function testColorComponentIntegration() {
  console.log('\n🔧 Test d\'intégration des composants...')
  
  try {
    // Instructions pour test manuel
    console.log('\n📋 INSTRUCTIONS POUR TEST MANUEL:')
    console.log('1. Ouvrir l\'application dans le navigateur')
    console.log('2. Aller dans Paramètres > Couleur de présence')
    console.log('3. Changer la couleur plusieurs fois')
    console.log('4. Vérifier que la couleur change dans la NavBar')
    console.log('5. Rafraîchir la page (F5)')
    console.log('6. Vérifier que la couleur est toujours là')
    console.log('7. Aller dans SemaineVirtualClean')
    console.log('8. Vérifier que la couleur utilisateur est correcte')
    console.log('\n✅ Si tous ces points fonctionnent, l\'intégration est complète')
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'intégration:', error)
  }
}

// Exécution des tests
async function runAllTests() {
  console.log('🏁 DÉBUT DES TESTS FINAUX\n')
  
  const persistenceTest = await testColorPersistence()
  await testColorComponentIntegration()
  
  console.log('\n🏁 FIN DES TESTS')
  if (persistenceTest) {
    console.log('🎉 SUCCÈS: Le système de couleurs est opérationnel')
  } else {
    console.log('❌ ÉCHEC: Des problèmes persistent')
  }
}

// Lancer les tests
runAllTests().catch(console.error)
