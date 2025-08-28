<template>
  <va-modal
    v-model="isVisible"
    :title="modalTitle"
    size="large"
    :z-index="2147483647"
    overlay-z-index="2147483646"
    @close="handleClose"
    class="batch-modal"
    :no-outside-dismiss="saving"
  >
    <div class    </div>
  </va-modal>
</template> <!-- En-tête avec résumé -->
      <div class="batch-header">
        <div class="batch-summary">
          <div class="summary-item">
            <va-icon name="grid_on" size="18px" />
            <span><strong>{{ selectedCells.length }}</strong> cellules sélectionnées</span>
          </div>
          <div class="summary-item" v-if="selectedCollaborateur">
            <va-icon name="person" size="18px" />
            <span>{{ getCollaborateurName(selectedCollaborateur) }}</span>
          </div>
          <div class="summary-item" v-if="selectedDates.length > 0">
            <va-icon name="date_range" size="18px" />
            <span><strong>{{ selectedDates.length }}</strong> dates</span>
          </div>
        </div>
      </div>
      <!-- Sélection collaborateur améliorée -->
      <div class="form-section">
        <h3 class="section-title">
          <va-icon name="person" size="20px" />
          Collaborateur
        </h3>
        <va-select
          v-model="selectedCollaborateur"
          :options="collaborateurs"
          text-by="fullName"
          value-by="id"
          placeholder="Sélectionner un collaborateur..."
          class="collaborateur-select"
          searchable
          :error="!!errors.collaborateur"
          :error-messages="[errors.collaborateur]"
        >
          <template #option="{ option }">
            <div class="collaborateur-option">
              <div class="collaborateur-avatar">
                {{ option.prenom.charAt(0) }}{{ option.nom.charAt(0) }}
              </div>
              <div class="collaborateur-info">
                <div class="collaborateur-name">{{ option.fullName }}</div>
                <div class="collaborateur-meta">{{ option.metier || 'Collaborateur' }}</div>
              </div>
            </div>
          </template>
        </va-select>
      </div>

      <!-- Type de disponibilité amélioré -->
      <div class="form-section">
        <h3 class="section-title">
          <va-icon name="event_available" size="20px" />
          Type de disponibilité
        </h3>
        <div class="type-cards">
          <div 
            v-for="typeOption in typeOptions"
            :key="typeOption.value"
            class="type-card"
            :class="{ active: formData.type === typeOption.value }"
            @click="formData.type = typeOption.value"
          >
            <va-icon :name="typeOption.icon" size="24px" class="type-icon" />
            <div class="type-content">
              <h4>{{ typeOption.label }}</h4>
              <p>{{ typeOption.description }}</p>
            </div>
            <va-radio
              v-model="formData.type"
              :option="typeOption.value"
              class="type-radio"
            />
          </div>
        </div>
      </div>

      <!-- Dates sélectionnées améliorées -->
      <div class="form-section">
        <h3 class="section-title">
          <va-icon name="date_range" size="20px" />
          Dates sélectionnées
          <va-chip size="small" color="primary">{{ selectedDates.length }}</va-chip>
        </h3>
        <div class="selected-dates-container">
          <div class="selected-dates">
            <va-chip
              v-for="date in selectedDates" 
              :key="date"
              closeable
              @close="removeDate(date)"
              class="date-chip"
              color="info"
            >
              <va-icon name="calendar_today" size="14px" />
              {{ formatDate(date) }}
            </va-chip>
          </div>
          <div class="date-picker-container">
            <va-date-input
              v-model="newDate"
              label="Ajouter une date"
              placeholder="Cliquez pour sélectionner"
              @update:model-value="addDate"
              class="date-picker"
            />
          </div>
        </div>
      </div>

      <!-- Créneaux horaires améliorés -->
      <div class="form-section">
        <h3 class="section-title">
          <va-icon name="schedule" size="20px" />
          Créneaux horaires
        </h3>
        
        <!-- Créneaux prédéfinis -->
        <div class="quick-time-slots">
          <h4>Créneaux rapides :</h4>
          <div class="quick-slots">
            <va-button
              v-for="slot in quickTimeSlots"
              :key="slot.label"
              size="small"
              :preset="isTimeSlotSelected(slot) ? 'primary' : 'secondary'"
              @click="setTimeSlot(slot.debut, slot.fin)"
              class="quick-slot-btn"
            >
              <va-icon name="schedule" size="14px" />
              {{ slot.label }}
            </va-button>
          </div>
        </div>
        
        <div class="time-grid">
          <div class="time-input-group">
            <va-time-input
              v-model="formData.heureDebut"
              label="Heure de début"
              placeholder="09:00"
              :error="!!errors.heureDebut"
              :error-messages="[errors.heureDebut]"
              clearable
            />
          </div>
          <div class="time-separator">
            <va-icon name="arrow_forward" size="18px" />
          </div>
          <div class="time-input-group">
            <va-time-input
              v-model="formData.heureFin"
              label="Heure de fin"
              placeholder="17:00"
              :error="!!errors.heureFin"
              :error-messages="[errors.heureFin]"
              clearable
            />
          </div>
        </div>
      </div>

      <!-- Lieu de mission amélioré -->
      <div v-if="formData.type === 'mission'" class="form-section">
        <h3 class="section-title">
          <va-icon name="location_on" size="20px" />
          Lieu de mission
        </h3>
        <va-input
          v-model="formData.lieu"
          label="Adresse ou nom du lieu"
          placeholder="Ex: Paris 8ème, Client ABC, Télétravail..."
          :error="!!errors.lieu"
          :error-messages="[errors.lieu]"
          clearable
        >
          <template #prependInner>
            <va-icon name="place" size="18px" />
          </template>
        </va-input>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <va-button
          preset="secondary"
          @click="handleClose"
          :disabled="saving"
        >
          Annuler
        </va-button>
        <va-button
          preset="primary"
          @click="createBatchDisponibilites"
          :loading="saving"
          :disabled="!canSave"
        >
          <va-icon name="save" size="16px" />
          Créer {{ selectedDates.length }} disponibilité{{ selectedDates.length > 1 ? 's' : '' }}
        </va-button>
      </div>
        <va-input
          v-model="formData.lieu"
          label="Lieu"
          placeholder="Adresse ou nom du lieu"
          :error="!!errors.lieu"
          :error-messages="[errors.lieu]"
        />
      </div>

      <!-- Récapitulatif -->
      <div class="form-section summary-section">
        <h3 class="section-title">
          <i class="material-icons">summarize</i>
          Récapitulatif
        </h3>
        <div class="summary-content">
          <div class="summary-item">
            <strong>Collaborateur :</strong> 
            {{ selectedCollaborateurData?.fullName || 'Non sélectionné' }}
          </div>
          <div class="summary-item">
            <strong>Type :</strong> 
            <span :class="`type-badge ${formData.type}`">{{ formatType(formData.type) }}</span>
          </div>
          <div class="summary-item">
            <strong>Horaires :</strong> 
            {{ formData.heureDebut || '--:--' }} - {{ formData.heureFin || '--:--' }}
          </div>
          <div v-if="formData.lieu" class="summary-item">
            <strong>Lieu :</strong> {{ formData.lieu }}
          </div>
          <div class="summary-item">
            <strong>Nombre de jours :</strong> {{ selectedDates.length }}
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <va-button color="secondary" @click="handleClose">
          Annuler
        </va-button>
        <va-button 
          color="primary" 
          @click="handleSave"
          :loading="saving"
          :disabled="!canSave"
        >
          {{ saveButtonText }}
        </va-button>
      </div>
    </template>
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import { AuthService } from '../services/auth'
import type { Collaborateur, BatchSelection } from '../types/planning'
import { CRENEAUX_QUART_HEURE } from '../types/planning'

