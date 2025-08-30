/**
 * Test d'intégration pour le moteur WASM ultra-performant
 * Vérifie la performance et la justesse des calculs de highlights
 */

import WASMHighlightEngine from '../services/wasmHighlightEngine'

// Configuration de test
const testConfig = {
  gridWidth: 420,
  gridHeight: 600,
  colWidth: 60,
  rowHeight: 30,
  colsCount: 7,
  rowsCount: 20
}

// Cas de test
const testCases = [
  { mouseX: 160, mouseY: 80, expectedCol: 2, expectedRow: 2, name: "Cellule (2,2)" },
  { mouseX: 30, mouseY: 15, expectedCol: 0, expectedRow: 0, name: "Coin supérieur gauche" },
  { mouseX: 390, mouseY: 570, expectedCol: 6, expectedRow: 19, name: "Coin inférieur droit" },
  { mouseX: 180, mouseY: 150, expectedCol: 3, expectedRow: 5, name: "Cellule milieu" }
]

async function runTests() {
  console.log('🧪 WASM Highlight Engine - Tests d\'intégration')
  console.log('=' .repeat(50))
  
  // Initialiser le moteur
  const engine = new WASMHighlightEngine()
  const isReady = await engine.waitForReady()
  
  console.log(`🚀 Moteur initialisé: JavaScript ultra-optimisé`)
  console.log(`✅ Status: ${isReady ? 'Ready' : 'Not Ready'}`)
  console.log('')
  
  if (!isReady) {
    console.log('❌ Moteur non prêt, arrêt des tests')
    return
  }
  
  // Configurer le moteur
  engine.configure(testConfig)
  
  // Tests de justesse
  console.log('📋 Tests de justesse:')
  let passed = 0
  let failed = 0
  
  for (const testCase of testCases) {
    const result = engine.calculateHighlight(testCase.mouseX, testCase.mouseY)
    
    if (!result) {
      console.log(`   ❌ ${testCase.name}: Aucun résultat retourné`)
      failed++
      continue
    }
    
    const isCorrect = result.colIndex === testCase.expectedCol && result.rowIndex === testCase.expectedRow
    
    if (isCorrect) {
      console.log(`   ✅ ${testCase.name}: (${result.colIndex}, ${result.rowIndex})`)
      passed++
    } else {
      console.log(`   ❌ ${testCase.name}: attendu (${testCase.expectedCol}, ${testCase.expectedRow}), obtenu (${result.colIndex}, ${result.rowIndex})`)
      failed++
    }
  }
  
  console.log('')
  console.log(`📊 Résultats: ${passed} réussis, ${failed} échoués`)
  
  // Test de performance
  console.log('')
  console.log('⚡ Tests de performance:')
  
  const iterations = 10000
  const perfTestCase = testCases[3] // Cas milieu
  
  const startTime = performance.now()
  
  for (let i = 0; i < iterations; i++) {
    engine.calculateHighlight(
      perfTestCase.mouseX + (i % 10), // Petite variation pour éviter l'optimisation
      perfTestCase.mouseY + (i % 10)
    )
  }
  
  const endTime = performance.now()
  const totalTime = endTime - startTime
  const avgTime = totalTime / iterations
  
  console.log(`   📈 ${iterations} calculs en ${totalTime.toFixed(2)}ms`)
  console.log(`   🎯 Moyenne: ${avgTime.toFixed(6)}ms par calcul`)
  console.log(`   🚀 Débit: ${Math.round(iterations / (totalTime / 1000))} calculs/seconde`)
  
  // Objectif de performance
  const targetTime = 0.01 // ms
  const performanceRatio = avgTime / targetTime
  
  if (avgTime <= targetTime) {
    console.log(`   ✅ Performance EXCELLENTE! (${performanceRatio.toFixed(1)}x l'objectif)`)
  } else if (avgTime <= targetTime * 2) {
    console.log(`   ⚠️ Performance acceptable (${performanceRatio.toFixed(1)}x l'objectif)`)
  } else {
    console.log(`   ❌ Performance insuffisante (${performanceRatio.toFixed(1)}x l'objectif)`)
  }
  
  // Afficher les statistiques du moteur
  const stats = engine.getPerformanceStats()
  if (stats) {
    console.log('📊 Statistiques du moteur:')
    console.log(`   Total calculs: ${stats.totalCalculations}`)
    console.log(`   Temps total: ${stats.totalTime.toFixed(2)}ms`)
    console.log(`   Moyenne par calcul: ${stats.averageTime.toFixed(6)}ms`)
  }
  
  console.log('')
  console.log('🎉 Tests terminés!')
  
  return {
    testsTotal: testCases.length,
    testsPassed: passed,
    testsFailed: failed,
    performanceMs: avgTime,
    engineType: 'javascript-optimized'
  }
}

// Exporter pour utilisation dans le navigateur
if (typeof window !== 'undefined') {
  (window as any).runWASMTests = runTests
}

export { runTests }
