
/**
 * Script de test de charge pour valider les optimisations
 */

// Simuler l'utilisation de l'application
function simulateUserActivity() {
  console.log('🎭 Simulation d'activité utilisateur...')
  
  // Simuler le scroll dans le planning
  simulateScrolling()
  
  // Simuler les changements de filtres
  simulateFiltering()
  
  // Simuler l'ouverture de modales
  simulateModalInteractions()
  
  // Mesurer les performances
  measurePerformance()
}

function simulateScrolling() {
  console.log('📜 Simulation de scroll...')
  
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      window.scrollTo(0, i * 100)
      console.log(`Scroll position: ${i * 100}px`)
    }, i * 100)
  }
}

function simulateFiltering() {
  console.log('🔍 Simulation de filtres...')
  
  // Simuler différents états de filtres
  const filterStates = [
    { date: '2024-01-01', collaborateur: '' },
    { date: '2024-01-02', collaborateur: 'john' },
    { date: '2024-01-03', collaborateur: '' }
  ]
  
  filterStates.forEach((state, index) => {
    setTimeout(() => {
      console.log(`Filtre appliqué: ${JSON.stringify(state)}`)
      // Ici on déclencherait les événements de filtre
    }, index * 500)
  })
}

function simulateModalInteractions() {
  console.log('🗂️ Simulation d\'interactions modales...')
  
  setTimeout(() => {
    console.log('Ouverture modale collaboration')
    // Simuler ouverture/fermeture modale
  }, 1000)
}

function measurePerformance() {
  console.log('📊 Mesure des performances...')
  
  // Mesurer l'utilisation mémoire
  if (performance.memory) {
    const memory = performance.memory
    console.log(`Mémoire utilisée: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`)
    console.log(`Mémoire limite: ${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`)
  }
  
  // Mesurer les listeners actifs
  if (window.firestoreListenerManager) {
    const stats = window.firestoreListenerManager.getStats()
    console.log(`Listeners Firestore actifs: ${stats.total}`)
  }
}

// Lancer le test automatiquement
if (typeof window !== 'undefined') {
  simulateUserActivity()
  
  // Répéter le test toutes les 30 secondes
  setInterval(simulateUserActivity, 30000)
}
