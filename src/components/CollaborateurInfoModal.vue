<template>
  <va-modal 
    v-model="isVisible" 
    :hide-default-actions="true"
    :fullscreen="false"
    :mobile-fullscreen="true"
    max-width="600px"
    no-padding
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="() => { modalA11y.onClose(); closeModal() }"
  >
    <div v-if="collaborateur" class="collaborateur-info-modal">
      <!-- Header moderne avec gradient et animation -->
      <div class="header-section" :style="{ '--collaborateur-color': collaborateurColor }">
        <div class="header-background">
          <div class="gradient-overlay"></div>
          <div class="pattern-overlay"></div>
        </div>
        
        <div class="header-content">
          <div class="collaborateur-info">
            <div class="avatar-container">
              <div class="collaborateur-avatar" :style="{ backgroundColor: collaborateurColor }">
                {{ avatarInitials }}
              </div>
              <div class="avatar-ring"></div>
            </div>
            
            <div class="info-text">
              <h2 class="collaborateur-name">{{ collaborateur.prenom }} {{ collaborateur.nom }}</h2>
              <p class="meta-info">
                <va-icon name="work" size="16px" />
                {{ collaborateur.metier || 'Collaborateur' }}
                <span class="meta-separator">•</span>
                <va-icon name="place" size="16px" />
                {{ collaborateur.ville }}
              </p>
            </div>
          </div>
          
          <div class="header-stats">
            <div class="stat-badge">
              <span class="stat-number">{{ collaborateurStats.totalDispos }}</span>
              <span class="stat-label">Disponibilités</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Zone de contenu scrollable -->
      <div class="scrollable-content">
        <!-- Section Contact -->
        <div class="content-section">
          <div class="section-card">
            <div class="section-header">
              <button class="section-toggle" @click="toggleSection('contact')">
                <div class="section-title">
                  <va-icon name="phone" color="primary" />
                  <span>Contact</span>
                </div>
                <va-icon 
                  :name="expandedSections.contact ? 'expand_less' : 'expand_more'" 
                  size="20px" 
                  class="expand-icon"
                />
              </button>
            </div>
            
            <div v-if="expandedSections.contact" class="section-content">
              <div class="contact-grid">
                <a :href="`tel:${collaborateur.phone}`" class="contact-card">
                  <va-icon name="phone" size="20px" color="success" />
                  <div class="contact-info">
                    <div class="contact-label">Téléphone</div>
                    <div class="contact-value">{{ collaborateur.phone }}</div>
                  </div>
                </a>
                <a :href="`mailto:${collaborateur.email}`" class="contact-card">
                  <va-icon name="email" size="20px" color="info" />
                  <div class="contact-info">
                    <div class="contact-label">Email</div>
                    <div class="contact-value">{{ collaborateur.email }}</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Disponibilités -->
        <div class="content-section">
          <div class="section-card">
            <div class="section-header">
              <button class="section-toggle" @click="toggleSection('dispos')">
                <div class="section-title">
                  <va-icon name="schedule" color="primary" />
                  <span>Disponibilités ({{ collaborateurStats.totalDispos }})</span>
                </div>
                <va-icon 
                  :name="expandedSections.dispos ? 'expand_less' : 'expand_more'" 
                  size="20px" 
                  class="expand-icon"
                />
              </button>
            </div>
            
            <div v-if="expandedSections.dispos" class="section-content">
              <div v-if="collaborateurDispos.length === 0" class="empty-state">
                <div class="empty-illustration">
                  <va-icon name="event_busy" size="48px" color="secondary" />
                </div>
                <h3 class="empty-title">Aucune disponibilité</h3>
                <p class="empty-subtitle">Ce collaborateur n'a pas de disponibilités cette semaine</p>
              </div>
              
              <div v-else class="dispos-grid">
                <div 
                  v-for="dispo in collaborateurDispos.slice(0, showAllDispos ? undefined : 3)" 
                  :key="dispo.id"
                  class="dispo-card"
                >
                  <div class="dispo-header">
                    <div class="dispo-date">{{ formatDateShort(dispo.date) }}</div>
                    <div class="dispo-type" :class="`type-${dispo.type || 'disponible'}`">
                      {{ dispo.type === 'mission' ? 'Mission' : 'Disponible' }}
                    </div>
                  </div>
                  <div class="dispo-details">
                    <div class="dispo-time">
                      <va-icon name="schedule" size="16px" />
                      {{ dispo.heure_debut }}-{{ dispo.heure_fin }}
                    </div>
                    <div class="dispo-lieu">
                      <va-icon name="place" size="16px" />
                      {{ dispo.lieu }}
                    </div>
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
        </div>

        <!-- Section Statistiques -->
        <div class="content-section">
          <div class="section-card">
            <div class="section-header">
              <button class="section-toggle" @click="toggleSection('stats')">
                <div class="section-title">
                  <va-icon name="analytics" color="primary" />
                  <span>Statistiques</span>
                </div>
                <va-icon 
                  :name="expandedSections.stats ? 'expand_less' : 'expand_more'" 
                  size="20px" 
                  class="expand-icon"
                />
              </button>
            </div>
            
            <div v-if="expandedSections.stats" class="section-content">
              <div class="stats-modern-grid">
                <div class="stat-modern-card">
                  <div class="stat-icon">
                    <va-icon name="schedule" size="24px" color="info" />
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ collaborateurStats.heuresTotal }}h</div>
                    <div class="stat-label">Total heures</div>
                  </div>
                </div>
                <div class="stat-modern-card">
                  <div class="stat-icon">
                    <va-icon name="place" size="24px" color="success" />
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ collaborateurStats.lieuxUniques }}</div>
                    <div class="stat-label">Lieux différents</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Notes -->
        <div class="content-section">
          <div class="section-card">
            <div class="section-header">
              <button class="section-toggle" @click="toggleSection('notes')">
                <div class="section-title">
                  <va-icon name="notes" color="primary" />
                  <span>Notes</span>
                  <va-icon 
                    v-if="hasNotesChanges"
                    name="fiber_manual_record" 
                    size="8px" 
                    color="warning"
                    class="changes-indicator"
                  />
                </div>
                <va-icon 
                  :name="expandedSections.notes ? 'expand_less' : 'expand_more'" 
                  size="20px" 
                  class="expand-icon"
                />
              </button>
            </div>
            
            <div v-if="expandedSections.notes" class="section-content">
              <va-textarea
                v-model="localNotes"
                :readonly="!editMode"
                placeholder="Ajouter des notes..."
                autosize
                min-rows="3"
                max-rows="6"
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
        </div>
      </div>

      <!-- Actions modernes sticky -->
      <div class="modal-actions-modern">
        <va-button
          color="secondary"
          @click="closeModal"
          class="action-btn-secondary"
        >
          Fermer
        </va-button>
        
        <va-button
          color="primary"
          icon="edit"
          @click="editCollaborateur"
          class="action-btn-primary"
        >
          Modifier le profil
        </va-button>
      </div>
    </div>
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Collaborateur, DisponibiliteExtended } from '@/types/planning'
import { getUserInitials, getUserColor } from '../services/avatarUtils'
import { useModalA11y } from '@/composables/useModalA11y'

