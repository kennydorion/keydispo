<!--
  Interface de planning adaptée pour les collaborateurs
  Basée sur PlanningOptimized.vue avec thème blanc et permissions limitées
-->
<template>
  <div class="planning-collaborateur" :class="{ 'mobile': isMobile, 'selection-shortcut-active': isShortcutDown }">
    <!-- Bannière d'information pour collaborateur (style admin) -->
    <div class="collaborateur-header">
      <div class="header-top">
        <div class="header-brand">
          <div class="brand-icon">
            <span class="material-icons">calendar_today</span>
          </div>
          <div class="brand-content">
            <h1 class="brand-title">Mon Planning</h1>
            <p class="brand-subtitle">Disponibilités & missions</p>
          </div>
        </div>
        <!-- Bouton profil retiré - utiliser celui de la navigation -->
      </div>
    </div>

    <!-- Conteneur principal avec thème blanc -->
    <div class="planning-container-collaborateur">

      <!-- Bandeau statut et actions retiré pour interface épurée côté collaborateur -->

  <!-- Bandeau présence multi‑utilisateurs (masqué pour interface épurée) -->
  <!-- <div class="presence-bar" v-if="presenceUsers.length"> ... </div> -->

      <!-- Barre de statut de sélection multi-cellules -->
  <!-- Barre de sélection multi‑cellules (masquée) -->
  <!-- <div v-if="selectedCells.size > 0 || isSelectionMode || isDraggingSelection" class="selection-status-bar"> ... </div> -->

      <!-- Bouton d'aide pour la sélection -->
  <!-- Aide sélection (masquée) -->
  <!-- <div v-if="!selectedCells.size && !isSelectionMode && !isDraggingSelection" class="selection-help-tooltip"> ... </div> -->

    <!-- Vue calendrier (mois) avec overlay de sélection -->
    <div class="planning-grid-wrapper-collaborateur">
        <CollaborateurCalendar
          ref="calendarRef"
          :disponibilites="mesDisponibilites"
          :collaborateur="currentCollaborateur"
          :is-hovered-by-others="isHoveredByOthers"
          :is-locked-by-others="isLockedByOthers"
          :get-hovering-user-color="getHoveringUserColor"
          :get-hovering-user-initials="getAnonymizedHoveringUserInitials"
          :selected-cells="selectedCells"
          :is-selection-mode="isSelectionMode"
          :is-dragging-selection="isDraggingSelection"
          :shortcut-active="isShortcutDown"
          @add="onCalendarAdd"
          @edit="onCalendarEdit"
          @cell-click="onCellClick"
          @range-change="onCalendarRangeChange"
          @hover="onCalendarHover"
          @cell-hover="onCellHover"
          @cell-leave="onCellLeave"
          @cell-mouse-down="handleDragStart"
          @cell-mouse-enter="handleDragEnter"
          @cell-mouse-up="handleDragEnd"
          @cell-touch-start="onCellTouchStart"
          @cell-touch-end="onCellTouchEnd"
        />
      </div>
    </div>

  <!-- FAB sélection multiple mobile -->
  <div 
    v-if="isMobile && !showDisponibiliteModal && !showBatchModal"
    class="selection-mode-fab"
    :class="{ 'active': isSelectionMode }"
  >
    <va-button
      @click="toggleSelectionMode"
      :color="isSelectionMode ? 'warning' : 'info'"
      :icon="isSelectionMode ? 'check_circle' : 'checklist'"
      size="medium"
      round
      class="selection-toggle-btn"
    >
      {{ isSelectionMode ? 'Terminer' : 'Sélectionner' }}
    </va-button>
  </div>

  <!-- Bouton d'action flottant pour les sélections multiples -->
  <!-- Astuce Cmd/Ctrl pour multi-sélection -->
  <div
    v-if="!isMobile && !showDisponibiliteModal && !showBatchModal && selectedCells.size === 0"
    class="selection-help-tooltip fixed-help"
  >
    <va-icon name="info" color="primary" size="small" />
    <span>Maintenez Cmd/Ctrl pour sélectionner plusieurs dates</span>
  </div>
  <!-- Action flottante batch (apparaît avec sélections) -->
  <div
    v-if="selectedCells.size > 0 && currentCollaborateur"
    class="batch-action-fab"
    :class="{ 'mobile': isMobile }"
  >
    <div class="fab-content">
      <va-button
        color="primary"
        icon="bolt"
        @click="openBatchModal"
        :size="isMobile ? 'small' : 'medium'"
      >
        {{ isMobile ? `Ajouter des dispos (${selectedDates.length})` : `Ajouter des dispos (${selectedDates.length})` }}
      </va-button>
      <va-button
        preset="secondary"
        size="small"
        icon="clear"
        class="ml-2"
        title="Tout désélectionner"
        @click="clearSelection"
      />
    </div>
  </div>

  <!-- Modal DispoEditContent réutilisée (types restreints: pas de mission) -->
    <va-modal
      v-model="showDisponibiliteModal"
      :hide-default-actions="true"
      :fullscreen="isMobile"
      :mobile-fullscreen="true"
      :max-width="isMobile ? '100vw' : '720px'"
      :max-height="isMobile ? '100vh' : '95vh'"
      :size="isMobile ? 'large' : 'medium'"
      no-padding
      class="collab-modal"
      :class="{ 'collab-modal--mobile': isMobile, 'collab-modal--fullscreen': isMobile }"
      @before-open="modalA11y.onBeforeOpen"
      @open="modalA11y.onOpen"
      @close="() => { modalA11y.onClose(); cancelCollaborateurModal() }"
    >
      <DispoEditContent
        v-if="selectedCell && currentCollaborateur"
        :selected-cell="selectedCell"
        :selected-collaborateur="currentCollaborateur as any"
        :collaborateur-color="getCollaborateurColor()"
        :formatted-date="formattedSelectedDate"
        :selected-cell-dispos="selectedCellDispos"
        :editing-dispo-index="editingDispoIndex"
        :is-adding-new-dispo="isAddingNewDispo"
        :editing-dispo="editingDispo"
        :type-options="typeOptionsCollaborateur"
        :slot-options="slotOptions"
        :lieux-options-strings="lieuxOptionsStrings"
        :is-edit-form-valid="!!isEditFormValid"
        :saving="isSaving"
        :time-kind-options="timeKindOptionsForCollaborateur(editingDispo.type)"
        :time-kind-options-filtered="timeKindOptionsFilteredForCollaborateur(editingDispo.type)"
        :is-detected-overnight="isDetectedOvernight"
        :is-collaborator-view="true"
        :is-overnight-time="isOvernightTime"
        :get-type-icon="getTypeIcon"
        :get-type-text="getTypeText"
        :get-type-color="getTypeColor"
        :get-dispo-type-class="getDispoTypeClass"
        :get-slot-text="getSlotText"
        :get-time-kind-icon="getTimeKindIcon"
        :get-user-initials="getUserInitials"
        @cancel-modal="cancelCollaborateurModal"
        @save-dispos="saveCollaborateurDispos"
        @edit-dispo-line="editDispoLine"
        @remove-dispo="removeDispo"
        @set-editing-type="setEditingType"
        @set-editing-time-kind="setEditingTimeKind"
        @toggle-editing-slot="toggleEditingSlot"
        @create-lieu="() => {}"
        @cancel-edit-dispo="cancelEditDispo"
        @save-edit-dispo="saveEditDispo"
        @add-new-dispo-line="addNewDispoLine"
        @update-editing-lieu="(v: string) => editingDispo.lieu = v"
      />
    </va-modal>


    <!-- Modal d'information personnelle -->
    <va-modal
      v-model="showMyInfoModal"
      title="Mes Informations"
      :size="isMobile ? 'large' : 'medium'"
      :mobile-fullscreen="isMobile"
      :max-width="isMobile ? '100%' : '500px'"
      @before-open="modalA11y.onBeforeOpen"
      @open="modalA11y.onOpen"
      @close="modalA11y.onClose"
    >
      <div v-if="currentCollaborateur" class="my-info-modal">
        <div class="info-section">
          <h4>{{ currentCollaborateur.prenom }} {{ currentCollaborateur.nom }}</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Métier:</span>
              <span class="value">{{ currentCollaborateur.metier || 'Non spécifié' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ville:</span>
              <span class="value">{{ currentCollaborateur.ville || 'Non spécifiée' }}</span>
            </div>
          </div>
        </div>
        
        <!-- Statistiques personnelles -->
        <div class="stats-section">
          <h4>Mes Statistiques</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">{{ myStats.totalDisponibilites }}</div>
              <div class="stat-label">Disponibilités</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ myStats.missionsAssignees }}</div>
              <div class="stat-label">Missions assignées</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ myStats.heuresTotal }}</div>
              <div class="stat-label">Heures disponibles</div>
            </div>
          </div>
        </div>
      </div>
    </va-modal>

    <!-- Modale batch pour ajout multi-dates (mode collaborateur, pas de mission) -->
    <BatchDisponibiliteModal
      v-model="showBatchModal"
      :selected-collaborateur="currentCollaborateur as any"
      :selected-dates="selectedDates"
      :is-collaborator-view="true"
      @success="onBatchSuccess"
      @close="onBatchClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { CollaborateurSelfService } from '@/services/collaborateurSelf'
