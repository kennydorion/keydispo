<template>
  <div class="planning-app">
    <!-- Header avec filtres -->
    <FiltersHeader
      :view-mode="viewMode"
      :period="formatCurrentPeriod"
      :metiers="metiersOptions"
      :lieux="lieuxOptions"
      :statuts="statutOptions"
      :model-value="{ search: searchTerm, metier: filterMetier, lieu: filterLieu, statut: filterStatut, dateFrom, dateTo }"
      :stats-collaborateurs="paginatedCollaborateurs.length"
      :stats-dispos="totalDisponibilites"
      @update:viewMode="(m) => viewMode = m"
      @openMobileFilters="mobileFiltersOpen = true"
      @prev="goToPreviousWeek"
      @today="goToToday"
      @next="goToNextWeek"
      @update:modelValue="updateFilters"
    />

  <!-- Indicateur de chargement (désactivé: UX non-bloquante, on utilise des placeholders gris) -->

    <!-- Suggestions contextuelles -->
    <div v-if="suggestions.length" class="suggestions">
      <va-icon name="lightbulb" size="14px" class="mr-1" />
      <span v-for="(s, i) in suggestions" :key="i" class="suggestion-item">{{ s }}</span>
    </div>

    <!-- Indicateur de chargement extension (non bloquant) -->
    <div v-if="extending" class="extending-indicator">
      <va-icon name="refresh" spin size="1rem" />
      <span>Chargement...</span>
    </div>

    <!-- Badge d’environnement: émulateur local -->
  <div v-if="isEmulator" class="env-badge">
      Émulateur Firebase actif
    </div>

    <!-- Planning Excel synchronisé - Scroll unique, sticky header + colonne -->
    <!-- Planning Excel synchronisé - Scroll unique, sticky header + colonne -->
    <div class="excel-planning-container">
  <div class="excel-scroll" ref="planningScroll" :class="{ panning: isPanning, loading: isBusy }" @scroll="onScrollExtend" @mousemove="onGridMouseMove" @mouseleave="onGridMouseLeave" @mousedown="onPanStart" @touchstart="onTouchStart" :style="{ '--day-width': dayWidth + 'px', '--sticky-left': stickyLeftWidth + 'px', '--day-pitch': (dayWidth + 1) + 'px' }" :aria-busy="isBusy">
        <!-- Ligne header sticky -->
        <div class="sticky-header-row">
          <!-- Overlays header: survol de colonne + aujourd'hui -->
          <div class="column-hover-overlay-header" aria-hidden="true" ref="colHoverHeaderEl"></div>
          <div class="today-overlay-header" aria-hidden="true"></div>
          <!-- Séparateurs hebdo du header (mois+semaines+jours) -->
          <div class="week-separators-header" aria-hidden="true">
            <template v-for="(day, idx) in visibleDays" :key="'sep-'+day.date">
              <div
                v-if="isWeekBoundary(day.date)"
                class="week-sep"
                :style="{ left: `calc(var(--grid-left-header, calc(var(--sticky-left, 260px) + 1px)) + (${idx} + 1) * var(--day-pitch-header, calc(var(--day-width, 100px) + 1px)) - 1px)` }"
              ></div>
            </template>
          </div>
          <!-- Coin sticky top+left -->
          <div class="excel-corner corner-sticky">
            <div class="corner-title">Collaborateurs</div>
            <div class="corner-count">{{ filteredCollaborateurs.length }}</div>
          </div>
          <!-- En-têtes des jours (défilent horizontalement avec la grille, sticky vertical) -->
          <div class="days-header">
            <div class="excel-months-row" :style="{ minWidth: gridMinWidth, width: 'max-content' }">
              <div
                v-for="seg in monthSegments"
                :key="seg.key"
                class="excel-month-cell"
                :class="{ 'loading-placeholder': !seg.loaded }"
                :style="{ width: `${dayWidth * seg.count}px` }"
              >
                {{ seg.label }}
              </div>
            </div>
            <!-- Rangée des semaines (numéros ISO) -->
            <div class="excel-weeks-row" :style="{ minWidth: gridMinWidth, width: 'max-content' }">
              <div
                v-for="seg in weekSegments"
                :key="seg.key"
                class="excel-week-cell"
                :style="{ width: `${dayWidth * seg.count}px` }"
              >
                S{{ seg.week }}
              </div>
            </div>
            <div class="excel-days-row" :style="{ minWidth: gridMinWidth, width: 'max-content' }">
              <div class="days-window" :style="{ transform: `translateX(${windowOffsetPx}px)` }">
                <div
                  v-for="day in windowedDays"
                  :key="day.date"
                  class="excel-day-cell"
                  :class="{
                    'today': day.isToday,
                    'weekend': day.isWeekend,
                    'loading-placeholder': !isDayLoaded(day.date),
                    'week-boundary-right': isWeekBoundary(day.date)
                  }"
                  :data-day-date="day.date"
                  :style="{ width: dayWidth + 'px' }"
                >
                  <div class="day-name">{{ day.name }}</div>
                  <div class="day-number">{{ day.dayNumber }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lignes + overlays (placés DANS le même contexte de stacking que les cellules) -->
  <div class="excel-rows" :style="{ '--row-height': rowHeight + 'px', '--row-pitch': (rowHeight + 1) + 'px' }" ref="rowsRef">
          <!-- Overlay de survol horizontal (ligne) -->
          <div class="row-hover-overlay" aria-hidden="true" ref="rowHoverEl"></div>
          <!-- Overlays verticaux (clipés sur la grille) et bande sticky du jour -->
          <div class="grid-overlay-clip" aria-hidden="true">
            <div class="column-hover-overlay" ref="colHoverEl"></div>
            <div class="today-overlay"></div>
          </div>
          <div class="today-overlay-left" aria-hidden="true"></div>
          <div
            v-for="collaborateur in paginatedCollaborateurs"
            :key="collaborateur.id"
            class="excel-row"
            :data-collaborateur-id="collaborateur.id"
            :style="{ height: rowHeight + 'px' }"
          >
            <!-- Colonne gauche sticky -->
            <div class="collab-sticky">
              <div class="collaborateur-content">
                <span class="metier-right" v-if="collaborateur.metier">{{ collaborateur.metier }}</span>
                <div class="collaborateur-name">
                  {{ collaborateur.prenom }} {{ collaborateur.nom }}
                </div>
                <div class="collaborateur-meta">
                  <span class="location" v-if="collaborateur.ville">{{ collaborateur.ville }}</span>
                </div>
                <div class="collaborateur-extra">
                  <span class="contact" v-if="collaborateur.phone">
                    <va-icon name="phone" size="12px" />
                    <span class="text">{{ formatPhone(collaborateur.phone) }}</span>
                  </span>
                  <span class="contact" v-if="collaborateur.email">
                    <va-icon name="email" size="12px" />
                    <span class="text">{{ collaborateur.email }}</span>
                  </span>
                </div>
              </div>
            </div>
            <!-- Grille des jours -->
            <div class="excel-planning-row" :style="{ minWidth: gridMinWidth, width: 'max-content' }">
              <div class="days-window" :style="{ transform: `translateX(${windowOffsetPx}px)` }">
                <div
                  v-for="day in windowedDays"
                  :key="`${collaborateur.id}-${day.date}`"
                  class="excel-cell"
                  :data-day-date="day.date"
                  :class="[
                    {
                      'today': day.isToday,
                      'weekend': day.isWeekend,
                      'has-dispos': getDisponibilites(collaborateur.id, day.date).length > 0,
                      'loading-placeholder': !isDayLoaded(day.date),
                      'week-boundary-right': isWeekBoundary(day.date)
                    },
                    getCellKindClass(collaborateur.id, day.date)
                  ]"
                  :style="{ width: dayWidth + 'px' }"
                  @click="openDispoModal(collaborateur.id, day.date)"
                >
                  <div class="dispo-bars" :class="getDispoBarsLayoutClass(collaborateur.id, day.date)">
                    <template v-for="dispo in getCellDisposSorted(collaborateur.id, day.date)" :key="(dispo as any).id || (dispo as any)._key">
                          <div
                            class="dispo-bar"
                            :class="[getDispoBarClass(dispo), getDispoContinuationClass(dispo, day.date)]"
                            :style="getDispoBarStyle()"
                            aria-label="Détail disponibilité"
                            :title="getDispoBarTitle(dispo as any, day.date)"
                            @click.stop="editDispo(dispo, day.date)"
                          >
                        <span v-if="isOvernightContinuation(dispo, day.date)" class="cont-flag left" title="Continue depuis la veille">↜</span>
                        <template v-if="resolveDispoKind(dispo).type === 'mission'">
                          <va-icon name="work" size="12px" class="dispo-icn" />
                          <template v-if="resolveDispoKind(dispo).timeKind === 'slot' && resolveDispoKind(dispo).slots?.length">
                            <span class="slot-pill" v-for="s in resolveDispoKind(dispo).slots" :key="s">{{ slotLabel(s) }}</span>
                          </template>
                          <span class="dispo-time" v-else-if="resolveDispoKind(dispo).timeKind === 'range' && dispo.heure_debut && dispo.heure_fin">{{ timeLabelForCell(dispo, day.date) }}</span>
                          <span class="dispo-badge" v-else>Journée</span>
                        </template>

                        <template v-else-if="resolveDispoKind(dispo).type === 'disponible'">
                          <va-icon name="check_circle" size="12px" class="dispo-icn" />
                          <template v-if="resolveDispoKind(dispo).timeKind === 'slot' && resolveDispoKind(dispo).slots?.length">
                            <span class="slot-pill" v-for="s in resolveDispoKind(dispo).slots" :key="s">{{ slotLabel(s) }}</span>
                          </template>
                          <span class="dispo-time" v-else-if="resolveDispoKind(dispo).timeKind === 'range' && dispo.heure_debut && dispo.heure_fin">{{ timeLabelForCell(dispo, day.date) }}</span>
                          <span class="dispo-badge" v-else>Journée</span>
                        </template>

                        <template v-else-if="resolveDispoKind(dispo).type === 'indisponible'">
                          <va-icon name="block" size="12px" class="dispo-icn" />
                          <span class="dispo-badge indispo">Journée</span>
                        </template>

                        <template v-else>
                          <span class="dispo-time" v-if="dispo.heure_debut && dispo.heure_fin">
                            {{ dispo.heure_debut.substring(0,2) }}-{{ dispo.heure_fin.substring(0,2) }}h
                          </span>
                        </template>
                        <span v-if="isOvernightStart(dispo, day.date)" class="cont-flag right" title="Se prolonge au lendemain">↝</span>
                          </div>
                    </template>
                    <div 
                      v-if="getCellDisposSorted(collaborateur.id, day.date).length === 0"
                      class="dispo-add"
                      @click.stop="(e) => openQuickAdd(collaborateur.id, day.date, e)"
                      aria-label="Ajouter une disponibilité"
                    >
                      <va-icon name="add_circle" size="22px" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'édition (téléportée dans <body> pour éviter les contextes de stacking locaux) -->
    <teleport to="body">
    <va-modal 
      v-model="showDispoModal" 
      size="large"
      hide-default-actions
      :z-index="999999"
      overlay-z-index="999998"
    >
      <div class="dispo-modal-content" v-if="selectedCell">
        <div class="modal-header-info">
          <h3>{{ getSelectedCollaborateur()?.prenom }} {{ getSelectedCollaborateur()?.nom }}</h3>
          <p>{{ formatModalDate(selectedCell.date) }}</p>
        </div>
        <!-- Alerte: continuation depuis la veille (modale) -->
        <div v-if="modalPrevOvernight" class="qa-alert" style="margin-top: 6px;">
          <va-icon name="schedule" size="14px" />
          <span v-if="modalPrevOvernight.kind === 'range'">↜ Un créneau de la veille se termine à {{ modalPrevOvernight.end }}.</span>
          <span v-else>↜ Un créneau de nuit de la veille se poursuit jusqu'au matin.</span>
        </div>
        
        <!-- Lignes existantes + ajout inline -->
        <div class="existing-dispos">
          <h4 class="section-title">Lignes</h4>
          <div
            v-for="(dispo, index) in selectedCellDispos"
            :key="index"
            class="dispo-edit-item card"
            :class="getDispoTypeClass(dispo)"
          >
            <va-select
              v-model="dispo.type"
              :options="typeOptions"
              label="Type"
              text-by="text"
              value-by="value"
              size="small"
              class="compact-field"
              @update:modelValue="(val: any) => setExistingType(index, val)"
            />
            <va-select
              v-model="dispo.timeKind"
              :options="timeKindOptionsFor(dispo.type)"
              label="Format"
              text-by="text"
              value-by="value"
              size="small"
              class="compact-field"
              @update:modelValue="(val: any) => setExistingTimeKind(index, val)"
            />

              <template v-if="dispo.type === 'mission'">
              <LieuCombobox
                v-model="dispo.lieu"
                :options="lieuxOptionsStrings"
                label="Lieu"
                size="small"
                class="compact-field"
                @create="onCreateLieu"
              />
                <template v-if="dispo.timeKind === 'range'">
                <va-input
                  v-model="dispo.heure_debut"
                  type="time"
                  step="300"
                  label="Début"
                  placeholder="HH:MM"
                  size="small"
                  class="compact-field"
                  @update:modelValue="(v: string) => onStartTimeChange(dispo, v)"
                >
                  <template #appendInner>
                    <va-icon name="schedule" size="14px" class="time-append-icon" title="Choisir l'heure" @click="openTimePickerFromIcon" />
                  </template>
                </va-input>
                <va-input
                  v-model="dispo.heure_fin"
                  type="time"
                  step="300"
                  label="Fin"
                  placeholder="HH:MM"
                  size="small"
                  class="compact-field"
                  :disabled="!dispo.heure_debut"
                >
                  <template #appendInner>
                    <va-icon name="schedule" size="14px" class="time-append-icon" title="Choisir l'heure" @click="openTimePickerFromIcon" />
                  </template>
                </va-input>
              </template>
                <template v-else-if="dispo.timeKind === 'slot'">
                  <va-select v-model="dispo.slots" :options="slotOptions" label="Créneaux" multiple text-by="text" value-by="value" size="small" class="compact-field span-3" @update:modelValue="(val: string[]) => limitExistingSlots(index, val)" />
                </template>
            </template>

            <template v-else-if="dispo.type === 'disponible'">
              <template v-if="dispo.timeKind === 'range'">
                <va-input
                  v-model="dispo.heure_debut"
                  type="time"
                  step="300"
                  label="Début"
                  placeholder="HH:MM"
                  size="small"
                  class="compact-field"
                  @update:modelValue="(v: string) => onStartTimeChange(dispo, v)"
                >
                  <template #appendInner>
                    <va-icon name="schedule" size="14px" class="time-append-icon" title="Choisir l'heure" @click="openTimePickerFromIcon" />
                  </template>
                </va-input>
                <va-input
                  v-model="dispo.heure_fin"
                  type="time"
                  step="300"
                  label="Fin"
                  placeholder="HH:MM"
                  size="small"
                  class="compact-field"
                  :disabled="!dispo.heure_debut"
                >
                  <template #appendInner>
                    <va-icon name="schedule" size="14px" class="time-append-icon" title="Choisir l'heure" @click="openTimePickerFromIcon" />
                  </template>
                </va-input>
              </template>
              <template v-else-if="dispo.timeKind === 'slot'">
                <va-select v-model="dispo.slots" :options="slotOptions" label="Créneaux" multiple text-by="text" value-by="value" size="small" class="compact-field" @update:modelValue="(val: string[]) => limitExistingSlots(index, val)" />
              </template>
            </template>
            <!-- indisponible: aucun champ additionnel -->
            <va-button
              @click="removeDispo(index)"
              preset="secondary"
              color="danger"
              icon="delete"
              size="small"
              class="row-delete"
            >
              Supprimer
            </va-button>
          </div>
          <div v-if="selectedCellDispos.length === 0" class="empty-state">Aucune ligne pour ce jour.</div>
          <va-button @click="addInlineRow" preset="primary" icon="add" size="medium" class="align-end add-line-btn">Ajouter une ligne</va-button>
        </div>

        
      </div>

      <template #footer>
        <va-button @click="cancelModal" preset="secondary">
          Annuler
        </va-button>
        <va-button @click="saveDispos" preset="primary" :loading="saving">
          Sauvegarder
        </va-button>
      </template>
  </va-modal>
  </teleport>
    
    <!-- Quick Add popover (léger, garde le contexte visible) -->
  <div v-if="quickAdd.open" class="quick-add-panel" ref="quickAddPanelRef" :style="{ left: quickAdd.left + 'px', top: quickAdd.top + 'px' }">
      <div class="qa-header">
        <div class="qa-title">Ajouter une disponibilité</div>
        <button class="qa-close" @click="closeQuickAdd">✕</button>
      </div>
      <div class="qa-section">
        <!-- Alerte: continuation depuis la veille -->
        <div v-if="quickPrevOvernight" class="qa-alert">
          <va-icon name="schedule" size="14px" />
          <span v-if="quickPrevOvernight.kind === 'range'">↜ Un créneau de la veille se termine à {{ quickPrevOvernight.end }}.</span>
          <span v-else>↜ Un créneau de nuit de la veille se poursuit jusqu'au matin.</span>
        </div>
        <div class="qa-row qa-fixed">
          <va-button :preset="quickDispo.type === 'mission' ? 'primary' : 'secondary'" size="small" @click="setQuickType('mission')">Mission</va-button>
          <va-button :preset="quickDispo.type === 'disponible' ? 'primary' : 'secondary'" size="small" @click="setQuickType('disponible')">Disponible</va-button>
          <va-button :preset="quickDispo.type === 'indisponible' ? 'primary' : 'secondary'" size="small" @click="setQuickType('indisponible')">Indispo</va-button>
        </div>
        <div class="qa-row qa-fixed" v-if="quickDispo.type !== 'indisponible'">
          <va-button :preset="quickDispo.timeKind === 'full-day' ? 'primary' : 'secondary'" size="small" @click="setQuickTimeKind('full-day')">Journée</va-button>
          <va-button :preset="quickDispo.timeKind === 'range' ? 'primary' : 'secondary'" size="small" @click="setQuickTimeKind('range')">Heures</va-button>
          <va-button :preset="quickDispo.timeKind === 'slot' ? 'primary' : 'secondary'" size="small" @click="setQuickTimeKind('slot')">Créneaux</va-button>
        </div>
        
        <!-- Mission fields -->
        <div class="qa-grid" v-if="quickDispo.type === 'mission'">
          <LieuCombobox
            v-model="quickDispo.lieu"
            :options="lieuxOptionsStrings"
            label="Lieu"
            class="qa-field qa-wide"
            @create="onCreateLieu"
          />
          <template v-if="quickDispo.timeKind === 'range'">
            <va-input
              v-model="quickDispo.heure_debut"
              type="time"
              step="300"
              label="Début"
              placeholder="HH:MM"
              class="qa-field"
              @update:modelValue="(v: string) => onStartTimeChange(quickDispo, v)"
            >
              <template #appendInner>
                <va-icon name="schedule" size="14px" class="time-append-icon" title="Choisir l'heure" @click="openTimePickerFromIcon" />
              </template>
            </va-input>
            <va-input
              v-model="quickDispo.heure_fin"
              type="time"
              step="300"
              label="Fin"
              placeholder="HH:MM"
              class="qa-field"
              :disabled="!quickDispo.heure_debut"
              :min="quickDispo.heure_debut || undefined"
            >
              <template #appendInner>
                <va-icon name="schedule" size="14px" class="time-append-icon" title="Choisir l'heure" @click="openTimePickerFromIcon" />
              </template>
            </va-input>
          </template>
          <template v-else-if="quickDispo.timeKind === 'slot'">
            <va-select
              v-model="quickDispo.slots"
              :options="slotOptions"
              multiple
              label="Créneaux"
              text-by="text"
              value-by="value"
              class="qa-field qa-wide"
              @update:modelValue="(val: string[]) => limitQuickSlots(val)"
            />
          </template>
        </div>
        
        <!-- Disponible fields -->
        <div class="qa-grid" v-else-if="quickDispo.type === 'disponible'">
          <template v-if="quickDispo.timeKind === 'range'">
            <va-input v-model="quickDispo.heure_debut" type="time" step="300" label="Début" placeholder="HH:MM" class="qa-field">
              <template #appendInner>
                <va-icon name="schedule" size="14px" class="time-append-icon" title="Choisir l'heure" @click="openTimePickerFromIcon" />
              </template>
            </va-input>
            <va-input v-model="quickDispo.heure_fin" type="time" step="300" label="Fin" placeholder="HH:MM" class="qa-field">
              <template #appendInner>
                <va-icon name="schedule" size="14px" class="time-append-icon" title="Choisir l'heure" @click="openTimePickerFromIcon" />
              </template>
            </va-input>
          </template>
          <template v-else-if="quickDispo.timeKind === 'slot'">
            <va-select
              v-model="quickDispo.slots"
              :options="slotOptions"
              multiple
              label="Créneaux"
              text-by="text"
              value-by="value"
              class="qa-field qa-wide"
              @update:modelValue="(val: string[]) => limitQuickSlots(val)"
            />
          </template>
        </div>
      </div>
      <div class="qa-actions">
        <va-button preset="secondary" size="small" @click="openFullModalFromQuick">Plus d'options</va-button>
        <va-spacer />
        <va-button preset="primary" size="small" :disabled="!canQuickAdd" @click="addQuick">Ajouter</va-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import LieuCombobox from '../components/LieuCombobox.vue'
