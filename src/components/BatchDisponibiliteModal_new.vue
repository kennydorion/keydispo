<template>
  <va-modal
    v-model="isVisible"
    :title="modalTitle"
    size="large"
    @close="handleClose"
    class="batch-modal-optimized"
    :no-outside-dismiss="saving"
  >
    <div class="batch-form-compact">
      <!-- En-tête compact avec infos principales -->
      <div class="batch-header-compact">
        <div class="collaborateur-compact">
          <div class="collaborateur-avatar-small">
            {{ props.selectedCollaborateur?.prenom?.charAt(0) || '' }}{{ props.selectedCollaborateur?.nom?.charAt(0) || '' }}
          </div>
          <div class="collaborateur-info-compact">
            <div class="collaborateur-name-small">{{ collaborateurName }}</div>
            <div class="collaborateur-meta-small">{{ props.selectedCollaborateur?.metier || 'Collaborateur' }}</div>
          </div>
          <va-chip size="small" color="success" class="status-chip">
            {{ props.selectedDates.length }} jour{{ props.selectedDates.length > 1 ? 's' : '' }}
          </va-chip>
        </div>
      </div>

      <!-- Formulaire en 2 colonnes pour économiser l'espace -->
      <div class="form-grid">
        <!-- Colonne gauche : Type -->
        <div class="form-column">
          <h4 class="section-title-compact">
            <va-icon name="category" size="16px" />
            Type
          </h4>
          <div class="type-selector-compact">
            <div class="type-buttons-grid">
              <va-button 
                v-for="typeOption in typeOptions"
                :key="typeOption.value"
                :preset="formData.type === typeOption.value ? 'primary' : 'secondary'"
                size="small"
                @click="formData.type = typeOption.value as 'disponible' | 'indisponible' | 'mission'"
                class="type-btn-compact"
              >
                <va-icon :name="typeOption.icon" size="14px" />
                {{ typeOption.label }}
              </va-button>
            </div>
          </div>
        </div>

        <!-- Colonne droite : Horaires -->
        <div class="form-column">
          <h4 class="section-title-compact">
            <va-icon name="schedule" size="16px" />
            Horaires
          </h4>
          <div class="time-selector-compact">
            <div class="time-kind-buttons-grid">
              <va-button 
                v-for="kind in timeKindOptions"
                :key="kind.value"
                :preset="formData.timeKind === kind.value ? 'primary' : 'secondary'" 
                size="small" 
                @click="setTimeKind(kind.value)"
              >
                <va-icon :name="kind.icon" size="12px" />
                {{ kind.label }}
              </va-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section horaires détaillées -->
      <div v-if="formData.timeKind !== 'full-day'" class="time-details-compact">
        <!-- Créneaux prédéfinis -->
        <div v-if="filteredQuickTimeSlots.length > 0" class="quick-slots-compact">
          <div class="slots-grid">
            <div
              v-for="slot in filteredQuickTimeSlots"
              :key="slot.label"
              class="slot-option-compact"
              :class="{ active: isTimeSlotSelected(slot) }"
              @click="setTimeSlot(slot)"
            >
              <div class="slot-label">{{ slot.label }}</div>
              <div v-if="slot.debut && slot.fin" class="slot-time">{{ slot.debut }} - {{ slot.fin }}</div>
              <va-icon 
                v-if="isTimeSlotSelected(slot)"
                name="check_circle" 
                size="16px" 
                color="success"
                class="slot-check"
              />
            </div>
          </div>
        </div>

        <!-- Heures personnalisées pour 'range' -->
        <div v-if="formData.timeKind === 'range'" class="custom-hours-compact">
          <div class="hours-inputs">
            <va-input
              v-model="formData.heureDebut"
              label="Début"
              type="time"
              class="hour-input"
            />
            <va-input
              v-model="formData.heureFin"
              label="Fin"
              type="time"
              class="hour-input"
            />
          </div>
        </div>
      </div>

      <!-- Lieu de mission (si type mission) -->
      <div v-if="formData.type === 'mission'" class="lieu-section-compact">
        <h4 class="section-title-compact">
          <va-icon name="location_on" size="16px" />
          Lieu
        </h4>
        <LieuCombobox
          v-model="formData.lieu"
          :options="props.lieuxOptions"
          placeholder="Sélectionner ou saisir un lieu..."
          class="lieu-input-compact"
        />
      </div>

      <!-- Messages d'erreur -->
      <div v-if="Object.keys(errors).length > 0" class="errors-compact">
        <va-alert
          v-for="(error, key) in errors"
          :key="key"
          color="danger"
          border="left"
          class="error-alert"
        >
          {{ error }}
        </va-alert>
      </div>
    </div>

    <!-- Actions -->
    <template #footer>
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
          Créer {{ props.selectedDates.length }} disponibilité{{ props.selectedDates.length > 1 ? 's' : '' }}
        </va-button>
      </div>
    </template>
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Collaborateur, BatchSelection } from '../types/planning'
import LieuCombobox from './LieuCombobox.vue'

