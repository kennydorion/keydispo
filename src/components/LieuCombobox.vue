<template>
  <div class="lieu-combobox" :class="[size, theme]">
    <va-input
      v-model="inputValue"
      :label="label"
      :placeholder="placeholder || 'Saisir un lieu'"
      :disabled="disabled"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.down.prevent="highlightNext"
      @keydown.up.prevent="highlightPrev"
      @keydown.enter.prevent="commitCurrent"
      @keydown.esc.stop.prevent="closeList"
      clearable
      @click-clear="clearValue"
    >
      <template #appendInner>
        <va-icon name="place" size="16px" class="cbx-icn" />
      </template>
    </va-input>

    <div v-if="open && filtered.length" class="cbx-list" role="listbox">
      <div
        v-for="(opt, i) in filtered"
        :key="'opt-' + i"
        class="cbx-item"
        :class="{ active: i === highlighted }"
        role="option"
        @mousedown.prevent="selectOption(opt)"
      >
        {{ opt }}
      </div>
      <div
        v-if="showCreate"
        class="cbx-item create"
        :class="{ active: highlighted === filtered.length }"
        @mousedown.prevent="createOption"
      >
        Créer « {{ trimmed }} »
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface Props {
  modelValue: string
  options: string[]
  label?: string
  placeholder?: string
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  theme?: 'dark' | 'light'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'create', v: string): void
}>()

const inputValue = ref(props.modelValue || '')
const open = ref(false)
const highlighted = ref(-1)

watch(() => props.modelValue, (v) => {
  if (v !== inputValue.value) inputValue.value = v || ''
})

const trimmed = computed(() => (inputValue.value || '').trim())