import { useToast } from 'vuestic-ui'
import FiltersHeader from '../components/FiltersHeader.vue'
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { AuthService } from '../services/auth'
import { db } from '../services/firebase'
import { collection, query, where, orderBy, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
const { notify } = useToast()

// Ouvre le sélecteur d'heure natif en cliquant sur l'icône append
function openTimePickerFromIcon(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement | null
  if (!target) return
  // Remonte jusqu'au wrapper de l'input puis cherche l'input[type="time"] réel rendu par VaInput
  const root = target.closest('.va-input-wrapper, .va-input, .qa-field, .compact-field') as HTMLElement | null
  const input = (root?.querySelector('input[type="time"]') || target.closest('.va-input')?.querySelector('input[type="time"]')) as HTMLInputElement | null
  if (input) {
    input.focus({ preventScroll: true })
    // Utiliser showPicker si disponible (Chrome/Safari récents)
    const anyInput = input as any
    if (typeof anyInput.showPicker === 'function') {
      try { anyInput.showPicker() } catch {}
    } else {
      // Fallback: click déclenche l’ouverture du picker
      input.click()
    }
  }
}

// Types
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
  // Nouveau modèle enrichi (optionnel pour compat)
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day'
  slots?: string[]
  isFullDay?: boolean
}

// États
const searchTerm = ref('')
const filterMetier = ref('')
const filterLieu = ref('')
const filterStatut = ref('')
const dateFrom = ref<string>('')
const dateTo = ref<string>('')
const viewMode = ref<'week' | 'month' | 'table'>('week')
const mobileFiltersOpen = ref(false)
const loadedDays = ref<any[]>([])
// Gestion des zones chargées
const loadedDateRanges = ref<Array<{start: string, end: string}>>([])
const saving = ref(false)

function isDayLoaded(date: string): boolean {
  return loadedDateRanges.value.some(range => date >= range.start && date <= range.end)
}

function addLoadedRange(start: string, end: string) {
  loadedDateRanges.value.push({ start, end })
  // Fusionner les plages qui se chevauchent
  loadedDateRanges.value.sort((a, b) => a.start.localeCompare(b.start))
  const merged = []
  for (const range of loadedDateRanges.value) {
    if (merged.length === 0 || merged[merged.length - 1].end < range.start) {
      merged.push(range)
    } else {
      merged[merged.length - 1].end = range.end > merged[merged.length - 1].end ? range.end : merged[merged.length - 1].end
    }
  }
  loadedDateRanges.value = merged
}

// Helpers dates + borne minimale: J-2 mois (futur infini, passé limité)
function toDateStr(d: Date) {
  // Format YYYY-MM-DD en heure locale (évite les décalages UTC)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDaysStr(dateStr: string, delta: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + delta)
  return toDateStr(d)
}
function diffDays(a: string, b: string) {
  // retourne le nombre de jours (b - a)
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}
// Borne minimale d’historique: au moins J-1 mois
function calcMinPastDate() {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return toDateStr(d)
}
const minPastDate = ref<string>(calcMinPastDate())

// Environnement
const isEmulator = import.meta.env.VITE_USE_EMULATOR === '1' || import.meta.env.DEV

function canonicalizeLieu(lieu: string): string {
  if (!lieu) return ''
  const s = lieu.trim().toLowerCase()
  if (s === 'indisponible' || s === 'absent' || s === 'unavailable' || s === 'indispo') return 'INDISPONIBLE'
  if (s === 'disponible' || s === 'dispo' || s === 'dispo journee' || s === 'dispo journée' || s === 'journée' || s === 'journee') return 'DISPO JOURNEE'
  if (s === 'sous balme' || s === 'sous-balme') return 'SOUS BALME'
  // Par défaut conserver la casse d'origine significative
  return lieu.toUpperCase()
}

// (retiré) ancienne heuristique de statut par lieu

// Détection simple de créneaux à partir d'un texte
function detectSlotsFromText(text: string): string[] {
  const t = (text || '').toLowerCase()
  const out: string[] = []
  if (/(matin|morning|am|^m$)/.test(t)) out.push('morning')
  if (/(midi|mi-?journée|mi[- ]?journee|midday)/.test(t)) out.push('midday')
  if (/(après-midi|apres[- ]?midi|aprem|apm|afternoon|pm)/.test(t)) out.push('afternoon')
  if (/(soir(ée)?|soiree|evening)/.test(t)) out.push('evening')
  if (/(nuit|night)/.test(t)) out.push('night')
  return Array.from(new Set(out))
}

// Hover entièrement géré par CSS (:hover) et overlay de colonne
// Données principales
const allCollaborateurs = ref<Array<{ id: string; nom: string; prenom: string; metier?: string; phone?: string; email?: string; ville?: string }>>([])
const loadingCollaborateurs = ref(true)
const disponibilitesCache = ref<Map<string, Disponibilite[]>>(new Map())
const loadingDisponibilites = ref(false)
const fetchingRanges = ref(false)
// Busy state: quand on charge des plages ou qu'on étend
const isBusy = computed(() => loadingCollaborateurs.value || loadingDisponibilites.value || fetchingRanges.value || extending.value)

// Options de formulaire
const typeOptions = [
  { text: 'Mission', value: 'mission' },
  { text: 'Disponible', value: 'disponible' },
  { text: 'Indisponible', value: 'indisponible' },
]

// Modal & ajout états
const showDispoModal = ref(false)
const selectedCell = ref<{ collaborateurId: string; date: string } | null>(null)
const selectedCellDispos = ref<Disponibilite[]>([])

// Options de créneaux
const slotOptions = [
  { text: 'Matin', value: 'morning' },
  { text: 'Mi-journée', value: 'midday' },
  { text: 'Après-midi', value: 'afternoon' },
  { text: 'Soir', value: 'evening' },
  { text: 'Nuit', value: 'night' },
]

// Options métiers/lieux
const lieuOptions = ref<string[]>([])
const lieuxOptions = computed(() => lieuOptions.value.map(s => ({ text: s, value: s })))
const lieuxOptionsStrings = computed(() => lieuOptions.value.slice())
const metiersOptions = computed(() => {
  const uniq = Array.from(new Set(allCollaborateurs.value.map(c => c.metier).filter(Boolean) as string[]))
  return uniq.map(m => ({ text: m, value: m }))
})

function timeKindOptionsFor(type: Disponibilite['type'] | undefined) {
  if (type === 'indisponible') return [
    { text: 'Journée', value: 'full-day' },
  ]
  return [
    { text: 'Journée', value: 'full-day' },
    { text: 'Heures', value: 'range' },
    { text: 'Créneaux', value: 'slot' },
  ]
}

function onCreateLieu(raw: string) {
  const canon = canonicalizeLieu(raw)
  if (!canon) return
  if (!lieuOptions.value.includes(canon)) {
    lieuOptions.value = [...lieuOptions.value, canon]
  }
}

function updateLieuxOptions() {
  const set = new Set<string>()
  for (const [, list] of disponibilitesCache.value) {
    for (const d of list) {
      const k = resolveDispoKind(d)
      if (k.type === 'mission') {
        const canon = canonicalizeLieu(d.lieu || '')
        if (canon) set.add(canon)
      }
    }
  }
  lieuOptions.value = Array.from(set).sort()
}

// Brouillon ajout dans la modale
const newDispo = ref<Disponibilite>({
  id: undefined,
  nom: '', prenom: '', metier: '', phone: '', email: '', ville: '',
  date: '', lieu: '', heure_debut: '', heure_fin: '',
  tenantId: 'keydispo', collaborateurId: '',
  type: 'mission', timeKind: 'range', slots: [], isFullDay: false,
})

// Quick add
type QuickDispo = {
  type: Disponibilite['type']
  timeKind: Disponibilite['timeKind']
  lieu: string
  heure_debut: string
  heure_fin: string
  slots: string[]
}

function toQuick(p: Partial<QuickDispo | Disponibilite>): QuickDispo {
  const sanitized = sanitizeDisposition({
    type: (p as any).type || 'mission',
    timeKind: (p as any).timeKind || 'range',
    lieu: (p as any).lieu || '',
    heure_debut: (p as any).heure_debut || '',
    heure_fin: (p as any).heure_fin || '',
    slots: Array.isArray((p as any).slots) ? (p as any).slots : [],
  })
  return {
    type: sanitized.type as any,
    timeKind: sanitized.timeKind as any,
    lieu: (sanitized.type === 'mission') ? (sanitized.lieu || '') : '',
    heure_debut: sanitized.timeKind === 'range' ? (sanitized.heure_debut || '') : '',
    heure_fin: sanitized.timeKind === 'range' ? (sanitized.heure_fin || '') : '',
    slots: sanitized.timeKind === 'slot' ? (sanitized.slots || []) : [],
  }
}

const quickAdd = ref<{ open: boolean; left: number; top: number; collaborateurId: string; date: string }>({ open: false, left: 0, top: 0, collaborateurId: '', date: '' })
const quickAddPanelRef = ref<HTMLElement | null>(null)
const quickDispo = ref<QuickDispo>(toQuick({ type: 'mission', timeKind: 'range', lieu: '', heure_debut: '', heure_fin: '', slots: [] }))

async function openQuickAdd(collaborateurId: string, date: string, e?: MouseEvent) {
  const scroller = planningScroll.value
  if (!scroller) return
  // Pas de scroll: on ouvre directement le Quick Add proche du clic
  const baseRect = scroller.getBoundingClientRect()
  const defaultX = baseRect.left + stickyLeftWidth + (scroller.clientWidth - stickyLeftWidth) / 2 + 12
  const defaultY = baseRect.top + (scroller.clientHeight) / 2 - 80
  const x = e?.clientX ? e.clientX + 10 : defaultX
  const y = e?.clientY ? e.clientY + 10 : defaultY
  quickAdd.value = { open: true, left: x, top: y, collaborateurId, date }
  quickDispo.value = toQuick({ type: 'mission', timeKind: 'range', lieu: '', heure_debut: '', heure_fin: '', slots: [] })
}
function closeQuickAdd() { quickAdd.value.open = false }

// Fermer le quick-add au clic à l'extérieur ou touche Échap
function onGlobalPointerDown(e: MouseEvent | TouchEvent) {
  if (!quickAdd.value.open) return
  const panel = quickAddPanelRef.value
  const target = (e as any).target as Node | null
  if (!panel || !target) return
  // Ne pas fermer si clic dans les overlays téléportés de Vuestic (menus VaSelect, Dropdown, Popover)
  const isInVuesticOverlay = (el: Node | null) => {
    if (!el || !(el instanceof Element)) return false
    return !!(el.closest('.va-select-dropdown__content, .va-dropdown__content, .va-popover__content, .va-select-option-list, .va-dropdown__content-wrapper'))
  }
  if (!panel.contains(target) && !isInVuesticOverlay(target)) {
    closeQuickAdd()
  }
}
function onGlobalKeydown(e: KeyboardEvent) {
  if (!quickAdd.value.open) return
  if (e.key === 'Escape') closeQuickAdd()
}

watch(() => quickAdd.value.open, (open) => {
  if (open) {
    // Utiliser pointerdown pour capter tôt le geste
    window.addEventListener('mousedown', onGlobalPointerDown, { capture: true })
    window.addEventListener('touchstart', onGlobalPointerDown as any, { capture: true })
    window.addEventListener('keydown', onGlobalKeydown)
  } else {
    window.removeEventListener('mousedown', onGlobalPointerDown, { capture: true } as any)
    window.removeEventListener('touchstart', onGlobalPointerDown as any, { capture: true } as any)
    window.removeEventListener('keydown', onGlobalKeydown)
  }
})
function setQuickType(t: Disponibilite['type']) { quickDispo.value = toQuick({ ...quickDispo.value, type: t }) }
function setQuickTimeKind(k: Disponibilite['timeKind']) { quickDispo.value = toQuick({ ...quickDispo.value, timeKind: k }) }
function limitQuickSlots(val: string[]) {
  const uniq = Array.from(new Set(val || []))
  const allowed = ['morning','midday','afternoon','evening','night']
  const filtered = uniq.filter(s => allowed.includes(s))
  const isMission = quickDispo.value.type === 'mission'
  const coverAll = ['morning','midday','afternoon','evening'].every(s => filtered.includes(s))
  if (!isMission && coverAll) {
    // Disponible: si tous les créneaux diurnes sont sélectionnés, basculer en "Journée"
    quickDispo.value = toQuick({ ...quickDispo.value, timeKind: 'full-day', slots: [] })
  } else {
    // Mission (ou non couverture complète) reste en créneaux
    quickDispo.value = toQuick({ ...quickDispo.value, timeKind: 'slot', slots: filtered })
  }
}

// Quick Add — avertissement si un créneau de la veille déborde sur ce jour
type QuickPrevOvernight = null | { kind: 'range'; end: string } | { kind: 'slot' }
const quickPrevOvernight = computed<QuickPrevOvernight>(() => {
  if (!quickAdd.value.open) return null
  const collabId = quickAdd.value.collaborateurId
  const day = quickAdd.value.date
  if (!collabId || !day) return null
  const prev = addDaysStr(day, -1)
  const list = getDisponibilites(collabId, prev)
  for (const d of list) {
    const k = resolveDispoKind(d)
    if (k.type === 'indisponible') continue
    if (k.timeKind === 'range' && d.heure_debut && d.heure_fin) {
      const s = toMinutes(d.heure_debut)
      const e = toMinutes(d.heure_fin)
      if (s != null && e != null && e < s) {
        return { kind: 'range', end: d.heure_fin.substring(0, 5) }
      }
    }
    if (k.timeKind === 'slot' && k.slots?.length) {
      if (k.slots.includes('night')) return { kind: 'slot' }
    }
  }
  return null
})

