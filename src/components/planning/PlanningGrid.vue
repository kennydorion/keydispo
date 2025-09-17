<!--
  Grille de planning virtuelle
  Extrait de SemaineVirtualClean.vue pour améliorer la modularité
  Gère la virtualisation et l'affichage des données de planning
-->
<template>
  <div 
    ref="containerRef"
    class="planning-grid-container"
    :class="{ 
      'mobile': isMobile,
      'collaborateur-mode': collaborateurMode
    }"
    @scroll="handleScroll"
  >
    <!-- En-tête fixe avec les dates -->
    <div class="grid-header" :style="{ paddingLeft: stickyLeftWidth + 'px' }">
      <DateHeaderCell
        v-for="date in visibleDates"
        :key="date"
        :date="date"
        :column-width="columnWidth"
        :header-height="headerHeight"
        :availability-count="getAvailabilityCountForDate(date)"
        :is-selected="selectedDates.includes(date)"
        :title="getMonthName(date) + ' ' + date.substring(8,10)"
        @select-date="handleDateSelect"
      />
    </div>

    <!-- Grille virtuelle des données -->
    <div 
      class="grid-body"
      :style="{ 
        height: virtualHeight + 'px',
        paddingTop: offsetY + 'px'
      }"
    >
      <!-- Lignes de collaborateurs visibles -->
      <div
        v-for="(collaborateur, index) in visibleCollaborateurs"
        :key="collaborateur.id"
        class="planning-row"
        :style="{ 
          height: rowHeight + 'px',
          transform: `translateY(${(startIndex + index) * rowHeight}px)`,
          '--collaborateur-bg-color': getCollaborateurBackgroundColor(collaborateur.color)
        }"
      >
        <!-- Colonne collaborateur (sticky) -->
        <CollaborateurColumn
          :collaborateur="collaborateur"
          :sticky-left-width="stickyLeftWidth"
          :row-height="rowHeight"
          @open-info="$emit('openCollaborateurInfo', $event)"
        />

        <!-- Cellules de planning -->
        <div class="planning-cells">
          <div
            v-for="date in visibleDates"
            :key="`${collaborateur.id}-${date}`"
            class="planning-cell"
            :class="{
              'today': isDateToday(date),
              'weekend': isDateWeekend(date),
              'selected': isCellSelected(collaborateur.id, date),
              'locked': !!getCellLockInfo(collaborateur.id, date),
              'has-dispo': getCellDisposForCell(collaborateur.id, date).length > 0,
              'hovered-by-others': props.isHoveredByOthers?.(collaborateur.id, date)
            }"
            :style="{ 
              width: columnWidth + 'px', 
              height: rowHeight + 'px',
              '--hovering-user-color': props.getHoveringUserColor?.(collaborateur.id, date) || '#2196F3'
            }"
            :data-hovering-initials="props.getHoveringUserInitials?.(collaborateur.id, date)"
            @click.stop="handleCellClick(collaborateur.id, date, $event as MouseEvent)"
            @mouseenter="handleCellHover(collaborateur.id, date, $event as MouseEvent)"
            @mouseleave="handleCellLeave(collaborateur.id, date, $event as MouseEvent)"
            :title="`${collaborateur.prenom} ${collaborateur.nom} — ${date}`"
          >
              <div class="cell-content">
              <div class="cell-chip" v-if="getCellDisposForCell(collaborateur.id, date).length">
                {{ getCellDisposForCell(collaborateur.id, date).length }} dispo(s)
              </div>

              <!-- Badges de disponibilités (missions/indispos/dispos) -->
              <div class="cell-badges" v-if="getCellDisposForCell(collaborateur.id, date).length">
                <span
                  v-for="dispo in getCellDisposForCell(collaborateur.id, date).slice(0, 3)"
                  :key="dispo.id || dispo.lieu + '-' + dispo.heure_debut + '-' + dispo.heure_fin"
                  class="dispo-badge"
                  :class="getBadgeClass(dispo)"
                  :title="getBadgeTitle(dispo)"
                >
                  {{ getBadgeLabel(dispo) }}
                </span>
                <span v-if="getCellDisposForCell(collaborateur.id, date).length > 3" class="dispo-badge more">+{{ getCellDisposForCell(collaborateur.id, date).length - 3 }}</span>
              </div>
              
              <!-- Indicateur de survol par d'autres utilisateurs -->
              <div 
                v-if="props.isHoveredByOthers?.(collaborateur.id, date)"
                class="hovering-indicator"
                :style="{ borderColor: props.getHoveringUserColor?.(collaborateur.id, date) }"
              >
                <span class="hovering-initials">
                  {{ props.getHoveringUserInitials?.(collaborateur.id, date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Indicateur de chargement -->
    <div v-if="isLoading" class="loading-overlay">
      <va-progress-circle indeterminate size="40" />
      <span>Chargement des données...</span>
    </div>

    <!-- Message si aucune donnée -->
    <div v-if="!isLoading && collaborateurs.length === 0" class="empty-state">
      <va-icon name="event_busy" size="48px" color="#ccc" />
      <p>Aucun collaborateur trouvé</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import CollaborateurColumn from './CollaborateurColumn.vue'
import DateHeaderCell from './DateHeaderCell.vue'
import { resolveDispoKind, getDispoTypeClass, getTemporalDisplay } from '@/services/planningDisplayService'
// PlanningCell temporairement retiré pour stabiliser le build

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

interface Disponibilite {
  id?: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  ville: string
  date: string
  lieu: string
  heure_debut: string
  heure_fin: string
  version: number
  updatedAt?: any
  updatedBy?: string
  isOvernight?: boolean
  isContinuation?: boolean
  [key: string]: any
}

interface CellLockInfo {
  userId: string
  userName: string
  timestamp: number
}

interface Props {
  collaborateurs: Collaborateur[]
  disponibilites: Disponibilite[]
  dates: string[]
  selectedDates: string[]
  selectedCells: Set<string>
  cellLocks: Map<string, CellLockInfo>
  isLoading?: boolean
  columnWidth?: number
  rowHeight?: number
  headerHeight?: number
  stickyLeftWidth?: number
  collaborateurMode?: boolean
  // Props pour gestion multiuser des survols
  isHoveredByOthers?: (collaborateurId: string, date: string) => boolean
  getHoveringUserColor?: (collaborateurId: string, date: string) => string
  getHoveringUserInitials?: (collaborateurId: string, date: string) => string
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  columnWidth: 100,
  rowHeight: 60,
  headerHeight: 80,
  stickyLeftWidth: 200,
  collaborateurMode: false,
  isHoveredByOthers: () => false,
  getHoveringUserColor: () => '#2196F3',
  getHoveringUserInitials: () => '',
})

const emit = defineEmits<{
  openCollaborateurInfo: [collaborateur: Collaborateur]
  cellClick: [collaborateurId: string, date: string, event: MouseEvent]
  cellHover: [collaborateurId: string, date: string, event: MouseEvent]
  cellLeave: [collaborateurId: string, date: string, event: MouseEvent]
  dateSelect: [date: string]
}>()

// Refs pour la virtualisation
const containerRef = ref<HTMLElement>()

// État de défilement
const scrollTop = ref(0)
const scrollLeft = ref(0)

// Détection responsive simple
const isMobile = ref(false)

function updateMobileState() {
  isMobile.value = window.innerWidth < 768
}

// Virtualisation des lignes - simplifiée
const containerHeight = ref(600) // Valeur par défaut
const itemsPerPage = computed(() => {
  if (!containerHeight.value || props.rowHeight <= 0) return 10
  return Math.ceil(containerHeight.value / props.rowHeight) + 5 // Buffer
})

const startIndex = computed(() => {
  if (!containerHeight.value || props.rowHeight <= 0) return 0
  return Math.floor(scrollTop.value / props.rowHeight)
})

const endIndex = computed(() => {
  return Math.min(startIndex.value + itemsPerPage.value, props.collaborateurs.length)
})

const visibleCollaborateurs = computed(() => {
  return props.collaborateurs.slice(startIndex.value, endIndex.value)
})

const offsetY = computed(() => startIndex.value * props.rowHeight)
const virtualHeight = computed(() => props.collaborateurs.length * props.rowHeight)

// Virtualisation des colonnes (pour mobile principalement)
const containerWidth = ref(800) // Valeur par défaut
const visibleColumnsCount = computed(() => {
  if (!containerWidth.value || props.columnWidth <= 0) return props.dates.length
  const maxVisible = Math.ceil((containerWidth.value - props.stickyLeftWidth) / props.columnWidth) + 2
  return Math.min(maxVisible, props.dates.length)
})

const startColumnIndex = computed(() => {
  if (!containerWidth.value || props.columnWidth <= 0) return 0
  return Math.floor(scrollLeft.value / props.columnWidth)
})

const endColumnIndex = computed(() => {
  return Math.min(startColumnIndex.value + visibleColumnsCount.value, props.dates.length)
})

const visibleDates = computed(() => {
  return props.dates.slice(startColumnIndex.value, endColumnIndex.value)
})

// Observer les dimensions du conteneur
function observeContainer() {
  if (!containerRef.value) return
  
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      containerWidth.value = entry.contentRect.width
      containerHeight.value = entry.contentRect.height
    }
  })
  
  resizeObserver.observe(containerRef.value)
  
  // Valeurs initiales
  const rect = containerRef.value.getBoundingClientRect()
  containerWidth.value = rect.width
  containerHeight.value = rect.height
  
  return () => resizeObserver.disconnect()
}

