<template>
  <div class="lieu-combobox" :class="[size]">
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
  if (!open.value) open.value = true
  const max = filtered.value.length + (showCreate.value ? 1 : 0)
  highlighted.value = (highlighted.value + 1 + max) % max
}

function highlightPrev() {
  if (!open.value) open.value = true
  const max = filtered.value.length + (showCreate.value ? 1 : 0)
  highlighted.value = (highlighted.value - 1 + max) % max
}
</script>

<style scoped>
.lieu-combobox {
  position: relative;
}
.cbx-icn { color: var(--va-secondary); }
.cbx-list {
  position: absolute;
  z-index: 4000;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--va-background-primary);
  border: 1px solid var(--va-border-color);
  border-radius: 6px;
  max-height: 220px;
  overflow: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.cbx-item {
  padding: 8px 10px;
  cursor: pointer;
}
.cbx-item.active {
  background: var(--va-primary-opacity-10);
}
.cbx-item.create {
  color: var(--va-primary);
  font-weight: 500;
  border-top: 1px dashed var(--va-border-color);
}
.lieu-combobox.small .va-input__container {
  min-height: 32px;
}
</style>
