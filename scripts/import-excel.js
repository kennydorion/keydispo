import admin from 'firebase-admin'
import XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { format, parse, isValid } from 'date-fns'
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Configuration Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
})

const db = admin.firestore()

class ExcelImporter {
  constructor(tenantId = 'default') {
    this.tenantId = tenantId
    this.batch = db.batch()
    this.batchCount = 0
    this.maxBatchSize = 500
  }

  async importFromFile(filePath) {
    console.log(`Début de l'import du fichier: ${filePath}`)
    
    try {
      // Lire le fichier Excel
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convertir en JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      console.log(`${jsonData.length} lignes trouvées dans le fichier`)
      
      // Traiter les données
      const disponibilites = this.transformData(jsonData)
      
      console.log(`${disponibilites.length} disponibilités à importer`)
      
      // Importer en Firestore
      await this.importToFirestore(disponibilites)
      
      console.log('Import terminé avec succès!')
      
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      throw error
    }
  }

  transformData(data) {
    if (data.length < 2) {
      throw new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données')
    }

    const headers = data[0]
    const rows = data.slice(1)

    console.log('En-têtes détectées:', headers)

    // Mapper les colonnes fixes
    const columnIndexes = this.mapColumnIndexes(headers)
    
    // Détecter les colonnes de dates
    const dateColumns = this.detectDateColumns(headers)
    
    console.log(`${dateColumns.length} colonnes de dates détectées`)

    const disponibilites = []

    for (const [rowIndex, row] of rows.entries()) {
      if (this.isEmptyRow(row)) continue

      const baseInfo = this.extractBaseInfo(row, columnIndexes)
      
      // Vérifier que nous avons les infos de base
      if (!baseInfo.nom || !baseInfo.prenom) {
        console.warn(`Ligne ${rowIndex + 2}: Nom ou prénom manquant, ignorée`)
        continue
      }

      // Créer une disponibilité pour chaque date
      for (const dateCol of dateColumns) {
        const dispo = this.createDisponibilite(row, baseInfo, dateCol)
        if (dispo) {
          disponibilites.push(dispo)
        }
      }
    }

    return disponibilites
  }

  mapColumnIndexes(headers) {
    const mapping = {
      nom: ['nom', 'name', 'lastname'],
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
        return keywords.some(keyword => h.includes(keyword))
      })
      if (index !== -1) {
        indexes[key] = index
      }
    }

    console.log('Mapping des colonnes:', indexes)
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
      }
    }
    
    return dateColumns
  }

  isDateHeader(header) {
    // Différents formats de date à détecter
    const patterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/,  // DD/MM/YYYY
      /\d{4}-\d{1,2}-\d{1,2}/,    // YYYY-MM-DD
      /\d{1,2}-\d{1,2}-\d{4}/     // DD-MM-YYYY
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

  createDisponibilite(row, baseInfo, dateCol) {
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
      console.warn(`Date invalide: ${dateValue}`)
      return null
    }

    return {
      ...baseInfo,
      tenantId: this.tenantId,
      date: format(parsedDate, 'yyyy-MM-dd'),
      lieu: lieu.toString().trim(),
      heure_debut: this.formatTime(heureDebut) || '09:00',
      heure_fin: this.formatTime(heureFin) || '17:00',
      version: 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system-import'
    }
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
      'dd-MM-yyyy'
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

  async importToFirestore(disponibilites) {
    const collection = db.collection('dispos')
    
    for (const [index, dispo] of disponibilites.entries()) {
      // Créer un nouveau document avec ID auto-généré
      const docRef = collection.doc()
      this.batch.set(docRef, dispo)
      this.batchCount++

      // Commit le batch quand on atteint la limite
      if (this.batchCount >= this.maxBatchSize) {
        await this.batch.commit()
        console.log(`Batch ${Math.floor(index / this.maxBatchSize) + 1} commité (${this.batchCount} documents)`)
        
        // Nouveau batch
        this.batch = db.batch()
        this.batchCount = 0
      }
    }

    // Commit le dernier batch
    if (this.batchCount > 0) {
      await this.batch.commit()
      console.log(`Dernier batch commité (${this.batchCount} documents)`)
    }
  }
}

// Usage du script
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 1) {
    console.error('Usage: node import-excel.js <chemin-fichier-excel> [tenant-id]')
    process.exit(1)
  }

  const filePath = args[0]
  const tenantId = args[1] || 'default'

  try {
    const importer = new ExcelImporter(tenantId)
    await importer.importFromFile(filePath)
    
    console.log('✅ Import terminé avec succès!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error)
    process.exit(1)
  }
}

// Exécuter si c'est le script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default ExcelImporter