// Gestion du défilement
function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  scrollLeft.value = target.scrollLeft
}

// Données utilitaires
function getCellDisposForCell(collaborateurId: string, date: string): Disponibilite[] {
  const collab = props.collaborateurs.find(c => c.id === collaborateurId)
  if (!collab) return []
  
  return props.disponibilites.filter(d => {
    const matchById = d.collaborateurId ? d.collaborateurId === collaborateurId : false
    const matchByName = d.nom === collab.nom && d.prenom === collab.prenom
    return (matchById || matchByName) && d.date === date
  })
}

function isDateToday(date: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return date === today
}

function isDateWeekend(date: string): boolean {
  const day = new Date(date).getDay()
  return day === 0 || day === 6 // Dimanche ou Samedi
}

function getMonthName(date: string): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  const monthIndex = new Date(date).getMonth()
  return months[monthIndex]
}

function getAvailabilityCountForDate(date: string): number {
  return props.disponibilites.filter(d => d.date === date).length
}

function isCellSelected(collaborateurId: string, date: string): boolean {
  return props.selectedCells.has(`${collaborateurId}-${date}`)
}

function getCellLockInfo(collaborateurId: string, date: string): CellLockInfo | null {
  return props.cellLocks.get(`${collaborateurId}-${date}`) || null
}