import type { CollaborateurDisponibilite, CollaborateurProfilLight } from '@/services/collaborateurSelf'
import CollaborateurCalendar from './CollaborateurCalendar.vue'
import { hybridMultiUserService as collaborationService } from '@/services/hybridMultiUserService'
import { useCollabPresence } from '@/composables/useCollabPresence'
import { useRealtimeSync } from '@/composables/useRealtimeSync'
import { useUserColors } from '@/services/userColorsService'
import { disponibilitesRTDBService } from '@/services/disponibilitesRTDBService'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'
import { AuthService } from '@/services/auth'
// import type { CollaborateurV2 } from '@/types/optimized-v2'
import DispoEditContent from '@/components/DispoEditContent.vue'
import * as planningDisplayService from '@/services/planningDisplayService'
import { getUserInitials } from '@/services/avatarUtils'
import { useModalA11y } from '@/composables/useModalA11y'
import BatchDisponibiliteModal from '@/components/BatchDisponibiliteModal.vue'

// Configuration responsive
const isMobile = ref(false)

// Couleurs des utilisateurs
const { getUserColor: getPresenceColor } = useUserColors()

// États de l'interface
const showDisponibiliteModal = ref(false)
const showMyInfoModal = ref(false)
const isRefreshing = ref(false)
const isSaving = ref(false)
const showBatchModal = ref(false)

// Variables pour la gestion du long press mobile
const longPressTimer = ref<number | null>(null)
const isLongPressing = ref(false)
const LONG_PRESS_DURATION = 420 // Abaisse légèrement pour une réactivité perçue meilleure

// Référence au composant calendrier pour forcer les mises à jour
const calendarRef = ref<any>(null)

// Composable pour la synchronisation temps réel
const { registerRefreshCallback } = useRealtimeSync()

// États de sélection multi-cellules
const selectedCells = ref<Set<string>>(new Set())
const isSelectionMode = ref(false)
const isDraggingSelection = ref(false)
const dragStartCell = ref<string | null>(null)
const isShortcutDown = ref(false)

// (supprimé) ancien état de la modale spécifique collaborateur

// Données
const currentCollaborateur = ref<CollaborateurProfilLight | null>(null)
const mesDisponibilites = ref<CollaborateurDisponibilite[]>([])
// plus de sélection multi‑cellules en mode calendrier uniquement

// Plage visible du calendrier pilotée par FullCalendar (mois courant par défaut)
// Helpers date (local, sans piège de timezone)
function toYMDLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromYMDLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10))
  return new Date(y, (m || 1) - 1, d || 1)
}

// Dates sélectionnées (extraites de selectedCells)
const selectedDates = computed<string[]>(() => {
  const myId = currentCollaborateur.value?.id
  if (!myId) return []
  const dates: string[] = []
  selectedCells.value.forEach((cellId) => {
    // Clé attendue: `${collaborateurId}-${YYYY-MM-DD}`
    // Extraire la date en fin de chaîne (longueur fixe 10)
    if (cellId.length < 12) return // min: 1 char id + '-' + 10 chars date
    const datePart = cellId.slice(-10)
    const sepChar = cellId.slice(-11, -10)
    const collabPart = cellId.slice(0, -11)
    const isValidDate = /\d{4}-\d{2}-\d{2}/.test(datePart)
    if (sepChar === '-' && isValidDate && collabPart === myId && !dates.includes(datePart)) {
      dates.push(datePart)
    }
  })
  return dates.sort()
})

// Options lieux (utiles seulement si mission; ici on n'affiche pas la mission)
const lieuxOptionsStrings = ref<string[]>(['DISPO JOURNEE', 'INDISPONIBLE'])

// (retiré) état temps réel simplifié, non affiché dans l'interface

// États de présence (multi‑user)
const presenceUsers = ref<Array<{ userId: string; userName: string }>>([])

// Range visible du calendrier (piloté par l'événement rangeChange du calendrier)
const currentVisibleRange = ref<{ start: string; end: string } | null>(null)

function enumerateDays(startYmd: string, endYmd: string): Array<{ date: string }> {
  const out: Array<{ date: string }> = []
  try {
    const start = fromYMDLocal(startYmd)
    const end = fromYMDLocal(endYmd)
    const cur = new Date(start)
    while (cur <= end) {
      out.push({ date: toYMDLocal(cur) })
      cur.setDate(cur.getDate() + 1)
    }
  } catch {}
  return out
}

// Jours visibles pour la présence (aligne la logique avec l'admin)
const visibleDaysForPresence = computed(() => {
  const r = currentVisibleRange.value
  if (!r) {
    // Fallback minimal: la semaine autour d'aujourd'hui si range non initialisé
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - 3)
    const end = new Date(today)
    end.setDate(today.getDate() + 3)
    return enumerateDays(toYMDLocal(start), toYMDLocal(end))
  }
  return enumerateDays(r.start, r.end)
})

const presenceRowsRef = ref<Array<{ id: string }>>([])

// Utilisation du composable pour gérer les survols des autres utilisateurs
const {
  hoveredCells,
  lockedCells,
  isHoveredByOthers,
  isLockedByOthers,
  getHoveringUserColor,
  // getHoveringUserInitials, // non utilisé côté collaborateur
  debouncedUpdatePresenceSets,
} = useCollabPresence(
  collaborationService,
  visibleDaysForPresence,
  computed(() => presenceRowsRef.value),
  (u: any) => getUserInitials(u),
  (uid: string) => getPresenceColor(uid),
)

// Version anonymisée des initiales pour l'interface collaborateur
function getAnonymizedHoveringUserInitials(collaborateurId: string, date: string): string {
  // Vérifier s'il y a quelqu'un qui survole
  if (isHoveredByOthers(collaborateurId, date)) {
    return 'KP' // KeyPlacement anonymisé
  }
  return ''
}

// Watcher pour rafraîchir le calendrier quand les indicateurs de présence changent
watch([hoveredCells, lockedCells], () => {
  // Rafraîchir le calendrier quand les états de présence changent (sans logs excessifs)
  if (calendarRef.value) {
    nextTick(() => {
      calendarRef.value.refreshAllCells()
    })
  }
}, { deep: true })

// Watcher pour rafraîchir le calendrier quand les disponibilités changent (optimisé)
watch(mesDisponibilites, (newDispos, oldDispos) => {
  const oldCount = oldDispos?.length || 0
  const newCount = newDispos?.length || 0
  
  // Seulement si changement significatif
  if (oldCount !== newCount) {
    // Rafraîchir immédiatement le calendrier
    if (calendarRef.value) {
      nextTick(() => {
        calendarRef.value.refreshAllCells()
      })
    }
  }
}, { deep: false, immediate: false })

// Watcher pour la sélection multi-cellules - transmission aux autres utilisateurs
watch(selectedCells, () => {
  // Transmettre les sélections aux autres utilisateurs via RTDB
  if (collaborationService && collaborationService.isActive) {
    collaborationService.updateSelectedCells(selectedCells.value)
    console.log('📋 Sélections collaborateur transmises:', selectedCells.value.size, 'cellules')
  }
}, { deep: true })

// Statistiques personnelles
const myStats = computed(() => {
  const stats = {
    totalDisponibilites: mesDisponibilites.value.length,
    missionsAssignees: 0, // À calculer depuis les données
    heuresTotal: 0
  }
  
  // Calculer les heures total
  mesDisponibilites.value.forEach(dispo => {
    if (dispo.heure_debut && dispo.heure_fin) {
      const debut = new Date(`2000-01-01T${dispo.heure_debut}`)
      const fin = new Date(`2000-01-01T${dispo.heure_fin}`)
      const heures = (fin.getTime() - debut.getTime()) / (1000 * 60 * 60)
      stats.heuresTotal += heures
    }
  })
  
  return stats
})

// Méthodes
async function loadMyData() {
  try {
    isRefreshing.value = true
    
    // Charger mon profil
    const profil = await CollaborateurSelfService.getMonProfil()
    if (profil) {
      currentCollaborateur.value = profil
      
      // Mettre à jour presenceRowsRef une fois l'ID obtenu
      presenceRowsRef.value = [{ id: profil.id }]
      // Trigger update des états de présence/hover
      debouncedUpdatePresenceSets?.(50)
      
      // Charger la plage visible actuelle du calendrier ou par défaut le mois courant
      if (currentVisibleRange.value) {
        await loadRange(currentVisibleRange.value.start, currentVisibleRange.value.end)
      } else {
        // Fallback: charger le mois courant si pas de plage visible
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0)
        await loadRange(toYMDLocal(startOfMonth), toYMDLocal(endOfMonth))
      }
    }
    
    // Debug après chargement initial
    setTimeout(() => {
      debugSyncState()
    }, 1000)
    
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error)
  } finally {
    isRefreshing.value = false
  }
}

// (retiré) refreshData — plus de bouton d'actualisation dédié

// Intégration DispoEditContent (état local)
type EditType = 'mission' | 'disponible' | 'indisponible'
type EditTimeKind = 'range' | 'slot' | 'full-day' | 'overnight'
 interface EditDispo { id?: string; type?: EditType; timeKind?: EditTimeKind; lieu?: string; heure_debut?: string; heure_fin?: string; slots?: string[]; _cont?: 'start' | 'end' }
 function addDaysStr(ymd: string, delta: number): string {
   const d = fromYMDLocal(ymd)
   d.setDate(d.getDate() + delta)
   return toYMDLocal(d)
 }