interface Props {
  modelValue: boolean
  selectedCells: string[]
  selectedCollaborateur: Collaborateur | null
  selectedDates: string[]
  lieuxOptions?: string[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'batch-created', data: BatchSelection): void
  (e: 'refresh-planning'): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedCells: () => [],
  selectedCollaborateur: null,
  selectedDates: () => [],
  lieuxOptions: () => []
})

const emit = defineEmits<Emits>()

// Reactive data
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const saving = ref(false)
const errors = ref<Record<string, string>>({})

const formData = ref({
  type: 'disponible' as 'disponible' | 'indisponible' | 'mission',
  timeKind: 'full-day' as 'full-day' | 'range' | 'slot',
  heureDebut: '',
  heureFin: '',
  lieu: ''
})

// Computed properties
const modalTitle = computed(() => {
  const count = props.selectedDates.length
  return `Créer ${count} disponibilité${count > 1 ? 's' : ''}`
})

const collaborateurName = computed(() => {
  if (!props.selectedCollaborateur) return 'Aucun collaborateur'
  return `${props.selectedCollaborateur.prenom} ${props.selectedCollaborateur.nom}`
})

const selectedDatesText = computed(() => {
  const count = props.selectedDates.length
  if (count === 0) return 'Aucune date'
  if (count === 1) return '1 jour sélectionné'
  return `${count} jours sélectionnés`
})

// Options
const typeOptions = [
  { 
    label: 'Disponible', 
    value: 'disponible', 
    icon: 'check_circle',
    description: 'Disponible pour une mission'
  },
  { 
    label: 'Mission', 
    value: 'mission', 
    icon: 'work',
    description: 'En mission sur un lieu'
  },
  { 
    label: 'Indisponible', 
    value: 'indisponible', 
    icon: 'cancel',
    description: 'Congés, formation, etc.'
  }
]

const timeKindOptions = [
  { label: 'Journée', value: 'full-day' as const, icon: 'wb_sunny' },
  { label: 'Heures', value: 'range' as const, icon: 'schedule' },
  { label: 'Créneaux', value: 'slot' as const, icon: 'view_module' }
]

// Quick time slots avec timeKind
const quickTimeSlots = [
  { label: 'Journée complète', timeKind: 'full-day' as const },
  { label: 'Matin', timeKind: 'slot' as const, debut: '09:00', fin: '12:00' },
  { label: 'Midi', timeKind: 'slot' as const, debut: '12:00', fin: '14:00' },
  { label: 'Après-midi', timeKind: 'slot' as const, debut: '14:00', fin: '18:00' },
  { label: 'Soir', timeKind: 'slot' as const, debut: '18:00', fin: '22:00' },
  { label: 'Heures personnalisées', timeKind: 'range' as const, debut: '09:00', fin: '17:00' }
]

// Créneaux filtrés selon le timeKind sélectionné
const filteredQuickTimeSlots = computed(() => {
  if (formData.value.timeKind === 'range') {
    return quickTimeSlots.filter(slot => slot.timeKind === 'range')
  } else if (formData.value.timeKind === 'slot') {
    return quickTimeSlots.filter(slot => slot.timeKind === 'slot')
  }
  return []
})

