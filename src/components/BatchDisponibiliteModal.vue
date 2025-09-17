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
      :selected-cell="mockSelectedCell"
      :selected-collaborateur="mockSelectedCollaborateur"
      :collaborateur-color="avatarColor"
  :formatted-date="formattedDateRange"
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
  :is-collaborator-view="props.isCollaboratorView"
  :header-stat-number="selectedDatesCount"
  :header-stat-label="selectedDatesLabel"
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
  addOneDay,
} from '@/services/dispoFormOptions'

// Interface plus permissive pour le collaborateur
interface CollaborateurBatch {
  id: string
  nom: string
  prenom: string
  email?: string
  phone?: string
  metier?: string
  ville?: string
  notes?: string
  color?: string
  tenantId: string
  createdAt?: any
  updatedAt?: any
}

// Props
interface Props {
  selectedCells?: string[]
  selectedCollaborateur: CollaborateurBatch | null
  selectedDates: string[]
  lieuxOptions?: string[]
  modelValue?: boolean
  isCollaboratorView?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  selectedCells: () => [],
  lieuxOptions: () => [],
  isCollaboratorView: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'batch-created': [data: {
    collaborateur: CollaborateurBatch,
    dates: string[],
    dispoData: {
      type: string,
      timeKind: string,
      heureDebut: string,
      heureFin: string,
      lieu: string
    }
  }]
  close: []
  success: []
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

// Forme de données pour le composant DispoEditContent
const editingDispo = ref({
  type: 'disponible' as 'mission' | 'disponible' | 'indisponible',
  timeKind: 'full-day' as 'range' | 'slot' | 'full-day' | 'overnight',
  heure_debut: '09:00',
  heure_fin: '17:00',
  lieu: '',
  slots: [] as string[]
})

// Mock data for DispoEditContent
const mockSelectedCell = computed(() => ({
  collaborateurId: props.selectedCollaborateur?.id || '',
  date: props.selectedDates[0] || ''
}))

const mockSelectedCellDispos = computed(() => [])

const mockSelectedCollaborateur = computed(() => {
  if (!props.selectedCollaborateur) return null
  
  // Adapter le type CollaborateurBatch vers Collaborateur
  return {
    ...props.selectedCollaborateur,
    color: props.selectedCollaborateur.color || avatarColor.value,
    createdAt: props.selectedCollaborateur.createdAt || new Date(),
    updatedAt: props.selectedCollaborateur.updatedAt || new Date()
  }
})

const formattedDateRange = computed(() => {
  const dates = [...props.selectedDates].sort()
  if (dates.length === 0) return ''
  if (dates.length === 1) {
    return new Date(dates[0]).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  }
  const first = new Date(dates[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  const last = new Date(dates[dates.length - 1]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  return `${dates.length} dates · ${first} → ${last}`
})

// Header stats customisation pour l'alignement visuel avec la modale classique
const selectedDatesCount = computed(() => props.selectedDates.length)
const selectedDatesLabel = computed(() => selectedDatesCount.value > 1 ? 'Dates sélectionnées' : 'Date sélectionnée')

// Options pour DispoEditContent
const typeOptions = computed(() => typeOptionsFor(!!props.isCollaboratorView))
// timeKindOptions fourni via import, mais filtré selon type
const timeKindOptionsFiltered = computed(() => timeKindOptionsFilteredFor(editingDispo.value.type as any))

// Computed properties
const avatarColor = computed(() => {
  const c = props.selectedCollaborateur
  if (!c) return '#6366f1'
  return c.color || getUserColor(c.id)
})

const collaborateurName = computed(() => {
  if (!props.selectedCollaborateur) return ''
  return `${props.selectedCollaborateur.prenom} ${props.selectedCollaborateur.nom}`
})

const isFormValid = computed(() => isDraftValid(editingDispo.value as any))

const isOvernightSchedule = computed(() => detectOvernight(editingDispo.value as any))

// Helper functions for DispoEditContent
const getTypeText = (type: string) => {
  const option = typeOptions.value.find(opt => opt.value === type)
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
  if (!isFormValid.value || !props.selectedCollaborateur) return
  
  saving.value = true
  
  try {
    console.log(`🔄 RTDB: Création de ${props.selectedDates.length} disponibilité(s) pour ${collaborateurName.value}`)

    // Préparer les disponibilités pour le service RTDB
    const disponibilitesToCreate: any[] = []
    const allCreatedDates: string[] = []
    
    for (const date of props.selectedDates) {
      // Détection automatique overnight avant mapping RTDB
      let finalTimeKind = editingDispo.value.timeKind
      if (editingDispo.value.timeKind === 'range' && 
          editingDispo.value.heure_debut && 
          editingDispo.value.heure_fin) {
        if (detectOvernight(editingDispo.value as any)) {
          finalTimeKind = 'overnight'
        }
      }
      
      const baseDispoData = {
        collaborateurId: props.selectedCollaborateur.id,
        nom: props.selectedCollaborateur.nom,
        prenom: props.selectedCollaborateur.prenom,
        metier: props.selectedCollaborateur.metier || '',
        phone: props.selectedCollaborateur.phone || '',
        email: props.selectedCollaborateur.email || '',
        ville: props.selectedCollaborateur.ville || '',
        date: date,
        lieu: editingDispo.value.lieu || '',
        heure_debut: editingDispo.value.heure_debut || '',
        heure_fin: editingDispo.value.heure_fin || '',
        type: mapUITypeToRTDB(editingDispo.value.type),
        timeKind: mapUITimeKindToRTDB(finalTimeKind), // Utiliser le timeKind détecté
        isFullDay: finalTimeKind === 'full-day',
        slots: editingDispo.value.slots || [],
        updatedBy: 'batch-modal'
      }
      
      console.log(`🔥 Préparation dispo RTDB pour ${date}:`, baseDispoData, {
        typeUI: editingDispo.value.type,
        typeRTDB: baseDispoData.type
      })
      disponibilitesToCreate.push(baseDispoData)
      allCreatedDates.push(date)
      
      // Si c'est une plage horaire qui déborde sur le lendemain (overnight)
    if (editingDispo.value.timeKind === 'range' && 
      detectOvernight(editingDispo.value as any)) {
        
        const nextDay = addOneDay(date)
        
        // Vérifier si le jour suivant n'est pas déjà dans la sélection
        // pour éviter les doublons
        if (!props.selectedDates.includes(nextDay)) {
          const nextDayData = {
            ...baseDispoData,
            date: nextDay,
            _cont: 'end' as const // Marquer comme continuation overnight
          }
          
          console.log(`🌙 Préparation dispo overnight pour ${nextDay}:`, nextDayData)
          disponibilitesToCreate.push(nextDayData)
          allCreatedDates.push(nextDay)
        }
      }
    }
    
    // Créer toutes les disponibilités via le service RTDB
    const createdIds = await disponibilitesRTDBService.createMultipleDisponibilites(disponibilitesToCreate)
    
    console.log(`✅ RTDB: ${createdIds.length} disponibilité(s) créée(s) avec succès`)
    
    // Émettre l'événement avec toutes les dates créées
    emit('batch-created', {
      collaborateur: props.selectedCollaborateur,
      dates: allCreatedDates, // Inclut les dates overnight ajoutées
      dispoData: {
        type: editingDispo.value.type,
        timeKind: editingDispo.value.timeKind,
        heureDebut: editingDispo.value.heure_debut,
        heureFin: editingDispo.value.heure_fin,
        lieu: editingDispo.value.lieu
      }
    })
    emit('success')
    handleClose()
  } catch (error) {
    console.error('❌ Erreur lors de la création des disponibilités RTDB:', error)
    notify({
      message: 'Erreur lors de la création des disponibilités',
      color: 'danger'
    })
  } finally {
    saving.value = false
  }
}

// Fonction pour récupérer les lieux existants depuis RTDB
async function fetchLieuxExistants() {
  try {
    // Récupérer les lieux depuis RTDB via le service
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
    // Utiliser des lieux par défaut en cas d'erreur
    lieuxExistants.value = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Nantes', 'Toulouse', 'Bordeaux']
  }
}

// Lifecycle
onMounted(() => {
  fetchLieuxExistants()
})

// Watchers
watch(() => props.selectedCollaborateur, (newCollab) => {
  if (newCollab) {
    editingDispo.value.lieu = newCollab.ville || ''
  }
}, { immediate: true })
</script>

<style scoped>
/* Minimal styles since we're using DispoEditContent styles */
</style>