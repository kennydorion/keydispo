<template>
  <div class="planning-moderne">
    <!-- Header avec navigation et filtres -->
    <div class="planning-header">
      <div class="header-controls">
        <div class="navigation-controls">
          <va-button
            @click="scrollLeft"
            icon="chevron_left"
            preset="plain"
            :loading="infiniteScroll.isLoading()"
            aria-label="Semaine précédente"
          />
          <va-button
            @click="goToToday"
            preset="secondary"
            size="small"
          >
            Aujourd'hui
          </va-button>
          <va-button
            @click="scrollRight"
            icon="chevron_right"
            preset="plain"
            :loading="infiniteScroll.isLoading()"
            aria-label="Semaine suivante"
          />
        </div>
        
        <div class="period-display">
          <h2>{{ formatPeriod(currentWeekStart) }}</h2>
        </div>
        
        <div class="action-controls">
          <va-button
            @click="showBatchModal = true"
            color="primary"
            icon="add"
          >
            Ajouter en batch
          </va-button>
        </div>
      </div>
    </div>

    <!-- Conteneur principal avec scroll infini -->
    <div class="planning-container" ref="planningContainer">
      <!-- Header des jours (sticky) -->
      <div class="days-header">
        <div class="collaborateur-column-header">
          <span>Collaborateur</span>
        </div>
        <div 
          v-for="date in weekDates" 
          :key="date.toISOString()"
          class="day-header"
          :class="{ 'today': isToday(date), 'weekend': isWeekend(date) }"
        >
          <div class="day-name">{{ formatDayName(date) }}</div>
          <div class="day-number">{{ formatDayNumber(date) }}</div>
        </div>
      </div>

      <!-- Corps du planning -->
      <div class="planning-body">
        <div 
          v-for="collaborateur in filteredCollaborateurs" 
          :key="collaborateur.id"
          class="collaborateur-row"
          :style="{ backgroundColor: getCouleurLigne(collaborateur.color) }"
        >
          <!-- Colonne collaborateur (sticky) -->
          <div class="collaborateur-column">
            <div class="collaborateur-info">
              <div class="collaborateur-avatar" :style="{ backgroundColor: collaborateur.color }">
                {{ getInitials(collaborateur.prenom, collaborateur.nom) }}
              </div>
              <div class="collaborateur-details">
                <div class="collaborateur-name">{{ collaborateur.prenom }} {{ collaborateur.nom }}</div>
                <div class="collaborateur-metier">{{ collaborateur.metier }}</div>
              </div>
            </div>
          </div>

          <!-- Cellules de disponibilité -->
          <div 
            v-for="date in weekDates" 
            :key="`${collaborateur.id}-${date.toISOString()}`"
            class="dispo-cell"
            :class="{
              'locked': isCellLocked(collaborateur.id, formatDateKey(date)),
              'selected': isSelectedCell(collaborateur.id, formatDateKey(date)),
              'today': isToday(date),
              'weekend': isWeekend(date)
            }"
            @mousedown="startBatchSelection($event, collaborateur.id, formatDateKey(date))"
            @mouseenter="updateBatchSelection(collaborateur.id, formatDateKey(date))"
            @click="handleCellClick($event, collaborateur.id, date)"
          >
            <!-- Indicateur de verrouillage -->
            <div v-if="isCellLocked(collaborateur.id, formatDateKey(date))" class="lock-indicator">
              <i class="material-icons">lock</i>
              <span class="lock-user">{{ getLockUser(collaborateur.id, formatDateKey(date)) }}</span>
            </div>

            <!-- Disponibilités existantes -->
            <div class="dispos-container">
              <div 
                v-for="dispo in getDisponibilites(collaborateur.id, formatDateKey(date))"
                :key="dispo.id"
                class="dispo-item"
                :class="`type-${dispo.type}`"
                @click.stop="editDisponibilite(dispo)"
              >
                <div class="dispo-time">{{ dispo.heure_debut }}-{{ dispo.heure_fin }}</div>
                <div v-if="dispo.lieu" class="dispo-lieu">{{ dispo.lieu }}</div>
              </div>
            </div>

            <!-- Zone d'ajout rapide -->
            <div v-if="!getDisponibilites(collaborateur.id, formatDateKey(date)).length" 
                 class="add-zone"
                 @click.stop="quickAdd(collaborateur.id, date)">
              <i class="material-icons">add</i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Indicateurs de présence des utilisateurs actifs -->
    <div class="presence-indicators">
      <div 
        v-for="[userId, user] in activeUsers" 
        :key="userId"
        class="user-presence"
        :title="`${user.userName} actif`"
      >
        <div class="presence-dot"></div>
        <span>{{ user.userName }}</span>
      </div>
    </div>

    <!-- Modal d'ajout en batch -->
    <BatchDisponibiliteModal
      v-model="showBatchModal"
      :pre-selected-dates="selectedDatesForBatch"
      :pre-selected-collaborateur="selectedCollaborateurForBatch"
      @batch-created="handleBatchCreated"
    />

    <!-- Modal d'édition rapide -->
    <va-modal
      v-model="showQuickEditModal"
      title="Modifier disponibilité"
      size="medium"
    >
      <form @submit.prevent="saveQuickEdit" class="quick-edit-form">
        <div class="form-grid">
          <va-select
            v-model="quickEditForm.type"
            :options="typeOptions"
            label="Type"
            text-by="label"
            value-by="value"
          />
          
          <va-select
            v-model="quickEditForm.heureDebut"
            :options="timeSlots"
            label="Heure début"
            text-by="label"
            value-by="debut"
          />
          
          <va-select
            v-model="quickEditForm.heureFin"
            :options="timeSlots"
            label="Heure fin"
            text-by="label"
            value-by="fin"
          />
          
          <va-input
            v-if="quickEditForm.type === 'mission'"
            v-model="quickEditForm.lieu"
            label="Lieu"
            placeholder="Lieu de mission"
          />
        </div>
        
        <div class="form-actions">
          <va-button color="secondary" @click="showQuickEditModal = false">
            Annuler
          </va-button>
          <va-button type="submit" color="primary" :loading="savingQuickEdit">
            Sauvegarder
          </va-button>
          <va-button 
            v-if="quickEditForm.id"
            color="danger" 
            @click="deleteDisponibilite"
            :loading="deletingDispo"
          >
            Supprimer
          </va-button>
        </div>
      </form>
    </va-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import { AuthService } from '../services/auth'
