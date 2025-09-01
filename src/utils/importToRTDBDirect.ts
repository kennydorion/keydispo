import { ref, set, update, serverTimestamp } from 'firebase/database'
import { rtdb } from '../services/firebase'

// Types pour l'import compatibles avec les types existants
export interface ImportResult {
  success: boolean
  stats: ImportStats
  message: string
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

// Interface pour les données normalisées du parser Excel
export interface NormalizedRow {
  nom: string
  prenom: string
  metier: string
  date: string // YYYY-MM-DD
  lieu?: string
  heure_debut?: string // HH:MM
  heure_fin?: string // HH:MM
  phone?: string
  email?: string
  ville?: string
}

/**
 * Interface pour les données d'import Excel normalisées vers RTDB
 */
export interface NormalizedImportData {
  collaborateurs: Array<{
    id: string
    nom: string
    prenom: string
    metier: string
    phone: string
    email: string
    ville: string
  }>
  disponibilites: Array<{
    id: string
    collaborateurId: string  // userId -> collaborateurId
    tenantId: string
    nom: string
    prenom: string
    metier: string
    phone: string
    email: string
    ville: string
    date: string
    lieu: string
    heure_debut: string  // heureDebut -> heure_debut
    heure_fin: string    // heureFin -> heure_fin
  }>
}

/**
 * Interface pour les données d'import Excel normalisées
 */
export interface NormalizedImportData {
  collaborateurs: Array<{
    id: string
    nom: string
    prenom: string
    metier: string
    phone: string
    email: string
    ville: string
  }>
  disponibilites: Array<{
    id: string
    collaborateurId: string  // userId -> collaborateurId
    tenantId: string
    nom: string
    prenom: string
    metier: string
    phone: string
    email: string
    ville: string
    date: string
    lieu: string
    heure_debut: string  // heureDebut -> heure_debut
    heure_fin: string    // heureFin -> heure_fin
  }>
}

/**
 * Nettoie un objet pour RTDB (supprime les valeurs null/undefined)
 */
function cleanObjectForRTDB(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanObjectForRTDB).filter(item => item !== null)
  }
  
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = cleanObjectForRTDB(value)
    }
  }
  
  return Object.keys(cleaned).length > 0 ? cleaned : null
}

/**
 * Valide les données d'import pour RTDB
 */
