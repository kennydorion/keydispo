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
    <!-- Badge d'environnement: émulateur local -->
  <div v-if="isEmulator" class="env-badge">
      Émulateur Firebase actif
    </div>

    <!-- Barre de statut de sélection améliorée -->
    <div v-if="selectedCells.size > 0 || isSelectionMode || isDraggingSelection" class="selection-status-bar">
      <div class="selection-content">
        <va-icon name="touch_app" size="16px" class="selection-icon" />
        <span v-if="!selectedCells.size && isSelectionMode" class="selection-text">
          Mode sélection activé - glissez sur les cellules
        </span>
        <span v-else-if="isDraggingSelection" class="selection-text">
          Sélection en cours... <strong>{{selectedCells.size}}</strong> cellule{{ selectedCells.size > 1 ? 's' : '' }}
        </span>
        <span v-else class="selection-text">
          <strong>{{selectedCells.size}}</strong> cellule{{ selectedCells.size > 1 ? 's' : '' }} sélectionnée{{ selectedCells.size > 1 ? 's' : '' }}
        </span>
        <va-button 
          v-if="selectedCells.size > 0"
          size="small" 
          preset="plain" 
          icon="clear"
          class="clear-selection-btn"
          @click="clearSelection"
          title="Effacer la sélection"
        />
      </div>
    </div>
    
    <!-- Aide contextuelle discrète -->
    <div v-if="!selectedCells.size && !isSelectionMode && !isDraggingSelection" class="selection-help-tooltip">
      <va-icon name="info" size="14px" />
      <kbd>Ctrl</kbd>+glisser pour sélectionner
    </div>

    <!-- Planning Excel synchronisé - Scroll unique, sticky header + colonne -->
    <!-- Planning Excel synchronisé - Scroll unique, sticky header + colonne -->
    <div class="excel-planning-container">
  
  <!-- Bouton flottant pour la sélection par lot -->
  <div v-if="selectedCells.size > 0" class="batch-action-fab">
    <va-button 
      preset="primary" 
      icon="edit_calendar"
      @click="batchModalOpen = true"
      :style="{ '--va-button-content-px': '12px' }"
    >
      Créer {{ selectedCells.size }} disponibilité{{ selectedCells.size > 1 ? 's' : '' }}
    </va-button>
    <va-button 
      preset="secondary" 
      icon="clear"
      @click="clearSelection"
      size="small"
      class="ml-2"
    />
  </div>

  <!-- Bouton flottant pour corriger les missions overnight -->
  <div class="overnight-fix-fab">
    <va-button 
      preset="secondary" 
      icon="schedule"
      @click="detectAndFixExistingOvernightMissions(true)"
      size="small"
      color="warning"
      title="Détecter et corriger les missions overnight existantes"
    >
      🌙 Corriger
    </va-button>
  </div>

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
            <div class="collab-sticky" :style="{ '--collaborateur-color': getCollaborateurColor(collaborateur.id) }">
              <div class="collaborateur-color-bar"></div>
              <div class="collaborateur-content">
                <span class="metier-right" v-if="collaborateur.metier">{{ collaborateur.metier }}</span>
                <div 
                  class="collaborateur-name clickable-name" 
                  @click="openCollaborateurInfo(collaborateur)"
                  title="Cliquer pour voir les informations du collaborateur"
                >
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
                      'week-boundary-right': isWeekBoundary(day.date),
                      'selected': selectedCells.has(`${collaborateur.id}-${day.date}`),
                      'locked': isCellLocked(collaborateur.id, day.date)
                    },
                    getCellKindClass(collaborateur.id, day.date)
                  ]"
                  :style="{ width: dayWidth + 'px' }"
                  @click.stop="handleCellClickNew(collaborateur.id, day.date, $event)"
                  @mousedown.stop="handleCellMouseDown(collaborateur.id, day.date, $event)"
                  @mouseenter="handleCellMouseEnter(collaborateur.id, day.date)"
                  @mouseup="handleCellMouseUp()"
                >
                  <!-- Indicateur de verrou -->
                  <div v-if="isCellLocked(collaborateur.id, day.date)" class="cell-lock-indicator" :title="`Verrouillé par ${getCellLockInfo(collaborateur.id, day.date)?.userName}`">
                    <va-icon name="lock" size="12px" />
                  </div>
                  
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
                      @click.stop="() => openModalForCollaborateur(collaborateur.id, day.date)"
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
      :hide-default-actions="true"
      :fullscreen="false"
      max-width="600px"
      no-padding
      @close="cancelModal"
    >
      <div class="dispo-modal-mobile" v-if="selectedCell">
        <!-- En-tête détaillé (style batch) -->
        <div class="dispo-header-detailed">
          <div class="collaborateur-section">
            <div class="collaborateur-avatar-large">
              {{ getSelectedCollaborateur()?.prenom?.charAt(0) || '' }}{{ getSelectedCollaborateur()?.nom?.charAt(0) || '' }}
            </div>
            <div class="collaborateur-info-detailed">
              <h3 class="collaborateur-name-large">{{ getSelectedCollaborateur()?.prenom }} {{ getSelectedCollaborateur()?.nom }}</h3>
              <p class="collaborateur-meta-large">{{ formatModalDate(selectedCell.date) }}</p>
            </div>
          </div>
          
          <!-- Section principale du formulaire -->
        </div>

        <!-- Section 1: Lignes existantes -->
        <div class="form-section-primary">
          <h3 class="section-title-primary">
            <span style="background: var(--va-primary); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">1</span>
            Disponibilités ({{ selectedCellDispos.length }})
          </h3>
          
          <div v-if="selectedCellDispos.length === 0" class="no-dispos">
            <va-icon name="event_busy" size="32px" color="secondary" />
            <span>Aucune ligne pour ce jour</span>
          </div>
          
          <div v-else class="dispos-overview-list">
            <div
              v-for="(dispo, index) in selectedCellDispos"
              :key="index"
              class="dispo-overview-item"
              :class="[
                getDispoTypeClass(dispo),
                { 'editing-highlight': editingDispoIndex === index }
              ]"
            >
              <div class="dispo-overview-info">
                <div class="dispo-type-badge">
                  <va-icon :name="getTypeIcon(dispo.type)" size="14px" />
                  <span>{{ getTypeText(dispo.type) }}</span>
                  <span v-if="editingDispoIndex === index" class="editing-label">
                    <va-icon name="edit" size="12px" />
                    En cours d'édition
                  </span>
                </div>
                <div class="dispo-details-summary">
                  <span v-if="dispo.type === 'mission' && dispo.lieu" class="lieu-info">
                    <va-icon name="place" size="12px" />
                    {{ dispo.lieu }}
                  </span>
                  <span v-if="dispo.timeKind === 'range'" class="time-info">
                    <va-icon name="schedule" size="12px" />
                    {{ dispo.heure_debut }} - {{ dispo.heure_fin }}
                  </span>
                  <span v-else-if="dispo.timeKind === 'slot'" class="slot-info">
                    <va-icon name="view_module" size="12px" />
                    {{ getSlotText(dispo.slots) }}
                  </span>
                  <span v-else-if="dispo.timeKind === 'full-day'" class="fullday-info">
                    <va-icon name="today" size="12px" />
                    Journée complète
                  </span>
                </div>
              </div>
              <div class="dispo-overview-actions">
                <va-button
                  @click="editDispoLine(index)"
                  :color="editingDispoIndex === index ? 'warning' : 'primary'"
                  :icon="editingDispoIndex === index ? 'edit_off' : 'edit'"
                  size="small"
                  class="edit-btn"
                  :disabled="editingDispoIndex !== null && editingDispoIndex !== index"
                >
                  {{ editingDispoIndex === index ? 'Annuler' : 'Éditer' }}
                </va-button>
                <va-button
                  @click="removeDispo(index)"
                  color="danger"
                  icon="delete"
                  size="small"
                  class="delete-btn"
                  :disabled="editingDispoIndex !== null"
                >
                  Supprimer
                </va-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Formulaire d'édition (affiché quand on édite/ajoute) -->
        <Transition name="form-slide" mode="out-in">
          <div v-if="editingDispoIndex !== null || isAddingNewDispo" key="edit-form" class="form-section-primary edit-form-section">
            <h3 class="section-title-primary">
              <span style="background: var(--va-success); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">✎</span>
              {{ isAddingNewDispo ? 'Ajouter une disponibilité' : 'Modifier la disponibilité' }}
            </h3>

            <!-- Formulaire style batch -->
            <div class="edit-form-content">
              <!-- Type de disponibilité -->
              <div class="form-subsection">
                <h4 class="subsection-title">Type de disponibilité</h4>
                <div class="type-buttons-stack">
                  <va-button
                    v-for="typeOpt in typeOptions"
                    :key="typeOpt.value"
                    :color="editingDispo.type === typeOpt.value ? getTypeColor(typeOpt.value) : 'light'"
                    :icon="getTypeIcon(typeOpt.value)"
                    class="type-btn-full"
                    @click="setEditingType(typeOpt.value)"
                  >
                    {{ typeOpt.text }}
                  </va-button>
                </div>
              </div>

              <!-- Format horaire (si pas indisponible) -->
              <div v-if="editingDispo.type !== 'indisponible'" class="form-subsection">
                <h4 class="subsection-title">Format horaire</h4>
                <div class="type-buttons-stack">
                  <va-button
                    v-for="formatOpt in timeKindOptionsFor(editingDispo.type)"
                    :key="formatOpt.value"
                    :color="editingDispo.timeKind === formatOpt.value ? 'success' : 'light'"
                    :icon="getTimeKindIcon(formatOpt.value)"
                    class="type-btn-full"
                    @click="setEditingTimeKind(formatOpt.value)"
                  >
                    {{ formatOpt.text }}
                  </va-button>
                </div>
              </div>

              <!-- Lieu (si mission) -->
              <div v-if="editingDispo.type === 'mission'" class="form-subsection">
                <h4 class="subsection-title">Lieu de mission</h4>
                <LieuCombobox
                  :model-value="editingDispo.lieu || ''"
                  @update:model-value="(v: string) => editingDispo.lieu = v"
                  :options="lieuxOptionsStrings"
                  label="Lieu"
                  size="small"
                  class="lieu-field-mobile"
                  @create="onCreateLieu"
                />
              </div>

              <!-- Horaires personnalisées -->
              <div v-if="editingDispo.timeKind === 'range'" class="form-subsection">
                <h4 class="subsection-title">Horaires personnalisées</h4>
                <div class="time-fields-mobile">
                  <va-input
                    v-model="editingDispo.heure_debut"
                    type="time"
                    step="300"
                    label="Début"
                    placeholder="HH:MM"
                    size="small"
                    class="time-field-mobile"
                  />
                  <va-input
                    v-model="editingDispo.heure_fin"
                    type="time"
                    step="300"
                    label="Fin"
                    placeholder="HH:MM"
                    size="small"
                    class="time-field-mobile"
                    :disabled="!editingDispo.heure_debut"
                  />
                </div>
              </div>

              <!-- Créneaux standards -->
              <div v-if="editingDispo.timeKind === 'slot'" class="form-subsection">
                <h4 class="subsection-title">Créneaux standards</h4>
                <div class="slots-grid-mobile">
                  <div
                    v-for="slot in slotOptions"
                    :key="slot.value"
                    :class="['slot-option-mobile', { active: editingDispo.slots?.includes(slot.value) }]"
                    @click="toggleEditingSlot(slot.value)"
                  >
                    <div class="slot-label">{{ slot.text }}</div>
                  </div>
                </div>
              </div>

              <!-- Actions du formulaire -->
              <div class="form-actions">
                <va-button
                  @click="cancelEditDispo"
                  color="secondary"
                  size="small"
                >
                  Annuler
                </va-button>
                <va-button
                  @click="saveEditDispo"
                  color="primary"
                  size="small"
                  :disabled="!isEditFormValid"
                >
                  {{ isAddingNewDispo ? 'Ajouter' : 'Sauvegarder' }}
                </va-button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Bouton ajouter en bas (seulement si pas déjà en cours d'ajout) -->
        <div v-if="!isAddingNewDispo" class="add-line-container-bottom">
          <va-button 
            @click="addNewDispoLine" 
            color="success" 
            icon="add" 
            size="small"
            class="add-line-btn-mobile"
            :disabled="editingDispoIndex !== null"
          >
            Ajouter une ligne
          </va-button>
        </div>

        <!-- Actions -->
        <div class="actions">
          <va-button
            color="secondary"
            @click="cancelModal"
          >
            Annuler
          </va-button>
          
          <va-button
            color="primary"
            :loading="saving"
            @click="saveDispos"
          >
            Sauvegarder
          </va-button>
        </div>
      </div>
  </va-modal>
  </teleport>

  <!-- Modal de sélection par lot -->
  <BatchDisponibiliteModal
    v-model="batchModalOpen"
    :selected-cells="Array.from(selectedCells)"
    :selected-collaborateur="extractCollaborateurFromSelection"
    :selected-dates="extractDatesFromSelection"
    :lieux-options="lieuOptions"
    @batch-created="handleBatchCreate"
  />

  <!-- Modal d'informations collaborateur -->
  <CollaborateurInfoModal
    v-model:visible="collaborateurInfoModal.open"
    :collaborateur="collaborateurInfoModal.collaborateur"
    :collaborateur-dispos="collaborateurInfoModal.dispos"
    :collaborateur-color="collaborateurInfoModal.color"
    @edit-collaborateur="handleEditCollaborateur"
    @save-notes="handleSaveCollaborateurNotes"
  />
</div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import LieuCombobox from '../components/LieuCombobox.vue'
import { useToast } from 'vuestic-ui'
import FiltersHeader from '../components/FiltersHeader.vue'
import BatchDisponibiliteModal from '../components/BatchDisponibiliteModal.vue'
import CollaborateurInfoModal from '../components/CollaborateurInfoModal.vue'
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { AuthService } from '../services/auth'
import { db } from '../services/firebase'
import { collection, query, where, orderBy, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import type { Collaborateur } from '../types/planning'
const { notify } = useToast()

// Ouvre le sélecteur d'heure natif en cliquant sur l'icône append
function openTimePickerFromIcon(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement | null
  if (!target) return
  // Remonte jusqu'au wrapper de l'input puis cherche l'input[type="time"] réel rendu par VaInput
  const root = target.closest('.va-input-wrapper, .va-input, .quick-field-full, .compact-field') as HTMLElement | null
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

// Types compatibles avec l'existant
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
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  slots?: string[]
  isFullDay?: boolean
  version?: number
  updatedAt?: any
  updatedBy?: string
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

// Nouveaux états pour les fonctionnalités ajoutées
const collaborateurs = ref<Collaborateur[]>([])
const batchModalOpen = ref(false)
const selectedCells = ref<Set<string>>(new Set())
const cellLocks = ref<Map<string, { userId: string, userName: string, expiresAt: number }>>(new Map())

// Modal d'informations collaborateur
const collaborateurInfoModal = ref({
  open: false,
  collaborateur: null as Collaborateur | null,
  dispos: [] as any[],
  color: '#3b82f6'
})

// État pour la sélection par lot
const isSelectionMode = ref(false)
const isDraggingSelection = ref(false)
const dragStartCell = ref<string | null>(null)

// Gestionnaires d'événements clavier pour la sélection par lot
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    isSelectionMode.value = true
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (!e.ctrlKey && !e.metaKey) {
    isSelectionMode.value = false
  }
}

// Watcher pour appliquer la classe CSS au body
watch(isSelectionMode, (newValue) => {
  if (newValue) {
    document.body.classList.add('selection-mode')
  } else {
    document.body.classList.remove('selection-mode')
  }
})

// Watcher pour le mode glissement
watch(isDraggingSelection, (newValue) => {
  if (newValue) {
    document.body.classList.add('dragging-selection')
  } else {
    document.body.classList.remove('dragging-selection')
  }
})

// Services (pour les futures fonctionnalités temps réel)

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
const isLocalhostEnv = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const isEmulator = isLocalhostEnv && import.meta.env.VITE_USE_EMULATOR === '1'

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
const allCollaborateurs = ref<Collaborateur[]>([])
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

// État d'édition de ligne
const editingDispoIndex = ref<number | null>(null)
const isAddingNewDispo = ref(false)
const editingDispo = ref<Partial<Disponibilite>>({
  type: 'disponible',
  timeKind: 'full-day',
  heure_debut: '09:00',
  heure_fin: '17:00',
  lieu: '',
  slots: []
})

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

// === NOUVELLE FONCTION POUR OUVRIR LA MODALE ===

// === NOUVELLE FONCTION POUR OUVRIR LA MODALE ===
function openModalForCollaborateur(collaborateurId: string, date: string) {
  // Ne pas ouvrir si on est en mode multiselect
  if (isSelectionMode.value) {
    console.log('🚫 Ouverture modale bloquée - mode multiselect actif')
    return
  }
  
  // Ouvrir directement la modale existante
  openDispoModal(collaborateurId, date)
}

const isMobileView = ref(false)
const dayWidthRef = ref(124)
const stickyLeftWidthRef = ref(260)
const rowHeightRef = ref(56)
const rowPitchRef = computed(() => rowHeightRef.value + 1)

function computeResponsive() {
  const w = window.innerWidth
  isMobileView.value = w <= 900
  let sticky = 260
  let day = 124
  let rowH = 56
  if (w <= 390) { // iPhone 12 width
    sticky = 72; day = Math.max(44, Math.min(60, Math.floor((w - sticky - 8)/7))); rowH = 48
  } else if (w <= 430) {
    sticky = 78; day = Math.max(48, Math.min(64, Math.floor((w - sticky - 10)/7))); rowH = 50
  } else if (w <= 520) {
    sticky = 90; day = Math.max(54, Math.min(70, Math.floor((w - sticky - 12)/7))); rowH = 52
  } else if (w <= 640) {
    sticky = 110; day = Math.max(60, Math.min(80, Math.floor((w - sticky - 16)/7))); rowH = 54
  } else if (w <= 900) {
    sticky = 140; day = Math.max(70, Math.min(96, Math.floor((w - sticky - 20)/7))); rowH = 56
  }
  dayWidthRef.value = day
  stickyLeftWidthRef.value = sticky
  rowHeightRef.value = rowH
  nextTick(() => planningScroll.value && recomputeWindow(planningScroll.value))
}

onMounted(() => {
  computeResponsive()
  window.addEventListener('resize', computeResponsive)
})
onUnmounted(() => window.removeEventListener('resize', computeResponsive))

// Aliases simples
const dayWidth = computed(() => dayWidthRef.value)
const stickyLeftWidth = computed(() => stickyLeftWidthRef.value)
const rowHeight = computed(() => rowHeightRef.value)
const rowPitch = computed(() => rowPitchRef.value)

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
const gridMinWidth = computed(() => (visibleDays.value.length * dayWidth.value) + 'px')

// Virtualisation horizontale des jours
const windowStartIndex = ref(0)
const windowEndIndex = ref(0)
const windowPaddingCols = 8 // cols tampon de chaque côté
const windowOffsetPx = computed(() => windowStartIndex.value * dayWidth.value)
const windowedDays = computed(() => visibleDays.value.slice(windowStartIndex.value, Math.min(windowEndIndex.value + 1, visibleDays.value.length)))

function recomputeWindow(scroller?: HTMLElement | null) {
  const el = scroller || planningScroll.value
  if (!el) return
  const { scrollLeft, clientWidth } = el
  const dw = dayWidth.value
  const firstIdx = Math.max(0, Math.floor(scrollLeft / dw) - windowPaddingCols)
  const lastIdx = Math.min(visibleDays.value.length - 1, Math.ceil((scrollLeft + clientWidth) / dw) + windowPaddingCols)
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
const rowPitchPx = ref<number>(rowPitch.value)
const rowHeightMeasuredPx = ref<number>(rowHeight.value + 1)

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
  rowPitchPx.value = rowPitch.value
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
  const gridLeft = (gridLeftBodyPx.value || (stickyLeftWidth.value + 1))
  const pitch = dayPitchBodyPx.value || (dayWidth.value + 1)
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
  const directDispos = dayDispos.filter(d => d.collaborateurId === collaborateurId)
  
  // Chercher aussi les disponibilités overnight de la veille qui débordent sur ce jour
  const prevDay = addDaysStr(date, -1)
  const prevDayDispos = disponibilitesCache.value.get(prevDay) || []
  
  const overnightDispos = prevDayDispos
    .filter(d => d.collaborateurId === collaborateurId)
    .filter(d => {
      // Détection rapide: si déjà marqué overnight
      if (d.timeKind === 'overnight') return true
      
      // Détection rapide: si pas d'horaires, pas overnight
      if (!d.heure_debut || !d.heure_fin) return false
      
      // Vérification simple des heures (sans conversion complexe)
      const startHour = parseInt(d.heure_debut.split(':')[0])
      const endHour = parseInt(d.heure_fin.split(':')[0])
      const isOvernight = endHour < startHour
      
      // Si overnight ET c'est une mission ou a un lieu spécifique
      return isOvernight && (
        d.type === 'mission' || 
        (d.lieu && d.lieu !== 'DISPONIBLE' && d.lieu !== 'DISPO' && d.lieu !== 'INDISPONIBLE')
      )
    })
    .map(d => ({ ...d, _cont: 'end' as const }))
  
  return [...directDispos, ...overnightDispos]
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
  if ((k.timeKind !== 'range' && k.timeKind !== 'overnight') || !d.heure_debut || !d.heure_fin) return null
  
  const s = toMinutes(d.heure_debut)
  const e = toMinutes(d.heure_fin)
  if (s == null || e == null) return null
  
  // Pour les missions overnight détectées automatiquement ou explicitement
  const isOvernightMission = k.timeKind === 'overnight' || e < s
  
  if (d.date === day) {
    if (isOvernightMission) return 'start' // overnight: commence ce jour
    return 'start' // mission normale du même jour
  }
  
  // overnight continuation on next day
  const next = addDaysStr(d.date, 1)
  if (next === day && isOvernightMission) return 'end'
  
  return null
}

function timeLabelForCell(d: Disponibilite, day: string): string {
  const k = resolveDispoKind(d)
  const p = partForDay(d, day)
  const s = d.heure_debut!.substring(0,5)
  const e = d.heure_fin!.substring(0,5)
  
  // Indicateur visuel pour les missions overnight
  const overnightIcon = k.timeKind === 'overnight' ? '🌙 ' : ''
  
  if (p === 'start') return `${overnightIcon}${s}→…`
  if (p === 'end') return `${overnightIcon}…→ ${e}`
  // même jour simple
  return `${overnightIcon}${s}-${e}`.replace(':00', '').replace(':00', '') + 'h'
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
  const originalLieu = dispo.lieu || ''
  
  if (canon === 'INDISPONIBLE') return { type: 'indisponible', timeKind: 'full-day', slots: [] }
  if (canon === 'DISPO JOURNEE') return { type: 'disponible', timeKind: 'full-day', slots: [] }
  
  const hasHours = !!(dispo.heure_debut && dispo.heure_fin)
  const inferredSlots = detectSlotsFromText(dispo.lieu || '')
  
  if ((canon === '' || canon === 'DISPONIBLE') && inferredSlots.length > 0) {
    return { type: 'disponible', timeKind: 'slot', slots: inferredSlots }
  }
  
  // Logique unifiée pour les missions : toute dispo avec un lieu spécifique est une mission
  const hasSpecificLocation = originalLieu && 
    originalLieu !== 'DISPONIBLE' && 
    originalLieu !== 'DISPO' && 
    originalLieu !== 'INDISPONIBLE' &&
    originalLieu.trim() !== ''
  
  // Détection automatique des missions de nuit qui dépassent sur deux jours
  let detectedTimeKind = 'full-day'
  if (hasHours) {
    const startTime = parseInt(dispo.heure_debut!.split(':')[0])
    const endTime = parseInt(dispo.heure_fin!.split(':')[0])
    
    // Si l'heure de fin est plus petite que l'heure de début, c'est une mission de nuit
    if (endTime < startTime) {
      detectedTimeKind = 'overnight'
    } else {
      detectedTimeKind = 'range'
    }
  }
  
  if (hasHours) {
    return { type: hasSpecificLocation ? 'mission' : 'disponible', timeKind: detectedTimeKind, slots: [] }
  }
  return { type: hasSpecificLocation ? 'mission' : 'disponible', timeKind: 'full-day', slots: [] }
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
    if (timeKind !== 'range' && timeKind !== 'full-day' && timeKind !== 'slot' && timeKind !== 'overnight') {
      timeKind = 'range'
    }
    
    // Détection automatique des missions overnight
    if (timeKind === 'range' && d.heure_debut && d.heure_fin) {
      const startTime = parseInt(d.heure_debut.split(':')[0])
      const endTime = parseInt(d.heure_fin.split(':')[0])
      
      // Si l'heure de fin est plus petite que l'heure de début, c'est une mission de nuit
      if (endTime < startTime || (endTime === startTime && d.heure_fin < d.heure_debut)) {
        timeKind = 'overnight'
        console.log('🌙 Mission overnight auto-détectée dans sanitizeDisposition:', {
          lieu: d.lieu,
          horaires: `${d.heure_debut} → ${d.heure_fin}`
        })
      }
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
      heure_debut: (timeKind === 'range' || timeKind === 'overnight') ? (d.heure_debut || '') : '',
      heure_fin: (timeKind === 'range' || timeKind === 'overnight') ? (d.heure_fin || '') : '',
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
  return 'dispo-bar-mission' // fallback unifié vers mission
}

function isOvernightContinuation(dispo: Partial<Disponibilite> & { _cont?: 'start'|'end' }, cellDate: string) {
  const k = resolveDispoKind(dispo as Disponibilite)
  if (!dispo.heure_debut || !dispo.heure_fin) return false
  
  // Si timeKind est 'overnight', c'est détecté automatiquement
  if (k.timeKind === 'overnight') return true
  
  // Vérification manuelle pour les anciens formats
  if (k.timeKind !== 'range') return false
  
  const startTime = parseInt(dispo.heure_debut.split(':')[0])
  const endTime = parseInt(dispo.heure_fin.split(':')[0])
  
  // Si l'heure de fin est plus petite que l'heure de début, c'est une mission de nuit
  const isOvernight = endTime < startTime || (endTime === startTime && dispo.heure_fin < dispo.heure_debut)
  
  if (isOvernight) {
    console.log('🕐 isOvernightContinuation détecté:', {
      collaborateur: dispo.prenom + ' ' + dispo.nom,
      horaires: `${dispo.heure_debut} → ${dispo.heure_fin}`,
      cellDate,
      dispoDate: dispo.date,
      continuation: dispo._cont
    })
  }
  
  return isOvernight
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
  return 'card-mission' // fallback unifié vers mission
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

// Fonction pour corriger les missions overnight existantes
async function detectAndFixExistingOvernightMissions(verbose = false) {
  if (verbose) console.log('🔍 Détection des missions overnight existantes...')
  
  const allDispos = Array.from(disponibilitesCache.value.values()).flat()
  const toUpdate: Disponibilite[] = []
  
  for (const dispo of allDispos) {
    // Ignorer les dispos qui ont déjà le bon timeKind
    if (dispo.timeKind === 'overnight') continue
    
    // Vérification rapide sans logs
    if (dispo.heure_debut && dispo.heure_fin) {
      const startTime = parseInt(dispo.heure_debut.split(':')[0])
      const endTime = parseInt(dispo.heure_fin.split(':')[0])
      const isOvernight = endTime < startTime
      
      if (isOvernight) {
        // Mission explicite
        if (dispo.type === 'mission') {
          toUpdate.push({ ...dispo, timeKind: 'overnight' })
        }
        // Mission legacy avec lieu spécifique
        else if (!dispo.type && dispo.lieu && 
                 dispo.lieu !== 'DISPONIBLE' && 
                 dispo.lieu !== 'DISPO' && 
                 dispo.lieu !== 'INDISPONIBLE' &&
                 dispo.lieu.trim() !== '') {
          toUpdate.push({ ...dispo, type: 'mission', timeKind: 'overnight' })
        }
      }
    }
  }
  
  if (toUpdate.length === 0) {
    if (verbose) {
      console.log('✅ Aucune mission overnight à corriger')
      notify({ message: 'Aucune mission overnight trouvée à corriger', color: 'info', position: 'top-right', duration: 2000 })
    }
    return
  }
  
  if (verbose) console.log(`🔧 ${toUpdate.length} missions overnight à corriger`)
  
  // Sauvegarder les corrections
  const tenantId = AuthService.currentTenantId || 'keydispo'
  const batch = writeBatch(db)
  const disposCol = collection(db, 'dispos')
  
  for (const dispo of toUpdate) {
    if (!dispo.id) continue
    
    const docRef = doc(disposCol, dispo.id)
    batch.update(docRef, {
      type: dispo.type,
      timeKind: dispo.timeKind,
      version: (dispo.version || 1) + 1,
      updatedAt: serverTimestamp(),
      updatedBy: 'auto-overnight-fix'
    })
  }
  
  try {
    await batch.commit()
    if (verbose) {
      console.log('✅ Missions overnight corrigées avec succès')
      notify({ 
        message: `${toUpdate.length} missions overnight corrigées automatiquement`, 
        color: 'success', 
        position: 'top-right', 
        duration: 3000 
      })
    }
    
    // Recharger les données pour voir les changements
    await refreshDisponibilites()
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error)
    if (verbose) {
      notify({ 
        message: 'Erreur lors de la correction des missions overnight', 
        color: 'danger', 
        position: 'top-right', 
        duration: 3000 
      })
    }
  }
}

// Fonction pour analyser les missions overnight sans les corriger (dry-run)
function analyzeOvernightMissions() {
  console.log('🔍 Analyse des missions overnight existantes...')
  
  const allDispos = Array.from(disponibilitesCache.value.values()).flat()
  const potentialOvernight: Disponibilite[] = []
  const alreadyFixed: Disponibilite[] = []
  
  for (const dispo of allDispos) {
    // Compter celles qui sont déjà corrigées
    if (dispo.timeKind === 'overnight') {
      alreadyFixed.push(dispo)
      continue
    }
    
    // Analyser les potentielles corrections
    if (dispo.type === 'mission' && dispo.heure_debut && dispo.heure_fin) {
      const startTime = parseInt(dispo.heure_debut.split(':')[0])
      const endTime = parseInt(dispo.heure_fin.split(':')[0])
      
      if (endTime < startTime || (endTime === startTime && dispo.heure_fin < dispo.heure_debut)) {
        potentialOvernight.push(dispo)
      }
    }
    
    // Analyser aussi les legacy
    else if (!dispo.type && dispo.heure_debut && dispo.heure_fin) {
      const startTime = parseInt(dispo.heure_debut.split(':')[0])
      const endTime = parseInt(dispo.heure_fin.split(':')[0])
      const hasSpecificLocation = dispo.lieu && 
        dispo.lieu !== 'DISPONIBLE' && 
        dispo.lieu !== 'DISPO' && 
        dispo.lieu !== 'INDISPONIBLE' &&
        dispo.lieu.trim() !== ''
      
      if (hasSpecificLocation && (endTime < startTime || (endTime === startTime && dispo.heure_fin < dispo.heure_debut))) {
        potentialOvernight.push(dispo)
      }
    }
  }
  
  console.log('📊 Résumé de l\'analyse overnight:', {
    totalDispos: allDispos.length,
    alreadyFixed: alreadyFixed.length,
    needsFix: potentialOvernight.length,
    potentialMissions: potentialOvernight.map(d => ({
      collaborateur: d.prenom + ' ' + d.nom,
      lieu: d.lieu,
      date: d.date,
      horaires: `${d.heure_debut} → ${d.heure_fin}`
    }))
  })
  
  return {
    total: allDispos.length,
    alreadyFixed: alreadyFixed.length,
    needsFix: potentialOvernight.length,
    missions: potentialOvernight
  }
}

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
  console.log('🚀 Tentative ouverture modal:', { collaborateurId, date, isSelectionMode: isSelectionMode.value })
  
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
  
  // Détection automatique des missions overnight
  let finalTimeKind = d.timeKind
  if (d.timeKind === 'range' && d.heure_debut && d.heure_fin) {
    const startTime = parseInt(d.heure_debut.split(':')[0])
    const endTime = parseInt(d.heure_fin.split(':')[0])
    
    // Si l'heure de fin est plus petite que l'heure de début, c'est une mission de nuit
    if (endTime < startTime || (endTime === startTime && d.heure_fin < d.heure_debut)) {
      finalTimeKind = 'overnight'
      console.log('🌙 Mission overnight détectée lors de la création:', {
        collaborateur: collab.prenom + ' ' + collab.nom,
        lieu: d.lieu,
        horaires: `${d.heure_debut} → ${d.heure_fin}`,
        date: selectedCell.value.date
      })
    }
  }
  
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
    timeKind: finalTimeKind, // Utiliser le timeKind détecté automatiquement
    slots: finalTimeKind === 'slot' ? (d.slots || []) : [],
    isFullDay: finalTimeKind === 'full-day',
  // mission seulement
  lieu: d.type === 'mission' ? d.lieu : '',
    heure_debut: (finalTimeKind === 'range' || finalTimeKind === 'overnight') ? d.heure_debut : '',
    heure_fin: (finalTimeKind === 'range' || finalTimeKind === 'overnight') ? d.heure_fin : '',
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

// === HELPER FUNCTIONS POUR BOUTONS ===

function getTypeColor(type: string): string {
  switch(type) {
    case 'mission': return 'primary'
    case 'disponible': return 'success'
    case 'indisponible': return 'danger'
    default: return 'light'
  }
}

function getTypeIcon(type: string | undefined): string {
  switch(type) {
    case 'mission': return 'work'
    case 'disponible': return 'check_circle'
    case 'indisponible': return 'cancel'
    default: return 'help'
  }
}

function getTimeKindIcon(timeKind: string): string {
  switch(timeKind) {
    case 'full-day': return 'today'
    case 'range': return 'schedule'
    case 'slot': return 'view_module'
    default: return 'help'
  }
}

function toggleExistingSlot(index: number, slotValue: string) {
  const list = selectedCellDispos.value
  if (!list[index]) return
  
  const currentSlots = list[index].slots || []
  const newSlots = currentSlots.includes(slotValue) 
    ? currentSlots.filter(s => s !== slotValue)
    : [...currentSlots, slotValue]
  
  limitExistingSlots(index, newSlots)
}

// === FONCTIONS GESTION ÉDITION LIGNE ===

function getTypeText(type: string | undefined): string {
  const typeOpt = typeOptions.find(opt => opt.value === type)
  return typeOpt?.text || type || 'Non défini'
}

function getSlotText(slots: string[] = []): string {
  if (slots.length === 0) return 'Aucun créneau'
  const slotNames = slots.map(slot => {
    const slotOpt = slotOptions.find(opt => opt.value === slot)
    return slotOpt?.text || slot
  })
  return slotNames.join(', ')
}

function editDispoLine(index: number) {
  if (editingDispoIndex.value === index) {
    // Si on clique sur la ligne déjà en cours d'édition, annuler
    cancelEditDispo()
    return
  }
  
  const dispo = selectedCellDispos.value[index]
  if (!dispo) return
  
  editingDispoIndex.value = index
  isAddingNewDispo.value = false
  editingDispo.value = { ...dispo }
}

function addNewDispoLine() {
  console.log('🆕 Ajout nouvelle ligne de disponibilité')
  editingDispoIndex.value = null
  isAddingNewDispo.value = true
  editingDispo.value = {
    type: 'disponible',
    timeKind: 'full-day',
    heure_debut: '09:00',
    heure_fin: '17:00',
    lieu: '',
    slots: []
  }
  console.log('📝 État initial du formulaire:', editingDispo.value)
}

function cancelEditDispo() {
  editingDispoIndex.value = null
  isAddingNewDispo.value = false
  editingDispo.value = {
    type: 'disponible',
    timeKind: 'full-day',
    heure_debut: '09:00',
    heure_fin: '17:00',
    lieu: '',
    slots: []
  }
}

function setEditingType(type: string) {
  editingDispo.value.type = type as Disponibilite['type']
  // Reset timeKind si incompatible
  if (type === 'indisponible') {
    editingDispo.value.timeKind = 'full-day'
  }
}

function setEditingTimeKind(timeKind: string) {
  editingDispo.value.timeKind = timeKind as Disponibilite['timeKind']
  // Reset aux valeurs par défaut
  if (timeKind === 'full-day') {
    editingDispo.value.heure_debut = '00:00'
    editingDispo.value.heure_fin = '23:59'
    editingDispo.value.slots = []
  } else if (timeKind === 'range') {
    editingDispo.value.heure_debut = '09:00'
    editingDispo.value.heure_fin = '17:00'
    editingDispo.value.slots = []
  } else if (timeKind === 'slot') {
    editingDispo.value.slots = []
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
  }
}

function toggleEditingSlot(slotValue: string) {
  const currentSlots = editingDispo.value.slots || []
  editingDispo.value.slots = currentSlots.includes(slotValue)
    ? currentSlots.filter(s => s !== slotValue)
    : [...currentSlots, slotValue]
}

const isEditFormValid = computed(() => {
  const dispo = editingDispo.value
  console.log('🔍 Validation formulaire:', dispo)
  
  if (!dispo.type || !dispo.timeKind) {
    console.log('❌ Type ou timeKind manquant')
    return false
  }
  
  if (dispo.timeKind === 'range') {
    if (!dispo.heure_debut || !dispo.heure_fin) {
      console.log('❌ Heures manquantes pour range')
      return false
    }
  }
  
  if (dispo.timeKind === 'slot') {
    if (!dispo.slots || dispo.slots.length === 0) {
      console.log('❌ Créneaux manquants pour slot')
      return false
    }
  }
  
  if (dispo.type === 'mission' && !dispo.lieu) {
    console.log('❌ Lieu manquant pour mission')
    return false
  }
  
  console.log('✅ Formulaire valide')
  return true
})

function saveEditDispo() {
  console.log('💾 Tentative de sauvegarde:', editingDispo.value)
  console.log('✅ Formulaire valide:', isEditFormValid.value)
  
  if (!isEditFormValid.value) {
    console.log('❌ Formulaire invalide, abandon')
    return
  }
  
  const newDispo = sanitizeDisposition(editingDispo.value) as Disponibilite
  console.log('🧹 Dispo assainie:', newDispo)
  
  if (isAddingNewDispo.value) {
    console.log('➕ Ajout de nouvelle ligne')
    // Ajouter nouvelle ligne
    const temp = [...selectedCellDispos.value, newDispo]
    if (wouldConflict(temp)) {
      const msg = getConflictMessage(temp) || 'Conflit: combinaison invalide pour cette journée.'
      notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
      return
    }
    selectedCellDispos.value.push(newDispo)
    console.log('✅ Ligne ajoutée avec succès')
  } else {
    console.log('✏️ Modification ligne existante')
    // Modifier ligne existante
    const index = editingDispoIndex.value!
    const temp = selectedCellDispos.value.slice()
    temp[index] = newDispo
    if (wouldConflict(temp)) {
      const msg = getConflictMessage(temp) || 'Conflit: combinaison invalide pour cette journée.'
      notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
      return
    }
    selectedCellDispos.value[index] = newDispo
    console.log('✅ Ligne modifiée avec succès')
  }
  
  cancelEditDispo()
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
    console.log('✅ Batch commit réussi')

    // Rafraîchir le planning pour s'assurer que toutes les données sont à jour
    console.log('🔄 Début refresh planning...')
    await refreshDisponibilites(true) // true = vider le cache et recharger complètement
    console.log('✅ Refresh planning terminé')

    showDispoModal.value = false
    selectedCell.value = null
    selectedCellDispos.value = []
    
    // Notification de succès
    notify({ 
      message: 'Disponibilité sauvegardée avec succès', 
      color: 'success',
      position: 'top-right',
      duration: 3000
    })
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
  const centerOffset = Math.max(0, idx * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
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
  const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
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
    loadingCollaborateurs.value = true
    
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const collaborateursData = await CollaborateursServiceV2.loadCollaborateursFromImport(tenantId)
    
    allCollaborateurs.value = collaborateursData.map((collab: any) => ({
      id: collab.id,
      nom: collab.nom,
      prenom: collab.prenom,
      metier: collab.metier || '',
      phone: collab.phone || '',
      email: collab.email || '',
      ville: collab.ville || '',
      color: collab.color || '#666',
      tenantId: collab.tenantId,
      createdAt: collab.createdAt,
      updatedAt: collab.updatedAt
    }))
    
    collaborateurs.value = allCollaborateurs.value
    loadingCollaborateurs.value = false
    console.log(`✅ ${collaborateursData.length} collaborateurs chargés`)

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
  const colsNeeded = Math.ceil(missingPx / dayWidth.value)
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
  const firstVisibleIdx = Math.floor(scrollLeft / dayWidth.value)
  const lastVisibleIdx = Math.min(totalCols - 1, Math.floor((scrollLeft + clientWidth) / dayWidth.value))

  // Réserves en jours pour un scroll fluide (augmentées): cible 150 (~5 mois), mini 90 (~3 mois)
  const targetLeftReserve = 150
  const minLeftReserve = 90
  const targetRightReserve = 150
  const minRightReserve = 90

    // GAUCHE: si la réserve visuelle est basse, pré-précharger en un bloc
    const leftReserve = firstVisibleIdx
    if (leftReserve < minLeftReserve && !extending.value) {
      extending.value = true
  const beforeWidth = loadedDays.value.length * dayWidth.value
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
          const afterWidth = loadedDays.value.length * dayWidth.value
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

function formatDateLong(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// Repositionne les overlays de hover en se basant sur la dernière position pointeur, utile pendant un scroll sans mousemove
function updateHoverOnScroll(scroller: HTMLElement) {
  if (!_lastPointerX && !_lastPointerY) return
  const rect = scroller.getBoundingClientRect()
  const xContent = _lastPointerX - rect.left + scroller.scrollLeft
  const gridLeft = (gridLeftBodyPx.value || (stickyLeftWidth.value + 1))
  const pitch = dayPitchBodyPx.value || (dayWidth.value + 1)
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
  const firstVisibleIdx = Math.floor(scroller.scrollLeft / dayWidth.value)
  if (firstVisibleIdx <= leftBufferDays) return
  const removeCount = firstVisibleIdx - leftBufferDays
  if (removeCount <= 0) return

  // Supprimer les premiers jours et ajuster le scroll pour éviter le saut
  loadedDays.value.splice(0, removeCount)
  scroller.scrollLeft -= removeCount * dayWidth.value
  // Ne pas toucher aux plages chargées: on conserve l'information pour éviter de re-fetch
}

// Symétrique: décharger visuellement les jours lointains à droite sans vider le cache
function pruneFutureIfFar(scroller: HTMLElement) {
  const rightBufferDays = 150 // garder ~5 mois de tampon à droite
  const totalCols = loadedDays.value.length
  const lastVisibleIdx = Math.min(totalCols - 1, Math.floor((scroller.scrollLeft + scroller.clientWidth) / dayWidth.value))
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
  const pitch = dayPitchBodyPx.value || (dayWidth.value + 1)
  const x = todayIdx * pitch
  scroller.style.setProperty('--today-x-local', `${x}px`)
}
  
  // Plus besoin de forcer les z-index, gérés par les props de la modale
  watch(() => showDispoModal.value, () => {
    // Réservé pour logique future si nécessaire
  })

// ===== NOUVELLES FONCTIONNALITÉS =====

// Gestion du scroll infini (version simplifiée)
async function setupInfiniteScroll() {
  try {
    // Pour l'instant, on utilise le système existant
    console.log('✅ Infinite scroll configuré (utilise le système existant)')
  } catch (error) {
    console.error('❌ Erreur configuration infinite scroll:', error)
  }
}

// Gestion des interactions planning (version simplifiée)
async function setupPlanningInteractions() {
  try {
    // Pour l'instant, on gère localement
    console.log('✅ Interactions planning configurées (gestion locale)')
  } catch (error) {
    console.error('❌ Erreur configuration interactions:', error)
  }
}

// Nouvelle fonction de gestion de clic de cellule
function handleCellClickNew(collaborateurId: string, date: string, event: MouseEvent) {
  const cellId = `${collaborateurId}-${date}`
  
  // Si Ctrl/Cmd est maintenu (mode sélection multiple) - AUCUNE modale ne doit s'ouvrir
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    event.stopPropagation()
    
    console.log('=== MODE MULTISELECT - AUCUNE MODALE ===')
    console.log('Clic sur:', cellId)
    console.log('Selection avant:', Array.from(selectedCells.value))
    
    // Vérifier si on change de collaborateur
    const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
    console.log('Collaborateur actuel:', currentSelectedCollaborateur)
    console.log('Nouveau collaborateur:', collaborateurId)
    
    if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
      console.log('CHANGEMENT DE COLLABORATEUR - Vidage de la selection')
      selectedCells.value.clear()
    }
    
    // Toggle la sélection
    if (selectedCells.value.has(cellId)) {
      selectedCells.value.delete(cellId)
      console.log('DESELECTION de:', cellId)
    } else {
      selectedCells.value.add(cellId)
      console.log('SELECTION de:', cellId)
    }
    
    // Forcer la réactivité
    selectedCells.value = new Set(selectedCells.value)
    console.log('Selection apres:', Array.from(selectedCells.value))
    console.log('Total:', selectedCells.value.size)
    console.log('========================')
    
  } else {
    // Clic normal 
    console.log('=== CLIC NORMAL SUR CELLULE ===')
    console.log('Cellule:', cellId)
    console.log('Selection active:', selectedCells.value.size > 0)
    console.log('Mode selection:', isSelectionMode.value)
    
    // Désactiver le mode sélection pour un clic normal
    isSelectionMode.value = false
    
    // Si il y a une sélection active, la vider mais permettre l'ouverture de la modale
    if (selectedCells.value.size > 0) {
      selectedCells.value.clear()
      console.log('Selection videe par clic normal')
    }
    
    // Toujours ouvrir la modale pour un clic normal
    console.log('Ouverture de la modale pour:', collaborateurId, date)
    openModalForCollaborateur(collaborateurId, date)
  }
}

// Vider la sélection
function clearSelection() {
  selectedCells.value.clear()
  selectedCells.value = new Set() // Déclencher la réactivité
  console.log('🧹 Sélection vidée')
}

// Obtenir le collaborateur actuellement sélectionné (s'il y en a un)
function getCurrentSelectedCollaborateur(): string | null {
  if (selectedCells.value.size === 0) return null
  
  // Prendre la première cellule sélectionnée pour déterminer le collaborateur
  const firstCellId = Array.from(selectedCells.value)[0]
  // L'ID du collaborateur est tout sauf les 11 derniers caractères (date: -YYYY-MM-DD)
  return firstCellId.slice(0, -11)
}

// Gestion du clic-glisser pour la sélection multiple
function handleCellMouseDown(collaborateurId: string, date: string, event: MouseEvent) {
  console.log('🖱️ MouseDown sur cellule:', collaborateurId, date, 'Ctrl/Cmd:', event.ctrlKey || event.metaKey)
  
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    
    // Vérifier si on change de collaborateur
    const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
    console.log('🔍 getCurrentSelectedCollaborateur:', currentSelectedCollaborateur)
    console.log('📋 Comparaison:', {current: currentSelectedCollaborateur, nouveau: collaborateurId})
    
    if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
      // Changer de collaborateur : vider la sélection actuelle
      selectedCells.value.clear()
      console.log('🔄 Drag - Changement de collaborateur - sélection vidée')
    }
    
    isDraggingSelection.value = true
    dragStartCell.value = `${collaborateurId}-${date}`
    
    // Sélectionner/désélectionner la cellule de départ
    const cellId = `${collaborateurId}-${date}`
    if (selectedCells.value.has(cellId)) {
      selectedCells.value.delete(cellId)
      console.log('🔹 Cellule désélectionnée:', cellId)
    } else {
      selectedCells.value.add(cellId)
      console.log('🔸 Cellule sélectionnée:', cellId)
    }
    selectedCells.value = new Set(selectedCells.value)
    console.log('🖱️ Début drag sélection sur:', cellId)
  }
}

function handleCellMouseEnter(collaborateurId: string, date: string) {
  if (isDraggingSelection.value) {
    console.log('🔄 MouseEnter during drag:', collaborateurId, date)
    const cellId = `${collaborateurId}-${date}`
    
    // Vérifier qu'on reste sur le même collaborateur
    const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
    console.log('🔍 getCurrentSelectedCollaborateur:', dragStartCell.value, '=>', currentSelectedCollaborateur)
    console.log('📋 Comparaison:', {current: currentSelectedCollaborateur, nouveau: collaborateurId})
    
    if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
      // Ne pas sélectionner si on change de collaborateur
      console.log('❌ Changement de collaborateur interdit pendant drag')
      return
    }
    
    // Ajouter à la sélection pendant le glissement
    if (!selectedCells.value.has(cellId)) {
      selectedCells.value.add(cellId)
      selectedCells.value = new Set(selectedCells.value)
      console.log('➕ Ajout cellule au drag:', cellId)
    } else {
      console.log('⚪ Cellule déjà sélectionnée:', cellId)
    }
  }
}

function handleCellMouseUp() {
  if (isDraggingSelection.value) {
    isDraggingSelection.value = false
    dragStartCell.value = null
    console.log('🏁 Fin drag sélection')
  }
}

// Gestionnaire global pour arrêter le glissement si on sort de la zone
function handleGlobalMouseUp() {
  if (isDraggingSelection.value) {
    isDraggingSelection.value = false
    dragStartCell.value = null
    console.log('🖱️ Sélection par glisser interrompue')
  }
}

// Gestion de la création par lot
async function handleBatchCreate(data: any) {
  console.log('✅ Lot créé', data)
  
  // Ajouter immédiatement les nouvelles disponibilités au cache local
  for (const date of data.dates) {
    const existingDispos = disponibilitesCache.value.get(date) || []
    
    // Créer la nouvelle disponibilité pour le cache local
    const newDispo: any = {
      id: `temp-${Date.now()}-${Math.random()}`, // ID temporaire
      collaborateurId: data.collaborateur.id,
      nom: data.collaborateur.nom,
      prenom: data.collaborateur.prenom,
      metier: data.collaborateur.metier || '',
      phone: data.collaborateur.phone || '',
      email: data.collaborateur.email || '',
      ville: data.collaborateur.ville || '',
      date: date,
      lieu: data.dispoData.lieu || '',
      heure_debut: data.dispoData.heureDebut || '',
      heure_fin: data.dispoData.heureFin || '',
      type: data.dispoData.type,
      timeKind: data.dispoData.timeKind,
      isFullDay: data.dispoData.timeKind === 'full_day',
      slots: [],
      tenantId: 'keydispo'
    }
    
    console.log(`💾 Ajout au cache local pour ${date}:`, newDispo)
    
    // Ajouter au cache local
    disponibilitesCache.value.set(date, [...existingDispos, newDispo])
    
    console.log(`📊 Cache après ajout pour ${date}:`, disponibilitesCache.value.get(date)?.length, 'dispos')
  }
  
  // Fermer le modal et vider la sélection
  batchModalOpen.value = false
  clearSelection()
  
  // Actualiser les lieux après ajout
  updateLieuxOptions()
  
  notify({
    message: `✅ Disponibilités créées avec succès`,
    color: 'success'
  })
  
  // Effectuer un refresh en arrière-plan pour synchroniser avec les vrais IDs Firestore
  setTimeout(async () => {
    console.log('🔄 Refresh automatique après batch (sans vider le cache)...')
    await refreshDisponibilites(false) // false = ne pas vider le cache
  }, 500)
}

async function refreshDisponibilites(clearCache = true) {
  console.log(`🔄 Actualisation du planning... (clearCache: ${clearCache})`)
  try {
    if (clearCache) {
      // Vider le cache pour forcer le rechargement
      console.log('📤 Vidage du cache disponibilités...')
      disponibilitesCache.value.clear()
      
      // Reset de l'état de chargement des ranges
      console.log('🔄 Reset des ranges chargées...')
      loadedDateRanges.value = []
    } else {
      console.log('💾 Conservation du cache existant pour sync en arrière-plan...')
    }
    
    // Recharger les données pour la période visible
    console.log(`📊 visibleDays.value.length: ${visibleDays.value.length}`)
    if (visibleDays.value.length > 0) {
      const dateDebut = visibleDays.value[0].date
      const dateFin = visibleDays.value[visibleDays.value.length - 1].date
      
      console.log(`📥 Rechargement des données ${dateDebut} → ${dateFin}...`)
      await generateDisponibilitesForDateRange(dateDebut, dateFin)
      
      console.log('🏷️ Mise à jour des lieux...')
      updateLieuxOptions() // Fonction synchrone, pas besoin d'await
      
      console.log(`✅ Cache actualisé: ${disponibilitesCache.value.size} jours en cache`)
    } else {
      console.log('⚠️ Aucun jour visible, impossible de recharger')
    }
    
    console.log('✅ Planning actualisé avec succès')
  } catch (error) {
    console.error('❌ Erreur actualisation:', error)
  }
}

// Sauvegarde par lot avec gestion de version
// Obtenir la couleur d'un collaborateur
function getCollaborateurColor(collaborateurId: string): string {
  const collaborateur = collaborateurs.value.find(c => c.id === collaborateurId)
  return collaborateur?.color || '#666'
}

// Vérifier si une cellule est verrouillée
function isCellLocked(collaborateurId: string, date: string): boolean {
  const cellId = `${collaborateurId}-${date}`
  const lock = cellLocks.value.get(cellId)
  if (!lock) return false
  
  // Vérifier si le verrou n'a pas expiré
  return Date.now() < lock.expiresAt
}

// Obtenir les informations de verrou d'une cellule
function getCellLockInfo(collaborateurId: string, date: string) {
  const cellId = `${collaborateurId}-${date}`
  return cellLocks.value.get(cellId)
}

// Extraction des données des cellules sélectionnées pour le modal par lot
const extractDatesFromSelection = computed(() => {
  const dates = new Set<string>()
  selectedCells.value.forEach(cellId => {
    // La date est les 10 derniers caractères (YYYY-MM-DD)
    const date = cellId.slice(-10)
    if (date) dates.add(date)
  })
  return Array.from(dates).sort()
})

const extractCollaborateurFromSelection = computed(() => {
  // Si toutes les cellules sélectionnées sont du même collaborateur, on le retourne
  const collaborateurIds = new Set<string>()
  selectedCells.value.forEach(cellId => {
    // L'ID du collaborateur est tout sauf les 11 derniers caractères (date: -YYYY-MM-DD)
    const collaborateurId = cellId.slice(0, -11)
    if (collaborateurId) collaborateurIds.add(collaborateurId)
  })
  
  // Retourner l'objet collaborateur seulement s'il n'y en a qu'un seul
  if (collaborateurIds.size === 1) {
    const collaborateurId = Array.from(collaborateurIds)[0]
    return collaborateurs.value.find(c => c.id === collaborateurId) || null
  }
  return null
})

// === Gestion du modal d'informations collaborateur ===

const openCollaborateurInfo = async (collaborateur: Collaborateur) => {
  try {
    // Récupérer toutes les disponibilités du collaborateur pour les jours visibles
    const dispos: any[] = []
    for (const day of visibleDays.value) {
      const dayDispos = getDisponibilites(collaborateur.id, day.date)
      dispos.push(...dayDispos)
    }
    
    collaborateurInfoModal.value = {
      open: true,
      collaborateur,
      dispos,
      color: getCollaborateurColor(collaborateur.id)
    }
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du modal collaborateur:', error)
    notify({
      message: 'Erreur lors du chargement des informations du collaborateur',
      color: 'danger'
    })
  }
}

const handleEditCollaborateur = (collaborateur: Collaborateur) => {
  // TODO: Rediriger vers la page d'édition du collaborateur ou ouvrir un modal d'édition
  console.log('Édition du collaborateur:', collaborateur)
  notify({
    message: `Édition de ${collaborateur.prenom} ${collaborateur.nom}`,
    color: 'info'
  })
}

const handleSaveCollaborateurNotes = async (collaborateur: Collaborateur, notes: string) => {
  try {
    // TODO: Sauvegarder les notes via le service de collaborateurs
    // Pour l'instant, on simule la sauvegarde car le type CollaborateurV2 peut ne pas avoir notes
    console.log('Sauvegarde des notes pour', collaborateur.nom, ':', notes)
    
    // Mettre à jour localement
    const index = collaborateurs.value.findIndex(c => c.id === collaborateur.id)
    if (index !== -1) {
      collaborateurs.value[index].notes = notes
    }
    
    notify({
      message: 'Notes sauvegardées avec succès',
      color: 'success'
    })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des notes:', error)
    notify({
      message: 'Erreur lors de la sauvegarde des notes',
      color: 'danger'
    })
  }
}

onMounted(async () => {
  generateInitialDays()
  await loadCollaborateursFromFirebase()
  
  // Initialiser les nouveaux services
  await setupInfiniteScroll()
  await setupPlanningInteractions()
  
  // Gestionnaires d'événements clavier pour la sélection par lot
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  document.addEventListener('blur', () => isSelectionMode.value = false)
  
  // Gestionnaire global pour le clic-glisser
  document.addEventListener('mouseup', handleGlobalMouseUp)
  
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
    
    // Détecter et corriger automatiquement les missions overnight existantes (silencieux)
    // Seulement si des données sont chargées et qu'il y a potentiellement des missions à corriger
    if (disponibilitesCache.value.size > 0) {
      detectAndFixExistingOvernightMissions().catch(console.error)
    }
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
  const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - 300) / 2)
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
  
  // Nettoyer les gestionnaires d'événements de sélection par lot
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  document.body.classList.remove('selection-mode')
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
/* Modal design mobile-first (style unifié) */
.dispo-modal-mobile {
  padding: 12px;
  max-height: none;
  transition: all 0.3s ease;
}

/* En-tête détaillé (style batch) */
.dispo-header-detailed {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
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
  background: var(--va-primary);
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
  font-size: 18px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 4px 0;
}

.collaborateur-meta-large {
  font-size: 14px;
  color: var(--va-color-text-secondary);
  margin: 0;
}

.alert-overnight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--va-warning);
  color: white;
  border-radius: 6px;
  font-size: 12px;
  border-top: 1px solid var(--va-color-border);
  margin-top: 16px;
  padding-top: 16px;
}

