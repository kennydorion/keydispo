/**
 * Service d'import Excel vers RTDB
 * 
 * Service spécialisé pour l'import de fichiers Excel directement vers RTDB
 * Compatible avec l'architecture de migration et le format existant
 */

import { database } from './firebase'
import { ref, push, set, serverTimestamp, runTransaction } from 'firebase/database'
import type { NormalizedRow } from '../features/import/types'

// Types pour l'import RTDB
export interface CollaborateurRTDB {
  id: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  ville: string
  createdAt: any
  updatedAt: any
  updatedBy: string
}

export interface DisponibiliteRTDB {
  id: string
  tenantId: string
  collaborateurId: string
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
  createdAt: any
  updatedAt: any
  updatedBy: string
}

export interface ImportProgressRTDB {
  phase: 'preparation' | 'collaborateurs' | 'disponibilites' | 'indexation' | 'completed'
  current: number
  total: number
  message: string
  errors: string[]
}

export interface ImportStatsRTDB {
  collaborateursCreated: number
  collaborateursUpdated: number
  disponibilitesCreated: number
  disponibilitesUpdated: number
  errors: string[]
  duration: number
  startTime: number
  endTime: number
}

class ExcelImportRTDBService {
  private tenantId: string | null = null
  private initialized = false

  /**
   * Initialiser le service pour un tenant
   */
  async init(tenantId: string): Promise<void> {
    this.tenantId = tenantId
    this.initialized = true
    console.log(`📊 ExcelImportRTDBService initialisé pour tenant: ${tenantId}`)
  }

  /**
   * Importer des données depuis un fichier Excel normalisé vers RTDB
   */
  async importFromNormalizedData(
    data: NormalizedRow[],
    tenantId: string,
    onProgress?: (progress: ImportProgressRTDB) => void
  ): Promise<ImportStatsRTDB> {
    if (!this.initialized) {
      await this.init(tenantId)
    }

    const stats: ImportStatsRTDB = {
      collaborateursCreated: 0,
      collaborateursUpdated: 0,
      disponibilitesCreated: 0,
      disponibilitesUpdated: 0,
      errors: [],
      duration: 0,
      startTime: Date.now(),
      endTime: 0
    }

    try {
      console.log(`🚀 Début import RTDB: ${data.length} lignes à traiter`)

      // Phase 1: Préparation des données
      onProgress?.({
        phase: 'preparation',
        current: 0,
        total: data.length,
        message: 'Préparation des données...',
        errors: []
      })

      const { collaborateurs, disponibilites } = this.prepareData(data, tenantId)
      
      console.log(`📊 Données préparées: ${collaborateurs.length} collaborateurs, ${disponibilites.length} disponibilités`)

      // Phase 2: Import des collaborateurs
      onProgress?.({
        phase: 'collaborateurs',
        current: 0,
        total: collaborateurs.length,
        message: 'Import des collaborateurs...',
        errors: stats.errors
      })

      await this.importCollaborateurs(collaborateurs, stats, onProgress)

      // Phase 3: Import des disponibilités
      onProgress?.({
        phase: 'disponibilites',
        current: 0,
        total: disponibilites.length,
        message: 'Import des disponibilités...',
        errors: stats.errors
      })

      await this.importDisponibilites(disponibilites, stats, onProgress)

      // Phase 4: Indexation et finalisation
      onProgress?.({
        phase: 'indexation',
        current: 0,
        total: 1,
        message: 'Finalisation et indexation...',
        errors: stats.errors
      })

      await this.finalizeImport(tenantId, stats)

      // Finalisation
      stats.endTime = Date.now()
      stats.duration = stats.endTime - stats.startTime

      onProgress?.({
        phase: 'completed',
        current: 1,
        total: 1,
        message: 'Import terminé avec succès!',
        errors: stats.errors
      })

      console.log(`✅ Import RTDB terminé en ${stats.duration}ms`)
      console.log(`📊 Stats: ${stats.collaborateursCreated} collaborateurs, ${stats.disponibilitesCreated} disponibilités`)
      
      return stats

    } catch (error) {
      stats.errors.push(`Erreur générale: ${error}`)
      console.error('❌ Erreur lors de l\'import RTDB:', error)
      throw error
    }
  }