// Router
const router = useRouter()

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

// Accessibilité modale
const modalA11y = useModalA11y()

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const collaborateurStats = computed(() => {
  if (!props.collaborateurDispos) {
    return { totalDispos: 0, heuresTotal: 0, lieuxUniques: 0 }
  }

  const totalDispos = props.collaborateurDispos.length
  const lieuxUniques = new Set(props.collaborateurDispos.map(d => d.lieu)).size
  
  // Calcul des heures totales
  const heuresTotal = props.collaborateurDispos.reduce((total, dispo) => {
    const debut = parseTime(dispo.heure_debut)
    const fin = parseTime(dispo.heure_fin)
    if (debut && fin) {
      const diffMs = fin.getTime() - debut.getTime()
      const heures = diffMs / (1000 * 60 * 60)
      return total + heures
    }
    return total
  }, 0)

  return {
    totalDispos,
    heuresTotal: Math.round(heuresTotal * 10) / 10, // Arrondi à 1 décimale
    lieuxUniques
  }
})

const hasNotesChanges = computed(() => {
  const originalNotes = props.collaborateur?.notes || props.collaborateur?.note || ''
  return localNotes.value !== originalNotes
})

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
void avatarColor.value

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
    console.log('Navigating to edit collaborateur:', props.collaborateur.id)
    // Fermer la modale
    closeModal()
    // Naviguer vers la page de modification
    if (props.collaborateur.id) {
      router.push(`/collaborateurs/${props.collaborateur.id}`)
    } else {
      console.error('Collaborateur ID manquant:', props.collaborateur)
    }
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
/* ===== DESIGN MODERNE UNIFIÉ AVEC LES AUTRES MODALES ===== */

.collaborateur-info-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  background: var(--va-color-background-element);
  position: relative;
}

/* ===== HEADER MODERNE IDENTIQUE AUX AUTRES MODALES ===== */
.header-section {
  position: relative;
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 8%, white) 0%,
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 15%, #f8fafc) 100%);
  padding: 24px;
  border-bottom: 1px solid var(--va-color-border);
  flex-shrink: 0;
}

.header-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, 
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 2%, transparent) 0%,
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 8%, transparent) 100%);
}

.pattern-overlay {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px);
  background-size: 20px 20px;
  opacity: 0.3;
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.avatar-container {
  position: relative;
}

.collaborateur-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 24px;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--collaborateur-color, #3b82f6) 25%, transparent);
  position: relative;
  z-index: 2;
}

.avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(45deg, 
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 30%, transparent),
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 50%, transparent));
  z-index: 1;
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.05); opacity: 0.8; }
}

.info-text {
  flex: 1;
}

.collaborateur-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--va-color-text-primary);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--va-color-text-secondary);
  font-size: 14px;
  margin: 0;
}

