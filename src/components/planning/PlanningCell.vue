<!--
  Cellule individuelle du planning
  Extrait de SemaineVirtualClean.vue pour améliorer la modularité
-->
<template>
  <div
    class="excel-cell"
    :data-day-date="date"
    :data-cell-id="`${collaborateurId}_${date}`"
    :class="[
      getCellClasses(),
      getCellKindClass(collaborateurId, date)
    ]"
    :style="{ width: dayWidth + 'px', height: rowHeight + 'px' }"
    @click="onCellClick"
    @mouseenter="onCellHover"
    @mouseleave="onCellLeave"
  >
    <!-- Icône de verrouillage simple -->
    <div v-if="isLockedByOthers" class="cell-lock-indicator" title="Cellule verrouillée par un autre utilisateur">
      <va-icon name="lock" size="12px" />
    </div>

    <!-- Indicateur de survol collaboratif -->
    <div v-if="isHoveredByOthers" class="cell-presence-indicator">
      <div class="presence-initials-container">
        <template v-for="(initial, idx) in hoveringUserInitials" :key="idx">
          <div
            v-if="initial && initial.trim()"
            class="presence-initial"
            :style="{ backgroundColor: hoveringUserColor }"
            :title="hoveringUserTooltip"
          >
            {{ initial }}
          </div>
        </template>
      </div>
    </div>

    <!-- Disponibilités dans la cellule -->
    <div class="cell-content">
      <div v-if="!cellDispos.length" class="empty-cell">
        <!-- Cellule vide -->
      </div>
      
      <template v-else>
        <div
          v-for="(dispo, idx) in cellDispos"
          :key="`${dispo.id || idx}`"
          class="dispo-bar"
          :class="[
            getDispoBarClass(dispo),
            getDispoTypeClass(dispo),
            getDispoContinuationClass(dispo, date)
          ]"
          :style="getDispoBarStyle()"
          :title="getDispoBarTitle(dispo, date)"
        >
          <div class="dispo-content">
            <span class="dispo-time">{{ timeLabelForCell(dispo, date) }}</span>
            <span v-if="dispo.lieu" class="dispo-lieu">{{ dispo.lieu }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Interface pour les disponibilités
interface Disponibilite {
  id?: string
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
  tenantId: string
  collaborateurId?: string
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  slots?: string[]
  isFullDay?: boolean
  version?: number
  updatedAt?: any
  updatedBy?: string
  _cont?: 'start' | 'end'
}

interface Props {
  collaborateurId: string
  date: string
  dayWidth: number
  rowHeight: number
  cellDispos: Disponibilite[]
  isToday: boolean
  isWeekend: boolean
  isDayLoaded: boolean
  isWeekBoundary: boolean
  isSelected: boolean
  isLockedByOthers: boolean
  isHoveredByOthers: boolean
  hoveringUserInitials: string[]
  hoveringUserColor: string
  hoveringUserTooltip: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [collaborateurId: string, date: string]
  hover: [collaborateurId: string, date: string]
  leave: [collaborateurId: string, date: string]
}>()

// Classes CSS dynamiques pour la cellule
const getCellClasses = () => ({
  'today': props.isToday,
  'weekend': props.isWeekend,
  'has-dispos': props.cellDispos.length > 0,
  'loading-placeholder': !props.isDayLoaded,
  'week-boundary-right': props.isWeekBoundary,
  'selected': props.isSelected,
  'locked': props.isLockedByOthers,
  'has-indicator': props.isLockedByOthers || props.isHoveredByOthers,
  'has-presence': props.isHoveredByOthers
})

// Event handlers
function onCellClick() {
  emit('click', props.collaborateurId, props.date)
}

function onCellHover() {
  emit('hover', props.collaborateurId, props.date)
}

function onCellLeave() {
  emit('leave', props.collaborateurId, props.date)
}

// Helper functions (à implémenter selon la logique existante)
function getCellKindClass(collaborateurId: string, date: string): string {
  // Logique pour déterminer le type de cellule (disponible/indisponible/etc.)
  return 'cell-kind-default'
}

function getDispoBarClass(dispo: Disponibilite): string {
  const type = dispo.type || 'disponible'
  return `dispo-${type}`
}

function getDispoTypeClass(dispo: Disponibilite): string {
  return `type-${dispo.type || 'disponible'}`
}

function getDispoContinuationClass(dispo: Disponibilite, cellDate: string): string {
  if (dispo._cont === 'start') return 'continuation-start'
  if (dispo._cont === 'end') return 'continuation-end'
  return ''
}

function getDispoBarStyle(): object {
  return {}
}

function getDispoBarTitle(dispo: Disponibilite, cellDate: string): string {
  const timeLabel = timeLabelForCell(dispo, cellDate)
  const lieu = dispo.lieu ? ` - ${dispo.lieu}` : ''
  return `${timeLabel}${lieu}`
}

function timeLabelForCell(dispo: Disponibilite, day: string): string {
  const s = dispo.heure_debut?.substring(0, 5) || ''
  const e = dispo.heure_fin?.substring(0, 5) || ''
  
  if (!s || !e) return ''
  
  // Logique simplifiée pour l'affichage des heures
  if (dispo._cont === 'start') return `${s}→…`
  if (dispo._cont === 'end') return `…→${e}`
  
  return `${s}-${e}`.replace(':00', '').replace(':00', '') + 'h'
}
</script>

<style scoped>
.excel-cell {
  position: relative;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.excel-cell:hover {
  background: rgba(33, 150, 243, 0.05);
}

.excel-cell.today {
  background: rgba(255, 235, 59, 0.1);
  border-right-color: #FFC107;
}

.excel-cell.weekend {
  background: rgba(158, 158, 158, 0.05);
}

.excel-cell.has-dispos {
  background: rgba(76, 175, 80, 0.05);
}

.excel-cell.selected {
  background: rgba(33, 150, 243, 0.2);
  border: 2px solid #2196F3;
  z-index: 10;
}

.excel-cell.locked {
  background: rgba(244, 67, 54, 0.1);
  border-color: #f44336;
}

.excel-cell.has-presence {
  background: rgba(156, 39, 176, 0.1);
}

.excel-cell.loading-placeholder {
  background: #f5f5f5;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.excel-cell.week-boundary-right {
  border-right: 2px solid #666;
}

.cell-lock-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 20;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.cell-presence-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 15;
}

.presence-initials-container {
  display: flex;
  gap: 1px;
}

.presence-initial {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 600;
  color: white;
  border: 1px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.cell-content {
  flex: 1;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.empty-cell {
  flex: 1;
}

.dispo-bar {
  background: #4CAF50;
  color: white;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  min-height: 14px;
  display: flex;
  align-items: center;
  overflow: hidden;
  transition: all 0.2s ease;
}

.dispo-bar:hover {
  transform: scale(1.02);
  z-index: 10;
}

.dispo-disponible {
  background: #4CAF50;
}

.dispo-mission {
  background: #FF9800;
}

.dispo-indisponible {
  background: #f44336;
}

.continuation-start {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  position: relative;
}

.continuation-start::after {
  content: '→';
  position: absolute;
  right: -1px;
  font-size: 8px;
}

.continuation-end {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  position: relative;
}

.continuation-end::before {
  content: '←';
  position: absolute;
  left: -1px;
  font-size: 8px;
}

.dispo-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.dispo-time {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dispo-lieu {
  font-size: 8px;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Responsive pour mobile */
@media (max-width: 768px) {
  .excel-cell {
    min-width: 80px;
  }
  
  .dispo-bar {
    font-size: 9px;
    padding: 1px 2px;
    min-height: 12px;
  }
  
  .cell-lock-indicator,
  .presence-initial {
    width: 14px;
    height: 14px;
    font-size: 7px;
  }
}
</style>
