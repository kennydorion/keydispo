import { db } from '../../services/firebase'
import { writeBatch, doc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore'
import type { NormalizedRow } from './types'
import { slugify } from './parseWorkbook'
import { normalizeDispo } from '../../services/normalization'

// Types pour l'import
export interface Collaborateur {
  id: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  phone: string | null
  email: string | null
  ville: string | null
  slug: string
}

export interface Disposition {
  id: string
  tenantId: string
  collaborateurId: string
  date: string
  lieu: string | null
  heure_debut: string | null
  heure_fin: string | null
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day'
  slots?: Array<'morning' | 'midday' | 'afternoon' | 'evening' | 'night'>
  isFullDay?: boolean
  version: number
  updatedAt: any
  updatedBy: string
}

export interface ImportStats {
  collaborateursCreated: number
  collaborateursMerged: number
  disposCreated: number
  disposMerged: number
  errors: string[]
  duration: number
}

export interface ImportProgress {
  phase: 'processing' | 'collaborateurs' | 'disponibilites' | 'completed'
  current: number
  total: number
  message: string
}

/**
 * Génère un ID déterministe pour une disposition
 */
function makeDispoId(tenantId: string, collaborateurId: string, date: string): string {
  return `${tenantId}_${collaborateurId}_${date}`
}

/**
 * Chunke un array en petits morceaux
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Délai entre les batches
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Nettoie un objet en supprimant les champs undefined
 */
function cleanObjectForFirestore(obj: any): any {
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value
    }
  }
  return cleaned
}

/**
 * Prépare les données d'import en normalisant et dédupliquant
 */
function prepareDataForImport(data: NormalizedRow[], tenantId: string) {
  const collaborateursMap = new Map<string, Collaborateur>()
  const dispositions: Disposition[] = []
  
  for (const row of data) {
    const slug = slugify(row.nom, row.prenom)
    
    // Créer ou mettre à jour le collaborateur
    if (!collaborateursMap.has(slug)) {
      collaborateursMap.set(slug, {
        id: slug,
        tenantId,
        nom: row.nom,
        prenom: row.prenom,
        metier: row.metier,
        phone: row.phone ?? null,
        email: row.email ?? null,
        ville: row.ville ?? null,
        slug
      })
    } else {
      // Merge des données (compléter les champs manquants)
      const existing = collaborateursMap.get(slug)!
      if (row.phone && !existing.phone) existing.phone = row.phone
      if (row.email && !existing.email) existing.email = row.email
      if (row.ville && !existing.ville) existing.ville = row.ville
      if (row.metier && existing.metier !== row.metier) {
        // Prendre le métier le plus récent/complet
        existing.metier = row.metier
      }
    }
    
    // Créer la disposition
    const dispoId = makeDispoId(tenantId, slug, row.date)
    const normalized = normalizeDispo({
      date: row.date,
      lieu: row.lieu || null,
      heure_debut: row.heure_debut || null,
      heure_fin: row.heure_fin || null,
    })

    dispositions.push({
      id: dispoId,
      tenantId,
      collaborateurId: slug,
      date: row.date,
      lieu: normalized.lieu ?? null,
      heure_debut: normalized.heure_debut ?? null,
      heure_fin: normalized.heure_fin ?? null,
      type: normalized.type,
      timeKind: normalized.timeKind,
      slots: normalized.slots,
      isFullDay: normalized.isFullDay,
      version: 0,
      updatedAt: serverTimestamp(),
      updatedBy: 'import'
    })
  }
  
  return {
    collaborateurs: Array.from(collaborateursMap.values()),
    dispositions
  }
}

/**
 * Supprime toutes les données existantes pour un tenant
 */
