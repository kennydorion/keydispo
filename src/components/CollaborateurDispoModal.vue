<template>
  <va-modal
    v-model="isVisible"
    :hide-default-actions="true"
    :fullscreen="false"
    max-width="800px"
    no-padding
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
import { ref, computed, watch, onMounted } from 'vue'
import { useModalA11y } from '@/composables/useModalA11y'
import { useToast } from 'vuestic-ui'
import { getUserInitials, getUserColor } from '../services/avatarUtils'
import { disponibilitesRTDBService } from '../services/disponibilitesRTDBService'
import DispoEditContent from './DispoEditContent.vue'
import {
  slotOptions,
  timeKindOptions,
  typeOptionsFor,
  timeKindOptionsFilteredFor,
  isFormValid as isDraftValid,
  detectOvernight,
  getTypeIcon,
  getTypeColor,
  getSlotText,
  getTimeKindIcon,
  mapUITypeToRTDB,
  mapUITimeKindToRTDB,
} from '@/services/dispoFormOptions'
import type { Collaborateur } from '@/types/planning'
import { InterfaceManager } from '@/services/interfaceManager'
const canAccessAdminFeatures = InterfaceManager.canAccessAdminFeatures

interface DisponibiliteData {
  type: string
  timeKind: string
  heureDebut: string
  heureFin: string
  lieu: string
  slots: string[]
}

// Accepte un collaborateur minimal (profil light) et enrichit localement les champs requis
interface MinimalCollaborateur {
  id: string
  nom: string
  prenom: string
  tenantId: string
  email?: string | null
  phone?: string | null
  metier?: string | null
  ville?: string | null
  color?: string | null
  createdAt?: any
  updatedAt?: any
}

interface Props {
  collaborateur: MinimalCollaborateur | null
  date: string
  modelValue?: boolean
  editingDisponibilite?: any
  existingDisponibilites?: any[]
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

const mockSelectedCellDispos = computed(() => {
  return props.existingDisponibilites || []
})

const mockSelectedCollaborateur = computed<Collaborateur | null>(() => {
  const c = props.collaborateur
  if (!c) return null
  // Normaliser pour respecter le type Collaborateur (pas de null)
  const normalized: Collaborateur = {
    id: c.id,
    nom: c.nom,
    prenom: c.prenom,
    tenantId: c.tenantId,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    metier: c.metier ?? undefined,
    ville: c.ville ?? undefined,
    note: undefined,
    notes: undefined,
    color: c.color ?? avatarColor.value,
    createdAt: c.createdAt ?? new Date(),
    updatedAt: c.updatedAt ?? new Date(),
  }
  return normalized
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
const typeOptions = computed(() => typeOptionsFor(!InterfaceManager.canAccessAdminFeatures.value))
// timeKindOptions fourni, filtrer selon type
const timeKindOptionsFiltered = computed(() => timeKindOptionsFilteredFor(editingDispo.value.type as any))

// Computed properties
const avatarColor = computed(() => {
  const c = props.collaborateur
  if (!c) return '#6366f1'
  return c.color || getUserColor(c.id)
})

const isFormValid = computed(() => isDraftValid(editingDispo.value as any))

const isOvernightSchedule = computed(() => detectOvernight(editingDispo.value as any))

// Helper functions for DispoEditContent
const getTypeText = (type: string) => {
  const option = typeOptions.value.find((opt: { value: string; text: string }) => opt.value === type)
  return option?.text || type
}

const getDispoTypeClass = (dispo: any) => {
  return `type-${dispo.type || 'unknown'}`
}
const isOvernightTime = (start?: string, end?: string) => {
  if (!start || !end) return false
  const d = { type: editingDispo.value.type, timeKind: 'range', heure_debut: start, heure_fin: end, slots: [] } as any
  return detectOvernight(d)
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
  type: mapUITypeToRTDB(editingDispo.value.type as any),
  timeKind: mapUITimeKindToRTDB(editingDispo.value.timeKind as any),
      isFullDay: editingDispo.value.timeKind === 'full-day',
      slots: editingDispo.value.slots || [],
      updatedBy: 'collaborateur-modal'
    }
    
    await disponibilitesRTDBService.createDisponibilite(dispoData)
    
    console.log(`✅ RTDB: Disponibilité créée avec succès`, { 
      typeUI: editingDispo.value.type, 
      typeRTDB: dispoData.type 
    })
    
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
/* Minimal styles since we're using DispoEditContent styles */
</style>
