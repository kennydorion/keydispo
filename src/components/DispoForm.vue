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
.dispo-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.type-button,
.format-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.type-button:hover,
.format-button:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.type-button.active,
.format-button.active {
  border-color: var(--va-primary);
  background: color-mix(in srgb, var(--va-primary) 10%, white);
  color: var(--va-primary);
}

.type-button.type-mission.active {
  border-color: #dc2626;
  background: color-mix(in srgb, #dc2626 10%, white);
  color: #dc2626;
}

.type-button.type-disponible.active {
  border-color: #16a34a;
  background: color-mix(in srgb, #16a34a 10%, white);
  color: #16a34a;
}

.type-button.type-indisponible.active {
  border-color: #9ca3af;
  background: color-mix(in srgb, #9ca3af 10%, white);
  color: #9ca3af;
}

.time-inputs {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}

.time-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.time-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.time-separator {
  display: flex;
  align-items: center;
  padding-bottom: 0.5rem;
  color: #9ca3af;
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #92400e;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
}

.slot-button {
  padding: 0.625rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.375rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
}

.slot-button:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.slot-button.active {
  border-color: var(--va-primary);
  background: var(--va-primary);
  color: white;
}
</style>