const canQuickAdd = computed(() => {
  const d = quickDispo.value
  if (!quickAdd.value.open) return false
  // même logique que canAddDispo + duplicat dans cache
  const sig = dispoSignature(d)
  if (hasDuplicateInCache(quickAdd.value.collaborateurId, quickAdd.value.date, sig)) return false
  if (d.type === 'mission') {
    // lieu non obligatoire; si plage horaire, heures requises
    if (d.timeKind === 'range') return !!(d.heure_debut && d.heure_fin)
    if (d.timeKind === 'slot') return Array.isArray(d.slots) && d.slots.length > 0
    return true
  }
  if (d.type === 'disponible') {
    if (d.timeKind === 'range') return !!(d.heure_debut && d.heure_fin)
    if (d.timeKind === 'slot') return Array.isArray(d.slots) && d.slots.length > 0
  return true
  }
  return true
})

// Modale: même avertissement overnight depuis la veille pour la cellule sélectionnée
const modalPrevOvernight = computed<QuickPrevOvernight>(() => {
  if (!showDispoModal.value || !selectedCell.value) return null
  const { collaborateurId, date } = selectedCell.value
  if (!collaborateurId || !date) return null
  const prev = addDaysStr(date, -1)
  const list = getDisponibilites(collaborateurId, prev)
  for (const d of list) {
    const k = resolveDispoKind(d)
    if (k.type === 'indisponible') continue
    if (k.timeKind === 'range' && d.heure_debut && d.heure_fin) {
      const s = toMinutes(d.heure_debut)
      const e = toMinutes(d.heure_fin)
      if (s != null && e != null && e < s) {
        return { kind: 'range', end: d.heure_fin.substring(0, 5) }
      }
    }
    if (k.timeKind === 'slot' && k.slots?.length) {
      if (k.slots.includes('night')) return { kind: 'slot' }
    }
  }
  return null
})

function hasDuplicateInCache(collaborateurId: string, date: string, sig: string): boolean {
  const list = getDisponibilites(collaborateurId, date)
  return list.some(d => dispoSignature(d) === sig)
}

async function addQuick() {
  if (!canQuickAdd.value) return
  const collab = filteredCollaborateurs.value.find(c => c.id === quickAdd.value.collaborateurId)
  if (!collab) return
  const d = quickDispo.value
  // Vérifier conflit par rapport aux dispos existantes de la cellule
  const existing = selectedCellDispos.value.length && selectedCell.value?.date === quickAdd.value.date && selectedCell.value?.collaborateurId === quickAdd.value.collaborateurId
    ? selectedCellDispos.value
    : getDisponibilites(quickAdd.value.collaborateurId, quickAdd.value.date)
  if (existing && existing.length && wouldConflictWithCandidate(existing, d as any)) {
    const msg = getConflictMessageWithCandidate(existing, d as any) || 'Conflit: combinaison invalide pour cette journée.'
    notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
    return
  }
  if (existing && existing.length && violatesMissionDispoOverlap(existing, d as any)) {
    notify({ message: 'Conflit: la disponibilité chevauche une mission existante.', color: 'warning', position: 'top-right', duration: 3000 })
    return
  }
  const canonLieu = d.type === 'mission' ? (canonicalizeLieu(d.lieu || '') || '') : ''
  const dispo: any = {
    tenantId: AuthService.currentTenantId || 'keydispo',
    date: quickAdd.value.date,
    collaborateurId: quickAdd.value.collaborateurId,
    nom: collab.nom, prenom: collab.prenom, metier: collab.metier, phone: collab.phone || '', email: collab.email || '', ville: collab.ville || '',
    type: d.type,
    timeKind: d.timeKind,
    // Mission: lieu optionnel, heures si timeKind === 'range'
    lieu: canonLieu,
    heure_debut: d.timeKind === 'range' ? (d.heure_debut || '') : '',
    heure_fin: d.timeKind === 'range' ? (d.heure_fin || '') : '',
    // Slots uniquement quand timeKind === 'slot'
    slots: d.timeKind === 'slot' ? (d.slots || []) : [],
    isFullDay: d.timeKind === 'full-day',
  }
  // Enregistrer immédiatement
  try {
    const batch = writeBatch(db)
    const newRef = doc(collection(db, 'dispos'))
    dispo.id = newRef.id
    batch.set(newRef, { ...dispo, updatedAt: serverTimestamp(), updatedBy: 'ui', version: 1 })
    await batch.commit()
    // MAJ cache
    const existing = disponibilitesCache.value.get(dispo.date) || []
    disponibilitesCache.value.set(dispo.date, [...existing, dispo])
    // Enregistrer le lieu dans les options s'il est nouveau
    if (canonLieu) {
      lieuOptions.value = Array.from(new Set([...lieuOptions.value, canonLieu]))
    }
    closeQuickAdd()
  } catch (e) {
    console.error('Erreur ajout rapide', e)
  }
}

function openFullModalFromQuick() {
  if (!quickAdd.value.open) return
  openDispoModal(quickAdd.value.collaborateurId, quickAdd.value.date)
  // Pré-remplir le formulaire d’ajout avec les valeurs du quick
  newDispo.value = sanitizeDisposition({
    ...newDispo.value,
    type: quickDispo.value.type,
    timeKind: quickDispo.value.timeKind,
    lieu: quickDispo.value.lieu,
    heure_debut: quickDispo.value.heure_debut,
    heure_fin: quickDispo.value.heure_fin,
    slots: quickDispo.value.slots || [],
  }) as any
  closeQuickAdd()
}

// Configuration optimisée
const dayWidth = 124
const rowHeight = 56
// Pas vertical réel d'une ligne (height + 1px de bordure-bas)
const rowPitch = rowHeight + 1
const stickyLeftWidth = 260 // largeur de la colonne collaborateurs réduite

// Visible days = fenêtre dynamique basée sur loadedDays
const visibleDays = computed(() => {
  const days = loadedDays.value
  // Si une plage complète est définie, restreindre l'affichage à cette plage
  if (dateFrom.value && dateTo.value) {
    const start = dateFrom.value
    const end = dateTo.value
    // Assumer start <= end (inputs date HTML garantissent l'ordre visuel, mais on protège)
    const a = start <= end ? start : end
    const b = start <= end ? end : start
    return days.filter(d => d.date >= a && d.date <= b)
  }
  return days
})
const gridMinWidth = computed(() => (visibleDays.value.length * dayWidth) + 'px')

// Virtualisation horizontale des jours
const windowStartIndex = ref(0)
const windowEndIndex = ref(0)
const windowPaddingCols = 8 // cols tampon de chaque côté
const windowOffsetPx = computed(() => windowStartIndex.value * dayWidth)
const windowedDays = computed(() => visibleDays.value.slice(windowStartIndex.value, Math.min(windowEndIndex.value + 1, visibleDays.value.length)))

function recomputeWindow(scroller?: HTMLElement | null) {
  const el = scroller || planningScroll.value
  if (!el) return
  const { scrollLeft, clientWidth } = el
  const firstIdx = Math.max(0, Math.floor(scrollLeft / dayWidth) - windowPaddingCols)
  const lastIdx = Math.min(visibleDays.value.length - 1, Math.ceil((scrollLeft + clientWidth) / dayWidth) + windowPaddingCols)
  windowStartIndex.value = firstIdx
  windowEndIndex.value = lastIdx
}

// Optimisation : Limiter le nombre de collaborateurs affichés en une fois
const maxVisibleCollaborateurs = 100
const paginatedCollaborateurs = computed(() => {
  return filteredCollaborateurs.value.slice(0, maxVisibleCollaborateurs)
})

// Ref unique pour le conteneur scroll
const planningScroll = ref<HTMLElement>()
// Refs overlays pour MAJ directe des transforms (évite CSS vars globales)
const colHoverEl = ref<HTMLElement | null>(null)
const colHoverHeaderEl = ref<HTMLElement | null>(null)
const rowHoverEl = ref<HTMLElement | null>(null)
// Ref pour le conteneur des lignes, utilisé pour calculer précisément la position Y du survol
const rowsRef = ref<HTMLElement | null>(null)
// Origines/pas mesurés des colonnes (px depuis le bord du scroller)
const gridLeftHeaderPx = ref<number>(0)
const gridLeftBodyPx = ref<number>(0)
const dayPitchHeaderPx = ref<number>(0)
const dayPitchBodyPx = ref<number>(0)
const dayWidthMeasuredPx = ref<number>(0)
// Pas/hauteur mesurés des lignes (compense bordure/margin réels)
const rowPitchPx = ref<number>(rowPitch)
const rowHeightMeasuredPx = ref<number>(rowHeight + 1)

function measureGridOrigins() {
  const scroller = planningScroll.value
  if (!scroller) return
  const scRect = scroller.getBoundingClientRect()
  // Header: première cellule jour visible (virtualisé)
  const firstHeaderDay = scroller.querySelector('.excel-days-row .days-window .excel-day-cell') as HTMLElement | null
  if (firstHeaderDay) {
    const r = firstHeaderDay.getBoundingClientRect()
    gridLeftHeaderPx.value = r.left - scRect.left + scroller.scrollLeft
    scroller.style.setProperty('--grid-left-header', `${gridLeftHeaderPx.value}px`)
    const secondHeaderDay = firstHeaderDay.nextElementSibling as HTMLElement | null
    if (secondHeaderDay) {
      const r2 = secondHeaderDay.getBoundingClientRect()
      dayPitchHeaderPx.value = r2.left - r.left
      scroller.style.setProperty('--day-pitch-header', `${dayPitchHeaderPx.value}px`)
    }
  }
  // Body: première cellule jour
  const firstBodyCell = scroller.querySelector('.excel-rows .days-window .excel-cell') as HTMLElement | null
  if (firstBodyCell) {
    const r = firstBodyCell.getBoundingClientRect()
    gridLeftBodyPx.value = r.left - scRect.left + scroller.scrollLeft
    scroller.style.setProperty('--grid-left-body', `${gridLeftBodyPx.value}px`)
    const secondBodyCell = firstBodyCell.nextElementSibling as HTMLElement | null
    if (secondBodyCell) {
      const r2 = secondBodyCell.getBoundingClientRect()
      dayPitchBodyPx.value = r2.left - r.left
      scroller.style.setProperty('--day-pitch-body', `${dayPitchBodyPx.value}px`)
    }
    dayWidthMeasuredPx.value = r.width
    scroller.style.setProperty('--day-width-measured', `${r.width}px`)
  }
}

function measureRowPitch() {
  const rowsEl = rowsRef.value
  if (!rowsEl) return
  const rows = rowsEl.querySelectorAll('.excel-row') as NodeListOf<HTMLElement>
  if (rows.length >= 1) {
    const r1 = rows[0].getBoundingClientRect()
    rowHeightMeasuredPx.value = Math.round(r1.height)
  }
  if (rows.length >= 2) {
    const r1 = rows[0].getBoundingClientRect()
    const r2 = rows[1].getBoundingClientRect()
    const pitch = Math.round(r2.top - r1.top)
    if (pitch > 0) rowPitchPx.value = pitch
  } else {
    rowPitchPx.value = rowPitch
  }
  const scroller = planningScroll.value
  if (scroller) {
    scroller.style.setProperty('--row-overlay-height', `${rowHeightMeasuredPx.value}px`)
  }
}


// Debug hover perf
const DEBUG_HOVER = false
let _hoverLastMoveTs = 0
let _hoverLastLogTs = 0
let _hoverRafId: number | null = null
let _hoverPending = false
let _lastPointerX = 0
let _lastPointerY = 0

// Met à jour la position de l'overlay du jour courant
function onGridMouseMove(e: MouseEvent) {
  _lastPointerX = e.clientX
  _lastPointerY = e.clientY
  if (_hoverPending) return
  _hoverPending = true
  const tStart = performance.now()
  requestAnimationFrame(() => {
    _hoverPending = false
  // Utiliser la ref directement (plus fiable que l'event asynchrone)
  const scroller = planningScroll.value as HTMLElement
    if (!scroller) return
    const rect = scroller.getBoundingClientRect()
  // X → index de colonne (origine: bord gauche mesuré de la première colonne)
  const xContent = _lastPointerX - rect.left + scroller.scrollLeft
  const gridLeft = (gridLeftBodyPx.value || (stickyLeftWidth + 1))
  const pitch = dayPitchBodyPx.value || (dayWidth + 1)
  const absColIdx = Math.floor((xContent - gridLeft) / pitch)
    const colX = absColIdx * pitch
    if (absColIdx < 0 || absColIdx >= visibleDays.value.length) {
      colHoverEl.value && (colHoverEl.value.style.transform = 'translate3d(-9999px,0,0)')
      colHoverHeaderEl.value && (colHoverHeaderEl.value.style.transform = 'translate3d(-9999px,0,0)')
    } else {
      const tx = `translate3d(${colX}px,0,0)`
      colHoverEl.value && (colHoverEl.value.style.transform = tx)
      colHoverHeaderEl.value && (colHoverHeaderEl.value.style.transform = tx)
    }

    // Y → index de ligne (basé sur offsetTop de .excel-rows)
    const rowsEl = rowsRef.value
    const rowsOffset = rowsEl ? rowsEl.offsetTop : 0
    const yContent = _lastPointerY - rect.top + scroller.scrollTop - rowsOffset
    if (yContent < 0) {
      rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
  logHover(tStart, absColIdx, 'n/a (y<0)')
      return
    }
    const nRows = paginatedCollaborateurs.value.length
  let rowIdx = Math.floor(yContent / rowPitchPx.value)
    if (rowIdx < 0 || rowIdx >= nRows) {
      rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
  logHover(tStart, absColIdx, 'out')
      return
    }
    rowIdx = Math.max(0, Math.min(nRows - 1, rowIdx))
  const topPx = Math.round(rowIdx * rowPitchPx.value)
  rowHoverEl.value && (rowHoverEl.value.style.transform = `translate3d(0,${topPx}px,0)`)
  logHover(tStart, absColIdx, rowIdx)
  })
}

function logHover(tStart: number, idx: number, row: number | string) {
  if (!(import.meta.env.DEV && DEBUG_HOVER)) return
  const compute = performance.now() - tStart
  const now = tStart
  const dMove = _hoverLastMoveTs ? now - _hoverLastMoveTs : 0
  _hoverLastMoveTs = now
  if (now - _hoverLastLogTs > 200) {
    _hoverLastLogTs = now
    if (_hoverRafId) cancelAnimationFrame(_hoverRafId)
    _hoverRafId = requestAnimationFrame(() => {
      const toFrame = performance.now() - tStart
      console.log('[hover]', 'Δmove', dMove.toFixed(1)+'ms', '| compute', compute.toFixed(2)+'ms', '| toFrame', toFrame.toFixed(1)+'ms', '| idx', idx, '| row', row)
    })
  }
}

// Disponibilité par jour/plage
function getDayStatus(collaborateurId: string, date: string): 'disponible' | 'indisponible' | 'unknown' {
  const dispos = getDisponibilites(collaborateurId, date)
  if (!dispos.length) return 'unknown'
  let hasDispo = false
  for (const d of dispos) {
    const kind = resolveDispoKind(d)
    if (kind.type === 'indisponible' || kind.type === 'mission') return 'indisponible'
    if (kind.type === 'disponible') hasDispo = true
  }
  return hasDispo ? 'disponible' : 'unknown'
}

function isAvailableOnDate(collaborateurId: string, date: string): boolean {
  return getDayStatus(collaborateurId, date) === 'disponible'
}

