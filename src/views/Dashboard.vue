<template>
  <div class="dashboard">
      <!-- En-tête du dashboard -->
      <header class="dashboard-header">
        <div class="header-content">
          <div class="header-title">
            <h1>Tableau de bord</h1>
            <p class="header-subtitle">Vue d'ensemble des disponibilités et activités</p>
          </div>
        </div>
      </header>
      
      <!-- Navigation rapide -->
      <div class="quick-nav">
        <div class="nav-card" @click="navigateToPlanning">
          <div class="nav-icon" style="background: #f59e0b22; color: #f59e0b;">
            <span class="material-icons">calendar_month</span>
          </div>
          <div class="nav-content">
            <h3>Planning</h3>
            <p>Gérer les disponibilités</p>
          </div>
        </div>
        
        <!-- Affichage conditionnel selon l'interface -->
        <template v-if="isCollaborateurInterface">
          <div class="nav-card" @click="navigateToProfile">
            <div class="nav-icon" style="background: #8b5cf622; color: #8b5cf6;">
              <span class="material-icons">person</span>
            </div>
            <div class="nav-content">
              <h3>Mon profil</h3>
              <p>Modifier mes informations</p>
            </div>
          </div>
        </template>
        
        <!-- Interface admin/editor/viewer -->
        <template v-else>
          <div class="nav-card" @click="$router.push('/collaborateurs')">
            <div class="nav-icon" style="background: #10b98122; color: #10B981;">
              <span class="material-icons">people</span>
            </div>
            <div class="nav-content">
              <h3>Collaborateurs</h3>
              <p>Gérer l'équipe</p>
            </div>
          </div>
          
          <div class="nav-card" @click="$router.push('/import')">
            <div class="nav-icon" style="background: #2563eb22; color: #2563EB;">
              <span class="material-icons">upload</span>
            </div>
            <div class="nav-content">
              <h3>Import</h3>
              <p>Importer des données</p>
            </div>
          </div>
        </template>
      </div>
      
      <!-- Message informatif pour les fonctionnalités à venir -->
      <div class="dashboard-info">
        <div class="info-card">
          <div class="info-icon">
            <span class="material-icons">construction</span>
          </div>
          <div class="info-content">
            <h3>Tableau de bord en développement</h3>
            <p>Les statistiques et indicateurs seront bientôt disponibles. En attendant, utilisez les liens rapides ci-dessus pour accéder aux différentes sections.</p>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

// Détecter si on est dans l'interface collaborateur
const isCollaborateurInterface = computed(() => route.path.startsWith('/collaborateur/'))

// Navigation intelligente vers le planning en fonction de l'interface
const navigateToPlanning = () => {
  if (route.path.startsWith('/collaborateur/')) {
    router.push('/collaborateur/planning')
  } else {
    router.push('/semaine')
  }
}

// Navigation vers le profil
const navigateToProfile = () => {
  if (isCollaborateurInterface.value) {
    router.push('/collaborateur/profil')
  } else {
    router.push('/parametres')
  }
}
</script>

<style scoped>
.dashboard {
  padding: 24px;
  font-family: 'Inter', 'Roboto', system-ui, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--dark-background, #2e3440);
  color: var(--dark-text-primary, #eceff4);
}

.dashboard-header {
  margin-bottom: 32px;
}

.header-content {
  text-align: center;
}

.header-title h1 {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--dark-text-primary, #eceff4);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 1.1rem;
  color: var(--dark-text-secondary, #d8dee9);
  margin: 0;
}

.quick-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.nav-card {
  background: var(--dark-surface, #3b4252);
  border: 1px solid var(--dark-border, #4c566a);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.nav-card:hover {
  background: var(--dark-surface-secondary, #434c5e);
  border-color: var(--primary-color, #5e81ac);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.nav-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-icon .material-icons {
  font-size: 28px;
}

.nav-content h3 {
  margin: 0 0 6px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--dark-text-primary, #eceff4);
}

.nav-content p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--dark-text-secondary, #d8dee9);
  line-height: 1.4;
}

.dashboard-info {
  margin-top: 40px;
}

.info-card {
  background: linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 20px;
  padding: 32px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  text-align: left;
}

.info-icon {
  width: 56px;
  height: 56px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-icon .material-icons {
  font-size: 28px;
}

.info-content h3 {
  margin: 0 0 12px 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e40af;
}

.info-content p {
  margin: 0;
  font-size: 1rem;
  color: #1e3a8a;
  line-height: 1.6;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }
  
  .header-title h1 {
    font-size: 2rem;
  }
  
  .quick-nav {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .nav-card {
    padding: 20px;
  }
  
  .nav-icon {
    width: 48px;
    height: 48px;
  }
  
  .nav-icon .material-icons {
    font-size: 24px;
  }
  
  .info-card {
    padding: 24px;
    flex-direction: column;
    text-align: center;
  }
  
  .info-content h3 {
    font-size: 1.2rem;
  }
}
</style>
