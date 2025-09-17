/**
 * Outil de diagnostic pour analyser les problèmes de filtrage
 * À exécuter dans la console de l'application
 */

// Fonction utilitaire pour diagnostiquer le filtrage ADV
export function diagnoseFiltreADV() {
  console.log('🔍 ===== DIAGNOSTIC FILTRE ADV =====')
  
  // 1. Vérifier l'état actuel des filtres
  const planningData = window.__planningData || {}
  const planningFilters = window.__planningFilters || {}
  
  console.log('📊 État des filtres:', planningFilters.filterState)
  console.log('📈 Statistiques:', planningData.filterStats?.value)
  
  // 2. Examiner les collaborateurs
  const collaborateurs = planningData.filteredCollaborateurs?.value || []
  const metierFilter = planningFilters.filterState?.metier
  
  console.log(`👥 Collaborateurs (${collaborateurs.length}):`)
  if (metierFilter) {
    const matchingMetier = collaborateurs.filter(c => c.metier?.toLowerCase().trim() === metierFilter.toLowerCase().trim())
    console.log(`   - Avec métier "${metierFilter}": ${matchingMetier.length}`)
    matchingMetier.slice(0, 3).forEach(c => {
      console.log(`     • ${c.nom} ${c.prenom} (${c.metier})`)
    })
  }
  
  // 3. Examiner les disponibilités
  const disponibilites = planningData.filteredDisponibilites?.value || []
  const lieuFilter = planningFilters.filterState?.lieu
  const dateFilter = planningFilters.filterState?.dateFrom
  
  console.log(`📅 Disponibilités filtrées (${disponibilites.length}):`)
  
  if (dateFilter) {
    const forDate = disponibilites.filter(d => d.date === dateFilter)
    console.log(`   - Pour le ${dateFilter}: ${forDate.length}`)
    
    if (lieuFilter) {
      const forLieu = forDate.filter(d => d.lieu?.toLowerCase().trim() === lieuFilter.toLowerCase().trim())
      console.log(`   - Avec lieu "${lieuFilter}": ${forLieu.length}`)
      forLieu.slice(0, 5).forEach(d => {
        console.log(`     • ${d.nom} ${d.prenom} (${d.metier}) - ${d.lieu} - ${d.type || 'standard'}`)
      })
    }
  }
  
  // 4. Tester manuellement le mapping des types
  console.log('🔧 Test mapping des types:')
  const sampleDispo = disponibilites[0]
  if (sampleDispo) {
    try {
      const { resolveDispoKind } = await import('../services/planningDisplayService')
      const kind = resolveDispoKind(sampleDispo)
      console.log(`   - Exemple: lieu="${sampleDispo.lieu}" type="${sampleDispo.type}" → "${kind.type}"`)
    } catch (error) {
      console.error('   - Erreur mapping:', error)
    }
  }
  
  console.log('🔍 ===== FIN DIAGNOSTIC =====')
}

// Fonction pour tester le scénario exact
export function testScenarioADV(metier = 'AS', lieu = 'ADV', date = '2025-09-15') {
  console.log(`🧪 ===== TEST SCÉNARIO: ${metier} + ${lieu} + ${date} =====`)
  
  // Appliquer les filtres
  if (window.__planningFilters?.updateFilters) {
    window.__planningFilters.updateFilters({
      metier,
      lieu,
      statut: 'En mission',
      dateFrom: date,
      dateTo: date
    })
    
    console.log('✅ Filtres appliqués - vérifiez les logs de debug')
    
    // Attendre un peu puis vérifier les résultats
    setTimeout(() => {
      const stats = window.__planningData?.filterStats?.value
      if (stats) {
        console.log(`📊 Résultats: ${stats.filteredCollaborateurs}/${stats.totalCollaborateurs} collaborateurs`)
        console.log(`📅 Disponibilités: ${stats.filteredDisponibilites}/${stats.totalDisponibilites}`)
      }
    }, 1000)
  } else {
    console.error('❌ Impossible d\'accéder aux filtres - vérifiez que vous êtes sur la page planning')
  }
  
  console.log('🧪 ===== FIN TEST =====')
}

// Fonction pour examiner les données brutes
export function examineRawData() {
  console.log('🔍 ===== EXAMEN DONNÉES BRUTES =====')
  
  const planningData = window.__planningData
  if (!planningData) {
    console.error('❌ Données planning non disponibles')
    return
  }
  
  // Données non filtrées
  const allCollabs = planningData.collaborateurs || []
  const allDispos = planningData.disponibilites || []
  
  console.log(`👥 Total collaborateurs: ${allCollabs.length}`)
  
  // Métiers uniques
  const metiers = [...new Set(allCollabs.map(c => c.metier).filter(Boolean))]
  console.log('🏢 Métiers disponibles:', metiers.sort())
  
  console.log(`📅 Total disponibilités: ${allDispos.length}`)
  
  // Lieux uniques (top 20)
  const lieux = [...new Set(allDispos.map(d => d.lieu).filter(Boolean))]
  console.log('📍 Lieux disponibles (top 20):', lieux.sort().slice(0, 20))
  
  // Disponibilités pour le 15 septembre
  const sept15 = allDispos.filter(d => d.date === '2025-09-15')
  console.log(`📆 Disponibilités 2025-09-15: ${sept15.length}`)
  sept15.forEach(d => {
    console.log(`   • ${d.nom} ${d.prenom} (${d.metier}) - ${d.lieu || 'sans lieu'} - ${d.type || 'standard'}`)
  })
  
  // Disponibilités avec lieu ADV (toutes dates)
  const advDispos = allDispos.filter(d => d.lieu?.toLowerCase().trim() === 'adv')
  console.log(`📍 Disponibilités lieu ADV (toutes dates): ${advDispos.length}`)
  if (advDispos.length > 0) {
    console.log('   Dates avec ADV:', [...new Set(advDispos.map(d => d.date))].sort())
    console.log('   Métiers avec ADV:', [...new Set(advDispos.map(d => d.metier))].sort())
  }
  
  console.log('🔍 ===== FIN EXAMEN =====')
}

// Exposer globalement pour utilisation dans la console
if (typeof window !== 'undefined') {
  window.diagnoseFiltreADV = diagnoseFiltreADV
  window.testScenarioADV = testScenarioADV
  window.examineRawData = examineRawData
}