interface Props {
  modelValue: boolean
  preSelectedDates?: string[]
  preSelectedCollaborateur?: Collaborateur | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'batch-created', data: BatchSelection): void
}

const props = withDefaults(defineProps<Props>(), {
  preSelectedDates: () => [],
  preSelectedCollaborateur: null
})

const emit = defineEmits<Emits>()

// Désactivé temporairement pour éviter les erreurs de permission
// const planningService = PlanningInteractionService.getInstance()

// Reactive data
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const collaborateurs = ref<(Collaborateur & { fullName: string })[]>([])
const selectedCollaborateur = ref<string>('')
const selectedDates = ref<string[]>([])
const newDate = ref<Date | null>(null)
const saving = ref(false)

const formData = ref({
  type: 'disponible' as 'disponible' | 'indisponible' | 'mission',
  heureDebut: '09:00',
  heureFin: '17:00',
  lieu: ''
})

const errors = ref<Record<string, string>>({})

// Computed properties
const modalTitle = computed(() => {
  const count = selectedDates.value.length
  return count > 0 
    ? `Ajouter des disponibilités (${count} jour${count > 1 ? 's' : ''})`
    : 'Ajouter des disponibilités'
})

const selectedCollaborateurData = computed(() => {
  return collaborateurs.value.find(c => c.id === selectedCollaborateur.value)
})