  /**
   * Préparer les données pour l'import RTDB
   */
  private prepareData(data: NormalizedRow[], tenantId: string): {
    collaborateurs: CollaborateurRTDB[],
    disponibilites: DisponibiliteRTDB[]
  } {
    const collaborateursMap = new Map<string, CollaborateurRTDB>()
    const disponibilites: DisponibiliteRTDB[] = []

    for (const row of data) {
      // Générer ID collaborateur unique
      const collaborateurId = this.generateCollaborateurId(row.nom, row.prenom)

      // Créer/mettre à jour collaborateur
      if (!collaborateursMap.has(collaborateurId)) {
        collaborateursMap.set(collaborateurId, {
          id: collaborateurId,
          tenantId,
          nom: row.nom || '',
          prenom: row.prenom || '',
          metier: row.metier || '',
          phone: row.phone || '',
          email: row.email || '',
          ville: row.ville || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: 'excel-import-rtdb'
        })
      }

      // Créer disponibilité si elle a une date valide
      if (row.date && row.lieu) {
        const dispoId = this.generateDispoId(tenantId, collaborateurId, row.date, row.heure_debut)
        
        disponibilites.push({
          id: dispoId,
          tenantId,
          collaborateurId,
          nom: row.nom || '',
          prenom: row.prenom || '',
          metier: row.metier || '',
          phone: row.phone || '',
          email: row.email || '',
          ville: row.ville || '',
          date: row.date,
          lieu: row.lieu,
          heure_debut: row.heure_debut || '09:00',
          heure_fin: row.heure_fin || '17:00',
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: 'excel-import-rtdb'
        })
      }
    }

    return {
      collaborateurs: Array.from(collaborateursMap.values()),
      disponibilites
    }
  }

