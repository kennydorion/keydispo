#!/usr/bin/env node

/**
 * Test complet de l'import Excel vers RTDB
 * 
 * Ce script teste l'ensemble de la chaîne d'import :
 * - Création d'un fichier Excel de test
 * - Import via le script Node.js RTDB
 * - Vérification des données dans RTDB
 * - Nettoyage après test
 */

import admin from 'firebase-admin'
import XLSX from 'xlsx'
import { writeFileSync, unlinkSync } from 'fs'
import { format, addDays } from 'date-fns'
import ExcelImporterRTDB from './import-excel-rtdb.js'

// Configuration pour émulateurs
const EMULATOR_CONFIG = {
  projectId: 'keydispo-dev',
  databaseURL: 'http://127.0.0.1:9200?ns=keydispo-dev-default-rtdb'
}

// Initialiser Firebase Admin pour émulateur
admin.initializeApp({
  projectId: EMULATOR_CONFIG.projectId,
  databaseURL: EMULATOR_CONFIG.databaseURL
})

const rtdb = admin.database()

// Données de test
const TEST_DATA = [
  {
    nom: 'Dupont',
    prenom: 'Jean',
    metier: 'Développeur',
    phone: '0123456789',
    email: 'jean.dupont@test.com',
    ville: 'Paris',
    disponibilites: [
      { date: '15/01/2024', lieu: 'La Défense', debut: '09:00', fin: '17:00' },
      { date: '16/01/2024', lieu: 'République', debut: '10:00', fin: '18:00' }
    ]
  },
  {
    nom: 'Martin',
    prenom: 'Sophie',
    metier: 'Designer',
    phone: '0987654321',
    email: 'sophie.martin@test.com',
    ville: 'Lyon',
    disponibilites: [
      { date: '15/01/2024', lieu: 'Part-Dieu', debut: '08:30', fin: '16:30' },
      { date: '17/01/2024', lieu: 'Bellecour', debut: '09:30', fin: '17:30' }
    ]
  },
  {
    nom: 'Bernard',
    prenom: 'Michel',
    metier: 'Consultant',
    phone: '0555123456',
    email: 'michel.bernard@test.com',
    ville: 'Marseille',
    disponibilites: [
      { date: '16/01/2024', lieu: 'Vieux-Port', debut: '09:00', fin: '17:00' }
    ]
  }
]

class RTDBImportTester {
  constructor() {
    this.testFileName = `test-import-${Date.now()}.xlsx`
    this.tenantId = 'test-import'
    this.stats = {
      created: 0,
      verified: 0,
      errors: []
    }
  }

  async runCompleteTest() {
    console.log('🧪 DÉBUT DU TEST COMPLET IMPORT RTDB\n')
    
    try {
      // 1. Nettoyer les données existantes
      await this.cleanupTestData()
      
      // 2. Créer le fichier Excel de test
      await this.createTestExcelFile()
      
      // 3. Exécuter l'import
      await this.runImport()
      
      // 4. Vérifier les données importées
      await this.verifyImportedData()
      
      // 5. Tester les requêtes
      await this.testQueries()
      
      // 6. Nettoyage final
      await this.cleanup()
      
      console.log('\n🎉 TEST COMPLET RÉUSSI!')
      this.printSummary()
      
    } catch (error) {
      console.error('\n❌ ÉCHEC DU TEST:', error)
      await this.cleanup()
      process.exit(1)
    }
  }

  async cleanupTestData() {
    console.log('🧹 Nettoyage des données de test...')
    
    try {
      await rtdb.ref(`tenants/${this.tenantId}`).remove()
      console.log('✅ Données de test supprimées')
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage (ignorée):', error.message)
    }
  }

  async createTestExcelFile() {
    console.log('📄 Création du fichier Excel de test...')
    
    // Créer les en-têtes dynamiques
    const dates = ['15/01/2024', '16/01/2024', '17/01/2024']
    const headers = ['Nom', 'Prénom', 'Métier', 'Téléphone Mobile', 'E-mail', 'Ville']
    
    // Ajouter les colonnes pour chaque date
    dates.forEach(date => {
      headers.push(date, 'Lieu', 'Heure DÉBUT', 'Heure FIN')
    })
    
    // Créer les lignes de données
    const rows = [headers]
    
    TEST_DATA.forEach(person => {
      const row = [
        person.nom,
        person.prenom,
        person.metier,
        person.phone,
        person.email,
        person.ville
      ]
      
      // Ajouter les disponibilités pour chaque date
      dates.forEach(date => {
        const dispo = person.disponibilites.find(d => d.date === date)
        if (dispo) {
          row.push('✓', dispo.lieu, dispo.debut, dispo.fin)
        } else {
          row.push('', '', '', '')
        }
      })
      
      rows.push(row)
    })
    
    // Créer le workbook
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Planning')
    
    // Sauvegarder
    XLSX.writeFile(wb, this.testFileName)
    console.log(`✅ Fichier créé: ${this.testFileName}`)
    console.log(`   📊 ${TEST_DATA.length} collaborateurs, ${dates.length} dates`)
  }

