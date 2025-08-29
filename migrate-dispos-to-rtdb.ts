import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { getDatabase, ref, set, remove, get } from 'firebase/database'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

// Charger les variables d'environnement
dotenv.config()

// Configuration Firebase (charge depuis .env)
const firebaseConfig = {
  apiKey: process.env.VITE_FB_API_KEY,
  authDomain: process.env.VITE_FB_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FB_DATABASE_URL,
  projectId: process.env.VITE_FB_PROJECT_ID,
  storageBucket: process.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FB_APP_ID
}

// Vérifier que toutes les variables sont présentes
const requiredVars = ['VITE_FB_API_KEY', 'VITE_FB_AUTH_DOMAIN', 'VITE_FB_DATABASE_URL', 'VITE_FB_PROJECT_ID']
const missingVars = requiredVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:', missingVars)
  console.error('💡 Vérifiez que le fichier .env contient toutes les variables VITE_FB_*')
  process.exit(1)
}

console.log('🔧 Configuration Firebase:')
console.log(`  - Project ID: ${firebaseConfig.projectId}`)
console.log(`  - Database URL: ${firebaseConfig.databaseURL}`)
console.log('')

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const rtdb = getDatabase(app)

/**
 * Script de migration des disponibilités de Firestore vers RTDB
 * Usage: tsx migrate-dispos-to-rtdb.ts [--dry-run] [--tenant-id=TENANT_ID]
 */

interface DisponibiliteFirestore {
  id?: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  ville: string
  date: string
  lieu: string
  heure_debut: string
  heure_fin: string
  version: number
  updatedAt: any
  updatedBy: string
  [key: string]: any
}

interface DisponibiliteRTDB {
  id: string
  collaborateurId: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  ville: string
  date: string
  lieu: string
  heure_debut: string
  heure_fin: string
  type?: string
  timeKind?: string
  slots?: string[]
  isFullDay?: boolean
  version: number
  updatedAt: number
  updatedBy: string
  tags?: string[]
  isArchived: boolean
  hasConflict: boolean
  _cont?: string
}

class DispoMigration {
  private tenantId: string = 'keydispo'
  private dryRun: boolean = false
  
  constructor() {
    // Parse command line arguments
    process.argv.forEach(arg => {
      if (arg === '--dry-run') {
        this.dryRun = true
      }
      if (arg.startsWith('--tenant-id=')) {
        this.tenantId = arg.split('=')[1]
      }
    })
    
    console.log(`🚀 Migration des disponibilités Firestore → RTDB`)
    console.log(`📋 Tenant ID: ${this.tenantId}`)
    console.log(`🔍 Mode: ${this.dryRun ? 'DRY RUN (simulation)' : 'MIGRATION RÉELLE'}`)
    console.log(`📅 Date: ${new Date().toISOString()}`)
    console.log('='.repeat(60))
  }

  /**
   * Générer un ID collaborateur unique basé sur nom/prénom/email
   */
  private generateCollaborateurId(dispo: DisponibiliteFirestore): string {
    const base = `${dispo.nom}_${dispo.prenom}_${dispo.email}`.toLowerCase()
    return base.replace(/[^a-z0-9_]/g, '').substring(0, 50)
  }