/* Sections principales numérotées */
.form-section-primary {
  background: var(--va-color-background-element);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--va-color-border);
  transition: all 0.3s ease;
}

.section-title-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--va-primary);
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
  border: 1px solid var(--va-color-border);
  background: var(--va-color-background-secondary);
  transition: all 0.2s ease;
}

.dispo-overview-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dispo-overview-item.card-mission {
  border-left: 4px solid var(--va-primary);
  background: var(--va-color-primary-lighten5);
}

.dispo-overview-item.card-dispo {
  border-left: 4px solid var(--va-success);
  background: var(--va-color-success-lighten5);
}

.dispo-overview-item.card-indispo {
  border-left: 4px solid var(--va-danger);
  background: var(--va-color-danger-lighten5);
}

.dispo-overview-item.editing-highlight {
  border: 2px solid var(--va-warning) !important;
  background: var(--va-color-warning-lighten5) !important;
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
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
  color: var(--va-color-text-primary);
}

.editing-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 2px 8px;
  background: var(--va-warning);
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
  color: var(--va-color-text-secondary);
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
  background: var(--va-color-success-lighten5) !important;
  border: 2px solid var(--va-success) !important;
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
  border-top: 1px solid var(--va-success);
  margin-top: 12px;
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

.subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.subsection-title::before {
  content: '';
  width: 4px;
  height: 4px;
  background: var(--va-primary);
  border-radius: 50%;
}

