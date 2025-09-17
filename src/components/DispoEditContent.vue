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
        
        <div class="header-stats">
          <div class="stat-badge">
            <span class="stat-number">{{ headerStatNumber ?? selectedCellDispos.length }}</span>
            <span class="stat-label">
              {{ headerStatLabel || (`Disponibilité${(headerStatNumber ?? selectedCellDispos.length) > 1 ? 's' : ''}`) }}
            </span>
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
/* === DESIGN MODERNE COMPLET === */

.dispo-modal-redesigned {
  --primary-color: #6366f1;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --warning-color: #f59e0b;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  max-width: 100%;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
}

/* Spécifique pour les modales fullscreen - forcer la hauteur complète */
:global(.batch-modal--fullscreen) .dispo-modal-redesigned,
:global(.collab-modal--fullscreen) .dispo-modal-redesigned,
:global(.collab-dispo-modal--fullscreen) .dispo-modal-redesigned {
  height: 100vh !important;
  max-height: 100vh !important;
  min-height: 100vh !important;
  border-radius: 0 !important;
}

/* === HEADER SECTION === */
.header-section {
  position: relative;
  background: linear-gradient(135deg, var(--collaborateur-color, var(--primary-color)) 0%, color-mix(in srgb, var(--collaborateur-color, var(--primary-color)) 80%, #8b5cf6) 100%);
  padding: 1.25rem 1.5rem;
  color: white;
  overflow: hidden;
  flex-shrink: 0; /* Header fixe */
}

.header-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
}

.pattern-overlay {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.08) 1px, transparent 0);
  background-size: 16px 16px;
  animation: pattern-float 15s ease-in-out infinite;
}

@keyframes pattern-float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(6px, -6px) rotate(1deg); }
}

.header-content {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-container {
  position: relative;
}

.collaborateur-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.avatar-ring {
  position: absolute;
  inset: -6px;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  animation: ring-pulse 2.5s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.08); opacity: 0.2; }
}

.info-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.collaborateur-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.date-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  margin: 0;
  opacity: 0.9;
}

.header-stats {
  display: flex;
  gap: 0.75rem;
}

.stat-badge {
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  text-align: center;
  min-width: 64px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-badge:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.stat-number {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 0.6875rem;
  opacity: 0.8;
  margin-top: 0.125rem;
}

/* === CONTENT SECTIONS === */
.scrollable-content {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  padding: 0 0 1rem 0; /* Padding bottom minimal, le footer gère son espacement */
}

.content-section {
  padding: 1rem 1.25rem;
  /* Supprimer les propriétés de scroll individuel */
}

.content-section:last-child {
  margin-bottom: 1rem; /* Espacement supplémentaire avant le footer */
}

.section-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--gray-200);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.section-header {
  padding: 0.875rem 1.125rem;
  border-bottom: 1px solid var(--gray-200);
  background: var(--gray-50);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-800);
}

/* === EMPTY STATE === */
.empty-state {
  padding: 2rem 1.125rem;
  text-align: center;
}

.empty-illustration {
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-700);
  margin: 0 0 0.375rem 0;
}

.empty-subtitle {
  color: var(--gray-500);
  margin: 0;
  font-size: 0.875rem;
}

/* === DISPO CARDS === */
.dispos-grid {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dispo-card {
  background: white;
  border: 1.5px solid var(--gray-200);
  border-radius: 10px;
  padding: 0.875rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.dispo-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border-color: var(--gray-300);
}

.dispo-card.is-editing {
  border-color: var(--warning-color);
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(245, 158, 11, 0.01) 100%);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
  transform: translateY(-1px);
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

.dispo-card.is-readonly {
  background: linear-gradient(135deg, rgba(128, 128, 128, 0.03) 0%, rgba(128, 128, 128, 0.01) 100%);
  border-style: dashed;
  opacity: 0.9;
}

.dispo-card.is-readonly:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--gray-300);
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
  font-size: 0.875rem;
}

.editing-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--warning-color);
  color: white;
  padding: 0.1875rem 0.5rem;
  border-radius: 16px;
  font-size: 0.6875rem;
  font-weight: 600;
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.readonly-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--secondary-color);
  color: white;
  padding: 0.1875rem 0.5rem;
  border-radius: 16px;
  font-size: 0.6875rem;
  font-weight: 600;
  opacity: 0.8;
}

