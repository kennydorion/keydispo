<script setup>
import { ref } from 'vue';
import PlanningBoard from './components/PlanningBoard.vue';
import HeaderBar from './components/HeaderBar.vue';
import SidebarMenu from './components/SidebarMenu.vue';
import CalendarView from './components/CalendarView.vue';

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
        <button @click="view = 'calendar'" :class="{ active: view === 'calendar' }">
          Calendrier
        </button>
      </div>
      <PlanningBoard v-if="view !== 'calendar'" :view="view" />
      <CalendarView v-else />
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
  background: #fff;
  border: 1px solid #000;
  color: #000;
  transition: opacity 0.2s;
}
.tabs button:hover {
  opacity: 0.8;
}
.tabs button.active {
  background: #e5e5e5;
  font-weight: bold;
}
</style>
