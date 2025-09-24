/**
 * Outil de diagnostic pour analyser les problèmes de filtrage
 * À exécuter dans la console de l'application
 */

// Déclarations globales pour calmer le typage des helpers et des stores injectés sur window
declare global {
  interface Window {
    __planningData?: any
    __planningFilters?: any
    diagnoseFiltreADV?: () => Promise<void>
    testScenarioADV?: (metier?: string, lieu?: string, date?: string) => void
    examineRawData?: () => void
  }
}

// Fonction utilitaire pour diagnostiquer le filtrage ADV
export async function diagnoseFiltreADV() {
  
  
  // 1. Vérifier l'état actuel des filtres
  const planningData: any = window.__planningData || {}
  const planningFilters: any = window.__planningFilters || {}
  
  console.log('📊 État des filtres:', planningFilters.filterState)
  console.log('📈 Statistiques:', planningData.filterStats?.value)
  
  // 2. Examiner les collaborateurs
  const collaborateurs: any[] = planningData.filteredCollaborateurs?.value || []
  const metierFilter: string | undefined = planningFilters.filterState?.metier
  
  console.log(`👥 Collaborateurs (${collaborateurs.length}):`)
  if (metierFilter) {
    const matchingMetier = collaborateurs.filter((c: any) => c.metier?.toLowerCase().trim() === metierFilter.toLowerCase().trim())
    console.log(`   - Avec métier "${metierFilter}": ${matchingMetier.length}`)
    matchingMetier.slice(0, 3).forEach((c: any) => {
      console.log(`     • ${c.nom} ${c.prenom} (${c.metier})`)
    })
  }
  
  // 3. Examiner les disponibilités
  const disponibilites: any[] = planningData.filteredDisponibilites?.value || []
  const lieuFilter: string | undefined = planningFilters.filterState?.lieu
  const dateFilter: string | undefined = planningFilters.filterState?.dateFrom
  
  console.log(`📅 Disponibilités filtrées (${disponibilites.length}):`)
  
  if (dateFilter) {
    const forDate = disponibilites.filter((d: any) => d.date === dateFilter)
    console.log(`   - Pour le ${dateFilter}: ${forDate.length}`)
    
    if (lieuFilter) {
      const forLieu = forDate.filter((d: any) => d.lieu?.toLowerCase().trim() === lieuFilter.toLowerCase().trim())
      console.log(`   - Avec lieu "${lieuFilter}": ${forLieu.length}`)
      forLieu.slice(0, 5).forEach((d: any) => {
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
export function testScenarioADV(metier: string = 'AS', lieu: string = 'ADV', date: string = '2025-09-15') {
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
    setTimeout((): void => {
      const stats: any = window.__planningData?.filterStats?.value
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
  
  const planningData: any = window.__planningData
  if (!planningData) {
    console.error('❌ Données planning non disponibles')
    return
  }
  
  // Données non filtrées
  const allCollabs: any[] = planningData.collaborateurs || []
  const allDispos: any[] = planningData.disponibilites || []
  
  console.log(`👥 Total collaborateurs: ${allCollabs.length}`)
  
  // Métiers uniques
  const metiers = [...new Set(allCollabs.map((c: any) => c.metier).filter(Boolean))]
  console.log('🏢 Métiers disponibles:', metiers.sort())
  
  console.log(`📅 Total disponibilités: ${allDispos.length}`)
  
  // Lieux uniques (top 20)
  const lieux = [...new Set(allDispos.map((d: any) => d.lieu).filter(Boolean))]
  console.log('📍 Lieux disponibles (top 20):', lieux.sort().slice(0, 20))
  
  // Disponibilités pour le 15 septembre
  const sept15 = allDispos.filter((d: any) => d.date === '2025-09-15')
  console.log(`📆 Disponibilités 2025-09-15: ${sept15.length}`)
  sept15.forEach((d: any) => {
    console.log(`   • ${d.nom} ${d.prenom} (${d.metier}) - ${d.lieu || 'sans lieu'} - ${d.type || 'standard'}`)
  })
  
  // Disponibilités avec lieu ADV (toutes dates)
  const advDispos = allDispos.filter((d: any) => d.lieu?.toLowerCase().trim() === 'adv')
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
