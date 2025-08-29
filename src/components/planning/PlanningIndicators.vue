<!--
  Composant pour les indicateurs de chargement et suggestions du planning
  Extrait de SemaineVirtualClean.vue pour améliorer la modularité
-->
<template>
  <div class="planning-indicators">
    <!-- Suggestions contextuelles -->
    <div v-if="suggestions.length" class="suggestions">
      <va-icon name="lightbulb" size="14px" class="mr-1" />
      <span v-for="(s, i) in suggestions" :key="i" class="suggestion-item">{{ s }}</span>
    </div>

    <!-- Indicateur de chargement extension (non bloquant) -->
    <div v-if="extending || (isBusy && !isInitialLoad)" class="extending-indicator">
      <va-icon name="refresh" spin size="1rem" />
      <span v-if="extending">Extension en cours...</span>
      <span v-else-if="fetchingRanges">Chargement des données...</span>
      <span v-else>Synchronisation...</span>
    </div>

    <!-- Badge d'environnement: émulateur local -->
    <div v-if="isEmulator" class="env-badge">
      Émulateur Firebase actif
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  suggestions: string[]
  extending: boolean
  isBusy: boolean
  isInitialLoad: boolean
  fetchingRanges: boolean
  isEmulator: boolean
}

defineProps<Props>()
</script>

<style scoped>
.planning-indicators {
  position: relative;
  margin-bottom: 16px;
}

.suggestions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 235, 59, 0.1);
  border: 1px solid rgba(255, 235, 59, 0.3);
  border-radius: 8px;
  color: #F57F17;
  font-size: 13px;
  margin-bottom: 8px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestion-item {
  background: rgba(255, 235, 59, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.extending-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  animation: fadeInScale 0.3s ease-out;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.env-badge {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 999;
  background: linear-gradient(135deg, #FF6B35, #F7931E);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

/* Responsive pour mobile */
@media (max-width: 768px) {
  .extending-indicator {
    top: 10px;
    right: 10px;
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .env-badge {
    top: 10px;
    left: 10px;
    font-size: 10px;
    padding: 5px 10px;
  }
  
  .suggestions {
    margin-bottom: 12px;
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .suggestion-item {
    padding: 1px 6px;
    font-size: 11px;
  }
}

/* États de transition fluides */
.extending-indicator,
.env-badge,
.suggestions {
  transition: all 0.3s ease;
}

/* Ajustements pour éviter les chevauchements */
.extending-indicator + .env-badge {
  top: 70px;
}

@media (max-width: 768px) {
  .extending-indicator + .env-badge {
    top: 60px;
  }
}
</style>