/* Boutons de type pleine largeur (style batch) */
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
  color: var(--va-primary);
  border: 1px solid var(--va-primary);
}

.type-btn-full[color="success"] {
  background: var(--va-success);
  color: white;
  border-color: var(--va-success);
}

.type-btn-full[color="danger"] {
  background: var(--va-danger);
  color: white;
  border-color: var(--va-danger);
}

.type-btn-full[color="primary"] {
  background: var(--va-primary);
  color: white;
  border-color: var(--va-primary);
}

/* Sections spécialisées */
.lieu-field-mobile {
  width: 100%;
  margin-bottom: 8px;
}

.time-section {
  margin-top: 12px;
}

.time-subtitle {
  font-size: 12px;
  font-weight: 500;
  color: var(--va-color-text-secondary);
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.time-fields-mobile {
  display: flex;
  gap: 8px;
}

.time-field-mobile {
  flex: 1;
}

/* Section créneaux */
.slots-section {
  margin-top: 12px;
}

.slots-grid-mobile {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.slot-option-mobile {
  border: 1px solid var(--va-primary);
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
  color: var(--va-primary);
}

.slot-option-mobile:hover {
  border-color: var(--va-success);
  background: var(--va-color-success-lighten5);
  transform: translateY(-1px);
  color: var(--va-success);
}

.slot-option-mobile.active {
  border-color: var(--va-success);
  background: var(--va-success);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.slot-label {
  font-weight: 600;
  line-height: 1.2;
}

/* Section suppression */
.delete-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--va-color-border);
}

.delete-btn-mobile-full {
  width: 100%;
  justify-content: center;
}

/* Message vide */
.no-dispos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
  color: var(--va-color-text-secondary);
  padding: 32px 16px;
  border: 2px dashed var(--va-color-border);
  border-radius: 8px;
  background: var(--va-color-background-secondary);
}