.card-content {
  margin-bottom: 0.75rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--gray-600);
  font-size: 0.8125rem;
  margin-bottom: 0.375rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.overnight-badge {
  background: var(--primary-color);
  color: white;
  padding: 0.0625rem 0.375rem;
  border-radius: 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  margin-left: 0.375rem;
}

.continuation-badge {
  background: var(--gray-800);
  color: white;
  padding: 0.0625rem 0.375rem;
  border-radius: 8px;
  font-size: 0.6875rem;
  font-weight: 700;
  margin-left: 0.375rem;
}

.continuation-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(17, 24, 39, 0.12);
  color: #111827;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 0.375rem;
}

/* === EDIT CARD === */
.edit-card {
  border: 1.5px solid var(--success-color);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0.01) 100%);
}

.edit-card .section-header {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
  border-bottom-color: rgba(16, 185, 129, 0.15);
}

/* === FORM STYLES === */
.form-content {
  padding: 1rem;
}

.form-group {
  margin-bottom: 1.25rem;
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
}

.type-button,
.format-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 0.5rem;
  border: 1.5px solid var(--gray-200);
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--gray-600);
}

.type-button:hover,
.format-button:hover {
  border-color: var(--primary-color);
  background: rgba(99, 102, 241, 0.04);
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(99, 102, 241, 0.15);
}

.type-button.active,
.format-button.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
  box-shadow: 0 3px 12px rgba(99, 102, 241, 0.25);
  transform: translateY(-1px);
}

.type-button.type-disponible.active {
  background: var(--success-color);
  border-color: var(--success-color);
  box-shadow: 0 3px 12px rgba(16, 185, 129, 0.25);
}

.type-button.type-indisponible.active {
  background: var(--danger-color);
  border-color: var(--danger-color);
  box-shadow: 0 3px 12px rgba(239, 68, 68, 0.25);
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

/* === TIME INPUTS === */
.time-inputs {
  display: flex;
  align-items: end;
  gap: 0.75rem;
}

.time-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
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

/* === SLOTS GRID === */
.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
}

.slot-button {
  padding: 0.5rem 0.75rem;
  border: 1.5px solid var(--gray-200);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--gray-600);
}

.slot-button:hover {
  border-color: var(--success-color);
  background: rgba(16, 185, 129, 0.04);
  transform: translateY(-1px);
}

.slot-button.active {
  border-color: var(--success-color);
  background: var(--success-color);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
  transform: translateY(-1px);
}

/* === ACTIONS === */
.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--gray-200);
  margin-top: 1rem;
}

.add-section {
  padding: 1rem 1.25rem;
  text-align: center;
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
  margin-top: auto; /* Pousser vers le bas dans la zone scrollable */
  margin-bottom: 1rem; /* Espacement supplémentaire avant le footer */
}

.add-button {
  min-width: 180px;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 1rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom)) 1.25rem; /* Padding bottom réduit */
  background: white; /* Fond blanc plus visible */
  border-top: 1px solid var(--gray-200);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1); /* Ombre plus marquée */
  flex-shrink: 0; /* Footer toujours fixe */
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.cancel-button,
.save-button {
  min-width: 100px;
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

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .dispo-modal-redesigned {
    border-radius: 0;
    height: 100vh;
    max-height: 100vh;
  }
  
  .header-section {
    padding: 1rem 0.75rem;
    flex-shrink: 0;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .collaborateur-avatar {
    width: 42px;
    height: 42px;
    font-size: 1.125rem;
  }
  
  .scrollable-content {
    flex: 1 1 auto;
    overflow-y: auto;
    min-height: 0;
    padding: 0 0 1rem 0; /* Padding bottom minimal sur mobile, le footer gère son espacement */
  }
  
  .content-section {
    padding: 0.75rem;
  }
  
  .content-section:last-child {
    margin-bottom: 1rem; /* Espacement supplémentaire avant le footer sur mobile */
  }
  
  .add-section {
    padding: 0.75rem;
    margin-top: 1rem; /* Espacement sur mobile */
    margin-bottom: 1rem; /* Espacement supplémentaire avant le footer sur mobile */
  }
  
  .footer-actions {
    padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom)) 0.75rem; /* Padding bottom mobile réduit */
    position: sticky;
    bottom: 0;
    background: white; /* Fond blanc sur mobile aussi */
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .button-grid {
    grid-template-columns: 1fr;
  }
  
  .time-inputs {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .time-separator {
    height: auto;
    transform: rotate(90deg);
  }
  
  .footer-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .cancel-button,
  .save-button {
    width: 100%;
  }
}
</style>
