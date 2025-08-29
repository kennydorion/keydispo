// Script simple pour migrer via l'application web
console.log('🔧 Script de migration côté client...')

// Fonction à exécuter dans la console du navigateur
function migrateToRTDB() {
  console.log('🚀 Démarrage migration Firestore → RTDB...')
  
  // Cette fonction utilise les services déjà chargés dans l'app
  if (typeof DisponibilitesService === 'undefined') {
    console.error('❌ DisponibilitesService non trouvé. Exécutez depuis l\'app.')
    return
  }
  
  if (typeof disponibilitesRTDBService === 'undefined') {
    console.error('❌ disponibilitesRTDBService non trouvé. Exécutez depuis l\'app.')
    return
  }
  
  // Migration
  DisponibilitesService.getAllDisponibilites('keydispo')
    .then(firebaseData => {
      console.log(`📊 ${firebaseData.length} disponibilités trouvées dans Firestore`)
      
      // Migrer vers RTDB
      const promises = firebaseData.map(dispo => {
        return disponibilitesRTDBService.createDisponibilite(dispo)
      })
      
      return Promise.all(promises)
    })
    .then(results => {
      console.log(`✅ ${results.length} disponibilités migrées vers RTDB`)
    })
    .catch(error => {
      console.error('❌ Erreur migration:', error)
    })
}

console.log('💡 Exécutez migrateToRTDB() dans la console du navigateur quand l\'app est chargée')
