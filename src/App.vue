<script setup>
import { ref } from 'vue';
import PlanningBoard from './components/PlanningBoard.vue';

const view = ref('table');
</script>

<template>
  <div class="tabs">
    <button @click="view = 'table'" :class="{ active: view === 'table' }">
      Tableau
    </button>
    <button @click="view = 'day'" :class="{ active: view === 'day' }">
      Par jour
    </button>
  </div>
  <PlanningBoard :view="view" />
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 4;
}
.tabs button {
  flex: 1;
  padding: 8px;
  cursor: pointer;
}
.tabs button.active {
  background: #ececec;
  font-weight: bold;
}
</style>