const selectedCell = ref<{ collaborateurId: string; date: string } | null>(null)
const selectedCellDispos = ref<EditDispo[]>([])
const editingDispoIndex = ref<number | null>(null)
const isAddingNewDispo = ref(false)
const editingDispo = ref<Partial<EditDispo>>({ type: 'disponible', timeKind: 'full-day', heure_debut: '09:00', heure_fin: '17:00', slots: [] })

const slotOptions = [
  { text: 'Matin (06:00–12:00)', value: 'morning' },
  { text: 'Mi-journée (12:00–14:00)', value: 'midday' },
  { text: 'Après-midi (14:00–18:00)', value: 'afternoon' },
  { text: 'Soir (18:00–22:00)', value: 'evening' },
  { text: 'Nuit (22:00–06:00)', value: 'night' },
]

const typeOptionsCollaborateur = [
  { text: 'Disponible', value: 'disponible' },
  { text: 'Indisponible', value: 'indisponible' },
]

function timeKindOptionsForCollaborateur(type?: EditType) {
  if (type === 'indisponible') return [ { text: 'Journée', value: 'full-day' } ]
  return [
    { text: 'Journée', value: 'full-day' },
    { text: 'Heures', value: 'range' },
  { text: 'Créneaux', value: 'slot' },
  ]
}

function timeKindOptionsFilteredForCollaborateur(type?: EditType) {
  // Pour l'instant identique aux options disponibles côté collaborateur
  return timeKindOptionsForCollaborateur(type)
}

function getTypeIcon(type?: string): string {
  switch (type) {
    case 'disponible': return 'check_circle'
    case 'indisponible': return 'block'
    case 'mission': return 'work'
    default: return 'event'
  }
}
function getTypeColor(type?: string): string {
  switch (type) {
    case 'disponible': return 'success'
    case 'indisponible': return 'danger'
    case 'mission': return 'info'
    default: return 'secondary'
  }
}
function getTimeKindIcon(kind?: string): string {
  switch (kind) {
    case 'full-day': return 'today'
    case 'range': return 'schedule'
    case 'slot': return 'view_module'
    default: return 'timelapse'
  }
}
function getTypeText(type?: string): string {
  const opt = typeOptionsCollaborateur.find(o => o.value === type)
  return opt?.text || (type || '')
}
function getDispoTypeClass(dispo: Partial<EditDispo>): string {
  const t = dispo.type
  return t ? `type-${t}` : ''
}
function canonicalSlot(s: string): string { return s === 'lunch' ? 'midday' : s }
function getSlotText(slots?: string[]): string {
  const labels = (slots || []).map(s => planningDisplayService.slotLabel(canonicalSlot(s)))
  return labels.join(', ')
}

function parseTimeToMinutes(t?: string): number {
  if (!t) return -1
  const [hh, mm] = t.split(':').map((v) => parseInt(v, 10))
  if (Number.isNaN(hh) || Number.isNaN(mm)) return -1
  return hh * 60 + mm
}