.meta-separator {
  color: var(--va-color-border);
  font-weight: bold;
}

.header-stats {
  flex-shrink: 0;
}

.stat-badge {
  background: color-mix(in srgb, var(--collaborateur-color, #3b82f6) 10%, white);
  border: 2px solid color-mix(in srgb, var(--collaborateur-color, #3b82f6) 20%, transparent);
  border-radius: 16px;
  padding: 12px 16px;
  text-align: center;
  min-width: 80px;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--collaborateur-color, #3b82f6);
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--va-color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

/* ===== ZONE DE CONTENU SCROLLABLE ===== */
.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--va-color-background-primary);
}

.content-section {
  margin-bottom: 20px;
}

.content-section:last-of-type {
  margin-bottom: 0;
}

.section-card {
  background: var(--va-color-background-element);
  border: 1px solid var(--va-color-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.section-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.section-header {
  border: none;
  background: none;
  width: 100%;
}

.section-toggle {
  width: 100%;
  background: none;
  border: none;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.section-toggle:hover {
  background: var(--va-color-background-secondary);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 16px;
  color: var(--va-color-text-primary);
}

.expand-icon {
  color: var(--va-color-text-secondary);
  transition: transform 0.2s ease;
}

.section-content {
  padding: 0 20px 20px 20px;
  border-top: 1px solid var(--va-color-border);
}

/* ===== CONTACT CARDS ===== */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--va-color-background-secondary);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.contact-card:hover {
  background: var(--va-color-background-primary);
  border-color: var(--va-color-border);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.contact-info {
  flex: 1;
}

.contact-label {
  font-size: 12px;
  color: var(--va-color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.contact-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
}

/* ===== DISPONIBILITÉS ===== */
.dispos-grid {
  display: grid;
  gap: 12px;
}

.dispo-card {
  padding: 16px;
  background: var(--va-color-background-secondary);
  border-radius: 12px;
  border: 1px solid var(--va-color-border);
  transition: all 0.2s ease;
}

.dispo-card:hover {
  background: var(--va-color-background-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.dispo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.dispo-date {
  font-weight: 700;
  font-size: 16px;
  color: var(--va-color-text-primary);
}

.dispo-type {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dispo-type.type-mission {
  background: color-mix(in srgb, var(--va-color-warning) 20%, transparent);
  color: var(--va-color-warning);
}

.dispo-type.type-disponible {
  background: color-mix(in srgb, var(--va-color-success) 20%, transparent);
  color: var(--va-color-success);
}

.dispo-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.dispo-time,
.dispo-lieu {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--va-color-text-secondary);
}

/* ===== STATISTIQUES MODERNES ===== */
.stats-modern-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-modern-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--va-color-background-secondary);
  border-radius: 16px;
  border: 1px solid var(--va-color-border);
  transition: all 0.2s ease;
}

.stat-modern-card:hover {
  background: var(--va-color-background-primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--va-color-background-element);
  border-radius: 12px;
  border: 1px solid var(--va-color-border);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--va-color-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--va-color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ===== ÉTAT VIDE ===== */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-illustration {
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 8px 0;
}

.empty-subtitle {
  color: var(--va-color-text-secondary);
  margin: 0;
}

/* ===== NOTES ===== */
.notes-textarea {
  margin-bottom: 16px;
}

.notes-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.changes-indicator {
  margin-left: 8px;
}

/* ===== BOUTONS D'ACTIONS MODERNES ===== */
.modal-actions-modern {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--va-color-border);
  background: var(--va-color-background-element);
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.action-btn-secondary,
.action-btn-primary {
  flex: 1;
  min-height: 44px;
  font-weight: 600;
}

.show-more-btn {
  width: 100%;
  padding: 12px;
  margin-top: 16px;
  background: var(--va-color-background-element);
  border: 2px dashed var(--va-color-border);
  border-radius: 12px;
  color: var(--va-color-text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.show-more-btn:hover {
  background: var(--va-color-background-secondary);
  border-color: var(--va-color-primary);
  color: var(--va-color-primary);
}

/* ===== RESPONSIVE MOBILE ===== */
@media (max-width: 640px) {
  :deep(.va-modal__dialog) {
    height: 100dvh !important;
    max-height: 100dvh !important;
    height: 100vh !important; /* Fallback */
    max-height: 100vh !important; /* Fallback */
    margin: 0 !important;
    border-radius: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .collaborateur-info-modal {
    height: 100dvh;
    height: 100vh; /* Fallback */
    max-height: 100dvh;
    max-height: 100vh; /* Fallback */
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .header-section {
    padding: 16px;
  }
  
  .collaborateur-avatar {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }
  
  .collaborateur-name {
    font-size: 20px;
  }
  
  .contact-grid {
    grid-template-columns: 1fr;
  }
  
  .dispo-details {
    grid-template-columns: 1fr;
  }
  
  .stats-modern-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions-modern {
    flex-direction: column;
    padding: 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}
</style>
