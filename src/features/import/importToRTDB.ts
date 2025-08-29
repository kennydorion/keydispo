import { rtdb } from '../../services/firebase'
import { ref as rtdbRef, set as rtdbSet, remove as rtdbRemove } from 'firebase/database'
import type { NormalizedRow } from './types'
import { normalizeDispo } from '../../services/normalization'

/**
 * Version Firebase RTDB-compatible de slugify (remplace les tirets par des underscores)
 */
function slugify(nom: string, prenom: string): string {
  const clean = (str: string) => str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  
  const result = `${clean(nom)}_${clean(prenom)}`
  
  // Firebase RTDB n'aime pas les clés qui commencent par un chiffre
  // On préfixe avec 'c' (collaborateur) si c'est le cas
  if (/^\d/.test(result)) {
    return `c${result}`
  }
  
  return result
}

// Types pour l'import RTDB
export interface CollaborateurRTDB {
  id: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  phone: string | null
  email: string | null
  ville: string | null
  slug: string
  createdAt: number
  updatedAt: number
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
  lieu: string | null
  heure_debut: string | null
  heure_fin: string | null
  type?: 'standard' | 'formation' | 'urgence' | 'maintenance'
  timeKind?: 'fixed' | 'flexible' | 'oncall'
  slots?: Array<'morning' | 'midday' | 'afternoon' | 'evening' | 'night'>
  isFullDay?: boolean
  version: number
  updatedAt: number
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
 * Nettoie les valeurs undefined d'un objet pour Firebase RTDB
 */
function cleanUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item)).filter(item => item !== undefined)
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value)
      }
    }
    return cleaned
  }
  
  return obj
}

/**
 * Génère un ID déterministe pour une disposition
 */
function makeDispoId(tenantId: string, collaborateurId: string, date: string): string {
  return `${tenantId}_${collaborateurId}_${date}`.replace(/[.#$[\]]/g, '_')
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
 * Prépare les données d'import en normalisant et dédupliquant
 */
function prepareDataForImport(data: NormalizedRow[], tenantId: string) {
  const collaborateursMap = new Map<string, CollaborateurRTDB>()
  const dispositions: DisponibiliteRTDB[] = []
  const now = Date.now()
  
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
        slug,
        createdAt: now,
        updatedAt: now
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
      existing.updatedAt = now
    }
    
    // Créer la disposition
    const dispoId = makeDispoId(tenantId, slug, row.date)
    const normalized = normalizeDispo({
      date: row.date,
      lieu: row.lieu || null,
      heure_debut: row.heure_debut || null,
      heure_fin: row.heure_fin || null,
    })

    // Mapper les types legacy vers les types RTDB (préserver la sémantique)
    const mapLegacyTypeToRTDB = (legacyType: string): 'standard' | 'formation' | 'urgence' | 'maintenance' => {
      switch (legacyType) {
        case 'mission': return 'urgence'  // Mission = urgence pour distinction
        case 'disponible': return 'standard'  // Disponible = standard
        case 'indisponible': return 'maintenance'  // Indisponible = maintenance
        default: return 'standard'
      }
    }
    
    const mapLegacyTimeKindToRTDB = (legacyTimeKind: string): 'fixed' | 'flexible' | 'oncall' => {
      switch (legacyTimeKind) {
        case 'range': return 'flexible'
        case 'slot': return 'fixed'
        case 'full-day': return 'flexible'
        case 'overnight': return 'flexible'
        default: return 'flexible'
      }
    }

    dispositions.push({
      id: dispoId,
      tenantId,
      collaborateurId: slug,
      nom: row.nom,
      prenom: row.prenom,
      metier: row.metier,
      phone: row.phone || '',
      email: row.email || '',
      ville: row.ville || '',
      date: row.date,
      lieu: normalized.lieu ?? null,
      heure_debut: normalized.heure_debut ?? null,
      heure_fin: normalized.heure_fin ?? null,
      type: mapLegacyTypeToRTDB(normalized.type),
      timeKind: mapLegacyTimeKindToRTDB(normalized.timeKind),
      slots: normalized.slots,
      isFullDay: normalized.isFullDay,
      version: 0,
      updatedAt: now,
      updatedBy: 'import'
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
async function clearTenantDataRTDB(tenantId: string, onProgress?: (progress: ImportProgress) => void): Promise<void> {
  console.log(`🧹 Suppression des données RTDB existantes pour tenant: ${tenantId}`)
  
  onProgress?.({
    phase: 'processing',
    current: 0,
    total: 2,
    message: 'Suppression des anciennes données...'
  })
  
  try {
    // 1. Supprimer les collaborateurs
    const collaborateursRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs`)
    await rtdbRemove(collaborateursRef)
    
    onProgress?.({
      phase: 'processing',
      current: 1,
      total: 2,
      message: 'Collaborateurs supprimés...'
    })
    
    // 2. Supprimer les disponibilités
    const disposRef = rtdbRef(rtdb, `tenants/${tenantId}/disponibilites`)
    await rtdbRemove(disposRef)
    
    onProgress?.({
      phase: 'processing',
      current: 2,
      total: 2,
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
    
    const { collaborateurs, dispositions } = prepareDataForImport(data, tenantId)
    
    console.log(`📊 Données préparées: ${collaborateurs.length} collaborateurs, ${dispositions.length} dispositions`)
    
    // 3. Import des collaborateurs par batches (RTDB supporte les gros objets)
    onProgress?.({
      phase: 'collaborateurs',
      current: 0,
      total: collaborateurs.length,
      message: 'Import des collaborateurs...'
    })
    
    const collabChunks = chunkArray(collaborateurs, 50) // Batches plus petits pour RTDB
    for (let i = 0; i < collabChunks.length; i++) {
      const chunk = collabChunks[i]
      
      // Import individuel pour éviter les problèmes de chemin avec les slashes
      for (const collab of chunk) {
        const collabRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs/${collab.id}`)
        // Nettoyer les valeurs undefined avant l'import
        const cleanedCollab = cleanUndefinedValues(collab)
        await rtdbSet(collabRef, cleanedCollab)
      }
      
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
        await delay(100)
      }
    }
    
    // 4. Import des dispositions par batches
    onProgress?.({
      phase: 'disponibilites',
      current: 0,
      total: dispositions.length,
      message: 'Import des disponibilités...'
    })
    
    const dispoChunks = chunkArray(dispositions, 100) // Batches plus gros pour les dispos
    for (let i = 0; i < dispoChunks.length; i++) {
      const chunk = dispoChunks[i]
      
      // Import individuel pour éviter les problèmes de chemin avec les slashes
      for (const dispo of chunk) {
        const dispoRef = rtdbRef(rtdb, `tenants/${tenantId}/disponibilites/${dispo.id}`)
        // Nettoyer les valeurs undefined avant l'import
        const cleanedDispo = cleanUndefinedValues(dispo)
        await rtdbSet(dispoRef, cleanedDispo)
      }
      
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
        await delay(100)
      }
    }
    
    stats.duration = Date.now() - startTime
    
    onProgress?.({
      phase: 'completed',
      current: stats.disposCreated,
      total: dispositions.length,
      message: `Import terminé en ${Math.round(stats.duration / 1000)}s`
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
