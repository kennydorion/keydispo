#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

console.log('🚀 SCRIPT DE TEST COMPLET - Structure Optimisée KeyDispo')
console.log('=' * 60)

const commands = {
  // 1. Nettoyage de la base
  clean: {
    description: '🧹 Nettoyer la base de données',
    command: 'node scripts/clear-database.js --force',
    required: true
  },
  
  // 2. Import optimisé
  import: {
    description: '📥 Import optimisé des données CSV',
    command: 'node scripts/optimized-import.js public/disponibilites-ct-2025-08-09.csv default',
    required: true
  },
  
  // 3. Validation
  validate: {
    description: '✅ Validation et test de performance',
    command: 'node scripts/validate-import.js',
    required: false
  }
}

async function runCommand(name, config) {
  console.log(`\n${config.description}`)
  console.log('-' * 40)
  
  try {
    const startTime = Date.now()
    
    console.log(`💻 Commande: ${config.command}`)
    const output = execSync(config.command, { 
      encoding: 'utf-8',
      stdio: 'pipe'
    })
    
    const duration = Date.now() - startTime
    
    console.log(output)
    console.log(`⏱️  Terminé en ${duration}ms`)
    
    return { success: true, duration, output }
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de "${name}":`)
    console.error(error.stdout || error.message)
    
    if (config.required) {
      console.error('🛑 Commande requise échouée, arrêt du processus')
      process.exit(1)
    }
    
    return { success: false, error: error.message }
  }
}

async function checkPrerequisites() {
  console.log('🔍 Vérification des prérequis...')
  
  const checks = [
    {
      name: 'Fichier CSV',
      check: () => existsSync('public/disponibilites-ct-2025-08-09.csv'),
      message: 'Fichier CSV des disponibilités présent'
    },
    {
      name: 'Scripts d\'import',
      check: () => existsSync('scripts/optimized-import.js'),
      message: 'Script d\'import optimisé présent'
    },
    {
      name: 'Script de nettoyage',
      check: () => existsSync('scripts/clear-database.js'),
      message: 'Script de nettoyage présent'
    },
    {
      name: 'Script de validation',
      check: () => existsSync('scripts/validate-import.js'),
      message: 'Script de validation présent'
    }
  ]
  
  let allGood = true
  
  for (const check of checks) {
    const result = check.check()
    const status = result ? '✅' : '❌'
    console.log(`   ${status} ${check.message}`)
    
    if (!result) {
      allGood = false
    }
  }
  
  if (!allGood) {
    console.log('\n❌ Prérequis manquants, arrêt du processus')
    process.exit(1)
  }
  
  console.log('\n✅ Tous les prérequis sont satisfaits')
}

async function analyzeCSV() {
  console.log('\n📊 Analyse du fichier CSV...')
  
  try {
    const csvContent = readFileSync('public/disponibilites-ct-2025-08-09.csv', 'utf-8')
    const lines = csvContent.split('\n').filter(line => line.trim())
    
    console.log(`   📄 Total lignes: ${lines.length}`)
    console.log(`   📋 En-têtes: ${lines[0]}`)
    
    // Analyser les collaborateurs uniques
    const collaborateurs = new Set()
    const lieux = new Set()
    const dates = new Set()
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';')
      if (cols.length >= 7) {
        collaborateurs.add(`${cols[0]}_${cols[1]}`)
        if (cols[7] && cols[7] !== 'INDISPONIBLE') {
          lieux.add(cols[7])
        }
        if (cols[6]) {
          dates.add(cols[6])
        }
      }
    }
    
    console.log(`   👥 Collaborateurs uniques: ${collaborateurs.size}`)
    console.log(`   📍 Lieux uniques: ${lieux.size}`)
    console.log(`   📅 Dates uniques: ${dates.size}`)
    
    // Estimation de la réduction
    const estimatedDocs = collaborateurs.size + Math.ceil(dates.size / 30) * collaborateurs.size + lieux.size
    const reduction = ((lines.length - estimatedDocs) / lines.length * 100).toFixed(1)
    
    console.log(`   📈 Réduction estimée: ${lines.length} → ~${estimatedDocs} documents (-${reduction}%)`)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse CSV:', error.message)
  }
}

async function generateSummary(results) {
  console.log('\n📋 RÉSUMÉ DE L\'EXÉCUTION')
  console.log('=' * 40)
  
  let totalDuration = 0
  let successCount = 0
  
  Object.entries(results).forEach(([name, result]) => {
    const status = result.success ? '✅' : '❌'
    const duration = result.duration ? `(${result.duration}ms)` : ''
    
    console.log(`   ${status} ${commands[name].description} ${duration}`)
    
    if (result.success) {
      successCount++
      totalDuration += result.duration || 0
    }
  })
  
  console.log(`\n📊 Statistiques:`)
  console.log(`   Commandes réussies: ${successCount}/${Object.keys(results).length}`)
  console.log(`   Temps total: ${totalDuration}ms`)
  
  if (successCount === Object.keys(results).length) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS!')
    console.log('La structure optimisée est prête à être utilisée.')
    
    console.log('\n📝 Prochaines étapes:')
    console.log('   1. Tester l\'application web (npm run dev)')
    console.log('   2. Vérifier les nouvelles vues optimisées')
    console.log('   3. Comparer les performances avec l\'ancienne structure')
    
  } else {
    console.log('\n⚠️  Certains tests ont échoué.')
    console.log('Vérifiez les erreurs ci-dessus avant de continuer.')
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\nUsage: node test-optimized-structure.js [options]')
    console.log('\nOptions:')
    console.log('  --help, -h          Afficher cette aide')
    console.log('  --skip-clean        Ignorer le nettoyage de base')
    console.log('  --skip-validation   Ignorer la validation')
    console.log('  --analyze-only      Analyser seulement le CSV')
    return
  }
  
  if (args.includes('--analyze-only')) {
    await analyzeCSV()
    return
  }
  
  try {
    // Vérifications préalables
    await checkPrerequisites()
    await analyzeCSV()
    
    // Exécution des commandes
    const results = {}
    
    for (const [name, config] of Object.entries(commands)) {
      // Permettre d'ignorer certaines étapes
      if (args.includes(`--skip-${name}`)) {
        console.log(`\n⏭️  Étape "${name}" ignorée`)
        continue
      }
      
      results[name] = await runCommand(name, config)
    }
    
    // Résumé final
    await generateSummary(results)
    
  } catch (error) {
    console.error('\n💥 Erreur fatale:', error.message)
    process.exit(1)
  }
}

// Exécution
main().catch(error => {
  console.error('💥 Erreur non gérée:', error)
  process.exit(1)
})
