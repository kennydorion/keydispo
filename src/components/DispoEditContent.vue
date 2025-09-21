<template>
  <div class="dispo-modal-redesigned" v-if="selectedCell && selectedCollaborateur">
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
              {{ getUserInitials(selectedCollaborateur) }}
            </div>
            <div class="avatar-ring"></div>
          </div>
          
          <div class="info-text">
            <h2 class="collaborateur-name">{{ selectedCollaborateur.prenom }} {{ selectedCollaborateur.nom }}</h2>
            <p class="date-info">
              <va-icon name="calendar_today" size="16px" />
              {{ formattedDate }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Zone de contenu scrollable unique -->
    <div class="scrollable-content">
      <!-- Section des disponibilités existantes -->
      <div class="content-section">
        <div class="section-card">
          <div class="section-header">
            <div class="section-title">
              <va-icon name="event_available" color="primary" />
              <span>Mes disponibilités</span>
            </div>
          </div>

    <div v-if="selectedCellDispos.length === 0" class="empty-state">
            <div class="empty-illustration">
              <va-icon name="event_busy" size="48px" color="secondary" />
            </div>
            <h3 class="empty-title">Aucune disponibilité</h3>
            <p class="empty-subtitle">Commencez par ajouter votre première disponibilité pour ce jour</p>
          </div>

      <div v-else class="dispos-grid">
      <div
    v-for="(dispo, index) in sortedSelectedCellDispos"
            :key="index"
            class="dispo-card"
            :class="[
              `type-${dispo.type}`,
              { 'is-editing': editingDispoIndex === index },
              { 'is-readonly': isCollaboratorView && dispo.type === 'mission' }
            ]"
          >
            <div class="card-header">
              <div class="type-indicator">
                <va-icon :name="getTypeIcon(dispo.type)" size="18px" />
                <span class="type-text">{{ getTypeText(dispo.type) }}</span>
              </div>
        <div v-if="dispo._cont === 'end'" class="continuation-pill" title="Suite de la veille">⤺ Suite</div>
              
              <div v-if="editingDispoIndex === index" class="editing-badge">
                <va-icon name="edit" size="12px" />
                <span>En édition</span>
              </div>
              
              <div v-if="isCollaboratorView && dispo.type === 'mission'" class="readonly-badge">
                <va-icon name="visibility" size="12px" />
                <span>Lecture seule</span>
              </div>
            </div>

            <div class="card-content">
              <div v-if="dispo.type === 'mission'" class="detail-row">
                <va-icon name="place" size="14px" />
                <span>{{ dispo.lieu || '—' }}</span>
              </div>
              
              <div v-if="isRangeLikeDisplay(dispo)" class="detail-row">
                <va-icon name="schedule" size="14px" />
                <span>{{ dispo.heure_debut }} - {{ dispo.heure_fin }}</span>
                <span v-if="isOvernightTime(dispo.heure_debut, dispo.heure_fin)" class="overnight-badge">Nuit</span>
                <span v-if="dispo._cont === 'end'" class="continuation-badge" title="Continuation depuis la veille">⤺</span>
              </div>
              
              <div v-else-if="isSlotDisplay(dispo)" class="detail-row">
                <va-icon name="view_module" size="14px" />
                <span>{{ getSlotText(slotsFor(dispo)) }}</span>
              </div>
              
              <div v-else-if="isFullDayDisplay(dispo)" class="detail-row">
                <va-icon name="today" size="14px" />
                <span>Journée complète</span>
              </div>
            </div>

            <div v-if="!(isCollaboratorView && dispo.type === 'mission')" class="card-actions">
              <va-button
                @click="$emit('edit-dispo-line', index)"
                :color="editingDispoIndex === index ? 'warning' : 'primary'"
                :icon="editingDispoIndex === index ? 'close' : 'edit'"
                size="small"
                preset="plain"
                :disabled="editingDispoIndex !== null && editingDispoIndex !== index"
              >
                {{ editingDispoIndex === index ? 'Annuler' : 'Modifier' }}
              </va-button>
              
              <va-button
                @click="$emit('remove-dispo', index)"
                color="danger"
                icon="delete"
                size="small"
                preset="plain"
                :disabled="editingDispoIndex !== null"
              >
                Supprimer
              </va-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Formulaire d'édition moderne -->
    <Transition name="form-appear" mode="out-in">
      <div v-if="editingDispoIndex !== null || isAddingNewDispo" key="edit-form" class="content-section">
        <div class="section-card edit-card">
          <div class="section-header">
            <div class="section-title">
              <va-icon name="add_circle" color="success" />
              <span>{{ isAddingNewDispo ? 'Nouvelle disponibilité' : 'Modifier la disponibilité' }}</span>
            </div>
          </div>

          <div class="form-content">
            <!-- Type de disponibilité -->
            <div class="form-group">
              <label class="form-label">Type de disponibilité</label>
              <div class="button-grid">
                <button
                  v-for="typeOpt in filteredTypeOptions"
                  :key="typeOpt.value"
                  :class="[
                    'type-button',
                    `type-${typeOpt.value}`,
                    { 'active': editingDispo.type === typeOpt.value }
                  ]"
                  @click="$emit('set-editing-type', typeOpt.value)"
                >
                  <va-icon :name="getTypeIcon(typeOpt.value)" size="20px" />
                  <span>{{ typeOpt.text }}</span>
                </button>
              </div>
            </div>

            <!-- Format horaire -->
            <div v-if="editingDispo.type !== 'indisponible'" class="form-group">
              <label class="form-label">Format horaire</label>
              <div class="button-grid">
                <button
                  v-for="formatOpt in timeKindOptionsFiltered"
                  :key="formatOpt.value"
                  :class="[
                    'format-button',
                    { 'active': editingDispo.timeKind === formatOpt.value }
                  ]"
                  @click="$emit('set-editing-time-kind', formatOpt.value)"
                >
                  <va-icon :name="getTimeKindIcon(formatOpt.value)" size="18px" />
                  <span>{{ formatOpt.text }}</span>
                </button>
              </div>
            </div>

            <!-- Lieu de mission: visible en lecture seule pour collaborateur, éditable pour admin -->
            <div v-if="editingDispo.type === 'mission'" class="form-group">
              <label class="form-label">Lieu de mission</label>
              <template v-if="!isCollaboratorView">
                <LieuCombobox
                  :model-value="editingDispo.lieu || ''"
                  @update:model-value="(v: string) => $emit('update-editing-lieu', v)"
                  :options="lieuxOptionsStrings"
                  label=""
                  size="large"
                  theme="light"
                  class="lieu-input"
                  @create="$emit('create-lieu', $event)"
                />
              </template>
              <template v-else>
                <div class="detail-row">
                  <va-icon name="place" size="14px" />
                  <span>{{ editingDispo.lieu || '—' }}</span>
                </div>
              </template>
            </div>

            <!-- Horaires personnalisées -->
            <div v-if="editingDispo.timeKind === 'range'" class="form-group">
              <label class="form-label">Horaires</label>
              <div class="time-inputs">
                <div class="time-field">
                  <label class="time-label">Début</label>
                  <va-input
                    v-model="editingDispo.heure_debut"
                    type="time"
                    step="900"
                    size="large"
                    class="time-input"
                  />
                </div>
                <div class="time-separator">
                  <va-icon name="arrow_forward" size="20px" />
                </div>
                <div class="time-field">
                  <label class="time-label">Fin</label>
                  <va-input
                    v-model="editingDispo.heure_fin"
                    type="time"
                    step="900"
                    size="large"
                    class="time-input"
                    :disabled="!editingDispo.heure_debut"
                  />
                </div>
              </div>
              
              <!-- Indication automatique pour les horaires de nuit -->
              <div v-if="isDetectedOvernight" class="form-hint">
                <va-icon name="nightlight" size="14px" />
                <span>Mission de nuit détectée automatiquement - sera affichée sur 2 jours ({{ editingDispo.heure_debut }} → {{ editingDispo.heure_fin }})</span>
              </div>
            </div>

            <!-- Créneaux standards -->
            <div v-if="editingDispo.timeKind === 'slot'" class="form-group">
              <label class="form-label">Créneaux disponibles</label>
              <div class="slots-grid">
                <button
                  v-for="slot in slotOptions"
                  :key="slot.value"
                  :class="[
                    'slot-button',
                    { 'active': editingDispo.slots?.includes(slot.value) }
                  ]"
                  @click="$emit('toggle-editing-slot', slot.value)"
                >
                  {{ slot.text }}
                </button>
              </div>
            </div>

            <!-- Actions du formulaire -->
            <div class="form-actions">
              <va-button 
                @click="$emit('cancel-edit-dispo')" 
                color="secondary" 
                size="large"
                preset="secondary"
              >
                Annuler
              </va-button>
              <va-button 
                @click="$emit('save-edit-dispo')" 
                color="primary" 
                size="large"
                :disabled="!isEditFormValid"
              >
                {{ isAddingNewDispo ? 'Ajouter' : 'Sauvegarder' }}
              </va-button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

      <!-- Bouton d'ajout dans la zone scrollable -->
      <div v-if="!isAddingNewDispo" class="add-section">
        <va-button
          @click="$emit('add-new-dispo-line')"
          color="success"
          icon="add"
          size="large"
          :disabled="editingDispoIndex !== null"
          class="add-button"
        >
          Ajouter une disponibilité
        </va-button>
      </div>
      </div>
    </div>

    <!-- Actions principales fixées en bas -->
    <div class="footer-actions">
      <va-button 
        color="secondary" 
        size="large"
        @click="$emit('cancel-modal')"
        class="cancel-button"
      >
        Fermer
      </va-button>
      <va-button 
        color="primary" 
        size="large"
        :loading="saving" 
        @click="$emit('save-dispos')"
        class="save-button"
      >
        Enregistrer tout
      </va-button>
    </div>
