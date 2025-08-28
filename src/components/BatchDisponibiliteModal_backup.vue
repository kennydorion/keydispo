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
            <va-button-group
              v-model="formData.type"
              class="type-buttons"
            >
              <va-button 
                v-for="typeOption in typeOptions"
                :key="typeOption.value"
                :value="typeOption.value"
                :preset="formData.type === typeOption.value ? 'primary' : 'secondary'"
                size="small"
                @click="formData.type = typeOption.value as 'disponible' | 'indisponible' | 'mission'"
                class="type-btn-compact"
              >
                <va-icon :name="typeOption.icon" size="14px" />
                {{ typeOption.label }}
              </va-button>
            </va-button-group>
          </div>
        </div>

        <!-- Colonne droite : Horaires -->
        <div class="form-column">
          <h4 class="section-title-compact">
            <va-icon name="schedule" size="16px" />
            Horaires
          </h4>
          <div class="time-selector-compact">
            <va-button-group class="time-kind-buttons">
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
            </va-button-group>
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
            <va-time-input
              v-model="formData.heureDebut"
              label="Début"
              format="24hr"
              class="hour-input"
            />
            <va-time-input
              v-model="formData.heureFin"
              label="Fin"
              format="24hr"
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
                class="preset-btn"
              >
                {{ slot.label }}
              </va-button>
            </div>
            <!-- Champs horaires -->
            <div class="time-inputs-row">
              <va-input
                v-model="formData.heureDebut"
                label="De"
                type="time"
                class="time-input-compact"
              />
              <va-icon name="arrow_forward" size="16px" class="time-separator" />
              <va-input
                v-model="formData.heureFin"
                label="À"
                type="time"
                class="time-input-compact"
              />
            </div>
          </div>

          <!-- Créneaux prédéfinis -->
          <div v-else-if="formData.timeKind === 'slot'" class="slots-config">
            <div class="slots-grid">
              <div
                v-for="slot in filteredQuickTimeSlots"
                :key="slot.label"
                class="slot-option"
                :class="{ active: isTimeSlotSelected(slot) }"
                @click="setTimeSlot(slot)"
              >
                <div class="slot-content">
                  <div class="slot-name">{{ slot.label }}</div>
                  <div class="slot-hours">{{ slot.debut }} - {{ slot.fin }}</div>
                </div>
                <div v-if="isTimeSlotSelected(slot)" class="slot-check">
                  <va-icon name="check_circle" size="20px" color="success" />
                </div>
              </div>
            </div>
            <!-- Affichage du créneau sélectionné -->
            <div v-if="formData.timeKind === 'slot' && formData.heureDebut && formData.heureFin" class="selected-slot-display">
              <va-alert color="success" border="left" class="slot-alert">
                <div class="selected-slot-info">
                  <va-icon name="check_circle" size="18px" />
                  <span>Créneau sélectionné : <strong>{{ getSelectedSlotName() }}</strong> ({{ formData.heureDebut }} - {{ formData.heureFin }})</span>
                </div>
              </va-alert>
            </div>
          </div>
        </div>
      </div>

      <!-- Lieu de mission amélioré -->
      <div v-if="formData.type === 'mission'" class="form-section">
        <h3 class="section-title">
          <va-icon name="location_on" size="20px" />
          Lieu de mission
        </h3>
        <LieuCombobox
          v-model="formData.lieu"
          :options="props.lieuxOptions"
          label="Adresse ou nom du lieu"
          placeholder="Ex: Paris 8ème, Client ABC, Télétravail..."
          :error="!!errors.lieu"
          :error-messages="[errors.lieu]"
        />
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
          Créer {{ props.selectedDates.length }} disponibilité{{ props.selectedDates.length > 1 ? 's' : '' }}
        </va-button>
      </div>
    </div>
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

const formData = ref({
  type: 'disponible' as 'disponible' | 'indisponible' | 'mission',
  timeKind: 'full-day' as 'full-day' | 'range' | 'slot',
  heureDebut: '09:00',
  heureFin: '17:00',
  lieu: ''
})

const errors = ref<Record<string, string>>({})