function norm(s: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const filtered = computed(() => {
  const q = norm(trimmed.value)
  const list = Array.isArray(props.options) ? props.options : []
  if (!q) return list.slice(0, 25)
  return list.filter(o => norm(o).includes(q)).slice(0, 25)
})

const showCreate = computed(() => {
  const v = trimmed.value
  if (!v) return false
  return !props.options.some(o => norm(o) === norm(v))
})

function onFocus() {
  open.value = true
  // Détecter si on doit afficher vers le haut
  checkDropdownPosition()
}

function checkDropdownPosition() {
  // Petite temporisation pour que le DOM soit mis à jour
  setTimeout(() => {
    const container = document.querySelector('.lieu-combobox')
    if (!container) return
    
    const rect = container.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = 200 // max-height de la liste
    
    // Détecter si on est dans une modale
    const modal = container.closest('.va-modal__dialog, .dispo-modal-redesigned')
    let modalSpaceBelow = spaceBelow
    let modalSpaceAbove = spaceAbove
    
    if (modal) {
      const modalRect = modal.getBoundingClientRect()
      modalSpaceBelow = modalRect.bottom - rect.bottom
      modalSpaceAbove = rect.top - modalRect.top
    }
    
    // Utiliser l'espace de la modale si on est dedans, sinon l'espace viewport
    const effectiveSpaceBelow = modal ? modalSpaceBelow : spaceBelow
    const effectiveSpaceAbove = modal ? modalSpaceAbove : spaceAbove
    
    // Si pas assez de place en bas mais plus de place en haut
    if (effectiveSpaceBelow < Math.min(dropdownHeight, 150) && effectiveSpaceAbove > effectiveSpaceBelow) {
      container.classList.add('flip-up')
    } else {
      container.classList.remove('flip-up')
    }
    
    // Ajuster la hauteur max selon l'espace disponible
    const list = container.querySelector('.cbx-list') as HTMLElement
    if (list) {
      const maxHeight = Math.min(
        dropdownHeight,
        Math.max(effectiveSpaceBelow, effectiveSpaceAbove) - 20 // Marge de 20px
      )
      list.style.maxHeight = `${Math.max(maxHeight, 100)}px` // Min 100px
    }
  }, 0)
}

function onBlur() {
  // Commit la valeur saisie si rien n'est sélectionné
  setTimeout(() => {
    if (document.activeElement && (document.activeElement as HTMLElement).closest('.cbx-list')) {
      return
    }
    commitInput()
    closeList()
  }, 0)
}

function closeList() {
  open.value = false
  highlighted.value = -1
  // Nettoyer les classes de positionnement
  const container = document.querySelector('.lieu-combobox')
  if (container) {
    container.classList.remove('flip-up')
  }
}

function clearValue() {
  inputValue.value = ''
  emit('update:modelValue', '')
}

function selectOption(opt: string) {
  inputValue.value = opt
  emit('update:modelValue', opt)
  closeList()
}

function createOption() {
  const v = trimmed.value
  if (!v) return
  inputValue.value = v
  emit('update:modelValue', v)
  emit('create', v)
  closeList()
}

function commitInput() {
  const v = inputValue.value
  emit('update:modelValue', v)
  if (v && !props.options.some(o => norm(o) === norm(v))) emit('create', v)
}

function commitCurrent() {
  if (highlighted.value >= 0 && highlighted.value < filtered.value.length) {
    selectOption(filtered.value[highlighted.value])
    return
  }
  if (showCreate.value) {
    createOption()
    return
  }
  commitInput()
  closeList()
}

function highlightNext() {
  if (!open.value) {
    open.value = true
    checkDropdownPosition()
  }
  const max = filtered.value.length + (showCreate.value ? 1 : 0)
  highlighted.value = (highlighted.value + 1 + max) % max
}

function highlightPrev() {
  if (!open.value) {
    open.value = true
    checkDropdownPosition()
  }
  const max = filtered.value.length + (showCreate.value ? 1 : 0)
  highlighted.value = (highlighted.value - 1 + max) % max
}
</script>

<style scoped>
.lieu-combobox {
  position: relative;
}

.cbx-icn { 
  color: var(--dark-text-secondary); 
}

.cbx-list {
  position: absolute;
  z-index: 10000;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  max-height: 200px;
  overflow: auto;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  
  /* Gestion du débordement pour les modales */
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  
  /* Assurer que la liste reste dans les limites visuelles */
  transform: translateZ(0);
  will-change: transform;
  
  /* Ajustement automatique si débordement en bas */
  bottom: auto;
  top: 100%;
}

/* Positionnement vers le haut si pas assez de place en bas */
.lieu-combobox.flip-up .cbx-list {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 4px;
}

.cbx-item {
  padding: 12px 16px;
  cursor: pointer;
  color: var(--dark-text-primary);
  background: transparent;
  border-bottom: 1px solid var(--dark-border);
  transition: background-color 0.2s ease;
}

.cbx-item:last-child {
  border-bottom: none;
}

.cbx-item.active {
  background: var(--dark-surface-secondary);
  color: var(--dark-text-primary);
}

.cbx-item.create {
  color: var(--primary-color);
  font-weight: 500;
  border-top: 1px dashed var(--dark-border);
  background: transparent;
}

.cbx-item.create.active {
  background: var(--dark-surface-secondary);
  color: var(--primary-color);
}

.lieu-combobox.small .va-input__container {
  min-height: 32px;
}

/* Thème sombre par défaut */
:deep(.va-input) {
  --va-background-color: var(--dark-card);
  --va-color: var(--dark-text-primary);
  --va-border-color: var(--dark-border);
}

:deep(.va-input__container) {
  background: var(--dark-card) !important;
  color: var(--dark-text-primary) !important;
  border-color: var(--dark-border) !important;
}

:deep(.va-input__container:hover) {
  border-color: var(--primary-color) !important;
}

:deep(.va-input__container:focus-within) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.2) !important;
}

:deep(.va-input-wrapper__text) {
  color: var(--dark-text-primary) !important;
}

:deep(.va-input__label) {
  color: var(--dark-text-secondary) !important;
}

/* Thème clair optionnel */
.light :deep(.va-input__container) {
  background: #ffffff !important;
  color: #111827 !important; /* Texte noir */
  border-color: #d1d5db !important;
}
.light :deep(.va-input-wrapper__text) {
  color: #111827 !important;
}
.light :deep(.va-input__label) {
  color: #6b7280 !important;
}
.light .cbx-icn {
  color: #6b7280;
}
.light .cbx-list {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}
.light .cbx-item {
  color: #111827;
  border-bottom-color: #e5e7eb;
}
.light .cbx-item.active {
  background: #f3f4f6;
}
.light .cbx-item.create {
  color: #2563eb;
  border-top-color: #e5e7eb;
}
.light .cbx-item.create.active {
  background: #eef2ff;
  color: #1d4ed8;
}
</style>