</template>

<script setup lang="ts">
import LieuCombobox from './LieuCombobox.vue'
import type { Collaborateur } from '@/types/planning'
import * as planningDisplayService from '@/services/planningDisplayService'

interface Disponibilite {
  id?: string
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  lieu?: string
  heure_debut?: string
  heure_fin?: string
  slots?: string[]
  // Métadonnées pour overnight (continuation, etc.)
  _cont?: 'start' | 'end'
  date?: string
}

import { computed } from 'vue'

// Récupérer les props avec définition inline pour accéder aux valeurs
const props = defineProps<{
  selectedCell: { collaborateurId: string; date: string } | null
  selectedCollaborateur: Collaborateur | null
  collaborateurColor: string
  formattedDate: string
  selectedCellDispos: Disponibilite[]
  editingDispoIndex: number | null
  isAddingNewDispo: boolean
  editingDispo: Partial<Disponibilite>
  typeOptions: Array<{ text: string; value: string }>
  slotOptions: Array<{ text: string; value: string }>
  lieuxOptionsStrings: string[]
  isEditFormValid: boolean
  saving: boolean
  timeKindOptions: Array<{ text: string; value: string }>
  timeKindOptionsFiltered: Array<{ text: string; value: string }>
  isDetectedOvernight: boolean
  isCollaboratorView?: boolean
  headerStatNumber?: number
  headerStatLabel?: string
  getTypeIcon: (t: any) => string
  getTypeText: (t: any) => string
  getTypeColor: (t: any) => string
  getDispoTypeClass: (d: any) => string
  getSlotText: (slots?: string[]) => string
  getTimeKindIcon: (k: any) => string
  getUserInitials: (u: any) => string
  isOvernightTime: (start?: string, end?: string) => boolean
}>()