const availableTimeSlots = computed(() => {
  return CRENEAUX_QUART_HEURE
})

const quickTimeSlots = [
  { label: '9h-17h', debut: '09:00', fin: '17:00' },
  { label: '8h-16h', debut: '08:00', fin: '16:00' },
  { label: '10h-18h', debut: '10:00', fin: '18:00' },
  { label: 'Matin (9h-12h)', debut: '09:00', fin: '12:00' },
  { label: 'Après-midi (14h-17h)', debut: '14:00', fin: '17:00' },
  { label: 'Journée complète (8h-18h)', debut: '08:00', fin: '18:00' }
]

const canSave = computed(() => {
  return selectedCollaborateur.value && 
         selectedDates.value.length > 0 && 
         formData.value.heureDebut && 
         formData.value.heureFin &&
         (formData.value.type !== 'mission' || formData.value.lieu)
})

const saveButtonText = computed(() => {
  const count = selectedDates.value.length
  return `Créer ${count} disponibilité${count > 1 ? 's' : ''}`
})

// Watchers
watch(() => props.preSelectedDates, (newDates) => {
  if (newDates.length > 0) {
    selectedDates.value = [...newDates]
  }
}, { immediate: true })

watch(() => props.preSelectedCollaborateur, (newCollab) => {
  if (newCollab) {
    selectedCollaborateur.value = newCollab.id
  }
}, { immediate: true })

// Methods
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  })
}

const formatType = (type: string): string => {
  const types = {
    disponible: 'Disponible',
    indisponible: 'Indisponible',
    mission: 'Mission'
  }
  return types[type as keyof typeof types] || type
}

const addDate = (date: Date | null) => {
  if (!date) return
  
  const dateStr = date.toISOString().split('T')[0]
  if (!selectedDates.value.includes(dateStr)) {
    selectedDates.value.push(dateStr)
    selectedDates.value.sort()
  }
  newDate.value = null
}

const removeDate = (dateStr: string) => {
  const index = selectedDates.value.indexOf(dateStr)
  if (index > -1) {
    selectedDates.value.splice(index, 1)
  }
}

const setTimeSlot = (debut: string, fin: string) => {
  formData.value.heureDebut = debut
  formData.value.heureFin = fin
}