function eachDateInRange(a: string, b: string): string[] {
  const start = a <= b ? a : b
  const end = a <= b ? b : a
  const out: string[] = []
  let cur = new Date(start)
  const endD = new Date(end)
  while (cur <= endD) {
    out.push(toDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function isAvailableInRange(collaborateurId: string, a: string, b?: string): boolean {
  if (!a) return true
  const days = b ? eachDateInRange(a, b) : [a]
  if (!days.length) return false
  return days.every(d => isAvailableOnDate(collaborateurId, d))
}

function hasExplicitIndispoInRange(collaborateurId: string, a: string, b?: string): boolean {
  if (!a) return false
  const days = b ? eachDateInRange(a, b) : [a]
  for (const date of days) {
    const dispos = getDisponibilites(collaborateurId, date)
    if (dispos.some(d => {
      const k = resolveDispoKind(d)
      return k.type === 'indisponible' || k.type === 'mission'
    })) return true
  }
  return false
}

function hasLieuInRange(collaborateurId: string, lieu: string, a: string, b?: string): boolean {
  const canon = canonicalizeLieu(lieu)
  if (!canon) return true
  const days = b ? eachDateInRange(a, b) : [a]
  for (const date of days) {
    const dispos = getDisponibilites(collaborateurId, date)
    if (dispos.some(d => canonicalizeLieu(d.lieu || '') === canon)) return true
  }
  return false
}

// Filtres (inclut statut/lieu/coupes sur dates)
const filteredCollaborateurs = computed(() => {
  return allCollaborateurs.value.filter(collab => {
    const searchMatch = !searchTerm.value || `${collab.prenom} ${collab.nom}`.toLowerCase().includes(searchTerm.value.toLowerCase())
    const metierMatch = !filterMetier.value || collab.metier === filterMetier.value
    // Statut appliqué uniquement si une date de début est définie (jour ou plage)
    let statutMatch = true
    if (filterStatut.value && dateFrom.value) {
      if (filterStatut.value === 'Disponible') {
        statutMatch = isAvailableInRange(collab.id, dateFrom.value, dateTo.value || undefined)
      } else if (filterStatut.value === 'Indisponible') {
        statutMatch = hasExplicitIndispoInRange(collab.id, dateFrom.value, dateTo.value || undefined)
      }
    }
    // Lieu: filtrage si un lieu est choisi et une date de début est fournie
    const lieuMatch = !filterLieu.value || !dateFrom.value || hasLieuInRange(collab.id, filterLieu.value, dateFrom.value, dateTo.value || undefined)
    return searchMatch && metierMatch && statutMatch && lieuMatch
  })
})

// Suggestions contextuelles
const suggestions = computed(() => {
  const lines: string[] = []
  const total = allCollaborateurs.value.length
  const start = dateFrom.value
  const end = dateTo.value || ''
  // Suggestion disponibilité globale pour une plage
  if (filterStatut.value === 'Disponible' && start) {
    const availCount = allCollaborateurs.value.filter(c => isAvailableInRange(c.id, start, end || undefined)).length
    lines.push(`${availCount} collaborateurs disponibles${end ? ` sur la période ${start} → ${end}` : ` le ${start}`} (sur ${total})`)
  }
  // Si un seul collaborateur reste après filtre nom/métier, proposer sa prochaine dispo
  if (filteredCollaborateurs.value.length === 1) {
    const c = filteredCollaborateurs.value[0]
    const from = end || start || toDateStr(new Date())
    const next = findNextAvailability(c.id, from)
    if (next) lines.push(`Prochaine disponibilité pour ${c.prenom} ${c.nom} : ${next}`)
  }
  return lines
})

function findNextAvailability(collaborateurId: string, fromDate: string): string | null {
  const list = loadedDays.value
  if (!list.length) return null
  let started = false
  for (const d of list) {
    if (!started) { started = d.date >= fromDate }
    if (!started) continue
    if (isAvailableOnDate(collaborateurId, d.date)) return d.date
  }
  return null
}

const totalDisponibilites = computed(() => {
  let total = 0
  for (const [, dispos] of disponibilitesCache.value) {
    total += dispos.length
  }
  return total
})

const statutOptions = computed(() => ['Disponible', 'Indisponible'].map(s => ({ text: s, value: s })))

const formatCurrentPeriod = computed(() => {
  if (visibleDays.value.length === 0) return ''
  const first = visibleDays.value[0]
  const last = visibleDays.value[visibleDays.value.length - 1]
  return `${first.date} → ${last.date}`
})

// Générer les segments de mois optimisés
const monthSegments = computed(() => {
  const segments: any[] = []
  let currentMonth = ''
  let currentCount = 0
  let currentStartIdx = 0
  
  visibleDays.value.forEach((day, index) => {
    const monthName = new Date(day.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    
    if (monthName !== currentMonth) {
      if (currentCount > 0) {
        segments.push({
          key: `${currentMonth}-${index}`,
          label: currentMonth,
          count: currentCount,
          // état de chargement de ce segment (si toutes les dates sont chargées)
          loaded: visibleDays.value
            .slice(currentStartIdx, currentStartIdx + currentCount)
            .every(d => isDayLoaded(d.date))
        })
      }
      currentMonth = monthName
      currentCount = 1
      currentStartIdx = index
    } else {
      currentCount++
    }
  })
  
  if (currentCount > 0) {
    segments.push({
      key: `${currentMonth}-final`,
      label: currentMonth,
      count: currentCount,
      loaded: visibleDays.value
        .slice(currentStartIdx, currentStartIdx + currentCount)
        .every(d => isDayLoaded(d.date))
    })
  }
  
  return segments
})

// Numéros de semaines ISO alignés sur 7 jours
function getISOWeek(dateStr: string): number {
  // Calcul ISO-8601 en local pour rester cohérent avec nos dates locales
  const d = new Date(dateStr + 'T12:00:00') // milieu de journée pour éviter les bords DST
  const target = new Date(d)
  const dayNr = (d.getDay() + 6) % 7 // 0=lundi ... 6=dimanche
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstThursdayDayNr = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNr + 3)
  const diff = target.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
}

// Détecte la fin de semaine (dimanche) pour tracer une légère séparation
function isWeekBoundary(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  // Dimanche = 0
  return d.getDay() === 0
}

// Détecte la fin de mois (jour dont le lendemain change de mois)
// (supprimé) Fin de mois: plus utilisée pour jours/body; le style mois utilise un séparateur dédié

const weekSegments = computed(() => {
  const segs: Array<{ key: string; week: number; count: number }> = []
  let currentWeek: number | null = null
  let count = 0
  for (let i = 0; i < visibleDays.value.length; i++) {
    const w = getISOWeek(visibleDays.value[i].date)
    if (currentWeek === null) {
      currentWeek = w
      count = 1
    } else if (w === currentWeek) {
      count++
    } else {
      segs.push({ key: `w-${currentWeek}-${i}`, week: currentWeek, count })
      currentWeek = w
      count = 1
    }
  }
  if (currentWeek != null && count > 0) segs.push({ key: `w-${currentWeek}-final`, week: currentWeek, count })
  return segs
})

// Gestion hover performante
// plus de setters de hover réactifs: supprimés

// Colonne survolée via overlay (CSS var en pixels)

function onGridMouseLeave() {
  colHoverEl.value && (colHoverEl.value.style.transform = 'translate3d(-9999px,0,0)')
  colHoverHeaderEl.value && (colHoverHeaderEl.value.style.transform = 'translate3d(-9999px,0,0)')
  rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
}

// Plus aucune synchronisation JS nécessaire: header et colonne gauche sont sticky

// Disponibilités
function getDisponibilites(collaborateurId: string, date: string): Disponibilite[] {
  const dayDispos = disponibilitesCache.value.get(date) || []
  return dayDispos.filter(d => d.collaborateurId === collaborateurId)
}

const slotOrder: Record<string, number> = {
  morning: 1,
  midday: 2,
  afternoon: 3,
  evening: 4,
  night: 5,
}

function timeKey(d: Disponibilite): number {
  const k = resolveDispoKind(d)
  // slot: prendre le premier slot le plus tôt
  if (k.timeKind === 'slot' && k.slots && k.slots.length) {
    const sorted = [...k.slots].sort((a, b) => (slotOrder[a] || 99) - (slotOrder[b] || 99))
    return slotOrder[sorted[0]] || 99
  }
  // range: convertir l'heure de début en minutes
  if (k.timeKind === 'range' && d.heure_debut) {
    const [h, m] = d.heure_debut.split(':').map(Number)
    return h * 60 + m
  }
  // full-day en dernier
  return 10_000
}

function typePriority(d: Disponibilite): number {
  const t = resolveDispoKind(d).type
  // priorité d’affichage par type dans une case: disponible (haut) < mission < indisponible (bas)
  if (t === 'disponible') return 1
  if (t === 'mission') return 2
  if (t === 'indisponible') return 3
  return 4
}

// Détermine si une dispo "range" couvre ce jour (start, middle, end) en gérant overnight
function partForDay(d: Disponibilite, day: string): 'start'|'middle'|'end'|null {
  const k = resolveDispoKind(d)
  if (k.timeKind !== 'range' || !d.heure_debut || !d.heure_fin) return null
  const s = toMinutes(d.heure_debut)
  const e = toMinutes(d.heure_fin)
  if (s == null || e == null) return null
  if (d.date === day) {
    if (e < s) return 'start' // overnight: part de ce jour
    if (e > s) return 'start'
  }
  // overnight continuation on next day
  const next = addDaysStr(d.date, 1)
  if (next === day && e < s) return 'end'
  return null
}

function timeLabelForCell(d: Disponibilite, day: string): string {
  const p = partForDay(d, day)
  const s = d.heure_debut!.substring(0,5)
  const e = d.heure_fin!.substring(0,5)
  if (p === 'start') return `${s}→…`
  if (p === 'end') return `…→ ${e}`
  // même jour simple
  return `${s}-${e}`.replace(':00', '').replace(':00', '') + 'h'
}

// Label complet pour l'info-bulle (montre toujours début et fin, même en overnight)
function fullTimeLabel(d: Disponibilite): string {
  const s = (d.heure_debut || '').substring(0, 5)
  const e = (d.heure_fin || '').substring(0, 5)
  if (!s || !e) return ''
  const sFr = s.replace(':', 'h')
  const eFr = e.replace(':', 'h')
  return `de ${sFr} à ${eFr}`
}


type CellDispo = Disponibilite & { _cont?: 'start'|'end' }
function getCellDispos(collaborateurId: string, date: string): CellDispo[] {
  const list = getDisponibilites(collaborateurId, date)
  const out: CellDispo[] = []
  for (const d of list) {
    const k = resolveDispoKind(d)
    if (k.timeKind !== 'range' || !d.heure_debut || !d.heure_fin) { out.push(d as CellDispo); continue }
    const part = partForDay(d, date)
    if (part) out.push({ ...(d as any), _cont: part })
    else out.push(d as CellDispo)
  }
  // Ajouter les continuations overnight venant de la veille
  const prev = addDaysStr(date, -1)
  const prevList = getDisponibilites(collaborateurId, prev)
  for (const d of prevList) {
    const k = resolveDispoKind(d)
    if (k.timeKind === 'range' && d.heure_debut && d.heure_fin) {
      const s = toMinutes(d.heure_debut)!, e = toMinutes(d.heure_fin)!
      if (e < s) { // overnight depuis la veille vers aujourd'hui
        out.push({ ...(d as any), _cont: 'end', date })
      }
    }
  }
  return out
}

function getCellDisposSorted(collaborateurId: string, date: string): CellDispo[] {
  return getCellDispos(collaborateurId, date)
    .slice()
    .sort((a, b) => {
      const tk = timeKey(a) - timeKey(b)
      if (tk !== 0) return tk
      return typePriority(a) - typePriority(b)
    })
}

function resolveDispoKind(dispo: Disponibilite) {
  const type = dispo.type
  const timeKind = dispo.timeKind
  const slots = dispo.slots
  if (type) return { type, timeKind: timeKind || 'full-day', slots: slots || [] as string[] }
  // Fallback legacy via lieu/heures/slots implicites
  const canon = canonicalizeLieu(dispo.lieu || '')
  if (canon === 'INDISPONIBLE') return { type: 'indisponible', timeKind: 'full-day', slots: [] }
  if (canon === 'DISPO JOURNEE') return { type: 'disponible', timeKind: 'full-day', slots: [] }
  const hasHours = !!(dispo.heure_debut && dispo.heure_fin)
  const inferredSlots = detectSlotsFromText(dispo.lieu || '')
  if ((canon === '' || canon === 'DISPONIBLE') && inferredSlots.length > 0) {
    return { type: 'disponible', timeKind: 'slot', slots: inferredSlots }
  }
  if (hasHours) {
    return { type: canon ? 'mission' : 'disponible', timeKind: 'range', slots: [] }
  }
  return { type: canon ? 'mission' : 'disponible', timeKind: 'full-day', slots: [] }
}

// Assainir une disponibilité en fonction du couple type/timeKind et nettoyer les champs incompatibles
function sanitizeDisposition(d: Partial<Disponibilite>): Partial<Disponibilite> {
  const type = d.type as Disponibilite['type']
  let timeKind = d.timeKind as Disponibilite['timeKind']

  if (type === 'indisponible') {
    timeKind = 'full-day'
    return { ...d, type, timeKind, isFullDay: true, lieu: '', heure_debut: '', heure_fin: '', slots: [] }
  }

  if (type === 'mission') {
    if (timeKind !== 'range' && timeKind !== 'full-day' && timeKind !== 'slot') {
      timeKind = 'range'
    }
    if (timeKind === 'slot') {
      const uniq = Array.from(new Set(d.slots || []))
      const allowed = ['morning','midday','afternoon','evening','night']
      const filtered = uniq.filter(s => allowed.includes(s))
      return { ...d, type, timeKind: 'slot', isFullDay: false, heure_debut: '', heure_fin: '', slots: filtered }
    }
    return {
      ...d,
      type,
      timeKind,
      isFullDay: timeKind === 'full-day',
      slots: [],
      heure_debut: timeKind === 'range' ? (d.heure_debut || '') : '',
      heure_fin: timeKind === 'range' ? (d.heure_fin || '') : '',
    }
  }

  if (type === 'disponible') {
    if (timeKind !== 'full-day' && timeKind !== 'range' && timeKind !== 'slot') {
      timeKind = 'full-day'
    }
    // disponible: pas de lieu
    if (timeKind === 'slot') {
      // Contraintes: empêcher la sélection de l’ensemble des créneaux équivalents à une journée
      const uniq = Array.from(new Set(d.slots || []))
      const normalized = uniq.filter(s => ['morning','midday','afternoon','evening','night'].includes(s))
      // Si l'utilisateur essaie de tout couvrir (matin+mi-journée+après-midi+soir), on force full-day
      const coverAll = ['morning','midday','afternoon','evening'].every(s => normalized.includes(s))
      if (coverAll) {
        return { ...d, type, timeKind: 'full-day', isFullDay: true, lieu: '', heure_debut: '', heure_fin: '', slots: [] }
      }
      return { ...d, type, timeKind, isFullDay: false, lieu: '', heure_debut: '', heure_fin: '', slots: normalized }
    }
    if (timeKind === 'range') {
      return { ...d, type, timeKind, isFullDay: false, lieu: '', slots: [] }
    }
    // full-day
    return { ...d, type, timeKind: 'full-day', isFullDay: true, lieu: '', heure_debut: '', heure_fin: '', slots: [] }
  }

  // Par défaut, ne rien casser
  return d
}

// (handlers remplacés par setNewType/setNewTimeKind)

// function limitSlotSelection(val: string[]) {
//   // Déduplique et garde l’ordre logique
//   const uniq = Array.from(new Set(val || []))
//   const allowed = ['morning','midday','afternoon','evening','night']
//   const filtered = uniq.filter(s => allowed.includes(s))
//   // Si l’ensemble des créneaux diurnes est couvert, basculer en full-day
//   const coverAll = ['morning','midday','afternoon','evening'].every(s => filtered.includes(s))
//   if (coverAll) {
//     newDispo.value.timeKind = 'full-day'
//     newDispo.value.slots = []
//     newDispo.value.isFullDay = true
//     return
//   }
//   newDispo.value.slots = filtered
// }

function getDispoBarClass(dispo: Disponibilite) {
  const k = resolveDispoKind(dispo)
  if (k.type === 'indisponible') return 'dispo-bar-unavailable'
  if (k.type === 'mission') return 'dispo-bar-mission'
  if (k.type === 'disponible') return 'dispo-bar-available'
  return 'dispo-bar-other'
}

function isOvernightContinuation(dispo: Partial<Disponibilite> & { _cont?: 'start'|'end' }, cellDate: string) {
  const k = resolveDispoKind(dispo as Disponibilite)
  if (k.timeKind !== 'range' || !dispo.heure_debut || !dispo.heure_fin) return false
  // continuation 'end' dans la cellule du lendemain
  if (dispo._cont === 'end') return true
  // sinon, si la dispo date d'hier et traverse la nuit
  const s = toMinutes(dispo.heure_debut)
  const e = toMinutes(dispo.heure_fin)
  return (cellDate === addDaysStr((dispo as Disponibilite).date, 1)) && !!(s != null && e != null && e < s)
}

function isOvernightStart(dispo: Partial<Disponibilite> & { _cont?: 'start'|'end' }, cellDate: string) {
  const k = resolveDispoKind(dispo as Disponibilite)
  if (k.timeKind !== 'range' || !dispo.heure_debut || !dispo.heure_fin) return false
  const s = toMinutes(dispo.heure_debut)
  const e = toMinutes(dispo.heure_fin)
  return (cellDate === (dispo as Disponibilite).date) && !!(s != null && e != null && e < s)
}

function getDispoContinuationClass(dispo: Partial<Disponibilite> & { _cont?: 'start'|'end' }, cellDate: string) {
  if (isOvernightContinuation(dispo, cellDate)) return 'dispo-continuation cont-from-prev'
  if (isOvernightStart(dispo, cellDate)) return 'dispo-continuation cont-to-next'
  return ''
}

function getDispoTypeClass(dispo: Partial<Disponibilite>) {
  const t = resolveDispoKind(dispo as Disponibilite).type
  if (t === 'mission') return 'card-mission'
  if (t === 'disponible') return 'card-dispo'
  if (t === 'indisponible') return 'card-indispo'
  return ''
}

// Classe dominante d'une cellule selon les dispos présentes (priorité: indisponible > mission > disponible)
function getCellKindClass(collaborateurId: string, date: string) {
  const list = getDisponibilites(collaborateurId, date)
  if (!list.length) return 'cell-empty'
  const hasInd = list.some(d => resolveDispoKind(d).type === 'indisponible')
  if (hasInd) return 'cell-indispo'
  const hasMission = list.some(d => resolveDispoKind(d).type === 'mission')
  if (hasMission) return 'cell-mission'
  return 'cell-dispo'
}

function getDispoBarStyle() {
  // Pleine largeur; la hauteur est gérée par le layout (single/multi)
  return { width: '100%' }
}

// Info-bulle compacte pour chaque barre (léger: utilise l'attribut title natif)
function getDispoBarTitle(dispo: Disponibilite, _cellDate: string): string {
  const k = resolveDispoKind(dispo)
  const parts: string[] = []
  if (k.type === 'mission') {
    if (k.timeKind === 'range' && dispo.heure_debut && dispo.heure_fin) {
      const canon = dispo.lieu ? canonicalizeLieu(dispo.lieu) : ''
      return canon ? `Mission à ${canon} ${fullTimeLabel(dispo)}` : `Mission ${fullTimeLabel(dispo)}`
    }
    parts.push('Mission')
    if (dispo.lieu) parts.push(canonicalizeLieu(dispo.lieu))
    if (k.timeKind === 'slot' && k.slots?.length) {
      parts.push(k.slots.map((s: string) => slotLabel(s)).join(', '))
    } else {
      parts.push('Journée')
    }
  return parts.filter(Boolean).join(' ')
  }
  if (k.type === 'disponible') {
    parts.push('Disponible')
    if (k.timeKind === 'range' && dispo.heure_debut && dispo.heure_fin) {
      parts.push(fullTimeLabel(dispo))
    } else if (k.timeKind === 'slot' && k.slots?.length) {
      parts.push(k.slots.map((s: string) => slotLabel(s)).join(', '))
    } else {
      parts.push('Journée')
    }
  return parts.filter(Boolean).join(' ')
  }
  if (k.type === 'indisponible') {
  return 'Indisponible Journée'
  }
  // fallback
  if (dispo.heure_debut && dispo.heure_fin) return fullTimeLabel(dispo)
  return 'Détail'
}

// (tooltips supprimés pour performance; ancienne fonction getDispoBarTooltip retirée)

function slotLabel(s: string) {
  switch (s) {
    case 'morning': return 'Matin'
    case 'midday': return 'Mi-journée'
    case 'afternoon': return 'Après-midi'
    case 'evening': return 'Soir'
    case 'night': return 'Nuit'
    default: return s
  }
}

// (slotsBadge retiré – retour à des pills individuelles)

// Contenu du tooltip pour une barre de disponibilité/mission
// (supprimé) Popover info: retiré pour revenir à l’état antérieur

// Helpers horaires
function toMinutes(hhmm?: string): number | null {
  if (!hhmm) return null
  const m = hhmm.match(/^(\d{2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1]); const mi = Number(m[2])
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null
  return h * 60 + mi
}
// Normalise une plage avec gestion nuit: retourne [startMin, endMin, overnight]
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
function slotsToRanges(slots: string[]): Array<[number, number]> {
  const map: Record<string, [number, number]> = {
    morning: [8 * 60, 12 * 60],
    midday: [12 * 60, 14 * 60],
    afternoon: [14 * 60, 18 * 60],
    evening: [18 * 60, 22 * 60],
    night: [22 * 60, 30 * 60], // 22:00 → 06:00 (+480) = 1800
  }
  return slots.map(s => map[s]).filter(Boolean) as Array<[number, number]>
}

function violatesMissionDispoOverlap(existing: Partial<Disponibilite>[], candidate: Partial<Disponibilite>): boolean {
  const kC = resolveDispoKind(candidate as Disponibilite)
  // Full-day vs mission traité ailleurs
  if (kC.type === 'disponible' && kC.timeKind === 'range' && candidate.heure_debut && candidate.heure_fin) {
    const c = normalizeRange(candidate.heure_debut, candidate.heure_fin)
    for (const d of existing) {
      const k = resolveDispoKind(d as Disponibilite)
      if (k.type !== 'mission') continue
      if (k.timeKind === 'full-day') return true
      if (k.timeKind === 'range' && d.heure_debut && d.heure_fin) {
        const r = normalizeRange(d.heure_debut, d.heure_fin)
        if (c.s != null && c.e != null && r.s != null && r.e != null && rangesOverlap(c.s, c.e, r.s, r.e)) return true
      }
      if (k.timeKind === 'slot' && k.slots?.length) {
        const ranges = slotsToRanges(k.slots)
        if (c.s != null && c.e != null && ranges.some(([s, e]) => rangesOverlap(c.s!, c.e!, s, e))) return true
      }
    }
  }
  if (kC.type === 'disponible' && kC.timeKind === 'slot' && kC.slots?.length) {
    const cRanges = slotsToRanges(kC.slots)
    for (const d of existing) {
      const k = resolveDispoKind(d as Disponibilite)
      if (k.type !== 'mission') continue
      if (k.timeKind === 'full-day') return true
      if (k.timeKind === 'range' && d.heure_debut && d.heure_fin) {
        const r = normalizeRange(d.heure_debut, d.heure_fin)
        if (r.s != null && r.e != null && cRanges.some(([s, e]) => rangesOverlap(s, e, r.s!, r.e!))) return true
      }
      if (k.timeKind === 'slot' && k.slots?.length) {
        // intersection slots
        if (k.slots.some(s => kC.slots!.includes(s))) return true
      }
    }
  }
  return false
}
function onStartTimeChange(target: any, start: string) {
  // Autoriser les créneaux de nuit (fin < début). Ne vider que si égalité stricte.
  const s = toMinutes(start)
  const e = toMinutes(target.heure_fin)
  if (s != null && e != null && e === s) {
    target.heure_fin = ''
  }
}

// Utils d'affichage
function formatPhone(phone: string) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) {
    // regroupe en paires: 06 12 34 56 78
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  }
  return phone
}

// Ancien calcul par durée — non utilisé depuis le layout vertical

// Layout des barres dans une cellule: single => une barre occupe toute la hauteur; multi => barres partagent la hauteur
function getDispoBarsLayoutClass(collaborateurId: string, date: string) {
  const n = getDisponibilites(collaborateurId, date).length
  if (n <= 1) return 'single'
  return 'multi'
}

// Ancien calcul de durée supprimé (non utilisé)

// Modal
function openDispoModal(collaborateurId: string, date: string) {
  selectedCell.value = { collaborateurId, date }
  // Enrichir les dispos existantes pour édition (assurer type/timeKind/slots)
  selectedCellDispos.value = getDisponibilites(collaborateurId, date).map((d) => {
    const k = resolveDispoKind(d)
    // Injecter le modèle enrichi puis assainir les champs incompatibles
    const merged: Partial<Disponibilite> = {
      ...d,
      type: k.type as Disponibilite['type'],
      timeKind: k.timeKind as Disponibilite['timeKind'],
      slots: k.timeKind === 'slot' ? (k.slots || []) : [],
    }
    const cleaned = sanitizeDisposition(merged)
    // Forcer les champs horaires selon timeKind pour cohérence d’édition
    if (cleaned.timeKind === 'range') {
      cleaned.heure_debut = (d.heure_debut || '')
      cleaned.heure_fin = (d.heure_fin || '')
    }
    if (cleaned.type === 'mission') {
      cleaned.lieu = d.lieu || ''
    }
    return cleaned as Disponibilite
  })
  showDispoModal.value = true
}


function getSelectedCollaborateur() {
  if (!selectedCell.value) return null
  return filteredCollaborateurs.value.find(c => c.id === selectedCell.value!.collaborateurId)
}

function formatModalDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  })
}