defineEmits<{
  (e: 'cancel-modal'): void
  (e: 'save-dispos'): void
  (e: 'edit-dispo-line', index: number): void
  (e: 'remove-dispo', index: number): void
  (e: 'set-editing-type', value: string): void
  (e: 'set-editing-time-kind', value: string): void
  (e: 'toggle-editing-slot', value: string): void
  (e: 'create-lieu', value: string): void
  (e: 'cancel-edit-dispo'): void
  (e: 'save-edit-dispo'): void
  (e: 'add-new-dispo-line'): void
  (e: 'update-editing-lieu', value: string): void
}>()

const filteredTypeOptions = computed(() => {
  if (props.isCollaboratorView) {
    // Exclure les missions pour les collaborateurs
    return props.typeOptions.filter(option => option.value !== 'mission')
  }
  return props.typeOptions
})

// Helpers d'affichage: utiliser la résolution unifiée pour éviter les confusions (ex: créneau "nuit")
function resolveKind(d: Disponibilite) {
  return planningDisplayService.resolveDispoKind(d as any)
}

function isSlotDisplay(d: Disponibilite) {
  const k = resolveKind(d)
  return k.timeKind === 'slot' && (Array.isArray(d.slots) ? d.slots.length > 0 : (k.slots?.length || 0) > 0)
}

