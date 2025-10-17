<template>
  <va-modal
    class="dispo-modal-center"
    v-model="isVisible"
    :hide-default-actions="true"
    :fullscreen="false"
    :mobile-fullscreen="false"
    max-width="600px"
    max-height="90vh"
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
      :selected-cell-dispos="[]"
      :editing-dispo-index="null"
      :is-adding-new-dispo="true"
      :editing-dispo="editingDispo"
      :type-options="typeOptions"
      :slot-options="slotOptions"
      :lieux-options-strings="lieuxExistants"
      :is-edit-form-valid="isFormValid"
      :saving="saving"
      :time-kind-options="timeKindOptionsFiltered"
      :time-kind-options-filtered="timeKindOptionsFiltered"
      :is-detected-overnight="false"
      :is-collaborator-view="false"
      :get-type-icon="getTypeIcon"
      :get-type-text="(t: any) => t === 'mission' ? 'Mission' : t === 'disponible' ? 'Disponible' : 'Indisponible'"
      :get-type-color="(t: any) => t === 'mission' ? '#2196f3' : t === 'disponible' ? '#4caf50' : '#f44336'"
      :get-dispo-type-class="(t: any) => `type-${t}`"
      :get-slot-text="(slots?: string[]) => (slots || []).join(', ')"
      :get-time-kind-icon="getTimeKindIcon"
      :get-user-initials="getUserInitials"
      :is-overnight-time="(start?: string, end?: string) => {
        if (!start || !end) return false
        const s = parseInt(start.split(':')[0])
        const e = parseInt(end.split(':')[0])
        return e < s
      }"
      @cancel-modal="handleClose"
      @save-edit-dispo="handleSave"
      @create-lieu="onCreateLieu"
      @update-editing-lieu="(v: string) => { editingDispo.lieu = v }"
      @set-editing-type="(t: any) => { editingDispo.type = t }"
      @set-editing-time-kind="(k: any) => { editingDispo.timeKind = k }"
      @toggle-editing-slot="(s: string) => {
        const slots = editingDispo.slots || []
        editingDispo.slots = slots.includes(s) ? slots.filter(x => x !== s) : [...slots, s]
      }"
      @cancel-edit-dispo="handleClose"
      @add-new-dispo-line="() => {}"
      @edit-dispo-line="() => {}"
      @remove-dispo="() => {}"
      @save-dispos="handleSave"
    />
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useModalA11y } from '@/composables/useModalA11y'
import { useToast } from 'vuestic-ui'
import { getUserInitials, getUserColor } from '../services/avatarUtils'
import { disponibilitesRTDBService } from '../services/disponibilitesRTDBService'
import { getLastFormPreferences, saveFormPreferences } from '../services/dispoFormPreferences'
import DispoEditContent from './DispoEditContent.vue'
import {
  slotOptions,
  typeOptionsFor,
  timeKindOptionsFilteredFor,
  isFormValid as isDraftValid,
  detectOvernight,
  getTypeIcon,
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
// Initialiser avec les dernières préférences sauvegardées
const savedPrefs = getLastFormPreferences()
const editingDispo = ref({
  type: savedPrefs.type as 'mission' | 'disponible' | 'indisponible',
  timeKind: savedPrefs.timeKind as 'range' | 'slot' | 'full-day' | 'overnight',
  heure_debut: savedPrefs.heure_debut,
  heure_fin: savedPrefs.heure_fin,
  lieu: savedPrefs.lieu,
  slots: [...savedPrefs.slots] as string[]
})

// Mock data for DispoEditContent
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

// Mock selectedCell pour DispoEditContent (batch utilise plusieurs dates)
const mockSelectedCell = computed(() => {
  if (!props.selectedCollaborateur || props.selectedDates.length === 0) return null
  return {
    collaborateurId: props.selectedCollaborateur.id,
    date: props.selectedDates[0] // Première date comme référence
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

// Options pour BatchDisponibiliteContent
const typeOptions = computed(() => typeOptionsFor(!!props.isCollaboratorView))
// timeKindOptions fourni via import, mais filtré selon type
const timeKindOptionsFiltered = computed(() => timeKindOptionsFilteredFor(editingDispo.value.type as any))

// Computed properties
const avatarColor = computed(() => {
  const c = props.selectedCollaborateur
  if (!c) return '#6366f1'
  return c.color || getUserColor(c.id)
})

// collaborateurName non utilisé

const isFormValid = computed(() => isDraftValid(editingDispo.value as any))

const onCreateLieu = (lieu: string) => {
  if (lieu && !lieuxExistants.value.includes(lieu)) {
    lieuxExistants.value.push(lieu)
    lieuxExistants.value.sort()
  }
  // Mettre à jour le lieu dans editingDispo via le v-model de DispoForm
}

const handleClose = () => {
  isVisible.value = false
  emit('close')
}

const handleSave = async () => {
  if (!isFormValid.value || !props.selectedCollaborateur) return
  
  saving.value = true
  
  try {

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
          
          
          disponibilitesToCreate.push(nextDayData)
          allCreatedDates.push(nextDay)
        }
      }
    }
    
    // Créer toutes les disponibilités via le service RTDB
  await disponibilitesRTDBService.createMultipleDisponibilites(disponibilitesToCreate)
    
    // Sauvegarder les préférences de formulaire pour réutilisation
    saveFormPreferences({
      type: editingDispo.value.type,
      timeKind: editingDispo.value.timeKind,
      heure_debut: editingDispo.value.heure_debut,
      heure_fin: editingDispo.value.heure_fin,
      lieu: editingDispo.value.lieu,
      slots: editingDispo.value.slots
    })
    
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
/* Styles gérés par dispo-modal-center dans PlanningSemaine.vue */
</style>