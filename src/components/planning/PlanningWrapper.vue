<!--
  Wrapper principal du planning - Version refactorisée
  Utilise les composants modulaires extraits de SemaineVirtualClean.vue
-->
<template>
  <div class="planning-app">
    <!-- Header avec filtres compact -->
    <FiltersHeaderNew />

    <!-- Contenu principal -->
    <div class="main-content">
      <!-- Modale de chargement moderne -->
      <PlanningLoadingModal
        :show-modal="showLoadingModal"
        :loading-collaborateurs="loadingCollaborateurs"
        :loading-disponibilites="loadingDisponibilites"
        :fetching-ranges="fetchingRanges"
        :all-collaborateurs-count="allCollaborateurs.length"
        :visible-days-count="visibleDays.length"
      />

      <div class="planning-manager">
        <!-- Indicateurs de chargement et suggestions -->
        <PlanningIndicators
          :suggestions="suggestions"
          :extending="extending"
          :is-busy="isBusy"
          :is-initial-load="isInitialLoad"
          :fetching-ranges="fetchingRanges"
          :is-emulator="isEmulator"
        />

        <!-- Panneau d'état centralisé -->
        <PlanningStatusPanel
          :is-realtime-active="isRealtimeActive"
          :realtime-listeners="realtimeListeners"
          :active-users="getActiveUsers()"
          :connected-users="connectedUsers"
          :is-emulator-mode="isEmulatorMode"
          @show-realtime-stats="showRealtimeStats"
          @cleanup-sessions="cleanupSessions"
        />

        <!-- Barre de sélection et boutons batch -->
        <PlanningSelectionBar
          :selected-cells="selectedCells"
          :is-selection-mode="isSelectionMode"
          :is-dragging-selection="isDraggingSelection"
          @clear-selection="clearSelection"
          @open-batch-modal="batchModalOpen = true"
        />

        <!-- Planning principal (à refactoriser en sous-composants) -->
        <div class="excel-planning-container">
          <!-- Contenu du planning existant sera déplacé ici -->
          <PlanningGridPlaceholder />
        </div>
      </div>
    </div>

    <!-- Modales existantes -->
    <BatchDisponibiliteModal
      v-model="batchModalOpen"
      :selected-cells="selectedCells"
      :collaborateurs="allCollaborateurs"
      @cells-updated="handleBatchUpdate"
    />

    <CollaborateurInfoModal
      v-model="collaborateurInfoModal.open"
      :collaborateur="collaborateurInfoModal.collaborateur"
      :loading="collaborateurInfoModal.loading"
    />

    <!-- Modale de disponibilité (sera extraite plus tard) -->
    <!-- Le contenu existant de la modale de disponibilité reste ici temporairement -->
  </div>
</template>

<script setup lang="ts">
// Imports des composants modulaires
import FiltersHeaderNew from '../FiltersHeaderNew.vue'
import BatchDisponibiliteModal from '../components/BatchDisponibiliteModal.vue'
import CollaborateurInfoModal from '../components/CollaborateurInfoModal.vue'
import PlanningStatusPanel from '../components/planning/PlanningStatusPanel.vue'
import PlanningSelectionBar from '../components/planning/PlanningSelectionBar.vue'
import PlanningIndicators from '../components/planning/PlanningIndicators.vue'
import PlanningLoadingModal from '../components/planning/PlanningLoadingModal.vue'

// Placeholder temporaire pour la grille
import { defineComponent, ref, computed } from 'vue'
const PlanningGridPlaceholder = defineComponent({
  template: '<div class="planning-grid-placeholder">Grille du planning à refactoriser</div>'
})

// TODO: Importer le script complet de SemaineVirtualClean.vue
// Pour l'instant, nous devons importer toute la logique existante

// Variables réactives (à extraire en composables)
const selectedCells = ref(new Set())
const isSelectionMode = ref(false)
const isDraggingSelection = ref(false)
const batchModalOpen = ref(false)
const collaborateurInfoModal = ref({ open: false, collaborateur: null, loading: false })

// État du chargement
const loadingCollaborateurs = ref(true)
const loadingDisponibilites = ref(false)
const fetchingRanges = ref(false)
const extending = ref(false)
const isInitialLoad = ref(true)
const allCollaborateurs = ref([])
const visibleDays = ref([])

// Multi-user
const isRealtimeActive = ref(false)
const realtimeListeners = ref([])
const connectedUsers = ref([])
const isEmulatorMode = ref(false)

// Computed properties
const showLoadingModal = computed(() => false) // Temporairement désactivé
const suggestions = computed(() => [])
const isBusy = computed(() => loadingCollaborateurs.value || loadingDisponibilites.value || fetchingRanges.value)
const isEmulator = computed(() => false) // À implémenter
// Placeholders optionnels retirés tant qu'ils ne sont pas utilisés

// Méthodes (à extraire en composables)
function clearSelection() {
  selectedCells.value.clear()
  isSelectionMode.value = false
  isDraggingSelection.value = false
}

function getActiveUsers() {
  return []
}

function showRealtimeStats() {
}

function cleanupSessions() {
}

// Fonctions de navigation et mise à jour supprimées (non utilisées ici)

function handleBatchUpdate() {
}
</script>

<style scoped>
.planning-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.planning-manager {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.excel-planning-container {
  flex: 1;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.planning-grid-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  font-size: 18px;
  font-weight: 500;
}
</style>