// === Conflits (validation) — utilitaires exposés au module ===
function toMinutes(hhmm?: string): number | null {
  if (!hhmm) return null
  const m = hhmm.match(/^(\d{2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1]); const mi = Number(m[2])
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null
  return h * 60 + mi
}
function normalizeRange(start?: string, end?: string): { s: number | null; e: number | null; overnight: boolean } {
  const s = toMinutes(start)
  const e = toMinutes(end)
  if (s == null || e == null) return { s, e, overnight: false }
  if (e < s) return { s, e: e + 24 * 60, overnight: true }
  return { s, e, overnight: false }
}
function rangesOverlap(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE
}
function slotsToRanges(slots: string[] = []): Array<[number, number]> {
  const map: Record<string, [number, number]> = {
    morning: [6 * 60, 12 * 60],
    midday: [12 * 60, 14 * 60],
    afternoon: [14 * 60, 18 * 60],
    evening: [18 * 60, 22 * 60],
    night: [22 * 60, 30 * 60], // 22:00 → 06:00 (+8h)
  }
  return (slots || []).map(s => map[s]).filter(Boolean) as Array<[number, number]>
}
function wouldConflict(list: Partial<EditDispo>[]): boolean {
  const hasIndispo = list.some(d => (d.type === 'indisponible'))
  const hasDispo = list.some(d => d.type === 'disponible')
  const hasDispoFD = list.some(d => d.type === 'disponible' && d.timeKind === 'full-day')
  const hasDispoPartial = list.some(d => d.type === 'disponible' && (d.timeKind === 'slot' || d.timeKind === 'range'))
  if (hasIndispo && hasDispo) return true
  if (hasDispoFD && hasDispoPartial) return true
  return false
}
function violatesMissionDispoOverlap(existing: Array<EditDispo & { type?: EditType }>, candidate: EditDispo): boolean {
  if (candidate.type !== 'disponible') return false
  if (candidate.timeKind === 'range' && candidate.heure_debut && candidate.heure_fin) {
    const c = normalizeRange(candidate.heure_debut, candidate.heure_fin)
    if (c.s == null || c.e == null) return false
    for (const d of existing) {
      if (d.type !== 'mission') continue
      if (d.timeKind === 'full-day') return true
      if (d.timeKind === 'range' && d.heure_debut && d.heure_fin) {
        const r = normalizeRange(d.heure_debut, d.heure_fin)
        if (r.s != null && r.e != null && rangesOverlap(c.s!, c.e!, r.s, r.e)) return true
      }
      if (d.timeKind === 'slot' && d.slots?.length) {
        const ranges = slotsToRanges(d.slots)
        if (ranges.some(([s, e]) => rangesOverlap(c.s!, c.e!, s, e))) return true
      }
    }
  }
  if (candidate.timeKind === 'slot' && candidate.slots?.length) {
    const cRanges = slotsToRanges(candidate.slots)
    for (const d of existing) {
      if (d.type !== 'mission') continue
      if (d.timeKind === 'full-day') return true
      if (d.timeKind === 'range' && d.heure_debut && d.heure_fin) {
        const r = normalizeRange(d.heure_debut, d.heure_fin)
        if (r.s != null && r.e != null && cRanges.some(([s, e]) => rangesOverlap(s, e, r.s!, r.e!))) return true
      }
      if (d.timeKind === 'slot' && d.slots?.length) {
        if (d.slots.some(s => candidate.slots!.includes(s))) return true
      }
    }
  }
  return false
}

function isOvernightTime(start?: string, end?: string): boolean {
  const s = parseTimeToMinutes(start)
  const e = parseTimeToMinutes(end)
  if (s < 0 || e < 0) return false
  return e < s
}

const isEditFormValid = computed(() => {
  const d = editingDispo.value
  if (!d.type || !d.timeKind) return false
  if (d.timeKind === 'range') return !!(d.heure_debut && d.heure_fin)
  if (d.timeKind === 'slot') return (d.slots && d.slots.length > 0)
  if (d.type === 'mission') return false // mission interdite
  return true
})

const isDetectedOvernight = computed(() => {
  const d = editingDispo.value
  return d.timeKind === 'range' && isOvernightTime(d.heure_debut, d.heure_fin)
})

function addNewDispoLine() {
  editingDispoIndex.value = null
  isAddingNewDispo.value = true
  editingDispo.value = { type: 'disponible', timeKind: 'full-day', heure_debut: '09:00', heure_fin: '17:00', lieu: '', slots: [] }
}
function cancelEditDispo() {
  editingDispoIndex.value = null
  isAddingNewDispo.value = false
  editingDispo.value = { type: 'disponible', timeKind: 'full-day', heure_debut: '09:00', heure_fin: '17:00', lieu: '', slots: [] }
}
function editDispoLine(index: number) {
  if (editingDispoIndex.value === index) { cancelEditDispo(); return }
  const d = selectedCellDispos.value[index]
  if (!d) return
  isAddingNewDispo.value = false
  editingDispoIndex.value = index
  editingDispo.value = { ...d, slots: (d.slots || []).map(canonicalSlot) }
}
function setEditingType(val: string) {
  editingDispo.value.type = val as EditType
  if (val === 'indisponible') editingDispo.value.timeKind = 'full-day'
}
function setEditingTimeKind(val: string) {
  editingDispo.value.timeKind = val as EditTimeKind
  if (val === 'full-day') { editingDispo.value.heure_debut = ''; editingDispo.value.heure_fin = ''; editingDispo.value.slots = [] }
  if (val === 'range') { editingDispo.value.slots = [] }
  if (val === 'overnight') {
    // Préremplir des valeurs typiques nuit
    editingDispo.value.heure_debut = '22:00'
    editingDispo.value.heure_fin = '06:00'
    editingDispo.value.slots = []
  }
}
function toggleEditingSlot(slotValue: string) {
  const norm = canonicalSlot(slotValue)
  const cur = (editingDispo.value.slots || []).map(canonicalSlot)
  editingDispo.value.slots = cur.includes(norm) ? cur.filter(s => s !== norm) : [...cur, norm]
}
function saveEditDispo() {
  if (!isEditFormValid.value) return
  const entry: EditDispo = { ...editingDispo.value } as EditDispo
  const temp = selectedCellDispos.value.slice()
  if (isAddingNewDispo.value) temp.push(entry)
  else if (editingDispoIndex.value != null) temp[editingDispoIndex.value] = entry
  // Règles d'exclusivité et chevauchements avec missions existantes
  if (wouldConflict(temp)) { toast({ message: 'Conflit: combinaison invalide.', color: 'warning' }); return }
  if (violatesMissionDispoOverlap(temp as any, entry)) { toast({ message: 'Conflit: chevauchement avec mission.', color: 'warning' }); return }
  selectedCellDispos.value = temp
  cancelEditDispo()
}
function removeDispo(index: number) {
  const temp = selectedCellDispos.value.slice()
  temp.splice(index, 1)
  selectedCellDispos.value = temp
}

// Ouverture des infos personnelles via UI (pas de bouton actuellement)

async function saveCollaborateurDispos() {
  if (!selectedCell.value || !currentCollaborateur.value) return
  try {
    isSaving.value = true
    const date = selectedCell.value.date
    const before = mesDisponibilites.value.filter(d => d.date === date)
  // Ignorer les continuations (_cont==='end') affichées pour contexte (veille)
  const after = selectedCellDispos.value.filter(d => (d as any)._cont !== 'end')

    const beforeMap = new Map<string, CollaborateurDisponibilite>()
    before.forEach(d => { if (d.id) beforeMap.set(d.id, d) })

    const toCreate: EditDispo[] = []
    const toUpdate: EditDispo[] = []
    const remainingIds = new Set(before.map(d => d.id!).filter(Boolean))

    for (const d of after) {
      if (d.id && beforeMap.has(d.id)) {
        toUpdate.push(d)
        remainingIds.delete(d.id)
      } else if (!d.id) {
        toCreate.push(d)
      }
    }
    const toDeleteIds = Array.from(remainingIds)

    const toPayload = (d: EditDispo): any => {
      if (d.type === 'indisponible') {
        return { date, lieu: 'INDISPONIBLE', heure_debut: '', heure_fin: '' }
      }
      if (d.timeKind === 'full-day') {
        return { date, lieu: 'DISPO JOURNEE', heure_debut: '', heure_fin: '' }
      }
      if (d.timeKind === 'slot') {
        return { date, lieu: '', heure_debut: '', heure_fin: '', timeKind: 'slot', slots: d.slots || [] }
      }
    // plage horaire ou overnight
    return { date, lieu: 'DISPONIBLE', heure_debut: d.heure_debut || '', heure_fin: d.heure_fin || '' }
    }

  // Validation globale avant envoi
  const simulated = after
  if (wouldConflict(simulated)) { toast({ message: 'Conflit détecté dans les éléments.', color: 'warning' }); return }
  const hasOverlap = simulated.some(c => violatesMissionDispoOverlap(before as any, c as any))
  if (hasOverlap) { toast({ message: 'Conflit: chevauchement avec des missions existantes.', color: 'warning' }); return }

  for (const d of toCreate) {
      await CollaborateurSelfService.createMaDisponibilite(toPayload(d))
    }
    for (const d of toUpdate) {
      if (!d.id) continue
      await CollaborateurSelfService.updateMaDisponibilite(d.id, toPayload(d))
    }
    for (const id of toDeleteIds) {
      await CollaborateurSelfService.deleteMaDisponibilite(id)
    }

    toast({ message: 'Disponibilités enregistrées', color: 'success' })
    showDisponibiliteModal.value = false
    try { await collaborationService.unlockCell(currentCollaborateur.value.id, date) } catch {}
      // Refreshless: ne pas recharger toutes les données; laisser le listener temps réel mettre à jour.
      // On force juste un léger rafraîchissement visuel.
      nextTick(() => {
        if (calendarRef.value?.refreshAllCells) {
          calendarRef.value.refreshAllCells()
        }
      })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    const msg = (error as any)?.message || 'Erreur lors de la sauvegarde'
    toast({ message: msg, color: 'danger' })
  } finally {
    isSaving.value = false
  }
}

// Plus de gestion de clic cellule (mode grille retiré)

// Nouvelle méthode pour ouvrir la modale collaborateur simplifiée
function openCollaborateurDispoModal(dateStr?: string, _existingDispo?: CollaborateurDisponibilite) {
  const date = dateStr || toYMDLocal(new Date())
  const collaborateurId = currentCollaborateur.value?.id
  if (!collaborateurId) return

  // Préparer la cellule sélectionnée pour DispoEditContent
  selectedCell.value = { collaborateurId, date }

  // Alimenter la liste des dispos existantes pour ce jour (format EditDispo)
  const disposDuJour = mesDisponibilites.value
    .filter((d) => d.date === date)
    .map((d) => {
      // IMPORTANT: ne pas renormaliser ici via normalizeDispo car les slots sont
      // codés dans RTDB (lieu vide) et la normalisation basées sur le lieu
      // les perdrait et forcerait "full-day".
      // On fait confiance au mappage déjà appliqué dans mesDisponibilites (loadRange).
  const slots = ((d as any).slots || []).map(canonicalSlot)
      const timeKindUi = (d as any).timeKind as EditTimeKind | undefined
      const resolvedTimeKind: EditTimeKind = slots.length > 0
        ? 'slot'
        : (timeKindUi || ((d.heure_debut && d.heure_fin) ? 'range' : 'full-day'))
      return {
        id: d.id,
        type: (d as any).type as EditType,
        timeKind: resolvedTimeKind,
        lieu: d.lieu,
        heure_debut: d.heure_debut,
        heure_fin: d.heure_fin,
        slots,
      } as EditDispo
    })
  // Continuations overnight de la veille
  const prev = addDaysStr(date, -1)
  const prevOvernights = mesDisponibilites.value
    .filter(d => d.date === prev)
    .filter(d => {
  const t = mapRTDBTimeKindToUI((d as any).timeKind)
  if (t === 'overnight') return true
  if ((d as any).slots && (d as any).slots.includes && (d as any).slots.includes('night')) return true
  const s = toMinutes(d.heure_debut)
  const e = toMinutes(d.heure_fin)
  return s != null && e != null && e < s
    })
  .map(d => ({
  id: d.id,
  // Conserver le type tel que mappé en mémoire (mission/disponible/indisponible)
  type: (d as any).type as EditType,
  timeKind: 'range' as EditTimeKind,
  lieu: d.lieu,
  heure_debut: d.heure_debut,
  heure_fin: d.heure_fin,
  slots: ((d as any).slots || []).map(canonicalSlot),
  _cont: 'end' as const,
    }))
  selectedCellDispos.value = [...prevOvernights, ...disposDuJour]

  // Réinitialiser l’édition en cours
  editingDispoIndex.value = null
  isAddingNewDispo.value = false
  editingDispo.value = { type: 'disponible', timeKind: 'full-day', heure_debut: '09:00', heure_fin: '17:00', lieu: '', slots: [] }

  // Verrou RTDB de la cellule
  try { collaborationService.lockCell(collaborateurId, date) } catch {}

  // Ouvrir la modale partagée
  showDisponibiliteModal.value = true
}

// Gestion des événements de la nouvelle modale
// (supprimé) anciens handlers de CollaborateurDispoModal

// Hooks calendrier
function onCalendarAdd(dateStr: string) {
  // Si c'était un long press, ne pas traiter le clic
  if (isLongPressing.value) {
    return
  }
  
  // Si on est en mode sélection, on ajoute à la sélection
  if (isSelectionMode.value) {
    const collaborateurId = currentCollaborateur.value?.id
    if (collaborateurId) {
      const cellId = `${collaborateurId}-${dateStr}`
      if (selectedCells.value.has(cellId)) {
        selectedCells.value.delete(cellId)
      } else {
        selectedCells.value.add(cellId)
      }
      selectedCells.value = new Set(selectedCells.value)
    }
    return
  }
  
  openCollaborateurDispoModal(dateStr)
}

// Nouvelle fonction pour gérer les clics sur les cellules avec des disponibilités
function onCellClick(dateStr: string, disponibilites: CollaborateurDisponibilite[]) {
  // Si on est en mode sélection, on ajouter à la sélection
  if (isSelectionMode.value) {
    const collaborateurId = currentCollaborateur.value?.id
    if (collaborateurId) {
      const cellId = `${collaborateurId}-${dateStr}`
      if (selectedCells.value.has(cellId)) {
        selectedCells.value.delete(cellId)
      } else {
        selectedCells.value.add(cellId)
      }
      selectedCells.value = new Set(selectedCells.value)
    }
    return
  }
  
  // Ouvrir la modale avec la liste des disponibilités existantes pour cette date
  openCollaborateurDispoModal(dateStr)
  
  console.log('🔍 Clic sur cellule avec disponibilités:', dateStr, disponibilites)
}

// Fonction pour toggler le mode sélection sur mobile
function toggleSelectionMode() {
  isSelectionMode.value = !isSelectionMode.value
  
  // Si on sort du mode sélection MANUELLEMENT, vider les sélections
  if (!isSelectionMode.value) {
    selectedCells.value.clear()
    selectedCells.value = new Set(selectedCells.value)
  }
  
  console.log('📱 Mode sélection mobile:', isSelectionMode.value ? 'ACTIVÉ' : 'DÉSACTIVÉ')
}

// Gestion du long press pour activer le mode sélection sur mobile
function handleTouchStart(dateStr: string, _event: TouchEvent) {
  if (!isMobile.value) return
  
  isLongPressing.value = false
  
  longPressTimer.value = window.setTimeout(() => {
    isLongPressing.value = true
    
    // Vibration si disponible
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
    
    // Activer le mode sélection et sélectionner cette date
    if (!isSelectionMode.value) {
      isSelectionMode.value = true
      const collaborateurId = currentCollaborateur.value?.id
      if (collaborateurId) {
        const cellId = `${collaborateurId}-${dateStr}`
        selectedCells.value.add(cellId)
        selectedCells.value = new Set(selectedCells.value)
      }
      console.log('📱 Long press détecté - Mode sélection activé:', dateStr)
    }
  }, LONG_PRESS_DURATION)
}

function handleTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // Réinitialiser après un délai pour permettre la sélection
  setTimeout(() => {
    isLongPressing.value = false
  }, 100)
}

