<template>
  <va-modal
    v-model="isVisible"
    :hide-default-actions="true"
    :fullscreen="false"
    max-width="800px"
    no-padding
    @close="handleClose"
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
      :is-collaborator-view="true"
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
            <div v-if="formData.timeKind === 'custom'" class="custom-hours-full">
              <div class="hours-inputs-full">
                <!-- Heure de début -->
                <div class="custom-time-input-batch">
                  <label class="time-label-batch">Heure de début</label>
                  <div class="time-selects-batch">
                    <va-select
                      v-model="heureDebutHour"
                      :options="hourOptions"
                      placeholder="HH"
                      size="small"
                      class="hour-select-batch"
                      @update:model-value="updateHeureDebut"
                    />
                    <span class="time-separator-batch">:</span>
                    <va-select
                      v-model="heureDebutMinute"
                      :options="quarterOptions"
                      placeholder="MM"
                      size="small"
                      class="minute-select-batch"
                      @update:model-value="updateHeureDebut"
                    />
                  </div>
                </div>
                
                <!-- Heure de fin -->
                <div class="custom-time-input-batch">
                  <label class="time-label-batch">Heure de fin</label>
                  <div class="time-selects-batch">
                    <va-select
                      v-model="heureFinHour"
                      :options="hourOptions"
                      placeholder="HH"
                      size="small"
                      class="hour-select-batch"
                      :disabled="!formData.heureDebut"
                      @update:model-value="updateHeureFin"
                    />
                    <span class="time-separator-batch">:</span>
                    <va-select
                      v-model="heureFinMinute"
                      :options="quarterOptions"
                      placeholder="MM"
                      size="small"
                      class="minute-select-batch"
                      :disabled="!formData.heureDebut"
                      @update:model-value="updateHeureFin"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Alerte débordement overnight -->
              <div v-if="isOvernightSchedule" class="overnight-alert">
                <va-icon name="schedule" size="16px" />
                <div class="overnight-text">
                  <strong>Horaire de nuit détecté</strong>
                  <p>Cette plage horaire s'étend sur le lendemain. Une disponibilité sera automatiquement créée sur le jour suivant.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Actions -->
      <div class="actions">
        <va-button
          color="secondary"
          @click="handleClose"
        >
          Annuler
        </va-button>
        
        <va-button
          v-if="editingDisponibilite"
          color="danger"
          @click="handleDelete"
          :loading="saving"
        >
          Supprimer
        </va-button>
        
        <va-button
          color="primary"
          :loading="saving"
          :disabled="!isFormValid"
          @click="handleSave"
        >
          {{ editingDisponibilite ? 'Modifier' : 'Créer' }} la disponibilité
        </va-button>
      </div>
    </div>
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { getUserInitials, getUserColor } from '../services/avatarUtils'

// Interface pour le collaborateur
interface CollaborateurCollab {
  id: string
  nom: string
  prenom: string
  email?: string | null
  phone?: string | null
  metier?: string
  ville?: string | null
  color?: string | null
  tenantId?: string
}

// Interface pour la disponibilité
interface DisponibiliteData {
  id?: string
  date: string
  type: string
  timeKind: string
  heureDebut: string
  heureFin: string
  lieu?: string
  heure_debut?: string
  heure_fin?: string
}

// Props
interface Props {
  modelValue?: boolean
  collaborateur: CollaborateurCollab | null
  date: string
  editingDisponibilite?: DisponibiliteData | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  editingDisponibilite: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [data: DisponibiliteData]
  'delete': [id: string]
  'close': []
}>()

// State
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})
const saving = ref(false)
const { init: notify } = useToast()

// Form data
const formData = ref({
  type: 'disponible' as 'disponible' | 'indisponible',
  timeKind: 'full_day' as 'predefined' | 'custom' | 'full_day',
  heureDebut: '09:00',
  heureFin: '17:00'
})

