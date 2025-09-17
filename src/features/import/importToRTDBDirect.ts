import { rtdb as database } from '../../services/firebase'
import { ref, set, runTransaction, serverTimestamp } from 'firebase/database'
import type { NormalizedRow } from './types'
import { slugify } from './parseWorkbook'
import { normalizeDispo, canonicalizeLieu } from '../../services/normalization'

// Types pour l'import RTDB
export interface CollaborateurRTDB {
  id: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  phone: string | null
  email: string | null
  note: string | null
  slug: string
  createdAt: any
  updatedAt: any
  updatedBy: string
}

export interface DispositionRTDB {
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
  createdAt: any
  updatedAt: any
  updatedBy: string
}

export interface ImportStatsRTDB {
  collaborateursCreated: number
  collaborateursMerged: number
  disposCreated: number
  disposMerged: number
  errors: string[]
  duration: number
}

export interface ImportProgressRTDB {
  phase: 'processing' | 'collaborateurs' | 'disponibilites' | 'completed'
  current: number
  total: number
  message: string
}

/**
 * Génère un ID déterministe pour une disposition
 */
export function makeDispoId(
  collaborateurId: string,
  date: string,
  heureDebut?: string | null,
  heureFin?: string | null,
  lieu?: string | null
): string {
  const hd = (heureDebut || 'default').replace(/[^0-9]/g, '') || 'default'
  const hf = (heureFin || 'default').replace(/[^0-9]/g, '') || 'default'
  const canonLieu = canonicalizeLieu(lieu || '') || 'none'
  const key = `${collaborateurId}_${date}_${hd}_${hf}_${canonLieu}`
  return key.replace(/[^a-zA-Z0-9_-]/g, '')
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
function cleanObjectForRTDB(obj: any): any {
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      // RTDB ne supporte pas les valeurs null, on les transforme en chaînes vides
      cleaned[key] = value === null ? '' : value
    }
  }
  return cleaned
}

/**
 * Prépare les données d'import en normalisant et dédupliquant
 */
function prepareDataForImportRTDB(data: NormalizedRow[], tenantId: string) {
  const collaborateursMap = new Map<string, CollaborateurRTDB>()
  const dispositions: DispositionRTDB[] = []
  
  for (const row of data) {
    const slug = slugify(row.nom, row.prenom)
    
    // Créer ou mettre à jour le collaborateur
    if (!collaborateursMap.has(slug)) {
      collaborateursMap.set(slug, {
        id: slug,
        tenantId,
        nom: row.nom,
        prenom: row.prenom,
        metier: row.metier || '',
        phone: row.phone || null,
        email: row.email || null,
        note: row.note || null,
        slug,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: 'import-rtdb'
      })
    } else {
      // Merge des données (compléter les champs manquants)
      const existing = collaborateursMap.get(slug)!
      if (row.phone && !existing.phone) existing.phone = row.phone
      if (row.email && !existing.email) existing.email = row.email
      if (row.note && !existing.note) existing.note = row.note
      if (row.metier && existing.metier !== row.metier) {
        // Prendre le métier le plus récent/complet
        existing.metier = row.metier
      }
      existing.updatedAt = serverTimestamp()
    }
    
    // Créer la disposition
    const normalized = normalizeDispo({
      date: row.date,
      lieu: row.lieu || null,
      heure_debut: row.heure_debut || null,
      heure_fin: row.heure_fin || null,
    })

    const dispoId = makeDispoId(
      slug,
      row.date,
      normalized.heure_debut || row.heure_debut || null,
      normalized.heure_fin || row.heure_fin || null,
      normalized.lieu || (row.lieu || null)
    )

    dispositions.push({
      id: dispoId,
      tenantId,
      collaborateurId: slug,
      date: row.date,
      lieu: normalized.lieu || null,
      heure_debut: normalized.heure_debut || null,
      heure_fin: normalized.heure_fin || null,
      type: normalized.type,
      timeKind: normalized.timeKind,
      slots: normalized.slots,
      isFullDay: normalized.isFullDay,
      version: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: 'import-rtdb'
    })
  }
  
  return {
    collaborateurs: Array.from(collaborateursMap.values()),
    dispositions
  }
}

/**
 * Supprime toutes les données existantes pour un tenant dans RTDB
 */