// Relay des événements tactiles depuis le calendrier
function onCellTouchStart(_cellId: string, dateStr: string, event: TouchEvent) {
  handleTouchStart(dateStr, event)
}
function onCellTouchEnd(_cellId: string, _dateStr: string, _event: TouchEvent) {
  handleTouchEnd()
}

// (supprimé) utilitaire getDisponibilitesForDate non utilisé

// Fonctions de sélection multi-cellules
function clearSelection() {
  selectedCells.value.clear()
  isSelectionMode.value = false
  isDraggingSelection.value = false
  dragStartCell.value = null
}

function openBatchModal() {
  if (!currentCollaborateur.value) return
  if (selectedDates.value.length === 0) {
    toast({ message: 'Sélectionnez au moins une date (Cmd/Ctrl+clic)', color: 'warning' })
    return
  }
  showBatchModal.value = true
}

async function onBatchSuccess() {
  showBatchModal.value = false
  clearSelection()
  // Refreshless: s'appuyer sur le listener temps réel, ne pas relancer un chargement global
  nextTick(() => {
    if (calendarRef.value?.refreshAllCells) {
      calendarRef.value.refreshAllCells()
    }
  })
  toast({ message: 'Disponibilités créées en batch', color: 'success' })
}

function onBatchClose() {
  showBatchModal.value = false
}

// (supprimé) toggleSelectionMode/handleCalendarDateClick non utilisés

function handleDragStart(cellId: string, event: MouseEvent) {
  const collaborateurId = currentCollaborateur.value?.id
  if (!collaborateurId) return
  
  // Autoriser la (dé)sélection si Cmd/Ctrl, si on est déjà en mode sélection,
  // OU si la cellule est déjà sélectionnée (re-clic pour désélectionner)
  const isAlreadySelected = selectedCells.value.has(cellId)
  const allowSelection = event.ctrlKey || event.metaKey || isSelectionMode.value || isAlreadySelected
  if (allowSelection) {
    isDraggingSelection.value = true
    dragStartCell.value = cellId
    // Toggle la cellule de départ
    if (selectedCells.value.has(cellId)) {
      selectedCells.value.delete(cellId)
    } else {
      selectedCells.value.add(cellId)
    }
    selectedCells.value = new Set(selectedCells.value)

    // Activer le mode sélection si pas déjà actif et qu'on fait une sélection
    if (!isSelectionMode.value && (event.ctrlKey || event.metaKey || selectedCells.value.size > 0)) {
      isSelectionMode.value = true
    }

    // Sur mobile, GARDER le mode sélection actif même si on vide toutes les sélections
    // Le mode ne se désactive que manuellement via le FAB
    if (!isMobile.value) {
      // Sur desktop, désactiver automatiquement si plus de sélections et pas de Cmd/Ctrl
      if (selectedCells.value.size === 0 && !(event.ctrlKey || event.metaKey)) {
        isSelectionMode.value = false
      }
    }
  }
}

function handleDragEnter(cellId: string) {
  if (isDraggingSelection.value) {
    selectedCells.value.add(cellId)
    selectedCells.value = new Set(selectedCells.value)
  }
}

function handleDragEnd(_cellId?: string) {
  isDraggingSelection.value = false
  dragStartCell.value = null
  // Sur mobile, ne JAMAIS sortir automatiquement du mode sélection
  // Sur desktop, sortir du mode sélection si aucune cellule n'est sélectionnée
  if (!isMobile.value && selectedCells.value.size === 0) {
    isSelectionMode.value = false
  }
}

// Écouteurs d'événements globaux pour la sélection
function setupSelectionListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSelection()
    }
    if ((e.ctrlKey || e.metaKey) && !isSelectionMode.value) {
      isSelectionMode.value = true
      isShortcutDown.value = true
    }
  })
  
  document.addEventListener('keyup', (e) => {
    const shortcutActive = e.ctrlKey || e.metaKey
    isShortcutDown.value = shortcutActive
    // Ne pas désactiver le mode sélection sur mobile quand on relâche les touches
    if (!shortcutActive && !selectedCells.value.size && !isMobile.value) {
      isSelectionMode.value = false
    }
  })
  
  document.addEventListener('mouseup', () => {
    handleDragEnd()
  })
}


function onCalendarEdit(id: string) {
  const existing = mesDisponibilites.value.find(d => d.id === id)
  if (!existing) return
  
  // Ouvrir la modale pour voir les détails (missions en lecture seule grâce à isCollaboratorView)
  openCollaborateurDispoModal(existing.date, existing)
}

function onCalendarRangeChange(range: { start: string; end: string }) {
  // Mettre à jour la plage visible et déclencher la MAJ des présences
  currentVisibleRange.value = { start: range.start, end: range.end }
  debouncedUpdatePresenceSets?.(50)
  // Recharge et réabonne le flux RTDB sur la plage visible du calendrier
  loadRange(range.start, range.end)
}

async function loadRange(start: string, end: string) {
  try {
    isRefreshing.value = true
    
    // Nettoyer l'ancien listener d'abord
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    
    if (!currentCollaborateur.value) {
      console.warn('🔄 [PARENT] Pas de collaborateur pour loadRange')
      return
    }
    
    console.log('🔄 [PARENT] Configuration listener RTDB direct pour plage:', start, 'à', end)
    
    // Configurer le tenantId du service RTDB
    disponibilitesRTDBService.setTenantId(currentCollaborateur.value.tenantId)
    
    const listenerId = disponibilitesRTDBService.listenToDisponibilitesByDateRange(
      start,
      end,
      (allDisponibilites) => {
        // Filtrer seulement les disponibilités du collaborateur actuel
        const myDispos = allDisponibilites
          .filter(d => d.collaborateurId === currentCollaborateur.value?.id)
          .map(d => {
            // Déterminer correctement le timeKind UI en tenant compte des flags
            let timeKindUi: EditTimeKind = mapRTDBTimeKindToUI(d.timeKind)
            const lieuCanon = (d.lieu || '').toUpperCase().trim()
            if (d.isFullDay || lieuCanon === 'DISPO JOURNEE' || lieuCanon === 'DISPONIBLE JOURNEE') {
              timeKindUi = 'full-day'
            }
            if (d.slots && d.slots.length > 0) {
              timeKindUi = 'slot'
            }
            return {
              id: d.id || '',
              date: d.date,
              lieu: d.lieu || '',
              heure_debut: d.heure_debut || '',
              heure_fin: d.heure_fin || '',
              type: mapRTDBTypeToUI(d.type),
              timeKind: timeKindUi,
              slots: d.slots || [],
              isFullDay: d.isFullDay || false,
              version: d.version || 1
            }
          })
        
        console.log('🔄 [PARENT] RTDB direct update:', myDispos.length, 'disponibilités')
        mesDisponibilites.value = myDispos
        
        // Rafraîchir le calendrier immédiatement
        nextTick(() => {
          if (calendarRef.value?.refreshAllCells) {
            calendarRef.value.refreshAllCells()
          }
        })
      }
    )
    
    // Fonction de nettoyage
    unsubscribe = () => {
      disponibilitesRTDBService.stopListener(listenerId)
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error)
  } finally {
    isRefreshing.value = false
  }
}

// Fonctions de mapping depuis RTDB vers UI (comme dans le planning admin)
function mapRTDBTypeToUI(rtdbType: string | undefined): 'disponible' | 'indisponible' | 'mission' {
  switch (rtdbType) {
    case 'mission': return 'mission'
    case 'disponible': return 'disponible'
    case 'indisponible': return 'indisponible'
    case 'standard': return 'disponible'
    case 'formation': return 'mission'
    case 'urgence': return 'mission'
    case 'maintenance': return 'indisponible'
    default: return 'disponible'
  }
}

function mapRTDBTimeKindToUI(rtdbTimeKind: string | undefined): 'range' | 'slot' | 'full-day' | 'overnight' {
  switch (rtdbTimeKind) {
    case 'range': return 'range'
  case 'slot': return 'slot'
  case 'full-day': return 'full-day'
  case 'overnight': return 'overnight'
  case 'fixed': return 'range'
  case 'flexible': return 'range'
    default: return 'range'
  }
}

function onCalendarHover(dateStr: string | null) {
  const myId = currentCollaborateur.value?.id
  if (!myId) return
  
  if (dateStr) {
  // Hover start
    collaborationService.updateHoveredCell(myId, dateStr)
  } else {
  // Hover end
    collaborationService.clearHoveredCell()
  }
}

// Nouveaux gestionnaires pour les survols multi-utilisateurs depuis le calendrier
let lastHoveredCell: string | null = null

function onCellHover(collaborateurId: string, date: string) {
  const cellKey = `${collaborateurId}-${date}`
  if (lastHoveredCell !== cellKey && collaborationService && collaborationService.isActive) {
    lastHoveredCell = cellKey
    collaborationService.updateHoveredCell(collaborateurId, date)
  }
}

