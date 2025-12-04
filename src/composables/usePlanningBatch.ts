import { ref, computed } from 'vue'
import { useToast } from 'vuestic-ui'
import { AuthService } from '@/services/auth'
import { disponibilitesRTDBService } from '@/services/disponibilitesRTDBService'
import { canonicalizeLieu as canonicalizeLieuShared } from '@/services/normalization'
import { saveFormPreferences } from '@/services/dispoFormPreferences'
import { formatModalDate } from '@/utils/planningFormatters'

/**
 * Composable pour la gestion des opérations batch (multi-dates)
 * Centralise la logique d'édition en masse sur plusieurs dates
 */
export function usePlanningBatch(options: {
  disponibilitesCache: any
  getDisponibilites: (collaborateurId: string, date: string) => any[]
  setCacheDispos: (date: string, dispos: any[]) => void
  clearSelection: () => void
  cancelModal: () => void
  refreshDisponibilites: (force: boolean) => void
  selectedCellDispos: any
  editingDispo: any
  sanitizeDisposition: (dispo: any) => any
  canonicalizeLieu: (lieu: string) => string
}) {
  const { notify } = useToast()
  
  const {
    disponibilitesCache,
    getDisponibilites,
    setCacheDispos,
    clearSelection,
    cancelModal,
    refreshDisponibilites,
    selectedCellDispos,
    editingDispo,
    sanitizeDisposition,
    canonicalizeLieu
  } = options
  
  // État du mode batch
  const isBatchMode = ref(false)
  const batchDates = ref<string[]>([])
  const batchCollaborateurId = ref<string>('')
  const batchModalOpen = ref(false)
  const saving = ref(false)
  
  /**
   * Sauvegarder les disponibilités en mode batch (plusieurs dates)
   */
  async function saveBatchDispos(isEditFormValid: boolean) {
    if (!isBatchMode.value || batchDates.value.length === 0 || !batchCollaborateurId.value) {
      return
    }
    
    if (!isEditFormValid) {
      notify({
        message: 'Veuillez compléter le formulaire (type, durée, et lieu si mission).',
        color: 'warning',
        position: 'top-right',
        duration: 3000
      })
      return
    }
    
    saving.value = true
    try {
      const collabId = batchCollaborateurId.value
      const tenantId = AuthService.currentTenantId || 'keydispo'
      
      // Préparer la disponibilité à créer
      let processedDispo = { ...editingDispo.value }
      
      // Détection automatique des missions overnight
      if (processedDispo.timeKind === 'range' && processedDispo.heure_debut && processedDispo.heure_fin) {
        const startTime = parseInt(processedDispo.heure_debut.split(':')[0])
        const endTime = parseInt(processedDispo.heure_fin.split(':')[0])
        
        if (endTime < startTime || (endTime === startTime && processedDispo.heure_fin < processedDispo.heure_debut)) {
          // Garder timeKind comme 'range' mais le système détectera automatiquement l'overnight
        }
      }
      
      const newDispo = sanitizeDisposition(processedDispo)
      
      // Créer la disponibilité pour chaque date sélectionnée (remplace les existantes)
      for (const date of batchDates.value) {
        // 0) Supprimer d'abord les disponibilités existantes de ce collaborateur sur cette date
        const existingDispos = getDisponibilites(collabId, date)
        
        // 1) Nettoyage optimiste du cache local (supprimer les existantes du collaborateur)
        const existingCache = disponibilitesCache.value.get(date) || []
        const filteredCache = existingCache.filter((d: any) => d.collaborateurId !== collabId)
        
        // 2) Ajouter la nouvelle disponibilité au cache
        const localId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const localDispo: any = {
          id: localId,
          collaborateurId: collabId,
          date,
          type: newDispo.type,
          timeKind: newDispo.timeKind,
          isFullDay: newDispo.timeKind === 'full-day',
          lieu: newDispo.lieu || '',
          heure_debut: newDispo.heure_debut || '',
          heure_fin: newDispo.heure_fin || '',
          slots: newDispo.slots || [],
          tenantId,
        }
        setCacheDispos(date, [...filteredCache, localDispo])
        
        // 3) Suppression distante des disponibilités existantes
        for (const existingDispo of existingDispos) {
          if (existingDispo.id) {
            try {
              await disponibilitesRTDBService.deleteDisponibilite(existingDispo.id)
            } catch (e) {
              console.error('Échec suppression existante pour', date, existingDispo.id, e)
            }
          }
        }
        
        // 4) Persistance distante de la nouvelle disponibilité (RTDB)
        const canonLieu = newDispo.lieu ? canonicalizeLieu(newDispo.lieu) : ''
        
        // Mapper les types legacy vers RTDB
        const mapLegacyTypeToRTDB = (legacyType: string | undefined): 'standard' | 'formation' | 'urgence' | 'maintenance' => {
          switch (legacyType) {
            case 'mission': return 'urgence'
            case 'disponible': return 'standard'
            case 'indisponible': return 'maintenance'
            default: return 'standard'
          }
        }
        
        const mapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' | 'overnight' => {
          switch (legacyTimeKind) {
            case 'range': return 'flexible'
            case 'slot': return 'fixed'
            case 'full-day': return 'flexible'
            case 'overnight': return 'overnight'
            default: return 'flexible'
          }
        }
        
        const dispoData = {
          date,
          collaborateurId: collabId,
          tenantId,
          type: mapLegacyTypeToRTDB(newDispo.type),
          timeKind: mapLegacyTimeKindToRTDB(newDispo.timeKind),
          heure_debut: newDispo.heure_debut || '',
          heure_fin: newDispo.heure_fin || '',
          lieu: canonLieu,
          slots: newDispo.slots || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: 'ui',
          version: 1
        }
        
        try {
          await disponibilitesRTDBService.createDisponibilite(dispoData as any)
        } catch (e) {
          console.error('Échec création distante pour', date, e)
        }
      }
      
      // Sauvegarder les préférences de formulaire
      saveFormPreferences({
        type: processedDispo.type,
        timeKind: processedDispo.timeKind,
        heure_debut: processedDispo.heure_debut || '09:00',
        heure_fin: processedDispo.heure_fin || '17:00',
        lieu: processedDispo.lieu || '',
        slots: processedDispo.slots || []
      })
      
      // Afficher notification de succès
      notify({ 
        message: `${batchDates.value.length} disponibilité${batchDates.value.length > 1 ? 's' : ''} mise${batchDates.value.length > 1 ? 's' : ''} à jour`, 
        color: 'success',
        position: 'top-right',
        duration: 3000
      })
      
      // Mettre à jour selectedCellDispos pour refléter le remplacement
      const newBatchDispos: any[] = []
      for (const date of batchDates.value) {
        newBatchDispos.push({
          ...newDispo,
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          collaborateurId: collabId,
          date,
          _batchDate: date,
          _batchFormattedDate: formatModalDate(date)
        })
      }
      selectedCellDispos.value = newBatchDispos
      
      // Nettoyer la sélection et fermer le modal
      clearSelection()
      cancelModal()
      
      // Optionnel: synchroniser en arrière-plan pour remplacer les IDs temporaires
      setTimeout(() => {
        refreshDisponibilites(false)
      }, 400)
      
    } catch (error: any) {
      console.error('Erreur lors de la création batch:', error)
      notify({ 
        message: 'Erreur lors de la création des disponibilités', 
        color: 'danger',
        position: 'top-right',
        duration: 4000
      })
    } finally {
      saving.value = false
    }
  }
  
  /**
   * Supprimer toutes les disponibilités des dates sélectionnées en mode batch
   */
  async function deleteBatchDispos() {
    if (!isBatchMode.value || batchDates.value.length === 0 || !batchCollaborateurId.value) {
      return
    }
    
    // Compter les disponibilités à supprimer
    let totalDispos = 0
    for (const date of batchDates.value) {
      const existingDispos = getDisponibilites(batchCollaborateurId.value, date)
      totalDispos += existingDispos.length
    }
    
    if (totalDispos === 0) {
      notify({
        message: 'Aucune disponibilité à supprimer sur les dates sélectionnées.',
        color: 'info',
        position: 'top-right',
        duration: 3000
      })
      return
    }
    
    saving.value = true
    try {
      const collabId = batchCollaborateurId.value
      
      // Supprimer pour chaque date sélectionnée
      for (const date of batchDates.value) {
        const existingDispos = getDisponibilites(collabId, date)
        
        // 1) Suppression optimiste du cache local
        const existingCache = disponibilitesCache.value.get(date) || []
        const filteredCache = existingCache.filter((d: any) => d.collaborateurId !== collabId)
        setCacheDispos(date, filteredCache)
        
        // 2) Suppression distante (RTDB)
        for (const dispo of existingDispos) {
          if (dispo.id) {
            try {
              await disponibilitesRTDBService.deleteDisponibilite(dispo.id)
            } catch (e) {
              console.error('Échec suppression distante pour', date, dispo.id, e)
            }
          }
        }
      }
      
      // Afficher notification de succès
      notify({ 
        message: `${totalDispos} disponibilité${totalDispos > 1 ? 's' : ''} supprimée${totalDispos > 1 ? 's' : ''}`, 
        color: 'success',
        position: 'top-right',
        duration: 3000
      })
      
      // Vider selectedCellDispos et fermer le modal
      selectedCellDispos.value = []
      clearSelection()
      cancelModal()
      
      // Optionnel: synchroniser en arrière-plan
      setTimeout(() => {
        refreshDisponibilites(false)
      }, 400)
      
    } catch (error: any) {
      console.error('Erreur lors de la suppression batch:', error)
      notify({ 
        message: 'Erreur lors de la suppression des disponibilités', 
        color: 'danger',
        position: 'top-right',
        duration: 4000
      })
    } finally {
      saving.value = false
    }
  }
  
  return {
    // État
    isBatchMode,
    batchDates,
    batchCollaborateurId,
    batchModalOpen,
    saving,
    
    // Fonctions
    saveBatchDispos,
    deleteBatchDispos
  }
}