export function validateImportDataRTDB(data: NormalizedRow[]): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!data || !Array.isArray(data)) {
    errors.push('Les données sont manquantes ou invalides')
    return { isValid: false, errors, warnings }
  }
  
  data.forEach((row, index) => {
    if (!row.nom || !row.prenom) {
      errors.push(`Ligne ${index + 1}: nom et prénom requis`)
    }
    if (!row.date) {
      errors.push(`Ligne ${index + 1}: date manquante`)
    }
    // Validation format date
    if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push(`Ligne ${index + 1}: format date invalide (attendu: YYYY-MM-DD)`)
    }
    // Validation format heure
    if (row.heure_debut && !/^\d{2}:\d{2}$/.test(row.heure_debut)) {
      warnings.push(`Ligne ${index + 1}: format heure début invalide (attendu: HH:MM)`)
    }
    if (row.heure_fin && !/^\d{2}:\d{2}$/.test(row.heure_fin)) {
      warnings.push(`Ligne ${index + 1}: format heure fin invalide (attendu: HH:MM)`)
    }
    if (!row.lieu) {
      warnings.push(`Ligne ${index + 1}: lieu manquant`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Transforme les données normalisées en données d'import RTDB
 */
export function transformToRTDBData(data: NormalizedRow[], tenantId: string): NormalizedImportData {
  // Créer les collaborateurs uniques
  const collaborateursMap = new Map<string, any>()
  
  data.forEach(row => {
    const key = `${row.nom.toLowerCase()}_${row.prenom.toLowerCase()}`
    if (!collaborateursMap.has(key)) {
      collaborateursMap.set(key, {
        id: key.replace(/\s+/g, '_'),
        nom: row.nom,
        prenom: row.prenom,
        metier: row.metier || '',
        phone: row.phone || '',
        email: row.email || '',
        ville: row.ville || ''
      })
    }
  })
  
  const collaborateurs = Array.from(collaborateursMap.values())
  
  // Créer les disponibilités
  const disponibilites = data.map((row) => {
    const collaborateurId = `${row.nom.toLowerCase()}_${row.prenom.toLowerCase()}`.replace(/\s+/g, '_')
    const dispoId = `${collaborateurId}_${row.date}_${(row.lieu || 'no_lieu').toLowerCase().replace(/\s+/g, '_')}`
    
    return {
      id: dispoId,
      collaborateurId,  // userId -> collaborateurId
      tenantId,
      nom: row.nom,
      prenom: row.prenom,
      metier: row.metier || '',
      phone: row.phone || '',
      email: row.email || '',
      ville: row.ville || '',
      date: row.date,
      lieu: row.lieu || 'Non spécifié',
      heure_debut: row.heure_debut || '08:00',  // heureDebut -> heure_debut
      heure_fin: row.heure_fin || '17:00'       // heureFin -> heure_fin
    }
  })
  
  return {
    collaborateurs,
    disponibilites
  }
}

/**
 * Importe les données vers RTDB
 */
export async function importToRTDB(
  data: NormalizedRow[],
  tenantId: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Début import RTDB pour tenant:', tenantId)
    
    // Validation
    const validation = validateImportDataRTDB(data)
    if (!validation.isValid) {
      throw new Error(`Données invalides: ${validation.errors.join(', ')}`)
    }
    
    // Transformation des données
    const normalizedData = transformToRTDBData(data, tenantId)
    
    const stats: ImportStats = {
      collaborateursCreated: 0,
      collaborateursMerged: 0,
      disposCreated: 0,
      disposMerged: 0,
      errors: [],
      duration: 0
    }
    
    const totalOperations = normalizedData.collaborateurs.length + normalizedData.disponibilites.length
    let completedOperations = 0
    
    // Fonction de mise à jour du progrès
    const updateProgress = (phase: ImportProgress['phase'], message: string) => {
      if (onProgress) {
        onProgress({
          phase,
          current: completedOperations,
          total: totalOperations,
          message
        })
      }
    }
    
    updateProgress('collaborateurs', 'Import des collaborateurs...')
    
    // Import des collaborateurs par chunks (taille réduite pour RTDB)
    const CHUNK_SIZE = 20
    console.log(`📋 Import de ${normalizedData.collaborateurs.length} collaborateurs...`)
    
    for (let i = 0; i < normalizedData.collaborateurs.length; i += CHUNK_SIZE) {
      const chunk = normalizedData.collaborateurs.slice(i, i + CHUNK_SIZE)
      
      try {
        const updates: Record<string, any> = {}
        
        for (const collab of chunk) {
          const collaborateurData = cleanObjectForRTDB({
            nom: collab.nom,
            prenom: collab.prenom,
            metier: collab.metier,
            phone: collab.phone,
            email: collab.email,
            ville: collab.ville,
            updatedAt: serverTimestamp(),
            updatedBy: 'import'
          })
          
          if (collaborateurData) {
            updates[`tenants/${tenantId}/collaborateurs/${collab.id}`] = collaborateurData
            stats.collaborateursCreated++
          }
        }
        
        // Appliquer toutes les mises à jour en une fois avec update
        if (Object.keys(updates).length > 0) {
          await update(ref(rtdb), updates)
        }
        
        completedOperations += chunk.length
        updateProgress('collaborateurs', `${completedOperations}/${totalOperations} éléments traités`)
        
      } catch (error) {
        console.warn(`⚠️ Erreur lors de l'import du chunk collaborateurs ${i}-${i + chunk.length}:`, error)
        stats.errors.push(`Erreur chunk collaborateurs ${i}-${i + chunk.length}: ${error}`)
      }
    }
    
    updateProgress('disponibilites', 'Import des disponibilités...')
    
    // Import des disponibilités par chunks
    console.log(`📅 Import de ${normalizedData.disponibilites.length} disponibilités...`)
    
    for (let i = 0; i < normalizedData.disponibilites.length; i += CHUNK_SIZE) {
      const chunk = normalizedData.disponibilites.slice(i, i + CHUNK_SIZE)
      
      try {
        const updates: Record<string, any> = {}
        
        for (const dispo of chunk) {
          const dispoData = cleanObjectForRTDB({
            tenantId: dispo.tenantId,
            collaborateurId: dispo.collaborateurId, // Maintenant correct
            nom: dispo.nom,
            prenom: dispo.prenom,
            metier: dispo.metier,
            phone: dispo.phone,
            email: dispo.email,
            ville: dispo.ville,
            date: dispo.date,
            lieu: dispo.lieu,
            heure_debut: dispo.heure_debut, // Maintenant correct
            heure_fin: dispo.heure_fin, // Maintenant correct
            version: 1,
            updatedAt: serverTimestamp(),
            updatedBy: 'import'
          })
          
          if (dispoData) {
            updates[`tenants/${tenantId}/disponibilites/${dispo.id}`] = dispoData
            stats.disposCreated++
          }
        }
        
        // Appliquer toutes les mises à jour en une fois avec update
        if (Object.keys(updates).length > 0) {
          await update(ref(rtdb), updates)
        }
        
        completedOperations += chunk.length
        updateProgress('disponibilites', `${completedOperations}/${totalOperations} éléments traités`)
        
      } catch (error) {
        console.warn(`⚠️ Erreur lors de l'import du chunk disponibilités ${i}-${i + chunk.length}:`, error)
        stats.errors.push(`Erreur chunk disponibilités ${i}-${i + chunk.length}: ${error}`)
      }
    }
    
    updateProgress('completed', 'Finalisation...')
    
    // Mettre à jour les métadonnées d'import
    try {
      const metadataPath = `metadata/${tenantId}/lastImport`
      await set(ref(rtdb, metadataPath), {
        timestamp: serverTimestamp(),
        stats,
        source: 'excel'
      })
    } catch (error) {
      console.warn('⚠️ Erreur lors de la mise à jour des métadonnées:', error)
    }
    
    stats.duration = Date.now() - startTime
    
    console.log('✅ Import RTDB terminé avec succès')
    console.log('📊 Statistiques:', stats)
    
    updateProgress('completed', 'Import terminé avec succès')
    
    return {
      success: true,
      stats,
      message: `Import réussi: ${stats.collaborateursCreated} collaborateurs et ${stats.disposCreated} disponibilités ajoutés`
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'import RTDB:', error)
    throw new Error(`Erreur import RTDB: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}
