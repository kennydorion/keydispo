
/**
 * Moniteur de performance temps réel pour le planning
 */
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private observers: Map<string, PerformanceObserver> = new Map()
  
  start() {
    console.log('📊 Démarrage du monitoring des performances')
    
    // Observer les listeners Firestore
    this.trackFirestoreListeners()
    
    // Observer les watchers Vue
    this.trackVueWatchers()
    
    // Observer les re-renders
    this.trackRerenders()
    
    // Rapport périodique
    setInterval(() => this.generateReport(), 10000)
  }
  
  private trackFirestoreListeners() {
    const originalOnSnapshot = window.firebase?.firestore?.onSnapshot
    if (originalOnSnapshot) {
      let listenerCount = 0
      window.firebase.firestore.onSnapshot = (...args: any[]) => {
        listenerCount++
        console.log(`📡 Listener Firestore créé (${listenerCount} total)`)
        return originalOnSnapshot.apply(this, args)
      }
    }
  }
  
  private trackVueWatchers() {
    // Intercepter les watchers Vue fréquents
    let watcherCalls = 0
    const originalWatch = window.Vue?.watch
    if (originalWatch) {
      window.Vue.watch = (...args: any[]) => {
        watcherCalls++
        if (watcherCalls % 50 === 0) {
          console.log(`👁️ ${watcherCalls} appels de watchers Vue`)
        }
        return originalWatch.apply(this, args)
      }
    }
  }
  
  private trackRerenders() {
    // Surveiller les re-renders excessifs
    let renderCount = 0
    const observer = new MutationObserver(() => {
      renderCount++
      if (renderCount % 100 === 0) {
        console.log(`🔄 ${renderCount} mutations DOM détectées`)
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    })
  }
  
  private generateReport() {
    console.log('📊 RAPPORT DE PERFORMANCE:')
    console.log(`   Listeners Firestore actifs: ${window.firestoreListenerManager?.getStats?.()?.total || 'N/A'}`)
    console.log(`   Mémoire utilisée: ${Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB`)
    console.log(`   FPS moyen: ${this.calculateFPS()}`)
  }
  
  private calculateFPS(): number {
    // Calculer le FPS approximatif
    let lastTime = performance.now()
    let frames = 0
    
    const measureFPS = () => {
      frames++
      const currentTime = performance.now()
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime))
        lastTime = currentTime
        frames = 0
        return fps
      }
      requestAnimationFrame(measureFPS)
      return 60 // default
    }
    
    return measureFPS()
  }
}

// Démarrer le monitoring automatiquement
if (typeof window !== 'undefined') {
  const monitor = new PerformanceMonitor()
  monitor.start()
}