function isRangeLikeDisplay(d: Disponibilite) {
  const k = resolveKind(d)
  return (k.timeKind === 'range' || k.timeKind === 'overnight') && !!d.heure_debut && !!d.heure_fin
}

function isFullDayDisplay(d: Disponibilite) {
  const k = resolveKind(d)
  return k.timeKind === 'full-day'
}

function slotsFor(d: Disponibilite): string[] | undefined {
  if (Array.isArray(d.slots) && d.slots.length > 0) return d.slots
  const k = resolveKind(d)
  return k.slots
}

// Tri: continuations d'abord, ensuite slots, puis plages (par début), journée en dernier
const sortedSelectedCellDispos = computed(() => {
  const slotOrder: Record<string, number> = { morning: 1, midday: 2, afternoon: 3, evening: 4, night: 5 }
  const toMin = (t?: string) => {
    if (!t) return 10_000
    const [h, m] = (t || '').split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const slotKey = (d: Disponibilite) => {
    const k = resolveKind(d)
    if (k.timeKind !== 'slot' || !(slotsFor(d)?.length)) return 10_000
    const s = [...(slotsFor(d) || [])].sort((a, b) => (slotOrder[a] || 99) - (slotOrder[b] || 99))
    return slotOrder[s[0]] || 99
  }
  const rangeStartKey = (d: Disponibilite) => toMin(d.heure_debut)
  const contEndKey = (d: Disponibilite) => toMin(d.heure_fin)
  return [...props.selectedCellDispos].slice().sort((a, b) => {
    const ka = resolveKind(a)
    const kb = resolveKind(b)

    // full-day en dernier
    const aFD = ka.timeKind === 'full-day'
    const bFD = kb.timeKind === 'full-day'
    if (aFD && !bFD) return 1
    if (bFD && !aFD) return -1

    // Continuations (depuis veille) d'abord, triées par heure de fin
    const aCont = a._cont === 'end'
    const bCont = b._cont === 'end'
    if (aCont && bCont) return contEndKey(a) - contEndKey(b)
    if (aCont && !bCont) return -1
    if (bCont && !aCont) return 1

    // Slots ensuite, par ordre logique
    const aSlot = ka.timeKind === 'slot'
    const bSlot = kb.timeKind === 'slot'
    if (aSlot && bSlot) return slotKey(a) - slotKey(b)
    if (aSlot && !bSlot) return -1
    if (bSlot && !aSlot) return 1

    // Ranges/overnight (début) ensuite
    return rangeStartKey(a) - rangeStartKey(b)
  })
})
</script>

<style scoped>
/* === MODAL REDESIGNÉ === */
.dispo-modal-redesigned {
  width: min(90vw, 550px);
  max-height: 85vh;
  margin: auto;
  background: white;
  border-radius: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  
  /* Centrage vertical sur desktop */
  position: relative;
  top: 50%;
  transform: translateY(-50%);
}

/* === RÈGLES ANTI-DÉBORDEMENT === */
.dispo-modal-redesigned * {
  box-sizing: border-box;
  max-width: 100%;
}

.dispo-modal-redesigned input,
.dispo-modal-redesigned select,
.dispo-modal-redesigned textarea {
  max-width: 100%;
}

/* === HEADER COMPACT ET ÉLÉGANT === */
.header-section {
  position: relative;
  background: linear-gradient(135deg, var(--collaborateur-color, var(--primary-color)) 0%, color-mix(in srgb, var(--collaborateur-color, var(--primary-color)) 85%, #8b5cf6) 100%);
  padding: 1rem 1.5rem;
  color: white;
  flex-shrink: 0;
  box-sizing: border-box;
  max-width: 100%;
}

.header-section::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: transparent;
}

.header-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.1) 1px, transparent 0);
  background-size: 20px 20px;
  opacity: 0.5;
}

.header-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0; /* Permet le text-overflow */
}

.collaborateur-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.info-text {
  min-width: 0;
  flex: 1;
}

.collaborateur-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  margin: 0;
  opacity: 0.9;
}

/* === CONTENU PRINCIPAL OPTIMISÉ === */
.scrollable-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #fafbfc;
}

.content-section {
  padding: 1rem;
  background: white;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  max-width: 100%;
}

.section-card {
  background: white;
  border-radius: 8px;
  border: 1px solid var(--gray-200);
  margin-bottom: 1rem;
  overflow: hidden;
  box-sizing: border-box;
  max-width: 100%;
}

