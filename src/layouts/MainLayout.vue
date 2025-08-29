<template>
  <div class="main-layout">
    <NavBar />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import NavBar from '../components/NavBar.vue'
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--dark-background);
}

.main-content {
  flex: 1;
  padding: 24px;
  background: var(--dark-background);
  min-height: calc(100vh - 80px);
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
}
</style>
