#!/usr/bin/env node

import admin from 'firebase-admin'
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Configuration Firebase Admin
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
  // Configuration pour l'émulateur local
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  admin.initializeApp({
    projectId: 'demo-keydispo'
  })
}

const db = admin.firestore()

class DatabaseCleaner {
  constructor() {
    this.batchSize = 500
  }

  async clearCollection(collectionName) {
    console.log(`🧹 Nettoyage de la collection "${collectionName}"...`)
    
    let totalDeleted = 0
    let hasMore = true

    while (hasMore) {
      // Récupérer un batch de documents
      const snapshot = await db.collection(collectionName)
        .limit(this.batchSize)
        .get()

      if (snapshot.empty) {
        hasMore = false
        break
      }

      // Créer un batch pour supprimer
      const batch = db.batch()
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })

      // Exécuter la suppression
      await batch.commit()
      totalDeleted += snapshot.docs.length

      console.log(`   ✅ ${totalDeleted} documents supprimés...`)

      // Continuer s'il y a potentiellement plus de documents
      hasMore = snapshot.docs.length === this.batchSize
    }

    console.log(`🎉 Collection "${collectionName}" nettoyée: ${totalDeleted} documents supprimés`)
    return totalDeleted
  }

  async clearSubcollections(parentCollection) {
    console.log(`🧹 Nettoyage des sous-collections de "${parentCollection}"...`)
    
    const parentDocs = await db.collection(parentCollection).get()
    let totalDeleted = 0

    for (const parentDoc of parentDocs.docs) {
      // Liste des sous-collections connues
      const subcollections = ['users', 'config', 'analytics']
      
      for (const subName of subcollections) {
        const subCollection = parentDoc.ref.collection(subName)
        const subSnapshot = await subCollection.get()
        
        if (!subSnapshot.empty) {
          const batch = db.batch()
          subSnapshot.docs.forEach(doc => batch.delete(doc.ref))
          await batch.commit()
          totalDeleted += subSnapshot.docs.length
          console.log(`   ✅ ${subSnapshot.docs.length} documents supprimés de ${parentCollection}/${parentDoc.id}/${subName}`)
        }
      }
    }

    console.log(`🎉 Sous-collections nettoyées: ${totalDeleted} documents supprimés`)
    return totalDeleted
  }

  async getCollectionStats() {
    console.log('📊 Analyse des collections existantes...')
    
    const collections = ['dispos', 'collaborateurs', 'tenants', 'users']
    const stats = {}

    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).get()
        stats[collectionName] = {
          count: snapshot.size,
          exists: !snapshot.empty
        }
        
        if (snapshot.size > 0) {
          // Analyser quelques documents pour comprendre la structure
          const sample = snapshot.docs.slice(0, 3).map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
          stats[collectionName].sample = sample
        }
      } catch (error) {
        stats[collectionName] = {
          count: 0,
          exists: false,
          error: error.message
        }
      }
    }

    return stats
  }

  async fullCleanup() {
    console.log('🔥 NETTOYAGE COMPLET DE LA BASE DE DONNÉES')
    console.log('⚠️  Cette action est IRRÉVERSIBLE!')
    
    // Afficher les stats avant nettoyage
    const statsBefore = await this.getCollectionStats()
    console.log('\n📊 État avant nettoyage:')
    Object.entries(statsBefore).forEach(([name, stats]) => {
      if (stats.exists) {
        console.log(`   📁 ${name}: ${stats.count} documents`)
      }
    })

    let totalDeleted = 0

    // Nettoyer les collections principales
    const mainCollections = ['dispos', 'collaborateurs', 'users']
    
    for (const collection of mainCollections) {
      if (statsBefore[collection]?.exists) {
        const deleted = await this.clearCollection(collection)
        totalDeleted += deleted
      }
    }

    // Nettoyer les sous-collections des tenants
    if (statsBefore.tenants?.exists) {
      const subDeleted = await this.clearSubcollections('tenants')
      totalDeleted += subDeleted
      
      // Nettoyer la collection tenants elle-même
      const tenantDeleted = await this.clearCollection('tenants')
      totalDeleted += tenantDeleted
    }

    console.log(`\n🎉 NETTOYAGE TERMINÉ!`)
    console.log(`   Total: ${totalDeleted} documents supprimés`)
    
    // Vérifier que tout est propre
    const statsAfter = await this.getCollectionStats()
    console.log('\n📊 État après nettoyage:')
    Object.entries(statsAfter).forEach(([name, stats]) => {
      const status = stats.exists ? `${stats.count} documents` : 'Vide ✅'
      console.log(`   📁 ${name}: ${status}`)
    })

    return totalDeleted
  }
}

// Script principal
async function main() {
  const args = process.argv.slice(2)
  const cleaner = new DatabaseCleaner()

  try {
    if (args.includes('--stats-only')) {
      // Juste afficher les statistiques
      const stats = await cleaner.getCollectionStats()
      console.log('📊 Statistiques des collections:')
      console.log(JSON.stringify(stats, null, 2))
      return
    }

    if (args.includes('--collection')) {
      // Nettoyer une collection spécifique
      const collectionName = args[args.indexOf('--collection') + 1]
      if (!collectionName) {
        console.error('❌ Nom de collection requis après --collection')
        process.exit(1)
      }
      await cleaner.clearCollection(collectionName)
      return
    }

    // Nettoyage complet par défaut
    await cleaner.fullCleanup()
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
    process.exit(1)
  }
}

// Confirmation de sécurité
if (process.argv.includes('--force')) {
  main()
} else if (process.argv.includes('--stats-only')) {
  // Juste afficher les statistiques
  const cleaner = new DatabaseCleaner()
  cleaner.getCollectionStats().then(stats => {
    console.log('📊 Statistiques des collections:')
    Object.entries(stats).forEach(([name, stat]) => {
      const status = stat.exists ? `${stat.count} documents` : 'Vide'
      console.log(`   📁 ${name}: ${status}`)
    })
  }).catch(error => {
    console.error('❌ Erreur:', error.message)
  })
} else {
  console.log('🚨 ATTENTION: Ce script va supprimer TOUTES les données!')
  console.log('Pour confirmer, relancez avec --force:')
  console.log('node clear-database.js --force')
  console.log('\nOptions disponibles:')
  console.log('  --stats-only          Afficher seulement les statistiques')
  console.log('  --collection <name>    Nettoyer une collection spécifique')
  console.log('  --force               Confirmer le nettoyage complet')
}

export default DatabaseCleaner