const validateForm = (): boolean => {
  errors.value = {}
  
  if (!selectedCollaborateur.value) {
    errors.value.collaborateur = 'Veuillez sélectionner un collaborateur'
  }
  
  if (!formData.value.heureDebut) {
    errors.value.heureDebut = 'Heure de début requise'
  }
  
  if (!formData.value.heureFin) {
    errors.value.heureFin = 'Heure de fin requise'
  }
  
  if (formData.value.heureDebut && formData.value.heureFin) {
    const debut = formData.value.heureDebut.split(':').map(Number)
    const fin = formData.value.heureFin.split(':').map(Number)
    const debutMinutes = debut[0] * 60 + debut[1]
    const finMinutes = fin[0] * 60 + fin[1]
    
    if (debutMinutes >= finMinutes) {
      errors.value.heureFin = 'L\'heure de fin doit être après l\'heure de début'
    }
  }
  
  if (formData.value.type === 'mission' && !formData.value.lieu.trim()) {
    errors.value.lieu = 'Le lieu est requis pour une mission'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSave = async () => {
  if (!validateForm()) return
  
  saving.value = true
  try {    
    const batchData: BatchSelection = {
      dates: selectedDates.value,
      collaborateurId: selectedCollaborateur.value,
      type: formData.value.type,
      heureDebut: formData.value.heureDebut,
      heureFin: formData.value.heureFin,
      lieu: formData.value.lieu
    }
    
    // Émissions directes vers le parent au lieu d'utiliser le service
    emit('batch-created', batchData)
    handleClose()
  } catch (error) {
    console.error('Erreur création batch:', error)
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  selectedDates.value = []
  selectedCollaborateur.value = ''
  formData.value = {
    type: 'disponible',
    heureDebut: '09:00',
    heureFin: '17:00',
    lieu: ''
  }
  errors.value = {}
  isVisible.value = false
}

const loadCollaborateurs = async () => {
  try {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const collabRef = collection(db, `tenants/${tenantId}/collaborateurs`)
    const snapshot = await getDocs(collabRef)
    
    collaborateurs.value = snapshot.docs.map(doc => {
      const data = doc.data() as Collaborateur
      return {
        ...data,
        id: doc.id,
        fullName: `${data.prenom} ${data.nom}`
      }
    }).sort((a, b) => a.fullName.localeCompare(b.fullName))
  } catch (error) {
    console.error('Erreur chargement collaborateurs:', error)
  }
}

// Lifecycle
watch(isVisible, (visible) => {
  if (visible) {
    loadCollaborateurs()
  }
})
</script>

<style scoped>
.batch-form {
  padding: 8px 0;
}

.form-section {
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--va-text-primary);
  margin: 0 0 16px 0;
}

.collaborateur-select {
  width: 100%;
}

.type-options {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.type-option {
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid var(--va-background-border);
  transition: all 0.2s;
}

.type-option.disponible:has(input:checked) {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10B981;
}

.type-option.indisponible:has(input:checked) {
  background: rgba(239, 68, 68, 0.1);
  border-color: #EF4444;
}

.type-option.mission:has(input:checked) {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3B82F6;
}

.selected-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  min-height: 40px;
  padding: 12px;
  background: var(--va-background-secondary);
  border-radius: 8px;
  border: 1px dashed var(--va-background-border);
}

.date-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--va-primary);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
}

.remove-date {
  color: white !important;
  opacity: 0.8;
}

.remove-date:hover {
  opacity: 1;
}

.date-picker-container {
  max-width: 300px;
}

.time-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.quick-time-slots {
  margin-top: 16px;
}

.quick-time-slots h4 {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  color: var(--va-text-secondary);
}

.quick-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-slot-btn {
  font-size: 0.8rem !important;
}

.summary-section {
  background: var(--va-background-secondary);
  padding: 20px;
  border-radius: 12px;
  border-left: 4px solid var(--va-primary);
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.type-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.type-badge.disponible {
  background: rgba(16, 185, 129, 0.2);
  color: #10B981;
}

.type-badge.indisponible {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
}

.type-badge.mission {
  background: rgba(59, 130, 246, 0.2);
  color: #3B82F6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .time-grid {
    grid-template-columns: 1fr;
  }
  
  .type-options {
    flex-direction: column;
    gap: 12px;
  }
  
  .quick-slots {
    flex-direction: column;
  }
  
  .selected-dates {
    justify-content: center;
  }
  
  .summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
