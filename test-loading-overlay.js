// Test de l'overlay de chargement
console.log('🧪 Test de l\'overlay de chargement du planning')

// Simuler les états de chargement
const states = {
  isInitialLoad: true,
  loadingCollaborateurs: true,
  loadingDisponibilites: false,
  fetchingRanges: false,
  extending: false
}

const isBusy = () => {
  return states.loadingCollaborateurs || 
         states.loadingDisponibilites || 
         states.fetchingRanges || 
         states.extending
}

const shouldShowOverlay = () => {
  return states.isInitialLoad && isBusy()
}

console.log('📊 État initial:')
console.log('  - isInitialLoad:', states.isInitialLoad)
console.log('  - loadingCollaborateurs:', states.loadingCollaborateurs)
console.log('  - loadingDisponibilites:', states.loadingDisponibilites)
console.log('  - isBusy:', isBusy())
console.log('  - shouldShowOverlay:', shouldShowOverlay())

// Simuler le chargement des collaborateurs terminé
setTimeout(() => {
  console.log('\n🔄 Collaborateurs chargés...')
  states.loadingCollaborateurs = false
  states.loadingDisponibilites = true
  
  console.log('📊 État après collaborateurs:')
  console.log('  - loadingCollaborateurs:', states.loadingCollaborateurs)
  console.log('  - loadingDisponibilites:', states.loadingDisponibilites)
  console.log('  - isBusy:', isBusy())
  console.log('  - shouldShowOverlay:', shouldShowOverlay())
}, 1000)

// Simuler le chargement des disponibilités terminé
setTimeout(() => {
  console.log('\n🔄 Disponibilités chargées...')
  states.loadingDisponibilites = false
  
  // Attendre un peu puis marquer la fin du chargement initial
  setTimeout(() => {
    console.log('\n✅ Chargement initial terminé')
    states.isInitialLoad = false
    
    console.log('📊 État final:')
    console.log('  - isInitialLoad:', states.isInitialLoad)
    console.log('  - loadingCollaborateurs:', states.loadingCollaborateurs)
    console.log('  - loadingDisponibilites:', states.loadingDisponibilites)
    console.log('  - isBusy:', isBusy())
    console.log('  - shouldShowOverlay:', shouldShowOverlay())
    console.log('\n🎉 Overlay masqué - Planning prêt!')
  }, 500)
}, 2000)