const canAddDispo = computed(() => {
  const d = newDispo.value
  // Interdire les conflits avec les éléments déjà présents dans la modale
  if (selectedCellDispos.value.length && wouldConflictWithCandidate(selectedCellDispos.value, d)) return false
  // Interdire les chevauchements dispo vs missions existantes
  if (violatesMissionDispoOverlap(selectedCellDispos.value, d)) return false
  if (d.type === 'mission') {
    // lieu non obligatoire
    if (d.timeKind === 'range') return !!(d.heure_debut && d.heure_fin)
    if (d.timeKind === 'slot') {
      if (!Array.isArray(d.slots) || d.slots.length === 0) return false
    }
    const sig = dispoSignature(d)
    if (hasDuplicateInModal(sig)) return false
    return true
  }
  if (d.type === 'disponible') {
    if (d.timeKind === 'range') return !!(d.heure_debut && d.heure_fin)
    if (d.timeKind === 'slot') {
      if (!Array.isArray(d.slots) || d.slots.length === 0) return false
      const sig = dispoSignature(d)
  if (hasDuplicateInModal(sig)) return false
  if (violatesMissionDispoOverlap(selectedCellDispos.value, d)) return false
      return true
    }
    const sig = dispoSignature(d)
    if (hasDuplicateInModal(sig)) return false
    return true // full-day dispo
  }
  // indisponible
  const sig = dispoSignature(d)
  if (hasDuplicateInModal(sig)) return false
  return true
})

function dispoSignature(d: Partial<Disponibilite>) {
  const t = d.type
  const k = d.timeKind
  if (t === 'indisponible') return 'indisponible:full-day'
  if (t === 'mission') {
  if (k === 'slot') return `mission:slot:${(d.slots || []).slice().sort().join(',')}:${d.lieu || ''}`
  if (k === 'range') return `mission:range:${d.lieu || ''}:${d.heure_debut || ''}-${d.heure_fin || ''}`
  return `mission:full-day:${d.lieu || ''}`
  }
  if (t === 'disponible') {
    if (k === 'slot') return `disponible:slot:${(d.slots || []).slice().sort().join(',')}`
    if (k === 'range') return `disponible:range:${d.heure_debut || ''}-${d.heure_fin || ''}`
    return 'disponible:full-day'
  }
  return 'other'
}

function hasDuplicateInModal(sig: string): boolean {
  // Vérifie dans la liste existante de la modale + le brouillon courant
  const list = selectedCellDispos.value
  return list.some(x => dispoSignature(x) === sig)
}

// Conflits d'exclusivité pour une journée donnée:
// - Indisponible (full-day) ne peut coexister avec aucune Disponibilité (peu importe le format)
// - Disponible full-day ne peut coexister avec Disponible en créneaux ou plage horaire
function listHasIndispo(list: Partial<Disponibilite>[]) {
  return list.some(d => resolveDispoKind(d as Disponibilite).type === 'indisponible')
}
function listHasDispoAny(list: Partial<Disponibilite>[]) {
  return list.some(d => resolveDispoKind(d as Disponibilite).type === 'disponible')
}
function listHasDispoFullDay(list: Partial<Disponibilite>[]) {
  return list.some(d => {
    const k = resolveDispoKind(d as Disponibilite)
    return k.type === 'disponible' && k.timeKind === 'full-day'
  })
}
function listHasDispoPartial(list: Partial<Disponibilite>[]) {
  return list.some(d => {
    const k = resolveDispoKind(d as Disponibilite)
    return k.type === 'disponible' && (k.timeKind === 'slot' || k.timeKind === 'range')
  })
}
function wouldConflict(list: Partial<Disponibilite>[]): boolean {
  const hasIndispo = listHasIndispo(list)
  const hasDispo = listHasDispoAny(list)
  const hasDispoFD = listHasDispoFullDay(list)
  const hasDispoPartial = listHasDispoPartial(list)
  // Règles de base
  if (hasIndispo && hasDispo) return true
  if (hasDispoFD && hasDispoPartial) return true
  // Règles mission vs (dispo full-day | indispo full-day)
  const hasMission = list.some(d => resolveDispoKind(d as Disponibilite).type === 'mission')
  if (hasMission) {
    // Aucun full-day dispo ni full-day indispo quand il y a une mission
    const hasIndispoFD = list.some(d => {
      const k = resolveDispoKind(d as Disponibilite)
      return k.type === 'indisponible' && k.timeKind === 'full-day'
    })
    if (hasIndispoFD) return true
    if (hasDispoFD) return true
  }
  return false
}
function wouldConflictWithCandidate(existing: Partial<Disponibilite>[], candidate: Partial<Disponibilite>): boolean {
  const list = [...existing.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })]
  return wouldConflict(list)
}

function getConflictMessage(list: Partial<Disponibilite>[]): string | null {
  const hasIndispo = listHasIndispo(list)
  const hasDispo = listHasDispoAny(list)
  const hasDispoFD = listHasDispoFullDay(list)
  const hasDispoPartial = listHasDispoPartial(list)
  if (hasIndispo && hasDispo) return 'Conflit: “Indisponible (journée)” ne peut pas coexister avec “Disponible” le même jour.'
  if (hasDispoFD && hasDispoPartial) return 'Conflit: “Disponible (journée)” ne peut pas coexister avec des créneaux ou une plage horaire le même jour.'
  const hasMission = list.some(d => resolveDispoKind(d as Disponibilite).type === 'mission')
  if (hasMission) {
    if (list.some(d => { const k = resolveDispoKind(d as Disponibilite); return k.type === 'indisponible' && k.timeKind === 'full-day' })) {
      return 'Conflit: “Indisponible (journée)” ne peut pas coexister avec une mission le même jour.'
    }
    if (list.some(d => { const k = resolveDispoKind(d as Disponibilite); return k.type === 'disponible' && k.timeKind === 'full-day' })) {
      return 'Conflit: “Disponible (journée)” ne peut pas coexister avec une mission le même jour.'
    }
  }
  return null
}
function getConflictMessageWithCandidate(existing: Partial<Disponibilite>[], candidate: Partial<Disponibilite>): string | null {
  return getConflictMessage([...existing.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })])
}

function addNewDispo() {
  if (!selectedCell.value) return
  if (!canAddDispo.value) {
  const msg = getConflictMessageWithCandidate(selectedCellDispos.value, newDispo.value) || (violatesMissionDispoOverlap(selectedCellDispos.value, newDispo.value) ? 'Conflit: cette disponibilité chevauche une mission existante.' : null)
    if (msg) notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
    return
  }
  
  const collab = getSelectedCollaborateur()
  if (!collab) return
  
  const d = newDispo.value
  const dispo: Partial<Disponibilite> = {
    nom: collab.nom,
    prenom: collab.prenom,
    metier: collab.metier,
    phone: collab.phone || '',
    email: collab.email || '',
    ville: collab.ville || '',
    date: selectedCell.value.date,
    tenantId: 'keydispo',
    collaborateurId: selectedCell.value.collaborateurId,
    // champs communs
    type: d.type,
    timeKind: d.timeKind,
    slots: d.timeKind === 'slot' ? (d.slots || []) : [],
    isFullDay: d.timeKind === 'full-day',
  // mission seulement
  lieu: d.type === 'mission' ? d.lieu : '',
    heure_debut: d.timeKind === 'range' ? d.heure_debut : '',
    heure_fin: d.timeKind === 'range' ? d.heure_fin : '',
  }
  
  selectedCellDispos.value.push(dispo as Disponibilite)
  // Enregistrer le lieu normalisé dans les options
  if (dispo.lieu) {
    const canon = canonicalizeLieu(dispo.lieu)
    if (canon) {
      lieuOptions.value = Array.from(new Set([...lieuOptions.value, canon]))
    }
  }
  newDispo.value = {
    nom: '', prenom: '', metier: '', phone: '', email: '', ville: '', tenantId: 'keydispo',
    date: selectedCell.value.date,
    collaborateurId: selectedCell.value.collaborateurId,
    lieu: '', heure_debut: '', heure_fin: '',
    type: 'mission', timeKind: 'range', slots: [], isFullDay: false,
  }
}

function addInlineRow() {
  if (!selectedCell.value) return
  const base = sanitizeDisposition({ ...newDispo.value }) as Disponibilite
  // Valeurs par défaut utiles
  if (!base.type) base.type = 'mission'
  if (!base.timeKind) base.timeKind = 'range'
  base.lieu = base.type === 'mission' ? (base.lieu || '') : ''
  base.heure_debut = base.timeKind === 'range' ? (base.heure_debut || '') : ''
  base.heure_fin = base.timeKind === 'range' ? (base.heure_fin || '') : ''
  base.slots = base.timeKind === 'slot' ? (base.slots || []) : []

  const collab = getSelectedCollaborateur()
  selectedCellDispos.value.push({
    ...base,
    id: undefined,
    date: selectedCell.value.date,
    tenantId: 'keydispo',
    collaborateurId: selectedCell.value.collaborateurId,
    nom: collab?.nom || '', prenom: collab?.prenom || '', metier: collab?.metier || '', phone: collab?.phone || '', email: collab?.email || '', ville: collab?.ville || '',
  })
}

function removeDispo(index: number) {
  selectedCellDispos.value.splice(index, 1)
}

function editDispo(dispo: Disponibilite | (Disponibilite & { _cont?: 'start'|'end' }), cellDate?: string) {
  const originalDate = dispo.date
  const k = resolveDispoKind(dispo as Disponibilite)
  // Si c’est une continuation venant de la veille (cellDate != originalDate), ouvrir la modale sur la date d’origine
  const targetDate = (cellDate && cellDate !== originalDate && k.timeKind === 'range') ? originalDate : (cellDate || originalDate)
  openDispoModal((dispo as any).collaborateurId || `${dispo.nom}-${dispo.prenom}`, targetDate)
}

function setExistingType(index: number, t: Disponibilite['type']) {
  const list = selectedCellDispos.value
  if (!list[index]) return
  const candidate = sanitizeDisposition({ ...list[index], type: t }) as Disponibilite
  const temp = list.slice()
  temp[index] = candidate
  if (wouldConflict(temp)) {
    const msg = getConflictMessage(temp) || 'Conflit: combinaison invalide pour cette journée.'
    notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
    return
  }
  list[index] = candidate
}

function setExistingTimeKind(index: number, k: Disponibilite['timeKind']) {
  const list = selectedCellDispos.value
  if (!list[index]) return
  const candidate = sanitizeDisposition({ ...list[index], timeKind: k }) as Disponibilite
  const temp = list.slice()
  temp[index] = candidate
  if (wouldConflict(temp)) {
    const msg = getConflictMessage(temp) || 'Conflit: combinaison invalide pour cette journée.'
    notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
    return
  }
  list[index] = candidate
}

function limitExistingSlots(index: number, val: string[]) {
  const list = selectedCellDispos.value
  if (!list[index]) return
  const uniq = Array.from(new Set(val || []))
  const allowed = ['morning','midday','afternoon','evening','night']
  const filtered = uniq.filter(s => allowed.includes(s))
  // si tout le diurne est couvert, passer en full-day
  const item = list[index]
  const isMission = resolveDispoKind(item as Disponibilite).type === 'mission'
  const coverAll = ['morning','midday','afternoon','evening'].every(s => filtered.includes(s))
  if (coverAll && !isMission) {
  const candidate = sanitizeDisposition({ ...list[index], timeKind: 'full-day', slots: [] }) as Disponibilite
  const temp = list.slice()
  temp[index] = candidate
  if (wouldConflict(temp)) {
    const msg = getConflictMessage(temp) || 'Conflit: combinaison invalide pour cette journée.'
    notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
    return
  }
  list[index] = candidate
  } else {
  const candidate = sanitizeDisposition({ ...list[index], timeKind: 'slot', slots: filtered }) as Disponibilite
  const temp = list.slice()
  temp[index] = candidate
  if (wouldConflict(temp)) {
    const msg = getConflictMessage(temp) || 'Conflit: combinaison invalide pour cette journée.'
    notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
    return
  }
  list[index] = candidate
  }
}