.section-header {
  padding: 0.75rem 1rem;
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
  box-sizing: border-box;
  max-width: 100%;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--gray-800);
}

/* === ÉTAT VIDE === */
.empty-state {
  padding: 2rem 1rem;
  text-align: center;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-700);
  margin: 0.5rem 0 0.25rem 0;
}

.empty-subtitle {
  color: var(--gray-500);
  margin: 0;
  font-size: 0.85rem;
}

/* === LISTE DES DISPONIBILITÉS === */
.dispos-grid {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dispo-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 6px;
  padding: 0.75rem;
  transition: all 0.2s ease;
  position: relative;
}

.dispo-card:hover {
  border-color: var(--gray-300);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.dispo-card.is-editing {
  border-color: var(--warning-color);
  background: rgba(245, 158, 11, 0.02);
}

.dispo-card.type-disponible {
  border-left: 3px solid var(--success-color);
}

.dispo-card.type-indisponible {
  border-left: 3px solid var(--danger-color);
}

.dispo-card.type-mission {
  border-left: 3px solid var(--primary-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.type-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 600;
  color: var(--gray-700);
  font-size: 0.85rem;
}

.editing-badge,
.readonly-badge,
.continuation-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
}

.editing-badge {
  background: var(--warning-color);
  color: white;
}

.readonly-badge {
  background: var(--gray-500);
  color: white;
}

.continuation-pill {
  background: rgba(17, 24, 39, 0.1);
  color: #111827;
}

.card-content {
  margin-bottom: 0.5rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--gray-600);
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.overnight-badge,
.continuation-badge {
  background: var(--primary-color);
  color: white;
  padding: 0.0625rem 0.375rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  margin-left: 0.375rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.card-actions .va-button {
  font-weight: 600;
}

.card-actions .va-button--primary {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
  border-color: #d97706 !important;
  box-shadow: 0 1px 6px rgba(245, 158, 11, 0.25) !important;
}

.card-actions .va-button--primary:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3) !important;
}

.card-actions .va-button--warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
  border-color: #d97706 !important;
  box-shadow: 0 1px 6px rgba(245, 158, 11, 0.25) !important;
}

.card-actions .va-button--warning:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3) !important;
}

.card-actions .va-button--danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  border-color: #dc2626 !important;
  box-shadow: 0 1px 6px rgba(239, 68, 68, 0.25) !important;
}

.card-actions .va-button--danger:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3) !important;
}

/* === FORMULAIRES - NE PAS TOUCHER === */
.edit-card {
  border: 1.5px solid var(--success-color);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0.01) 100%);
}

.edit-card .section-header {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
  border-bottom-color: rgba(16, 185, 129, 0.15);
}

.form-content {
  padding: 1rem;
  box-sizing: border-box;
  max-width: 100%;
}

.form-group {
  margin-bottom: 1.25rem;
  box-sizing: border-box;
  max-width: 100%;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  box-sizing: border-box;
  max-width: 100%;
}

.type-button,
.format-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 0.5rem;
  border: 2px solid var(--gray-200);
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.type-button:hover,
.format-button:hover {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
}

.type-button.active,
.format-button.active {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  transform: translateY(-2px);
}

.type-button.type-disponible {
  border-color: #4caf50;
}

.type-button.type-disponible:hover {
  border-color: #388e3c;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.04) 100%);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);
}

.type-button.type-disponible.active {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border-color: #388e3c;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.type-button.type-indisponible {
  border-color: #f44336;
}

.type-button.type-indisponible:hover {
  border-color: #d32f2f;
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(244, 67, 54, 0.04) 100%);
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.2);
}

.type-button.type-indisponible.active {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  border-color: #d32f2f;
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
}

.type-button.type-mission {
  border-color: #9c27b0;
}

.type-button.type-mission:hover {
  border-color: #7b1fa2;
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.08) 0%, rgba(156, 39, 176, 0.04) 100%);
  box-shadow: 0 4px 15px rgba(156, 39, 176, 0.2);
}

.type-button.type-mission.active {
  background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
  border-color: #7b1fa2;
  box-shadow: 0 4px 15px rgba(156, 39, 176, 0.3);
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--gray-50);
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--gray-600);
  margin-top: 0.5rem;
}

