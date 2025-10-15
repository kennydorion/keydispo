<template>
  <div class="dispo-form">
    <div class="form-group">
      <label class="form-label">Type de disponibilité</label>
      <div class="button-grid">
        <button 
          v-for="typeOpt in typeOptions" 
          :key="typeOpt.value" 
          :class="['type-button', `type-${typeOpt.value}`, { 'active': modelValue.type === typeOpt.value }]" 
          @click="updateField('type', typeOpt.value)"
        >
          <va-icon :name="getTypeIcon(typeOpt.value)" size="20px" />
          <span>{{ typeOpt.text }}</span>
        </button>
      </div>
    </div>

    <div v-if="modelValue.type !== 'indisponible'" class="form-group">
      <label class="form-label">Format horaire</label>
      <div class="button-grid">
        <button 
          v-for="formatOpt in timeKindOptions" 
          :key="formatOpt.value" 
          :class="['format-button', { 'active': modelValue.timeKind === formatOpt.value }]" 
          @click="updateField('timeKind', formatOpt.value)"
        >
          <va-icon :name="getTimeKindIcon(formatOpt.value)" size="18px" />
          <span>{{ formatOpt.text }}</span>
        </button>
      </div>
    </div>

    <div v-if="modelValue.type === 'mission'" class="form-group">
      <label class="form-label">Lieu de mission</label>
      <LieuCombobox 
        :model-value="modelValue.lieu || ''" 
        @update:model-value="updateField('lieu', $event)" 
        :options="lieuxOptions" 
        label="" 
        size="large" 
        theme="light" 
        class="lieu-input" 
        @create="$emit('create-lieu', $event)" 
      />
    </div>

    <div v-if="modelValue.timeKind === 'range'" class="form-group">
      <label class="form-label">Horaires</label>
      <div class="time-inputs">
        <div class="time-field">
          <label class="time-label">Début</label>
          <va-input 
            :model-value="modelValue.heure_debut" 
            @update:model-value="updateField('heure_debut', $event)" 
            type="time" 
            step="900" 
            size="large" 
            class="time-input" 
          />
        </div>
        <div class="time-separator">
          <va-icon name="arrow_forward" size="20px" />
        </div>
        <div class="time-field">
          <label class="time-label">Fin</label>
          <va-input 
            :model-value="modelValue.heure_fin" 
            @update:model-value="updateField('heure_fin', $event)" 
            type="time" 
            step="900" 
            size="large" 
            class="time-input" 
            :disabled="!modelValue.heure_debut" 
          />
        </div>
      </div>
      <div v-if="isOvernightDetected" class="form-hint">
        <va-icon name="nightlight" size="14px" />
        <span>Mission de nuit détectée ({{ modelValue.heure_debut }} → {{ modelValue.heure_fin }})</span>
      </div>
    </div>

    <div v-if="modelValue.timeKind === 'slot'" class="form-group">
      <label class="form-label">Créneaux disponibles</label>
      <div class="slots-grid">
        <button 
          v-for="slot in slotOptions" 
          :key="slot.value" 
          :class="['slot-button', { 'active': modelValue.slots?.includes(slot.value) }]" 
          @click="toggleSlot(slot.value)"
        >
          {{ slot.text }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LieuCombobox from './LieuCombobox.vue'

interface DispoFormData {
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  lieu?: string
  heure_debut?: string
  heure_fin?: string
  slots?: string[]
}

interface Props {
  modelValue: DispoFormData
  typeOptions: Array<{ text: string; value: string }>
  timeKindOptions: Array<{ text: string; value: string }>
  slotOptions: Array<{ text: string; value: string }>
  lieuxOptions: string[]
  getTypeIcon: (t: any) => string
  getTimeKindIcon: (k: any) => string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: DispoFormData]
  'create-lieu': [value: string]
}>()

