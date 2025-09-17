<template>
  <div class="collaborateur-planning">
    <!-- En-tête du planning -->
    <div class="planning-header">
      <h3 class="planning-title">
        <va-icon name="calendar_month" color="primary" class="mr-2" />
        Mon Planning - Prochains {{ nombreJours }} jours
      </h3>
      
      <!-- Navigation -->
      <div class="planning-nav">
        <va-button
          @click="goToToday"
          preset="primary"
          icon="today"
          size="small"
        >
          Aujourd'hui
        </va-button>
        
        <va-button-group class="ml-2">
          <va-button
            @click="extendLeft"
            icon="keyboard_arrow_left"
            size="small"
            :disabled="!canExtendLeft"
          />
          <va-button
            @click="extendRight"
            icon="keyboard_arrow_right"
            size="small"
          />
        </va-button-group>
      </div>
    </div>

    <!-- Planning simplifié -->
    <div class="planning-container" v-if="!loading">
      <!-- En-tête des dates -->
      <div class="dates-header">
        <div class="collaborateur-column">{{ monProfil?.prenom }} {{ monProfil?.nom }}</div>
        <div 
          v-for="date in datesFutures"
          :key="date.dateStr"
          class="date-column"
          :class="{ 'today': date.isToday, 'weekend': date.isWeekend }"
        >
          <div class="day-name">{{ date.dayName }}</div>
          <div class="day-number">{{ date.dayNumber }}</div>
          <div class="month-info" v-if="date.showMonth">{{ date.monthName }}</div>
        </div>
      </div>

      <!-- Ligne du collaborateur -->
      <div class="collaborateur-row">
        <div class="collaborateur-info">
          <div class="collaborateur-avatar">
            <va-avatar :color="avatarColor" size="small">
              {{ initiales }}
            </va-avatar>
          </div>
          <div class="collaborateur-details">
            <div class="collaborateur-name">{{ monProfil?.prenom }} {{ monProfil?.nom }}</div>
            <div class="collaborateur-metier">{{ monProfil?.metier }}</div>
          </div>
        </div>

        <!-- Cellules de disponibilité -->
        <div 
          v-for="date in datesFutures"
          :key="date.dateStr"
          class="planning-cell"
          :class="[
            { 
              'today': date.isToday, 
              'weekend': date.isWeekend,
              'has-disponibilite': hasDisponibilite(date.dateStr),
              'selected': selectedDates.includes(date.dateStr)
            },
            getStatutClass(date.dateStr)
          ]"
          @click="toggleCellSelection(date.dateStr)"
          @mouseenter="hoveredDate = date.dateStr"
          @mouseleave="hoveredDate = null"
        >
          <div class="cell-content">
            <div v-if="hasDisponibilite(date.dateStr)" class="disponibilite-info">
              <div 
                v-for="dispo in getDisponibilites(date.dateStr)"
                :key="dispo.id"
                class="dispo-item"
                :class="getDispoClass(dispo)"
              >
                <div class="dispo-statut">
                  {{ getStatutLabel(dispo.statut) }}
                </div>
                <div v-if="dispo.heure_debut && dispo.heure_fin" class="dispo-heures">
                  {{ dispo.heure_debut }} - {{ dispo.heure_fin }}
                </div>
                <div v-if="dispo.lieu" class="dispo-lieu">{{ dispo.lieu }}</div>
              </div>
            </div>
            
            <!-- Indicateur de sélection -->
            <div v-if="selectedDates.includes(date.dateStr)" class="selection-indicator">
              <va-icon name="check_circle" size="small" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="loading-state">
      <va-progress-circle indeterminate color="primary" />
      <p class="mt-2">Chargement du planning...</p>
    </div>

    <!-- Actions en lot -->
    <div v-if="selectedDates.length > 0" class="batch-actions">
      <va-card>
        <va-card-content>
          <div class="actions-header">
            <span class="selection-count">
              {{ selectedDates.length }} jour(s) sélectionné(s)
            </span>
            <va-button 
              @click="clearSelection" 
              preset="plain" 
              icon="clear"
              size="small"
            >
              Effacer
            </va-button>
          </div>
          
          <div class="actions-buttons">
            <va-button
              @click="openBatchModal('disponible')"
              color="success"
              icon="check_circle"
              class="mr-2"
            >
              Marquer disponible
            </va-button>
            <va-button
              @click="openBatchModal('indisponible')"
              color="danger"
              icon="cancel"
            >
              Marquer indisponible
            </va-button>
          </div>
        </va-card-content>
      </va-card>
    </div>

    <!-- Modal de modification en lot -->
    <va-modal
      v-model="showBatchModal"
      title="Modifier les disponibilités"
      size="medium"
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="modalA11y.onClose"
      @ok="saveBatchChanges"
      @cancel="cancelBatchChanges"
    >
      <div class="batch-modal-content">
        <p>
          Vous allez modifier <strong>{{ selectedDates.length }} jour(s)</strong> :
        </p>
        
        <ul class="selected-dates-list">
          <li v-for="dateStr in selectedDates" :key="dateStr">
            {{ formatDateLong(dateStr) }}
          </li>
        </ul>

        <div class="batch-form">
          <va-select
            v-model="batchStatut"
            :options="statutOptions"
            label="Statut"
            :rules="[required]"
          />
          
          <div v-if="batchStatut === 'disponible'" class="availability-details">
            <div class="row">
              <div class="flex md6">
                <va-input
                  v-model="batchHeureDebut"
                  label="Heure de début (optionnel)"
                  placeholder="09:00"
                />
              </div>
              <div class="flex md6">
                <va-input
                  v-model="batchHeureFin"
                  label="Heure de fin (optionnel)"
                  placeholder="17:00"
                />
              </div>
            </div>
            
            <va-input
              v-model="batchLieu"
              label="Lieu (optionnel)"
              placeholder="Lieu de disponibilité"
            />
          </div>
        </div>
      </div>
    </va-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { CollaborateurSelfService, type CollaborateurDisponibilite } from '@/services/collaborateurSelf'
