#!/usr/bin/env node

// Script d'optimisation automatique des watchers Vue critiques
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Optimisation automatique des watchers Vue...\n')

const targetFile = path.join(__dirname, 'src/views/SemaineVirtualClean.vue')

// Lire le contenu du fichier
let content = fs.readFileSync(targetFile, 'utf8')

// Optimisations spécifiques
const optimizations = [
  {
    name: 'Debounce des watchers loadedDays',
    pattern: /watch\(loadedDays, \(\) => \{[\s\S]*?requestAnimationFrame\(\(\) => \{ recomputeWindow\(planningScroll\.value \|\| null\); measureGridOrigins\(\); measureRowPitch\(\); \}\)\s*\}\)/,
    replacement: `// Debounced watcher pour optimiser les performances
const loadedDaysDebounced = (() => {
  let timeoutId: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      updateTodayOverlayX()
      requestAnimationFrame(() => { 
        recomputeWindow(planningScroll.value || null)
        measureGridOrigins()
        measureRowPitch()
      })
    }, 100)
  }
})()

watch(loadedDays, loadedDaysDebounced)`
  },
  {
    name: 'Optimisation watcher visibleDays/collaborateurs',
    pattern: /watch\(\[visibleDays, paginatedCollaborateurs\], \(\) => \{[\s\S]*?\}, \{ immediate: true \}\)/,
    replacement: `// Watcher optimisé avec debounce
const updateSetsDebounced = (() => {
  let timeoutId: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      updatePresenceSets()
      nextTick(() => {
        recomputeRowWindow()
      })
    }, 50)
  }
})()

watch([visibleDays, paginatedCollaborateurs], updateSetsDebounced, { immediate: true })`
  }
]

let optimizationCount = 0

optimizations.forEach(opt => {
  if (opt.pattern.test(content)) {
    content = content.replace(opt.pattern, opt.replacement)
    console.log(`✅ ${opt.name}`)
    optimizationCount++
  } else {
    console.log(`⏭️ ${opt.name} - déjà optimisé ou non trouvé`)
  }
})

// Sauvegarder le fichier optimisé
if (optimizationCount > 0) {
  fs.writeFileSync(targetFile, content)
  console.log(`\n🎯 ${optimizationCount} optimisations appliquées`)
} else {
  console.log('\n✨ Aucune optimisation nécessaire')
}

// Créer un script de surveillance des performances en temps réel
const performanceMonitorScript = `
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
        console.log(\`📡 Listener Firestore créé (\${listenerCount} total)\`)
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
          console.log(\`👁️ \${watcherCalls} appels de watchers Vue\`)
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
        console.log(\`🔄 \${renderCount} mutations DOM détectées\`)
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
    console.log(\`   Listeners Firestore actifs: \${window.firestoreListenerManager?.getStats?.()?.total || 'N/A'}\`)
    console.log(\`   Mémoire utilisée: \${Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB\`)
    console.log(\`   FPS moyen: \${this.calculateFPS()}\`)
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
`

const monitorFile = path.join(__dirname, 'src/utils/performanceMonitor.ts')
fs.writeFileSync(monitorFile, performanceMonitorScript)

console.log('📊 Moniteur de performance créé dans src/utils/performanceMonitor.ts')
console.log('\n✅ Optimisations terminées!')