// Options (sans mission - uniquement disponible/indisponible pour les collaborateurs)
const typeOptions = [
  { value: 'disponible' as const, label: 'Disponible', icon: 'check_circle' },
  { value: 'indisponible' as const, label: 'Indisponible', icon: 'cancel' }
]

const timeKindOptions = [
  { value: 'full_day' as const, label: 'Journée complète', icon: 'today' },
  { value: 'predefined' as const, label: 'Créneaux standards', icon: 'schedule' },
  { value: 'custom' as const, label: 'Horaires personnalisées', icon: 'edit' }
]

const quickTimeSlots = [
  { value: 'morning', label: 'Matin', debut: '08:00', fin: '12:00' },
  { value: 'lunch', label: 'Midi', debut: '12:00', fin: '14:00' },
  { value: 'afternoon', label: 'Après-midi', debut: '14:00', fin: '18:00' },
  { value: 'evening', label: 'Soirée', debut: '18:00', fin: '22:00' },
  { value: 'late_evening', label: 'Fin de soirée', debut: '22:00', fin: '02:00' },
  { value: 'night', label: 'Nuit', debut: '02:00', fin: '08:00' }
]

// Variables pour les selects d'heures/minutes
const heureDebutHour = ref('09')
const heureDebutMinute = ref('00')
const heureFinHour = ref('17')
const heureFinMinute = ref('00')

// Options pour les selects
const hourOptions = computed(() => {
  const options = []
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0')
    options.push({ text: hour, value: hour })
  }
  return options
})

const quarterOptions = [
  { text: '00', value: '00' },
  { text: '15', value: '15' },
  { text: '30', value: '30' },
  { text: '45', value: '45' }
]

// Méthodes pour synchroniser les selects avec formData
function updateHeureDebut() {
  if (heureDebutHour.value && heureDebutMinute.value) {
    formData.value.heureDebut = `${heureDebutHour.value}:${heureDebutMinute.value}`
  }
}

function updateHeureFin() {
  if (heureFinHour.value && heureFinMinute.value) {
    formData.value.heureFin = `${heureFinHour.value}:${heureFinMinute.value}`
  }
}

// Méthode pour initialiser les selects depuis formData
function initTimeSelects() {
  if (formData.value.heureDebut) {
    const [hour, minute] = formData.value.heureDebut.split(':')
    heureDebutHour.value = hour
    heureDebutMinute.value = minute
  }
  if (formData.value.heureFin) {
    const [hour, minute] = formData.value.heureFin.split(':')
    heureFinHour.value = hour
    heureFinMinute.value = minute
  }
}

// Computed
const collaborateurName = computed(() => {
  if (!props.collaborateur) return 'Collaborateur'
  return `${props.collaborateur.prenom} ${props.collaborateur.nom}`
})

const avatarColor = computed(() => {
  if (!props.collaborateur) return '#3f51b5'
  return getUserColor(props.collaborateur.id)
})

const avatarInitials = computed(() => {
  if (!props.collaborateur) return 'C'
  return getUserInitials({
    nom: props.collaborateur.nom,
    prenom: props.collaborateur.prenom
  })
})

const isOvernightSchedule = computed(() => {
  if (formData.value.timeKind !== 'custom') return false
  const [hDebut] = formData.value.heureDebut.split(':').map(Number)
  const [hFin] = formData.value.heureFin.split(':').map(Number)
  return hFin < hDebut || (hFin === hDebut && formData.value.heureFin < formData.value.heureDebut)
})

const isFormValid = computed(() => {
  if (!formData.value.type) return false
  if (formData.value.type === 'indisponible') return true
  if (!formData.value.timeKind) return false
  
  if (formData.value.timeKind === 'custom') {
    if (!formData.value.heureDebut || !formData.value.heureFin) return false
  }
  
  if (formData.value.timeKind === 'predefined') {
    // Vérifier qu'un créneau standard est sélectionné
    const isStandardSlotSelected = quickTimeSlots.some(slot => 
      formData.value.heureDebut === slot.debut && formData.value.heureFin === slot.fin
    )
    if (!isStandardSlotSelected) return false
  }
  
  return true
})

