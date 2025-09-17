// Fonction de debug spécifique pour le cas ADV
export function debugADVMission() {
  console.log('🚨 DEBUG ADV MISSION - Diagnostic complet')
  
  // Accéder aux instances globales si disponibles
  const planningData = (window as any).__DEBUG_PLANNING_DATA__
  const planningFilters = (window as any).__DEBUG_PLANNING_FILTERS__
  
  if (!planningData || !planningFilters) {
    console.error('❌ Instances de debug non disponibles. Assure-toi que le composant PlanningOptimized est monté.')
    return
  }
  
  console.log('📊 État des filtres:', {
    lieu: planningFilters.lieu,
    statut: planningFilters.statut,
    dateFrom: planningFilters.dateFrom,
    dateTo: planningFilters.dateTo
  })
  
  // Analyser toutes les dispos du 15 septembre
  const allDispos = planningData.disponibilites || []
  const disposDu15 = allDispos.filter((d: any) => d.date === '2025-09-15')
  
  console.log(`📅 Toutes les disponibilités du 2025-09-15: ${disposDu15.length} trouvées`)
  disposDu15.forEach((d: any, i: number) => {
    console.log(`${i + 1}. ${d.nom} ${d.prenom} - ${d.metier} - lieu: "${d.lieu}" - type: "${d.type}"`)
  })
  
  // Rechercher spécifiquement ADV
  const advDispos = disposDu15.filter((d: any) => {
    const lieu = (d.lieu || '').toString().trim().toLowerCase()
    return lieu.includes('adv')
  })
  
  console.log(`🎯 Dispos contenant "ADV" le 15/09: ${advDispos.length} trouvées`)
  advDispos.forEach((d: any, i: number) => {
    console.log(`ADV ${i + 1}:`, {
      personne: `${d.nom} ${d.prenom}`,
      metier: d.metier,
      lieu: d.lieu,
      type: d.type,
      collaborateurId: d.collaborateurId
    })
  })
  
  // Tester le filtre exact
  planningFilters.lieu = 'ADV'
  planningFilters.statut = { text: 'En mission', value: 'mission' }
  planningFilters.dateFrom = '2025-09-15'
  planningFilters.dateTo = '2025-09-15'
  
  console.log('🔧 Application des filtres ADV exactes...')
  
  // Forcer le recalcul après un petit délai
  setTimeout(() => {
    const filtered = planningData.filteredDisponibilites
    console.log(`✅ Résultat du filtrage: ${filtered.length} disponibilités`)
    
    if (filtered.length > 0) {
      console.log('🎉 Dispos filtrées trouvées:')
      filtered.forEach((d: any, i: number) => {
        console.log(`${i + 1}. ${d.nom} ${d.prenom} - ${d.lieu} - ${d.type}`)
      })
    } else {
      console.log('❌ Aucune dispo filtrée trouvée')
      
      // Diagnostic supplémentaire
      console.log('🔍 Diagnostic détaillé:')
      console.log('- Collaborateurs filtrés:', planningData.filteredCollaborateurs.length)
      console.log('- Options lieux disponibles:', planningFilters.lieuxOptions)
      console.log('- Options statuts disponibles:', planningFilters.statutOptions)
    }
  }, 100)
}

// Fonction rapide pour voir toutes les données du 15 septembre
export function voirToutLe15Septembre() {
  console.log('📅 ANALYSE COMPLÈTE DU 15 SEPTEMBRE 2025')
  
  const planningData = (window as any).__DEBUG_PLANNING_DATA__
  if (!planningData) {
    console.error('❌ Données non disponibles')
    return
  }
  
  const allDispos = planningData.disponibilites || []
  const disposDu15 = allDispos.filter((d: any) => d.date === '2025-09-15')
  
  console.log(`Total: ${disposDu15.length} disponibilités`)
  
  // Grouper par lieu
  const parLieu = disposDu15.reduce((acc: any, d: any) => {
    const lieu = (d.lieu || 'AUCUN').toString().trim()
    if (!acc[lieu]) acc[lieu] = []
    acc[lieu].push(d)
    return acc
  }, {})
  
  console.log('📍 Par lieu:')
  Object.entries(parLieu).forEach(([lieu, dispos]: [string, any]) => {
    console.log(`  ${lieu}: ${dispos.length} dispo(s)`)
    dispos.forEach((d: any) => {
      console.log(`    - ${d.nom} ${d.prenom} (${d.metier}) - type: ${d.type}`)
    })
  })
  
  // Recherche spécifique ADV
  const advMatches = disposDu15.filter((d: any) => {
    const lieu = (d.lieu || '').toString().toLowerCase()
    return lieu.includes('adv') || lieu === 'adv'
  })
  
  console.log(`🎯 Correspondances ADV: ${advMatches.length}`)
  advMatches.forEach((d: any) => {
    console.log(`  - ${d.nom} ${d.prenom} - lieu: "${d.lieu}" - type: ${d.type}`)
  })
}

// Exposer les fonctions globalement
if (typeof window !== 'undefined') {
  (window as any).debugADVMission = debugADVMission;
  (window as any).voirToutLe15Septembre = voirToutLe15Septembre;
  
  // Créer un raccourci simple
  (window as any).debug15 = voirToutLe15Septembre;
  (window as any).debugADV = debugADVMission;
  
  console.log('🛠️ Fonctions de debug ADV chargées:')
  console.log('  - debug15() : voir toutes les dispos du 15 septembre')
  console.log('  - debugADV() : tester les filtres ADV + En mission')
  console.log('  - voirToutLe15Septembre() : analyse complète')
  console.log('  - debugADVMission() : diagnostic complet')
}