// Options
const typeOptions = [
  {
    value: 'disponible',
    label: 'Disponible',
    description: 'Marquer comme disponible pour des missions',
    icon: 'check_circle'
  },
  {
    value: 'indisponible',
    label: 'Indisponible',
    description: 'Marquer comme indisponible (congés, formation...)',
    icon: 'cancel'
  },
  {
    value: 'mission',
    label: 'Mission',
    description: 'Assigner une mission spécifique',
    icon: 'work'
  }
]

const timeKindOptions = [
  { value: 'full-day' as const, label: 'Journée', icon: 'wb_sunny' },
  { value: 'range' as const, label: 'Heures', icon: 'schedule' },
  { value: 'slot' as const, label: 'Créneaux', icon: 'view_module' }
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

// Computed properties
const modalTitle = computed(() => {
  console.log('🔍 Modal debug:', {
    selectedCells: props.selectedCells,
    selectedCollaborateur: props.selectedCollaborateur,
    selectedDates: props.selectedDates
  })
  return `Création par lot - ${props.selectedCells.length} cellules`
})

const collaborateurName = computed(() => {
  return props.selectedCollaborateur 
    ? `${props.selectedCollaborateur.prenom} ${props.selectedCollaborateur.nom}`
    : 'Aucun collaborateur'
})

const selectedDatesText = computed(() => {
  if (props.selectedDates.length === 0) return 'Aucune date'
  if (props.selectedDates.length === 1) {
    const date = new Date(props.selectedDates[0])
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
  return `${props.selectedDates.length} dates`
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

// Fonction pour obtenir le nom du créneau sélectionné
const getSelectedSlotName = () => {
  const selectedSlot = quickTimeSlots.find(slot => 
    slot.debut === formData.value.heureDebut && slot.fin === formData.value.heureFin
  )
  return selectedSlot?.label || 'Créneau personnalisé'
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
.batch-form {
  padding: 8px 0;
  max-height: 80vh;
  overflow-y: auto;
}

/* Styles globaux uniformisés */
.form-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--va-color-text-primary);
}

/* Collaborateur - design moderne uniforme */
.collaborateur-card-modern {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid var(--va-color-border);
  border-radius: 12px;
  background: var(--va-color-background-element);
  transition: all 0.3s ease;
}

.collaborateur-card-modern:hover {
  border-color: var(--va-color-primary-lighten2);
  background: var(--va-color-primary-lighten5);
}

.collaborateur-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--va-color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.collaborateur-info {
  flex: 1;
}

.collaborateur-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 4px 0;
}

.collaborateur-meta {
  font-size: 14px;
  color: var(--va-color-text-secondary);
  margin: 0;
}

.collaborateur-status {
  flex-shrink: 0;
}

/* Fond personnalisé pour remplacer l'overlay supprimé */
:deep(.batch-modal .va-modal__container)::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: -1;
  pointer-events: none;
}

.batch-header {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.batch-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--va-text-primary);
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

.collaborateur-display {
  width: 100%;
}

.collaborateur-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid var(--va-success);
  border-radius: 12px;
  background: rgba(var(--va-success-rgb), 0.05);
}

.collaborateur-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.collaborateur-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--va-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.collaborateur-info {
  flex: 1;
}

.collaborateur-badge {
  margin-left: auto;
}

.collaborateur-name {
  font-weight: 500;
  color: var(--va-text-primary);
}

.collaborateur-meta {
  font-size: 12px;
  color: var(--va-text-secondary);
}

.type-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.type-card {
  border: 2px solid var(--va-background-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: var(--va-background-secondary);
}

.type-card:hover {
  border-color: var(--va-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.type-card.active {
  border-color: var(--va-primary);
  background: rgba(var(--va-primary-rgb), 0.05);
}

.type-icon {
  margin-bottom: 8px;
  color: var(--va-primary);
}

.type-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--va-text-primary);
}

.type-content p {
  margin: 0;
  font-size: 12px;
  color: var(--va-text-secondary);
  line-height: 1.4;
}

.type-radio {
  position: absolute;
  top: 12px;
  right: 12px;
}

.selected-dates-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selected-dates-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selected-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 40px;
  padding: 8px;
  border: 1px dashed var(--va-background-border);
  border-radius: 8px;
  align-items: center;
}

.dates-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--va-background-secondary);
  border-radius: 8px;
  font-size: 13px;
  color: var(--va-text-secondary);
  border-left: 3px solid var(--va-info);
}