const canSave = computed(() => {
  const hasCollaborateur = !!props.selectedCollaborateur
  const hasDates = props.selectedDates.length > 0
  const hasValidTime = formData.value.timeKind === 'full-day' || 
                       (formData.value.timeKind === 'range' && formData.value.heureDebut && formData.value.heureFin) ||
                       (formData.value.timeKind === 'slot' && formData.value.heureDebut && formData.value.heureFin)
  const hasValidLieu = formData.value.type !== 'mission' || formData.value.lieu
  
  return hasCollaborateur && hasDates && hasValidTime && hasValidLieu
})

// Methods
const isTimeSlotSelected = (slot: typeof quickTimeSlots[0]): boolean => {
  if (slot.timeKind === 'full-day') {
    return formData.value.timeKind === 'full-day'
  }
  // Pour les créneaux 'slot' et 'range', vérifier les heures
  return (formData.value.timeKind === 'range' || formData.value.timeKind === 'slot') && 
         formData.value.heureDebut === slot.debut && 
         formData.value.heureFin === slot.fin
}

// Fonction pour changer le type de temps
const setTimeKind = (timeKind: 'full-day' | 'range' | 'slot') => {
  formData.value.timeKind = timeKind
  if (timeKind === 'full-day') {
    formData.value.heureDebut = ''
    formData.value.heureFin = ''
  } else if (timeKind === 'range') {
    // Garder les heures existantes ou mettre des valeurs par défaut
    if (!formData.value.heureDebut) formData.value.heureDebut = '09:00'
    if (!formData.value.heureFin) formData.value.heureFin = '17:00'
  }
}

const setTimeSlot = (slot: typeof quickTimeSlots[0]) => {
  formData.value.timeKind = slot.timeKind
  if (slot.timeKind === 'full-day') {
    formData.value.heureDebut = ''
    formData.value.heureFin = ''
  } else if ((slot.timeKind === 'range' || slot.timeKind === 'slot') && slot.debut && slot.fin) {
    formData.value.heureDebut = slot.debut
    formData.value.heureFin = slot.fin
  }
}

const createBatchDisponibilites = async () => {
  try {
    saving.value = true
    errors.value = {}

    // Validation
    if (!props.selectedCollaborateur) {
      errors.value.collaborateur = 'Aucun collaborateur sélectionné'
      return
    }

    if (props.selectedDates.length === 0) {
      errors.value.dates = 'Aucune date sélectionnée'
      return
    }

    if (formData.value.timeKind === 'range' && (!formData.value.heureDebut || !formData.value.heureFin)) {
      errors.value.heures = 'Heures de début et fin requises'
      return
    }

    if (formData.value.timeKind === 'slot' && (!formData.value.heureDebut || !formData.value.heureFin)) {
      errors.value.heures = 'Veuillez sélectionner un créneau'
      return
    }

    // Import Firebase functions
    const { collection, doc, writeBatch, serverTimestamp } = await import('firebase/firestore')
    const { db } = await import('../firebase')

    const batch = writeBatch(db)
    const createdDispos: any[] = []

    // Créer une disponibilité pour chaque date sélectionnée
    for (const date of props.selectedDates) {
      const newRef = doc(collection(db, 'dispos'))
      
      const disponibilite = {
        id: newRef.id,
        tenantId: 'keydispo', // TODO: utiliser le vrai tenantId
        collaborateurId: props.selectedCollaborateur.id,
        nom: props.selectedCollaborateur.nom,
        prenom: props.selectedCollaborateur.prenom,
        metier: props.selectedCollaborateur.metier,
        phone: props.selectedCollaborateur.phone || '',
        email: props.selectedCollaborateur.email || '',
        ville: props.selectedCollaborateur.ville || '',
        date: date,
        lieu: formData.value.lieu || '',
        heure_debut: formData.value.timeKind === 'full-day' ? '' : formData.value.heureDebut,
        heure_fin: formData.value.timeKind === 'full-day' ? '' : formData.value.heureFin,
        type: formData.value.type,
        timeKind: formData.value.timeKind,
        isFullDay: formData.value.timeKind === 'full-day',
        slots: formData.value.timeKind === 'slot' ? [getSelectedSlotType()] : [],
        updatedAt: serverTimestamp(),
        updatedBy: 'batch-creation',
        version: 1
      }

      batch.set(newRef, disponibilite)
      createdDispos.push({ ...disponibilite, updatedAt: new Date() })
    }

    // Exécuter le batch
    await batch.commit()
    console.log(`✅ ${createdDispos.length} disponibilités sauvées en Firebase`)

    // Émettre les nouvelles données pour actualiser le planning
    emit('batch-created', {
      collaborateurId: props.selectedCollaborateur.id,
      dates: props.selectedDates,
      type: formData.value.type,
      heureDebut: formData.value.timeKind === 'full-day' ? '' : formData.value.heureDebut,
      heureFin: formData.value.timeKind === 'full-day' ? '' : formData.value.heureFin,
      lieu: formData.value.lieu || ''
    })

    // Attendre un petit délai pour s'assurer que Firebase a propagé les changements
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Demander l'actualisation du planning
    console.log('🔄 Émission événement refresh-planning...')
    emit('refresh-planning')

    console.log(`✅ ${createdDispos.length} disponibilités créées avec succès`)
    handleClose()
  } catch (error) {
    console.error('❌ Erreur création batch:', error)
    errors.value.general = 'Erreur lors de la création des disponibilités'
  } finally {
    saving.value = false
  }
}

