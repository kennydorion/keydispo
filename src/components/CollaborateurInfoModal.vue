<template>
  <va-modal 
    v-model="isVisible" 
    :hide-default-actions="true"
    :fullscreen="false"
    max-width="600px"
    no-padding
    @close="closeModal"
  >
    <div v-if="collaborateur" class="collaborateur-info-compact">
      <!-- En-tête compact avec couleur du collaborateur -->
      <div class="collaborateur-header-compact" :style="{ '--collaborateur-color': collaborateurColor }">
        <div class="collaborateur-main-info">
          <div class="collaborateur-avatar" :style="{ backgroundColor: collaborateurColor }">
            {{ avatarInitials }}
          </div>
          <div class="collaborateur-details">
            <h3 class="collaborateur-name">{{ collaborateur.prenom }} {{ collaborateur.nom }}</h3>
            <div class="collaborateur-meta">
              <span class="meta-item">{{ collaborateur.metier || 'Collaborateur' }}</span>
              <span class="meta-separator">•</span>
              <span class="meta-item">{{ collaborateur.ville }}</span>
            </div>
          </div>
          <div class="stats-badge" :style="{ backgroundColor: collaborateurColor }">
            {{ collaborateurStats.totalDispos }}
          </div>
        </div>
        <!-- Indicateur de couleur -->
        <div class="color-indicator" :style="{ backgroundColor: collaborateurColor }"></div>
      </div>

      <!-- Section 1: Contact (pliable) -->
      <div class="collapsible-section">
        <button class="section-header" @click="toggleSection('contact')">
          <va-icon name="phone" size="16px" />
          <span class="section-title">Contact</span>
          <va-icon 
            :name="expandedSections.contact ? 'expand_less' : 'expand_more'" 
            size="16px" 
            class="expand-icon"
          />
        </button>
        
        <div v-if="expandedSections.contact" class="section-content">
          <div class="contact-links">
            <a :href="`tel:${collaborateur.phone}`" class="contact-link">
              <va-icon name="phone" size="14px" />
              {{ collaborateur.phone }}
            </a>
            <a :href="`mailto:${collaborateur.email}`" class="contact-link">
              <va-icon name="email" size="14px" />
              {{ collaborateur.email }}
            </a>
          </div>
        </div>
      </div>

      <!-- Section 2: Disponibilités (pliable) -->
      <div class="collapsible-section">
        <button class="section-header" @click="toggleSection('dispos')">
          <va-icon name="schedule" size="16px" />
          <span class="section-title">
            Disponibilités ({{ collaborateurStats.totalDispos }})
          </span>
          <va-icon 
            :name="expandedSections.dispos ? 'expand_less' : 'expand_more'" 
            size="16px" 
            class="expand-icon"
          />
        </button>
        
        <div v-if="expandedSections.dispos" class="section-content">
          <div v-if="collaborateurDispos.length === 0" class="empty-state">
            Aucune disponibilité cette semaine
          </div>
          
          <div v-else class="dispos-list">
            <div 
              v-for="dispo in collaborateurDispos.slice(0, showAllDispos ? undefined : 3)" 
              :key="dispo.id"
              class="dispo-item"
            >
              <div class="dispo-date">{{ formatDateShort(dispo.date) }}</div>
              <div class="dispo-info">
                <div class="dispo-time">{{ dispo.heure_debut }}-{{ dispo.heure_fin }}</div>
                <div class="dispo-lieu">{{ dispo.lieu }}</div>
              </div>
            </div>
            
            <button 
              v-if="collaborateurDispos.length > 3"
              @click="showAllDispos = !showAllDispos"
              class="show-more-btn"
            >
              {{ showAllDispos ? 'Voir moins' : `Voir ${collaborateurDispos.length - 3} de plus` }}
            </button>
          </div>
        </div>
      </div>

      <!-- Section 3: Statistiques (pliable) -->
      <div class="collapsible-section">
        <button class="section-header" @click="toggleSection('stats')">
          <va-icon name="analytics" size="16px" />
          <span class="section-title">Statistiques</span>
          <va-icon 
            :name="expandedSections.stats ? 'expand_less' : 'expand_more'" 
            size="16px" 
            class="expand-icon"
          />
        </button>
        
        <div v-if="expandedSections.stats" class="section-content">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ collaborateurStats.heuresTotal }}h</div>
              <div class="stat-label">Total heures</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ collaborateurStats.lieuxUniques }}</div>
              <div class="stat-label">Lieux différents</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 4: Notes (pliable) -->
      <div class="collapsible-section">
        <button class="section-header" @click="toggleSection('notes')">
          <va-icon name="notes" size="16px" />
          <span class="section-title">Notes</span>
          <div class="section-actions">
            <va-icon 
              v-if="hasNotesChanges"
              name="fiber_manual_record" 
              size="8px" 
              color="warning"
              class="changes-indicator"
            />
            <va-icon 
              :name="expandedSections.notes ? 'expand_less' : 'expand_more'" 
              size="16px" 
              class="expand-icon"
            />
          </div>
        </button>
        
        <div v-if="expandedSections.notes" class="section-content">
          <va-textarea
            v-model="localNotes"
            :readonly="!editMode"
            placeholder="Ajouter des notes..."
            autosize
            min-rows="2"
            max-rows="4"
            class="notes-textarea"
          />
          
          <div class="notes-actions">
            <template v-if="editMode">
              <va-button 
                size="small"
                color="success"
                icon="save"
                @click="saveNotes"
                :loading="savingNotes"
              >
                Sauvegarder
              </va-button>
              <va-button 
                size="small"
                color="secondary"
                @click="cancelNotesEdit"
              >
                Annuler
              </va-button>
            </template>
            <va-button 
              v-else
              size="small"
              color="primary"
              icon="edit"
              @click="editMode = true"
            >
              Modifier
            </va-button>
          </div>
        </div>
      </div>

      <!-- Actions compactes -->
      <div class="modal-actions">
        <va-button
          size="small"
          color="secondary"
          @click="closeModal"
        >
          Fermer
        </va-button>
        
        <va-button
          size="small"
          color="primary"
          icon="edit"
          @click="editCollaborateur"
        >
          Modifier
        </va-button>
      </div>
    </div>
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Collaborateur, DisponibiliteExtended } from '@/types/planning'
import { getUserInitials, getUserColor } from '../services/avatarUtils'