async function saveDispos() {
  saving.value = true
  try {
    if (!selectedCell.value) return

    // Si aucune dispo n’a été ajoutée manuellement mais que le brouillon est valide, l’ajouter automatiquement
    if (selectedCellDispos.value.length === 0 && canAddDispo.value) {
      addNewDispo()
    }

    // Validation finale: refuser les combinaisons interdites
    if (wouldConflict(selectedCellDispos.value)) {
      const msg = getConflictMessage(selectedCellDispos.value) || 'Conflit: combinaison invalide pour cette journée.'
      notify({ message: msg, color: 'warning', position: 'top-right', duration: 3500 })
      // ne rien sauvegarder; rester dans la modale
      saving.value = false
      return
    }

    const tenantId = AuthService.currentTenantId || 'keydispo'
    const date = selectedCell.value.date
    const collabId = selectedCell.value.collaborateurId

    // Récupérer l'état avant édition
    const before = (disponibilitesCache.value.get(date) || []).filter(d => d.collaborateurId === collabId)
    const after = selectedCellDispos.value

    // Index par id
    const beforeMap = new Map<string, any>()
    for (const d of before) if (d.id) beforeMap.set(d.id, d)

    const toCreate: any[] = []
    const toUpdate: any[] = []
    const beforeIds = new Set<string>(Array.from(beforeMap.keys()))

    for (const d of after) {
      if (d.id && beforeMap.has(d.id)) {
        // Vérifier changements significatifs
        const prev = beforeMap.get(d.id)
        const changed = ['lieu','heure_debut','heure_fin','type','timeKind'].some(k => (d as any)[k] !== (prev as any)[k])
        if (changed) toUpdate.push(d)
        beforeIds.delete(d.id)
      } else if (!d.id) {
        toCreate.push(d)
      }
    }

    // Les IDs restants dans beforeIds sont à supprimer
    const toDeleteIds = Array.from(beforeIds)

    const batch = writeBatch(db)
    const disposCol = collection(db, 'dispos')

    // Créations
    for (const d of toCreate) {
      const newRef = doc(disposCol)
      d.id = newRef.id
  const canonLieu = d.lieu ? canonicalizeLieu(d.lieu) : ''
  batch.set(newRef, {
        // clés principales
        id: newRef.id,
        tenantId,
        collaborateurId: collabId,
        date,
        // identité
        nom: d.nom || '', prenom: d.prenom || '', metier: d.metier || '', phone: d.phone || '', email: d.email || '', ville: d.ville || '',
        // modèle dispo
  lieu: canonLieu || '',
        heure_debut: d.heure_debut || '',
        heure_fin: d.heure_fin || '',
        type: d.type || null,
        timeKind: d.timeKind || null,
        slots: Array.isArray(d.slots) ? d.slots : [],
        isFullDay: d.timeKind === 'full-day',
        // audit minimal
        version: 1,
        updatedAt: serverTimestamp(),
        updatedBy: 'ui',
      })
      if (canonLieu) {
        lieuOptions.value = Array.from(new Set([...lieuOptions.value, canonLieu]))
      }
    }

    // Mises à jour
    for (const d of toUpdate) {
      const ref = doc(db, 'dispos', d.id!)
      const canonLieu = d.lieu ? canonicalizeLieu(d.lieu) : ''
      batch.set(ref, {
        lieu: canonLieu || '',
        heure_debut: d.timeKind === 'range' ? (d.heure_debut || '') : '',
        heure_fin: d.timeKind === 'range' ? (d.heure_fin || '') : '',
        type: d.type || null,
        timeKind: d.timeKind || null,
        slots: Array.isArray(d.slots) ? d.slots : [],
        isFullDay: d.timeKind === 'full-day',
        updatedAt: serverTimestamp(),
        updatedBy: 'ui',
      }, { merge: true })
      if (canonLieu) {
        lieuOptions.value = Array.from(new Set([...lieuOptions.value, canonLieu]))
      }
    }

    // Suppressions
    for (const id of toDeleteIds) {
      const ref = doc(db, 'dispos', id)
      batch.delete(ref)
    }

    await batch.commit()

    // Mettre à jour le cache local pour la date concernée
    const dayAll = (disponibilitesCache.value.get(date) || []).filter(d => d.collaborateurId !== collabId)
    disponibilitesCache.value.set(date, [...dayAll, ...after])

    showDispoModal.value = false
    selectedCell.value = null
    selectedCellDispos.value = []
  } catch (error) {
    console.error('Erreur sauvegarde:', error)
  } finally {
    saving.value = false
  }
}

function cancelModal() {
  showDispoModal.value = false
  selectedCell.value = null
  selectedCellDispos.value = []
}

// (supprimé) Anciennes actions de formulaire séparé

// Navigation
async function updateFilters(v: any) {
  searchTerm.value = v.search || ''
  filterMetier.value = v.metier || ''
  filterLieu.value = v.lieu || ''
  filterStatut.value = v.statut || ''
  dateFrom.value = v.dateFrom || ''
  dateTo.value = v.dateTo || ''
  // Autoscroll si une date précise est choisie (priorité à dateFrom)
  if (v.dateFrom && !v.dateTo) {
  await ensureDatePresent(v.dateFrom)
  scrollToDate(v.dateFrom)
  } else if (v.dateFrom && v.dateTo) {
    // centrer sur le début de plage
  await ensureRangePresent(v.dateFrom, v.dateTo)
  scrollToDate(v.dateFrom)
  }
}

function scrollToDate(dateStr: string, behavior: ScrollBehavior = 'auto') {
  const scroller = planningScroll.value
  if (!scroller || !dateStr) return
  const list = visibleDays.value
  const idx = list.findIndex(d => d.date === dateStr)
  if (idx < 0) {
    // Si la date n'est toujours pas présente (hors borne min), ne rien faire
    return
  }
  const centerOffset = Math.max(0, idx * dayWidth - (scroller.clientWidth - stickyLeftWidth) / 2)
  if (behavior === 'smooth' && 'scrollTo' in scroller) {
    scroller.scrollTo({ left: centerOffset, behavior })
  } else {
    scroller.scrollLeft = centerOffset
  }
  updateTodayOverlayX()
}

function goToPreviousWeek() {
  console.log('Semaine précédente')
}

function goToToday() {
  const scroller = planningScroll.value
  if (!scroller) return
  const todayIndex = loadedDays.value.findIndex(d => d.isToday)
  if (todayIndex < 0) return
  const centerOffset = Math.max(0, todayIndex * dayWidth - (scroller.clientWidth - stickyLeftWidth) / 2)
  scroller.scrollTo({ left: centerOffset, behavior: 'smooth' })
  updateTodayOverlayX()
}

function goToNextWeek() {
  console.log('Semaine suivante')
}

// Chargement des données
async function loadCollaborateursFromFirebase() {
  try {
    console.log('📥 Chargement des collaborateurs...')
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const collaborateurs = await CollaborateursServiceV2.loadCollaborateursFromImport(tenantId)
    
    allCollaborateurs.value = collaborateurs.map((collab: any) => ({
      id: collab.id,
      nom: collab.nom,
      prenom: collab.prenom,
      metier: collab.metier,
      ville: collab.ville || '',
      email: collab.email || '',
      phone: collab.phone || ''
    }))
    
    loadingCollaborateurs.value = false
    console.log(`✅ ${collaborateurs.length} collaborateurs chargés`)

  } catch (error) {
    console.error('❌ Erreur chargement collaborateurs:', error)
    loadingCollaborateurs.value = false
  }
}

async function loadDisponibilitesFromFirebase(dateDebut: string, dateFin: string) {
  if (loadingDisponibilites.value) return []
  
  try {
    loadingDisponibilites.value = true
    console.log('📅 Chargement des disponibilités...', { dateDebut, dateFin })
    
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const disposRef = collection(db, 'dispos')
    const q = query(
      disposRef,
      where('tenantId', '==', tenantId),
      where('date', '>=', dateDebut),
      where('date', '<=', dateFin),
      orderBy('date')
    )
    
    const snapshot = await getDocs(q)
    const disponibilites: any[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      const canonLieu = canonicalizeLieu(data.lieu || '')
      disponibilites.push({
        id: doc.id,
        collaborateurId: data.collaborateurId,
        date: data.date,
        lieu: canonLieu,
        heure_debut: data.heure_debut || '',
        heure_fin: data.heure_fin || '',
  type: data.type || undefined,
  timeKind: data.timeKind || undefined,
  slots: Array.isArray(data.slots) ? data.slots : undefined,
  isFullDay: data.isFullDay ?? undefined,
        nom: data.nom || '',
        prenom: data.prenom || '',
        metier: data.metier || '',
        phone: data.phone || '',
        email: data.email || '',
        ville: data.ville || '',
        tenantId: data.tenantId
      })
    })
    
    console.log(`✅ ${disponibilites.length} disponibilités chargées`)
    return disponibilites
    
  } catch (error) {
    console.error('❌ Erreur chargement disponibilités:', error)
    return []
  } finally {
    loadingDisponibilites.value = false
  }
}

// Utilitaires dates ISO (YYYY-MM-DD)
function nextDayStr(dateStr: string) { return addDaysStr(dateStr, 1) }
function prevDayStr(dateStr: string) { return addDaysStr(dateStr, -1) }

function computeMissingSubranges(requestStart: string, requestEnd: string, ranges: Array<{start: string; end: string}>) {
  if (requestEnd < requestStart) return []
  // Fusionne et intersecte les ranges existants avec la fenêtre demandée
  const merged = [...ranges]
    .map(r => ({ start: r.start, end: r.end }))
    .filter(r => !(r.end < requestStart || r.start > requestEnd))
    .map(r => ({ start: r.start < requestStart ? requestStart : r.start, end: r.end > requestEnd ? requestEnd : r.end }))
    .sort((a,b) => a.start.localeCompare(b.start))
    .reduce((acc: Array<{start: string; end: string}>, r) => {
      if (!acc.length) return [ { ...r } ]
      const last = acc[acc.length - 1]
      if (r.start <= nextDayStr(last.end)) {
        if (r.end > last.end) last.end = r.end
        return acc
      }
      acc.push({ ...r })
      return acc
    }, [])

  const missing: Array<{start: string; end: string}> = []
  let cursor = requestStart
  for (const r of merged) {
    if (cursor < r.start) missing.push({ start: cursor, end: prevDayStr(r.start) })
    cursor = nextDayStr(r.end)
  }
  if (cursor <= requestEnd) missing.push({ start: cursor, end: requestEnd })
  return missing.filter(r => r.start <= r.end)
}

async function generateDisponibilitesForDateRange(dateDebutOpt?: string, dateFinOpt?: string) {
  const today = toDateStr(new Date())
  let dateDebut = dateDebutOpt || loadedDays.value[0]?.date || today
  let dateFin = dateFinOpt || loadedDays.value[loadedDays.value.length - 1]?.date || today
  if (dateFin < dateDebut) {
    // swap
    const tmp = dateDebut
    dateDebut = dateFin
    dateFin = tmp
  }
  if (!dateDebut || !dateFin) return
  
  // Calculer les sous-plages réellement manquantes (déjà en cache/chargées => pas de fetch)
  const missing = computeMissingSubranges(dateDebut, dateFin, loadedDateRanges.value)
  if (missing.length === 0) {
    // Rien à charger depuis Firestore
    console.log(`📅 Fenêtre ${dateDebut} → ${dateFin} déjà en cache, pas de fetch`)
  } else {
    console.log(`📅 Chargement dispos (sous-plages manquantes):`, missing)
    fetchingRanges.value = true
    try {
      for (const sub of missing) {
        const disponibilites = await loadDisponibilitesFromFirebase(sub.start, sub.end)
        // Organiser par date et fusionner
        const byDate = new Map<string, any[]>()
        disponibilites.forEach(dispo => {
          const date = dispo.date
          if (!byDate.has(date)) byDate.set(date, [])
          byDate.get(date)!.push(dispo)
        })
        for (const [date, dispos] of byDate) {
          const existing = disponibilitesCache.value.get(date) || []
          // Varier la stratégie: ici on remplace la journée entière par les dernières données
          disponibilitesCache.value.set(date, dispos.length ? dispos : existing)
        }
        // Marquer comme chargée cette sous-plage
        addLoadedRange(sub.start, sub.end)
      }
    } finally {
      fetchingRanges.value = false
    }
  }
  
  // Mettre à jour les options de lieux
  updateLieuxOptions()
}

function generateInitialDays() {
  const days: any[] = []
  const today = new Date()
  const todayStr = toDateStr(today)
  const startStr = minPastDate.value
  const endStr = addDaysStr(todayStr, 14)
  // Génère de startStr -> endStr inclus
  let cursor = new Date(startStr)
  const end = new Date(endStr)
  while (cursor <= end) {
    const dateStr = toDateStr(cursor)
    days.push({
      date: dateStr,
      name: cursor.toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 3),
      dayNumber: cursor.getDate(),
      isToday: dateStr === todayStr,
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  loadedDays.value = days
}

// Extension dynamique lors du scroll
const extending = ref(false)
let scrollDebounceTimer: number | null = null

async function ensureRightBuffer(scroller: HTMLElement) {
  const { scrollLeft, clientWidth, scrollWidth } = scroller
  const bufferPx = clientWidth * 3
  const missingPx = Math.max(0, (scrollLeft + clientWidth + bufferPx) - scrollWidth)
  if (missingPx <= 0) return
  const colsNeeded = Math.ceil(missingPx / dayWidth)
  const toAdd = Math.max(14, colsNeeded)
  const lastDate = loadedDays.value[loadedDays.value.length - 1]?.date
  await appendDays(toAdd)
  const newLastDate = loadedDays.value[loadedDays.value.length - 1]?.date
  if (lastDate && newLastDate) {
    generateDisponibilitesForDateRange(lastDate, newLastDate)
  }
}

async function onScrollExtend(e: Event) {
  const scroller = e.currentTarget as HTMLElement
  if (!scroller) return

  // Garder le hover actif pendant le scroll (trackpad/souris)
  updateHoverOnScroll(scroller)
  // Recalcule la fenêtre virtualisée
  recomputeWindow(scroller)

  // Si une plage de dates est active, ne pas étendre dynamiquement
  if (dateFrom.value && dateTo.value) {
    return
  }

  // Debounce pour éviter les appels répétés pendant le scroll
  if (scrollDebounceTimer) {
    clearTimeout(scrollDebounceTimer)
  }

  scrollDebounceTimer = setTimeout(() => {
    const { scrollLeft, clientWidth } = scroller
  const totalCols = loadedDays.value.length
    const firstVisibleIdx = Math.floor(scrollLeft / dayWidth)
    const lastVisibleIdx = Math.min(totalCols - 1, Math.floor((scrollLeft + clientWidth) / dayWidth))

  // Réserves en jours pour un scroll fluide (augmentées): cible 150 (~5 mois), mini 90 (~3 mois)
  const targetLeftReserve = 150
  const minLeftReserve = 90
  const targetRightReserve = 150
  const minRightReserve = 90

    // GAUCHE: si la réserve visuelle est basse, pré-précharger en un bloc
    const leftReserve = firstVisibleIdx
    if (leftReserve < minLeftReserve && !extending.value) {
      extending.value = true
      const beforeWidth = loadedDays.value.length * dayWidth
      const firstDate = loadedDays.value[0]?.date
      if (firstDate) {
        // Ne pas dépasser la borne minimale
        const maxCanPrepend = Math.max(0, diffDays(minPastDate.value, firstDate))
        const needed = Math.min(targetLeftReserve - leftReserve, maxCanPrepend)
        if (needed > 0) {
          // Préprend sans bloquer; charger les données pour l’intervalle ajouté
          const newFirst = addDaysStr(firstDate, -needed)
          const dayBeforeFirst = addDaysStr(firstDate, -1)
          prependDays(needed)
          generateDisponibilitesForDateRange(newFirst, dayBeforeFirst)
          // Conserver la colonne apparente
          const afterWidth = loadedDays.value.length * dayWidth
          scroller.scrollLeft += afterWidth - beforeWidth
        }
      }
      extending.value = false
    }

    // DROITE: si la réserve est basse, ajouter un gros bloc
    const rightReserve = (totalCols - 1) - lastVisibleIdx
    if (rightReserve < minRightReserve) {
      const lastDate = loadedDays.value[loadedDays.value.length - 1]?.date
      const toAdd = targetRightReserve - rightReserve
      if (toAdd > 0) {
        appendDays(toAdd)
        if (lastDate) {
          const start = addDaysStr(lastDate, 1)
          const end = addDaysStr(lastDate, toAdd)
          generateDisponibilitesForDateRange(start, end)
        }
      }
    }

    // Décharger visuellement (cache conservé)
    prunePastIfFar(scroller)
    pruneFutureIfFar(scroller)
  }, 100)
}

function formatDate(d: Date) {
  // même format local que toDateStr
  return toDateStr(d)
}

// Repositionne les overlays de hover en se basant sur la dernière position pointeur, utile pendant un scroll sans mousemove
function updateHoverOnScroll(scroller: HTMLElement) {
  if (!_lastPointerX && !_lastPointerY) return
  const rect = scroller.getBoundingClientRect()
  const xContent = _lastPointerX - rect.left + scroller.scrollLeft
  const gridLeft = (gridLeftBodyPx.value || (stickyLeftWidth + 1))
  const pitch = dayPitchBodyPx.value || (dayWidth + 1)
  const colIdx = Math.floor((xContent - gridLeft) / pitch)
  const colX = colIdx * pitch
  if (colIdx < 0 || colIdx >= visibleDays.value.length) {
    colHoverEl.value && (colHoverEl.value.style.transform = 'translate3d(-9999px,0,0)')
    colHoverHeaderEl.value && (colHoverHeaderEl.value.style.transform = 'translate3d(-9999px,0,0)')
  } else {
    const tx = `translate3d(${colX}px,0,0)`
    colHoverEl.value && (colHoverEl.value.style.transform = tx)
    colHoverHeaderEl.value && (colHoverHeaderEl.value.style.transform = tx)
  }
  // Ligne (Y) — recalcule depuis rowsRef/top et scrollTop
  const rowsEl = rowsRef.value
  const rowsOffset = rowsEl ? rowsEl.offsetTop : 0
  const yContent = _lastPointerY - rect.top + scroller.scrollTop - rowsOffset
  if (yContent < 0) {
    rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
    return
  }
  const nRows = paginatedCollaborateurs.value.length
  let rowIdx = Math.floor(yContent / rowPitchPx.value)
  if (rowIdx < 0 || rowIdx >= nRows) {
    rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
    return
  }
  rowIdx = Math.max(0, Math.min(nRows - 1, rowIdx))
  const topPx = Math.round(rowIdx * rowPitchPx.value)
  rowHoverEl.value && (rowHoverEl.value.style.transform = `translate3d(0,${topPx}px,0)`)
}

// S'assurer qu'une date est présente dans loadedDays; étend à gauche/droite si besoin et charge les dispo
async function ensureDatePresent(dateStr: string) {
  if (!loadedDays.value.length) return
  const first = loadedDays.value[0].date
  const last = loadedDays.value[loadedDays.value.length - 1].date
  if (dateStr < first) {
    const delta = Math.min(Math.max(1, diffDays(dateStr, first)), 365)
    // Respecter la borne minimale
    const maxCanPrepend = Math.max(0, diffDays(minPastDate.value, first))
    const needed = Math.min(delta, maxCanPrepend)
    if (needed > 0) {
      const newFirst = addDaysStr(first, -needed)
      const dayBeforeFirst = addDaysStr(first, -1)
      prependDays(needed)
      await generateDisponibilitesForDateRange(newFirst, dayBeforeFirst)
    }
  } else if (dateStr > last) {
    const delta = Math.min(Math.max(1, diffDays(last, dateStr)), 365)
    const start = addDaysStr(last, 1)
    const end = addDaysStr(last, delta)
    await appendDays(delta)
    await generateDisponibilitesForDateRange(start, end)
  }
}

// S'assurer qu'une plage [start,end] est présente (et chargée) avant scroll
async function ensureRangePresent(start: string, end: string) {
  const a = start <= end ? start : end
  const b = start <= end ? end : start
  await ensureDatePresent(a)
  await ensureDatePresent(b)
}

async function appendDays(count: number) {
  const lastDateStr = loadedDays.value[loadedDays.value.length - 1].date
  const last = new Date(lastDateStr)
  const todayStr = toDateStr(new Date())
  
  
  for (let i = 1; i <= count; i++) {
    const date = new Date(last)
    date.setDate(last.getDate() + i) // +i = jours FUTURS
    const dateStr = formatDate(date)
    loadedDays.value.push({
      date: dateStr,
      name: date.toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 3),
      dayNumber: date.getDate(),
      isToday: dateStr === todayStr,
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    })
  }
  // Recalibrer la hauteur de header (si contenu wrap) et buffer
  if (planningScroll.value) {
    measureAndSetHeaderHeight()
  updateTodayOverlayX()
  }
}

async function prependDays(count: number) {
  const firstDateStr = loadedDays.value[0].date
  const first = new Date(firstDateStr)
  const toPrepend: any[] = []
  const todayStr = formatDate(new Date())
  
  
  for (let i = count; i >= 1; i--) {
    const date = new Date(first)
    date.setDate(first.getDate() - i) // -i = jours PASSÉS
    const dateStr = formatDate(date)
    toPrepend.push({
      date: dateStr,
      name: date.toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 3),
      dayNumber: date.getDate(),
      isToday: dateStr === todayStr,
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    })
  }
  loadedDays.value = [...toPrepend, ...loadedDays.value]
  
  // rien
  updateTodayOverlayX()
}