import type { CollaborateurV2 } from '@/types/optimized-v2'
import { useModalA11y } from '@/composables/useModalA11y'

// Composables
const { init: initToast } = useToast()

// Props
interface Props {
  nombreJours?: number
}

const props = withDefaults(defineProps<Props>(), {
  nombreJours: 21 // 3 semaines par défaut
})

// État
const loading = ref(false)
const monProfil = ref<CollaborateurV2 | null>(null)
const disponibilites = ref<CollaborateurDisponibilite[]>([])
const selectedDates = ref<string[]>([])
const hoveredDate = ref<string | null>(null)
const modalA11y = useModalA11y()

// Modal batch
const showBatchModal = ref(false)
const batchStatut = ref('')
const batchHeureDebut = ref('')
const batchHeureFin = ref('')
const batchLieu = ref('')
const pendingBatchStatut = ref('')

// Navigation
const offsetJours = ref(0)
const canExtendLeft = computed(() => offsetJours.value > 0)

// Dates futures calculées
const datesFutures = computed(() => {
  const dates = []
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() + offsetJours.value)
  
  for (let i = 0; i < props.nombreJours; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    
    const dateStr = date.toISOString().split('T')[0]
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' })
    const dayNumber = date.getDate()
    const monthName = date.toLocaleDateString('fr-FR', { month: 'short' })
    const isToday = dateStr === today.toISOString().split('T')[0]
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const showMonth = i === 0 || date.getDate() === 1
    
    dates.push({
      dateStr,
      dayName,
      dayNumber,
      monthName,
      isToday,
      isWeekend,
      showMonth
    })
  }
  
  return dates
})

// Profil calculé
const initiales = computed(() => {
  if (!monProfil.value) return '?'
  const nom = monProfil.value.nom?.charAt(0) || ''
  const prenom = monProfil.value.prenom?.charAt(0) || ''
  return `${prenom}${nom}`.toUpperCase()
})

const avatarColor = computed(() => {
  if (!monProfil.value) return 'primary'
  // Générer une couleur basée sur le nom
  const str = `${monProfil.value.nom}${monProfil.value.prenom}`
  const colors = ['primary', 'secondary', 'success', 'info', 'warning', 'danger']
  const index = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
})

// Options pour le modal
const statutOptions = [
  { text: 'Disponible', value: 'disponible' },
  { text: 'Indisponible', value: 'indisponible' }
]

// Validation
const required = (value: any) => !!value || 'Ce champ est requis'