async function clearTenantData(tenantId: string, onProgress?: (progress: ImportProgress) => void): Promise<void> {
  console.log(`🧹 Suppression des données existantes pour tenant: ${tenantId}`)
  
  onProgress?.({
    phase: 'processing',
    current: 0,
    total: 2,
    message: 'Suppression des anciennes données...'
  })
  
  try {
    // 1. Supprimer les collaborateurs et leurs sous-collections
    const collaborateursRef = collection(db, `tenants/${tenantId}/collaborateurs`)
    const collaborateursSnapshot = await getDocs(collaborateursRef)
    
    let deleteCount = 0
    const totalToDelete = collaborateursSnapshot.size
    
    // Traitement par batches pour éviter les timeouts
    const batches: any[] = []
    let currentBatch = writeBatch(db)
    let batchSize = 0
    
    for (const doc of collaborateursSnapshot.docs) {
      // Supprimer le collaborateur
      currentBatch.delete(doc.ref)
      batchSize++
      
      // Si on atteint 400 opérations, on prépare un nouveau batch
      if (batchSize >= 400) {
        batches.push(currentBatch)
        currentBatch = writeBatch(db)
        batchSize = 0
      }
    }
    
    // Ajouter le dernier batch s'il y a des opérations
    if (batchSize > 0) {
      batches.push(currentBatch)
    }
    
    // Exécuter tous les batches
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit()
      deleteCount += Math.min(400, totalToDelete - (i * 400))
      
      onProgress?.({
        phase: 'processing',
        current: 1,
        total: 2,
        message: `Suppression: ${deleteCount}/${totalToDelete} collaborateurs`
      })
    }
    
    // 2. Supprimer les disponibilités globales (si elles existent)
    const disposRef = collection(db, 'dispos')
    const disposQuery = query(disposRef, where('tenantId', '==', tenantId))
    const disposSnapshot = await getDocs(disposQuery)
    
    if (disposSnapshot.size > 0) {
      const disposBatches: any[] = []
      let disposBatch = writeBatch(db)
      let disposBatchSize = 0
      
      disposSnapshot.docs.forEach(doc => {
        disposBatch.delete(doc.ref)
        disposBatchSize++
        
        if (disposBatchSize >= 400) {
          disposBatches.push(disposBatch)
          disposBatch = writeBatch(db)
          disposBatchSize = 0
        }
      })
      
      if (disposBatchSize > 0) {
        disposBatches.push(disposBatch)
      }
      
      for (const batch of disposBatches) {
        await batch.commit()
      }
    }
    
    onProgress?.({
      phase: 'processing',
      current: 2,
      total: 2,
      message: 'Suppression terminée'
    })
    
    console.log(`✅ Suppression terminée: ${deleteCount} collaborateurs supprimés`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error)
    throw error
  }
}

/**
 * Importe les données vers Firestore avec progression
 */
