<!--
  Modale de chargement moderne pour le planning
  Extrait de SemaineVirtualClean.vue pour améliorer la modularité
-->
<template>
  <va-modal
    :model-value="showModal"
    :hide-default-actions="true"
    :closeable="false"
    :no-outside-dismiss="true"
    :no-padding="true"
    size="large"
    fullscreen
    blur
    overlay-opacity="0.9"
  >
    <div class="modern-loading-container">
      <div class="loading-card">
        <div class="loading-header">
          <va-icon name="dashboard" size="56px" color="primary" class="mb-4" />
          <h1 class="loading-title">KeyDispo</h1>
          <p class="loading-subtitle">Préparation de votre planning</p>
        </div>
        
        <div class="loading-content">
          <div class="loading-spinner-container">
            <va-icon name="refresh" size="48px" spin color="primary" />
          </div>
          
          <div class="loading-status">
            <h3 v-if="loadingCollaborateurs" class="status-text">
              <va-icon name="people" size="20px" class="mr-2" />
              Chargement des collaborateurs
            </h3>
            <h3 v-else-if="loadingDisponibilites || fetchingRanges" class="status-text">
              <va-icon name="calendar_today" size="20px" class="mr-2" />
              Récupération des disponibilités
            </h3>
            <h3 v-else-if="allCollaborateursCount === 0" class="status-text">
              <va-icon name="settings" size="20px" class="mr-2" />
              Initialisation des données
            </h3>
            <h3 v-else-if="visibleDaysCount === 0" class="status-text">
              <va-icon name="view_module" size="20px" class="mr-2" />
              Préparation de l'interface
            </h3>
            <h3 v-else class="status-text">
              <va-icon name="check_circle" size="20px" class="mr-2" />
              Finalisation de l'affichage
            </h3>
          </div>
          
          <div class="progress-container">
            <va-progress-bar 
              :model-value="progressValue"
              color="primary"
              size="large"
              rounded
            />
            <p class="progress-text">
              {{ progressValue }}% terminé
            </p>
          </div>
        </div>
        
        <div class="loading-footer">
          <p class="loading-tip">
            <va-icon name="lightbulb" size="16px" class="mr-1" />
            Optimisation de l'affichage pour une meilleure performance
          </p>
        </div>
      </div>
    </div>
  </va-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  showModal: boolean
  loadingCollaborateurs: boolean
  loadingDisponibilites: boolean
  fetchingRanges: boolean
  allCollaborateursCount: number
  visibleDaysCount: number
}

const props = defineProps<Props>()

// Calcul du pourcentage de progression
const progressValue = computed(() => {
  if (props.loadingCollaborateurs) return 25
  if (props.loadingDisponibilites || props.fetchingRanges) return 50
  if (props.allCollaborateursCount === 0) return 70
  if (props.visibleDaysCount === 0) return 85
  return 95
})
</script>

<style scoped>
.modern-loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.loading-card {
  background: white;
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 480px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.loading-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--va-primary), #764ba2);
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

.loading-header {
  margin-bottom: 32px;
}

.loading-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, var(--va-primary), #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loading-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
  font-weight: 400;
}

.loading-content {
  margin-bottom: 32px;
}

.loading-spinner-container {
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.loading-status {
  margin-bottom: 24px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-text {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.progress-container {
  max-width: 300px;
  margin: 0 auto;
}

.progress-text {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.loading-footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 24px;
  margin-top: 24px;
}

.loading-tip {
  font-size: 14px;
  color: #888;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-style: italic;
}

/* Responsive pour mobile */
@media (max-width: 768px) {
  .modern-loading-container {
    padding: 10px;
  }
  
  .loading-card {
    padding: 32px 24px;
    border-radius: 16px;
  }
  
  .loading-title {
    font-size: 28px;
  }
  
  .loading-subtitle {
    font-size: 14px;
  }
  
  .status-text {
    font-size: 16px;
  }
  
  .loading-tip {
    font-size: 13px;
  }
}

/* Animations supplémentaires pour l'interactivité */
.loading-card {
  animation: slideIn 0.6s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Pulse pour les icônes */
.status-text .va-icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
