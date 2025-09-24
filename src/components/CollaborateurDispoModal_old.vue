<template>
  <va-modal
    v-model="isVisible"
    :hide-default-actions="true"
    :fullscreen="false"
    max-width="800px"
    no-padding
    @close="handleClose"
  >
    <div class="placeholder">
      <h3>Édition de disponibilité (ancien module)</h3>
      <p>Ce composant est conservé pour compatibilité mais n'est plus utilisé.</p>
    </div>
  </va-modal>
  
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props { modelValue?: boolean }
const props = withDefaults(defineProps<Props>(), { modelValue: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; close: [] }>()

const isVisible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

function handleClose() {
  emit('close')
}
</script>

<style scoped>
/* Placeholder minimal */
.placeholder { padding: 16px; }
</style>