// Décharge les jours (et données) trop à gauche pour garder l'UI fluide
function prunePastIfFar(scroller: HTMLElement) {
  const leftBufferDays = 150 // garder ~5 mois de tampon à gauche
  const firstVisibleIdx = Math.floor(scroller.scrollLeft / dayWidth)
  if (firstVisibleIdx <= leftBufferDays) return
  const removeCount = firstVisibleIdx - leftBufferDays
  if (removeCount <= 0) return

  // Supprimer les premiers jours et ajuster le scroll pour éviter le saut
  loadedDays.value.splice(0, removeCount)
  scroller.scrollLeft -= removeCount * dayWidth
  // Ne pas toucher aux plages chargées: on conserve l'information pour éviter de re-fetch
}

// Symétrique: décharger visuellement les jours lointains à droite sans vider le cache
function pruneFutureIfFar(scroller: HTMLElement) {
  const rightBufferDays = 150 // garder ~5 mois de tampon à droite
  const totalCols = loadedDays.value.length
  const lastVisibleIdx = Math.min(totalCols - 1, Math.floor((scroller.scrollLeft + scroller.clientWidth) / dayWidth))
  const targetMaxIdx = lastVisibleIdx + rightBufferDays
  if (totalCols - 1 <= targetMaxIdx) return
  const removeFrom = targetMaxIdx + 1
  const removeCount = totalCols - removeFrom
  if (removeCount <= 0) return
  // Supprimer les jours trop loin dans le futur, on garde le cache pour accès instantané si on revient
  loadedDays.value.splice(removeFrom, removeCount)
  // Ne pas toucher aux plages chargées: on conserve l'information pour éviter de re-fetch
}

// Initialisation
function measureAndSetHeaderHeight() {
  const scroller = planningScroll.value
  if (!scroller) return
  const header = scroller.querySelector('.sticky-header-row') as HTMLElement | null
  const headerH = header ? header.getBoundingClientRect().height : 0
  scroller.style.setProperty('--header-h', `${headerH}px`)
  // Mesure fine: hauteur de la rangée des mois (pour arrêter les traits de semaine au-dessus)
  const monthsRow = scroller.querySelector('.excel-months-row') as HTMLElement | null
  const monthsH = monthsRow ? monthsRow.getBoundingClientRect().height : 0
  scroller.style.setProperty('--months-h', `${monthsH}px`)
}

const onResize = () => measureAndSetHeaderHeight()

// MAJ de la position locale du jour courant pour les overlays
function updateTodayOverlayX() {
  const scroller = planningScroll.value
  if (!scroller) return
  const todayIdx = visibleDays.value.findIndex(d => d.isToday)
  if (todayIdx < 0) {
    scroller.style.setProperty('--today-x-local', `-9999px`)
    return
  }
  const pitch = dayPitchBodyPx.value || (dayWidth + 1)
  const x = todayIdx * pitch
  scroller.style.setProperty('--today-x-local', `${x}px`)
}

  /* Force absolue du z-index pour overlay et dialog de la modale via JS onMounted */
  const modalOverride = () => {
    const modals = document.querySelectorAll('.va-modal, .va-modal__container, .va-modal__dialog')
    const overlays = document.querySelectorAll('.va-modal__overlay, .va-modal-overlay')
    modals.forEach(el => {
      (el as HTMLElement).style.setProperty('z-index', '2147483647', 'important')
    })
    overlays.forEach(el => {
      (el as HTMLElement).style.setProperty('z-index', '2147483646', 'important')
      ;(el as HTMLElement).style.setProperty('position', 'fixed', 'important')
      ;(el as HTMLElement).style.setProperty('top', '0', 'important')
      ;(el as HTMLElement).style.setProperty('left', '0', 'important')
      ;(el as HTMLElement).style.setProperty('width', '100vw', 'important')
      ;(el as HTMLElement).style.setProperty('height', '100vh', 'important')
    })
  }
  
  watch(() => showDispoModal.value, (isOpen) => {
    if (isOpen) {
      // Forcer les z-index après ouverture
      nextTick(() => {
        modalOverride()
        // Re-check après animation
        setTimeout(modalOverride, 100)
      })
    }
  })

onMounted(async () => {
  generateInitialDays()
  await loadCollaborateursFromFirebase()
  measureAndSetHeaderHeight()
  recomputeWindow(planningScroll.value || null)
  measureGridOrigins()
  measureRowPitch()
  // today overlay piloté par CSS vars
  // Charger immédiatement les dispos pour la fenêtre initiale complète
  if (loadedDays.value.length > 0) {
    const start = loadedDays.value[0].date
    const end = loadedDays.value[loadedDays.value.length - 1].date
    await generateDisponibilitesForDateRange(start, end)
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('resize', () => {
    // re-mesure à la fin de la frame pour laisser le layout se stabiliser
  requestAnimationFrame(() => { recomputeWindow(planningScroll.value || null); measureGridOrigins(); measureRowPitch(); })
  })
  // Pré-remplir la droite pour garder un gros buffer
  if (planningScroll.value) {
    await ensureRightBuffer(planningScroll.value)
  recomputeWindow(planningScroll.value)
  measureGridOrigins(); measureRowPitch()
  // today overlay piloté par CSS vars
    // Centrer la date du jour
    const todayIndex = loadedDays.value.findIndex(d => d.isToday)
    if (todayIndex >= 0) {
      const scroller = planningScroll.value
      const centerOffset = Math.max(0, todayIndex * dayWidth - (scroller.clientWidth - 300) / 2)
      scroller.scrollLeft = centerOffset
  // Positionner l'overlay du jour (offset local)
  // today overlay via CSS vars
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

// Réagir à toute mutation des jours chargés (append/prepend)
watch(loadedDays, () => {
  updateTodayOverlayX()
  // après ajout/suppression de jours, re-mesurer l’origine des colonnes
  requestAnimationFrame(() => { recomputeWindow(planningScroll.value || null); measureGridOrigins(); measureRowPitch(); })
})

// Panning (drag pour scroll diagonal)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panStartScrollLeft = 0
let panStartScrollTop = 0
let moveListener: ((e: MouseEvent) => void) | null = null
let upListener: ((e: MouseEvent) => void) | null = null

function onPanStart(e: MouseEvent) {
  if (e.button !== 0) return
  const scroller = planningScroll.value
  if (!scroller) return
  panStartX = e.clientX
  panStartY = e.clientY
  panStartScrollLeft = scroller.scrollLeft
  panStartScrollTop = scroller.scrollTop

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - panStartX
    const dy = ev.clientY - panStartY
    if (!isPanning.value && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isPanning.value = true
    }
    if (isPanning.value) {
  scroller.scrollLeft = panStartScrollLeft - dx
  scroller.scrollTop = panStartScrollTop - dy
  // maintenir le hover à jour pendant le pan
  updateHoverOnScroll(scroller)
      ev.preventDefault()
    }
  }

  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    if (isPanning.value) {
      const cancelClick = (ce: MouseEvent) => {
        ce.stopImmediatePropagation()
        ce.preventDefault()
      }
      scroller.addEventListener('click', cancelClick, { capture: true, once: true })
    }
    isPanning.value = false
  }

  moveListener = onMove
  upListener = onUp
  window.addEventListener('mousemove', onMove, { passive: false })
  window.addEventListener('mouseup', onUp)
}

onUnmounted(() => {
  if (moveListener) window.removeEventListener('mousemove', moveListener)
  if (upListener) window.removeEventListener('mouseup', upListener)
  if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer)
})

// Pan mobile à deux doigts (n'altère pas le scroll à un doigt)
let panTouchStart: { x: number; y: number; scrollLeft: number; scrollTop: number } | null = null

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 2) return
  const scroller = planningScroll.value
  if (!scroller) return
  // point moyen entre les deux doigts
  const x = (e.touches[0].clientX + e.touches[1].clientX) / 2
  const y = (e.touches[0].clientY + e.touches[1].clientY) / 2
  panTouchStart = { x, y, scrollLeft: scroller.scrollLeft, scrollTop: scroller.scrollTop }

  const onMove = (ev: TouchEvent) => {
    if (!panTouchStart) return
    if (ev.touches.length !== 2) return
    const x2 = (ev.touches[0].clientX + ev.touches[1].clientX) / 2
    const y2 = (ev.touches[0].clientY + ev.touches[1].clientY) / 2
    const dx = x2 - panTouchStart.x
    const dy = y2 - panTouchStart.y
  scroller.scrollLeft = panTouchStart.scrollLeft - dx
  scroller.scrollTop = panTouchStart.scrollTop - dy
  // maintenir le hover à jour pendant le pan tactile
  updateHoverOnScroll(scroller)
    ev.preventDefault()
  }

  const onEnd = () => {
    window.removeEventListener('touchmove', onMove as any)
    window.removeEventListener('touchend', onEnd as any)
    window.removeEventListener('touchcancel', onEnd as any)
    panTouchStart = null
  }

  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
  window.addEventListener('touchcancel', onEnd)
}
</script>

<style scoped>
/* Modal design improvements */
.dispo-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal-header-info {
  border-bottom: 1px solid var(--va-border-color);
  padding-bottom: 8px;
}
.section-title {
  margin: 0 0 8px;
  font-weight: 600;
}
.dispo-edit-item.card {
  display: flex;
  flex-wrap: nowrap;
  align-items: end;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--va-border-color);
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--va-background-secondary);
  overflow-x: visible;
}
.dispo-edit-item.card.card-mission { border-left: 4px solid #3182ce; background: #eef6ff; }
.dispo-edit-item.card.card-dispo { border-left: 4px solid #2f855a; background: #f0fff4; }
.dispo-edit-item.card.card-indispo { border-left: 4px solid #c53030; background: #fff5f5; }
.dispo-edit-item .compact-field { flex: 1 1 140px; min-width: 120px; }
.dispo-edit-item .span-2 { flex: 2 1 220px; min-width: 180px; }
.dispo-edit-item .span-3 { flex: 3 1 280px; min-width: 220px; }
.dispo-edit-item .row-delete { margin-left: auto; flex: 0 0 auto; align-self: center; }

/* Réduire la largeur minimale du champ Lieu pour tout faire tenir */
.dispo-edit-item :deep(.lieu-combobox) {
  min-width: 180px;
}

/* Compactage des champs Vuestic dans la ligne détaillée */
.dispo-edit-item :deep(.va-input__container),
.dispo-edit-item :deep(.va-select__container) {
  padding-left: 8px !important;
  padding-right: 8px !important;
}
.dispo-edit-item :deep(.va-input__content),
.dispo-edit-item :deep(.va-select__content) {
  gap: 4px !important;
}

.add-dispo-form .fm-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px 16px;
  align-items: center;
}
.add-dispo-form .fm-row { display: contents; }
.field-label { font-weight: 500; color: var(--va-secondary); }
.btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
.help-text { grid-column: 1 / -1; margin-top: -8px; color: var(--va-secondary); font-size: 12px; }
.add-line-btn { justify-self: end; }
.add-line-btn { grid-column: 1 / -1; width: 100%; }
.planning-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  font-family: var(--va-font-family);
  /* Séparateur de semaine, utilisé partout (jours header, semaines header, body) */
  --week-sep-color: rgba(0, 0, 0, 0.10);
  --week-sep-width: 3px;
}

.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.loading-content {
  text-align: center;
}

/* Indicateur d'extension non-bloquant */
.extending-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.env-badge {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: #111827;
  color: #a7f3d0;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid #10b981;
}

.suggestions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin: 6px 16px;
  background: rgba(255, 215, 0, 0.12);
  border: 1px solid rgba(255, 215, 0, 0.35);
  border-radius: 8px;
  color: #5c4a00;
}
.suggestions .suggestion-item + .suggestion-item::before {
  content: '• ';
  margin: 0 6px 0 2px;
  opacity: 0.6;
}

/* Layout Excel synchronisé - Optimisé pour fluidité */
.excel-planning-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  background: white;
}

/* Conteneur de scroll unique */
.excel-scroll {
  flex: 1;
  overflow: auto;
  position: relative;
  /* performance */
  will-change: scroll-position;
  -webkit-overflow-scrolling: touch;
  /* éviter de déléguer le scroll au parent quand on atteint un bord */
  overscroll-behavior: contain;
  width: 100%;
}

.excel-scroll {
  cursor: grab;
}

.excel-scroll.loading {
  cursor: progress;
}

.excel-scroll.loading * {
  pointer-events: none;
}

/* Containment et rendu paresseux des blocs pour optimiser layout/paint */
/* .excel-rows: pas de contain: paint pour éviter un stacking context qui cacherait les overlays */

.excel-row {
  content-visibility: auto;
  /* réserve la hauteur pour éviter les reflows quand l'élément devient visible */
  contain-intrinsic-size: var(--row-height);
  /* éviter paint pour ne pas créer de stacking context bloquant les overlays */
  contain: layout style;
}

.excel-months-row, .excel-days-row {
  contain: layout paint;
}

.days-window {
  display: inline-flex;
  will-change: transform;
}

.excel-scroll.panning {
  cursor: grabbing;
  user-select: none;
}

@media (hover: none) and (pointer: coarse) {
  .excel-scroll {
    cursor: default;
  }
}

