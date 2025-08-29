<!--
  Barre de statut de sélection pour le planning
  Extrait de SemaineVirtualClean.vue pour améliorer la modularité
-->
<template>
  <div>
    <!-- Barre de statut de sélection améliorée -->
    <div v-if="selectedCells.size > 0 || isSelectionMode || isDraggingSelection" class="selection-status-bar">
      <div class="selection-content">
        <va-icon name="touch_app" size="16px" class="selection-icon" />
        <span v-if="!selectedCells.size && isSelectionMode" class="selection-text">
          Mode sélection activé - glissez sur les cellules
        </span>
        <span v-else-if="isDraggingSelection" class="selection-text">
          Sélection en cours... <strong>{{selectedCells.size}}</strong> cellule{{ selectedCells.size > 1 ? 's' : '' }}
        </span>
        <span v-else class="selection-text">
          <strong>{{selectedCells.size}}</strong> cellule{{ selectedCells.size > 1 ? 's' : '' }} sélectionnée{{ selectedCells.size > 1 ? 's' : '' }}
        </span>
        <va-button 
          v-if="selectedCells.size > 0"
          size="small" 
          preset="plain" 
          icon="clear"
          class="clear-selection-btn"
          @click="$emit('clearSelection')"
        />
      </div>
    </div>
    
    <!-- Aide contextuelle discrète -->
    <div v-if="!selectedCells.size && !isSelectionMode && !isDraggingSelection" class="selection-help-tooltip">
      <va-icon name="info" size="14px" />
      <kbd>Ctrl</kbd>+glisser pour sélectionner
    </div>

    <!-- Bouton flottant pour la sélection par lot -->
    <div v-if="selectedCells.size > 0" class="batch-action-fab">
      <va-button 
        preset="primary" 
        icon="edit_calendar"
        @click="$emit('openBatchModal')"
        :style="{ '--va-button-content-px': '12px' }"
      >
        Créer {{ selectedCells.size }} disponibilité{{ selectedCells.size > 1 ? 's' : '' }}
      </va-button>
      <va-button 
        preset="secondary" 
        icon="clear"
        @click="$emit('clearSelection')"
        size="small"
        class="ml-2"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  selectedCells: Set<string>
  isSelectionMode: boolean
  isDraggingSelection: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  clearSelection: []
  openBatchModal: []
}>()
</script>

<style scoped>
.selection-status-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: var(--va-primary);
  color: white;
  padding: 12px 20px;
  border-radius: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  animation: slideUp 0.3s ease-out;
  max-width: calc(100vw - 40px);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.selection-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 500;
}

.selection-icon {
  opacity: 0.9;
}

.selection-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clear-selection-btn {
  color: white !important;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.clear-selection-btn:hover {
  opacity: 1;
}

.selection-help-tooltip {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: fadeIn 0.5s ease-out 2s both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.selection-help-tooltip kbd {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.batch-action-fab {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Responsive pour mobile */
@media (max-width: 768px) {
  .selection-status-bar {
    bottom: 10px;
    left: 10px;
    right: 10px;
    transform: none;
    max-width: none;
    padding: 10px 16px;
  }
  
  .selection-content {
    font-size: 13px;
    gap: 8px;
  }
  
  .selection-help-tooltip {
    bottom: 10px;
    right: 10px;
    font-size: 11px;
    padding: 6px 10px;
  }
  
  .batch-action-fab {
    bottom: 70px;
    right: 10px;
  }
}

/* Animation d'apparition fluide */
.selection-status-bar,
.batch-action-fab {
  transition: all 0.3s ease;
}
</style>