// Méthodes - Données
const chargerProfil = async () => {
  try {
    monProfil.value = await CollaborateurSelfService.getMonProfil()
  } catch (error) {
    console.error('Erreur lors du chargement du profil:', error)
    initToast({
      message: 'Erreur lors du chargement du profil',
      color: 'danger'
    })
  }
}

const chargerDisponibilites = async () => {
  try {
    loading.value = true
    
    const premierJour = datesFutures.value[0]?.dateStr
    const dernierJour = datesFutures.value[datesFutures.value.length - 1]?.dateStr
    
    if (premierJour && dernierJour) {
      disponibilites.value = await CollaborateurSelfService.getMesDisponibilites(premierJour, dernierJour)
    }
  } catch (error) {
    console.error('Erreur lors du chargement des disponibilités:', error)
    initToast({
      message: 'Erreur lors du chargement des disponibilités',
      color: 'danger'
    })
  } finally {
    loading.value = false
  }
}

// Méthodes - Disponibilités
const hasDisponibilite = (dateStr: string): boolean => {
  return disponibilites.value.some(dispo => dispo.date === dateStr)
}

const getDisponibilites = (dateStr: string): CollaborateurDisponibilite[] => {
  return disponibilites.value.filter(dispo => dispo.date === dateStr)
}

const getStatutClass = (dateStr: string): string => {
  const dispos = getDisponibilites(dateStr)
  if (dispos.length === 0) return 'statut-none'
  
  const hasDisponible = dispos.some(d => d.statut === 'disponible')
  const hasIndisponible = dispos.some(d => d.statut === 'indisponible')
  
  if (hasDisponible && hasIndisponible) return 'statut-mixed'
  if (hasDisponible) return 'statut-disponible'
  if (hasIndisponible) return 'statut-indisponible'
  
  return 'statut-none'
}

const getDispoClass = (dispo: CollaborateurDisponibilite): string => {
  return `dispo-${dispo.statut || 'none'}`
}

const getStatutLabel = (statut?: string): string => {
  switch (statut) {
    case 'disponible': return 'Disponible'
    case 'indisponible': return 'Indisponible'
    default: return 'Non défini'
  }
}

// Méthodes - Sélection
const toggleCellSelection = (dateStr: string) => {
  const index = selectedDates.value.indexOf(dateStr)
  if (index >= 0) {
    selectedDates.value.splice(index, 1)
  } else {
    selectedDates.value.push(dateStr)
  }
}

const clearSelection = () => {
  selectedDates.value = []
}

// Méthodes - Navigation
const goToToday = () => {
  offsetJours.value = 0
}

const extendLeft = () => {
  if (canExtendLeft.value) {
    offsetJours.value = Math.max(0, offsetJours.value - 7)
  }
}

const extendRight = () => {
  offsetJours.value += 7
}

// Méthodes - Modal batch
const openBatchModal = (statut: string) => {
  pendingBatchStatut.value = statut
  batchStatut.value = statut
  batchHeureDebut.value = ''
  batchHeureFin.value = ''
  batchLieu.value = ''
  showBatchModal.value = true
}

const cancelBatchChanges = () => {
  showBatchModal.value = false
  batchStatut.value = ''
  batchHeureDebut.value = ''
  batchHeureFin.value = ''
  batchLieu.value = ''
}

const saveBatchChanges = async () => {
  if (!batchStatut.value) {
    initToast({
      message: 'Veuillez sélectionner un statut',
      color: 'warning'
    })
    return
  }

  try {
    // Pour l'instant, on affiche juste un message car les méthodes CRUD ne sont pas encore implémentées
    const message = `Fonctionnalité en cours de développement.\n\nVous voulez marquer ${selectedDates.value.length} jour(s) comme "${batchStatut.value}"`
    
    if (batchStatut.value === 'disponible' && (batchHeureDebut.value || batchHeureFin.value)) {
      const horaires = `${batchHeureDebut.value || '?'} - ${batchHeureFin.value || '?'}`
      message += `\navec les horaires: ${horaires}`
    }
    
    if (batchLieu.value) {
      message += `\nau lieu: ${batchLieu.value}`
    }
    
    initToast({
      message,
      color: 'info',
      duration: 5000
    })

    showBatchModal.value = false
    clearSelection()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    initToast({
      message: 'Erreur lors de la sauvegarde',
      color: 'danger'
    })
  }
}

