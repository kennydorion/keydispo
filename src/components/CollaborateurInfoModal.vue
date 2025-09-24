<template>
  <CollaborateurDispoModal
    :model-value="visible"
    :collaborateur="collaborateur"
    :date="fallbackDate"
    mode="collaborateur"
    @update:modelValue="(v) => emit('update:visible', v)"
    @save-collaborateur-notes="onSaveNotes"
  />
</template>

<script setup lang="ts">
import type { Collaborateur } from '@/types/planning'
import { computed } from 'vue'
import CollaborateurDispoModal from './CollaborateurDispoModal.vue'

interface Props { collaborateur?: Collaborateur | null; visible: boolean }
withDefaults(defineProps<Props>(), { collaborateur: null, visible: false })
const emit = defineEmits<{ 'update:visible': [value: boolean]; 'save-notes': [collaborateur: Collaborateur, notes: string] }>()
const fallbackDate = computed(() => new Date().toISOString().slice(0,10))
function onSaveNotes(collaborateur: Collaborateur, notes: string) { emit('save-notes', collaborateur, notes) }
</script>

<style scoped></style>
