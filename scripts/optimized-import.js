#!/usr/bin/env node

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { parse } from 'date-fns'
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

class OptimizedImporter {
  constructor(tenantId = 'default') {
    this.tenantId = tenantId
    this.collaborateursMap = new Map()
    this.lieuxMap = new Map()
    this.disponibilitesGrouped = new Map()
    this.batchSize = 500
  }

  async importFromCSV(filePath) {
    console.log(`🚀 Import optimisé du fichier: ${filePath}`)
    
    try {
      // 1. Lire et parser le CSV
      const csvData = this.parseCSV(filePath)
      console.log(`📊 ${csvData.length} lignes de données trouvées`)
      
      // 2. Analyser et extraire les données
      await this.analyzeData(csvData)
      
      // 3. Importer en base
      await this.importToFirestore()
      
      console.log('✅ Import terminé avec succès!')
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error)
      throw error
    }
  }

  parseCSV(filePath) {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error('Le fichier doit contenir au moins une ligne d\'en-tête')
    }

    const headers = lines[0].split(';').map(h => h.trim())
    console.log('📋 En-têtes:', headers)
    
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim())
      if (values.length >= headers.length && values[0]) { // Ignore les lignes vides
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        data.push(row)
      }
    }
    
    return data
  }

  async analyzeData(csvData) {
    console.log('🔍 Analyse des données...')
    
    for (const row of csvData) {
      // Extraire les collaborateurs uniques
      this.extractCollaborateur(row)
      
      // Extraire les lieux uniques
      this.extractLieu(row)
      
      // Grouper les disponibilités
      this.groupDisponibilite(row)
    }
    
    console.log(`👥 ${this.collaborateursMap.size} collaborateurs uniques`)
    console.log(`📍 ${this.lieuxMap.size} lieux uniques`)
    console.log(`📅 ${this.disponibilitesGrouped.size} périodes de disponibilités`)
  }

  extractCollaborateur(row) {
    const nom = row['Nom'] || ''
    const prenom = row['Prénom'] || ''
    
    if (!nom || !prenom) return
    
    const id = this.generateCollaborateurId(nom, prenom)
    
    if (!this.collaborateursMap.has(id)) {
      const collaborateur = {
        id,
        tenantId: this.tenantId,
        nom: nom.toUpperCase(),
        prenom: this.capitalizeFirst(prenom),
        metier: row['Métier'] || '',
        phone: this.cleanPhone(row['Téléphone'] || ''),
        email: row['Email'] || this.generateEmail(nom, prenom),
        ville: row['Ville'] || '',
        
        // Optimisations pour recherche
        searchTerms: this.generateSearchTerms(nom, prenom),
        isActive: true,
        
        // Métadonnées
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system-import',
        version: 1
      }
      
      this.collaborateursMap.set(id, collaborateur)
    }
  }

  extractLieu(row) {
    const lieu = row['Lieu'] || ''
    if (!lieu || lieu === 'INDISPONIBLE') return
    
    const lieuId = this.generateLieuId(lieu)
    
    if (!this.lieuxMap.has(lieuId)) {
      const lieuData = {
        id: lieuId,
        tenantId: this.tenantId,
        nom: lieu,
        nomCourt: this.generateLieuShort(lieu),
        type: this.detectLieuType(lieu),
        couleur: this.assignLieuColor(lieu),
        icone: this.assignLieuIcon(lieu),
        utilisationCount: 0,
        isActive: true,
        
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      this.lieuxMap.set(lieuId, lieuData)
    }
    
    // Incrémenter le compteur d'utilisation
    this.lieuxMap.get(lieuId).utilisationCount++
  }

  groupDisponibilite(row) {
    const nom = row['Nom'] || ''
    const prenom = row['Prénom'] || ''
    const date = row['Date'] || ''
    const lieu = row['Lieu'] || ''
    
    if (!nom || !prenom || !date) return
    
    const collaborateurId = this.generateCollaborateurId(nom, prenom)
    const parsedDate = this.parseDate(date)
    
    if (!parsedDate) {
      console.warn(`Date invalide ignorée: ${date}`)
      return
    }
    
    const periode = `${parsedDate.getFullYear()}_${String(parsedDate.getMonth() + 1).padStart(2, '0')}`
    const groupKey = `${collaborateurId}_${periode}`
    
    if (!this.disponibilitesGrouped.has(groupKey)) {
      this.disponibilitesGrouped.set(groupKey, {
        id: groupKey,
        tenantId: this.tenantId,
        collaborateurId,
        annee: parsedDate.getFullYear(),
        mois: parsedDate.getMonth() + 1,
        periode,
        disponibilites: [],
        stats: {
          totalJours: 0,
          joursTravailles: 0,
          joursDisponibles: 0,
          joursIndisponibles: 0,
          lieux: new Set()
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        version: 1
      })
    }
    
    const group = this.disponibilitesGrouped.get(groupKey)
    
    // Ajouter la disponibilité
    const dispo = {
      date: date,
      lieu: lieu,
      heureDebut: this.formatTime(row['Heure début']),
      heureFin: this.formatTime(row['Heure fin']),
      type: this.detectDispoType(lieu)
    }
    
    group.disponibilites.push(dispo)
    
    // Mettre à jour les statistiques
    this.updateStats(group.stats, dispo)
  }

  updateStats(stats, dispo) {
    stats.totalJours++
    
    if (dispo.lieu === 'INDISPONIBLE') {
      stats.joursIndisponibles++
    } else if (dispo.type === 'DISPONIBLE') {
      stats.joursDisponibles++
    } else {
      stats.joursTravailles++
    }
    
    if (dispo.lieu && dispo.lieu !== 'INDISPONIBLE') {
      stats.lieux.add(dispo.lieu)
    }
  }

  async importToFirestore() {
    console.log('💾 Import vers Firestore...')
    
    // 1. Importer les collaborateurs
    await this.importCollaborateurs()
    
    // 2. Importer les lieux
    await this.importLieux()
    
    // 3. Importer les disponibilités
    await this.importDisponibilites()
    
    console.log('🎉 Données importées avec succès!')
  }

  async importCollaborateurs() {
    console.log('👥 Import des collaborateurs...')
    
    const batch = db.batch()
    let count = 0
    
    for (const collaborateur of this.collaborateursMap.values()) {
      const docRef = db.collection('collaborateurs').doc(collaborateur.id)
      batch.set(docRef, collaborateur)
      count++
      
      if (count >= this.batchSize) {
        await batch.commit()
        console.log(`   ✅ ${count} collaborateurs importés...`)
        count = 0
      }
    }
    
    if (count > 0) {
      await batch.commit()
      console.log(`   ✅ ${count} collaborateurs importés`)
    }
    
    console.log(`👥 Total: ${this.collaborateursMap.size} collaborateurs importés`)
  }

  async importLieux() {
    console.log('📍 Import des lieux...')
    
    const batch = db.batch()
    let count = 0
    
    for (const lieu of this.lieuxMap.values()) {
      // Convertir le Set en Array pour Firestore
      const docRef = db.collection('lieux').doc(lieu.id)
      batch.set(docRef, lieu)
      count++
    }
    
    if (count > 0) {
      await batch.commit()
      console.log(`📍 Total: ${count} lieux importés`)
    }
  }

  async importDisponibilites() {
    console.log('📅 Import des disponibilités...')
    
    const batch = db.batch()
    let count = 0
    
    for (const group of this.disponibilitesGrouped.values()) {
      // Convertir les Sets en Arrays pour Firestore
      group.stats.lieux = Array.from(group.stats.lieux)
      
      const docRef = db.collection('disponibilites').doc(group.id)
      batch.set(docRef, group)
      count++
      
      if (count >= this.batchSize) {
        await batch.commit()
        console.log(`   ✅ ${count} périodes de disponibilités importées...`)
        count = 0
      }
    }
    
    if (count > 0) {
      await batch.commit()
      console.log(`   ✅ ${count} périodes importées`)
    }
    
    console.log(`📅 Total: ${this.disponibilitesGrouped.size} périodes de disponibilités importées`)
  }

  // Utilitaires
  generateCollaborateurId(nom, prenom) {
    return `${nom.toLowerCase()}_${prenom.toLowerCase()}`.replace(/[^a-z0-9_]/g, '_')
  }

  generateLieuId(lieu) {
    let id = lieu.toLowerCase().replace(/[^a-z0-9]/g, '_')
    
    // Éviter les noms réservés Firebase (commençant et finissant par __)
    if (id.startsWith('__') && id.endsWith('__')) {
      id = 'lieu_' + id.slice(2, -2) + '_lieu'
    }
    
    return id
  }

  generateSearchTerms(nom, prenom) {
    return [
      nom.toLowerCase(),
      prenom.toLowerCase(),
      `${prenom} ${nom}`.toLowerCase(),
      `${nom} ${prenom}`.toLowerCase()
    ]
  }

  generateEmail(nom, prenom) {
    return `${prenom.toLowerCase()}.${nom.toLowerCase()}@company.com`
  }

  generateLieuShort(lieu) {
    const mapping = {
      'SOUS BALME': 'BAL',
      'SIÈGE PARIS': 'PAR',
      'FOI YAMBA': 'FOI',
      'Orion': 'ORI',
      'Bethel': 'BET',
      'DISPONIBLE': 'DISP',
      'DISPO': 'DISP'
    }
    
    return mapping[lieu] || lieu.substring(0, 4).toUpperCase()
  }

  detectLieuType(lieu) {
    if (lieu.includes('SIÈGE') || lieu.includes('SIEGE')) return 'SIEGE'
    if (lieu.includes('DISPO')) return 'DISPONIBLE'
    if (lieu.includes('FORMATION')) return 'FORMATION'
    return 'MISSION'
  }

  detectDispoType(lieu) {
    if (lieu === 'INDISPONIBLE') return 'INDISPONIBLE'
    if (lieu.includes('DISPO')) return 'DISPONIBLE'
    if (lieu.includes('FORMATION')) return 'FORMATION'
    return 'MISSION'
  }

  assignLieuColor(lieu) {
    const colors = {
      'DISPONIBLE': '#4CAF50',
      'DISPO': '#4CAF50',
      'INDISPONIBLE': '#F44336',
      'FORMATION': '#2196F3',
      'SIÈGE': '#FF9800',
      'Orion': '#9C27B0',
      'Bethel': '#607D8B'
    }
    
    for (const [key, color] of Object.entries(colors)) {
      if (lieu.includes(key)) return color
    }
    
    return '#795548' // Couleur par défaut
  }

  assignLieuIcon(lieu) {
    if (lieu.includes('SIÈGE') || lieu.includes('SIEGE')) return '🏢'
    if (lieu.includes('DISPO')) return '✅'
    if (lieu.includes('FORMATION')) return '📚'
    if (lieu === 'INDISPONIBLE') return '❌'
    return '🚗'
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  cleanPhone(phone) {
    return phone.replace(/[^\d+.]/g, '')
  }

  parseDate(dateStr) {
    try {
      return parse(dateStr, 'yyyy-MM-dd', new Date())
    } catch {
      return null
    }
  }

  formatTime(timeStr) {
    if (!timeStr) return null
    return timeStr.trim() || null
  }
}

// Script principal
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 1) {
    console.error('Usage: node optimized-import.js <chemin-fichier-csv> [tenant-id]')
    console.log('Exemple: node optimized-import.js /path/to/data.csv default')
    process.exit(1)
  }

  const filePath = args[0]
  const tenantId = args[1] || 'default'

  try {
    const importer = new OptimizedImporter(tenantId)
    await importer.importFromCSV(filePath)
    
    console.log('🎉 Import optimisé terminé avec succès!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors de l\'import optimisé:', error)
    process.exit(1)
  }
}

// Exécuter si c'est le script principal
if (process.argv[1].endsWith('optimized-import.js')) {
  main()
}

export default OptimizedImporter
