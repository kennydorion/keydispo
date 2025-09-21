<template>
  <va-modal
    v-model="isVisible"
    :hide-default-actions="true"
    :fullscreen="isMobile"
    :max-width="isMobile ? '100vw' : '600px'"
    :max-height="isMobile ? '100vh' : '85vh'"
    :mobile-fullscreen="true"
    no-padding
    class="collab-dispo-modal-new"
    :class="{ 'collab-dispo-modal-new--mobile': isMobile }"
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="() => { modalA11y.onClose(); handleClose() }"
  >
    <DispoEditContent
      :selected-cell="selectedCell"
      :selected-collaborateur="mockSelectedCollaborateur"
      :collaborateur-color="avatarColor"
      :formatted-date="formattedDate"
      :selected-cell-dispos="mockSelectedCellDispos"
      :editing-dispo-index="null"
      :is-adding-new-dispo="true"
      :editing-dispo="editingDispo"
  :type-options="typeOptions"
      :slot-options="slotOptions"
      :lieux-options-strings="lieuxExistants"
      :is-edit-form-valid="isFormValid"
      :saving="saving"
      :time-kind-options="timeKindOptions"
      :time-kind-options-filtered="timeKindOptionsFiltered"
      :is-detected-overnight="isOvernightSchedule"
  :is-collaborator-view="!canAccessAdminFeatures"
      :get-type-icon="getTypeIcon"
      :get-type-text="getTypeText"
      :get-type-color="getTypeColor"
      :get-dispo-type-class="getDispoTypeClass"
      :get-slot-text="getSlotText"
      :get-time-kind-icon="getTimeKindIcon"
      :get-user-initials="getUserInitials"
      :is-overnight-time="isOvernightTime"
      @cancel-modal="handleClose"
      @save-dispos="handleSave"
      @set-editing-type="setEditingType"
      @set-editing-time-kind="setEditingTimeKind"
      @toggle-editing-slot="toggleEditingSlot"
      @update-editing-lieu="updateEditingLieu"
      @save-edit-dispo="handleSave"
      @cancel-edit-dispo="handleClose"
      @add-new-dispo-line="() => {}"
      @edit-dispo-line="() => {}"
      @remove-dispo="() => {}"
      @create-lieu="onCreateLieu"
    />
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useModalA11y } from '@/composables/useModalA11y'
import { useToast } from 'vuestic-ui'
import { getUserInitials, getUserColor } from '../services/avatarUtils'
import { disponibilitesRTDBService } from '../services/disponibilitesRTDBService'
import DispoEditContent from './DispoEditContent.vue'
import type { Collaborateur } from '@/types/planning'
import { InterfaceManager } from '@/services/interfaceManager'
const canAccessAdminFeatures = InterfaceManager.canAccessAdminFeatures

// Configuration responsive
const isMobile = ref(false)

const updateMobileState = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  updateMobileState()
  window.addEventListener('resize', updateMobileState)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileState)
})

interface DisponibiliteData {
  type: string
  timeKind: string
  heureDebut: string
  heureFin: string
  lieu: string
  slots: string[]
}

interface Props {
  collaborateur: Collaborateur | null
  date: string
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: DisponibiliteData]
  delete: [id: string]
  close: []
}>()

// State
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})
const saving = ref(false)
const lieuxExistants = ref<string[]>([])
const { init: notify } = useToast()
const modalA11y = useModalA11y()

// Form data pour DispoEditContent
const editingDispo = ref({
  type: 'disponible' as 'mission' | 'disponible' | 'indisponible',
  timeKind: 'full-day' as 'range' | 'slot' | 'full-day' | 'overnight',
  heure_debut: '09:00',
  heure_fin: '17:00',
  lieu: '',
  slots: [] as string[]
})

// Mock data for DispoEditContent
const selectedCell = computed(() => ({
  collaborateurId: props.collaborateur?.id || '',
  date: props.date || ''
}))

const mockSelectedCellDispos = computed(() => [])

const mockSelectedCollaborateur = computed(() => {
  if (!props.collaborateur) return null
  
  // S'assurer que tous les champs requis sont présents
  return {
    ...props.collaborateur,
    color: props.collaborateur.color || avatarColor.value,
    createdAt: props.collaborateur.createdAt || new Date(),
    updatedAt: props.collaborateur.updatedAt || new Date()
  }
})

