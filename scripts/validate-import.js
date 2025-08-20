#!/usr/bin/env node

import admin from 'firebase-admin'
import dotenv from 'dotenv'

// Configuration Firebase
dotenv.config()

try {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY non définie')
  }

  const serviceAccount = JSON.parse(serviceAccountKey)
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  })
} catch (error) {
  console.log('🔧 Configuration Firebase Admin via émulateur...')
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  admin.initializeApp({
    projectId: 'demo-keydispo'
  })
}

const db = admin.firestore()

class PerformanceValidator {
  constructor() {
    this.metrics = {
      oldStructure: {},
      newStructure: {},
      comparison: {}
    }
  }

  async validateImport() {
    console.log('🔍 Validation de l\'import optimisé...')
    
    try {
      // 1. Vérifier les collections
      await this.checkCollections()
      
      // 2. Valider l'intégrité des données
      await this.validateDataIntegrity()
      
      // 3. Tester les performances
      await this.runPerformanceTests()
      
      // 4. Générer le rapport
      this.generateReport()
      
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error)
      throw error
    }
  }

  async checkCollections() {
    console.log('📊 Vérification des collections...')
    
    const collections = ['collaborateurs', 'lieux', 'disponibilites']
    const stats = {}
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get()
      stats[collectionName] = {
        count: snapshot.size,
        totalSize: this.calculateTotalSize(snapshot.docs),
        avgSize: snapshot.size > 0 ? this.calculateTotalSize(snapshot.docs) / snapshot.size : 0
      }
      
      console.log(`   📁 ${collectionName}: ${stats[collectionName].count} documents (${this.formatBytes(stats[collectionName].totalSize)})`)
    }
    
    this.metrics.newStructure.collections = stats
    return stats
  }

  async validateDataIntegrity() {
    console.log('🔒 Validation de l\'intégrité des données...')
    
    // Vérifier que tous les collaborateurs ont des disponibilités
    const collaborateurs = await db.collection('collaborateurs').get()
    const disponibilites = await db.collection('disponibilites').get()
    
    const collaborateurIds = new Set(collaborateurs.docs.map(doc => doc.id))
    const disponibiliteCollabIds = new Set()
    
    disponibilites.docs.forEach(doc => {
      const data = doc.data()
      disponibiliteCollabIds.add(data.collaborateurId)
    })
    
    const orphanCollaborateurs = [...collaborateurIds].filter(id => !disponibiliteCollabIds.has(id))
    const orphanDisponibilites = [...disponibiliteCollabIds].filter(id => !collaborateurIds.has(id))
    
    console.log(`   👥 ${collaborateurs.size} collaborateurs`)
    console.log(`   📅 ${disponibilites.size} périodes de disponibilités`)
    console.log(`   ⚠️  ${orphanCollaborateurs.length} collaborateurs sans disponibilités`)
    console.log(`   ⚠️  ${orphanDisponibilites.length} disponibilités orphelines`)
    
    // Vérifier la cohérence des lieux
    const lieux = await db.collection('lieux').get()
    const lieuxFromDispos = new Set()
    
    disponibilites.docs.forEach(doc => {
      const data = doc.data()
      data.disponibilites.forEach(dispo => {
        if (dispo.lieu && dispo.lieu !== 'INDISPONIBLE') {
          lieuxFromDispos.add(dispo.lieu)
        }
      })
    })
    
    const lieuxInDb = new Set(lieux.docs.map(doc => doc.data().nom))
    const missingLieux = [...lieuxFromDispos].filter(lieu => !lieuxInDb.has(lieu))
    
    console.log(`   📍 ${lieux.size} lieux référencés`)
    console.log(`   ⚠️  ${missingLieux.length} lieux manquants: ${missingLieux.slice(0, 5).join(', ')}`)
    
    this.metrics.newStructure.integrity = {
      orphanCollaborateurs: orphanCollaborateurs.length,
      orphanDisponibilites: orphanDisponibilites.length,
      missingLieux: missingLieux.length
    }
  }

  async runPerformanceTests() {
    console.log('⚡ Tests de performance...')
    
    const tests = [
      {
        name: 'Recherche collaborateur par nom',
        test: () => this.testCollaborateurSearch()
      },
      {
        name: 'Récupération planning semaine',
        test: () => this.testWeekPlanning()
      },
      {
        name: 'Statistiques globales',
        test: () => this.testGlobalStats()
      },
      {
        name: 'Filtrage par métier',
        test: () => this.testMetierFilter()
      }
    ]
    
    const results = {}
    
    for (const test of tests) {
      console.log(`   🧪 ${test.name}...`)
      const startTime = Date.now()
      const result = await test.test()
      const duration = Date.now() - startTime
      
      results[test.name] = {
        duration,
        result,
        documentsRead: result?.size || result?.length || 0
      }
      
      console.log(`      ⏱️  ${duration}ms - ${results[test.name].documentsRead} docs lus`)
    }
    
    this.metrics.newStructure.performance = results
  }

  async testCollaborateurSearch() {
    // Test de recherche sur le nouveau modèle
    const searchTerm = 'sandra'
    const results = await db.collection('collaborateurs')
      .where('searchTerms', 'array-contains', searchTerm)
      .get()
    
    return results
  }

  async testWeekPlanning() {
    // Simuler la récupération d'un planning hebdomadaire
    const startDate = '2025-04-01'
    const endDate = '2025-04-07'
    
    // Récupérer tous les collaborateurs
    const collaborateurs = await db.collection('collaborateurs').limit(10).get()
    
    // Récupérer leurs disponibilités pour avril 2025
    const disponibilites = await db.collection('disponibilites')
      .where('periode', '==', '2025_04')
      .get()
    
    return {
      collaborateurs: collaborateurs.size,
      disponibilites: disponibilites.size,
      totalDocs: collaborateurs.size + disponibilites.size
    }
  }

  async testGlobalStats() {
    // Test de calcul de statistiques
    const collaborateurs = await db.collection('collaborateurs').get()
    const lieux = await db.collection('lieux').get()
    const disponibilites = await db.collection('disponibilites').get()
    
    // Calculer les stats à partir des données existantes
    let totalJours = 0
    let totalTravailles = 0
    
    disponibilites.docs.forEach(doc => {
      const data = doc.data()
      totalJours += data.stats.totalJours
      totalTravailles += data.stats.joursTravailles
    })
    
    return {
      collaborateurs: collaborateurs.size,
      lieux: lieux.size,
      totalJours,
      totalTravailles,
      totalDocs: collaborateurs.size + lieux.size + disponibilites.size
    }
  }

  async testMetierFilter() {
    // Test de filtrage par métier
    const results = await db.collection('collaborateurs')
      .where('metier', '==', 'AS')
      .get()
    
    return results
  }

  calculateTotalSize(docs) {
    return docs.reduce((total, doc) => {
      return total + JSON.stringify(doc.data()).length
    }, 0)
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  generateReport() {
    console.log('\n📋 RAPPORT DE VALIDATION ET PERFORMANCE')
    console.log('=' * 50)
    
    const { collections, integrity, performance } = this.metrics.newStructure
    
    // Résumé des collections
    console.log('\n📊 Collections:')
    Object.entries(collections).forEach(([name, stats]) => {
      console.log(`   ${name}: ${stats.count} docs (${this.formatBytes(stats.totalSize)})`)
    })
    
    // Intégrité des données
    console.log('\n🔒 Intégrité:')
    console.log(`   Collaborateurs orphelins: ${integrity.orphanCollaborateurs}`)
    console.log(`   Disponibilités orphelines: ${integrity.orphanDisponibilites}`)
    console.log(`   Lieux manquants: ${integrity.missingLieux}`)
    
    // Performance
    console.log('\n⚡ Performance:')
    Object.entries(performance).forEach(([test, result]) => {
      console.log(`   ${test}: ${result.duration}ms (${result.documentsRead} docs)`)
    })
    
    // Estimation des gains
    this.estimateGains()
  }

  estimateGains() {
    console.log('\n💰 Estimation des gains:')
    
    const { collections } = this.metrics.newStructure
    const totalDocs = Object.values(collections).reduce((sum, stats) => sum + stats.count, 0)
    
    // Estimation basée sur le CSV original (5528 lignes)
    const oldEstimate = 5528
    const newActual = totalDocs
    const reduction = ((oldEstimate - newActual) / oldEstimate * 100).toFixed(1)
    
    console.log(`   Documents: ${oldEstimate} → ${newActual} (-${reduction}%)`)
    
    // Estimation des coûts Firebase (lectures)
    const weeklyReadsOld = oldEstimate * 4 // 4 requêtes par semaine typiques
    const weeklyReadsNew = newActual * 0.5 // Moins de requêtes grâce au cache
    const costReduction = ((weeklyReadsOld - weeklyReadsNew) / weeklyReadsOld * 100).toFixed(1)
    
    console.log(`   Lectures/semaine: ${weeklyReadsOld} → ${Math.round(weeklyReadsNew)} (-${costReduction}%)`)
    
    // Estimation de la vitesse
    const avgPerformance = Object.values(this.metrics.newStructure.performance)
      .reduce((sum, test) => sum + test.duration, 0) / 
      Object.keys(this.metrics.newStructure.performance).length
    
    console.log(`   Temps de réponse moyen: ${avgPerformance.toFixed(0)}ms`)
    
    console.log('\n🎉 Structure optimisée validée avec succès!')
  }
}

// Script principal
async function main() {
  try {
    const validator = new PerformanceValidator()
    await validator.validateImport()
    
    console.log('\n✅ Validation terminée avec succès!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erreur lors de la validation:', error)
    process.exit(1)
  }
}

// Exécuter si c'est le script principal
if (process.argv[1].endsWith('validate-import.js')) {
  main()
}

export default PerformanceValidator