// Props
interface Props {
  collaborateur?: Collaborateur | null
  collaborateurDispos?: DisponibiliteExtended[]
  collaborateurColor?: string
  visible: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collaborateur: null,
  collaborateurDispos: () => [],
  collaborateurColor: '#3b82f6',
  visible: false
})

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'edit-collaborateur': [collaborateur: Collaborateur]
  'save-notes': [collaborateur: Collaborateur, notes: string]
}>()

// State
const editMode = ref(false)
const localNotes = ref('')
const savingNotes = ref(false)
const showAllDispos = ref(false)
const expandedSections = ref({
  contact: false,
  dispos: true, // Ouvert par défaut
  stats: false,
  notes: false
})

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const collaborateurStats = computed(() => {
  if (!props.collaborateurDispos) {
    return { totalDispos: 0, heuresTotal: 0, lieuxUniques: 0 }
  }

  const lieuxSet = new Set<string>()
  let heuresTotal = 0

  props.collaborateurDispos.forEach(dispo => {
    lieuxSet.add(dispo.lieu)
    
    // Calcul des heures
    const debut = parseTime(dispo.heure_debut)
    const fin = parseTime(dispo.heure_fin)
    if (debut && fin) {
      heuresTotal += (fin.getTime() - debut.getTime()) / (1000 * 60 * 60)
    }
  })

  return {
    totalDispos: props.collaborateurDispos.length,
    heuresTotal: Math.round(heuresTotal * 10) / 10,
    lieuxUniques: lieuxSet.size
  }
})

const hasNotesChanges = computed(() => {
  const originalNotes = props.collaborateur?.notes || props.collaborateur?.note || ''
  return localNotes.value !== originalNotes
})

// Avatar computed pour utiliser les fonctions centralisées
const avatarInitials = computed(() => {
  if (!props.collaborateur) return ''
  return getUserInitials({
    nom: props.collaborateur.nom,
    prenom: props.collaborateur.prenom
  })
})

const avatarColor = computed(() => {
  if (!props.collaborateur) return props.collaborateurColor
  // Créer un identifiant unique basé sur nom+prenom pour une couleur cohérente
  const uid = `${props.collaborateur.nom}-${props.collaborateur.prenom}`.toLowerCase()
  return getUserColor(uid, props.collaborateurColor)
})

// Watchers
watch(() => props.collaborateur, (newCollaborateur) => {
  if (newCollaborateur) {
    localNotes.value = newCollaborateur.notes || newCollaborateur.note || ''
    editMode.value = false
  }
}, { immediate: true })

watch(() => props.visible, (visible) => {
  if (visible && props.collaborateur) {
    localNotes.value = props.collaborateur.notes || props.collaborateur.note || ''
  }
})

// Methods
const parseTime = (timeStr: string): Date | null => {
  try {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  } catch {
    return null
  }
}

const formatDateShort = (dateStr: string): string => {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  } catch {
    return dateStr
  }
}

const toggleSection = (section: keyof typeof expandedSections.value) => {
  expandedSections.value[section] = !expandedSections.value[section]
}

const closeModal = () => {
  isVisible.value = false
}

const editCollaborateur = () => {
  if (props.collaborateur) {
    emit('edit-collaborateur', props.collaborateur)
    closeModal()
  }
}

const saveNotes = async () => {
  if (!props.collaborateur) return
  
  savingNotes.value = true
  try {
    emit('save-notes', props.collaborateur, localNotes.value)
    editMode.value = false
  } finally {
    savingNotes.value = false
  }
}

const cancelNotesEdit = () => {
  localNotes.value = props.collaborateur?.notes || props.collaborateur?.note || ''
  editMode.value = false
}
</script>

<style scoped>
/* Design compact avec sections pliables - avec marge confortable */
.collaborateur-info-compact {
  padding: 8px; /* Marge plus confortable */
  max-width: 100%; /* Utilise toute la largeur de la modale */
  font-size: 13px;
}