// Utilitaires
const formatDateLong = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Watchers
watch(datesFutures, () => {
  if (datesFutures.value.length > 0) {
    chargerDisponibilites()
  }
}, { deep: true })

// Lifecycle
onMounted(async () => {
  await chargerProfil()
  await chargerDisponibilites()
})
</script>

<style scoped>
.collaborateur-planning {
  --cell-width: 120px;
  --cell-height: 80px;
  --collaborateur-width: 200px;
}

.planning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--va-background-secondary);
  border-radius: 8px;
}

.planning-title {
  margin: 0;
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  font-weight: 600;
}

.planning-nav {
  display: flex;
  align-items: center;
}

.planning-container {
  border: 1px solid var(--va-background-border);
  border-radius: 8px;
  overflow-x: auto;
  background: white;
}

.dates-header {
  display: flex;
  background: var(--va-background-secondary);
  border-bottom: 2px solid var(--va-background-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.collaborateur-column {
  width: var(--collaborateur-width);
  min-width: var(--collaborateur-width);
  padding: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--va-background-border);
  background: var(--va-background-secondary);
}

.date-column {
  width: var(--cell-width);
  min-width: var(--cell-width);
  padding: 0.5rem;
  text-align: center;
  border-right: 1px solid var(--va-background-border);
  position: relative;
}

.date-column.today {
  background: var(--va-primary);
  color: white;
}

.date-column.weekend {
  background: var(--va-background-element);
}

.day-name {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.day-number {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.month-info {
  font-size: 0.7rem;
  opacity: 0.7;
  text-transform: uppercase;
}

.collaborateur-row {
  display: flex;
  min-height: var(--cell-height);
}

.collaborateur-info {
  width: var(--collaborateur-width);
  min-width: var(--collaborateur-width);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-right: 1px solid var(--va-background-border);
  background: var(--va-background-secondary);
}

.collaborateur-details {
  flex: 1;
}

.collaborateur-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.collaborateur-metier {
  font-size: 0.875rem;
  color: var(--va-text-secondary);
}

.planning-cell {
  width: var(--cell-width);
  min-width: var(--cell-width);
  height: var(--cell-height);
  border-right: 1px solid var(--va-background-border);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.planning-cell:hover {
  background: var(--va-background-element);
  transform: scale(1.02);
  z-index: 5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.planning-cell.today {
  border-left: 3px solid var(--va-primary);
}

.planning-cell.weekend {
  background: var(--va-background-element);
}

.planning-cell.selected {
  background: var(--va-primary);
  color: white;
}

.planning-cell.statut-disponible {
  background: var(--va-success);
  color: white;
}

.planning-cell.statut-indisponible {
  background: var(--va-danger);
  color: white;
}

.planning-cell.statut-mixed {
  background: linear-gradient(45deg, var(--va-success) 50%, var(--va-danger) 50%);
  color: white;
}

.cell-content {
  padding: 0.5rem;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.disponibilite-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
}

.dispo-item {
  font-size: 0.75rem;
  text-align: center;
}

.dispo-statut {
  font-weight: 600;
  text-transform: uppercase;
}

.dispo-heures {
  font-size: 0.7rem;
  opacity: 0.9;
}

.dispo-lieu {
  font-size: 0.7rem;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.batch-actions {
  margin-top: 1rem;
}

.actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.selection-count {
  font-weight: 600;
  color: var(--va-primary);
}

.actions-buttons {
  display: flex;
  gap: 0.5rem;
}

.batch-modal-content {
  padding: 1rem 0;
}

.selected-dates-list {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.batch-form {
  margin-top: 1.5rem;
}

.availability-details {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--va-background-element);
  border-radius: 4px;
}

/* Responsive */
@media (max-width: 768px) {
  .collaborateur-planning {
    --cell-width: 80px;
    --cell-height: 60px;
    --collaborateur-width: 150px;
  }
  
  .planning-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .planning-nav {
    justify-content: center;
  }
  
  .day-name,
  .day-number {
    font-size: 0.7rem;
  }
  
  .collaborateur-name {
    font-size: 0.875rem;
  }
  
  .collaborateur-metier {
    font-size: 0.75rem;
  }
}
</style>
