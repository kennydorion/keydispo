#!/usr/bin/env node

// Script de diagnostic de latence pour l'application Vue
console.log('🔍 Diagnostic de latence - Keydispo App\n')

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Analyse des listeners Firestore
function analyzeFirestoreListeners() {
  console.log('📡 ANALYSE DES LISTENERS FIRESTORE:')
  console.log('=' .repeat(50))
  
  const srcDir = path.join(__dirname, 'src')
  const listeners = []
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      
      lines.forEach((line, index) => {
        if (line.includes('onSnapshot') && !line.includes('import')) {
          listeners.push({
            file: path.relative(__dirname, filePath),
            line: index + 1,
            code: line.trim()
          })
        }
      })
    } catch (e) {
      // Ignorer les erreurs de lecture
    }
  }
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir)
    items.forEach(item => {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath)
      } else if (item.endsWith('.vue') || item.endsWith('.ts') || item.endsWith('.js')) {
        scanFile(itemPath)
      }
    })
  }
  
  scanDirectory(srcDir)
  
  console.log(`Nombre total de listeners: ${listeners.length}`)
  
  // Grouper par service
  const byService = {}
  listeners.forEach(l => {
    const service = l.file.split('/')[1] || 'other'
    if (!byService[service]) byService[service] = []
    byService[service].push(l)
  })
  
  Object.keys(byService).forEach(service => {
    console.log(`\n📁 ${service}: ${byService[service].length} listeners`)
    byService[service].forEach(l => {
      console.log(`   - ${l.file}:${l.line}`)
    })
  })
}

// Analyse des watchers Vue
function analyzeVueWatchers() {
  console.log('\n👁️ ANALYSE DES WATCHERS VUE:')
  console.log('=' .repeat(50))
  
  const srcDir = path.join(__dirname, 'src')
  const watchers = []
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      
      lines.forEach((line, index) => {
        if (line.includes('watch(') && !line.includes('import')) {
          watchers.push({
            file: path.relative(__dirname, filePath),
            line: index + 1,
            code: line.trim()
          })
        }
      })
    } catch (e) {
      // Ignorer les erreurs de lecture
    }
  }
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir)
    items.forEach(item => {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath)
      } else if (item.endsWith('.vue') || item.endsWith('.ts') || item.endsWith('.js')) {
        scanFile(itemPath)
      }
    })
  }
  
  scanDirectory(srcDir)
  
  console.log(`Nombre total de watchers: ${watchers.length}`)
  
  watchers.forEach(w => {
    console.log(`   - ${w.file}:${w.line} - ${w.code}`)
  })
}

// Analyse des configurations de performance
function analyzePerformanceConfig() {
  console.log('\n⚙️ ANALYSE DES CONFIGURATIONS:')
  console.log('=' .repeat(50))
  
  // MultiUserService config
  const multiUserPath = path.join(__dirname, 'src/services/multiUserService.ts')
  if (fs.existsSync(multiUserPath)) {
    const content = fs.readFileSync(multiUserPath, 'utf8')
    const configMatch = content.match(/CONFIG\s*=\s*\{([^}]+)\}/s)
    if (configMatch) {
      console.log('📊 MultiUserService CONFIG:')
      console.log(configMatch[0])
    }
  }
  
  // Firebase config
  const firebaseConfigPath = path.join(__dirname, 'firebase.json')
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'))
    console.log('\n🔥 Firebase emulators config:')
    console.log(JSON.stringify(config.emulators, null, 2))
  }
}

// Recommandations d'optimisation
function generateRecommendations() {
  console.log('\n💡 RECOMMANDATIONS D\'OPTIMISATION:')
  console.log('=' .repeat(50))
  
  console.log('1. 🎯 RÉDUCTION DES LISTENERS:')
  console.log('   - Combiner les listeners similaires')
  console.log('   - Utiliser des listeners conditionnels')
  console.log('   - Nettoyer les listeners inactifs')
  
  console.log('\n2. 📦 OPTIMISATION DES REQUÊTES:')
  console.log('   - Réduire les limites de résultats')
  console.log('   - Utiliser des index Firestore optimaux')
  console.log('   - Paginer les grandes collections')
  
  console.log('\n3. 🔄 GESTION DE L\'ÉTAT:')
  console.log('   - Debouncer les watchers fréquents')
  console.log('   - Utiliser des computed au lieu de watchers')
  console.log('   - Mettre en cache les données statiques')
  
  console.log('\n4. 🚀 OPTIMISATIONS SPÉCIFIQUES:')
  console.log('   - Scrolling virtuel agressif')
  console.log('   - Lazy loading des composants')
  console.log('   - Web Workers pour calculs lourds')
}

// Exécution du diagnostic
analyzeFirestoreListeners()
analyzeVueWatchers()
analyzePerformanceConfig()
generateRecommendations()

console.log('\n✅ Diagnostic terminé!')