/* Container du bouton d'ajout */
.add-line-container {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.add-line-btn-mobile {
  min-width: 150px;
}

/* Container du bouton d'ajout en bas */
.add-line-container-bottom {
  display: flex;
  justify-content: center;
  margin: 16px 0 8px 0;
  padding: 12px;
  border-top: 1px solid var(--va-color-border);
  background: var(--va-color-background-secondary);
  border-radius: 8px;
}

/* Actions principales */
.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--va-color-border);
  margin-top: 8px;
}

.actions .va-button {
  min-width: 120px;
}

/* Suppression du fond noir/overlay */
:deep(.va-modal__overlay) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  background: transparent !important;
  backdrop-filter: none !important;
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

/* Barre de statut de sélection moderne */
.selection-status-bar {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(14, 131, 136, 0.95);
  backdrop-filter: blur(8px);
  color: white;
  padding: 12px 20px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  z-index: 999;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideInDown 0.3s ease-out;
  max-width: 90vw;
}

.selection-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selection-icon {
  color: rgba(255, 255, 255, 0.9);
}

.selection-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Aide contextuelle discrète */
.selection-help-tooltip {
  position: fixed;
  bottom: 80px;
  right: 20px;
  background: rgba(107, 114, 128, 0.9);
  backdrop-filter: blur(6px);
  color: white;
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 12px;
  z-index: 998;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: fadeIn 0.5s ease-out;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.selection-help-tooltip kbd {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
}

.clear-selection-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: white !important;
  border-radius: 50% !important;
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.clear-selection-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: scale(1.1);
}