const isOvernightDetected = computed(() => {
  if (props.modelValue.timeKind !== 'range') return false
  if (!props.modelValue.heure_debut || !props.modelValue.heure_fin) return false
  
  const startTime = parseInt(props.modelValue.heure_debut.split(':')[0])
  const endTime = parseInt(props.modelValue.heure_fin.split(':')[0])
  
  return endTime < startTime || (endTime === startTime && props.modelValue.heure_fin < props.modelValue.heure_debut)
})

function updateField(field: keyof DispoFormData, value: any) {
  const updated = { ...props.modelValue, [field]: value }
  
  // Logique de réinitialisation selon le type/timeKind
  if (field === 'type' && value === 'indisponible') {
    updated.timeKind = 'full-day'
  }
  
  if (field === 'timeKind') {
    if (value === 'full-day') {
      updated.heure_debut = '00:00'
      updated.heure_fin = '23:59'
      updated.slots = []
    } else if (value === 'range') {
      updated.heure_debut = updated.heure_debut || '09:00'
      updated.heure_fin = updated.heure_fin || '17:00'
      updated.slots = []
    } else if (value === 'slot') {
      updated.slots = updated.slots || []
      updated.heure_debut = ''
      updated.heure_fin = ''
    }
  }
  
  emit('update:modelValue', updated)
}

function toggleSlot(slotValue: string) {
  const currentSlots = props.modelValue.slots || []
  const newSlots = currentSlots.includes(slotValue)
    ? currentSlots.filter(s => s !== slotValue)
    : [...currentSlots, slotValue]
  
  updateField('slots', newSlots)
}
</script>

<style scoped>
/* === STYLES COPIÉS DEPUIS DispoEditContent POUR UNIFORMITÉ COMPLÈTE === */
.dispo-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  margin-bottom: 1.25rem;
  box-sizing: border-box;
  max-width: 100%;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  box-sizing: border-box;
  max-width: 100%;
}

.type-button,
.format-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 0.5rem;
  border: 2px solid var(--gray-200);
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.type-button:hover,
.format-button:hover {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
}

.type-button.active,
.format-button.active {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  transform: translateY(-2px);
}

.type-button.type-disponible {
  border-color: #4caf50;
}

.type-button.type-disponible:hover {
  border-color: #388e3c;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.04) 100%);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);
}

.type-button.type-disponible.active {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border-color: #388e3c;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.type-button.type-indisponible {
  border-color: #f44336;
}

.type-button.type-indisponible:hover {
  border-color: #d32f2f;
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(244, 67, 54, 0.04) 100%);
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.2);
}

.type-button.type-indisponible.active {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  border-color: #d32f2f;
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
}

.type-button.type-mission { 
  border-color:#2196f3; 
}

.type-button.type-mission:hover { 
  border-color:#1976d2; 
  background:linear-gradient(135deg, rgba(33,150,243,0.09) 0%, rgba(33,150,243,0.04) 100%); 
  box-shadow:0 4px 15px rgba(33,150,243,0.25); 
}

.type-button.type-mission.active { 
  background:linear-gradient(135deg,#2196f3 0%, #1976d2 100%); 
  border-color:#1976d2; 
  box-shadow:0 4px 15px rgba(33,150,243,0.35); 
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--gray-50);
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--gray-600);
  margin-top: 0.5rem;
}

.time-inputs {
  display: flex;
  align-items: end;
  gap: 0.75rem;
  box-sizing: border-box;
  max-width: 100%;
}

.time-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
  box-sizing: border-box;
}

.time-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--gray-600);
}

.time-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  color: var(--gray-400);
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
  box-sizing: border-box;
  max-width: 100%;
}

.slot-button {
  padding: 0.6rem 0.75rem;
  border: 2px solid var(--gray-200);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.slot-button:hover {
  border-color: #4caf50;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.04) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.slot-button.active {
  border-color: #388e3c;
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  transform: translateY(-2px);
}

/* Responsive */
@media (max-width: 768px) {
  .button-grid { 
    grid-template-columns:repeat(2,1fr); 
  }
  
  .time-inputs { 
    flex-direction:column; 
    gap:0.5rem; 
  }
  
  .slots-grid { 
    grid-template-columns:repeat(2,1fr); 
  }
}
</style>
