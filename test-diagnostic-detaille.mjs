/**
 * Test de diagnostic pour vérifier chaque étape du chargement des disponibilités
 */

import { disponibilitesRTDBService } from './src/services/disponibilitesRTDBService.js'

async function testDetaille() {
  console.log('=== TEST DÉTAILLÉ DISPONIBILITÉS ===')
  
  try {
    // 1. Test du service RTDB directement
    console.log('\n1. Test du service RTDB directement...')
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]
    
    console.log(`Recherche de ${today} à ${tomorrow}`)
    
    const dispos = await disponibilitesRTDBService.getDisponibilitesByDateRange(today, tomorrow)
    console.log(`Résultat: ${dispos.length} disponibilités trouvées`)
    
    if (dispos.length > 0) {
      console.log('Exemple de disponibilité:')
      console.log(JSON.stringify(dispos[0], null, 2))
      
      // Vérifier les champs requis
      const exemple = dispos[0]
      console.log('\nVérification des champs requis:')
      console.log('- id:', exemple.id)
      console.log('- collaborateurId:', exemple.collaborateurId)
      console.log('- date:', exemple.date)
      console.log('- tenantId:', exemple.tenantId)
      console.log('- nom/prenom:', exemple.nom, exemple.prenom)
    } else {
      console.log('⚠️ Aucune disponibilité trouvée dans RTDB')
      console.log('Vérifiez:')
      console.log('- Y a-t-il des données dans Firebase RTDB ?')
      console.log('- Le tenantId est-il correct ?')
      console.log('- Les dates sont-elles au bon format ?')
    }
    
    // 2. Test de la plage de dates élargie
    console.log('\n2. Test avec plage de dates élargie...')
    const lastWeek = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
    
    const disposLarge = await disponibilitesRTDBService.getDisponibilitesByDateRange(lastWeek, nextWeek)
    console.log(`Résultat élargi: ${disposLarge.length} disponibilités trouvées`)
    
    if (disposLarge.length > 0) {
      // Regrouper par date
      const parDate = {}
      disposLarge.forEach(d => {
        if (!parDate[d.date]) parDate[d.date] = 0
        parDate[d.date]++
      })
      
      console.log('Répartition par date:')
      Object.entries(parDate).forEach(([date, count]) => {
        console.log(`  ${date}: ${count} dispos`)
      })
    }
    
  } catch (error) {
    console.error('Erreur lors du test:', error)
  }
}

// Exporter pour utilisation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testDetaille }
}

// Auto-exécution si lancé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testDetaille()
}