// Methods
const formatDateLong = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const setTimeKind = (kind: string) => {
  formData.value.timeKind = kind as any
  
  // Reset aux valeurs par défaut
  if (kind === 'full_day') {
    formData.value.heureDebut = '00:00'
    formData.value.heureFin = '23:59'
  } else if (kind === 'predefined') {
    // Reset pour forcer la sélection d'un créneau
    formData.value.heureDebut = ''
    formData.value.heureFin = ''
  } else if (kind === 'custom') {
    formData.value.heureDebut = '09:00'
    formData.value.heureFin = '17:00'
    initTimeSelects()
  }
}

const selectTimeSlot = (debut: string, fin: string) => {
  formData.value.heureDebut = debut
  formData.value.heureFin = fin
}

// Fonction utilitaire pour récupérer la valeur du slot sélectionné (pour compatibilité future)
// const getSelectedSlotValue = () => {
//   const slot = quickTimeSlots.find(s => 
//     s.debut === formData.value.heureDebut && s.fin === formData.value.heureFin
//   )
//   return slot?.value || 'custom'
// }

const handleClose = () => {
  isVisible.value = false
  emit('close')
}

const handleSave = async () => {
  if (!isFormValid.value) return
  
  saving.value = true
  
  try {
    const dispoData: DisponibiliteData = {
      id: props.editingDisponibilite?.id,
      date: props.date,
      type: formData.value.type === 'disponible' ? 'standard' : 'maintenance',
      timeKind: formData.value.timeKind === 'custom' ? 'fixed' : 
               formData.value.timeKind === 'full_day' ? 'flexible' : 'fixed',
      heureDebut: formData.value.timeKind === 'full_day' ? '' : formData.value.heureDebut,
      heureFin: formData.value.timeKind === 'full_day' ? '' : formData.value.heureFin
    }
    
    emit('save', dispoData)
    isVisible.value = false
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    notify({ message: 'Erreur lors de la sauvegarde', color: 'danger' })
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!props.editingDisponibilite?.id) return
  
  saving.value = true
  
  try {
    emit('delete', props.editingDisponibilite.id)
    isVisible.value = false
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    notify({ message: 'Erreur lors de la suppression', color: 'danger' })
  } finally {
    saving.value = false
  }
}

// Initialiser le formulaire quand la prop editingDisponibilite change
watch(() => props.editingDisponibilite, (dispo) => {
  console.log('editingDisponibilite changed:', dispo)
  
  if (dispo) {
    console.log('Setting form data for editing:', {
      type: dispo.type === 'standard' ? 'disponible' : 'indisponible',
      timeKind: !dispo.heureDebut && !dispo.heureFin ? 'full_day' : 'custom',
      heureDebut: dispo.heureDebut || '09:00',
      heureFin: dispo.heureFin || '17:00'
    })
    
    formData.value = {
      type: dispo.type === 'standard' ? 'disponible' : 'indisponible',
      timeKind: !dispo.heureDebut && !dispo.heureFin ? 'full_day' : 'custom',
      heureDebut: dispo.heureDebut || '09:00',
      heureFin: dispo.heureFin || '17:00'
    }
    
    // Initialiser les selects
    initTimeSelects()
  } else {
    console.log('Resetting form data for new entry')
    // Reset pour nouvel ajout
    formData.value = {
      type: 'disponible',
      timeKind: 'full_day',
      heureDebut: '09:00',
      heureFin: '17:00'
    }
    
    // Initialiser les selects
    initTimeSelects()
  }
}, { immediate: true })
</script>

<style scoped>
/* Design mobile-first vertical */
.batch-form-mobile {
  padding: 12px;
  max-height: none;
  transition: all 0.3s ease;
}