  async runImport() {
    console.log('📊 Exécution de l\'import RTDB...')
    
    try {
      const importer = new ExcelImporterRTDB(this.tenantId)
      await importer.importFromFile(this.testFileName)
      
      console.log('✅ Import terminé sans erreur')
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error)
      throw error
    }
  }

  async verifyImportedData() {
    console.log('🔍 Vérification des données importées...')
    
    // Vérifier les collaborateurs
    const collabSnapshot = await rtdb.ref(`tenants/${this.tenantId}/collaborateurs`).once('value')
    const collaborateurs = collabSnapshot.val() || {}
    
    console.log(`👥 Collaborateurs trouvés: ${Object.keys(collaborateurs).length}`)
    
    let expectedCollaborateurs = 0
    let expectedDisponibilites = 0
    
    for (const person of TEST_DATA) {
      expectedCollaborateurs++
      expectedDisponibilites += person.disponibilites.length
      
      const slug = `${person.nom.toLowerCase()}_${person.prenom.toLowerCase()}`
      const collab = collaborateurs[slug]
      
      if (!collab) {
        throw new Error(`Collaborateur manquant: ${slug}`)
      }
      
      // Vérifier les données
      if (collab.nom !== person.nom) {
        throw new Error(`Nom incorrect pour ${slug}: ${collab.nom} vs ${person.nom}`)
      }
      
      console.log(`  ✅ ${person.prenom} ${person.nom} - ${collab.metier}`)
      this.stats.verified++
    }
    
    // Vérifier les disponibilités
    let totalDispos = 0
    const dates = ['2024-01-15', '2024-01-16', '2024-01-17']
    
    for (const date of dates) {
      const dispoSnapshot = await rtdb.ref(`tenants/${this.tenantId}/disponibilites/${date}`).once('value')
      const dispos = dispoSnapshot.val() || {}
      const count = Object.keys(dispos).length
      
      if (count > 0) {
        console.log(`  📅 ${date}: ${count} disponibilité(s)`)
        totalDispos += count
      }
    }
    
    console.log(`📊 Total disponibilités: ${totalDispos}`)
    
    if (totalDispos !== expectedDisponibilites) {
      throw new Error(`Nombre de disponibilités incorrect: ${totalDispos} vs ${expectedDisponibilites}`)
    }
    
    console.log('✅ Toutes les données sont correctes')
  }

  async testQueries() {
    console.log('🔍 Test des requêtes RTDB...')
    
    // Test 1: Recherche par collaborateur
    const collabSnapshot = await rtdb.ref(`tenants/${this.tenantId}/collaborateurs`)
      .orderByChild('nom')
      .equalTo('Dupont')
      .once('value')
    
    const dupont = collabSnapshot.val()
    if (!dupont || Object.keys(dupont).length !== 1) {
      throw new Error('Requête par nom échouée')
    }
    console.log('  ✅ Requête par nom')
    
    // Test 2: Disponibilités par date
    const dateSnapshot = await rtdb.ref(`tenants/${this.tenantId}/disponibilites/2024-01-15`)
      .once('value')
    
    const dispos15 = dateSnapshot.val()
    if (!dispos15 || Object.keys(dispos15).length !== 2) {
      throw new Error('Requête par date échouée')
    }
    console.log('  ✅ Requête par date')
    
    // Test 3: Métadonnées d'import
    const metaSnapshot = await rtdb.ref(`tenants/${this.tenantId}/metadata/lastImport`)
      .once('value')
    
    const metadata = metaSnapshot.val()
    if (!metadata || !metadata.stats) {
      throw new Error('Métadonnées d\'import manquantes')
    }
    console.log('  ✅ Métadonnées d\'import')
    console.log(`    📊 ${metadata.stats.collaborateurs} collaborateurs, ${metadata.stats.disponibilites} disponibilités`)
    
    console.log('✅ Toutes les requêtes fonctionnent')
  }

  async cleanup() {
    console.log('🧹 Nettoyage final...')
    
    try {
      // Supprimer le fichier Excel
      unlinkSync(this.testFileName)
      console.log('✅ Fichier Excel supprimé')
      
      // Supprimer les données de test
      await rtdb.ref(`tenants/${this.tenantId}`).remove()
      console.log('✅ Données de test supprimées')
      
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage:', error.message)
    }
  }

  printSummary() {
    console.log('\n📋 RÉSUMÉ DU TEST:')
    console.log(`   ✅ Données vérifiées: ${this.stats.verified}`)
    console.log(`   ❌ Erreurs: ${this.stats.errors.length}`)
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Erreurs détectées:')
      this.stats.errors.forEach(error => {
        console.log(`   - ${error}`)
      })
    }
  }
}

// Vérification des prérequis
function checkPrerequisites() {
  console.log('🔍 Vérification des prérequis...')
  
  // Vérifier que les émulateurs sont lancés
  if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    console.warn('⚠️ Aucun émulateur détecté. Assurez-vous que les émulateurs Firebase sont lancés.')
    console.warn('   Commande: firebase emulators:start --only database')
  }
  
  console.log('✅ Prérequis vérifiés')
}

// Exécution du test
async function main() {
  checkPrerequisites()
  
  const tester = new RTDBImportTester()
  await tester.runCompleteTest()
}

// Point d'entrée
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  })
}

export default RTDBImportTester