async function clearTenantDataRTDB(tenantId: string, onProgress?: (progress: ImportProgressRTDB) => void): Promise<void> {
  console.log(`🧹 Suppression des données RTDB existantes pour tenant: ${tenantId}`)
  
  onProgress?.({
    phase: 'processing',
    current: 0,
    total: 3,
    message: 'Suppression des anciennes données RTDB...'
  })
  
  try {
    // 1. Supprimer les collaborateurs
    await set(ref(database, `tenants/${tenantId}/collaborateurs`), null)
    
    onProgress?.({
      phase: 'processing',
      current: 1,
      total: 3,
      message: 'Collaborateurs supprimés...'
    })
    
    // 2. Supprimer les disponibilités
    await set(ref(database, `tenants/${tenantId}/disponibilites`), null)
    
    onProgress?.({
      phase: 'processing',
      current: 2,
      total: 3,
      message: 'Disponibilités supprimées...'
    })
    
    // 3. Nettoyer les métadonnées
    await set(ref(database, `tenants/${tenantId}/metadata/import`), null)
    
    onProgress?.({
      phase: 'processing',
      current: 3,
      total: 3,
      message: 'Suppression terminée'
    })
    
    console.log(`✅ Suppression RTDB terminée pour tenant: ${tenantId}`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression RTDB:', error)
    throw error
  }
}

/**
 * Importe les données vers RTDB avec progression
 */
export async function importToRTDB(
  data: NormalizedRow[], 
  tenantId: string,
  onProgress?: (progress: ImportProgressRTDB) => void
): Promise<ImportStatsRTDB> {
  const startTime = Date.now()
  const stats: ImportStatsRTDB = {
    collaborateursCreated: 0,
    collaborateursMerged: 0,
    disposCreated: 0,
    disposMerged: 0,
    errors: [],
    duration: 0
  }
  
  try {
    console.log('🚀 Début import RTDB...')
    
    // 1. Suppression des anciennes données
    await clearTenantDataRTDB(tenantId, onProgress)
    
    // 2. Préparation des nouvelles données
    onProgress?.({
      phase: 'processing',
      current: 0,
      total: 1,
      message: 'Préparation des nouvelles données...'
    })
    
    const { collaborateurs, dispositions } = prepareDataForImportRTDB(data, tenantId)
    
    console.log(`📊 Données préparées: ${collaborateurs.length} collaborateurs, ${dispositions.length} dispositions`)
    
    // 3. Import des collaborateurs par chunks
    onProgress?.({
      phase: 'collaborateurs',
      current: 0,
      total: collaborateurs.length,
      message: 'Import des collaborateurs vers RTDB...'
    })
    
    await importCollaborateursRTDB(collaborateurs, tenantId, stats, onProgress)
    
    // 4. Import des disponibilités par chunks
    onProgress?.({
      phase: 'disponibilites',
      current: 0,
      total: dispositions.length,
      message: 'Import des disponibilités vers RTDB...'
    })
    
    await importDisponibilitesRTDB(dispositions, tenantId, stats, onProgress)
    
    // 5. Finalisation avec métadonnées
    await finalizeImportRTDB(tenantId, stats, startTime)
    
    stats.duration = Date.now() - startTime
    
    onProgress?.({
      phase: 'completed',
      current: stats.disposCreated,
      total: dispositions.length,
      message: `Import RTDB terminé en ${Math.round(stats.duration / 1000)}s`
    })
    
    console.log('🎉 Import RTDB terminé!', stats)
    return stats
    
  } catch (error) {
    stats.duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    stats.errors.push(errorMessage)
    console.error('❌ Erreur import RTDB:', error)
    throw error
  }
}

/**
 * Importe les collaborateurs vers RTDB par chunks
 */
async function importCollaborateursRTDB(
  collaborateurs: CollaborateurRTDB[],
  tenantId: string,
  stats: ImportStatsRTDB,
  onProgress?: (progress: ImportProgressRTDB) => void
): Promise<void> {
  const chunkSize = 50 // Chunks plus petits pour RTDB
  const chunks = chunkArray(collaborateurs, chunkSize)
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    try {
      // Utiliser une transaction pour garantir la cohérence
      await runTransaction(ref(database, `tenants/${tenantId}/collaborateurs`), (current) => {
        const updates = current || {}
        
        for (const collab of chunk) {
          const cleanedCollab = cleanObjectForRTDB(collab)
          
          if (updates[collab.id]) {
            // Collaborateur existant - merge
            updates[collab.id] = {
              ...updates[collab.id],
              ...cleanedCollab,
              updatedAt: serverTimestamp()
            }
            stats.collaborateursMerged++
          } else {
            // Nouveau collaborateur
            updates[collab.id] = cleanedCollab
            stats.collaborateursCreated++
          }
        }
        
        return updates
      })
      
      console.log(`✅ Chunk collaborateurs RTDB ${i + 1}/${chunks.length} (${chunk.length} items)`)
      
      onProgress?.({
        phase: 'collaborateurs',
        current: stats.collaborateursCreated + stats.collaborateursMerged,
        total: collaborateurs.length,
        message: `Collaborateurs: ${stats.collaborateursCreated + stats.collaborateursMerged}/${collaborateurs.length}`
      })
      
      // Délai entre chunks pour éviter le throttling
      if (i < chunks.length - 1) {
        await delay(200)
      }
      
    } catch (error) {
      const errorMsg = `Erreur chunk collaborateurs ${i + 1}: ${error}`
      stats.errors.push(errorMsg)
      console.error('❌', errorMsg)
    }
  }
}

