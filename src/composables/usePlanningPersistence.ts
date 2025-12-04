import { ref } from 'vue'
import { disponibilitesRTDBService } from '@/services/disponibilitesRTDBService'
import { canonicalizeLieu as canonicalizeLieuShared } from '@/services/normalization'
import { AuthService } from '@/services/auth'

/**
 * Composable pour la persistance des disponibilités vers RTDB
 * Centralise les opérations create/update/delete
 */

export interface DispoForSave {
  id?: string
  collaborateurId: string
  date: string
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  heure_debut?: string
  heure_fin?: string
  lieu?: string
  slots?: string[]
  note?: string
  tenantId?: string
}

/**
 * Mapper les types legacy vers RTDB
 */
export function mapLegacyTypeToRTDB(legacyType: string | undefined): 'standard' | 'formation' | 'urgence' | 'maintenance' {
  switch (legacyType) {
    case 'mission': return 'urgence'
    case 'disponible': return 'standard'
    case 'indisponible': return 'maintenance'
    default: return 'standard'
  }
}

/**
 * Mapper les timeKind legacy vers RTDB
 */
export function mapLegacyTimeKindToRTDB(legacyTimeKind: string | undefined): 'flexible' | 'fixed' | 'overnight' {
  switch (legacyTimeKind) {
    case 'range': return 'flexible'
    case 'slot': return 'fixed'
    case 'full-day': return 'flexible'
    case 'overnight': return 'overnight'
    default: return 'flexible'
  }
}

export function usePlanningPersistence() {
  const saving = ref(false)
  const lastError = ref<Error | null>(null)

  /**
   * Créer une disponibilité dans RTDB
   */
  async function createDisponibilite(dispo: DispoForSave): Promise<string | null> {
    try {
      saving.value = true
      lastError.value = null
      
      const tenantId = dispo.tenantId || AuthService.currentTenantId || 'keydispo'
      const canonLieu = dispo.lieu ? canonicalizeLieuShared(dispo.lieu) : ''
      
      const dispoData = {
        date: dispo.date,
        collaborateurId: dispo.collaborateurId,
        tenantId,
        type: mapLegacyTypeToRTDB(dispo.type),
        timeKind: mapLegacyTimeKindToRTDB(dispo.timeKind),
        heure_debut: dispo.heure_debut || '',
        heure_fin: dispo.heure_fin || '',
        lieu: canonLieu,
        slots: dispo.slots || [],
        isFullDay: dispo.timeKind === 'full-day',
        note: dispo.note || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'ui',
        version: 1
      }
      
      const result = await disponibilitesRTDBService.createDisponibilite(dispoData as any)
      return result?.id || null
      
    } catch (error: any) {
      console.error('❌ Erreur création disponibilité:', error)
      lastError.value = error
      return null
    } finally {
      saving.value = false
    }
  }

  /**
   * Mettre à jour une disponibilité dans RTDB
   */
  async function updateDisponibilite(id: string, updates: Partial<DispoForSave>): Promise<boolean> {
    try {
      saving.value = true
      lastError.value = null
      
      const updateData: any = {
        updatedAt: new Date().toISOString(),
        updatedBy: 'ui'
      }
      
      if (updates.type !== undefined) {
        updateData.type = mapLegacyTypeToRTDB(updates.type)
      }
      if (updates.timeKind !== undefined) {
        updateData.timeKind = mapLegacyTimeKindToRTDB(updates.timeKind)
        updateData.isFullDay = updates.timeKind === 'full-day'
      }
      if (updates.heure_debut !== undefined) {
        updateData.heure_debut = updates.heure_debut
      }
      if (updates.heure_fin !== undefined) {
        updateData.heure_fin = updates.heure_fin
      }
      if (updates.lieu !== undefined) {
        updateData.lieu = canonicalizeLieuShared(updates.lieu)
      }
      if (updates.slots !== undefined) {
        updateData.slots = updates.slots
      }
      if (updates.note !== undefined) {
        updateData.note = updates.note
      }
      
      await disponibilitesRTDBService.updateDisponibilite(id, updateData)
      return true
      
    } catch (error: any) {
      console.error('❌ Erreur mise à jour disponibilité:', error)
      lastError.value = error
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Supprimer une disponibilité de RTDB
   */
  async function deleteDisponibilite(id: string): Promise<boolean> {
    try {
      saving.value = true
      lastError.value = null
      
      await disponibilitesRTDBService.deleteDisponibilite(id)
      return true
      
    } catch (error: any) {
      console.error('❌ Erreur suppression disponibilité:', error)
      lastError.value = error
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Remplacer les disponibilités d'un collaborateur pour une date
   * Supprime les existantes puis crée les nouvelles
   */
  async function replaceDisponibilites(
    collaborateurId: string,
    date: string,
    existingIds: string[],
    newDispos: DispoForSave[]
  ): Promise<{ created: string[]; failed: number }> {
    const created: string[] = []
    let failed = 0
    
    try {
      saving.value = true
      lastError.value = null
      
      // 1) Supprimer les existantes
      for (const id of existingIds) {
        try {
          await disponibilitesRTDBService.deleteDisponibilite(id)
        } catch (e) {
          console.error('Échec suppression:', id, e)
          failed++
        }
      }
      
      // 2) Créer les nouvelles
      for (const dispo of newDispos) {
        const newId = await createDisponibilite({
          ...dispo,
          collaborateurId,
          date
        })
        if (newId) {
          created.push(newId)
        } else {
          failed++
        }
      }
      
      return { created, failed }
      
    } catch (error: any) {
      console.error('❌ Erreur remplacement disponibilités:', error)
      lastError.value = error
      return { created, failed: failed + newDispos.length - created.length }
    } finally {
      saving.value = false
    }
  }

  /**
   * Créer des disponibilités en batch pour plusieurs dates
   */
  async function createBatchDisponibilites(
    collaborateurId: string,
    dates: string[],
    dispoTemplate: Omit<DispoForSave, 'collaborateurId' | 'date'>
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0
    
    try {
      saving.value = true
      lastError.value = null
      
      for (const date of dates) {
        const newId = await createDisponibilite({
          ...dispoTemplate,
          collaborateurId,
          date
        })
        if (newId) {
          success++
        } else {
          failed++
        }
      }
      
      return { success, failed }
      
    } catch (error: any) {
      console.error('❌ Erreur création batch:', error)
      lastError.value = error
      return { success, failed: failed + (dates.length - success) }
    } finally {
      saving.value = false
    }
  }

  /**
   * Supprimer toutes les disponibilités d'un collaborateur pour plusieurs dates
   */
  async function deleteBatchDisponibilites(dispoIds: string[]): Promise<{ deleted: number; failed: number }> {
    let deleted = 0
    let failed = 0
    
    try {
      saving.value = true
      lastError.value = null
      
      for (const id of dispoIds) {
        const success = await deleteDisponibilite(id)
        if (success) {
          deleted++
        } else {
          failed++
        }
      }
      
      return { deleted, failed }
      
    } catch (error: any) {
      console.error('❌ Erreur suppression batch:', error)
      lastError.value = error
      return { deleted, failed: dispoIds.length - deleted }
    } finally {
      saving.value = false
    }
  }

  return {
    // État
    saving,
    lastError,
    
    // Fonctions
    createDisponibilite,
    updateDisponibilite,
    deleteDisponibilite,
    replaceDisponibilites,
    createBatchDisponibilites,
    deleteBatchDisponibilites,
    
    // Helpers exposés
    mapLegacyTypeToRTDB,
    mapLegacyTimeKindToRTDB
  }
}