const formattedDate = computed(() => {
  return new Date(props.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Options pour DispoEditContent (inclut Mission si admin/editor)
const typeOptions = computed(() => {
  const base = [
    { value: 'disponible', text: 'Disponible' },
    { value: 'indisponible', text: 'Indisponible' },
  ]
  if (InterfaceManager.canAccessAdminFeatures.value) {
    return [{ value: 'mission', text: 'Mission' }, ...base]
  }
  return base
})

const slotOptions = [
  { value: 'morning', text: 'Matin (06:00–12:00)' },
  { value: 'lunch', text: 'Midi (12:00–14:00)' },
  { value: 'afternoon', text: 'Après-midi (14:00–18:00)' },
  { value: 'evening', text: 'Soir (18:00–22:00)' },
  { value: 'late_evening', text: 'Fin de soirée (22:00–02:00)' },
  { value: 'night', text: 'Nuit (22:00–06:00)' }
]

const timeKindOptions = [
  { value: 'full-day', text: 'Journée complète' },
  { value: 'slot', text: 'Créneaux standards' },
  { value: 'range', text: 'Horaires personnalisées' }
]

const timeKindOptionsFiltered = computed(() => timeKindOptions)

// Computed properties
const avatarColor = computed(() => {
  return getUserColor(props.collaborateur?.nom || '', props.collaborateur?.prenom || '')
})

const isFormValid = computed(() => {
  if (!editingDispo.value.type) return false
  
  if (editingDispo.value.type === 'indisponible') return true
  
  if (editingDispo.value.timeKind === 'full-day') return true
  
  if (editingDispo.value.timeKind === 'range') {
    return !!(editingDispo.value.heure_debut && editingDispo.value.heure_fin)
  }
  
  if (editingDispo.value.timeKind === 'slot') {
    return !!(editingDispo.value.slots && editingDispo.value.slots.length > 0)
  }
  
  return false
})

const isOvernightSchedule = computed(() => {
  if (editingDispo.value.timeKind !== 'range') return false
  const debut = editingDispo.value.heure_debut
  const fin = editingDispo.value.heure_fin
  if (!debut || !fin) return false
  
  const [hDebut] = debut.split(':').map(Number)
  const [hFin] = fin.split(':').map(Number)
  return hFin < hDebut
})

// Helper functions for DispoEditContent
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'disponible': return 'check_circle'
    case 'indisponible': return 'cancel'
    case 'mission': return 'work'
    default: return 'help'
  }
}

const getTypeText = (type: string) => {
  const option = typeOptions.value.find((opt: { value: string; text: string }) => opt.value === type)
  return option?.text || type
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'disponible': return 'success'
    case 'indisponible': return 'danger' 
    case 'mission': return 'primary'
    default: return 'secondary'
  }
}

const getDispoTypeClass = (dispo: any) => {
  return `type-${dispo.type || 'unknown'}`
}

const getSlotText = (slots?: string[]) => {
  if (!slots || slots.length === 0) return ''
  const slotLabels = slots.map(slot => {
    const option = slotOptions.find(opt => opt.value === slot)
    return option?.text || slot
  })
  return slotLabels.join(', ')
}

const getTimeKindIcon = (kind: string) => {
  switch (kind) {
    case 'full-day': return 'today'
    case 'slot': return 'view_module'
    case 'range': return 'schedule'
    default: return 'help'
  }
}

const isOvernightTime = (start?: string, end?: string) => {
  if (!start || !end) return false
  const [hStart] = start.split(':').map(Number)
  const [hEnd] = end.split(':').map(Number)
  return hEnd < hStart
}

// Event handlers for DispoEditContent
const setEditingType = (type: string) => {
  editingDispo.value.type = type as any
}

const setEditingTimeKind = (timeKind: string) => {
  editingDispo.value.timeKind = timeKind as any
  
  // Reset related fields when changing time kind
  if (timeKind === 'full-day') {
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
    editingDispo.value.slots = []
  } else if (timeKind === 'slot') {
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
  } else if (timeKind === 'range') {
    editingDispo.value.slots = []
    if (!editingDispo.value.heure_debut) editingDispo.value.heure_debut = '09:00'
    if (!editingDispo.value.heure_fin) editingDispo.value.heure_fin = '17:00'
  }
}

const toggleEditingSlot = (slot: string) => {
  if (!editingDispo.value.slots) editingDispo.value.slots = []
  
  const index = editingDispo.value.slots.indexOf(slot)
  if (index > -1) {
    editingDispo.value.slots.splice(index, 1)
  } else {
    editingDispo.value.slots.push(slot)
  }
}

const updateEditingLieu = (lieu: string) => {
  editingDispo.value.lieu = lieu
}

const onCreateLieu = (lieu: string) => {
  if (lieu && !lieuxExistants.value.includes(lieu)) {
    lieuxExistants.value.push(lieu)
    lieuxExistants.value.sort()
  }
  editingDispo.value.lieu = lieu
}

const handleClose = () => {
  isVisible.value = false
  emit('close')
}

