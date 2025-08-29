<!--
  En-tête de colonne de date dans le planning
  Extrait de SemaineVirtualClean.vue pour améliorer la modularité
-->
<template>
  <div 
    class="date-header-cell"
    :class="{
      'weekend': isWeekend,
      'today': isToday,
      'selected': isSelected
    }"
    :style="{ 
      width: columnWidth + 'px',
      height: headerHeight + 'px'
    }"
    @click="$emit('selectDate', date)"
  >
    <div class="date-content">
      <div class="date-main">
        <span class="day-name">{{ dayName }}</span>
        <span class="date-number">{{ dateNumber }}</span>
      </div>
      <div class="date-details">
        <span class="month-year">{{ monthYear }}</span>
      </div>
      
      <!-- Indicateur jour actuel -->
      <div v-if="isToday" class="today-indicator">
        <va-icon name="today" size="14px" />
      </div>
      
      <!-- Badge week-end -->
      <div v-if="isWeekend" class="weekend-badge">
        WE
      </div>
      
      <!-- Compteurs de disponibilités -->
      <div class="availability-counter" v-if="availabilityCount > 0">
        <span class="count">{{ availabilityCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  date: string // Format YYYY-MM-DD
  columnWidth: number
  headerHeight: number
  availabilityCount?: number
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  availabilityCount: 0,
  isSelected: false
})

const emit = defineEmits<{
  selectDate: [date: string]
}>()

// Conversion de la date
const dateObj = computed(() => new Date(props.date))

// Nom du jour (abrégé)
const dayName = computed(() => {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  return days[dateObj.value.getDay()]
})

// Numéro du jour
const dateNumber = computed(() => {
  return dateObj.value.getDate()
})

// Mois et année
const monthYear = computed(() => {
  const months = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ]
  const month = months[dateObj.value.getMonth()]
  const year = dateObj.value.getFullYear()
  return `${month} ${year}`
})

// Week-end ?
const isWeekend = computed(() => {
  const day = dateObj.value.getDay()
  return day === 0 || day === 6 // Dimanche ou Samedi
})

// Aujourd'hui ?
const isToday = computed(() => {
  const today = new Date()
  return dateObj.value.toDateString() === today.toDateString()
})
</script>

<style scoped>
.date-header-cell {
  border-right: 1px solid #e0e0e0;
  border-bottom: 2px solid #e0e0e0;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  overflow: hidden;
  position: relative;
  transition: all 0.2s ease;
}

.date-header-cell:hover {
  background: rgba(33, 150, 243, 0.05);
  border-bottom-color: #2196F3;
}

.date-header-cell.selected {
  background: rgba(33, 150, 243, 0.1);
  border-bottom-color: #2196F3;
  border-bottom-width: 3px;
}

.date-header-cell.weekend {
  background: #fafafa;
}

.date-header-cell.weekend:hover {
  background: rgba(255, 152, 0, 0.05);
}

.date-header-cell.today {
  background: rgba(76, 175, 80, 0.05);
  border-bottom-color: #4CAF50;
  border-bottom-width: 3px;
}

.date-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  position: relative;
}

.date-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.day-name {
  font-size: 10px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-number {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.date-details {
  display: flex;
  align-items: center;
}

.month-year {
  font-size: 9px;
  color: #888;
  font-weight: 500;
}

.today-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #4CAF50;
  opacity: 0.8;
}

.weekend-badge {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 8px;
  background: #FF9800;
  color: white;
  padding: 1px 3px;
  border-radius: 6px;
  font-weight: 600;
}

.availability-counter {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: #2196F3;
  color: white;
  border-radius: 8px;
  padding: 1px 4px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.count {
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
}

/* États spéciaux */
.date-header-cell.weekend .day-name {
  color: #FF9800;
}

.date-header-cell.weekend .date-number {
  color: #F57C00;
}

.date-header-cell.today .day-name {
  color: #4CAF50;
}

.date-header-cell.today .date-number {
  color: #2E7D32;
}

/* Responsive */
@media (max-width: 768px) {
  .date-header-cell {
    padding: 6px 2px;
  }
  
  .day-name {
    font-size: 9px;
  }
  
  .date-number {
    font-size: 14px;
  }
  
  .month-year {
    font-size: 8px;
  }
  
  .weekend-badge {
    font-size: 7px;
    padding: 1px 2px;
  }
  
  .count {
    font-size: 8px;
  }
}

/* Animation pour les changements de sélection */
@keyframes selectPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.date-header-cell.selected {
  animation: selectPulse 0.3s ease;
}
</style>