// Fonction helper pour obtenir le type de slot sélectionné
const getSelectedSlotType = () => {
  const slot = quickTimeSlots.find(s => 
    s.debut === formData.value.heureDebut && s.fin === formData.value.heureFin
  )
  
  if (slot?.label === 'Matin') return 'morning'
  if (slot?.label === 'Midi') return 'midday'
  if (slot?.label === 'Après-midi') return 'afternoon'
  if (slot?.label === 'Soir') return 'evening'
  return 'custom'
}

const handleClose = () => {
  formData.value = {
    type: 'disponible',
    timeKind: 'full-day',
    heureDebut: '09:00',
    heureFin: '17:00',
    lieu: ''
  }
  errors.value = {}
  isVisible.value = false
}
</script>

<style scoped>
/* Design optimisé et compact */
.batch-form-compact {
  padding: 0;
  max-height: 70vh;
  overflow-y: auto;
}

/* En-tête compact */
.batch-header-compact {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}

.collaborateur-compact {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collaborateur-avatar-small {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--va-color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.collaborateur-info-compact {
  flex: 1;
}

.collaborateur-name-small {
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 2px 0;
}

.collaborateur-meta-small {
  font-size: 12px;
  color: var(--va-color-text-secondary);
  margin: 0;
}

.status-chip {
  flex-shrink: 0;
}

/* Grille de formulaire */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-column {
  min-width: 0; /* Permet la réduction */
}

.section-title-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
}

/* Boutons de type compacts */
.type-buttons-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.type-btn-compact {
  justify-content: flex-start;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
}

/* Boutons d'horaires compacts */
.time-kind-buttons-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

/* Section horaires détaillées */
.time-details-compact {
  margin-bottom: 16px;
}

.quick-slots-compact {
  margin-bottom: 12px;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.slot-option-compact {
  border: 2px solid var(--va-color-border);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: var(--va-color-background-element);
  text-align: center;
}

.slot-option-compact:hover {
  border-color: var(--va-color-primary);
  background: var(--va-color-primary-lighten5);
}

.slot-option-compact.active {
  border-color: var(--va-color-success);
  background: var(--va-color-success-lighten5);
}

.slot-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin-bottom: 2px;
}

.slot-time {
  font-size: 11px;
  color: var(--va-color-text-secondary);
}

.slot-check {
  position: absolute;
  top: 4px;
  right: 4px;
}

/* Heures personnalisées */
.custom-hours-compact {
  margin-top: 12px;
}

.hours-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.hour-input {
  font-size: 14px;
}

/* Lieu compact */
.lieu-section-compact {
  margin-bottom: 16px;
}

.lieu-input-compact {
  width: 100%;
}

/* Erreurs compactes */
.errors-compact {
  margin-bottom: 16px;
}

.error-alert {
  margin-bottom: 8px;
  font-size: 12px;
}

/* Actions du modal */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0 0 0;
}

/* Responsive */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .slots-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
  
  .hours-inputs {
    grid-template-columns: 1fr;
  }
}

/* Amélioration de l'overlay du modal */
:deep(.batch-modal-optimized .va-modal__container) {
  max-width: 600px;
}

:deep(.batch-modal-optimized .va-modal__dialog) {
  margin: 20px;
}
</style>
