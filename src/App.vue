<template>
  <div id="app">
    <NavBar v-if="showNavBar" />
    <div class="app-main" :class="{ 'no-nav': !showNavBar }">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { AuthService } from './services/auth'
import { useRouter, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'

const router = useRouter()
const route = useRoute()

// Afficher la NavBar sauf sur les routes publiques (login)
const showNavBar = computed(() => !route.meta.public && route.path !== '/login')

onMounted(() => {
  
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
  padding: 0;
}

@media (max-width: 768px) {
  .app-main { min-height: calc(100vh - 56px); padding: 0; }
  .app-main.no-nav { min-height: 100vh; }
}

.app-main.no-nav {
  min-height: 100vh;
  padding: 0;
}
</style>
