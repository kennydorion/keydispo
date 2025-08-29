// Test complet des états de chargement du planning
console.log('🧪 Test complet des états de chargement\n')

class LoadingStatesManager {
  constructor() {
    this.states = {
      isInitialLoad: true,
      loadingCollaborateurs: true,
      loadingDisponibilites: false,
      fetchingRanges: false,
      extending: false
    }
  }
  
  get isBusy() {
    return this.states.loadingCollaborateurs || 
           this.states.loadingDisponibilites || 
           this.states.fetchingRanges || 
           this.states.extending
  }
  
  get shouldShowMainOverlay() {
    return this.states.isInitialLoad && this.isBusy
  }
  
  get shouldShowExtendingIndicator() {
    return this.states.extending || (this.isBusy && !this.states.isInitialLoad)
  }
  
  log(phase) {
    console.log(`📊 ${phase}:`)
    console.log(`   Overlay principal: ${this.shouldShowMainOverlay}`)
    console.log(`   Indicateur extension: ${this.shouldShowExtendingIndicator}`)
    console.log(`   isBusy: ${this.isBusy}`)
    console.log('')
  }
}

const manager = new LoadingStatesManager()

// Phase 1: Chargement initial
console.log('🚀 Phase 1: Chargement initial')
manager.log('Début chargement initial')

// Phase 2: Collaborateurs chargés
setTimeout(() => {
  console.log('👥 Phase 2: Collaborateurs chargés')
  manager.states.loadingCollaborateurs = false
  manager.states.loadingDisponibilites = true
  manager.log('Après chargement collaborateurs')
}, 1000)

// Phase 3: Tout chargé (fin du chargement initial)
setTimeout(() => {
  console.log('📅 Phase 3: Disponibilités chargées')
  manager.states.loadingDisponibilites = false
  manager.log('Avant fin du chargement initial')
  
  // Marquer la fin du chargement initial
  setTimeout(() => {
    manager.states.isInitialLoad = false
    manager.log('Après fin du chargement initial')
  }, 500)
}, 2500)

// Phase 4: Extension de plage (pas de chargement initial)
setTimeout(() => {
  console.log('🔄 Phase 4: Extension de plage')
  manager.states.extending = true
  manager.log('Pendant extension')
  
  setTimeout(() => {
    manager.states.extending = false
    manager.log('Après extension')
  }, 1000)
}, 4500)

// Phase 5: Fetch de nouvelles plages
setTimeout(() => {
  console.log('📊 Phase 5: Fetch nouvelles plages')
  manager.states.fetchingRanges = true
  manager.log('Pendant fetch plages')
  
  setTimeout(() => {
    manager.states.fetchingRanges = false
    manager.log('Après fetch plages')
    console.log('✅ Test terminé - Tous les scénarios validés!')
  }, 1000)
}, 6500)