  /**
   * Convertir une disponibilité Firestore vers le format RTDB
   */
  private convertFirestoreToRTDB(firestoreDispo: DisponibiliteFirestore): DisponibiliteRTDB {
    const id = firestoreDispo.id || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id,
      collaborateurId: this.generateCollaborateurId(firestoreDispo),
      tenantId: firestoreDispo.tenantId || this.tenantId,
      nom: firestoreDispo.nom || '',
      prenom: firestoreDispo.prenom || '',
      metier: firestoreDispo.metier || '',
      phone: firestoreDispo.phone || '',
      email: firestoreDispo.email || '',
      ville: firestoreDispo.ville || '',
      date: firestoreDispo.date || '',
      lieu: firestoreDispo.lieu || '',
      heure_debut: firestoreDispo.heure_debut || '',
      heure_fin: firestoreDispo.heure_fin || '',
      type: firestoreDispo.type || 'standard',
      timeKind: firestoreDispo.timeKind || 'fixed',
      slots: firestoreDispo.slots || [],
      isFullDay: firestoreDispo.isFullDay || false,
      version: firestoreDispo.version || 1,
      updatedAt: firestoreDispo.updatedAt?.seconds ? 
        firestoreDispo.updatedAt.seconds * 1000 : Date.now(),
      updatedBy: firestoreDispo.updatedBy || 'migration',
      tags: firestoreDispo.tags || [],
      isArchived: firestoreDispo.isArchived || false,
      hasConflict: firestoreDispo.hasConflict || false,
      _cont: firestoreDispo._cont
    }
  }

  /**
   * Récupérer toutes les disponibilités de Firestore
   */
  async fetchFirestoreDispos(): Promise<DisponibiliteFirestore[]> {
    try {
      console.log(`📥 Récupération des disponibilités depuis Firestore...`)
      
      const disposRef = collection(db, 'dispos')
      const snapshot = await getDocs(disposRef)
      
      const disponibilites: DisponibiliteFirestore[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data() as DisponibiliteFirestore
        data.id = doc.id
        
        // Filtrer par tenant
        if (data.tenantId === this.tenantId) {
          disponibilites.push(data)
        }
      })
      
      console.log(`✅ ${disponibilites.length} disponibilités trouvées pour le tenant ${this.tenantId}`)
      return disponibilites
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération Firestore:', error)
      throw error
    }
  }

  /**
   * Migrer les disponibilités vers RTDB
   */
  async migrateToRTDB(disponibilites: DisponibiliteFirestore[]): Promise<void> {
    try {
      console.log(`🔄 Migration de ${disponibilites.length} disponibilités vers RTDB...`)
      
      if (this.dryRun) {
        console.log(`🔍 MODE DRY RUN - Simulation de la migration`)
        disponibilites.forEach((dispo, index) => {
          const rtdbDispo = this.convertFirestoreToRTDB(dispo)
          console.log(`  ${index + 1}. ${rtdbDispo.nom} ${rtdbDispo.prenom} - ${rtdbDispo.date} (${rtdbDispo.id})`)
        })
        console.log(`✅ Simulation terminée - ${disponibilites.length} disponibilités seraient migrées`)
        return
      }

      // Migration réelle
      const promises = disponibilites.map(async (dispo) => {
        const rtdbDispo = this.convertFirestoreToRTDB(dispo)
        const rtdbRef = ref(rtdb, `tenants/${this.tenantId}/disponibilites/${rtdbDispo.id}`)
        await set(rtdbRef, rtdbDispo)
        return rtdbDispo.id
      })

      const results = await Promise.all(promises)
      console.log(`✅ Migration terminée - ${results.length} disponibilités migrées vers RTDB`)
      
    } catch (error) {
      console.error('❌ Erreur lors de la migration RTDB:', error)
      throw error
    }
  }

  /**
   * Vérifier l'intégrité des données migrées
   */
  async verifyMigration(originalCount: number): Promise<void> {
    try {
      console.log(`🔍 Vérification de l'intégrité des données...`)
      
      const rtdbRef = ref(rtdb, `tenants/${this.tenantId}/disponibilites`)
      const snapshot = await get(rtdbRef)
      
      if (snapshot.exists()) {
        const rtdbData = snapshot.val()
        const rtdbCount = Object.keys(rtdbData).length
        
        console.log(`📊 Comparaison:`)
        console.log(`  - Firestore: ${originalCount} disponibilités`)
        console.log(`  - RTDB: ${rtdbCount} disponibilités`)
        
        if (rtdbCount === originalCount) {
          console.log(`✅ Migration vérifiée - Tous les enregistrements ont été migrés`)
        } else {
          console.log(`⚠️  Attention - Différence détectée (${Math.abs(rtdbCount - originalCount)} enregistrements)`)
        }
      } else {
        console.log(`❌ Aucune donnée trouvée dans RTDB`)
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error)
    }
  }

  /**
   * Nettoyer RTDB (pour les tests)
   */
  async cleanRTDB(): Promise<void> {
    if (this.dryRun) {
      console.log(`🔍 MODE DRY RUN - Nettoyage RTDB simulé`)
      return
    }

    try {
      console.log(`🧹 Nettoyage des données RTDB existantes...`)
      const rtdbRef = ref(rtdb, `tenants/${this.tenantId}/disponibilites`)
      await remove(rtdbRef)
      console.log(`✅ RTDB nettoyé`)
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage RTDB:', error)
    }
  }

  /**
   * Exécuter la migration complète
   */
  async run(): Promise<void> {
    try {
      console.log(`🚀 Démarrage de la migration...`)
      
      // 1. Récupérer les données Firestore
      const firestoreDispos = await this.fetchFirestoreDispos()
      
      if (firestoreDispos.length === 0) {
        console.log(`ℹ️  Aucune disponibilité à migrer pour le tenant ${this.tenantId}`)
        return
      }

      // 2. Nettoyer RTDB (optionnel)
      if (process.argv.includes('--clean')) {
        await this.cleanRTDB()
      }

      // 3. Migrer vers RTDB
      await this.migrateToRTDB(firestoreDispos)

      // 4. Vérifier l'intégrité
      if (!this.dryRun) {
        await this.verifyMigration(firestoreDispos.length)
      }

      console.log('='.repeat(60))
      console.log(`🎉 Migration ${this.dryRun ? 'simulée' : 'terminée'} avec succès !`)
      
      if (!this.dryRun) {
        console.log(``)
        console.log(`📝 Prochaines étapes:`)
        console.log(`1. Vérifier les données dans la console Firebase RTDB`)
        console.log(`2. Tester l'application avec les nouvelles données`)
        console.log(`3. Une fois validé, supprimer les données Firestore`)
        console.log(`4. Mettre à jour le code pour utiliser uniquement RTDB`)
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error)
      process.exit(1)
    }
  }
}

// Exécution
const migration = new DispoMigration()
migration.run()
  .then(() => {
    console.log(`✅ Script terminé`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

export { DispoMigration }