import { InfiniteScrollService } from '../services/infiniteScroll'
import { PlanningInteractionService } from '../services/planningInteraction'
import BatchDisponibiliteModal from '../components/BatchDisponibiliteModal.vue'
import type { Collaborateur, DisponibiliteExtended } from '../types/planning'
import { COULEURS_COLLABORATEUR, CRENEAUX_QUART_HEURE } from '../types/planning'
import { getUserInitials } from '../services/avatarUtils'

// Services
const infiniteScroll = InfiniteScrollService.getInstance()
const interactionService = PlanningInteractionService.getInstance()

// Reactive state
const planningContainer = ref<HTMLElement>()
const currentWeekStart = ref(new Date())
const weekData = ref<DisponibiliteExtended[]>([])
const collaborateurs = ref<Collaborateur[]>([])
const activeUsers = ref(new Map())
const showBatchModal = ref(false)
const showQuickEditModal = ref(false)
const savingQuickEdit = ref(false)
const deletingDispo = ref(false)

const selectedDatesForBatch = ref<string[]>([])
const selectedCollaborateurForBatch = ref<string>('')

const quickEditForm = ref({
  id: '',
  type: 'disponible',
  heureDebut: '09:00',
  heureFin: '17:00',
  lieu: ''
})

// Computed
const weekDates = computed(() => {
  return infiniteScroll.getWeekDates(currentWeekStart.value)
})

const filteredCollaborateurs = computed(() => {
  return collaborateurs.value.sort((a, b) => 
    `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`)
  )
})

const timeSlots = computed(() => CRENEAUX_QUART_HEURE)

const typeOptions = [
  { label: 'Disponible', value: 'disponible' },
  { label: 'Indisponible', value: 'indisponible' },
  { label: 'Mission', value: 'mission' }
]

// Méthodes utilitaires
const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

const formatPeriod = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  
  return `${weekStart.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short' 
  })} - ${weekEnd.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short',
    year: 'numeric'
  })}`
}

const formatDayName = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', { weekday: 'short' })
}

const formatDayNumber = (date: Date): string => {
  return date.getDate().toString()
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6
}

const getInitials = (prenom: string, nom: string): string => {
  return getUserInitials({ nom, prenom })
}

const getCouleurLigne = (color: string): string => {
  const couleur = COULEURS_COLLABORATEUR[color as keyof typeof COULEURS_COLLABORATEUR]
  return couleur ? `${couleur}10` : '#f8f9fa' // Alpha 10 pour transparence
}

// Gestion des disponibilités
const getDisponibilites = (collaborateurId: string, date: string): DisponibiliteExtended[] => {
  return weekData.value.filter(d => 
    d.nom === getCollaborateurName(collaborateurId).nom &&
    d.prenom === getCollaborateurName(collaborateurId).prenom &&
    d.date === date
  )
}