const handleSave = async () => {
  if (!isFormValid.value || !props.collaborateur) return
  
  saving.value = true
  
  try {
    console.log(`🔄 RTDB: Création de disponibilité pour ${props.collaborateur.prenom} ${props.collaborateur.nom}`)
    
    // Mapping des types UI vers RTDB
    const mapUITypeToRTDB = (uiType: string): 'standard' | 'formation' | 'urgence' | 'maintenance' => {
      switch (uiType) {
        case 'mission': return 'urgence'  // Mission = urgence pour distinction
        case 'disponible': return 'standard'  // Disponible = standard
        case 'indisponible': return 'maintenance'  // Indisponible = maintenance
        default: return 'standard'
      }
    }

    const mapUITimeKindToRTDB = (uiTimeKind: string): 'fixed' | 'flexible' => {
      switch (uiTimeKind) {
        case 'range': return 'flexible'
        case 'slot': return 'fixed'
        case 'full-day': return 'flexible'
        case 'overnight': return 'flexible'
        default: return 'flexible'
      }
    }

    const dispoData = {
      collaborateurId: props.collaborateur.id,
      nom: props.collaborateur.nom,
      prenom: props.collaborateur.prenom,
      metier: props.collaborateur.metier || '',
      phone: props.collaborateur.phone || '',
      email: props.collaborateur.email || '',
      ville: props.collaborateur.ville || '',
      date: props.date,
      lieu: editingDispo.value.lieu || '',
      heure_debut: editingDispo.value.heure_debut || '',
      heure_fin: editingDispo.value.heure_fin || '',
      type: mapUITypeToRTDB(editingDispo.value.type),
      timeKind: mapUITimeKindToRTDB(editingDispo.value.timeKind),
      isFullDay: editingDispo.value.timeKind === 'full-day',
      slots: editingDispo.value.slots || [],
      updatedBy: 'collaborateur-modal'
    }
    
    await disponibilitesRTDBService.createDisponibilite(dispoData)
    
    console.log(`✅ RTDB: Disponibilité créée avec succès`)
    
    emit('save', {
      type: editingDispo.value.type,
      timeKind: editingDispo.value.timeKind,
      heureDebut: editingDispo.value.heure_debut,
      heureFin: editingDispo.value.heure_fin,
      lieu: editingDispo.value.lieu,
      slots: editingDispo.value.slots
    })
    handleClose()
  } catch (error) {
    console.error('❌ Erreur lors de la création de la disponibilité RTDB:', error)
    notify({
      message: 'Erreur lors de la création de la disponibilité',
      color: 'danger'
    })
  } finally {
    saving.value = false
  }
}

// Fonction pour récupérer les lieux existants depuis RTDB
async function fetchLieuxExistants() {
  try {
    const allDispos = await disponibilitesRTDBService.getAllDisponibilites('keydispo')
    const lieuxSet = new Set<string>()
    
    allDispos.forEach((dispo) => {
      if (dispo.lieu && typeof dispo.lieu === 'string' && dispo.lieu.trim()) {
        lieuxSet.add(dispo.lieu.trim())
      }
    })
    
    // Ajouter quelques lieux par défaut
    const lieuxParDefaut = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Nantes', 'Toulouse', 'Bordeaux']
    lieuxParDefaut.forEach(lieu => lieuxSet.add(lieu))
    
    lieuxExistants.value = Array.from(lieuxSet).sort()
  } catch (error) {
    console.error('Erreur lors de la récupération des lieux:', error)
    lieuxExistants.value = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Nantes', 'Toulouse', 'Bordeaux']
  }
}

// Lifecycle
onMounted(() => {
  fetchLieuxExistants()
})

// Watchers
watch(() => props.collaborateur, (newCollab) => {
  if (newCollab) {
    editingDispo.value.lieu = newCollab.ville || ''
  }
}, { immediate: true })
</script>

<style scoped>
/* === CSS SIMPLIFIÉ POUR RESPECTER DispoEditContent === */

/* Styles de base pour le modal */
.collab-dispo-modal-new {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
}

/* Mobile : Plein écran comme défini dans DispoEditContent */
@media (max-width: 768px) {
  :deep(.collab-dispo-modal-new--mobile .va-modal__container) {
    padding: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    margin: 0 !important;
  }

  :deep(.collab-dispo-modal-new--mobile .va-modal__dialog) {
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  :deep(.collab-dispo-modal-new--mobile .va-modal__content) {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
}

/* Desktop : Taille normale comme défini dans DispoEditContent */
@media (min-width: 769px) {
  :deep(.collab-dispo-modal-new:not(.collab-dispo-modal-new--mobile) .va-modal__container) {
    padding: 10px !important;
  }

  :deep(.collab-dispo-modal-new:not(.collab-dispo-modal-new--mobile) .va-modal__dialog) {
    max-width: 600px !important;
    max-height: 85vh !important;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  :deep(.collab-dispo-modal-new:not(.collab-dispo-modal-new--mobile) .va-modal__content) {
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
}

/* Laisser DispoEditContent gérer sa propre responsivité */
:deep(.dispo-modal-redesigned) {
  border-radius: 0 !important;
  box-shadow: none !important;
  width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
}
</style>
