<!--
  Wrapper principal du planning avec virtualisation optimisée
  Version refactorisée de SemaineVirtualClean.vue avec composants modulaires
-->
<template>
  <div class="planning-container" :class="{ 'mobile': isMobile }">
    <!-- Panneau de statut -->
    <PlanningStatusPanel
      :is-realtime-active="realtimeStatus === 'connected'"
      :realtime-listeners="['dispos', 'collaborateurs']"
      :active-users="activeUsers"
      :connected-users="connectedUsers"
      :is-emulator-mode="emulatorMode"
      @show-realtime-stats="handleForceSync"
      @cleanup-sessions="handleForceSync"
    />

    <!-- Barre de sélection -->
    <PlanningSelectionBar
      :selected-cells="selectedCells"
      :is-selection-mode="isBatchMode"
      :is-dragging-selection="false"
      @clear-selection="clearSelection"
      @open-batch-modal="openBatchModal"
    />

    <!-- Indicateurs et suggestions -->
    <PlanningIndicators
      :suggestions="optimizationSuggestions"
      :extending="false"
      :is-busy="isLoading"
      :is-initial-load="planningData.isInitialLoad.value"
      :fetching-ranges="planningData.fetchingRanges.value.length > 0"
      :is-emulator="emulatorMode"
    />

  <!-- Header de filtres compact -->
  <FiltersHeaderNew />

    <!-- Grille principale -->
    <div class="planning-grid-wrapper">
      <PlanningGrid
        ref="planningGridRef"
        :collaborateurs="collaborateurs"
        :disponibilites="disponibilites"
        :dates="dateArray"
        :selected-dates="selectedDates"
        :selected-cells="selectedCells"
        :cell-locks="cellLocks"
        :is-loading="isGridLoading"
        :column-width="columnWidth"
        :row-height="rowHeight"
        :header-height="headerHeight"
        :sticky-left-width="stickyLeftWidth"
        :is-hovered-by-others="isHoveredByOthers"
        :get-hovering-user-color="getHoveringUserColor"
        :get-hovering-user-initials="getHoveringUserInitials"
        @open-collaborateur-info="openCollaborateurInfo"
        @cell-click="handleCellClick"
        @cell-hover="handleCellHover"
        @cell-leave="handleCellLeave"
        @date-select="handleDateSelect"
      />
    </div>

    <!-- Modal de chargement -->
    <PlanningLoadingModal
      :show-modal="showLoadingModal"
      :loading-collaborateurs="isLoading"
      :loading-disponibilites="planningData.loadingDisponibilites.value"
      :fetching-ranges="planningData.fetchingRanges.value.length > 0"
      :all-collaborateurs-count="collaborateurs.length"
      :visible-days-count="dateArray.length"
    />

    <!-- Modals existantes (gardées depuis le fichier original) -->
    <va-modal
      v-model="showInfoModal"
      title="Informations Collaborateur"
      size="medium"
      :mobile-fullscreen="isMobile"
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="modalA11y.onClose"
    >
      <div v-if="selectedCollaborateur" class="collab-info-modal">
        <div class="info-section">
          <h3>{{ selectedCollaborateur.prenom }} {{ selectedCollaborateur.nom }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Métier:</span>
              <span class="value">{{ selectedCollaborateur.metier || 'Non spécifié' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ville:</span>
              <span class="value">{{ selectedCollaborateur.ville || 'Non spécifiée' }}</span>
            </div>
            <div class="info-item" v-if="selectedCollaborateur.phone">
              <span class="label">Téléphone:</span>
              <span class="value">{{ selectedCollaborateur.phone }}</span>
            </div>
            <div class="info-item" v-if="selectedCollaborateur.email">
              <span class="label">Email:</span>
              <span class="value">{{ selectedCollaborateur.email }}</span>
            </div>
          </div>
        </div>
        
        <!-- Disponibilités du collaborateur -->
        <div class="info-section">
          <h4>Disponibilités</h4>
          <div class="disponibilites-list">
            <div 
              v-for="dispo in getCollaborateurDisponibilites(selectedCollaborateur)"
              :key="`${dispo.date}-${dispo.lieu}`"
              class="dispo-item"
            >
              <span class="date">{{ formatDate(dispo.date) }}</span>
              <span class="lieu">{{ dispo.lieu }}</span>
              <span class="horaire">{{ dispo.heure_debut }} - {{ dispo.heure_fin }}</span>
            </div>
          </div>
        </div>
      </div>
    </va-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useModalA11y } from '@/composables/useModalA11y'
import PlanningStatusPanel from './PlanningStatusPanel.vue'
import PlanningSelectionBar from './PlanningSelectionBar.vue'
import PlanningIndicators from './PlanningIndicators.vue'
import PlanningGrid from './PlanningGrid.vue'
import PlanningLoadingModal from './PlanningLoadingModal.vue'
import FiltersHeaderNew from '../FiltersHeaderNew.vue'
import { usePlanningData } from '@/composables/usePlanningData'
import { usePlanningFilters } from '@/composables/usePlanningFilters'
import { useCollabPresence } from '@/composables/useCollabPresence'
import { hybridMultiUserService as collaborationService } from '@/services/hybridMultiUserService'
import { AuthService } from '@/services/auth'
import { auth } from '@/services/firebase'
import { getUserInitials } from '@/services/avatarUtils'

interface Collaborateur {
  id: string
  nom: string
  prenom: string
  email?: string
  phone?: string
  metier?: string
  ville?: string
  color?: string
  [key: string]: any
}

interface CellLockInfo {
  userId: string
  userName: string
  timestamp: number
}

interface UserInSession {
  id: string
  name: string
  email: string
  color: string
  lastSeen: number
}

// Configuration du composant
const planningGridRef = ref<InstanceType<typeof PlanningGrid>>()

// Dimensions et configuration
const columnWidth = ref(100)
const rowHeight = ref(60)
const headerHeight = ref(80)
const stickyLeftWidth = ref(200)
const isMobile = ref(false)

// États de l'interface
const showInfoModal = ref(false)
const showLoadingModal = ref(false)
const selectedCollaborateur = ref<Collaborateur | null>(null)
const modalA11y = useModalA11y()
const selectedCells = ref(new Set<string>())
const selectedDates = ref<string[]>([])
const selectedCollaborateurs = ref<string[]>([])
const cellLocks = ref(new Map<string, CellLockInfo>())

// États de chargement
const loadingProgress = ref(0)
const loadingMessage = ref('')

// Données du planning avec les composables centralisés
const planningData = usePlanningData()
const planningFilters = usePlanningFilters()

// Extraction des données filtrées
const {
  filteredCollaborateurs: collaborateurs,
  filteredDisponibilites: disponibilites,
  isLoading,
  loadCollaborateurs,
  getDisponibilitiesByDateRange
} = planningData

// États temps réel
const realtimeStatus = ref('connected')
const usersInSession = ref<UserInSession[]>([])
const emulatorMode = ref(false)
const optimizationSuggestions = ref<string[]>([])

// Gestion multi-utilisateur et présence
const visibleDaysForPresence = computed(() => dateArray.value.map(date => ({ date })))
const presenceRowsRef = ref<Array<{ id: string }>>([])

// Fonction pour obtenir la couleur utilisateur (simulée pour l'instant)
function getUserColorWrapper(uid: string): string {
  // Couleurs par défaut basées sur l'ID utilisateur
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4']
  const hash = uid.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Configuration du composable useCollabPresence
const {
  isHoveredByOthers,
  getHoveringUserColor,
  getHoveringUserInitials,
} = useCollabPresence(
  collaborationService,
  visibleDaysForPresence,
  computed(() => presenceRowsRef.value),
  (u: any) => getUserInitials(u),
  (uid: string) => getUserColorWrapper(uid),
)

// Variables pour gérer les timers de debounce du survol
let hoverDebounceTimer: ReturnType<typeof setTimeout> | null = null
let hoverEndGraceTimer: ReturnType<typeof setTimeout> | null = null

// Transformation des données pour compatibilité avec les composants
const activeUsers = computed(() => 
  usersInSession.value.map(user => ({
    userId: user.id,
    userName: user.name,
    status: 'active' as const
  }))
)

const connectedUsers = computed(() => 
  usersInSession.value.map(user => ({
    uid: user.id,
    displayName: user.name,
    email: user.email,
    color: user.color,
    lastSeen: user.lastSeen
  }))
)

// Génération des dates basée sur les filtres ou par défaut 7 jours
const dateArray = computed(() => {
  const dateFrom = planningFilters.filterState.dateFrom
  const dateTo = planningFilters.filterState.dateTo
  
  // Si des dates sont sélectionnées dans les filtres, les utiliser
  if (dateFrom && dateTo) {
    const dates: string[] = []
    const startDate = new Date(dateFrom)
    const endDate = new Date(dateTo)
    
    // Générer toutes les dates entre dateFrom et dateTo
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }
  
  // Si seulement dateFrom est spécifiée, afficher 7 jours à partir de cette date
  if (dateFrom) {
    const dates: string[] = []
    const startDate = new Date(dateFrom)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }
  
  // Si seulement dateTo est spécifiée, afficher 7 jours jusqu'à cette date
  if (dateTo) {
    const dates: string[] = []
    const endDate = new Date(dateTo)
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(endDate.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }
  
  // Par défaut : 7 jours à partir d'aujourd'hui
  const dates: string[] = []
  const today = new Date()
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  return dates
})

// États calculés
const isGridLoading = computed(() => isLoading.value)
const isBatchMode = computed(() => selectedCells.value.size > 1)

// Gestion des modals et interactions
function openCollaborateurInfo(collaborateur: Collaborateur) {
  selectedCollaborateur.value = collaborateur
  showInfoModal.value = true
}

function handleCellClick(collaborateurId: string, date: string, event: MouseEvent) {
  const cellKey = `${collaborateurId}-${date}`
  
  if (event.ctrlKey || event.metaKey) {
    // Sélection multiple
    if (selectedCells.value.has(cellKey)) {
      selectedCells.value.delete(cellKey)
    } else {
      selectedCells.value.add(cellKey)
    }
  } else {
    // Sélection simple
    selectedCells.value.clear()
    selectedCells.value.add(cellKey)
  }
  
  updateSelectionState()
}

function handleCellHover(collaborateurId: string, date: string, _event: MouseEvent) {
  // Gestion du survol collaboratif
  handleCellHoverDebounced(collaborateurId, date)
}

function handleCellLeave(_collaborateurId: string, _date: string, _event: MouseEvent) {
  // Gestion de la sortie du survol collaboratif
  handleCellHoverEnd()
}

/**
 * Gérer le survol d'une cellule (avec debounce)
 */
function handleCellHoverDebounced(collaborateurId: string, date: string) {
  // Annuler le timer de fin de hover si on revient rapidement
  if (hoverEndGraceTimer) {
    clearTimeout(hoverEndGraceTimer)
    hoverEndGraceTimer = null
  }

  // Annuler le timer précédent de debounce s'il existe
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer)
  }

  // Équilibre entre réactivité et performance
  hoverDebounceTimer = setTimeout(() => {
    if (collaborationService && typeof collaborationService.updateHoveredCell === 'function') {
      collaborationService.updateHoveredCell(collaborateurId, date)
    }
  }, 10) // 10ms - bon compromis
}

/**
 * Gérer la sortie du survol d'une cellule (immédiat)
 */
function handleCellHoverEnd() {
  // Annuler le timer de debounce (on ne veut plus envoyer un nouveau hover)
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer)
    hoverDebounceTimer = null
  }

  // Timer de grâce : on attend un peu avant de vraiment supprimer le hover
  // (au cas où l'utilisateur repasse la souris sur une autre cellule rapidement)
  hoverEndGraceTimer = setTimeout(() => {
    if (collaborationService && typeof collaborationService.clearHoveredCell === 'function') {
      collaborationService.clearHoveredCell()
    }
    hoverEndGraceTimer = null
  }, 50) // 50ms de grâce
}