/* En-tête compact avec thème couleur - bord à bord */
.collaborateur-header-compact {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 5%, #f8fafc) 0%, 
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 8%, #e2e8f0) 100%);
  border-radius: 0; /* Suppression des coins arrondis pour être bord à bord */
  padding: 16px; /* Padding interne approprié */
  margin-bottom: 0; /* Suppression de la marge */
  border: none; /* Suppression de la bordure */
  border-bottom: 1px solid color-mix(in srgb, var(--collaborateur-color, #3b82f6) 20%, #e2e8f0); /* Bordure uniquement en bas */
  position: relative;
  overflow: hidden;
}

/* Fallback pour navigateurs sans color-mix */
.collaborateur-header-compact {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.color-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 0 4px 4px 0;
}

.collaborateur-main-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collaborateur-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.collaborateur-details {
  flex: 1;
  min-width: 0;
}

.collaborateur-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collaborateur-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--va-color-text-secondary);
}

.meta-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-separator {
  opacity: 0.5;
}

.stats-badge {
  color: white;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Sections pliables - ajustées pour le format bord à bord */
.collapsible-section {
  border: none; /* Suppression des bordures pour un look plus épuré */
  border-bottom: 1px solid #e2e8f0; /* Bordure seulement en bas */
  border-radius: 0; /* Suppression des coins arrondis */
  margin-bottom: 0; /* Suppression des marges */
  overflow: hidden;
}

.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--va-color-background-element);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
}

.section-header:hover {
  background: var(--va-color-background-secondary);
}

.section-title {
  flex: 1;
  text-align: left;
  color: var(--va-color-text-primary);
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expand-icon {
  color: var(--va-color-text-secondary);
  transition: transform 0.2s ease;
}

.changes-indicator {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.section-content {
  padding: 12px;
  background: white;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 200px;
    opacity: 1;
  }
}

/* Contenu des sections */
.contact-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--va-color-background-element);
  border-radius: 6px;
  color: var(--va-primary);
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 12px;
}

.contact-link:hover {
  background: var(--va-primary);
  color: white;
  transform: translateX(2px);
}

.empty-state {
  text-align: center;
  color: var(--va-color-text-secondary);
  font-style: italic;
  padding: 16px;
}

.dispos-list {
  max-height: 180px;
  overflow-y: auto;
}

.dispo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  margin-bottom: 4px;
  background: var(--va-color-background-element);
  border-radius: 6px;
  font-size: 12px;
}

.dispo-date {
  background: var(--va-success);
  color: white;
  padding: 4px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 10px;
  min-width: 32px;
  text-align: center;
  flex-shrink: 0;
}

.dispo-info {
  flex: 1;
  min-width: 0;
}

.dispo-time {
  font-weight: 600;
  margin-bottom: 1px;
  color: var(--va-color-text-primary);
}

.dispo-lieu {
  color: var(--va-color-text-secondary);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.show-more-btn {
  width: 100%;
  padding: 6px;
  margin-top: 6px;
  background: transparent;
  border: 1px dashed var(--va-color-border);
  border-radius: 4px;
  color: var(--va-color-text-secondary);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
}

.show-more-btn:hover {
  background: var(--va-color-background-element);
  border-color: var(--va-primary);
  color: var(--va-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 8px;
  background: var(--va-color-background-element);
  border-radius: 6px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--va-primary);
  margin-bottom: 2px;
}

.stat-label {
  font-size: 10px;
  color: var(--va-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.notes-textarea {
  width: 100%;
  margin-bottom: 8px;
  font-size: 12px;
}

.notes-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

/* Actions principales compactes - avec padding pour le format bord à bord */
.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px; /* Padding sur tous les côtés */
  border-top: 1px solid var(--va-color-border);
  margin-top: 0; /* Suppression de la marge */
  background: var(--va-color-background-element); /* Fond légèrement différent */
}

/* Suppression du fond noir/overlay */
:deep(.va-modal__overlay) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  background: transparent !important;
  backdrop-filter: none !important;
}

:deep(.va-modal__overlay--lowest) {
  display: none !important;
  visibility: hidden !important;
}

:deep(.va-modal__overlay--top) {
  display: none !important;
  visibility: hidden !important;
}

:deep(.va-modal__container::before) {
  display: none !important;
}

:deep(.va-modal) {
  background: transparent !important;
}

/* Responsive mobile ultra-compact */
@media (max-width: 640px) {
  .collaborateur-info-compact {
    padding: 6px;
    font-size: 12px;
  }
  
  .collaborateur-header-compact {
    padding: 10px;
    margin-bottom: 6px;
  }
  
  .collaborateur-main-info {
    gap: 10px;
  }
  
  .collaborateur-avatar {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  
  .collaborateur-name {
    font-size: 14px;
  }
  
  .collaborateur-meta {
    font-size: 11px;
  }
  
  .section-header {
    padding: 8px 10px;
    font-size: 12px;
  }
  
  .section-content {
    padding: 10px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .modal-actions .va-button {
    width: 100%;
  }
}
</style>