/**
 * Importe les disponibilités vers RTDB par chunks groupés par date
 */
async function importDisponibilitesRTDB(
  dispositions: DispositionRTDB[],
  tenantId: string,
  stats: ImportStatsRTDB,
  onProgress?: (progress: ImportProgressRTDB) => void
): Promise<void> {
  // Grouper par date pour optimiser les transactions RTDB
  const disposByDate = groupByDate(dispositions)
  const dates = Array.from(disposByDate.keys()).sort()
  
  console.log(`📅 Import de ${dates.length} dates différentes`)
  
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const dispos = disposByDate.get(date)!
    
    try {
      // Chunker les disponibilités de cette date
      const chunks = chunkArray(dispos, 30) // Chunks plus petits pour les disponibilités
      
      for (const chunk of chunks) {
        await runTransaction(ref(database, `tenants/${tenantId}/disponibilites/${date}`), (current) => {
          const updates = current || {}
          
          for (const dispo of chunk) {
            const cleanedDispo = cleanObjectForRTDB(dispo)
            
            if (updates[dispo.id]) {
              // Disponibilité existante - mise à jour version
              updates[dispo.id] = {
                ...updates[dispo.id],
                ...cleanedDispo,
                version: (updates[dispo.id].version || 0) + 1,
                updatedAt: serverTimestamp()
              }
              stats.disposMerged++
            } else {
              // Nouvelle disponibilité
              updates[dispo.id] = cleanedDispo
              stats.disposCreated++
            }
          }
          
          return updates
        })
      }
      
      console.log(`✅ Date RTDB ${i + 1}/${dates.length}: ${date} (${dispos.length} disponibilités)`)
      
      onProgress?.({
        phase: 'disponibilites',
        current: stats.disposCreated + stats.disposMerged,
        total: dispositions.length,
        message: `Disponibilités: ${stats.disposCreated + stats.disposMerged}/${dispositions.length}`
      })
      
      // Délai entre dates
      if (i < dates.length - 1) {
        await delay(150)
      }
      
    } catch (error) {
      const errorMsg = `Erreur import date ${date}: ${error}`
      stats.errors.push(errorMsg)
      console.error('❌', errorMsg)
    }
  }
}

/**
 * Finalise l'import avec les métadonnées
 */
async function finalizeImportRTDB(
  tenantId: string, 
  stats: ImportStatsRTDB, 
  startTime: number
): Promise<void> {
  try {
    const metadata = {
      timestamp: serverTimestamp(),
      source: 'import-frontend-rtdb',
      stats: {
        collaborateurs: stats.collaborateursCreated + stats.collaborateursMerged,
        disponibilites: stats.disposCreated + stats.disposMerged,
        errors: stats.errors.length
      },
      duration: Date.now() - startTime
    }
    
    await set(ref(database, `tenants/${tenantId}/metadata/lastImport`), metadata)
    console.log('✅ Métadonnées d\'import RTDB sauvegardées')
    
  } catch (error) {
    console.warn('⚠️ Erreur sauvegarde métadonnées RTDB:', error)
    stats.errors.push(`Erreur métadonnées: ${error}`)
  }
}

/**
 * Groupe les disponibilités par date
 */
function groupByDate(dispositions: DispositionRTDB[]): Map<string, DispositionRTDB[]> {
  const grouped = new Map<string, DispositionRTDB[]>()
  
  for (const dispo of dispositions) {
    const existing = grouped.get(dispo.date) || []
    existing.push(dispo)
    grouped.set(dispo.date, existing)
  }
  
  return grouped
}

/**
 * Validation avant import (mode dry-run) - identique à la version Firestore
 */
export function validateImportDataRTDB(data: NormalizedRow[]): {
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
    
    // Validation spécifique RTDB - pas de caractères spéciaux dans les IDs
    const slug = slugify(row.nom, row.prenom)
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      warnings.push(`ID généré contient des caractères spéciaux: ${slug} (${row.prenom} ${row.nom})`)
    }
    
    collaborateurs.add(slug)
    dates.add(row.date)
  }
  
  console.log(`📊 Validation RTDB: ${collaborateurs.size} collaborateurs, ${dates.size} dates uniques`)
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Obtenir le statut de l'import RTDB
 */
export async function getImportStatusRTDB(tenantId: string): Promise<any> {
  try {
    const { get } = await import('firebase/database')
    const snapshot = await get(ref(database, `tenants/${tenantId}/metadata/lastImport`))
    
    if (snapshot.exists()) {
      return snapshot.val()
    }
    
    return null
  } catch (error) {
    console.error('❌ Erreur récupération status import RTDB:', error)
    throw error
  }
}