function onCellLeave(collaborateurId: string, date: string) {
  const cellKey = `${collaborateurId}-${date}`
  if (lastHoveredCell === cellKey) {
    lastHoveredCell = null
    if (collaborationService && collaborationService.isActive) {
      collaborationService.clearHoveredCell()
    }
  }
}

// Fonction de debug pour tester la synchronisation
function debugSyncState() {
  console.log('🔍 État de synchronisation collaborateur:', {
    collaborateur: currentCollaborateur.value,
    disponibilites: mesDisponibilites.value?.length,
    listenerActif: unsubscribe !== null,
    collaborationActif: collaborationService?.isActive,
    presenceUsers: presenceUsers.value?.length
  })
  
  if (typeof window !== 'undefined') {
    (window as any).debugCollab = {
      currentCollaborateur: currentCollaborateur.value,
      mesDisponibilites: mesDisponibilites.value,
      collaborationService,
      forceRefresh: () => calendarRef.value?.refreshAllCells?.()
    }
  }
}

function getCollaborateurColor() {
  const id = currentCollaborateur.value?.id || ''
  return getPresenceColor(id)
}

const formattedSelectedDate = computed(() => {
  if (!selectedCell.value) return ''
  const d = fromYMDLocal(selectedCell.value.date)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

function cancelCollaborateurModal() {
  showDisponibiliteModal.value = false
  if (selectedCell.value && currentCollaborateur.value?.id) {
    try { collaborationService.unlockCell(currentCollaborateur.value.id, selectedCell.value.date) } catch {}
  }
  selectedCell.value = null
  selectedCellDispos.value = []
  cancelEditDispo()
}

// Lifecycle
const { init: useNotify } = useToast()
const toast = (opts: { message: string; color?: string }) => useNotify(opts)

// Accessibilité modales (inert + focus)
const modalA11y = useModalA11y()

let unsubscribe: null | (() => void) = null
let stopPresence: null | (() => void) = null
let stopActivityListener: null | (() => void) = null
let stopSelectionListener: null | (() => void) = null

onMounted(() => {
  // Initialiser le service multi‑utilisateur (RTDB‑only) pour publier présence et survols
  onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) return
      console.log(`🔧 [INIT] Initialisation service collaboration pour:`, user.uid)
      
      // Éviter les doubles inits
  if ((collaborationService as any).isActive) {
        console.log(`🔧 [INIT] Service déjà actif, skip init`)
        return
      }
      
      const tenantId = AuthService.currentTenantId || 'keydispo'
      console.log(`🔧 [INIT] Init avec tenantId: ${tenantId}`)
      console.log(`🔧 [INIT] AuthService.currentTenantId: ${AuthService.currentTenantId}`)
      console.log(`🔧 [INIT] VITE_TENANT_ID: ${import.meta.env.VITE_TENANT_ID}`)
      
      // Essayer de récupérer le profil collaborateur pour utiliser le vrai nom
      let userName = user.displayName || user.email || 'Collaborateur'
      try {
        const profil = await CollaborateurSelfService.getMonProfil()
        if (profil) {
          userName = `${profil.prenom} ${profil.nom}`
        }
      } catch (error) {
        console.log('🔧 [INIT] Pas de profil collaborateur trouvé, utilisation du nom Firebase')
      }
      
      const initOptions = {
        userId: user.uid,
        userName: userName,
        userEmail: user.email || 'collaborateur@keydispo.com'
      }
      console.log(`🔧 [INIT] Options d'initialisation:`, initOptions)
      
      const success = await (collaborationService as any).init(tenantId, initOptions)
      
      if (success) {
        console.log(`✅ [INIT] Service collaboration initialisé avec succès`)
      } else {
        console.error(`❌ [INIT] Échec de l'initialisation du service`)
        return
      }
      
      // Mettre à jour les données de présence une fois le collaborateur chargé
      setTimeout(() => {
        if (currentCollaborateur.value) {
          presenceRowsRef.value = [{ id: currentCollaborateur.value.id }]
        }
      }, 100)
    } catch (e) {
      // Ignorer silencieusement si permissions limitées
      console.warn('🚨 [INIT] multi‑user init (collab) ignoré:', (e as any)?.message || e)
    }
  })

  loadMyData()
  
  // Configurer les listeners pour la sélection multi-cellules
  setupSelectionListeners()
  
  // Écouter la présence multi‑utilisateurs
  console.log(`👥 [PRESENCE] Initialisation listener onPresenceChange`)
  stopPresence = collaborationService.onPresenceChange((presence) => {
    console.log(`👥 [PRESENCE] Changement détecté:`, {
      count: presence.size,
      users: Array.from(presence.values()).map(p => ({ id: p.userId, name: p.userName }))
    })
    presenceUsers.value = Array.from(presence.values()).map(p => ({ userId: p.userId, userName: p.userName }))
    console.log(`👥 [PRESENCE] presenceUsers mis à jour:`, presenceUsers.value)
  })

  // Écouter les changements d'activités pour synchroniser les indicateurs
  stopActivityListener = collaborationService.onActivityChange((_activities) => {
    debouncedUpdatePresenceSets?.(50)
  })

  // Écouter les changements de sélections multi-cellules pour mettre à jour les verrous visuels
  stopSelectionListener = collaborationService.onSelectionChange((selections) => {
    console.log('📋 [COLLAB] Changement sélections détecté:', selections.size, 'sélections')
    debouncedUpdatePresenceSets?.(50)
  })

  // Détecter le mode mobile
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

// Fonction pour forcer un rafraîchissement immédiat après une action utilisateur
// (supprimé) forceRefreshAfterAction non utilisé

// Enregistrer le callback de rafraîchissement pour le système global
onMounted(() => {
  const unregister = registerRefreshCallback(() => {
    if (calendarRef.value?.refreshAllCells) {
      calendarRef.value.refreshAllCells()
    }
    debouncedUpdatePresenceSets?.(10)
  })
  
  // Nettoyer à la destruction du composant
  onBeforeUnmount(() => {
    unregister()
  })
})

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
  unsubscribe = null
  if (stopPresence) stopPresence()
  stopPresence = null
  if (stopActivityListener) stopActivityListener()
  stopActivityListener = null
  if (stopSelectionListener) stopSelectionListener()
  try { collaborationService.clearHoveredCell() } catch {}
  try { (collaborationService as any).cleanup?.() } catch {}
})

// Plus de watcher: la plage est pilotée par le calendrier (datesSet)
</script>

<style scoped>
.planning-collaborateur {
  --collaborateur-bg: #ffffff;
  --collaborateur-border: #e0e7ff;
  --collaborateur-text: #374151;
  --collaborateur-primary: #6366f1;
  --collaborateur-secondary: #f8fafc;
  --surface-light: #ffffff;
  --border-light: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  background: var(--collaborateur-bg);
  min-height: calc(100vh - 64px - 80px); /* Prendre toute la fenêtre moins la navbar (64px) et l'en-tête collaborateur (80px) */
  height: calc(100vh - 64px - 80px); /* important pour FullCalendar height:100% */
  padding: 0; /* edge-to-edge comme l'admin */
  display: flex;
  flex-direction: column;
  width: 100vw;
  margin: 0;
  box-sizing: border-box;
}

/* Mobile - ajuster pour la hauteur de navbar mobile et en-tête */
@media (max-width: 768px) {
  .planning-collaborateur {
    min-height: calc(100vh - 56px - 60px); /* navbar mobile (56px) + en-tête mobile compact (60px) */
    height: calc(100vh - 56px - 60px);
  }
  
  .collaborateur-header {
    height: 60px; /* Hauteur encore plus réduite sur mobile */
    min-height: 60px;
  }
}

/* Ultra small mobile - moins de 480px */
@media (max-width: 480px) {
  .planning-collaborateur {
    min-height: calc(100vh - 56px - 55px); /* navbar mobile (56px) + en-tête ultra compact (55px) */
    height: calc(100vh - 56px - 55px);
  }
  
  .collaborateur-header {
    height: 55px; /* Hauteur ultra compacte */
    min-height: 55px;
  }
}

/* Feedback visuel quand Cmd/Ctrl est enfoncé */
.planning-collaborateur.selection-shortcut-active :deep(.fc-daygrid-day) {
  outline: 1px dashed rgba(99, 102, 241, 0.4);
  outline-offset: -2px;
}
.planning-collaborateur.selection-shortcut-active :deep(.fc-daygrid-day:hover) {
  background: rgba(99, 102, 241, 0.08) !important;
}

.collaborateur-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface-light);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-soft);
  height: 80px; /* Hauteur fixe pour les calculs */
  min-height: 80px;
}

/* Bandeau haut calqué sur l'admin - responsive amélioré */
.collaborateur-header .header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%; /* Prendre toute la hauteur de l'en-tête */
  padding: 16px 24px;
  background: var(--primary-gradient);
  color: white;
}

/* Mobile responsive pour l'en-tête */
@media (max-width: 768px) {
  .collaborateur-header .header-top {
    padding: 12px 16px; /* Padding réduit sur mobile */
  }
  
  .collaborateur-header .brand-icon {
    width: 38px;
    height: 38px; /* Icône plus petite sur mobile */
  }
  
  .collaborateur-header .brand-icon .material-icons {
    font-size: 20px; /* Icône plus petite */
  }
  
  .collaborateur-header .brand-title {
    font-size: 1.125rem; /* Titre plus petit sur mobile */
    font-weight: 600;
  }
  
  .collaborateur-header .brand-subtitle {
    font-size: 0.8rem; /* Sous-titre plus petit */
  }
}