.time-inputs {
  display: flex;
  align-items: end;
  gap: 0.75rem;
  box-sizing: border-box;
  max-width: 100%;
}

.time-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
  box-sizing: border-box;
}

.time-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--gray-600);
}

.time-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  color: var(--gray-400);
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
  box-sizing: border-box;
  max-width: 100%;
}

.slot-button {
  padding: 0.6rem 0.75rem;
  border: 2px solid var(--gray-200);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.slot-button:hover {
  border-color: #4caf50;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.04) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.slot-button.active {
  border-color: #388e3c;
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  transform: translateY(-2px);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--gray-200);
  margin-top: 1rem;
  box-sizing: border-box;
  max-width: 100%;
}

.form-actions .va-button {
  min-width: 120px;
  font-weight: 600;
}

.form-actions .va-button--primary {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%) !important;
  border-color: #388e3c !important;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.25) !important;
}

.form-actions .va-button--primary:hover {
  background: linear-gradient(135deg, #388e3c 0%, #2e7d32 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3) !important;
}

.form-actions .va-button--secondary {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  border-color: #4b5563 !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.25) !important;
}

.form-actions .va-button--secondary:hover {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3) !important;
}

/* === TRANSITIONS === */
.form-appear-enter-active,
.form-appear-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.form-appear-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.form-appear-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

/* === SECTION D'AJOUT SIMPLIFIÉE === */
.add-section {
  padding: 1rem;
  text-align: center;
  background: white;
  border-top: 1px solid var(--gray-200);
}

.add-button {
  min-width: 200px;
}

/* === FOOTER FIXE OPTIMISÉ === */
.footer-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  background: white;
  border-top: 1px solid var(--gray-200);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  box-sizing: border-box;
  max-width: 100%;
}

.cancel-button,
.save-button {
  min-width: 120px;
  font-weight: 600;
}

.cancel-button {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  border-color: #4b5563 !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.25) !important;
}

.cancel-button:hover {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3) !important;
}

.save-button {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
  border-color: #4f46e5 !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25) !important;
}

.save-button:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
}

.add-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  border-color: #059669 !important;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25) !important;
  font-weight: 600;
}

.add-button:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
}

/* === LIEU COMBOBOX DANS MODAL === */
.lieu-input {
  position: relative;
  z-index: 1;
}

/* S'assurer que le dropdown du lieu peut s'afficher correctement */
:deep(.lieu-combobox) {
  position: relative;
  z-index: 1000;
}

:deep(.lieu-combobox .cbx-list) {
  z-index: 1001;
  /* Forcer le dropdown à rester dans les limites visuelles */
  max-height: min(200px, calc(50vh - 100px));
  overflow-y: auto;
  overflow-x: hidden;
}

/* Assurer que le contenu de la modal permet l'overflow du dropdown */
.form-content {
  overflow: visible;
}

.scrollable-content {
  overflow-x: hidden;
  overflow-y: auto;
  /* Position relative pour que les dropdowns se positionnent correctement */
  position: relative;
}

/* Mobile : Plein écran avec footer visible */
@media (max-width: 768px) {
  .dispo-modal-redesigned {
    width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    margin: 0;
    top: 0;
    transform: none;
    border: none;
    box-shadow: none;
  }
  
  .header-section {
    padding: 1rem;
    flex-shrink: 0;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .collaborateur-info {
    width: 100%;
  }
  
  .collaborateur-avatar {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  
  .collaborateur-name {
    font-size: 1rem;
  }
  
  .scrollable-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    /* Assurer que le contenu ne déborde pas sur le footer */
    height: calc(100vh - 160px); /* Header ~80px + Footer ~80px */
  }
  
  .content-section {
    padding: 1rem;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  .section-card {
    margin-bottom: 1rem;
  }
  
  .footer-actions {
    padding: 1rem;
    flex-shrink: 0;
    gap: 0.75rem;
    /* Assurer que le footer reste collé au bas */
    position: sticky;
    bottom: 0;
    background: white;
    border-top: 2px solid var(--gray-200);
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .cancel-button,
  .save-button {
    flex: 1;
    min-width: auto;
  }

  /* Éviter les débordements sur formulaires */
  .form-content {
    padding: 0.75rem;
  }

  .button-grid {
    grid-template-columns: 1fr 1fr;
  }

  .time-inputs {
    flex-direction: column;
    gap: 0.5rem;
  }

  .slots-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