const getCollaborateurName = (collaborateurId: string) => {
  const collab = collaborateurs.value.find(c => c.id === collaborateurId)
  return collab ? { nom: collab.nom, prenom: collab.prenom } : { nom: '', prenom: '' }
}

// Gestion des verrouillages
const isCellLocked = (collaborateurId: string, date: string): boolean => {
  return interactionService.isCellLocked(collaborateurId, date)
}

const isSelectedCell = (collaborateurId: string, date: string): boolean => {
  const cellKey = `${collaborateurId}-${date}`
  return interactionService.getSelectedCells().has(cellKey)
}

const getLockUser = (collaborateurId: string, date: string): string => {
  const lock = interactionService.getCellLockInfo(collaborateurId, date)
  return lock ? 'En cours...' : ''
}

// Gestion de la sélection en batch
const startBatchSelection = (event: MouseEvent, collaborateurId: string, date: string) => {
  interactionService.startSelection(collaborateurId, date, event)
}

const updateBatchSelection = (collaborateurId: string, date: string) => {
  interactionService.updateSelection(collaborateurId, date)
}

// Actions utilisateur
const scrollLeft = async () => {
  const data = await infiniteScroll.scrollLeft()
  weekData.value = data
  currentWeekStart.value = infiniteScroll.getCurrentWeekStart()
}

const scrollRight = async () => {
  const data = await infiniteScroll.scrollRight()
  weekData.value = data
  currentWeekStart.value = infiniteScroll.getCurrentWeekStart()
}

const goToToday = async () => {
  const data = await infiniteScroll.goToDate(new Date())
  weekData.value = data
  currentWeekStart.value = infiniteScroll.getCurrentWeekStart()
}

const handleCellClick = (event: MouseEvent, collaborateurId: string, date: Date) => {
  if (event.ctrlKey || event.metaKey) {
    // Ajout à la sélection batch
    const dateStr = formatDateKey(date)
    const current = selectedDatesForBatch.value
    if (current.includes(dateStr)) {
      selectedDatesForBatch.value = current.filter(d => d !== dateStr)
    } else {
      selectedDatesForBatch.value = [...current, dateStr]
    }
    selectedCollaborateurForBatch.value = collaborateurId
  }
}

const quickAdd = (collaborateurId: string, date: Date) => {
  selectedCollaborateurForBatch.value = collaborateurId
  selectedDatesForBatch.value = [formatDateKey(date)]
  showBatchModal.value = true
}

const editDisponibilite = (dispo: DisponibiliteExtended) => {
  quickEditForm.value = {
    id: dispo.id,
    type: dispo.type || 'disponible',
    heureDebut: dispo.heure_debut,
    heureFin: dispo.heure_fin,
    lieu: dispo.lieu || ''
  }
  showQuickEditModal.value = true
}

const saveQuickEdit = async () => {
  // Implementation à ajouter
  savingQuickEdit.value = true
  try {
    // Logique de sauvegarde
    showQuickEditModal.value = false
  } catch (error) {
    console.error('Erreur sauvegarde:', error)
  } finally {
    savingQuickEdit.value = false
  }
}

const deleteDisponibilite = async () => {
  // Implementation à ajouter
  deletingDispo.value = true
  try {
    // Logique de suppression
    showQuickEditModal.value = false
  } catch (error) {
    console.error('Erreur suppression:', error)
  } finally {
    deletingDispo.value = false
  }
}

const handleBatchCreated = (batchData: any) => {
  console.log('Batch créé:', batchData)
  // Recharger les données
  loadCurrentWeek()
}

// Chargement des données
const loadCollaborateurs = async () => {
  try {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const collabRef = collection(db, `tenants/${tenantId}/collaborateurs`)
    const snapshot = await getDocs(collabRef)
    
    collaborateurs.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Collaborateur))
  } catch (error) {
    console.error('Erreur chargement collaborateurs:', error)
  }
}

const loadCurrentWeek = async () => {
  const data = await infiniteScroll.loadWeek(currentWeekStart.value)
  weekData.value = data
}