@media (max-width: 480px) {
  .collaborateur-header .header-top {
    padding: 10px 12px; /* Padding encore plus réduit */
    gap: 8px;
  }
  
  .collaborateur-header .brand-icon {
    width: 34px;
    height: 34px;
  }
  
  .collaborateur-header .brand-icon .material-icons {
    font-size: 18px;
  }
  
  .collaborateur-header .brand-title {
    font-size: 1rem;
    line-height: 1.2;
  }
  
  .collaborateur-header .brand-subtitle {
    font-size: 0.75rem;
    line-height: 1.2;
  }
}
.collaborateur-header .header-brand { display: flex; align-items: center; gap: 12px; }
.collaborateur-header .brand-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 10px; background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.3) }
.collaborateur-header .brand-icon .material-icons { font-size: 22px; color: white }
.collaborateur-header .brand-title { margin: 0; font-size: 1.25rem; font-weight: 700 }
.collaborateur-header .brand-subtitle { margin: 2px 0 0; opacity: .9; font-size: .9rem }
.collaborateur-header .header-actions { display: flex; align-items: center; gap: 12px }
.collaborateur-header .mobile-toggle { background: transparent; border: none; color: white; cursor: pointer; display: grid; place-items: center; border-radius: 8px; padding: 6px }
.collaborateur-header .mobile-toggle .material-icons { font-size: 22px }

.planning-container-collaborateur {
  width: 100%;
  margin: 0;
  background: var(--collaborateur-bg);
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  height: 100%;
}

/* (retiré) styles du panneau statut/actions */

.filters-collaborateur {
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--collaborateur-border);
}

.filter-group {
  display: flex;
  gap: 1rem;
  align-items: end;
}

.view-select,
.week-picker {
  min-width: 150px;
}

.planning-grid-wrapper-collaborateur {
  padding: 0; /* retirer padding pour edge-to-edge */
  background: var(--collaborateur-bg);
  flex: 1 1 auto;
  min-height: 0; /* important pour permettre au fc d'occuper l'espace */
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* S'assurer que le composant calendrier occupe 100% */
.planning-grid-wrapper-collaborateur :deep(> *),
.planning-grid-wrapper-collaborateur > * {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

/* Responsive mobile pour le calendrier */
@media (max-width: 768px) {
  .planning-grid-wrapper-collaborateur {
    padding: 0; /* Pas de padding sur mobile */
  }
  
  /* Améliorer l'affichage FullCalendar sur mobile */
  .planning-grid-wrapper-collaborateur :deep(.fc) {
    font-size: 13px; /* Police plus petite sur mobile */
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-header-toolbar) {
    padding: 8px 12px; /* Padding réduit pour la toolbar */
    flex-direction: column;
    gap: 8px;
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-button) {
    padding: 6px 12px; /* Boutons plus compacts */
    font-size: 12px;
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-toolbar-title) {
    font-size: 1.1rem; /* Titre plus petit */
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-daygrid-day) {
    min-height: 40px; /* Hauteur minimum des cellules */
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-daygrid-day-number) {
    font-size: 14px; /* Numéros de jour plus gros */
    font-weight: 600;
  }
}

@media (max-width: 480px) {
  .planning-grid-wrapper-collaborateur :deep(.fc) {
    font-size: 12px; /* Police encore plus petite */
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-header-toolbar) {
    padding: 6px 8px;
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-button) {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-toolbar-title) {
    font-size: 1rem;
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-daygrid-day) {
    min-height: 35px;
  }
  
  .planning-grid-wrapper-collaborateur :deep(.fc-daygrid-day-number) {
    font-size: 13px;
  }
}

/* Présence multi‑utilisateurs */
.presence-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 2rem;
  background: var(--collaborateur-secondary);
  border-bottom: 1px solid var(--collaborateur-border);
}

.presence-title {
  font-weight: 600;
  color: var(--collaborateur-text);
}

.presence-avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
}

.presence-avatar {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 12px;
}

.presence-avatar .dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  display: inline-block;
}