/* En-tête détaillé */
.batch-header-detailed {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.collaborateur-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.collaborateur-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
}

.collaborateur-info-detailed {
  flex: 1;
}

.collaborateur-name-large {
  font-size: 18px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 4px 0;
}

.collaborateur-meta-large {
  font-size: 14px;
  color: var(--va-color-text-secondary);
  margin: 0;
}

.dates-summary {
  border-top: 1px solid var(--va-color-border);
  padding-top: 16px;
}

.dates-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
}

/* Sections principales numérotées */
.form-section-primary {
  background: var(--va-color-background-element);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--va-color-border);
  transition: all 0.3s ease;
}

.section-title-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--va-primary);
}

/* Boutons de type pleine largeur */
.type-buttons-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-btn-full {
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
  width: 100%;
  border-radius: 4px;
  background: transparent;
  color: var(--va-primary);
  border: 1px solid var(--va-primary);
}

.type-btn-full[color="success"] {
  background: var(--va-success);
  color: white;
  border-color: var(--va-success);
}

.type-btn-full[color="light"] {
  background: transparent;
  color: var(--va-primary);
  border-color: var(--va-primary);
}

.type-btn-full[color="secondary"] {
  background: transparent;
  color: var(--va-primary);
  border-color: var(--va-primary);
}

/* Section détails avec hauteur fixe */
.form-section-details {
  background: var(--va-color-background-element);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--va-color-border);
  min-height: 180px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.time-details-container {
  height: 160px;
  overflow: visible;
  background: var(--va-color-background-secondary);
  border-radius: 6px;
  padding: 12px;
  transition: all 0.3s ease;
}

/* Créneaux pleine largeur */
.quick-slots-full {
  width: 100%;
}

.slots-grid-full {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  height: 100%;
}

.slot-option-full {
  border: 1px solid var(--va-primary);
  border-radius: 4px;
  padding: 12px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: transparent;
  text-align: center;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 12px;
  color: var(--va-primary);
}

.slot-option-full:hover {
  border-color: var(--va-success);
  background: var(--va-color-success-lighten5);
  transform: translateY(-1px);
  color: var(--va-success);
}

.slot-option-full.active {
  border-color: var(--va-success);
  background: var(--va-success);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

/* Heures personnalisées */
.custom-hours-full {
  width: 100%;
}

.hours-inputs-full {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.custom-time-input-batch {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-label-batch {
  font-size: 14px;
  font-weight: 500;
  color: var(--va-dark);
}

.time-selects-batch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hour-select-batch,
.minute-select-batch {
  flex: 1;
}

/* Fix z-index pour les dropdowns des selects d'heures dans la modale */
.hour-select-batch :deep(.va-select__dropdown),
.minute-select-batch :deep(.va-select__dropdown) {
  z-index: 9999 !important;
}

/* Fix global pour tous les selects dans cette modale */
.batch-form-mobile :deep(.va-select__dropdown) {
  z-index: 9999 !important;
}

.time-separator-batch {
  font-weight: bold;
  font-size: 16px;
  color: var(--va-dark);
  margin: 0 2px;
}

/* Alerte horaire overnight */
.overnight-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
}

.overnight-text {
  flex: 1;
}

.overnight-text strong {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

.overnight-text p {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}

/* Actions */
.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--va-color-border);
  margin-top: 8px;
}

.actions .va-button {
  min-width: 120px;
}

/* Transitions pour les sections dynamiques */
.section-enter-active, .section-leave-active {
  transition: all 0.3s ease;
  max-height: 300px;
  opacity: 1;
}

.section-enter-from, .section-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin: 0;
}

/* Transitions pour les changements de taille de modale */
.batch-form-mobile, 
.form-section-details,
.time-details-container,
.form-section-primary {
  transition: all 0.3s ease;
  overflow: hidden;
}
</style>
