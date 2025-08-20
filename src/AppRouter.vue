<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-content">
        <h1 class="nav-title">🔄 KeyDispo</h1>
        <div class="nav-tabs">
          <router-link to="/semaine" class="nav-tab" active-class="active">📅 Semaine</router-link>
          <router-link to="/import" class="nav-tab" active-class="active">📥 Import</router-link>
        </div>
        <p class="nav-subtitle">Application de gestion des disponibilités - Vue 3 + TypeScript</p>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
    
    <!-- Conteneur global de notifications -->
    <NotificationContainer />
  </div>
</template>

<script setup lang="ts">
import NotificationContainer from './components/NotificationContainer.vue'
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f5f5;
}

#app {
  min-height: 100vh;
}

.navbar {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 20px;
}

.nav-title {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 1.8em;
  font-weight: 600;
}

.nav-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.nav-tab {
  padding: 8px 16px;
  border: 1px solid #dee2e6;
  background: #f8f9fa;
  color: #495057;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.nav-tab:hover {
  background: #e9ecef;
  color: #495057;
  text-decoration: none;
}

.nav-tab.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.nav-subtitle {
  margin: 0;
  color: #6c757d;
  font-size: 0.9em;
}

.main-content {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Utilitaires globaux */
.text-center { text-align: center; }
.text-success { color: #28a745; }
.text-danger { color: #dc3545; }
.text-warning { color: #ffc107; }
.text-info { color: #17a2b8; }
.text-secondary { color: #6c757d; }

.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
</style>