/* Formulaire de disponibilité */
.disponibilite-form {
  padding: 1rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Modal d'informations personnelles */
.my-info-modal {
  padding: 1rem 0;
}

.info-section {
  margin-bottom: 2rem;
}

.info-section h4 {
  margin-bottom: 1rem;
  color: var(--collaborateur-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.label {
  font-weight: 500;
  color: var(--collaborateur-text);
}

.value {
  color: #6b7280;
}

/* Statistiques */
.stats-section h4 {
  margin-bottom: 1rem;
  color: var(--collaborateur-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  text-align: center;
  padding: 1rem;
  background: var(--collaborateur-secondary);
  border-radius: 8px;
  border: 1px solid var(--collaborateur-border);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--collaborateur-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Mode mobile */
.mobile .form-grid {
  grid-template-columns: 1fr;
}

.mobile .stats-grid {
  grid-template-columns: 1fr;
}

.mobile .filter-group {
  flex-direction: column;
  align-items: stretch;
}

.mobile .status-panel-simple {
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
}

.mobile .actions-toolbar {
  justify-content: center;
}

/* Modal d'informations personnelles responsive */
@media (max-width: 768px) {
  .my-info-modal {
    padding: 0.75rem 0;
  }
  
  .info-section {
    margin-bottom: 1.5rem;
  }
  
  .info-section h4 {
    font-size: 1.125rem;
    margin-bottom: 0.75rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.75rem;
    background: var(--collaborateur-secondary);
    border-radius: 6px;
    border: 1px solid var(--collaborateur-border);
  }
  
  .label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--collaborateur-primary);
  }
  
  .value {
    font-size: 0.9rem;
    color: var(--collaborateur-text);
  }
  
  .stats-section h4 {
    font-size: 1.125rem;
    margin-bottom: 0.75rem;
  }
  
  .stat-card {
    padding: 0.75rem;
    border-radius: 6px;
  }
  
  .stat-number {
    font-size: 1.5rem;
  }
  
  .stat-label {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .my-info-modal {
    padding: 0.5rem 0;
  }
  
  .info-section h4 {
    font-size: 1rem;
  }
  
  .stats-section h4 {
    font-size: 1rem;
  }
  
  .stat-number {
    font-size: 1.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
}

/* === STYLES POUR DispoEditContent === */

.dispo-modal-mobile {
  padding: 12px;
  max-height: none;
  transition: all 0.3s ease;
}

/* En-tête détaillé avec thème couleur collaborateur */
.dispo-header-detailed {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 5%, #f8fafc) 0%, 
    color-mix(in srgb, var(--collaborateur-color, #3b82f6) 8%, #e2e8f0) 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid color-mix(in srgb, var(--collaborateur-color, #3b82f6) 20%, #e2e8f0);
  position: relative;
  overflow: hidden;
}

/* Fallback pour navigateurs sans color-mix */
.dispo-header-detailed {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.color-indicator-modal {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 0 8px 8px 0;
}

.collaborateur-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.collaborateur-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--collaborateur-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
}

.collaborateur-info-detailed {
  flex: 1;
}

.collaborateur-name-large {
  font-size: 16px;
  font-weight: 600;
  color: var(--collaborateur-text);
  margin: 0 0 4px 0;
  text-transform: capitalize;
}

.collaborateur-meta-large {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Sections principales numérotées */
.form-section-primary {
  background: var(--collaborateur-bg);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--collaborateur-border);
  transition: all 0.3s ease;
}

.section-title-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--collaborateur-text);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--collaborateur-primary);
}

.section-number {
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-number.edit-mode {
  animation: pulse-edit 2s infinite;
}

@keyframes pulse-edit {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Vue d'ensemble des disponibilités */
.dispos-overview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.dispo-overview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--collaborateur-border);
  background: var(--collaborateur-secondary);
  transition: all 0.2s ease;
}

.dispo-overview-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dispo-overview-item.type-mission {
  border-left: 4px solid var(--collaborateur-primary);
  background: color-mix(in srgb, var(--collaborateur-primary) 10%, var(--collaborateur-bg));
}

.dispo-overview-item.type-disponible {
  border-left: 4px solid #10b981;
  background: color-mix(in srgb, #10b981 10%, var(--collaborateur-bg));
}

.dispo-overview-item.type-indisponible {
  border-left: 4px solid #ef4444;
  background: color-mix(in srgb, #ef4444 10%, var(--collaborateur-bg));
}

.dispo-overview-item.editing-highlight {
  border: 2px solid #f59e0b !important;
  background: color-mix(in srgb, #f59e0b 15%, var(--collaborateur-bg)) !important;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  transform: scale(1.02);
}

.dispo-overview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dispo-type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: var(--collaborateur-text);
}

.editing-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 2px 8px;
  background: #f59e0b;
  color: white;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dispo-details-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.lieu-info,
.time-info,
.slot-info,
.fullday-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dispo-overview-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.edit-btn,
.delete-btn {
  min-width: 70px;
}

/* Formulaire d'édition */
.edit-form-section {
  background: color-mix(in srgb, #10b981 10%, var(--collaborateur-bg)) !important;
  border: 2px solid #10b981 !important;
}

.edit-form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-subsection {
  margin-bottom: 12px;
}

.form-subsection:last-child {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #10b981;
  margin-top: 12px;
}

.subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--collaborateur-text);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.subsection-title::before {
  content: '';
  width: 4px;
  height: 4px;
  background: var(--collaborateur-primary);
  border-radius: 50%;
}

/* Boutons de type pleine largeur */
.type-buttons-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-btn-full {
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
  width: 100%;
  border-radius: 4px;
  background: transparent;
  color: var(--collaborateur-primary);
  border: 1px solid var(--collaborateur-primary);
}

/* Champs de temps */
.time-fields-mobile {
  display: flex;
  gap: 12px;
}

.custom-time-input {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--collaborateur-text);
}

.time-input {
  width: 100%;
  min-width: 120px;
}

/* Section créneaux */
.slots-grid-mobile {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.slot-option-mobile {
  border: 1px solid var(--collaborateur-primary);
  border-radius: 4px;
  padding: 8px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: transparent;
  text-align: center;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 11px;
  color: var(--collaborateur-primary);
}

.slot-option-mobile:hover {
  border-color: #10b981;
  background: color-mix(in srgb, #10b981 10%, var(--collaborateur-bg));
  transform: translateY(-1px);
  color: #10b981;
}

.slot-option-mobile.active {
  border-color: #10b981;
  background: #10b981;
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.slot-label {
  font-weight: 600;
  line-height: 1.2;
}

/* Message vide */
.no-dispos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
  color: #6b7280;
  padding: 32px 16px;
  border: 2px dashed var(--collaborateur-border);
  border-radius: 8px;
  background: var(--collaborateur-secondary);
}

/* Container du bouton d'ajout en bas */
.add-line-container-bottom {
  display: flex;
  justify-content: center;
  margin: 16px 0 8px 0;
  padding: 12px;
  border-top: 1px solid var(--collaborateur-border);
  background: var(--collaborateur-secondary);
  border-radius: 8px;
}

.add-line-btn-mobile {
  min-width: 150px;
}

/* Actions principales */
.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--collaborateur-border);
  margin-top: 8px;
}

.actions .va-button {
  min-width: 120px;
}

/* Transitions */
.form-slide-enter-active,
.form-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 600px;
  opacity: 1;
}

.form-slide-enter-from,
.form-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin: 0;
}

/* Responsive mobile */
@media (max-width: 640px) {
  .dispo-modal-mobile {
    padding: 8px;
  }
  
  .dispo-header-detailed {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .collaborateur-section {
    gap: 12px;
  }
  
  .collaborateur-avatar-large {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  
  .dispo-overview-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .dispo-overview-actions {
    align-self: stretch;
    justify-content: space-between;
  }
  
  .edit-btn,
  .delete-btn {
    flex: 1;
    min-width: auto;
  }
  
  .dispo-details-summary {
    flex-direction: column;
    gap: 4px;
  }
  
  .slots-grid-mobile {
    grid-template-columns: 1fr;
  }
  
  .time-fields-mobile {
    flex-direction: column;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .form-actions .va-button {
    width: 100%;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .actions .va-button {
    width: 100%;
  }
}

/* === STYLES POUR LA SÉLECTION MULTI-CELLULES === */

/* Barre de statut de sélection */
.selection-status-bar {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  border: 1px solid var(--collaborateur-primary);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-text {
  font-weight: 500;
  color: var(--collaborateur-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Tooltip d'aide */
.selection-help-tooltip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 1rem;
  font-size: 13px;
  color: #64748b;
}

.help-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fixed-help {
  position: fixed;
  bottom: 92px;
  right: 24px;
  z-index: 999;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

/* Bouton d'action flottant */
.batch-action-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
  border-radius: 50px;
  animation: bounce-in 0.5s ease-out;
}

.batch-action-fab .fab-content {
  display: flex;
  align-items: center;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Styles pour les cellules sélectionnées dans FullCalendar */
:deep(.fc-daygrid-day.selected) {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
  border: 2px solid var(--collaborateur-primary) !important;
  position: relative;
}

:deep(.fc-daygrid-day.selected::after) {
  content: "✓";
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: var(--collaborateur-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  z-index: 10;
}

/* Mode sélection */
:deep(.fc-daygrid-day) {
  cursor: pointer;
  user-select: none;
}

:deep(.fc-daygrid-day:hover) {
  background: rgba(99, 102, 241, 0.05);
}

/* Mode dragging */
.collaborateur-calendar.dragging-mode :deep(.fc-daygrid-day) {
  cursor: crosshair;
}

/* Mobile responsive pour la sélection et FAB */
@media (max-width: 768px) {
  .batch-action-fab {
    bottom: 20px;
    right: 16px;
    border-radius: 24px; /* Moins arrondi sur mobile */
  }

  .batch-action-fab.mobile {
    bottom: 90px; /* Plus haut quand le FAB sélection est présent */
    right: 16px;
  }
  
  .batch-action-fab .fab-content {
    flex-direction: column;
    gap: 4px;
  }
  
  .batch-action-fab .va-button {
    font-size: 12px;
    padding: 8px 16px;
    min-width: auto;
  }
  
  .selection-status-bar {
    flex-direction: column;
    gap: 8px;
    text-align: center;
    padding: 10px 12px;
  }
  
  .status-content {
    flex-direction: column;
    gap: 6px;
  }
  
  .fixed-help {
    bottom: 76px; /* Plus haut pour éviter les FAB */
    right: 12px;
    font-size: 12px;
    padding: 6px 10px;
  }
  
  .selection-help-tooltip {
    padding: 6px 10px;
    font-size: 12px;
  }
}

/* FAB Mode Sélection Mobile */
.selection-mode-fab {
  position: fixed;
  bottom: 20px; /* En bas, comme référence */
  left: 16px;
  z-index: 1000;
  animation: fabSlideIn 0.3s ease-out;
}

.selection-mode-fab.active {
  background: rgba(245, 158, 11, 0.1);
  border-radius: 50px;
  padding: 4px;
}

.selection-toggle-btn {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  font-size: 0.8rem !important;
  white-space: nowrap !important;
  min-width: 120px !important;
}

.selection-toggle-btn:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}

@keyframes fabSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 480px) {
  .batch-action-fab {
    bottom: 12px;
    right: 12px;
  }
  
  .batch-action-fab .fab-content {
    flex-direction: column;
    gap: 2px;
  }
  
  .batch-action-fab .va-button {
    font-size: 11px;
    padding: 6px 12px;
  }
  
  .selection-status-bar {
    margin-bottom: 0.75rem;
    padding: 8px 10px;
  }
  
  .fixed-help {
    bottom: 68px;
    right: 8px;
    font-size: 11px;
    padding: 4px 8px;
  }
  
  /* Adapter les cellules sélectionnées pour mobile */
  :deep(.fc-daygrid-day.selected::after) {
    width: 16px;
    height: 16px;
    font-size: 9px;
    top: 2px;
    right: 2px;
  }
}

/* Force la modale à prendre toute la hauteur en mode mobile */
:deep(.collab-modal--fullscreen) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important; /* Fallback pour navigateurs anciens */
  height: 100dvh !important; /* Utiliser dvh pour une hauteur dynamique */
  max-width: 100vw !important;
  max-height: 100vh !important; /* Fallback pour navigateurs anciens */
  max-height: 100dvh !important;
  margin: 0 !important;
  border-radius: 0 !important;
  z-index: 1001 !important;
}

:deep(.collab-modal--fullscreen .va-modal__container) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important; /* Fallback pour navigateurs anciens */
  height: 100dvh !important; /* Utiliser dvh pour une hauteur dynamique */
  max-width: 100vw !important;
  max-height: 100vh !important; /* Fallback pour navigateurs anciens */
  max-height: 100dvh !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: stretch !important;
  justify-content: stretch !important;
  transform: none !important;
}

:deep(.collab-modal--fullscreen .va-modal__dialog) {
  width: 100vw !important;
  height: 100vh !important; /* Fallback pour navigateurs anciens */
  height: 100dvh !important; /* Utiliser dvh pour une hauteur dynamique */
  max-width: 100vw !important;
  max-height: 100vh !important; /* Fallback pour navigateurs anciens */
  max-height: 100dvh !important;
  margin: 0 !important;
  border-radius: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  transform: none !important;
}

:deep(.collab-modal--fullscreen .va-modal__content) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  flex: 1 !important;
}

/* S'assurer que DispoEditContent prend toute la hauteur */
:deep(.collab-modal--fullscreen .dispo-modal-redesigned) {
  height: 100% !important;
  max-height: 100% !important;
  min-height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

/* Garantir que le footer reste en bas et est visible */
:deep(.collab-modal--fullscreen .footer-actions) {
  position: relative !important; /* Changé de sticky à relative */
  bottom: auto !important;
  margin-top: auto !important;
  flex-shrink: 0 !important;
  padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom)) 1rem !important;
  background: white !important;
  border-top: 1px solid #e5e7eb !important;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1) !important;
  z-index: 20 !important;
}

/* Assurer que la zone de contenu scrollable prend tout l'espace disponible */
:deep(.collab-modal--fullscreen .scrollable-content) {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding-bottom: 0 !important; /* Retirer le padding bottom pour éviter l'espace en trop */
}

/* Media query pour très petits écrans (iPhone SE, etc.) */
@media (max-height: 568px) {
  :deep(.collab-modal--fullscreen .footer-actions) {
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom)) 1rem !important;
  }
  
  :deep(.collab-modal--fullscreen .header-section) {
    min-height: auto !important;
    padding: 0.75rem !important;
  }
  
  :deep(.collab-modal--fullscreen .dispo-modal-redesigned) {
    max-height: 100dvh !important;
    overflow: hidden !important;
  }
}
</style>
