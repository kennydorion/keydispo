#!/usr/bin/env node

/**
 * Script d'import Excel vers Firebase RTDB
 * 
 * Version RTDB du script d'import Excel optimisé pour la nouvelle architecture
 * Compatible avec Firebase Realtime Database et structure multi-tenant
 */

import admin from 'firebase-admin'
import XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { format, parse, isValid } from 'date-fns'
import dotenv from 'dotenv'
import { createHash } from 'crypto'

// Charger les variables d'environnement
dotenv.config()

// Configuration Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
})

const rtdb = admin.database()

class ExcelImporterRTDB {
  constructor(tenantId = 'default') {
    this.tenantId = tenantId
    this.stats = {
      collaborateursCreated: 0,
      collaborateursUpdated: 0,
      disponibilitesCreated: 0,
      disponibilitesUpdated: 0,
      errors: []
    }
    this.chunkSize = 50 // Taille optimale pour RTDB
  }

  async importFromFile(filePath) {
    console.log(`🚀 Début import RTDB depuis: ${filePath}`)
    console.log(`📊 Tenant: ${this.tenantId}`)
    
    try {
      const startTime = Date.now()
      
      // 1. Lire le fichier Excel
      console.log('📖 Lecture du fichier Excel...')
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // 2. Convertir en JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      console.log(`📄 ${jsonData.length} lignes trouvées`)
      
      // 3. Traiter les données
      console.log('🔄 Transformation des données...')
      const { collaborateurs, disponibilites } = this.transformData(jsonData)
      
      console.log(`✅ Données préparées:`)
      console.log(`   👥 ${collaborateurs.length} collaborateurs`)
      console.log(`   📅 ${disponibilites.length} disponibilités`)
      
      // 4. Import vers RTDB
      console.log('🔥 Import vers Firebase RTDB...')
      await this.importToRTDB(collaborateurs, disponibilites)
      
      // 5. Finalisation
      const duration = Date.now() - startTime
      await this.finalizeImport(duration)
      
      console.log(`\n🎉 Import terminé avec succès en ${duration}ms!`)
      this.printStats()
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error)
      throw error
    }
  }

  transformData(data) {
    if (data.length < 2) {
      throw new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données')
    }

    const headers = data[0]
    const rows = data.slice(1)

    console.log('📋 En-têtes détectées:', headers.slice(0, 10), '...')

    // Mapper les colonnes fixes
    const columnIndexes = this.mapColumnIndexes(headers)
    
    // Détecter les colonnes de dates
    const dateColumns = this.detectDateColumns(headers)
    
    console.log(`📅 ${dateColumns.length} colonnes de dates détectées`)

    const collaborateursMap = new Map()
    const disponibilites = []

    for (const [rowIndex, row] of rows.entries()) {
      if (this.isEmptyRow(row)) continue

      const baseInfo = this.extractBaseInfo(row, columnIndexes)
      
      // Vérifier les données essentielles
      if (!baseInfo.nom || !baseInfo.prenom) {
        console.warn(`⚠️ Ligne ${rowIndex + 2}: Nom ou prénom manquant, ignorée`)
        continue
      }

      // Générer ID collaborateur
      const collaborateurId = this.generateCollaborateurId(baseInfo.nom, baseInfo.prenom)

      // Créer/mettre à jour collaborateur
      if (!collaborateursMap.has(collaborateurId)) {
        collaborateursMap.set(collaborateurId, {
          id: collaborateurId,
          tenantId: this.tenantId,
          nom: baseInfo.nom,
          prenom: baseInfo.prenom,
          metier: baseInfo.metier || '',
          phone: baseInfo.phone || '',
          email: baseInfo.email || '',
          ville: baseInfo.ville || '',
          createdAt: admin.database.ServerValue.TIMESTAMP,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
          updatedBy: 'excel-import-rtdb'
        })
      }

      // Créer disponibilités pour chaque date
      for (const dateCol of dateColumns) {
        const dispo = this.createDisponibilite(row, baseInfo, collaborateurId, dateCol)
        if (dispo) {
          disponibilites.push(dispo)
        }
      }
    }

    return {
      collaborateurs: Array.from(collaborateursMap.values()),
      disponibilites
    }
  }

  mapColumnIndexes(headers) {
    const mapping = {
      nom: ['nom', 'name', 'lastname', 'n° ct'],
      prenom: ['prénom', 'prenom', 'firstname'],
      metier: ['métier', 'metier', 'job', 'profession'],
      phone: ['téléphone', 'telephone', 'mobile', 'phone'],
      email: ['email', 'e-mail', 'mail'],
      ville: ['ville', 'city']
    }

    const indexes = {}
    
    for (const [key, keywords] of Object.entries(mapping)) {
      const index = headers.findIndex(header => {
        const h = header?.toString().toLowerCase() || ''
        return keywords.some(keyword => h.includes(keyword.toLowerCase()))
      })
      if (index !== -1) {
        indexes[key] = index
      }
    }

    console.log('🗂️ Mapping colonnes:', indexes)
    return indexes
  }

  detectDateColumns(headers) {
    const dateColumns = []
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.toString() || ''
      
      // Détecter si c'est une date
      if (this.isDateHeader(header)) {
        // Chercher les colonnes associées
        const lieuIndex = this.findRelatedColumn(headers, i, ['lieu', 'location'])
        const debutIndex = this.findRelatedColumn(headers, i, ['debut', 'start', 'heure'])
        const finIndex = this.findRelatedColumn(headers, i, ['fin', 'end'])
        
        dateColumns.push({
          dateIndex: i,
          dateValue: header,
          lieuIndex,
          debutIndex,
          finIndex
        })
        
        console.log(`📅 Date détectée: ${header} (lieu: ${lieuIndex}, début: ${debutIndex}, fin: ${finIndex})`)
      }
    }
    
    return dateColumns
  }

  isDateHeader(header) {
    // Différents formats de date à détecter
    const patterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/,  // DD/MM/YYYY
      /\d{4}-\d{1,2}-\d{1,2}/,    // YYYY-MM-DD
      /\d{1,2}-\d{1,2}-\d{4}/,    // DD-MM-YYYY
      /\d{1,2}\.\d{1,2}\.\d{4}/   // DD.MM.YYYY
    ]
    
    return patterns.some(pattern => pattern.test(header))
  }

  findRelatedColumn(headers, startIndex, keywords) {
    // Chercher dans les 3-4 colonnes suivantes
    for (let i = startIndex + 1; i < Math.min(startIndex + 5, headers.length); i++) {
      const header = headers[i]?.toString().toLowerCase() || ''
      if (keywords.some(keyword => header.includes(keyword))) {
        return i
      }
    }
    return -1
  }

  extractBaseInfo(row, columnIndexes) {
    return {
      nom: this.getCellValue(row, columnIndexes.nom) || '',
      prenom: this.getCellValue(row, columnIndexes.prenom) || '',
      metier: this.getCellValue(row, columnIndexes.metier) || '',
      phone: this.getCellValue(row, columnIndexes.phone) || '',
      email: this.getCellValue(row, columnIndexes.email) || '',
      ville: this.getCellValue(row, columnIndexes.ville) || ''
    }
  }

  createDisponibilite(row, baseInfo, collaborateurId, dateCol) {
    const dateValue = dateCol.dateValue || this.getCellValue(row, dateCol.dateIndex)
    const lieu = this.getCellValue(row, dateCol.lieuIndex)
    const heureDebut = this.getCellValue(row, dateCol.debutIndex)
    const heureFin = this.getCellValue(row, dateCol.finIndex)

    // Vérifier les données essentielles
    if (!dateValue || !lieu) {
      return null
    }

    const parsedDate = this.parseDate(dateValue)
    if (!parsedDate) {
      console.warn(`⚠️ Date invalide: ${dateValue}`)
      return null
    }

    const date = format(parsedDate, 'yyyy-MM-dd')
    const dispoId = this.generateDispoId(collaborateurId, date, heureDebut)

    return {
      id: dispoId,
      tenantId: this.tenantId,
      collaborateurId,
      nom: baseInfo.nom,
      prenom: baseInfo.prenom,
      metier: baseInfo.metier,
      phone: baseInfo.phone,
      email: baseInfo.email,
      ville: baseInfo.ville,
      date,
      lieu: lieu.toString().trim(),
      heure_debut: this.formatTime(heureDebut) || '09:00',
      heure_fin: this.formatTime(heureFin) || '17:00',
      version: 1,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
      updatedBy: 'excel-import-rtdb'
    }
  }

  async importToRTDB(collaborateurs, disponibilites) {
    console.log('\n👥 Import des collaborateurs...')
    await this.importCollaborateurs(collaborateurs)
    
    console.log('\n📅 Import des disponibilités...')
    await this.importDisponibilites(disponibilites)
  }

  async importCollaborateurs(collaborateurs) {
    const chunks = this.chunkArray(collaborateurs, this.chunkSize)
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`   📦 Chunk ${i + 1}/${chunks.length} (${chunk.length} collaborateurs)`)
      
      try {
        await this.importCollaborateursChunk(chunk)
      } catch (error) {
        console.error(`❌ Erreur chunk collaborateurs ${i + 1}:`, error)
        this.stats.errors.push(`Chunk collaborateurs ${i + 1}: ${error.message}`)
      }
      
      // Délai entre chunks
      if (i < chunks.length - 1) {
        await this.delay(200)
      }
    }
  }

  async importCollaborateursChunk(chunk) {
    const collabRef = rtdb.ref(`tenants/${this.tenantId}/collaborateurs`)
    
    // Utiliser une transaction pour garantir la cohérence
    return new Promise((resolve, reject) => {
      collabRef.transaction((current) => {
        const updates = current || {}
        
        for (const collab of chunk) {
          if (updates[collab.id]) {
            // Collaborateur existant - mise à jour
            updates[collab.id] = {
              ...updates[collab.id],
              ...collab,
              updatedAt: admin.database.ServerValue.TIMESTAMP
            }
            this.stats.collaborateursUpdated++
          } else {
            // Nouveau collaborateur
            updates[collab.id] = collab
            this.stats.collaborateursCreated++
          }
        }
        
        return updates
      }, (error, committed, snapshot) => {
        if (error) {
          reject(error)
        } else if (committed) {
          resolve(snapshot)
        } else {
          reject(new Error('Transaction aborted'))
        }
      })
    })
  }

  async importDisponibilites(disponibilites) {
    // Grouper par date pour optimiser les transactions
    const byDate = this.groupByDate(disponibilites)
    const dates = Array.from(byDate.keys()).sort()
    
    console.log(`   📊 ${dates.length} dates différentes à traiter`)
    
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      const dispos = byDate.get(date)
      
      console.log(`   📅 Date ${i + 1}/${dates.length}: ${date} (${dispos.length} disponibilités)`)
      
      try {
        await this.importDisponibilitesForDate(date, dispos)
      } catch (error) {
        console.error(`❌ Erreur import date ${date}:`, error)
        this.stats.errors.push(`Date ${date}: ${error.message}`)
      }
      
      // Délai entre dates
      if (i < dates.length - 1) {
        await this.delay(150)
      }
    }
  }

  async importDisponibilitesForDate(date, disponibilites) {
    const dateRef = rtdb.ref(`tenants/${this.tenantId}/disponibilites/${date}`)
    
    // Chunker les disponibilités de cette date
    const chunks = this.chunkArray(disponibilites, 30)
    
    for (const chunk of chunks) {
      await new Promise((resolve, reject) => {
        dateRef.transaction((current) => {
          const updates = current || {}
          
          for (const dispo of chunk) {
            if (updates[dispo.id]) {
              // Disponibilité existante - mise à jour
              updates[dispo.id] = {
                ...updates[dispo.id],
                ...dispo,
                version: (updates[dispo.id].version || 0) + 1,
                updatedAt: admin.database.ServerValue.TIMESTAMP
              }
              this.stats.disponibilitesUpdated++
            } else {
              // Nouvelle disponibilité
              updates[dispo.id] = dispo
              this.stats.disponibilitesCreated++
            }
          }
          
          return updates
        }, (error, committed, snapshot) => {
          if (error) {
            reject(error)
          } else if (committed) {
            resolve(snapshot)
          } else {
            reject(new Error('Transaction aborted'))
          }
        })
      })
    }
  }

  async finalizeImport(duration) {
    try {
      // Sauvegarder les métadonnées d'import
      const metadata = {
        timestamp: admin.database.ServerValue.TIMESTAMP,
        source: 'excel-import-rtdb',
        tenantId: this.tenantId,
        stats: this.stats,
        duration
      }
      
      await rtdb.ref(`tenants/${this.tenantId}/metadata/lastImport`).set(metadata)
      console.log('✅ Métadonnées d\'import sauvegardées')
      
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde métadonnées:', error)
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  generateCollaborateurId(nom, prenom) {
    const normalized = `${nom?.toLowerCase().trim()}_${prenom?.toLowerCase().trim()}`
    return normalized.replace(/[^a-z0-9_]/g, '').substring(0, 50)
  }

  generateDispoId(collaborateurId, date, heureDebut) {
    const key = `${collaborateurId}_${date}_${heureDebut || 'default'}`
    return key.replace(/[^a-zA-Z0-9_-]/g, '')
  }

  getCellValue(row, index) {
    return index !== undefined && index < row.length ? row[index] : null
  }

  parseDate(value) {
    if (!value) return null

    const str = value.toString().trim()
    
    // Formats à essayer
    const formats = [
      'dd/MM/yyyy',
      'MM/dd/yyyy', 
      'yyyy-MM-dd',
      'dd-MM-yyyy',
      'dd.MM.yyyy'
    ]

    for (const fmt of formats) {
      try {
        const parsed = parse(str, fmt, new Date())
        if (isValid(parsed)) {
          return parsed
        }
      } catch {
        continue
      }
    }

    // Essayer le parsing automatique
    const autoDate = new Date(str)
    return isValid(autoDate) ? autoDate : null
  }

  formatTime(value) {
    if (!value) return null

    const str = value.toString().trim()
    
    // Déjà au bon format
    if (/^\d{1,2}:\d{2}$/.test(str)) {
      return str.padStart(5, '0')
    }

    // Format décimal (ex: 9.5 = 9h30)
    const num = parseFloat(str)
    if (!isNaN(num)) {
      const hours = Math.floor(num)
      const minutes = Math.round((num - hours) * 60)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }

    return null
  }

  isEmptyRow(row) {
    return row.every(cell => !cell || cell.toString().trim() === '')
  }

  chunkArray(array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  groupByDate(disponibilites) {
    const grouped = new Map()
    
    for (const dispo of disponibilites) {
      const existing = grouped.get(dispo.date) || []
      existing.push(dispo)
      grouped.set(dispo.date, existing)
    }
    
    return grouped
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  printStats() {
    console.log('\n📊 Statistiques d\'import:')
    console.log(`   👥 Collaborateurs: ${this.stats.collaborateursCreated} créés, ${this.stats.collaborateursUpdated} mis à jour`)
    console.log(`   📅 Disponibilités: ${this.stats.disponibilitesCreated} créées, ${this.stats.disponibilitesUpdated} mises à jour`)
    
    if (this.stats.errors.length > 0) {
      console.log(`   ❌ Erreurs: ${this.stats.errors.length}`)
      this.stats.errors.forEach(error => console.log(`      - ${error}`))
    }
  }
}

// Usage du script
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 1) {
    console.error('❌ Usage: node import-excel-rtdb.js <chemin-fichier-excel> [tenant-id]')
    console.error('   Exemple: node import-excel-rtdb.js data/planning.xlsx keydispo')
    process.exit(1)
  }

  const filePath = args[0]
  const tenantId = args[1] || 'default'

  console.log('🚀 Script d\'import Excel vers Firebase RTDB')
  console.log(`   📁 Fichier: ${filePath}`)
  console.log(`   🏢 Tenant: ${tenantId}`)
  console.log('')

  try {
    const importer = new ExcelImporterRTDB(tenantId)
    await importer.importFromFile(filePath)
    
    console.log('\n🎉 Import Excel → RTDB terminé avec succès!')
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Échec de l\'import Excel → RTDB:', error)
    process.exit(1)
  }
}

// Exécuter si c'est le script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default ExcelImporterRTDB