@keyframes slideInDown {
  from {
    transform: translateX(-50%) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.clear-selection-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
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

.collaborateur-name.clickable-name {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.collaborateur-name.clickable-name:hover {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
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

/* Cellule sélectionnée pour la sélection par lot */
.excel-cell.selected {
  background-color: rgba(59, 130, 246, 0.15);
  border: 2px solid #3b82f6;
  box-shadow: inset 0 0 0 1px #3b82f6;
}

.excel-cell.selected::after {
  content: '✓';
  position: absolute;
  top: 2px;
  right: 4px;
  color: #3b82f6;
  font-weight: bold;
  font-size: 12px;
  background: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* Effet hover pour les cellules pendant la sélection */
.excel-cell:hover {
  background-color: rgba(59, 130, 246, 0.05);
}

.excel-cell.selected:hover {
  background-color: rgba(59, 130, 246, 0.25);
}

/* Mode sélection : curseur crosshair */
body.selection-mode .excel-cell {
  cursor: crosshair !important;
}

body.selection-mode .excel-cell:hover {
  background-color: rgba(59, 130, 246, 0.1) !important;
  border: 1px dashed #3b82f6;
}

/* Pendant le glissement, désactiver la sélection de texte */
body.dragging-selection {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

body.dragging-selection .excel-cell {
  cursor: crosshair !important;
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
  background: #4caf50; /* vert pour disponible */
}

.dispo-bar-unavailable {
  background: #f44336; /* rouge pour indisponible */
}

.dispo-bar-mission {
  background: #1976d2; /* bleu uniforme pour toutes les missions */
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

/* Quick Add compact et lisible */
.quick-add-ultra-compact {
  position: fixed;
  z-index: 1001;
  width: 320px;
  max-width: calc(100vw - 20px);
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  padding: 16px;
  font-size: 13px;
  animation: quickFadeIn 0.2s ease-out;
}

/* Header lisible */
.quick-mini-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.quick-mini-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
}

.quick-mini-close {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.quick-mini-close:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Alerte overnight lisible */
.quick-mini-alert {
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  text-align: center;
  border: 1px solid #f59e0b;
}

/* Types en ligne lisibles */
.quick-types-inline {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.quick-type-mini {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  min-height: 50px;
}

.quick-type-mini:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.quick-type-mini.active {
  background: var(--va-primary);
  color: white;
  border-color: var(--va-primary);
  box-shadow: 0 3px 12px rgba(59, 130, 246, 0.3);
}

/* Format horaire lisible */
.quick-time-inline {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.quick-time-mini {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  min-height: 40px;
}

.quick-time-mini:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.quick-time-mini.active {
  background: var(--va-success);
  color: white;
  border-color: var(--va-success);
  box-shadow: 0 3px 10px rgba(34, 197, 94, 0.3);
}

/* Champs lisibles */
.quick-fields-compact {
  margin-bottom: 12px;
}

.quick-lieu-mini {
  width: 100%;
  margin-bottom: 8px;
}

.quick-time-mini-fields {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.quick-time-mini-input {
  flex: 1;
  min-width: 0;
}

.time-separator {
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
}

.quick-slots-mini {
  width: 100%;
}

/* Actions lisibles */
.quick-actions-mini {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

.quick-btn-mini {
  flex: 1;
  min-height: 36px !important;
  border-radius: 10px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  padding: 0 12px !important;
}

.quick-btn-add {
  flex: 2;
}

/* Personnalisation des composants Vuestic lisibles */
:deep(.quick-lieu-mini .va-input-wrapper) {
  min-height: 36px;
}

:deep(.quick-lieu-mini .va-input) {
  font-size: 13px;
  padding: 8px 12px;
}

:deep(.quick-time-mini-input .va-input-wrapper) {
  min-height: 34px;
}

:deep(.quick-time-mini-input .va-input) {
  font-size: 12px;
  padding: 6px 10px;
}

:deep(.quick-slots-mini .va-input-wrapper) {
  min-height: 36px;
}

:deep(.quick-slots-mini .va-input) {
  font-size: 13px;
  padding: 8px 12px;
}

@keyframes quickFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Responsive ultra-compact */
@media (max-width: 480px) {
  .quick-add-ultra-compact {
    width: calc(100vw - 12px);
    left: 6px !important;
    font-size: 10px;
  }
  
  .quick-types-inline {
    flex-direction: column;
    gap: 3px;
  }
  
  .quick-type-mini {
    flex-direction: row;
    justify-content: center;
    gap: 4px;
  }
  
  .quick-time-inline {
    flex-direction: column;
    gap: 2px;
  }
  
  .quick-time-mini {
    flex-direction: row;
    justify-content: center;
    gap: 3px;
  }
}

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

/* Bouton flottant de sélection par lot */
.batch-action-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 8px 12px;
  border-radius: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .batch-action-fab {
    bottom: 80px; /* Au-dessus de la navigation mobile éventuelle */
    right: 10px;
    left: 10px;
    justify-content: center;
  }
}

/* Bouton flottant pour corriger les missions overnight */
.overnight-fix-fab {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  background: white;
  border-radius: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.overnight-fix-fab:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .overnight-fix-fab {
    top: 60px;
    right: 10px;
  }
}

/* === POPUP CONTEXTUEL === */

/* Container principal du popup d'ajout rapide */
.quick-add-footer {
  position: fixed;
  background: var(--va-background-primary);
  border: 1px solid var(--va-color-border);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  font-family: var(--kd-font);
  animation: popupAppear 0.2s ease-out;
  transform-origin: top left;
  padding: 12px;
}

@keyframes popupAppear {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Handle pour indiquer qu'on peut glisser */
.quick-footer-handle {
  display: flex;
  justify-content: center;
  padding: 8px;
  margin: -12px -12px 12px -12px;
  background: var(--va-color-background-element);
  border-bottom: 1px solid var(--va-color-border);
}

.handle-bar {
  width: 40px;
  height: 4px;
  background: var(--va-color-text-secondary);
  border-radius: 2px;
  opacity: 0.3;
}

@keyframes slideUpFromBottom {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* En-tête du footer */
.quick-footer-header {
  background: var(--dark-surface-secondary);
  padding: 16px 20px;
  border-bottom: 1px solid var(--dark-border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-footer-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--dark-text-primary);
}

.quick-footer-subtitle {
  font-size: 14px;
  color: var(--dark-text-secondary);
  margin: 4px 0 0 0;
}

/* Contenu du formulaire */
.quick-footer-content {
  padding: 20px;
  background: var(--dark-surface);
}

/* Grille responsive des champs */
.quick-form-grid {
  display: grid;
  gap: 16px;
}

/* 2 colonnes sur tablet+ */
@media (min-width: 768px) {
  .quick-form-grid {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  
  .quick-field-full {
    grid-column: 1 / -1;
  }
}

/* Champs du formulaire */
.quick-field-full {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--va-color-text-primary);
  margin-bottom: 4px;
}

/* Info du collaborateur et date - Style identique aux modales */
.quick-footer-info {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid var(--va-color-border);
}

.selected-cell-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collaborateur-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--va-primary);
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

.collaborateur-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 4px 0;
}

.selected-date {
  font-size: 14px;
  color: var(--va-color-text-secondary);
  margin: 0;
}

.overnight-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--va-warning);
  color: white;
  border-radius: 6px;
  font-size: 12px;
  border-top: 1px solid var(--va-color-border);
  margin-top: 16px;
  padding-top: 16px;
}

/* Contenu du formulaire - Style section primaire des modales */
.quick-footer-content {
  background: var(--va-color-background-element);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--va-color-border);
  transition: all 0.3s ease;
}

/* Boutons radio pour type */
.quick-type-selector {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.quick-radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 2px solid var(--va-color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--va-color-background-element);
  color: var(--va-color-text-primary);
}

.quick-radio-item.active {
  border-color: var(--va-primary);
  background: color-mix(in srgb, var(--va-primary) 15%, var(--va-color-background-element));
  color: var(--va-primary);
}

.quick-radio-item input[type="radio"] {
  margin: 0;
}

/* Boutons radio pour timeKind */
.quick-timekind-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.timekind-btn {
  padding: 8px 16px;
  border: 1px solid var(--va-color-border);
  border-radius: 6px;
  background: var(--va-color-background-element);
  color: var(--va-color-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.timekind-btn.active {
  background: var(--va-primary);
  color: white;
  border-color: var(--va-primary);
}

.timekind-btn:hover:not(.active) {
  background: var(--va-color-background-secondary);
  border-color: var(--va-color-text-secondary);
}

/* Champs d'heure côte à côte */
.quick-time-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Actions du footer */
.quick-footer-actions {
  padding: 16px 0 0 0;
  border-top: 1px solid var(--va-color-border);
  background: transparent;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}

.action-btn {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  min-width: 120px;
  justify-content: center;
  font-family: var(--kd-font);
}

.cancel-btn {
  background: var(--va-color-background-secondary);
  color: var(--va-color-text-primary);
  border: 1px solid var(--va-color-border);
}

.cancel-btn:hover {
  background: var(--va-color-background-border);
}

.add-btn {
  background: var(--va-success);
  color: white;
}

.add-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--va-success) 90%, black);
}

.add-btn:disabled {
  background: var(--va-color-background-secondary);
  color: var(--va-color-text-secondary);
  cursor: not-allowed;
}

/* Responsive sur mobile - Popup adaptatif */
@media (max-width: 768px) {
  .quick-add-footer {
    width: calc(100vw - 32px);
    max-width: none;
    left: 16px !important;
    right: 16px;
    top: 50% !important;
    transform: translateY(-50%);
  }
  
  .quick-footer-content {
    padding: 8px;
  }
  
  .quick-footer-actions {
    padding: 12px 0 0 0;
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
    padding: 14px;
  }
  
  .quick-time-fields {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .quick-footer-info {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .selected-cell-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

/* Animation de fermeture */
.quick-add-footer.closing {
  animation: popupDisappear 0.2s ease-in forwards;
}

@keyframes popupDisappear {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* Harmonisation avec le design des modales */
.quick-add-footer .form-section-primary {
  background: var(--va-background-secondary);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.quick-add-footer .form-subsection {
  margin-bottom: 12px;
}

.quick-add-footer .subsection-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--va-text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.quick-add-footer .type-btn-full {
  width: 100%;
  margin-bottom: 6px;
}

.quick-add-footer .time-format-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.quick-add-footer .time-format-btn {
  flex: 1;
  min-width: 100px;
}

.quick-add-footer .time-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-add-footer .time-input {
  flex: 1;
}

.quick-add-footer .time-separator {
  color: var(--va-text-secondary);
  font-weight: 500;
}

.quick-add-footer .quick-footer-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--va-background-border);
}

.quick-add-footer .action-btn {
  min-width: 80px;
}
</style>