// Lifecycle
onMounted(async () => {
  await loadCollaborateurs()
  await loadCurrentWeek()
  
  // Setup des listeners temps réel
  const tenantId = AuthService.currentTenantId || 'keydispo'
  
  // Listener pour les disponibilités
  const disposQuery = query(
    collection(db, 'dispos'),
    where('tenantId', '==', tenantId)
  )
  
  const unsubscribeDispos = onSnapshot(disposQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data() as DisponibiliteExtended
      data.id = change.doc.id
      
      if (change.type === 'added' || change.type === 'modified') {
        const index = weekData.value.findIndex(d => d.id === data.id)
        if (index >= 0) {
          weekData.value[index] = data
        } else {
          weekData.value.push(data)
        }
      } else if (change.type === 'removed') {
        weekData.value = weekData.value.filter(d => d.id !== data.id)
      }
    })
  })
  
  onUnmounted(() => {
    unsubscribeDispos()
    interactionService.cleanup()
  })
})
</script>

<style scoped>
.planning-moderne {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--va-background-primary);
}

.planning-header {
  background: var(--va-background-secondary);
  border-bottom: 1px solid var(--va-background-border);
  padding: 16px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.navigation-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.period-display h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--va-text-primary);
}

.action-controls {
  display: flex;
  gap: 12px;
}

.planning-container {
  flex: 1;
  overflow: auto;
  position: relative;
}

.days-header {
  display: flex;
  background: var(--va-background-secondary);
  border-bottom: 2px solid var(--va-background-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.collaborateur-column-header {
  min-width: 250px;
  padding: 16px;
  font-weight: 600;
  border-right: 1px solid var(--va-background-border);
  background: var(--va-background-secondary);
  position: sticky;
  left: 0;
  z-index: 11;
}

.day-header {
  min-width: 120px;
  padding: 12px 8px;
  text-align: center;
  border-right: 1px solid var(--va-background-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-header.today {
  background: rgba(59, 130, 246, 0.1);
  color: #3B82F6;
  font-weight: 600;
}

.day-header.weekend {
  background: rgba(156, 163, 175, 0.1);
}

.day-name {
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
}

.day-number {
  font-size: 1.25rem;
  font-weight: 600;
}

.planning-body {
  min-height: 600px;
}

.collaborateur-row {
  display: flex;
  border-bottom: 1px solid var(--va-background-border);
  min-height: 80px;
}

.collaborateur-column {
  min-width: 250px;
  padding: 16px;
  border-right: 1px solid var(--va-background-border);
  background: var(--va-background-secondary);
  position: sticky;
  left: 0;
  z-index: 5;
}

.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collaborateur-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.collaborateur-details {
  flex: 1;
}

.collaborateur-name {
  font-weight: 600;
  color: var(--va-text-primary);
  margin-bottom: 2px;
}

.collaborateur-metier {
  font-size: 0.875rem;
  color: var(--va-text-secondary);
}

.dispo-cell {
  min-width: 120px;
  border-right: 1px solid var(--va-background-border);
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 8px;
}

.dispo-cell:hover {
  background: rgba(59, 130, 246, 0.05);
}

.dispo-cell.locked {
  background: rgba(239, 68, 68, 0.1);
  cursor: not-allowed;
}

.dispo-cell.selected {
  background: rgba(59, 130, 246, 0.2);
  border: 2px solid #3B82F6;
}

.dispo-cell.today {
  border-left: 3px solid #3B82F6;
}

.dispo-cell.weekend {
  background: rgba(156, 163, 175, 0.05);
}

.lock-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #EF4444;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.lock-user {
  font-size: 10px;
  background: #EF4444;
  color: white;
  padding: 2px 4px;
  border-radius: 4px;
}

.dispos-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dispo-item {
  background: var(--va-background-secondary);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.75rem;
  border-left: 3px solid;
  cursor: pointer;
  transition: all 0.2s;
}

.dispo-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dispo-item.type-disponible {
  border-left-color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.dispo-item.type-indisponible {
  border-left-color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.dispo-item.type-mission {
  border-left-color: #3B82F6;
  background: rgba(59, 130, 246, 0.1);
}

.dispo-time {
  font-weight: 600;
  margin-bottom: 2px;
}

.dispo-lieu {
  font-size: 0.7rem;
  opacity: 0.8;
}

.add-zone {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--va-text-secondary);
  opacity: 0;
  transition: opacity 0.2s;
}

.dispo-cell:hover .add-zone {
  opacity: 1;
}

.presence-indicators {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
}

.user-presence {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--va-background-secondary);
  padding: 8px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 0.875rem;
}

.presence-dot {
  width: 8px;
  height: 8px;
  background: #10B981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.quick-edit-form {
  padding: 8px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .header-controls {
    flex-direction: column;
    gap: 16px;
  }
  
  .collaborateur-column,
  .collaborateur-column-header {
    min-width: 200px;
  }
  
  .day-header {
    min-width: 100px;
  }
  
  .dispo-cell {
    min-width: 100px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