.date-chip {
  display: flex;
  align-items: center;
  gap: 4px;
}

.date-picker {
  max-width: 200px;
}

/* Type de disponibilité - design original */
.type-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.type-card {
  position: relative;
  padding: 20px;
  border: 2px solid var(--va-color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--va-color-background-element);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.type-card:hover {
  border-color: var(--va-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.type-card.active {
  border-color: var(--va-color-primary);
  background: var(--va-color-primary-lighten5);
  box-shadow: 0 4px 12px rgba(var(--va-color-primary-rgb), 0.2);
}

.type-icon {
  color: var(--va-color-text-secondary);
  transition: color 0.3s ease;
}

.type-card.active .type-icon {
  color: var(--va-color-primary);
}

.type-content {
  flex: 1;
}

.type-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--va-color-text-primary);
}

.type-content p {
  margin: 0;
  font-size: 14px;
  color: var(--va-color-text-secondary);
  line-height: 1.4;
}

.type-radio {
  position: absolute;
  top: 16px;
  right: 16px;
}

/* Sélecteur de type de temps - design simplifié */
.time-kind-selector-simple {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}

.time-kind-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
}

/* Configuration des heures */
.time-config {
  margin-top: 16px;
}

.time-result .time-alert {
  margin: 0;
}

.time-range-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-btn {
  font-size: 12px;
  padding: 4px 8px;
  min-height: 32px;
}

.time-inputs-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-input-compact {
  flex: 1;
}

.time-separator {
  color: var(--va-color-text-secondary);
  margin: 0 4px;
}

/* Configuration des créneaux */
.slots-config {
  margin-top: 8px;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.slot-option {
  padding: 16px;
  border: 2px solid var(--va-color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--va-color-background-element);
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slot-option:hover {
  border-color: var(--va-color-primary-lighten2);
  background: var(--va-color-primary-lighten5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.slot-option.active {
  border-color: var(--va-color-success);
  background: var(--va-color-success-lighten5);
  box-shadow: 0 4px 12px rgba(var(--va-color-success-rgb), 0.2);
  transform: translateY(-2px);
}

.slot-content {
  flex: 1;
}

.slot-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  color: var(--va-color-text-primary);
}

.slot-option.active .slot-name {
  color: var(--va-color-success);
}

.slot-hours {
  font-size: 13px;
  color: var(--va-color-text-secondary);
  font-weight: 500;
}

.slot-option.active .slot-hours {
  color: var(--va-color-success-darken1);
}

.slot-check {
  margin-left: 12px;
  animation: checkIn 0.3s ease;
}

@keyframes checkIn {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Affichage du créneau sélectionné */
.selected-slot-display {
  margin-top: 16px;
}

.slot-alert {
  margin: 0;
  border-radius: 8px;
}

.selected-slot-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

/* Sélecteur de type de temps */
.time-kind-selector {
  margin-bottom: 20px;
}

.time-kind-selector h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
}

.time-kind-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.time-kind-buttons .va-button {
  min-width: 80px;
}

/* Créneaux rapides */
.quick-time-slots {
  margin-bottom: 16px;
}

.quick-time-slots h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--va-text-primary);
}

.quick-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-slot-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: end;
}

.time-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--va-text-secondary);
  margin-bottom: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--va-background-border);
}

/* Correction du z-index pour cette modale spécifique */
:deep(.batch-modal.va-modal) {
  z-index: 2147483648 !important;
}

:deep(.batch-modal .va-modal__container) {
  z-index: 2147483648 !important;
}

:deep(.batch-modal .va-modal__dialog) {
  z-index: 2147483649 !important;
}

/* SUPPRESSION COMPLÈTE DE L'OVERLAY pour éviter les problèmes de z-index */
:deep(.batch-modal .va-modal__overlay) {
  display: none !important;
}

:deep(.va-modal__overlay--lowest) {
  display: none !important;
}

/* Responsive */
@media (max-width: 768px) {
  .type-cards {
    grid-template-columns: 1fr;
  }
  
  .time-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .time-separator {
    transform: rotate(90deg);
    margin: 8px 0;
  }
  
  .quick-slots {
    justify-content: center;
  }
}
</style>