/* Ligne d'en-tête sticky (top:0) */
.sticky-header-row {
  position: sticky;
  top: 0;
  z-index: 150; /* au-dessus du contenu, sans bloquer le scroll horizontal */
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
  max-width: none;
  background: white;
  border-bottom: 2px solid #e0e0e0;
  /* ombre légère pour détacher visuellement */
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

.excel-corner {
  width: var(--sticky-left, 260px);
  min-width: var(--sticky-left, 260px);
  flex: 0 0 var(--sticky-left, 260px); /* fixe, aligne avec collab-sticky */
  background: #f5f5f5;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 6px;
  position: sticky;
  left: 0;
  top: 0;
  z-index: 153; /* au-dessus des éléments du header */
}

/* Overlay de colonne survolée pour l'en-tête */
.column-hover-overlay-header {
  position: absolute;
  top: 0;
  left: var(--grid-left-header, calc(var(--sticky-left, 260px) + 1px));
  transform: translate3d(-9999px, 0, 0);
  width: var(--day-width, 100px);
  height: 100%;
  pointer-events: none;
  background: rgba(76, 175, 80, 0.12);
  mix-blend-mode: multiply;
  font-family: var(--va-font-family);
  z-index: 151; /* au-dessus du contenu jour, sous today-overlay-header (152) */
  will-change: transform;
}

/* Overlay "aujourd'hui" pour l'en-tête */
.today-overlay-header {
  position: absolute;
  top: 0;
  left: calc(var(--grid-left-header, calc(var(--sticky-left, 260px) + 1px)) + var(--today-x-local, -9999px));
  width: var(--day-width, 100px);
  height: 100%;
  pointer-events: none;
  background: rgba(33, 150, 243, 0.18);
  z-index: 152; /* au-dessus du hover header */
  will-change: left;
}

/* Overlay des séparateurs de semaine pour l'ensemble du header */
.week-separators-header {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--months-h, 0px); /* commence sous la rangée des mois */
  bottom: 0; /* couvre semaines + jours */
  pointer-events: none;
  z-index: 150; /* sous les overlays 151/152, au-dessus des fonds */
}
.week-separators-header .week-sep {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--week-sep-width, 3px);
  background: linear-gradient(to bottom, var(--week-sep-color, rgba(0,0,0,0.10)), var(--week-sep-color, rgba(0,0,0,0.10)));
}

.corner-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.corner-count {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

/* Header des jours (dans la ligne sticky) */
.days-header {
  overflow: visible; /* laisse le contenu suivre le scroll du conteneur */
  background: #fff;
  width: max-content; /* grandit avec le contenu */
  max-width: none;
  flex: 0 0 auto;
}


.excel-months-row,
.excel-days-row {
  display: flex;
  flex-shrink: 0;
  /* Force le scroll horizontal */
  width: max-content;
  /* Éviter les transforms qui cassent sticky */
  max-width: none;
}

/* Rangée des semaines (Sxx) */
.excel-weeks-row {
  display: flex;
  flex-shrink: 0;
  width: max-content;
  max-width: none;
}

.excel-week-cell {
  background: #f9fafb;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #eef2f7;
  padding: 4px 6px;
  text-align: center;
  font-size: 11px;
  color: #4b5563;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.excel-month-cell {
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  padding: 6px;
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  position: relative; /* pour ancrer le séparateur de fin de mois */
}

/* Séparateur fin de mois dans la rangée des mois */
.excel-month-cell::after {
  content: '';
  position: absolute;
  right: -1px; /* chevauche pour éviter double épaisseur */
  top: 0;
  bottom: 0;
  width: var(--week-sep-width, 3px);
  background: linear-gradient(to bottom, var(--week-sep-color, rgba(0,0,0,0.10)), var(--week-sep-color, rgba(0,0,0,0.10)));
  pointer-events: none;
}

.excel-day-cell {
  background: #ffffff;
  border-right: 1px solid #e0e0e0;
  padding: 8px 4px;
  text-align: center;
  height: 60px;
  min-height: 60px;
  max-height: 60px;
  width: var(--day-width, 100px);
  min-width: var(--day-width, 100px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: visible;
  box-sizing: border-box;
  /* Optimisation légère pour fluidité */
  will-change: background-color;
  position: relative; /* pour ancrer le séparateur ::after et éviter la coupure */
}

/* (supprimé) séparateur sur header jours remplacé par overlay global */

.excel-day-cell.today {
  background: #e3f2fd;
  font-weight: 600;
}

/* Fin de mois sur header jours */
.excel-day-cell.month-boundary-right::after {
  content: '';
  position: absolute;
  right: -1px; /* chevauche pour éviter double épaisseur */
  top: 0;
  bottom: 0;
  width: var(--week-sep-width, 3px);
  background: linear-gradient(to bottom, var(--week-sep-color, rgba(0,0,0,0.10)), var(--week-sep-color, rgba(0,0,0,0.10)));
  pointer-events: none;
}

.excel-day-cell.weekend {
  background: inherit; /* même style que les autres jours */
}

.excel-day-cell.hovered {
  background: #e8f5e8 !important;
  /* Couleur verte harmonieuse avec les disponibilités */
}

.day-name {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 4px;
  line-height: 1.3;
  font-weight: 500;
  /* Assurer la visibilité absolue */
  display: block;
  width: 100%;
  text-align: center;
  /* Solution propre pour garantir l'affichage */
  position: relative;
  z-index: 1;
}

.day-number {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
  /* Assurer la visibilité absolue */
  display: block;
  width: 100%;
  text-align: center;
  /* Solution propre pour garantir l'affichage */
  position: relative;
  z-index: 1;
}

/* Conteneur des lignes (dans le flux du scroll) */
.excel-rows {
  display: block;
  overflow: visible; /* ne pas couper le sticky */
  width: max-content; /* suit exactement la largeur de la grille */
  position: relative;
  z-index: 10; /* Contexte de stacking pour les lignes et overlays internes */
}

/* Conteneur de clipping des overlays verticaux pour ne jamais recouvrir la colonne collaborateurs */
.grid-overlay-clip {
  position: absolute;
  top: 0;
  left: var(--grid-left-body, calc(var(--sticky-left, 260px) + 1px)); /* origine mesurée, repli sticky+1 */
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden; /* empêche de recouvrir la colonne sticky en rognant à gauche */
  z-index: 20; /* Au-dessus des cellules (z-index 1), sous les overlays */
}

/* Overlay de colonne survolée (corps) */
.column-hover-overlay {
  position: absolute;
  top: 0; /* dans .excel-rows, pas besoin de compenser le header */
  left: 0; /* origine = bord droit de la sticky via le clip */
  transform: translate3d(-9999px, 0, 0);
  width: var(--day-width, 100px);
  bottom: 0;
  pointer-events: none;
  background: rgba(76, 175, 80, 0.12);
  mix-blend-mode: multiply;
  z-index: 30; /* Au-dessus du clip (20) et des cellules */
  transition: none; /* éviter toute latence visuelle */
  will-change: transform;
}

/* Overlay de survol horizontal (ligne) */
.row-hover-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  transform: translate3d(0, -9999px, 0);
  height: var(--row-overlay-height, calc(var(--row-height, 50px) + 1px)); /* inclut la bordure bas de la ligne */
  pointer-events: none;
  background: rgba(76, 175, 80, 0.16); /* légèrement plus visible */
  mix-blend-mode: multiply;
  transition: none; /* pas de latence liée aux transitions */
  z-index: 400; /* au-dessus des cellules et de la colonne collaborateurs (300) */
  will-change: transform;
}

/* Overlays du jour actuel (corps + sticky gauche) */
.today-overlay {
  position: absolute;
  top: 0; /* dans .excel-rows */
  left: var(--today-x-local, -9999px); /* origine = clip (sticky+1px) */
  width: var(--day-width, 100px); /* synchronisé avec dayWidth */
  bottom: 0;
  pointer-events: none;
  background: rgba(33, 150, 243, 0.18); /* bleu doux */
  z-index: 40; /* Au-dessus du hover (30) */
  will-change: left;
}
.today-overlay-left {
  position: absolute;
  top: 0; /* dans .excel-rows */
  left: 0;
  width: var(--sticky-left, 260px); /* largeur de la colonne collaborateurs (sync avec collab-sticky) */
  height: 100%;
  pointer-events: none;
  background: transparent; /* sera coloré via box-shadow */
  /* reproduit le surlignage dans la zone sticky en se basant sur la position locale */
  box-shadow: inset calc(var(--today-x-local, -9999px)) 0 0 0 rgba(33, 150, 243, 0.18);
  z-index: 215; /* sous collab-sticky (1000), au-dessus du fond */
}

.excel-collaborateur-row {
  border-bottom: 1px solid #e0e0e0;
  background: white;
  /* pas d'espacement supplémentaire: le pas vertical est height + 1px bordure */
  display: flex;
  align-items: center;
  cursor: pointer;
  /* Optimisation légère pour fluidité */
  will-change: background-color;
}

.excel-collaborateur-row:hover,
.excel-collaborateur-row.hovered {
  background: transparent !important; /* on laisse l'overlay gérer le survol */
}

.collaborateur-content {
  padding: 8px 10px; /* compact pour loger plus d'infos */
  width: 100%;
  position: relative; /* pour ancrer le badge métier à droite */
}

.collaborateur-name {
  font-weight: 700;
  font-size: 12px;
  color: #333;
  margin-bottom: 1px;
  line-height: 1.2;
}

.collaborateur-name .metier-chip {
  margin-left: 8px;
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
}

.collaborateur-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  line-height: 1;
  font-size: 11px;
}

.metier-badge {
  background: #e1f5fe;
  color: #0277bd;
  padding: 1px 6px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
}

.location {
  font-size: 11px;
  color: #666;
}

/* Badge métier à droite de la cellule collaborateur */
.metier-right {
  position: absolute;
  right: 10px;
  top: 8px;
  background: #e1f5fe;
  color: #0277bd;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.collaborateur-extra {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
}

.collaborateur-extra .contact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4b5563;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  max-width: 100%;
}

.collaborateur-extra .contact .text {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Une ligne affichée: sticky gauche + grille scrollable dans le même conteneur */
.excel-row {
  display: flex;
  border-bottom: 1px solid #e5e7eb; /* séparation claire entre collaborateurs */
  background: white;
  position: relative;
  /* Suppression de l'effet hover par classe */
}

.collab-sticky {
  position: sticky;
  left: 0;
  z-index: 1000; /* Au-dessus de tous les highlights (colonne/ligne/aujourd'hui) */
  width: var(--sticky-left, 260px);
  min-width: var(--sticky-left, 260px);
  flex: 0 0 var(--sticky-left, 260px); /* ne pas rétrécir/allonger, fixe */
  background: #f9f9f9;
  border-right: 1px solid #e0e0e0;
  box-shadow: 2px 0 6px rgba(0,0,0,0.04);
  isolation: isolate; /* créer un nouveau contexte de stacking local */
  /* fond plein (pas de dégradé) pour ne rien laisser transparaître */
}

.excel-planning-row {
  display: flex;
  cursor: pointer;
  width: max-content;
  flex: 0 1 auto; /* occupe le reste et peut s'étendre */
}

.excel-planning-row:hover,
.excel-planning-row.hovered {
  background: transparent !important; /* overlay colonne/ligne prend le relais */
}

.excel-cell {
  border-right: 1px solid #e0e0e0;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1; /* Contexte de base pour les cellules */
  cursor: pointer;
  /* Pas de transforms ici pour fiabiliser sticky */
  transition: none !important;
}

.excel-cell.week-boundary-right::after {
  content: '';
  position: absolute;
  right: -1px;
  top: 0;
  bottom: 0;
  width: var(--week-sep-width, 2px);
  background: linear-gradient(to bottom, var(--week-sep-color, rgba(0,0,0,0.10)), var(--week-sep-color, rgba(0,0,0,0.10)));
  pointer-events: none;
}

/* Fin de mois: trait identique, même épaisseur/couleur */
.excel-cell.month-boundary-right::after {
  content: '';
  position: absolute;
  right: -1px;
  top: 0;
  bottom: 0;
  width: var(--week-sep-width, 3px);
  background: linear-gradient(to bottom, var(--week-sep-color, rgba(0,0,0,0.10)), var(--week-sep-color, rgba(0,0,0,0.10)));
  pointer-events: none;
}

.excel-cell:hover { background: transparent; }

.excel-cell.today {
  background: #e3f2fd;
}

.excel-cell.weekend {
  background: inherit; /* même style que les autres jours */
}

.excel-cell.has-dispos { background: #f8f8f8; }
/* Rendu coloré par type (état antérieur) */
.excel-cell.cell-dispo { background: #f3faf4; }
.excel-cell.cell-mission { background: #f3f7ff; }
.excel-cell.cell-indispo { background: #fdf3f3; }
.excel-cell.cell-empty { background: #ffffff; }

.dispo-bars {
  width: 100%;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: stretch;
  height: 100%;
  /* Assurer que le hover remonte */
  pointer-events: auto;
}

.dispo-bar {
  background: #4caf50;
  color: white;
  border-radius: 3px;
  padding: 4px 6px;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  cursor: pointer;
  /* Suppression des transitions pour fluidité maximale */
  min-height: 18px;
  width: 100%;
  max-width: 100%;
  /* Assurer que le hover remonte */
  pointer-events: auto;
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.25), 0 1px 0 rgba(0,0,0,0.05);
}

/* Une seule barre: elle s’étire sur toute la hauteur utile */
.dispo-bars.single .dispo-bar {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
}

/* Plusieurs barres: elles se partagent l’espace équitablement */
.dispo-bars.multi {
  gap: 4px;
}
.dispo-bars.multi .dispo-bar { flex: 1 1 0; }

/* Hover des barres: éclaircir légèrement, sans changer la couleur de la cellule */
.dispo-bar:hover {
  filter: brightness(1.06);
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.35), 0 1px 0 rgba(0,0,0,0.06);
}

.dispo-bar-available {
  background: #4caf50;
}

.dispo-bar-unavailable {
  background: #f44336;
}

.dispo-bar-mission {
  background: #1976d2; /* bleu pour mission (lieu) */
}

.dispo-bar-other {
  background: #ff9800;
}

/* Heure compacte dans la barre */
.dispo-time {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.35);
  color: #fff;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 16px;
  height: 16px;
  white-space: nowrap;
}

.dispo-badge {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.35);
  color: #fff;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 16px;
  height: 16px;
  white-space: nowrap;
}

.dispo-badge.indispo {
  background: rgba(255,255,255,0.25);
}

.slot-pill {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.35);
  color: #fff;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 18px;
  height: 18px;
  margin-left: 6px;
  backdrop-filter: saturate(120%);
}

.dispo-icn {
  opacity: 0.9;
}

/* Indicateurs de continuation nuit */
.dispo-continuation.cont-from-prev {
  position: relative;
}
.dispo-continuation.cont-from-prev::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(to right, rgba(0,0,0,0.25), transparent);
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  opacity: 0.25;
}
.dispo-continuation.cont-to-next {
  position: relative;
}
.dispo-continuation.cont-to-next::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(to left, rgba(0,0,0,0.25), transparent);
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  opacity: 0.25;
}
.cont-flag {
  font-size: 12px;
  opacity: 0.9;
}
.cont-flag.left { margin-right: auto; }
.cont-flag.right { margin-left: auto; }

.dispo-add {
  width: 100%;
  height: 100%;
  border: 2px dashed #d9d9d9;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s ease, border-color 0.1s ease, color 0.1s ease;
}

.dispo-add:hover {
  background: #f3f4f6;
  border-color: #60a5fa;
  color: #60a5fa;
}

/* Quick Add popover */
.quick-add-panel {
  position: fixed;
  z-index: 1001;
  width: 420px;
  max-width: calc(100vw - 24px);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.12);
  padding: 12px;
}
.qa-header { display: flex; align-items: center; }
.qa-title { font-weight: 700; font-size: 14px; color: #111827; }
.qa-close { margin-left: auto; background: transparent; border: none; cursor: pointer; font-size: 16px; color: #6b7280; }
.qa-section { margin-top: 8px; }
.qa-row { display: flex; gap: 8px; margin-bottom: 8px; }
.qa-fixed > * { flex: 0 0 auto; }
.qa-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.qa-field { width: 100%; }
.qa-wide { grid-column: span 2; }
.qa-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.qa-alert { display: flex; align-items: center; gap: 6px; background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; font-size: 12px; }

/* Modal */
.dispo-modal-content {
  padding: 14px;
}

/* Z-index modale géré globalement dans src/style.css (suppression des overrides locaux) */
/* Conserver uniquement la typographie si nécessaire */
:deep(.va-modal),
:deep(.va-modal__container),
:deep(.va-modal__dialog) {
  font-family: var(--kd-font) !important;
}


/* Popover Vuestic (infos rapides) */
/* Assurer la visibilité des menus déroulants (VaSelect/VaDropdown) au-dessus de tout */
/* Couvre les contenus téléportés et non téléportés */
:deep(.va-select-dropdown__content),
:deep(.va-select-option-list) {
  z-index: 2147483647 !important;
}
:deep(.va-dropdown__content),
:deep(.va-dropdown__content-wrapper) {
  z-index: initial !important;
}

/* Titre de la modale (barre d'en-tête de Vuestic) */
.va-modal__title {
  font-family: var(--kd-font) !important;
  font-weight: 700 !important;
  font-size: 18px !important;
  letter-spacing: 0.2px;
}

/* Composants de formulaire dans la modale */
.va-modal :is(.va-input, .va-select, .va-button, .va-dropdown, .va-checkbox, .va-radio) {
  font-family: var(--kd-font) !important;
}

/* Ne pas écraser la police des icônes */
/* Icônes Material: forcer la bonne fonte pour éviter l'affichage du nom (ex: "expand_more") */
.material-icons {
  font-family: 'Material Icons' !important;
  font-weight: normal;
  font-style: normal;
  font-size: 1em;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}
.material-icons-outlined { font-family: 'Material Icons Outlined' !important; }
.material-icons-round { font-family: 'Material Icons Round' !important; }
.material-icons-sharp { font-family: 'Material Icons Sharp' !important; }
.material-icons-two-tone { font-family: 'Material Icons Two Tone' !important; }

/* Couverture des icônes Vuestic dans la modale (ex: chevrons de VaSelect) */
.va-modal .va-icon {
  font-family: 'Material Icons' !important;
  font-feature-settings: 'liga' !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Icône d'heure personnalisée (append) */
.time-append-icon {
  color: #111 !important;
  cursor: pointer;
}
</style>