// Générer une couleur de fond subtile à partir de la couleur du collaborateur
function getCollaborateurBackgroundColor(color?: string): string {
  if (!color) return 'rgba(97, 118, 132, 0.02)' // Couleur par défaut très subtile
  
  // Convertir hex en rgba avec opacité faible
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  return `rgba(${r}, ${g}, ${b}, 0.05)` // Opacité très faible pour subtilité
}

// Gestionnaires d'événements
function handleCellClick(collaborateurId: string, date: string, event: MouseEvent) {
  emit('cellClick', collaborateurId, date, event)
}

function handleCellHover(collaborateurId: string, date: string, event: MouseEvent) {
  emit('cellHover', collaborateurId, date, event)
}

function handleCellLeave(collaborateurId: string, date: string, event: MouseEvent) {
  emit('cellLeave', collaborateurId, date, event)
}

function handleDateSelect(date: string) {
  emit('dateSelect', date)
}

// Badges helpers
function getBadgeClass(dispo: Disponibilite): string[] {
  const cls = getDispoTypeClass(dispo as any)
  return ['badge', cls]
}

function getBadgeLabel(dispo: Disponibilite): string {
  const kind = resolveDispoKind(dispo as any)
  if (kind.type === 'mission') {
    const label = (dispo.lieu && dispo.lieu.trim()) ? dispo.lieu : 'Mission'
    const time = getTemporalDisplay(dispo as any)
    return time && time !== 'Journée' ? `${label} • ${time}` : label
  }
  if (kind.type === 'indisponible') {
    const time = getTemporalDisplay(dispo as any)
    return time && time !== 'Journée' ? `Indispo • ${time}` : 'Indispo'
  }
  const time = getTemporalDisplay(dispo as any)
  return time && time !== 'Journée' ? `Dispo • ${time}` : 'Dispo'
}

function getBadgeTitle(dispo: Disponibilite): string {
  const kind = resolveDispoKind(dispo as any)
  const time = getTemporalDisplay(dispo as any)
  const base = kind.type.charAt(0).toUpperCase() + kind.type.slice(1)
  if (kind.type === 'mission') {
    const label = (dispo.lieu && dispo.lieu.trim()) ? dispo.lieu : 'Mission'
    return `${base}: ${label}${time ? ` (${time})` : ''}`
  }
  return `${base}${time ? ` (${time})` : ''}`
}

// Gestion du redimensionnement
function handleResize() {
  updateMobileState()
  nextTick(() => {
    // Forcer la re-évaluation de la virtualisation
    scrollTop.value = scrollTop.value
  })
}

onMounted(() => {
  updateMobileState()
  window.addEventListener('resize', handleResize)
  const cleanup = observeContainer()
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (cleanup) cleanup()
  })
})
</script>

<style scoped>
.planning-grid-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.grid-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: white;
  border-bottom: 2px solid #e0e0e0;
  display: flex;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.grid-body {
  position: relative;
  min-height: 100%;
}

.planning-row {
  position: absolute;
  width: 100%;
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background: var(--collaborateur-bg-color, white);
  transition: background-color 0.2s ease;
}