export async function importToFirestore(
  data: NormalizedRow[], 
  tenantId: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportStats> {
  const startTime = Date.now()
  const stats: ImportStats = {
    collaborateursCreated: 0,
    collaborateursMerged: 0,
    disposCreated: 0,
    disposMerged: 0,
    errors: [],
    duration: 0
  }
  
  try {
    console.log('🚀 Début import Firestore...')
    
    // 1. Suppression des anciennes données
    await clearTenantData(tenantId, onProgress)
    
    // 2. Préparation des nouvelles données
    onProgress?.({
      phase: 'processing',
      current: 0,
      total: 1,
      message: 'Préparation des nouvelles données...'
    })
    
    const { collaborateurs, dispositions } = prepareDataForImport(data, tenantId)
    
    console.log(`📊 Données préparées: ${collaborateurs.length} collaborateurs, ${dispositions.length} dispositions`)
    
    // 3. Import des collaborateurs par batches de 400
    onProgress?.({
      phase: 'collaborateurs',
      current: 0,
      total: collaborateurs.length,
      message: 'Import des collaborateurs...'
    })
    
    const collabChunks = chunkArray(collaborateurs, 400)
    for (let i = 0; i < collabChunks.length; i++) {
      const chunk = collabChunks[i]
      const batch = writeBatch(db)
      
      chunk.forEach(collab => {
        const ref = doc(db, `tenants/${tenantId}/collaborateurs`, collab.id)
        const cleanedCollab = cleanObjectForFirestore(collab)
        batch.set(ref, cleanedCollab, { merge: true })
      })
      
      await batch.commit()
      stats.collaborateursCreated += chunk.length
      
      console.log(`✅ Batch collaborateurs ${i + 1}/${collabChunks.length} (${chunk.length} items)`)
      
      onProgress?.({
        phase: 'collaborateurs',
        current: stats.collaborateursCreated,
        total: collaborateurs.length,
        message: `Collaborateurs: ${stats.collaborateursCreated}/${collaborateurs.length}`
      })
      
      // Délai entre batches pour éviter les limitations
      if (i < collabChunks.length - 1) {
        await delay(200)
      }
    }
    
    // 4. Import des dispositions par batches de 400
    onProgress?.({
      phase: 'disponibilites',
      current: 0,
      total: dispositions.length,
      message: 'Import des disponibilités...'
    })
    
    const dispoChunks = chunkArray(dispositions, 400)
    for (let i = 0; i < dispoChunks.length; i++) {
      const chunk = dispoChunks[i]
      const batch = writeBatch(db)
      
      chunk.forEach(dispo => {
        const ref = doc(db, 'dispos', dispo.id)
        const cleanedDispo = cleanObjectForFirestore(dispo)
        batch.set(ref, cleanedDispo, { merge: true })
      })
      
      await batch.commit()
      stats.disposCreated += chunk.length
      
      console.log(`✅ Batch dispositions ${i + 1}/${dispoChunks.length} (${chunk.length} items)`)
      
      onProgress?.({
        phase: 'disponibilites',
        current: stats.disposCreated,
        total: dispositions.length,
        message: `Disponibilités: ${stats.disposCreated}/${dispositions.length}`
      })
      
      // Délai entre batches
      if (i < dispoChunks.length - 1) {
        await delay(200)
      }
    }
    
    stats.duration = Date.now() - startTime
    
    onProgress?.({
      phase: 'completed',
      current: stats.disposCreated,
      total: dispositions.length,
      message: `Import terminé en ${Math.round(stats.duration / 1000)}s`
    })
    
    console.log('🎉 Import Firestore terminé!', stats)
    return stats
    
  } catch (error) {
    stats.duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    stats.errors.push(errorMessage)
    console.error('❌ Erreur import Firestore:', error)
    throw error
  }
}

/**
 * Validation avant import (mode dry-run)
 */
export function validateImportData(data: NormalizedRow[]): {
  isValid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []
  
  if (data.length === 0) {
    errors.push('Aucune donnée à importer')
    return { isValid: false, warnings, errors }
  }
  
  // Vérifications de base
  const collaborateurs = new Set<string>()
  const dates = new Set<string>()
  
  for (const row of data) {
    // Validation des champs obligatoires
    if (!row.nom || !row.prenom) {
      errors.push(`Ligne manquante: nom="${row.nom}", prenom="${row.prenom}"`)
      continue
    }
    
    if (!row.date) {
      errors.push(`Date manquante pour ${row.prenom} ${row.nom}`)
      continue
    }
    
    // Validation du format de date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push(`Format de date invalide: ${row.date}`)
    }
    
    // Validation des heures
    if (row.heure_debut && !/^\d{2}:\d{2}$/.test(row.heure_debut)) {
      warnings.push(`Format d'heure début invalide: ${row.heure_debut} (${row.prenom} ${row.nom})`)
    }
    
    if (row.heure_fin && !/^\d{2}:\d{2}$/.test(row.heure_fin)) {
      warnings.push(`Format d'heure fin invalide: ${row.heure_fin} (${row.prenom} ${row.nom})`)
    }
    
    collaborateurs.add(slugify(row.nom, row.prenom))
    dates.add(row.date)
  }
  
  console.log(`📊 Validation: ${collaborateurs.size} collaborateurs, ${dates.size} dates uniques`)
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  }
}
