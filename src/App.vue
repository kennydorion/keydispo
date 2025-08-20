<template>
  <div id="app">
    <!-- Navigation principale -->
    <SimpleNavBar />
    
    <!-- Contenu principal -->
    <main class="main-content">
      <router-view />
    </main>
    
    <!-- Footer optionnel -->
    <footer class="app-footer">
      <div class="footer-content">
        <span class="footer-text">
          KeyDispo v2.0 - Gestion optimisée des disponibilités
        </span>
        <div class="footer-links">
          <a href="#" class="footer-link">Support</a>
          <a href="#" class="footer-link">Documentation</a>
          <a href="#" class="footer-link">À propos</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import SimpleNavBar from './components/SimpleNavBar.vue'
import { onMounted } from 'vue'

onMounted(() => {
  console.log('🚀 KeyDispo Application démarrée')
})
</script>

<style>
/* Reset et styles globaux */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: var(--va-font-family);
  background: var(--va-background-primary);
  color: var(--va-text-primary);
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 1rem;
  background: var(--va-background-secondary);
  min-height: calc(100vh - 120px);
}

.app-footer {
  background: var(--va-background-element);
  border-top: 1px solid var(--va-background-border);
  padding: 1rem;
  margin-top: auto;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.footer-text {
  font-size: 0.875rem;
  color: var(--va-text-secondary);
}

.footer-links {
  display: flex;
  gap: 1rem;
}

.footer-link {
  font-size: 0.875rem;
  color: var(--va-text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--va-primary);
}

/* Classes utilitaires */
.text-center { text-align: center; }
.mt-4 { margin-top: 1.5rem; }
.mb-4 { margin-bottom: 1.5rem; }
.mr-1 { margin-right: 0.25rem; }
.mr-2 { margin-right: 0.5rem; }
.ml-1 { margin-left: 0.25rem; }
.ml-2 { margin-left: 0.5rem; }

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 0.5rem;
  }
  
  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
  
  .footer-links {
    justify-content: center;
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--va-background-secondary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--va-background-border);
  border-radius: 4px;
  transition: background 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--va-text-secondary);
}
</style>