  /**
   * Importer les collaborateurs par chunks
   */
  private async importCollaborateurs(
    collaborateurs: CollaborateurRTDB[],
    stats: ImportStatsRTDB,
    onProgress?: (progress: ImportProgressRTDB) => void
  ): Promise<void> {
    const chunkSize = 50 // Chunks plus petits pour RTDB
    const chunks = this.chunkArray(collaborateurs, chunkSize)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      try {
        await this.importCollaborateursChunk(chunk, stats)
        
        onProgress?.({
          phase: 'collaborateurs',
          current: stats.collaborateursCreated + stats.collaborateursUpdated,
          total: collaborateurs.length,
          message: `Collaborateurs: ${stats.collaborateursCreated + stats.collaborateursUpdated}/${collaborateurs.length}`,
          errors: stats.errors
        })

        // Délai entre chunks pour éviter le throttling
        if (i < chunks.length - 1) {
          await this.delay(100)
        }

      } catch (error) {
        const errorMsg = `Erreur chunk collaborateurs ${i + 1}: ${error}`
        stats.errors.push(errorMsg)
        console.error('❌', errorMsg)
      }
    }
  }

  /**
   * Importer un chunk de collaborateurs vers RTDB
   */
  private async importCollaborateursChunk(
    chunk: CollaborateurRTDB[],
    stats: ImportStatsRTDB
  ): Promise<void> {
    if (!this.tenantId) throw new Error('TenantId requis')

    // Utiliser une transaction pour la cohérence
    await runTransaction(ref(database, `tenants/${this.tenantId}/collaborateurs`), (collaborateursData) => {
      const updates: any = collaborateursData || {}

      for (const collab of chunk) {
        const existing = updates[collab.id]
        
        if (existing) {
          // Mettre à jour collaborateur existant
          updates[collab.id] = {
            ...existing,
            ...collab,
            updatedAt: serverTimestamp()
          }
          stats.collaborateursUpdated++
        } else {
          // Créer nouveau collaborateur
          updates[collab.id] = collab
          stats.collaborateursCreated++
        }
      }

      return updates
    })

    console.log(`✅ Chunk collaborateurs importé: ${chunk.length} items`)
  }

  /**
   * Importer les disponibilités par chunks
   */
  private async importDisponibilites(
    disponibilites: DisponibiliteRTDB[],
    stats: ImportStatsRTDB,
    onProgress?: (progress: ImportProgressRTDB) => void
  ): Promise<void> {
    const chunkSize = 30 // Chunks encore plus petits pour les disponibilités
    const chunks = this.chunkArray(disponibilites, chunkSize)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      try {
        await this.importDisponibilitesChunk(chunk, stats)
        
        onProgress?.({
          phase: 'disponibilites',
          current: stats.disponibilitesCreated + stats.disponibilitesUpdated,
          total: disponibilites.length,
          message: `Disponibilités: ${stats.disponibilitesCreated + stats.disponibilitesUpdated}/${disponibilites.length}`,
          errors: stats.errors
        })

        // Délai entre chunks
        if (i < chunks.length - 1) {
          await this.delay(150)
        }

      } catch (error) {
        const errorMsg = `Erreur chunk disponibilités ${i + 1}: ${error}`
        stats.errors.push(errorMsg)
        console.error('❌', errorMsg)
      }
    }
  }

  /**
   * Importer un chunk de disponibilités vers RTDB
   */
  private async importDisponibilitesChunk(
    chunk: DisponibiliteRTDB[],
    stats: ImportStatsRTDB
  ): Promise<void> {
    if (!this.tenantId) throw new Error('TenantId requis')

    // Grouper par date pour optimiser les transactions
    const byDate = this.groupByDate(chunk)

    for (const [date, dispos] of byDate.entries()) {
      await runTransaction(ref(database, `tenants/${this.tenantId}/disponibilites/${date}`), (dateData) => {
        const updates: any = dateData || {}

        for (const dispo of dispos) {
          const existing = updates[dispo.id]
          
          if (existing) {
            // Mettre à jour disponibilité existante
            updates[dispo.id] = {
              ...existing,
              ...dispo,
              version: (existing.version || 0) + 1,
              updatedAt: serverTimestamp()
            }
            stats.disponibilitesUpdated++
          } else {
            // Créer nouvelle disponibilité
            updates[dispo.id] = dispo
            stats.disponibilitesCreated++
          }
        }

        return updates
      })
    }

    console.log(`✅ Chunk disponibilités importé: ${chunk.length} items`)
  }

  /**
   * Finaliser l'import et créer les index
   */
  private async finalizeImport(tenantId: string, stats: ImportStatsRTDB): Promise<void> {
    try {
      // Créer/mettre à jour les métadonnées d'import
      const importMeta = {
        lastImport: {
          timestamp: serverTimestamp(),
          stats: {
            collaborateurs: stats.collaborateursCreated + stats.collaborateursUpdated,
            disponibilites: stats.disponibilitesCreated + stats.disponibilitesUpdated,
            errors: stats.errors.length
          },
          source: 'excel-import-rtdb',
          duration: stats.duration
        }
      }

      await set(ref(database, `tenants/${tenantId}/metadata/imports`), importMeta)

      console.log('✅ Métadonnées d\'import sauvegardées')

    } catch (error) {
      console.warn('⚠️ Erreur lors de la finalisation:', error)
      stats.errors.push(`Erreur finalisation: ${error}`)
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Générer un ID déterministe pour collaborateur
   */
  private generateCollaborateurId(nom: string, prenom: string): string {
    const normalized = `${nom?.toLowerCase().trim()}_${prenom?.toLowerCase().trim()}`
    return normalized.replace(/[^a-z0-9_]/g, '')
  }

  /**
   * Générer un ID déterministe pour disponibilité
   */
  private generateDispoId(tenantId: string, collaborateurId: string, date: string, heureDebut?: string): string {
    const key = `${collaborateurId}_${date}_${heureDebut || 'default'}`
    return key.replace(/[^a-zA-Z0-9_-]/g, '')
  }

  /**
   * Chunker un array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Grouper disponibilités par date
   */
  private groupByDate(disponibilites: DisponibiliteRTDB[]): Map<string, DisponibiliteRTDB[]> {
    const grouped = new Map<string, DisponibiliteRTDB[]>()
    
    for (const dispo of disponibilites) {
      const existing = grouped.get(dispo.date) || []
      existing.push(dispo)
      grouped.set(dispo.date, existing)
    }
    
    return grouped
  }

  /**
   * Délai entre les opérations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Obtenir les statistiques du service
   */
  getStats() {
    return {
      initialized: this.initialized,
      tenantId: this.tenantId,
      timestamp: Date.now()
    }
  }

  /**
   * Nettoyer le service
   */
  async destroy(): Promise<void> {
    this.tenantId = null
    this.initialized = false
    console.log('🔴 ExcelImportRTDBService détruit')
  }
}

// Export singleton
export const excelImportRTDBService = new ExcelImportRTDBService()

// Debug global
if (typeof window !== 'undefined') {
  ;(window as any).excelImportRTDBService = excelImportRTDBService
}