function handleDateSelect(date: string) {
  if (selectedDates.value.includes(date)) {
    selectedDates.value = selectedDates.value.filter(d => d !== date)
  } else {
    selectedDates.value.push(date)
  }
}

function updateSelectionState() {
  // Mettre à jour les collaborateurs et dates sélectionnés
  const collabIds = new Set<string>()
  const dates = new Set<string>()
  
  selectedCells.value.forEach(cellKey => {
    const [collaborateurId, date] = cellKey.split('-')
    collabIds.add(collaborateurId)
    dates.add(date)
  })
  
  selectedCollaborateurs.value = Array.from(collabIds)
  selectedDates.value = Array.from(dates)
}

function clearSelection() {
  selectedCells.value.clear()
  selectedDates.value = []
  selectedCollaborateurs.value = []
}

function openBatchModal() {
  // Ouvrir le modal de traitement par lot
  
}

function handleForceSync() {
  // Forcer la synchronisation
  
}

// Utilitaires
function getCollaborateurDisponibilites(collaborateur: Collaborateur): any[] {
  return disponibilites.value.filter((d: any) => {
    const matchById = d.collaborateurId ? d.collaborateurId === collaborateur.id : false
    const matchByName = d.nom === collaborateur.nom && d.prenom === collaborateur.prenom
    return matchById || matchByName
  })
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Détection mobile
function updateMobileState() {
  isMobile.value = window.innerWidth < 768
}

// Lifecycle
onMounted(async () => {
  updateMobileState()
  window.addEventListener('resize', updateMobileState)
  
  // Initialiser le service de collaboration
  try {
    if (auth.currentUser && AuthService.currentTenantId) {
      const tenantId = AuthService.currentTenantId
      await (collaborationService as any).init(tenantId, {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email || 'Utilisateur',
        userEmail: auth.currentUser.email || ''
      })
      
      // Mettre à jour les lignes de présence avec les collaborateurs
      setTimeout(() => {
        presenceRowsRef.value = collaborateurs.value.map(c => ({ id: c.id }))
      }, 100)
    }
  } catch (error) {
    console.warn('Impossible d\'initialiser le service de collaboration:', error)
  }
  
  // Charger les données initiales
  showLoadingModal.value = true
  loadingMessage.value = 'Chargement des collaborateurs...'
  
  try {
    await loadCollaborateurs()
    loadingProgress.value = 50
    
    loadingMessage.value = 'Chargement des disponibilités...'
    const startDate = dateArray.value[0]
    const endDate = dateArray.value[dateArray.value.length - 1]
    await getDisponibilitiesByDateRange(startDate, endDate)
    
    loadingProgress.value = 100
  } catch (error) {
    console.error('Erreur lors du chargement:', error)
  } finally {
    setTimeout(() => {
      showLoadingModal.value = false
      loadingProgress.value = 0
    }, 500)
  }
})

// Watcher pour mettre à jour le planning quand les dates des filtres changent
watch(
  () => dateArray.value,
  async (newDateArray: string[], oldDateArray: string[] | undefined) => {
    // Éviter les mises à jour inutiles
    if (JSON.stringify(newDateArray) === JSON.stringify(oldDateArray)) return
    
    
    
    // Afficher un feedback de chargement si les dates ont vraiment changé
    if (newDateArray.length > 0) {
      loadingMessage.value = 'Mise à jour de la période...'
      
      // Optionnel : recharger les disponibilités pour la nouvelle période
      // Le composable usePlanningData le fait déjà automatiquement
      // mais on peut forcer un rafraîchissement si nécessaire
      
      // Mettre à jour les lignes de présence
      setTimeout(() => {
        presenceRowsRef.value = collaborateurs.value.map(c => ({ id: c.id }))
      }, 100)
    }
  },
  { immediate: false }
)

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileState)
  
  // Nettoyer les timers et le service de collaboration
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer)
  }
  if (hoverEndGraceTimer) {
    clearTimeout(hoverEndGraceTimer)
  }
  
  if (collaborationService) {
    collaborationService.cleanup()
  }
})
</script>

<style scoped>
.planning-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f9fa;
  overflow: hidden;
}

.planning-grid-wrapper {
  flex: 1;
  min-height: 0;
  margin: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: white;
  overflow: hidden;
}

.planning-container.mobile .planning-grid-wrapper {
  margin: 8px;
  border-radius: 8px;
}

/* Modal styles */
.collab-info-modal {
  padding: 16px;
}

.info-section {
  margin-bottom: 24px;
}

.info-section h3 {
  color: #1a1a1a;
  margin-bottom: 16px;
  font-size: 20px;
  font-weight: 600;
}

.info-section h4 {
  color: #333;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item .value {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

.disponibilites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.dispo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #2196F3;
}

.dispo-item .date {
  font-size: 12px;
  font-weight: 600;
  color: #2196F3;
  min-width: 80px;
}

.dispo-item .lieu {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
  flex: 1;
}

.dispo-item .horaire {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .dispo-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .dispo-item .date {
    min-width: auto;
  }
}
</style>
