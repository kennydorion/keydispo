<template>
  <div id="app">
    <TopNav v-if="showTopNav" />
    <div class="app-main" :class="{ 'no-nav': !showTopNav }">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { AuthService } from './services/auth'
import { useRouter, useRoute } from 'vue-router'
import TopNav from './components/TopNav.vue'

const router = useRouter()
const route = useRoute()

// Afficher la TopNav sauf sur les routes publiques (login)
const showTopNav = computed(() => !route.meta.public && route.path !== '/login')

onMounted(() => {
  console.log('🚀 KeyDispo Application démarrée')
  
  // Écouter les changements d'état d'authentification
  AuthService.onAuthStateChanged((user) => {
    if (!user && router.currentRoute.value.meta.requiresAuth) {
      router.push('/login')
    }
  })
})
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
  background: var(--dark-background);
  color: var(--dark-text-primary);
  font-family: var(--kd-font);
}

.app-main {
  box-sizing: border-box;
  min-height: calc(100vh - 64px);
  padding: 24px;
}

@media (max-width: 768px) {
  .app-main { min-height: calc(100vh - 50px); padding: 12px 10px; }
  .app-main.no-nav { min-height: 100vh; }
}

.app-main.no-nav {
  min-height: 100vh;
  padding: 32px 24px;
}
</style>
