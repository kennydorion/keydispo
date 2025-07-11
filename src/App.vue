<script setup>
import { ref } from 'vue';
import PlanningBoard from './components/PlanningBoard.vue';
import HeaderBar from './components/HeaderBar.vue';
import SidebarMenu from './components/SidebarMenu.vue';

const view = ref('table');
</script>

<template>
  <HeaderBar />
  <div class="layout">
    <SidebarMenu />
    <main class="content">
      <div class="tabs">
        <button @click="view = 'table'" :class="{ active: view === 'table' }">
          Tableau
        </button>
        <button @click="view = 'day'" :class="{ active: view === 'day' }">
          Par jour
        </button>
      </div>
      <PlanningBoard :view="view" />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: calc(100vh - 48px);
}
.content {
  margin-left: 200px;
  flex: 1;
  padding: 16px;
}
.tabs {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 4;
  margin-bottom: 8px;
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
