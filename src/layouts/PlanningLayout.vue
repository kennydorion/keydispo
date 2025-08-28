<template>
  <div class="planning-layout">
    <TopNav />
    <main class="planning-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import TopNav from '../components/TopNav.vue'
</script>

<style scoped>
.planning-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--dark-background);
}

.planning-content {
  flex: 1;
  background: var(--dark-background);
  /* Pas de padding pour que le planning touche les bords */
  padding: 0;
  width: 100%;
  min-height: calc(100vh - 64px);
}

@media (max-width: 768px) {
  .planning-content {
    /* Ajuster pour la nouvelle hauteur mobile du TopNav (48px au lieu de 64px) */
    min-height: calc(100vh - 48px);
  }
}
</style>