.planning-row:hover {
  background: var(--collaborateur-bg-color, rgba(0, 0, 0, 0.02));
  filter: brightness(0.98);
}

.planning-cells {
  display: flex;
  flex: 1;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 50;
}

.loading-overlay span {
  color: #666;
  font-weight: 500;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #666;
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
}

/* Mode mobile */
.planning-grid-container.mobile {
  font-size: 14px;
}

.planning-grid-container.mobile .grid-header {
  padding-left: 150px !important;
}

/* Optimisations de performance */
.planning-row {
  will-change: transform;
}

.planning-cells {
  contain: layout style;
}

/* Scrollbars personnalisées */
.planning-grid-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.planning-grid-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.planning-grid-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.planning-grid-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Animation fluide pour le défilement */
.planning-grid-container {
  scroll-behavior: smooth;
}

/* Performance optimizations */
.planning-row,
.planning-cells,
.grid-header {
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Mode Collaborateur - Thème blanc et adaptatif */
.planning-grid-container.collaborateur-mode {
  --planning-bg: #ffffff;
  --planning-border: #e0e7ff;
  --planning-header-bg: #f8fafc;
  --planning-text: #374151;
  --planning-accent: #6366f1;
  background: var(--planning-bg);
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.planning-grid-container.collaborateur-mode .grid-header {
  background: var(--planning-header-bg);
  border-bottom: 1px solid var(--planning-border);
  color: var(--planning-text);
}

.planning-grid-container.collaborateur-mode .planning-row {
  background: var(--planning-bg);
  border-bottom: 1px solid var(--planning-border);
}

.planning-grid-container.collaborateur-mode .planning-row:hover {
  background: #f9fafb;
}

/* Cellules spécifiques mode collaborateur */
.planning-grid-container.collaborateur-mode .planning-cell {
  border-color: var(--planning-border);
  color: var(--planning-text);
}

.planning-grid-container.collaborateur-mode .planning-cell:hover {
  background: #f0f4ff;
  border-color: var(--planning-accent);
}

.planning-grid-container.collaborateur-mode .planning-cell.has-dispo {
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  border-color: var(--planning-accent);
  color: var(--planning-text);
}

.planning-grid-container.collaborateur-mode .planning-cell.has-dispo:hover {
  background: linear-gradient(135deg, #c7d2fe, #a5b4fc);
}

/* Styles généraux pour les cellules de planning */
.planning-cell {
  border: 1px solid #e0e7ff;
  background: #ffffff;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.planning-cell:hover {
  background: #f0f4ff;
}

.planning-cell.has-dispo {
  background: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #4CAF50;
}

.planning-cell.selected {
  background: rgba(255, 152, 0, 0.2);
  border: 2px solid #ff9800;
}

.planning-cell.hovered-by-others {
  background: rgba(33, 150, 243, 0.1);
  border: 2px solid var(--hovering-user-color, #2196F3);
  box-shadow: 0 0 8px rgba(33, 150, 243, 0.3);
  animation: pulse-hover 2s infinite;
}

@keyframes pulse-hover {
  0%, 100% { 
    box-shadow: 0 0 8px rgba(33, 150, 243, 0.3);
  }
  50% { 
    box-shadow: 0 0 12px var(--hovering-user-color, rgba(33, 150, 243, 0.5));
  }
}

.cell-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell-chip {
  background: #4CAF50;
  color: white;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.cell-badges {
  position: absolute;
  bottom: 6px;
  left: 8px;
  right: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.dispo-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  background: #eef2f7;
  color: #334155;
  border: 1px solid #e2e8f0;
  max-width: 100%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.dispo-badge.more {
  background: #e5e7eb;
  color: #374151;
}

/* Couleurs par type via classes de planningDisplayService */
.dispo-card-mission {
  background: #fff7ed;
  color: #7c2d12;
  border-color: #fdba74;
}
.dispo-card-indisponible {
  background: #fee2e2;
  color: #7f1d1d;
  border-color: #fca5a5;
}
.dispo-card-disponible {
  background: #dcfce7;
  color: #065f46;
  border-color: #86efac;
}

.hovering-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: 2px solid var(--hovering-user-color, #2196F3);
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.hovering-initials {
  color: var(--hovering-user-color, #2196F3);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

/* Scrollbars pour mode collaborateur */
.planning-grid-container.collaborateur-mode::-webkit-scrollbar-track {
  background: var(--planning-header-bg);
}

.planning-grid-container.collaborateur-mode::-webkit-scrollbar-thumb {
  background: var(--planning-border);
}

.planning-grid-container.collaborateur-mode::-webkit-scrollbar-thumb:hover {
  background: var(--planning-accent);
}
</style>
