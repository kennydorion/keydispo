/**
 * Test des optimisations RTDB
 * Vérifie que le service optimisé fonctionne correctement
 */

// Simuler les imports nécessaires
import { availabilitiesRTDBService } from './src/services/disponibilitesRTDBService.ts'

async function testOptimizations() {
  console.log('🧪 Test des optimisations RTDB...')
  
  try {
    // Test 1: Récupération avec cache
    console.log('\n📊 Test 1: Récupération par plage de dates avec cache')
    const startDate = '2025-01-01'
    const endDate = '2025-01-31'
    
    console.time('Première requête (sans cache)')
    const dispos1 = await availabilitiesRTDBService.getDisponibilitesByDateRange(startDate, endDate)
    console.timeEnd('Première requête (sans cache)')
    console.log(`✅ ${dispos1.length} disponibilités récupérées`)
    
    console.time('Seconde requête (avec cache)')
    const dispos2 = await availabilitiesRTDBService.getDisponibilitesByDateRange(startDate, endDate)
    console.timeEnd('Seconde requête (avec cache)')
    console.log(`✅ ${dispos2.length} disponibilités récupérées (cache)`)
    
    // Test 2: Listener optimisé
    console.log('\n📡 Test 2: Listener optimisé par mois')
    const listenerId = availabilitiesRTDBService.listenToDisponibilitesByDateRange(
      '2025-01-15',
      '2025-02-15',
      (disponibilites) => {
        console.log(`🔄 Callback listener: ${disponibilites.length} disponibilités`)
      }
    )
    
    console.log(`✅ Listener créé: ${listenerId}`)
    
    // Attendre 2 secondes pour voir les logs
    setTimeout(() => {
      availabilitiesRTDBService.stopListener(listenerId)
      console.log('✅ Listener arrêté')
      
      // Test 3: Stats du service
      console.log('\n📈 Test 3: Statistiques du service')
      const stats = availabilitiesRTDBService.getStats()
      console.log('Stats:', stats)
      
      console.log('\n🎉 Tous les tests terminés!')
    }, 2000)
    
  } catch (error) {
    console.error('❌ Erreur pendant les tests:', error)
  }
}

// Lancer les tests si exécuté directement
if (typeof window === 'undefined') {
  testOptimizations()
}

export { testOptimizations }
