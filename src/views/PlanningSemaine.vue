<template>
  <div class="planning-app" :class="{ 'collaborateur-light-theme': isCollaborateurInterface }">
    <!-- Header avec filtres compact (seulement pour admin) -->
    <FiltersHeaderCompact
      v-if="!isCollaborateurInterface"
    />

  <!-- Indicateur des filtres actifs supprimé sur demande -->

  <!-- Contenu principal -->
  <div class="main-content">
  <PlanningWarmupOverlay
    :show="isInitialLoad"
    :user-name="currentUserDisplayName"
  />
  <PlanningLoadingModal
    :show-modal="showLoadingModal"
    :loading-collaborateurs="loadingCollaborateurs"
    :loading-disponibilites="loadingDisponibilites"
    :fetching-ranges="fetchingRanges"
    :all-collaborateurs-count="planningData.filterStats.value.totalCollaborateurs"
    :visible-days-count="visibleDays.length"
  />

  <!-- Toast de chargement supprimé: trop de notifications -->

    <!-- Suggestions contextuelles -->
    <div v-if="suggestions.length" class="suggestions-compact">
      <va-icon name="lightbulb" size="12px" class="mr-1" />
      <span v-for="(s, i) in suggestions" :key="i" class="suggestion-item">{{ s }}</span>
    </div>

    <!-- Indicateur de chargement extension (compact) -->
    <div v-if="extending || (isBusy && !isInitialLoad)" class="extending-indicator-compact">
      <va-icon name="refresh" spin size="12px" />
      <span v-if="extending">Extension...</span>
      <span v-else-if="fetchingRanges">Chargement...</span>
      <span v-else>Sync...</span>
    </div>

    <!-- Indicateur de scroll rapide SUPPRIMÉ -->
    <!-- <div v-if="isScrollingFast" class="fast-scroll-indicator">
      <va-icon name="fast_forward" size="14px" />
      <span>Scroll rapide</span>
      <div class="buffer-info">Buffer étendu</div>
    </div> -->

    <!-- Indicateur de performance DOM Cache (dev mode) -->
    <div v-if="isDev && domCacheStatus.isValid" class="dom-cache-indicator">
      <va-icon name="memory" size="12px" />
      <span>Cache DOM: {{ domCacheStatus.elements }} éléments</span>
    </div>

    <!-- Badge d'environnement: émulateur local -->
    <div v-if="isEmulator" class="env-badge">
      Émulateur Firebase actif
    </div>

    <!-- Panneau d'état centralisé -->
    <div class="system-status-panel">
      <!-- Sync temps réel -->
      <div v-if="isRealtimeActive" class="status-item realtime" @click="showRealtimeStats">
        <va-icon name="sync" spin size="14px" />
        <span>Temps réel</span>
        <span class="count">{{ realtimeListeners.length }}</span>
      </div>

      <!-- Utilisateurs actifs sur le planning -->
      <div v-if="getActiveUsers().length > 0" class="status-item active-users">
        <va-icon name="visibility" size="14px" />
        <span>{{ getActiveUsers().length }} actif{{ getActiveUsers().length > 1 ? 's' : '' }}</span>
        
        <!-- Initiales des utilisateurs actifs -->
        <div class="active-user-avatars">
          <div 
            v-for="user in getActiveUsers().slice(0, 5)" 
            :key="user.userId"
            class="active-user-avatar"
            :style="{ backgroundColor: getUserColorWrapper(user.userId) }"
            :title="`${user.userName} - ${user.status}`"
          >
            {{ getUserInitials({ userEmail: user.userName }) }}
          </div>
          <div v-if="getActiveUsers().length > 5" class="active-user-avatar more">
            +{{ getActiveUsers().length - 5 }}
          </div>
        </div>
      </div>

      <!-- Utilisateurs connectés -->
      <div v-if="connectedUsers.length > 0" class="status-item users">
        <va-icon name="people" size="14px" />
        <span>{{ getUniqueUsersCount() }} utilisateur{{ getUniqueUsersCount() > 1 ? 's' : '' }}</span>
        <span v-if="getTotalSessionsCount() > getUniqueUsersCount()" class="count">
          {{ getTotalSessionsCount() }} sessions
        </span>
        
        <!-- Avatars simplifiés -->
        <div class="mini-avatars">
          <div 
            v-for="user in connectedUsers.slice(0, 4)" 
            :key="user.uid"
            class="mini-avatar"
            :style="{ backgroundColor: getUserColorWrapper(user.uid) }"
            :title="getUserStatusTooltip(user)"
          >
            {{ getUserInitials({ displayName: user.displayName }) }}
          </div>
          <div v-if="connectedUsers.length > 4" class="mini-avatar more">
            +{{ connectedUsers.length - 4 }}
          </div>
        </div>
      </div>

      <!-- Mode émulateur -->
      <div v-if="isEmulatorMode" class="status-item emulator">
        <va-icon name="developer_mode" size="14px" />
        <span>Émulateur</span>
        <va-button 
          size="small" 
          preset="plain" 
          icon="cleaning_services"
          @click="cleanupSessions"
          title="Nettoyer sessions expirées"
        />
      </div>
    </div>

    <!-- Aide contextuelle discrète -->
    <!-- Tooltip d'aide pour la sélection - ADMIN UNIQUEMENT -->
    <div v-if="!isCollaborateurInterface && !selectedCells.size && !isSelectionMode && !isDraggingSelection && !isMobileView" class="selection-help-tooltip">
      <va-icon name="info" size="14px" />
      <kbd>Ctrl</kbd>+glisser pour sélectionner
    </div>

    <!-- Planning Excel synchronisé - Scroll unique, sticky header + colonne -->
    <div class="excel-planning-container">
  
  <!-- Bouton flottant pour la sélection par lot - ADMIN UNIQUEMENT -->
  <div v-if="!isCollaborateurInterface && selectedCells.size > 0" class="batch-action-fab">
    <div class="fab-content">
      <va-button
        color="primary"
        icon="bolt"
        @click="openBatchModal"
        :size="isMobileView ? 'small' : 'medium'"
      >
        {{ isMobileView ? `Ajouter des dispos (${selectedCells.size})` : `Ajouter des dispos (${selectedCells.size})` }}
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

  <div class="excel-scroll" ref="planningScroll" :class="{ 
    panning: isPanning, 
    loading: isBusy,
    'fast-scrolling': isScrollingFast 
  }" @scroll="onScrollExtend" @mousemove="onGridMouseMove" @mouseleave="onGridMouseLeave" @mousedown="onPanStart" @touchstart="onTouchStart" :style="{ ...highlightStyles, '--day-width': dayWidth + 'px', '--sticky-left': stickyLeftWidth + 'px', '--day-pitch': (dayWidth + 1) + 'px' }" :aria-busy="isBusy">
        <!-- Ligne header sticky -->
        <div class="sticky-header-row">
          <!-- Overlays header: survol de colonne + aujourd'hui -->
          <!-- Plus d'overlay manuel - CSS pur -->
          <!-- <div class="column-hover-overlay-header" aria-hidden="true" ref="colHoverHeaderEl"></div> -->
          <!-- <div class="today-overlay-header" aria-hidden="true"></div> -->
          <!-- Pas d'overlay de séparateurs hebdomadaires: style uniquement via CSS sur dimanche -->
          <!-- Coin sticky top+left -->
          <div class="excel-corner corner-sticky">
            <!-- Bouton Aujourd'hui en haut -->
            <button 
              class="today-btn" 
              :class="{ disabled: !isTodayVisible }"
              :disabled="!isTodayVisible"
              @click="goToToday" 
              :title="isTodayVisible ? 'Aller à aujourd\'hui' : 'Aujourd\'hui n\'est pas visible avec les filtres actuels'"
            >
              <span class="material-icons">today</span>
              <span>Aujourd'hui</span>
            </button>
            <!-- Ligne de séparation -->
            <div class="corner-separator"></div>
            <!-- Titre et nombre en bas -->
            <div class="corner-bottom">
              <div class="corner-title">Collaborateurs</div>
              <div class="corner-count">{{ filteredCollaborateurs.length }}</div>
            </div>
          </div>
          <!-- En-têtes des jours (défilent horizontalement avec la grille, sticky vertical) -->
          <div class="days-header">
            <!-- Rangée des semaines avec nom du mois -->
            <div class="excel-weeks-row" :style="{ minWidth: gridMinWidth, width: 'max-content' }">
              <div
                v-for="(seg, segIndex) in weekSegments"
                :key="seg.key"
                class="excel-week-cell"
                :class="{
                  'month-boundary': isMonthBoundary(seg, segIndex)
                }"
                :style="{ width: `${dayWidth * seg.count}px` }"
              >
                {{ seg.monthLabel }} S{{ seg.week }}
              </div>
            </div>
            <div class="excel-days-row" :style="{ minWidth: gridMinWidth, width: 'max-content' }">
              <div class="days-window" :style="{ transform: `translateX(${windowOffsetPx}px)` }">
                <div
                  v-for="(day, dayIndex) in windowedDays"
                  :key="day.date"
                  class="excel-day-cell"
                  :data-day-index="windowStartIndex + dayIndex"
                  :class="[
                    `day-${day.dayOfWeek}`,
                    {
                      'today': day.isToday,
                      'loading-placeholder': !isDayLoaded(day.date)
                    },
                    ...getDayHeaderClasses(windowStartIndex + dayIndex)
                  ]"
                  :data-day-date="day.date"
                  :data-today="day.isToday ? 'true' : 'false'"
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
  <div class="excel-rows" :style="{ '--row-height': rowHeight + 'px', '--row-pitch': (rowHeight + 1) + 'px', height: gridTotalHeight }" ref="rowsRef">
          <!-- Plus d'overlays manuels - CSS pur -->
          <!-- <div class="row-hover-overlay" aria-hidden="true" ref="rowHoverEl"></div> -->
          <!-- Overlays verticaux (clipés sur la grille) et bande sticky du jour -->
          <div class="grid-overlay-clip" aria-hidden="true">
            <!-- <div class="column-hover-overlay" ref="colHoverEl"></div> -->
            <!-- <div class="today-overlay"></div> -->
          </div>
          <!-- <div class="today-overlay-left" aria-hidden="true"></div> -->
          
          <!-- Conteneur virtualisé des collaborateurs -->
          <div class="rows-window" :key="renderKey" :style="{ transform: `translateY(${rowWindowOffsetPx}px)` }">
            <div
              v-for="(collaborateur, rowIndex) in paginatedCollaborateurs"
              :key="collaborateur.id"
              class="excel-row"
              :data-collaborateur-id="collaborateur.id"
              :class="{
                'row-disabled': selectedCollaborateurId && selectedCollaborateurId !== collaborateur.id
              }"
              :style="{ 
                height: rowHeight + 'px',
                '--collaborateur-color': getCollaborateurColor(collaborateur.id)
              }"
            >
            <!-- Colonne gauche sticky -->
            <div 
              class="collab-sticky" 
              :data-row-index="rowIndex"
              :class="[
                getCollaborateurRowClasses(rowIndex),
                { 'loading-placeholder': loadingCollaborateurs || loadingDisponibilites }
              ]"
              :style="{ '--collaborateur-color': getCollaborateurColor(collaborateur.id) }"
            >
              <!-- Version normale -->
              <template v-if="!loadingCollaborateurs && !loadingDisponibilites">
                <div class="collaborateur-color-bar"></div>
                <div class="collaborateur-content">
                  <div class="collaborateur-info">
                    <div 
                      class="collaborateur-nom-complet clickable-name" 
                      @click="openCollaborateurInfo(collaborateur)"
                    >
                      <span class="nom">{{ collaborateur.nom }}</span>
                      <span class="prenom">{{ collaborateur.prenom }}</span>
                    </div>
                    <div class="collaborateur-metier" v-if="collaborateur.metier">{{ collaborateur.metier }}</div>
                  </div>
                  <div class="collaborateur-actions">
                    <a class="contact-icon phone-link" v-if="collaborateur.phone" :href="`tel:${phoneToHref(collaborateur.phone)}`" :title="`Appeler ${formatPhone(collaborateur.phone)}`">
                      <va-icon name="phone" />
                    </a>
                    <a class="contact-icon email-link" v-if="collaborateur.email" :href="`mailto:${collaborateur.email}`" :title="`Écrire à ${collaborateur.email}`">
                      <va-icon name="email" />
                    </a>
                  </div>
                </div>
              </template>

              <!-- Version skeleton pendant le chargement -->
              <template v-else>
                <div class="collaborateur-color-bar skeleton-bar"></div>
                <div class="collaborateur-content">
                  <div class="collaborateur-info">
                    <div class="collaborateur-nom-complet">
                      <div class="skeleton-text skeleton-nom"></div>
                      <div class="skeleton-text skeleton-prenom"></div>
                    </div>
                    <div class="skeleton-text skeleton-metier"></div>
                  </div>
                  <div class="collaborateur-actions">
                    <div class="skeleton-icon"></div>
                    <div class="skeleton-icon"></div>
                  </div>
                </div>
              </template>
            </div>
            <!-- Grille des jours -->
            <div class="excel-planning-row" :style="{ minWidth: gridMinWidth, width: 'max-content' }">
              <div class="days-window" :style="{ transform: `translateX(${windowOffsetPx}px)` }">
                <div
                  v-for="(day, dayIndex) in windowedDays"
                  :key="`${collaborateur.id}-${day.date}`"
                  class="excel-cell"
                  :data-day-date="day.date"
                  :data-day-index="windowStartIndex + dayIndex"
                  :data-row-index="rowIndex"
                  :data-cell-id="`${collaborateur.id}_${day.date}`"
                  :data-today="day.isToday ? 'true' : 'false'"
                  :data-initials="getHoveringUserInitials(collaborateur.id, day.date)"
                  :class="[
                    `day-${day.dayOfWeek}`,
                    {
                      'today': day.isToday,
                      'has-dispos': getCellDisposSorted(collaborateur.id, day.date).length > 0,
                      'loading-placeholder': !isDayLoaded(day.date),
                      'selected': selectedCells.has(`${collaborateur.id}-${day.date}`),
                      'locked': isCellLockedByOther(collaborateur.id, day.date),
                      'has-indicator': hasCellIndicator(collaborateur.id, day.date),
                      'has-presence': hasCellPresence(collaborateur.id, day.date)
                    },
                    getCellKindClass(collaborateur.id, day.date),
                    getCellLockClasses(collaborateur.id, day.date),
                    ...getCellClasses(windowStartIndex + dayIndex, rowIndex)
                  ]"
                  :style="{ 
                    width: dayWidth + 'px',
                    '--hovering-user-color': getHoveringUserColor(collaborateur.id, day.date)
                  }"
                  @click.stop="handleCellClickNew(collaborateur.id, day.date, $event)"
                  @mousedown.stop="handleCellMouseDown(collaborateur.id, day.date, $event)"
                  @mouseenter="handleCellMouseEnter(collaborateur.id, day.date)"
                  @mouseleave="handleCellHoverEnd()"
                  @mouseup="handleCellMouseUp()"
                >
                  <div v-if="isCellLockedByOther(collaborateur.id, day.date)" class="cell-lock-overlay">
                    <va-icon name="lock" class="lock-icon" />
                  </div>
                  <div class="dispo-bars" :class="getDispoBarsLayoutClass(collaborateur.id, day.date)">
                    <template v-for="dispo in getCellDisposSorted(collaborateur.id, day.date)" :key="`${(dispo as any).id || (dispo as any)._key || 'no-id'}-${collaborateur.id}-${day.date}`">
                      <div
                        class="dispo-card"
                        :class="[getDispoCardClass(dispo), getDispoContinuationClass(dispo, day.date)]"
                        :style="getDispoCardStyle(dispo)"
                        aria-label="Détail disponibilité"
                        :title="getDispoBarTitle(dispo as any, day.date)"
                        @click="onInnerDispoClick(dispo, collaborateur.id, day.date, $event)"
                      >
                        <!-- Badge avec type icon en haut à gauche -->
                        <!-- Badge avec type icon en haut à gauche -->
                        <div class="dispo-type-badge">
                          <va-icon 
                            :name="getDispoTypeIcon(dispo)" 
                            size="10px" 
                            class="dispo-badge-icon" 
                          />
                        </div>
                        
                        <!-- Affichage uniforme simplifié -->
                        <div class="dispo-unified-content">
                          <!-- Type de dispo + temporalité en une ligne -->
                          <div class="dispo-main-info">
                            <!-- Pour indisponible, afficher juste "Indisponible" -->
                            <template v-if="resolveDispoKind(dispo).type === 'indisponible'">
                              <span class="dispo-indisponible-label">Indisponible</span>
                            </template>
                            <!-- Pour les autres, afficher horaires/créneaux -->
                            <template v-else>
                              <span class="dispo-temporal">{{ getTemporalDisplay(dispo, day.date) }}</span>
                              <span v-if="isOvernightContinuation(dispo, day.date)" class="overnight-symbol" title="Suite">⤺</span>
                              <span v-if="isOvernightStart(dispo, day.date)" class="overnight-symbol" title="Continue">⤻</span>
                            </template>
                          </div>
                        </div>
                        
                        <!-- Footer avec lieu toujours visible pour mission -->
                        <div v-if="resolveDispoKind(dispo).type === 'mission' && dispo.lieu" class="dispo-footer">
                          <span class="dispo-lieu">{{ dispo.lieu }}</span>
                        </div>
                      </div>
                    </template>
                    
                    <!-- Bouton d'ajout pour cellules vides -->
                    <div 
                      v-if="getCellDisposSorted(collaborateur.id, day.date).length === 0 && !isDayLoaded(day.date) === false"
                      class="dispo-add-card"
                      :class="{ 'dragging-mode': isDraggingSelection }"
                      @click="onInnerAddClick(collaborateur.id, day.date, $event)"
                      aria-label="Ajouter une disponibilité"
                    >
                      <va-icon name="add" size="20px" class="add-icon" />
                      <span class="add-text">Ajouter</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Fin du conteneur virtualisé des collaborateurs -->
        </div>
      </div>
    </div>

          <!-- Fin du conteneur virtualisé des collaborateurs -->
    <va-modal 
      class="dispo-modal-center"
      v-model="showModal" 
      :hide-default-actions="true"
      :fullscreen="false"
      :mobile-fullscreen="false"
      max-width="600px"
      max-height="90vh"
      no-padding
      @before-open="modalA11y.onBeforeOpen"
      @open="modalA11y.onOpen"
      @close="() => { modalA11y.onClose(); cancelModal() }"
    >
      <DispoEditContent
        v-if="(selectedCell || isBatchMode) && showDispoModal"
        :selected-cell="selectedCell || mockBatchCell"
        :selected-collaborateur="getSelectedCollaborateur() || null"
        :collaborateur-color="getCollaborateurColor(getSelectedCollaborateur()?.id || '')"
        :formatted-date="isBatchMode ? batchDateRangeFormatted : formatModalDate(selectedCell?.date || '')"
        :selected-cell-dispos="selectedCellDispos"
        :editing-dispo-index="editingDispoIndex"
        :is-adding-new-dispo="isAddingNewDispo || isBatchMode"
        :editing-dispo="editingDispo"
        :type-options="typeOptions"
        :slot-options="slotOptions"
        :lieux-options-strings="lieuxOptionsStrings"
        :is-edit-form-valid="isEditFormValid"
        :saving="saving"
        :time-kind-options="timeKindOptionsFor(editingDispo.type)"
        :time-kind-options-filtered="timeKindOptionsFilteredFor(editingDispo.type)"
        :is-detected-overnight="isDetectedOvernight"
        :is-collaborator-view="isCollaborateurInterface && !canAccessAdminFeatures"
        :is-batch-mode="isBatchMode"
        :get-type-icon="getTypeIcon"
        :get-type-text="getTypeText"
        :get-type-color="getTypeColor"
        :get-dispo-type-class="getDispoTypeClass"
        :get-slot-text="getSlotText"
        :get-time-kind-icon="getTimeKindIcon"
        :get-user-initials="getUserInitials"
        :is-overnight-time="isOvernightTime"
        @cancel-modal="cancelModal"
        @save-dispos="saveDispos"
        @edit-dispo-line="editDispoLine"
        @remove-dispo="removeDispo"
        @set-editing-type="setEditingType"
        @set-editing-time-kind="setEditingTimeKind"
        @toggle-editing-slot="toggleEditingSlot"
        @create-lieu="onCreateLieu"
        @cancel-edit-dispo="cancelEditDispo"
        @save-edit-dispo="() => { if (isBatchMode) { saveBatchDispos() } else { saveEditDispo() } }"
        @delete-batch-dispos="deleteBatchDispos"
        @add-new-dispo-line="addNewDispoLine"
        @update-editing-lieu="(v) => { editingDispo.lieu = v }"
        @update-editing-heure-debut="(v) => { editingDispo.heure_debut = v }"
        @update-editing-heure-fin="(v) => { editingDispo.heure_fin = v }"
        @update-editing-slots="(v) => { editingDispo.slots = v }"
      />
      
      <CollabEditContent
        v-if="selectedCollaborateur && showCollabModal"
        :selected-collaborateur="selectedCollaborateur"
        :collaborateur-color="getCollaborateurColor(selectedCollaborateur.id)"
        :get-user-initials="getUserInitials"
        @cancel-modal="cancelModal"
        @save-notes="handleSaveCollaborateurNotes"
        @edit-collaborateur="handleEditCollaborateur"
      />

      
    </va-modal>

  </div> <!-- Fin excel-planning-container -->

  

  <!-- Indicateurs de cellules en cours d'édition -->
  <div class="active-editing-indicators">
    <div
      v-for="user in connectedUsers.filter((u: DisplayUser) => u.sessions.some((s: any) => s.currentAction?.type === 'editing'))"
      :key="`editing-${user.uid}`"
      class="editing-indicator"
      :data-user="user.displayName"
      :style="{ '--user-color': getUserColorWrapper(user.uid) }"
    >
      <va-icon name="edit" size="12px" />
      <span class="editing-user">{{ user.displayName }} édite</span>
    </div>
  </div>

  <!-- FAB sélection multiple mobile -->
  <div 
    v-if="isMobileView && InterfaceManager.canAccessAdminFeatures.value && !batchModalOpen"
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

  </div> <!-- Fin main-content -->
  </div> <!-- Fin planning-app -->
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vuestic-ui'

// Composants lazy-loadés pour réduire le bundle initial
const FiltersHeaderCompact = defineAsyncComponent(() => import('../components/FiltersHeaderCompact.vue'))
const PlanningWarmupOverlay = defineAsyncComponent(() => import('../components/planning/PlanningWarmupOverlay.vue'))
const DispoEditContent = defineAsyncComponent(() => import('@/components/DispoEditContent.vue'))
const CollabEditContent = defineAsyncComponent(() => import('@/components/CollabEditContent.vue'))

// Composant de chargement nécessaire pour l'UX (sync car visible immédiatement)
import PlanningLoadingModal from '../components/planning/PlanningLoadingModal.vue'

// Nouveaux composants modulaires supprimés car non utilisés
// EmergencyFirestoreDashboard supprimé: migration RTDB terminée
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { AuthService } from '../services/auth'
import { InterfaceManager } from '../services/interfaceManager'
const { isCollaborateurInterface, canAccessAdminFeatures } = InterfaceManager
import { useUserPreferences } from '../services/userPreferences'
import { getUserInitials } from '../services/avatarUtils'
import { UserColorsService } from '../services/userColorsService'
import { formatPhone as formatPhoneUtil, phoneToHref } from '../utils/phoneFormatter'
// firestoreCounter et firestoreCache supprimés: migration RTDB terminée
import { auth, rtdb } from '../services/firebase'
import { canonicalizeLieu as canonicalizeLieuShared, detectSlotsFromText as detectSlotsShared, normalizeDispo as normalizeDispoShared } from '../services/normalization'
import { 
  slotLabel as sharedSlotLabel, 
  getTemporalDisplay as sharedGetTemporalDisplay, 
  getDispoTypeIcon as sharedGetDispoTypeIcon,
  getDispoBarsLayoutClass as sharedGetDispoBarsLayoutClass
} from '../services/planningDisplayService'
import { toDateStr, addDaysStr, diffDays, calcMinPastDate } from '@/utils/dateHelpers'
import { ref as rtdbRef, onValue, off } from 'firebase/database'
import { deriveTimeKindFromData } from '@/utils/timeKindDerivation'

// NOUVEAU: Service RTDB pour les disponibilités (migration complète)
import { disponibilitesRTDBService } from '../services/disponibilitesRTDBService'
import type { DisponibiliteRTDB } from '../services/disponibilitesRTDBService'

// Service de collaboration - nouveau système unifié multi-utilisateur (Phase 2)
import { hybridMultiUserService as collaborationService } from '../services/hybridMultiUserService'
import type { DisplayUser } from '../services/sessionDisplayService'

// NOUVEAU: Moteur WASM ultra-performant pour highlights
import WASMHighlightEngine from '../services/wasmHighlightEngine'
import { useSessionDisplay } from '../services/sessionDisplayService'
import type { Collaborateur } from '../types/planning'

// ⚠️ OPTIMISATION D'URGENCE
import { emergencyOptimization } from '../services/emergencyOptimization'
import { slotOptions } from '../services/dispoFormOptions'
import { getLastFormPreferences, saveFormPreferences } from '../services/dispoFormPreferences'
import { useVirtualGrid } from '@/composables/useVirtualGrid'
import { useCollabPresence } from '@/composables/useCollabPresence'
import { usePlanningFilters } from '@/composables/usePlanningFilters'
import { usePlanningData } from '@/composables/usePlanningData'
import { useModalA11y } from '@/composables/useModalA11y'

// Flag pour tester le nouveau système
const USE_NEW_COLLABORATION = true

const { notify } = useToast()
const route = useRoute()

// Initialisation des services multi-utilisateur (Phase 4)
// (notificationService retiré: non utilisé)

// Variables pour cleanup des listeners de collaboration
const activityUnsubscribe = ref<(() => void) | null>(null)
const lockUnsubscribe = ref<(() => void) | null>(null)
const selectionUnsubscribe = ref<(() => void) | null>(null)
const { users: realConnectedUsers, stats: sessionStats, addRealtimeListener, removeRealtimeListener, clearRealtimeListeners } = useSessionDisplay()

// User preferences pour la couleur de présence
const { preferences, loadPreferences } = useUserPreferences()

// Listener pour synchronisation temps réel des préférences
let preferencesUnsubscribe: (() => void) | null = null

// (openTimePickerFromIcon retiré: non utilisé dans ce composant)

// Types compatibles avec l'existant
interface Disponibilite {
  id?: string
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  ville: string
  note?: string
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

// ==========================================
// SYSTÈME DE FILTRES CENTRALISÉ
// ==========================================

// Utilisation du composable de filtres centralisé
const planningFilters = usePlanningFilters()
const planningData = usePlanningData()

// Déclarer tôt pour utilisation par useVirtualGrid
const filteredCollaborateurs = computed(() => {
  const centralizedFiltered = planningData.filteredCollaborateurs.value
  if (isCollaborateurInterface.value && !canAccessAdminFeatures.value) {
    const uid = auth.currentUser?.uid || ''
    const email = auth.currentUser?.email || ''
    const byUserId = centralizedFiltered.filter(c => (c as any).userId && (c as any).userId === uid)
    if (byUserId.length > 0) return byUserId
    if (email) return centralizedFiltered.filter(c => c.email === email)
    return []
  }
  return centralizedFiltered
})

// Alias pour faciliter la transition et maintenir la compatibilité
const searchTerm = computed({
  get: () => planningFilters.filterState.search,
  set: (value) => planningFilters.updateFilter('search', value)
})

const filterMetier = computed({
  get: () => planningFilters.filterState.metier,
  set: (value) => planningFilters.updateFilter('metier', value)
})

const filterLieu = computed({
  get: () => planningFilters.filterState.lieu,
  set: (value) => planningFilters.updateFilter('lieu', value)
})

const filterStatut = computed({
  get: () => planningFilters.filterState.statut,
  set: (value) => planningFilters.updateFilter('statut', value)
})

const dateFrom = computed({
  get: () => planningFilters.filterState.dateFrom,
  set: (value) => planningFilters.updateFilter('dateFrom', value)
})

const dateTo = computed({
  get: () => planningFilters.filterState.dateTo,
  set: (value) => planningFilters.updateFilter('dateTo', value)
})

// État de filtrage du système centralisé – non utilisé ici

// Variables restantes non liées aux filtres
// (viewMode, mobileFiltersOpen retirés: non utilisés ici)

// Initialisation des filtres depuis les paramètres de query
const initFiltersFromQuery = () => {
  if (route.query.collaborateur) {
    planningFilters.updateFilter('search', route.query.collaborateur as string)
    // Filtre collaborateur appliqué
  }
}

// Cache de recherche pour améliorer les performances (géré maintenant par le composable centralisé)
const searchDebounceTimer = ref<number | null>(null)

// Format de la plage de dates pour l'affichage (utilise le composable centralisé)
// (formatFilterDateRange retiré: non utilisé ici)

const loadedDays = ref<any[]>([])
// Gestion des zones chargées
const loadedDateRanges = ref<Array<{start: string, end: string}>>([])
const saving = ref(false)

// Nouveaux états pour les fonctionnalités ajoutées
const collaborateurs = ref<Collaborateur[]>([])
const batchModalOpen = ref(false)
const isBatchMode = ref(false)
const batchDates = ref<string[]>([])
const batchCollaborateurId = ref<string>('')
const selectedCells = ref<Set<string>>(new Set())
// (cellLocks retiré: la grille utilise getCellLockClasses() basé sur le service)
const lockUpdateCounter = ref(0) // Force la réactivité des verrous

// Computed: ID du collaborateur actuellement sélectionné (pour griser les autres lignes)
const selectedCollaborateurId = computed(() => {
  if (selectedCells.value.size === 0) return null
  return getCurrentSelectedCollaborateur()
})

// État pour la sélection par lot
const isSelectionMode = ref(false)
const isDraggingSelection = ref(false)
const dragStartCell = ref<string | null>(null)
const hasMouseMoved = ref(false) // Flag pour distinguer clic simple vs drag

// Auto-scroll DÉSACTIVÉ - DOM trop massif pour performance acceptable
// L'utilisateur scrolle manuellement avec trackpad/molette pendant la sélection

// Gestionnaires d'événements clavier pour la sélection par lot
const handleKeyDown = (e: KeyboardEvent) => {
  // Sur desktop, activer le mode sélection avec Ctrl/Cmd
  // Sur mobile, laisser le FAB gérer le mode sélection
  if ((e.ctrlKey || e.metaKey) && !isMobileView.value) {
    isSelectionMode.value = true
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  // Sur desktop, désactiver le mode sélection quand on relâche Ctrl/Cmd
  // Sur mobile, laisser le FAB gérer le mode sélection
  if (!e.ctrlKey && !e.metaKey && !isMobileView.value) {
    isSelectionMode.value = false
  }
}

// Watcher pour appliquer la classe CSS au body
// Watcher unique pour les classes CSS du mode sélection et glissement
watch([isSelectionMode, isDraggingSelection], ([selMode, dragMode]) => {
  document.body.classList.toggle('selection-mode', selMode)
  document.body.classList.toggle('dragging-selection', dragMode)
  
  // Attacher/détacher le listener global pour le mousemove pendant le drag
  // Cela permet d'arrêter le scroll si la souris sort de la zone du planning
  if (dragMode) {
    document.addEventListener('mousemove', handleGlobalMouseMoveDuringDrag)
  } else {
    document.removeEventListener('mousemove', handleGlobalMouseMoveDuringDrag)
    // S'assurer que l'auto-scroll est arrêté quand le drag s'arrête
    stopAutoScroll()
  }
})

// Debounce timer pour la synchronisation des cellules sélectionnées
let syncSelectedCellsTimer: number | null = null

// Watcher pour la sélection de cellules (mettre à jour les initiales + transmettre aux autres)
watch(selectedCells, () => {
  // Les initiales sont maintenant gérées de manière réactive via :data-initials dans le template
  // Plus besoin de updatePresenceInitials()
  
  // Debounce la synchronisation pour éviter le spam réseau pendant le drag
  if (syncSelectedCellsTimer) {
    clearTimeout(syncSelectedCellsTimer)
  }
  syncSelectedCellsTimer = window.setTimeout(() => {
    // Transmettre les sélections aux autres utilisateurs via RTDB
    if (collaborationService.isActive) {
      collaborationService.updateSelectedCells(selectedCells.value)
    }
  }, 100) // 100ms de debounce
}, { deep: true })

// Watcher pour le modal batch - lock des cellules sélectionnées côté admin
watch(batchModalOpen, async (isOpen) => {
  if (!collaborationService.isActive) return
  
  if (isOpen && selectedCells.value.size > 0) {
  // Modal ouvert : verrouiller toutes les cellules sélectionnées
    
    const lockPromises: Promise<boolean>[] = []
    selectedCells.value.forEach(cellKey => {
      const [collaborateurId, date] = cellKey.split('-')
      if (collaborateurId && date) {
        const promise = collaborationService.lockCell(collaborateurId, date)
        lockPromises.push(promise)
      }
    })
    
    try {
  await Promise.all(lockPromises)
    } catch (error) {
      console.warn('⚠️ Erreur lors du verrouillage modal batch:', error)
    }
  } else if (!isOpen) {
  // Modal fermé : libérer tous les verrous
    
    const unlockPromises: Promise<void>[] = []
    selectedCells.value.forEach(cellKey => {
      const [collaborateurId, date] = cellKey.split('-')
      if (collaborateurId && date) {
        const promise = collaborationService.unlockCell(collaborateurId, date)
        unlockPromises.push(promise)
      }
    })
    
    try {
  await Promise.all(unlockPromises)
    } catch (error) {
      console.warn('⚠️ Erreur lors de la libération des verrous modal batch:', error)
    }
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

const minPastDate = computed<string>(() => {
  if (dateFrom.value) return dateFrom.value
  if (dateTo.value && !dateFrom.value) return '2000-01-01'
  return calcMinPastDate()
})

// Environnement
const isLocalhostEnv = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const isEmulator = isLocalhostEnv && import.meta.env.VITE_USE_EMULATOR === '1'

function canonicalizeLieu(lieu: string): string {
  return canonicalizeLieuShared(lieu)
}

// (retiré) ancienne heuristique de statut par lieu

// Détection simple de créneaux à partir d'un texte
function detectSlotsFromText(text: string): string[] {
  return detectSlotsShared(text || '')
}

// Hover entièrement géré par CSS (:hover) et overlay de colonne

// Debug: fonction globale pour diagnostiquer l'état
function diagnoseMutliUser() {

  
  if (collaborationService) {

  }
  
  return {
    useNewCollaboration: USE_NEW_COLLABORATION,
    serviceExists: !!collaborationService,
    currentUser: auth.currentUser?.uid,
    connectedUsers: connectedUsers.value.length,
    sessionStats: sessionStats.value
  }
}

// Exposer globalement pour debug
if (typeof window !== 'undefined') {
  (window as any).diagnoseMutliUser = diagnoseMutliUser
}

// Données principales
const allCollaborateurs = ref<Collaborateur[]>([])
// Synchronisé avec le composable usePlanningData
const loadingCollaborateurs = ref(false)
const loadingDisponibilites = ref(false)
const disponibilitesCache = ref<Map<string, Disponibilite[]>>(new Map())

// Type pour les disponibilités enrichies avec info de continuation
type CellDispo = Disponibilite & { _cont?: 'start'|'end' }

// Cache memoizé pour getCellDisposSorted (optimisation performance)
const cellDisposSortedCache = new Map<string, CellDispo[]>()
let cellDisposCacheVersion = 0

// Fonction pour invalider le cache des cellules triées
function invalidateCellDisposCache(specificKey?: string) {
  if (specificKey) {
    cellDisposSortedCache.delete(specificKey)
  } else {
    cellDisposSortedCache.clear()
    cellDisposCacheVersion++
  }
}

// Watcher pour invalider le cache quand les disponibilités changent
watch(disponibilitesCache, () => {
  invalidateCellDisposCache()
}, { deep: true })

// État de chargement initial
const isInitialLoad = ref(true)
const planningReady = ref(false)

// Modale de chargement Vuestic - FORCÉE COMME FERMÉE
const showLoadingModal = computed(() => false) // TEMPORAIREMENT FORCÉ À FALSE


// État combiné : planning vraiment prêt - FORCÉ POUR DEBUG
// (isPlanningFullyReady retiré: non utilisé)

// Synchronisation temps réel
const realtimeListeners = ref<string[]>([])
const isRealtimeActive = ref(false)

// Présence utilisateur - utilise maintenant le service unifié
const connectedUsers = computed(() => {
  const users = realConnectedUsers.value
  

  
  return users
})
let hoverDebounceTimer: ReturnType<typeof setTimeout> | null = null
let hoverEndGraceTimer: ReturnType<typeof setTimeout> | null = null
// Cache local pour indicateurs de cellules (reconstruit toutes les 200ms)
// ==========================================
// NOUVEAU SYSTÈME RÉACTIF DE PRÉSENCE
// ==========================================

// Presence/locks via composable
// Eviter les références avant déclaration: on utilise des wrappers locaux
const visibleDaysForPresence = computed(() => loadedDays.value as Array<{ date: string }>)
// Éviter la référence à filteredCollaborateurs avant sa déclaration: utiliser un ref synchronisé plus tard
const presenceRowsRef = ref<Array<{ id: string }>>([])
const presenceRows = computed(() => presenceRowsRef.value)
const {
  hoveredCells,
  lockedCells,
  isHoveredByOthers,
  isLockedByOthers,
  getHoveringUserColor: _getHoveringUserColor,
  getHoveringUserInitials,
  updatePresenceSets,
  debouncedUpdatePresenceSets,
} = useCollabPresence(
  collaborationService,
  visibleDaysForPresence,
  presenceRows,
  (u: any) => getUserInitials(u),
  (uid: string) => getUserColorWrapper(uid),
)

function getHoveringUserColor(collaborateurId: string, date: string): string {
  return _getHoveringUserColor(collaborateurId, date)
}

// Fonctions helper optimisées pour éviter les IIFE dans le template
// Ces fonctions remplacent les calculs inline coûteux
function hasCellIndicator(collaborateurId: string, date: string): boolean {
  return isLockedByOthers(collaborateurId, date) || isHoveredByOthers(collaborateurId, date)
}

function hasCellPresence(collaborateurId: string, date: string): boolean {
  return isHoveredByOthers(collaborateurId, date)
}

// Détection mode émulateur
const isEmulatorMode = computed(() => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.port === '3000' ||
         window.location.href.includes('emulator')
})

const fetchingRanges = ref(false)
const extending = ref(false) // Déclaration déplacée ici pour éviter l'erreur "before initialization"

// Busy state: quand on charge des plages ou qu'on étend
const isBusy = computed(() => {
  const localBusy = loadingCollaborateurs.value || loadingDisponibilites.value || fetchingRanges.value || extending.value
  const composableBusy = planningData.isLoading.value || planningData.loadingDisponibilites.value || planningData.fetchingRanges.value.length > 0
  return localBusy || composableBusy
})

// Garder les états locaux synchronisés avec le composable centralisé
// Watcher unique pour synchroniser les états de chargement
watch(
  () => [planningData.isLoading.value, planningData.loadingDisponibilites.value, planningData.fetchingRanges.value?.length > 0] as const,
  ([isLoading, loadingDispos, hasFetchingRanges]) => {
    loadingCollaborateurs.value = isLoading
    loadingDisponibilites.value = loadingDispos || hasFetchingRanges
  },
  { immediate: true }
)

// CORRECTION: Watcher pour forcer le recalcul du filtrage quand le chargement est terminé
watch(isBusy, async (busy, prevBusy) => {
  // Quand on passe de busy=true à busy=false (fin de chargement)
  if (prevBusy && !busy) {
    await nextTick()
    // Forcer la réactivité
    const scroller = planningScroll.value
    if (scroller) {
      recomputeRowWindow(scroller)
      ensureRowsVisible()
    }
  }
}, { immediate: false })

// Nom d'utilisateur pour l'accueil personnalisé
const currentUserDisplayName = computed(() => {
  const user = auth.currentUser
  if (!user) return 'Invité'
  
  // Essayer d'abord le displayName
  if (user.displayName) {
    // Prendre uniquement le prénom (premier mot avant espace)
    const firstName = user.displayName.split(' ')[0]
    return firstName
  }
  
  // Sinon, extraire du email
  if (user.email) {
    const emailName = user.email.split('@')[0]
    // Capitaliser la première lettre
    return emailName.charAt(0).toUpperCase() + emailName.slice(1)
  }
  
  return 'Invité'
})

// Options de formulaire
const allTypeOptions = [
  { text: 'Mission', value: 'mission' },
  { text: 'Disponible', value: 'disponible' },
  { text: 'Indisponible', value: 'indisponible' },
]

// Options filtrées selon les permissions
const typeOptions = computed(() => {
  if (!InterfaceManager.canAccessAdminFeatures.value) {
    // Les collaborateurs ne peuvent pas créer de missions
    return allTypeOptions.filter(option => option.value !== 'mission')
  }
  return allTypeOptions
})

// Modal & ajout états
const showDispoModal = ref(false)
const showCollabModal = ref(false)
const modalA11y = useModalA11y()
const selectedCell = ref<{ collaborateurId: string; date: string } | null>(null)
const selectedCollaborateur = ref<Collaborateur | null>(null)
const selectedCellDispos = ref<Disponibilite[]>([])
const selectedCollabDispos = ref<Disponibilite[]>([])

// Modal unifié : computed pour gérer l'ouverture/fermeture des deux types de modaux
const showModal = computed({
  get: () => showDispoModal.value || showCollabModal.value,
  set: (value: boolean) => {
    if (!value) {
      showDispoModal.value = false
      showCollabModal.value = false
    }
  }
})

// Batch mode: Créer une fausse cellule pour le mode batch
const mockBatchCell = computed(() => {
  if (!isBatchMode.value || batchDates.value.length === 0) return null
  return { collaborateurId: batchCollaborateurId.value, date: batchDates.value[0] }
})

// Batch mode: Formater la plage de dates sélectionnées
const batchDateRangeFormatted = computed(() => {
  if (batchDates.value.length === 0) return ''
  if (batchDates.value.length === 1) return formatModalDate(batchDates.value[0])
  const sorted = [...batchDates.value].sort()
  const first = new Date(sorted[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  const last = new Date(sorted[sorted.length - 1]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  return `${sorted.length} dates · ${first} → ${last}`
})

// État d'édition de ligne
const editingDispoIndex = ref<number | null>(null)
const isAddingNewDispo = ref(false)
// Initialiser avec les dernières préférences sauvegardées
const savedPrefs = getLastFormPreferences()
const editingDispo = ref<Partial<Disponibilite>>({
  type: savedPrefs.type,
  timeKind: savedPrefs.timeKind,
  heure_debut: savedPrefs.heure_debut,
  heure_fin: savedPrefs.heure_fin,
  lieu: savedPrefs.lieu,
  slots: savedPrefs.slots
})

// Options métiers/lieux utilisant le système centralisé
const lieuOptions = ref<string[]>([])
const lieuxOptionsStrings = computed(() => planningFilters.lieuxOptions.value.map(o => o.value))

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

// Version filtrée sans le bouton overnight (détection automatique)
function timeKindOptionsFilteredFor(type: Disponibilite['type'] | undefined) {
  return timeKindOptionsFor(type)
}

// Fonction utilitaire pour détecter les horaires overnight  
function isOvernightTime(start?: string, end?: string): boolean {
  if (!start || !end) return false
  const [startH] = start.split(':').map(Number)
  const [endH] = end.split(':').map(Number)
  return endH < startH || (endH === startH && end < start)
}

// Détection automatique des horaires overnight (utilise isOvernightTime)
const isDetectedOvernight = computed(() => {
  if (editingDispo.value.timeKind !== 'range') return false
  return isOvernightTime(editingDispo.value.heure_debut, editingDispo.value.heure_fin)
})

function onCreateLieu(raw: string) {
  const canon = canonicalizeLieu(raw)
  if (!canon) return
  if (!lieuOptions.value.includes(canon)) {
    lieuOptions.value = [...lieuOptions.value, canon]
  }
}

function updateLieuxOptions() {
  const allDispos = Array.from(disponibilitesCache.value.values()).flat()
  planningFilters.updateLieuxOptions(allDispos)
  
  // Maintenir aussi le cache local pour compatibilité
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
    // En mode collaborateur, on autorise l'ouverture et on sort du mode sélection
    if (isCollaborateurInterface.value && !canAccessAdminFeatures.value) {
      isSelectionMode.value = false
      // Par sécurité, vider une éventuelle sélection résiduelle
      if (selectedCells.value.size > 0) selectedCells.value.clear()
    } else {
      return
    }
  }
  
  // Vérifier si la cellule est verrouillée par un autre utilisateur
  if (collaborationService && collaborationService.isCellLocked(collaborateurId, date)) {
    const lock = collaborationService.getCellLock(collaborateurId, date)
    if (lock) {
      // notify({
      //   title: 'Cellule verrouillée',
      //   message: `${lock.userName} est en train d'interagir avec cette cellule`,
      //   color: 'warning',
      //   duration: 3000
      // })
      return // Empêcher l'ouverture de la modale
    }
  }
  
  // Vérifier si la cellule est sélectionnée par un autre utilisateur
  if (collaborationService && collaborationService.isCellSelectedByOthers(collaborateurId, date)) {
    const selection = collaborationService.getCellSelection(collaborateurId, date)
    if (selection) {
      // notify({
      //   title: 'Cellule en cours de sélection',
      //   message: `${selection.userName} a sélectionné cette cellule`,
      //   color: 'warning',
      //   duration: 3000
      // })
      return // Empêcher l'ouverture de la modale
    }
  }
  
  // Ouvrir directement la modale existante
  openDispoModal(collaborateurId, date)
}

const isMobileView = ref(false)
const dayWidthRef = ref(100) // Réduit de 124px à 100px pour afficher plus de jours
// Largeur colonne collaborateurs (desktop) réduite
const stickyLeftWidthRef = ref(190)
const rowHeightRef = ref(65) // Réduit à 65px pour une meilleure proportion
const rowPitchRef = computed(() => rowHeightRef.value + 1)

function computeResponsive() {
  const w = window.innerWidth
  const h = window.innerHeight
  
  // Activer le style mobile si largeur <= 900px OU si c'est un écran mobile en paysage
  // (hauteur < largeur ET hauteur <= 500px pour détecter les mobiles en paysage)
  isMobileView.value = w <= 900 || (h < w && h <= 500)
  
  // Sauvegarder la position de scroll actuelle pour la restaurer après redimensionnement
  const scroller = planningScroll.value
  let centerDayIndex = -1
  if (scroller) {
    const currentScrollLeft = scroller.scrollLeft
    const currentViewportWidth = scroller.clientWidth
    const currentStickyWidth = stickyLeftWidth.value
    const currentPitch = dayPitchBodyPx.value || (dayWidth.value + 1)
    
    // Calculer quel jour est au centre de l'écran actuellement
    const centerX = currentScrollLeft + (currentViewportWidth - currentStickyWidth) / 2
    centerDayIndex = Math.round(centerX / currentPitch)
  }
  
  // Calculer les nouvelles dimensions selon la taille d'écran
  let sticky = 240
  let day = 100 // Réduit de 124px à 100px pour afficher plus de jours sur desktop
  let rowH = 65 // Réduit à 65px pour une meilleure proportion
  if (w <= 390) { // iPhone 12 width
  sticky = 100; day = Math.max(54, Math.min(74, Math.floor((w - sticky - 8)/5))); rowH = 60 // Colonne plus large sur très petit écran
  } else if (w <= 430) {
  sticky = 115; day = Math.max(59, Math.min(79, Math.floor((w - sticky - 10)/5))); rowH = 62 // Colonne plus large
  } else if (w <= 520) {
  sticky = 130; day = Math.max(69, Math.min(89, Math.floor((w - sticky - 12)/5))); rowH = 64 // Colonne plus large
  } else if (w <= 640) {
  sticky = 145; day = Math.max(79, Math.min(99, Math.floor((w - sticky - 16)/5))); rowH = 66 // Colonne plus large
  } else if (w <= 900) {
    sticky = 160; day = Math.max(89, Math.min(109, Math.floor((w - sticky - 20)/5))); rowH = 68
  } else {
    // Desktop large: réduire encore si > 900
    sticky = Math.min(240, Math.max(200, Math.floor(w * 0.16))) // approx 16% viewport, borné 200-240
  }
  
  dayWidthRef.value = day
  stickyLeftWidthRef.value = sticky
  rowHeightRef.value = rowH
  
  nextTick(() => {
    if (planningScroll.value) {
      recomputeWindow(planningScroll.value)
      
      // Utiliser le système optimisé de mesures avec timing approprié
      requestAnimationFrame(() => {
        scheduleMeasurements(true) // Inclure la mise à jour de l'overlay aujourd'hui
        
        // Restaurer la position de scroll pour garder le même jour au centre
        if (centerDayIndex >= 0) {
          const newPitch = dayWidth.value + 1
          const newCenterX = centerDayIndex * newPitch
          const newScrollLeft = Math.max(0, newCenterX - (planningScroll.value!.clientWidth - stickyLeftWidth.value) / 2)
          planningScroll.value!.scrollLeft = newScrollLeft
        }
      })
    }
  })
}

onMounted(() => {
  computeResponsive()
  window.addEventListener('resize', computeResponsive)
  // S'assurer que le service RTDB pointe sur le bon tenant
  try {
    if (AuthService.currentTenantId) {
      disponibilitesRTDBService.setTenantId(AuthService.currentTenantId)
      // RTDB tenantId appliqué
    }
  } catch (e) {
    console.warn('⚠️ Impossible d\'appliquer le tenantId au service RTDB:', e)
  }
  // Lorsque le DOM est prêt, s'assurer d'afficher au moins une fenêtre de lignes
  nextTick(() => ensureRowsVisible())
})
onUnmounted(() => window.removeEventListener('resize', computeResponsive))

// Aliases simples
const dayWidth = computed(() => dayWidthRef.value)
const stickyLeftWidth = computed(() => stickyLeftWidthRef.value)
const rowHeight = computed(() => rowHeightRef.value)
const rowPitch = computed(() => rowPitchRef.value)

// Quand la largeur d'une journée change (responsive),
// re-calculer window et rowWindow pour éviter un écran vide transitoire.
watch(dayWidth, () => {
  nextTick(() => {
    if (planningScroll.value) {
      recomputeWindow(planningScroll.value)
      recomputeRowWindow(planningScroll.value)
    }
  })
})

// Important: quand les filtres/recherche réduisent fortement la liste,
// re-clamper la fenêtre verticale pour éviter d'afficher 0 ligne
// (watch déplacé plus bas après la déclaration de filteredCollaborateurs)

// Visible days = fenêtre dynamique basée sur loadedDays
const visibleDays = computed(() => {
  const days = loadedDays.value
  const from = dateFrom.value
  const to = dateTo.value

  if (from && to) {
    const a = from <= to ? from : to
    const b = from <= to ? to : from
    return days.filter(d => d.date >= a && d.date <= b)
  }
  if (from && !to) {
    const a = from
    return days.filter(d => d.date >= a)
  }
  if (to && !from) {
    // Avec seulement une date de fin, on affiche de "très loin" jusqu'à la date de fin incluse
    // Borne gauche: minPastDate dynamique (2000-01-01 quand dateTo seule)
    const a = minPastDate.value
    const b = to
    return days.filter(d => d.date <= b && d.date >= a)
  }
  return days
})
const gridMinWidth = computed(() => (visibleDays.value.length * dayWidth.value) + 'px')

// Vérifier si aujourd'hui est visible dans la plage filtrée
const isTodayVisible = computed(() => visibleDays.value.some(d => d.isToday))

// Hauteur totale de la grille des collaborateurs pour le scroll virtuel
const gridTotalHeight = computed(() => (filteredCollaborateurs.value.length * rowHeight.value) + 'px')

const vg = useVirtualGrid({
  dayWidth,
  rowHeight,
  visibleDays,
  rows: computed(() => filteredCollaborateurs.value),
})
const {
  windowStartIndex,
  windowEndIndex,
  windowOffsetPx,
  windowedDays,
  recomputeWindow,
  isScrollingFast,
  rowWindowStartIndex,
  rowWindowEndIndex, // nécessaire pour le reset forcé
  rowWindowOffsetPx,
  windowedRows,
  recomputeRowWindow,
  // virtualizationStats, // retiré: non utilisé
  // updateVirtualizationStats, // retiré: non utilisé
} = vg

// Clé pour forcer un re-render de la fenêtre des lignes
const renderKey = ref(0)
function forceRender() {
  renderKey.value++
}

const paginatedCollaborateurs = computed(() => {
  const rows = windowedRows.value
  if (rows.length === 0 && filteredCollaborateurs.value.length > 0) {
    const directResults = filteredCollaborateurs.value.slice(0, Math.min(50, filteredCollaborateurs.value.length))
    return directResults
  }
  return rows
})

// Watchdog: s'assure qu'après toute mutation, au moins une fenêtre de lignes est affichée
function ensureRowsVisible() {
  if (filteredCollaborateurs.value.length === 0) return
  if (windowedRows.value.length > 0) return
  const scroller = planningScroll.value
  if (scroller) {
    try { recomputeRowWindow(scroller) } catch {}
    if (windowedRows.value.length === 0) {
      // Reset scroll et recommencer
      scroller.scrollTop = 0
      try { recomputeRowWindow(scroller) } catch {}
      // Si malgré tout la fenêtre reste vide, forcer un fallback minimal sans scroller
      if (windowedRows.value.length === 0) {
        try { recomputeRowWindow(null as any) } catch {}
      }
    }
  } else {
    try { recomputeRowWindow(null as any) } catch {}
  }
}

// NOTE: le watch(filteredCollaborateurs) est positionné plus bas après sa déclaration

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

// === SYSTÈME OPTIMISÉ DE MESURES VISUELLES ===

// Éviter les re-mesures excessives avec debouncing
let measurementPending = false
let rafMeasurementId: number | null = null

// Monitoring de performance (dev uniquement)
const PERF_MONITOR = import.meta.env.DEV && false // À activer si besoin
let perfStats = {
  measureCalls: 0,
  totalMeasureTime: 0,
  lastMeasureTime: 0
}

function scheduleMeasurements(_includeToday = true) {
  // Marquer le paramètre comme utilisé pour les outils stricts
  void _includeToday
  if (measurementPending) return
  measurementPending = true
  
  if (rafMeasurementId) {
    cancelAnimationFrame(rafMeasurementId)
  }
  
  rafMeasurementId = requestAnimationFrame(() => {
    measurementPending = false
    rafMeasurementId = null
    
    const startTime = PERF_MONITOR ? performance.now() : 0
    
    // Exécuter toutes les mesures en une seule passe
    measureGridOrigins()
    measureRowPitch()
    
    // Plus besoin d'updateTodayOverlayX - les highlights sont gérés par CSS
    
    // Invalider le cache de hover après les nouvelles mesures
    invalidateHoverCache()
    
    if (PERF_MONITOR) {
      const measureTime = performance.now() - startTime
      perfStats.measureCalls++
      perfStats.totalMeasureTime += measureTime
      perfStats.lastMeasureTime = measureTime
      
      if (perfStats.measureCalls % 10 === 0) {
        // const avgTime = perfStats.totalMeasureTime / perfStats.measureCalls
        // console.log(`🔧 Perf mesures: ${perfStats.measureCalls} calls, avg=${avgTime.toFixed(2)}ms, last=${measureTime.toFixed(2)}ms`)
      }
    }
  })
}

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
// === SYSTÈME SIMPLIFIÉ DE HIGHLIGHTS ===

// Variables d'index simplifiées - plus utilisées pour le hover maintenant
const hoveredColumnIndex = ref(-1) // Index de la colonne survolée
const hoveredRowIndex = ref(-1)    // Index de la ligne survolée

// Mois actuellement visible
const currentVisibleMonth = ref('')

// CSS Variables simplifiées
const highlightStyles = computed(() => {
  return {
    '--day-width': dayWidth.value + 'px',
    '--sticky-left': stickyLeftWidth.value + 'px', 
    '--day-pitch': (dayWidth.value + 1) + 'px'
    // Plus besoin de --today-column ni --hovered-column/--hovered-row
  }
})

// Plus de cache pour todayColumnIndex - utilisation CSS pur avec data-today

// Fonctions pour calculer les classes CSS des cellules (haute performance)
const cellClassesCache = new Map<string, string[]>()
let lastHoveredColumn = -1
let lastHoveredRow = -1

function getCellClasses(dayIndex: number, rowIndex: number) {
  const localDayIndex = dayIndex - windowStartIndex.value
  
  // Cache ultra-optimisé - ne recalculer que si les valeurs de hover ont changé
  const currentHoveredColumn = hoveredColumnIndex.value
  const currentHoveredRow = hoveredRowIndex.value
  
  if (lastHoveredColumn !== currentHoveredColumn || lastHoveredRow !== currentHoveredRow) {
    cellClassesCache.clear()
    lastHoveredColumn = currentHoveredColumn
    lastHoveredRow = currentHoveredRow
  }
  
  const cacheKey = `${localDayIndex}-${rowIndex}`
  if (cellClassesCache.has(cacheKey)) {
    return cellClassesCache.get(cacheKey)!
  }
  
  const classes = []
  
  if (currentHoveredColumn === localDayIndex) {
    classes.push('column-hovered')
  }
  
  if (currentHoveredRow === rowIndex) {
    classes.push('row-hovered')
  }
  
  // Plus besoin d'ajouter saturday/sunday - géré par la classe day-N dans le template
  
  // Plus besoin de today-column - géré par data-today dans le template
  
  cellClassesCache.set(cacheKey, classes)
  return classes
}

function getDayHeaderClasses(dayIndex: number) {
  // Même logique : convertir l'index absolu en index local
  const localDayIndex = dayIndex - windowStartIndex.value
  const classes = []
  
  if (hoveredColumnIndex.value === localDayIndex) {
    classes.push('column-hovered')
  }
  
  // Plus besoin d'ajouter saturday/sunday - géré par la classe day-N dans le template
  
  // Plus besoin de today-column - géré par data-today dans le template
  
  return classes
}

function getCollaborateurRowClasses(rowIndex: number) {
  const classes = []
  
  if (hoveredRowIndex.value === rowIndex) {
    classes.push('row-hovered')
  }
  
  return classes
}

// === GESTION OPTIMISÉE DU HOVER ===

// (DEBUG_HOVER supprimé – non utilisé)
let _hoverRafId: number | null = null
let _lastPointerX = 0
let _lastPointerY = 0

// Cache des valeurs calculées pour éviter les re-calculs
let _cachedGridValues: {
  gridLeft: number
  pitch: number
  rowsOffset: number
  nRows: number
  rect: DOMRect
  timestamp: number
} | null = null

function invalidateHoverCache() {
  _cachedGridValues = null
}

// Met à jour les index de colonne/ligne survolées (version révolutionnaire)
let _debounceTimer: number | null = null

// SYSTÈME CROISEMENT PARFAIT : colonne + ligne comme la date du jour

// Auto-scroll pendant la sélection - VERSION ULTRA-LÉGÈRE
let autoScrollRAF: number | null = null
const isAutoScrolling = ref(false)

// Configuration
const EDGE_ZONE = 100
const MAX_SPEED_X = 15
const MAX_SPEED_Y = 10

// Position souris
let lastClientX = 0
let lastClientY = 0

function autoScrollLoop() {
  if (!planningScroll.value || !isSelectionMode.value || !isDraggingSelection.value) {
    stopAutoScroll()
    return
  }
  
  const scroller = planningScroll.value
  const rect = scroller.getBoundingClientRect()
  const mouseX = lastClientX - rect.left
  const mouseY = lastClientY - rect.top
  
  let dx = 0
  let dy = 0
  
  // Calcul simple et direct des déplacements
  if (mouseX < EDGE_ZONE) {
    dx = -MAX_SPEED_X * (1 - mouseX / EDGE_ZONE)
  } else if (mouseX > rect.width - EDGE_ZONE) {
    dx = MAX_SPEED_X * (1 - (rect.width - mouseX) / EDGE_ZONE)
  }
  
  if (mouseY < EDGE_ZONE) {
    dy = -MAX_SPEED_Y * (1 - mouseY / EDGE_ZONE)
  } else if (mouseY > rect.height - EDGE_ZONE) {
    dy = MAX_SPEED_Y * (1 - (rect.height - mouseY) / EDGE_ZONE)
  }
  
  // Appliquer directement - PAS de recompute, le navigateur gère le rendu
  if (dx !== 0) scroller.scrollLeft += dx
  if (dy !== 0) scroller.scrollTop += dy
  
  autoScrollRAF = requestAnimationFrame(autoScrollLoop)
}

function handleAutoScroll(e: MouseEvent) {
  lastClientX = e.clientX
  lastClientY = e.clientY
  
  if (isSelectionMode.value && isDraggingSelection.value && planningScroll.value && !autoScrollRAF) {
    isAutoScrolling.value = true
    autoScrollRAF = requestAnimationFrame(autoScrollLoop)
  }
}

function stopAutoScroll() {
  if (autoScrollRAF) {
    cancelAnimationFrame(autoScrollRAF)
    autoScrollRAF = null
  }
  // Recompute final quand on arrête
  if (planningScroll.value && isAutoScrolling.value) {
    recomputeWindow(planningScroll.value)
    recomputeRowWindow(planningScroll.value)
  }
  isAutoScrolling.value = false
}

// Gestionnaire global pour le mousemove pendant le drag
// Permet d'arrêter le scroll si la souris sort de la zone du planning
function handleGlobalMouseMoveDuringDrag(e: MouseEvent) {
  if (!isDraggingSelection.value || !planningScroll.value) {
    return
  }
  handleAutoScroll(e)
}

function onGridMouseMove(e: MouseEvent) {
  const target = e.target as HTMLElement
  
  // Capturer la position actuelle de la souris pour le hover après scroll
  _lastPointerX = e.clientX
  _lastPointerY = e.clientY
  
  // Auto-scroll actif dès que le mode sélection est activé (Cmd pressé)
  if (isSelectionMode.value) {
    handleAutoScroll(e)
  }
  
  // Pendant le scroll rapide ou en cours de chargement, éviter les modifications DOM
  if (isScrollingFast.value || isBusy.value) {
    return
  }
  
  // Remonter jusqu'à la cellule parent (pour les boutons et autres éléments internes)
  let cellElement = target
  while (cellElement && !cellElement.classList.contains('excel-cell') && cellElement !== planningScroll.value) {
    cellElement = cellElement.parentElement as HTMLElement
  }
  
  // Si on survole un bouton d'ajout pendant le drag, traiter comme si on survolait la cellule
  if (isDraggingSelection.value && target.closest('.dispo-add')) {
    cellElement = target.closest('.excel-cell') as HTMLElement
    
    if (cellElement) {
      const collaborateurId = cellElement.getAttribute('data-cell-id')?.split('_')[0]
      const date = cellElement.getAttribute('data-day-date')
      
      if (collaborateurId && date) {
        handleCellMouseEnter(collaborateurId, date)
      }
    }
  }
  
  if (cellElement && cellElement.classList.contains('excel-cell')) {
    // Eviter le travail si on reste sur la même cellule
    const prevCell = (onGridMouseMove as any)._prevCell as HTMLElement | undefined
    if (prevCell === cellElement) {
      return
    }
    ;(onGridMouseMove as any)._prevCell = cellElement
    const dayIndexStr = cellElement.getAttribute('data-day-index')
    const rowIndexStr = cellElement.getAttribute('data-row-index')
    
    if (dayIndexStr && rowIndexStr && planningScroll.value) {
      const dayIndex = parseInt(dayIndexStr, 10)
      const rowIndex = parseInt(rowIndexStr, 10)
      
      const prevDay = (onGridMouseMove as any)._prevDayIndex
      const prevRow = (onGridMouseMove as any)._prevRowIndex
      
      if (prevDay !== dayIndex || prevRow !== rowIndex) {
        // Nettoyer les highlights précédents une seule fois
        cleanHoverHighlights()
        
        // Utiliser les sélecteurs directs (plus fiable que le cache pour data attributes)
        const columnSelector = `[data-day-index="${dayIndex}"]`
        const rowSelector = `[data-row-index="${rowIndex}"]`
        
        const columnCells = planningScroll.value.querySelectorAll(columnSelector)
        columnCells.forEach(cell => {
          if (!cell.hasAttribute('data-column-hover')) cell.setAttribute('data-column-hover', 'true')
        })
        
        const rowCells = planningScroll.value.querySelectorAll(rowSelector)
        rowCells.forEach(cell => {
          if (!cell.hasAttribute('data-row-hover')) cell.setAttribute('data-row-hover', 'true')
        })
        
        ;(onGridMouseMove as any)._prevDayIndex = dayIndex
        ;(onGridMouseMove as any)._prevRowIndex = rowIndex
      }
    }
  } else {
    // Si on survole autre chose, nettoyer
    cleanHoverHighlights()
  }
}

// Cache des éléments DOM pour performance maximale
let _domCache = {
  columnElements: new Map<number, HTMLElement[]>(),
  rowElements: new Map<number, HTMLElement[]>(),
  cacheValid: false,
  lastBuilt: 0
}

// Moteur WASM pour calculs de highlights
const wasmEngine = new WASMHighlightEngine()
let _wasmReady = false

function invalidateDOMCache(_reason?: string) {
  _domCache.cacheValid = false
  _domCache.columnElements.clear()
  _domCache.rowElements.clear()
}

// Initialisation du moteur WASM
async function initializeWASMEngine() {
  try {
    const ready = await wasmEngine.waitForReady()
    if (ready) {
      _wasmReady = true
      updateWASMConfiguration()
    }
  } catch (error) {
    console.error('❌ Erreur initialisation WASM:', error)
  }
}

// Mise à jour de la configuration WASM
function updateWASMConfiguration() {
  if (!_wasmReady) return
  
  wasmEngine.configure({
    gridWidth: planningScroll.value?.clientWidth || 1200,
    gridHeight: planningScroll.value?.clientHeight || 800,
    colWidth: dayWidth.value,
    rowHeight: rowPitch.value,
    colsCount: visibleDays.value.length,
    rowsCount: paginatedCollaborateurs.value.length
  })
  
  const container = planningScroll.value
  if (container) {
    wasmEngine.updateScroll(container.scrollLeft, container.scrollTop)
  }
}

function buildDOMCache() {
  if (_domCache.cacheValid) return
  
  const container = planningScroll.value
  if (!container) return
  
  _domCache.columnElements.clear()
  _domCache.rowElements.clear()
  
  // Cache des éléments par colonne (plus efficace que querySelector répété)
  for (let colIdx = 0; colIdx < visibleDays.value.length; colIdx++) {
    const absoluteIndex = windowStartIndex.value + colIdx
    const elements = Array.from(container.querySelectorAll(`[data-day-index="${absoluteIndex}"]`)) as HTMLElement[]
    _domCache.columnElements.set(colIdx, elements)
  }
  
  // Cache des éléments par ligne
  for (let rowIdx = 0; rowIdx < paginatedCollaborateurs.value.length; rowIdx++) {
    const elements = Array.from(container.querySelectorAll(`[data-row-index="${rowIdx}"] .excel-cell`)) as HTMLElement[]
    _domCache.rowElements.set(rowIdx, elements)
  }
  
  _domCache.cacheValid = true
  _domCache.lastBuilt = Date.now()
  // console.log('🚀 Cache DOM construit:', _domCache.columnElements.size, 'colonnes,', _domCache.rowElements.size, 'lignes')
}

// (updateHoverWithCache supprimée – plus utilisée)

// Fonction de highlighting ultra-rapide avec cache DOM
let _currentHighlightedColumn = -1
let _currentHighlightedRow = -1

function updateHighlightWithDOMCache(columnIndex: number, rowIndex: number) {
  // Version WASM ultra-rapide si disponible
  if (_wasmReady) {
    updateHighlightWithWASM(columnIndex, rowIndex)
    return
  }
  
  // Fallback version DOM cache originale
  updateHighlightWithDOMCacheClassic(columnIndex, rowIndex)
}

// Nouvelle fonction WASM ultra-performante
function updateHighlightWithWASM(columnIndex: number, rowIndex: number) {
  // Si rien ne change, pas besoin de recalculer
  if (_currentHighlightedColumn === columnIndex && _currentHighlightedRow === rowIndex) {
    return
  }
  
  // Nettoyer les anciens highlights avec le cache DOM
  if (_currentHighlightedColumn >= 0) {
    const oldColumnElements = _domCache.columnElements.get(_currentHighlightedColumn)
    if (oldColumnElements) {
      oldColumnElements.forEach(el => el.classList.remove('dom-column-hovered'))
    }
  }
  
  if (_currentHighlightedRow >= 0) {
    const oldRowElements = _domCache.rowElements.get(_currentHighlightedRow)
    if (oldRowElements) {
      oldRowElements.forEach(el => el.classList.remove('dom-row-hovered'))
    }
  }
  
  // Appliquer les nouveaux highlights avec WASM + DOM cache
  if (columnIndex >= 0 && columnIndex !== _currentHighlightedColumn) {
    const newColumnElements = _domCache.columnElements.get(columnIndex)
    if (newColumnElements) {
      newColumnElements.forEach(el => {
        el.classList.add('dom-column-hovered')
        // FORCE inline style pour weekend - priorité absolue
        if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
          (el as HTMLElement).style.backgroundColor = 'rgba(76, 175, 80, 0.12)'
        }
      })
    }
  }
  
  if (rowIndex >= 0 && rowIndex !== _currentHighlightedRow) {
    const newRowElements = _domCache.rowElements.get(rowIndex)
    if (newRowElements) {
      newRowElements.forEach(el => {
        el.classList.add('dom-row-hovered')
        // FORCE inline style pour weekend - priorité absolue
        if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
          (el as HTMLElement).style.backgroundColor = 'rgba(76, 175, 80, 0.16)'
        }
      })
    }
  }
  
  // Mettre à jour les variables de tracking
  _currentHighlightedColumn = columnIndex
  _currentHighlightedRow = rowIndex
}

// Version classique DOM cache (fallback)
function updateHighlightWithDOMCacheClassic(columnIndex: number, rowIndex: number) {
  // Optimisation : ne rien faire si rien n'a changé
  if (_currentHighlightedColumn === columnIndex && _currentHighlightedRow === rowIndex) {
    return
  }
  
  // Nettoyer l'ancienne colonne (cache DOM)
  if (_currentHighlightedColumn !== columnIndex && _currentHighlightedColumn >= 0) {
    const oldColumnElements = _domCache.columnElements.get(_currentHighlightedColumn)
    if (oldColumnElements) {
      oldColumnElements.forEach(el => {
        el.classList.remove('dom-column-hovered')
        // Nettoyer le style inline pour weekend
        if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
          (el as HTMLElement).style.backgroundColor = ''
        }
      })
    }
  }
  
  // Nettoyer l'ancienne ligne (cache DOM)
  if (_currentHighlightedRow !== rowIndex && _currentHighlightedRow >= 0) {
    const oldRowElements = _domCache.rowElements.get(_currentHighlightedRow)
    if (oldRowElements) {
      oldRowElements.forEach(el => {
        el.classList.remove('dom-row-hovered')
        // Nettoyer le style inline pour weekend
        if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
          (el as HTMLElement).style.backgroundColor = ''
        }
      })
    }
  }
  
  // Ajouter la nouvelle colonne (cache DOM)
  if (columnIndex >= 0 && columnIndex !== _currentHighlightedColumn) {
    const newColumnElements = _domCache.columnElements.get(columnIndex)
    if (newColumnElements) {
      newColumnElements.forEach(el => {
        el.classList.add('dom-column-hovered')
        // FORCE inline style pour weekend - priorité absolue
        if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
          (el as HTMLElement).style.backgroundColor = 'rgba(76, 175, 80, 0.12)'
        }
      })
    }
  }
  
  // Ajouter la nouvelle ligne (cache DOM)
  if (rowIndex >= 0 && rowIndex !== _currentHighlightedRow) {
    const newRowElements = _domCache.rowElements.get(rowIndex)
    if (newRowElements) {
      newRowElements.forEach(el => {
        el.classList.add('dom-row-hovered')
        // FORCE inline style pour weekend - priorité absolue
        if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
          (el as HTMLElement).style.backgroundColor = 'rgba(76, 175, 80, 0.16)'
        }
      })
    }
  }
  
  _currentHighlightedColumn = columnIndex
  _currentHighlightedRow = rowIndex
}

// (logHover supprimée – debug)

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

// (eachDateInRange supprimée – inutilisée)

// ANCIENNES FONCTIONS DE FILTRAGE LOCAL - REMPLACÉES PAR LE SYSTÈME CENTRALISÉ
// function isAvailableInRange(collaborateurId: string, a: string, b?: string): boolean {
//   if (!a) return true
//   const days = b ? eachDateInRange(a, b) : [a]
//   if (!days.length) return false
//   return days.every(d => isAvailableOnDate(collaborateurId, d))
// }

// function hasExplicitIndispoInRange(collaborateurId: string, a: string, b?: string): boolean {
//   if (!a) return false
//   const days = b ? eachDateInRange(a, b) : [a]
//   for (const date of days) {
//     const dispos = getDisponibilites(collaborateurId, date)
//     if (dispos.some(d => {
//       const k = resolveDispoKind(d)
//       return k.type === 'indisponible' || k.type === 'mission'
//     })) return true
//   }
//   return false
// }

// function hasLieuInRange(collaborateurId: string, lieu: string, a: string, b?: string): boolean {
//   const canon = canonicalizeLieu(lieu)
//   if (!canon) return true
//   const days = b ? eachDateInRange(a, b) : [a]
//   for (const date of days) {
//     const dispos = getDisponibilites(collaborateurId, date)
//     if (dispos.some(d => canonicalizeLieu(d.lieu || '') === canon)) return true
//   }
//   return false
// }

// Mode développement (déclaré ici pour être disponible dans le filtrage ci-dessous)
const isDev = computed(() => {
  return import.meta.env.DEV || (typeof window !== 'undefined' && window.location.hostname === 'localhost')
})
// (alias isDevelopment supprimé – inutilisé)

// Filtres (inclut statut/lieu/coupes sur dates)
// MIGRATION: Utilisation du système centralisé usePlanningData
// const filteredCollaborateurs = computed(() => {
//   // Filtrage initial selon le rôle utilisateur
//   let baseCollaborateurs = allCollaborateurs.value
//   
//   // Si c'est un collaborateur, ne montrer que ses propres données
//   if (isCollaborateurInterface.value) {
//     const uid = auth.currentUser?.uid || ''
//     const email = auth.currentUser?.email || ''
//     // Tenter un match par userId si dispo, sinon fallback email
//     const byUserId = allCollaborateurs.value.filter(c => (c as any).userId && (c as any).userId === uid)
//     if (byUserId.length > 0) {
//       baseCollaborateurs = byUserId
//     } else if (email) {
//       baseCollaborateurs = allCollaborateurs.value.filter(c => c.email === email)
//     } else {
//       baseCollaborateurs = []
//     }
//   }
//   
//   // Si aucun filtre n'est actif du tout, retourner directement baseCollaborateurs
//   if (!planningFilters.hasActiveFilters.value) {
//     return baseCollaborateurs
//   }
//   
//   // Utiliser le système de filtrage centralisé
//   const results = planningFilters.filterCollaborateurs(baseCollaborateurs)
//   
//   // Si aucun filtre avancé n'est actif, retourner directement les résultats
//   if (!planningFilters.filterState.lieu && !planningFilters.filterState.statut) {
//     return results
//   }  // Filtres avancés spécifiques au planning (lieu et statut par date)
//   const effectiveStart = planningFilters.filterState.dateFrom || visibleDays.value[0]?.date || ''
//   const effectiveEnd = planningFilters.filterState.dateTo || visibleDays.value[visibleDays.value.length - 1]?.date || ''

//   const finalResults = results.filter(collab => {
//     // Filtre de lieu avec recherche dans les disponibilités
//     let lieuMatch = true
//     if (planningFilters.filterState.lieu && effectiveStart) {
//       lieuMatch = hasLieuInRange(collab.id, planningFilters.filterState.lieu, effectiveStart, effectiveEnd || undefined)
//     }
//     
//     // Filtres de statut intelligents
//     let statutMatch = true
//     if (planningFilters.filterState.statut && effectiveStart) {
//       if (planningFilters.filterState.statut === 'disponible') {
//         statutMatch = isAvailableInRange(collab.id, effectiveStart, effectiveEnd || undefined)
//       } else if (planningFilters.filterState.statut === 'indisponible') {
//         statutMatch = hasExplicitIndispoInRange(collab.id, effectiveStart, effectiveEnd || undefined)
//       }
//     }
//     
//     return lieuMatch && statutMatch
//   })
//   
//   return finalResults
// })

// Utiliser le système centralisé 
// (déclaration déplacée plus haut)

// Compteur pour détecter le shrink de la liste
const _prevFilteredCount = ref(0)

// Watcher unique et optimisé pour filteredCollaborateurs
// Fusionne: présence, virtualisation, reclampage scroll
watch(filteredCollaborateurs, async (list) => {
  // 1. Synchroniser les lignes de présence
  presenceRowsRef.value = list.map(c => ({ id: c.id }))
  
  // 2. Détecter shrink pour reset scroll
  const scroller = planningScroll.value
  if (list.length < _prevFilteredCount.value && scroller) {
    scroller.scrollTop = 0
  }
  _prevFilteredCount.value = list.length
  
  // 3. Recalculer la virtualisation
  await nextTick()
  if (scroller) {
    recomputeWindow(scroller)
    recomputeRowWindow(scroller)
    ensureRowsVisible()
  } else {
    recomputeWindow(null as any)
    recomputeRowWindow(null as any)
  }
  
  // 4. Fallback si windowedRows vide malgré des données
  await nextTick()
  if (list.length > 0 && windowedRows.value.length === 0) {
    rowWindowStartIndex.value = 0
    rowWindowEndIndex.value = Math.min(9, list.length - 1)
    await nextTick()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    if (windowedRows.value.length === 0) {
      forceRender()
    }
    // Dernier recours: simuler interaction
    if (windowedRows.value.length === 0) {
      setTimeout(async () => {
        const container = planningScroll.value || (document.querySelector('.excel-scroll') as HTMLElement | null)
        if (container) {
          container.scrollTop = container.scrollTop + 1
          container.scrollTop = container.scrollTop - 1
          await nextTick()
        }
      }, 50)
    }
  }
}, { immediate: true, deep: false })

// Watcher unique pour invalider le cache DOM quand la fenêtre virtuelle change
watch([windowedRows, windowedDays], () => {
  invalidateDOMCache('Fenêtre virtuelle changée')
}, { immediate: false, deep: false })

// CORRECTION: Watcher sur les changements de filtres pour forcer recalcul virtualisation
watch(planningFilters.filterState, async (newFilters, oldFilters) => {
  // Détecter si la plage de dates a changé
  const dateChanged = !!oldFilters && (
    newFilters.dateFrom !== oldFilters.dateFrom || newFilters.dateTo !== oldFilters.dateTo
  )

  // Vérifier si tous les filtres sont vides (remis à zéro)
  const allFiltersEmpty = !newFilters.search && 
                         !newFilters.metier && 
                         !newFilters.lieu && 
                         !newFilters.statut && 
                         !newFilters.dateFrom && 
                         !newFilters.dateTo

  await nextTick()

  // Recalcul de la virtualisation quand les filtres changent
  const scroller = planningScroll.value
  if (scroller) {
    // Recalcule complet (horizontal + vertical) sans forcer un scroll à gauche
    recomputeWindow(scroller)
    recomputeRowWindow(scroller)
  } else {
    recomputeWindow(null as any)
    recomputeRowWindow(null as any)
  }

  await nextTick()

  // Politique de recentrage: rester/aller à aujourd'hui si la plage de dates n'a pas été modifiée,
  // ou si tous les filtres sont vidés.
  if (allFiltersEmpty || !dateChanged) {
    setTimeout(() => {
      goToToday()
    }, 150)
  }

  // Force refresh automatique si les résultats ne s'affichent pas
  if (filteredCollaborateurs.value.length > 0 && windowedRows.value.length === 0) {
    setTimeout(async () => {
      await nextTick()
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      if (filteredCollaborateurs.value.length > 0 && windowedRows.value.length === 0) {
        const container = planningScroll.value || (document.querySelector('.excel-scroll') as HTMLElement | null)
        if (container) {
          container.dispatchEvent(new Event('focus'))
          container.scrollTop = container.scrollTop + 1
          container.scrollTop = container.scrollTop - 1
          container.click()
          await nextTick()
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        }
        if (windowedRows.value.length === 0) {
          forceRender()
        }
      }
    }, 120)
  }
}, { immediate: false, deep: true })

// (isDevelopment déjà défini plus haut)

// Statut du cache DOM pour l'indicateur de performance
const domCacheStatus = computed(() => {
  return {
    isValid: _domCache.cacheValid,
    elements: _domCache.columnElements.size + _domCache.rowElements.size,
    columns: _domCache.columnElements.size,
    rows: _domCache.rowElements.size
  }
})

// Suggestions contextuelles (utilise le système centralisé)
const suggestions = computed(() => {
  const lines: string[] = []
  const total = planningData.filterStats.value.totalCollaborateurs
  const start = planningFilters.filterState.dateFrom
  const end = planningFilters.filterState.dateTo || ''
  // Suggestion disponibilité globale pour une plage - utiliser les stats du système centralisé
  if (planningFilters.filterState.statut === 'disponible' && start) {
    const availCount = planningData.filterStats.value.filteredCollaborateurs
    lines.push(`${availCount} collaborateurs disponibles${end ? ` sur la période ${start} → ${end}` : ` le ${start}`} (sur ${total})`)
  }
  // Si un seul collaborateur reste après filtre nom/métier, proposer sa prochaine dispo
  if (filteredCollaborateurs.value.length === 1) {
    const c = filteredCollaborateurs.value[0]
    if (c) {
      const from = end || start || toDateStr(new Date())
      const next = findNextAvailability(c.id, from)
      if (next) lines.push(`Prochaine disponibilité pour ${c.prenom} ${c.nom} : ${next}`)
    }
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

// (totalDisponibilites/statutOptions/formatCurrentPeriod supprimés – inutilisés)

// monthSegments supprimé car non utilisé (remplacé par weekSegments avec monthLabel)

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

// (isWeekBoundary / getWeekSeparatorPosition obsolètes – remplacés par weekBoundaryPositions)

// (weekBoundaryPositions retiré – approche purement CSS pour dimanche)

// Détecte la fin de mois (jour dont le lendemain change de mois)
// (supprimé) Fin de mois: plus utilisée pour jours/body; le style mois utilise un séparateur dédié

const weekSegments = computed(() => {
  const segs: Array<{ key: string; week: number; count: number; monthLabel: string }> = []
  let currentWeek: number | null = null
  let count = 0
  let currentMonthLabel = ''
  
  for (let i = 0; i < visibleDays.value.length; i++) {
    const dateStr = visibleDays.value[i].date
    const w = getISOWeek(dateStr)
    
    // Récupérer le label du mois pour cette date
    const date = new Date(dateStr + 'T12:00:00')
    const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long' })
    const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
    
    if (currentWeek === null) {
      // Premier jour
      currentWeek = w
      count = 1
      currentMonthLabel = capitalizedMonth
    } else if (w === currentWeek && capitalizedMonth === currentMonthLabel) {
      // Même semaine, même mois
      count++
    } else if (w === currentWeek && capitalizedMonth !== currentMonthLabel) {
      // Même semaine mais changement de mois - créer un segment pour le mois précédent
      segs.push({ key: `w-${currentWeek}-${currentMonthLabel}-${i}`, week: currentWeek, count, monthLabel: currentMonthLabel })
      // Commencer un nouveau segment pour le nouveau mois dans la même semaine
      count = 1
      currentMonthLabel = capitalizedMonth
    } else {
      // Nouvelle semaine
      segs.push({ key: `w-${currentWeek}-${currentMonthLabel}-${i}`, week: currentWeek, count, monthLabel: currentMonthLabel })
      currentWeek = w
      count = 1
      currentMonthLabel = capitalizedMonth
    }
  }
  if (currentWeek != null && count > 0) {
    segs.push({ key: `w-${currentWeek}-${currentMonthLabel}-final`, week: currentWeek, count, monthLabel: currentMonthLabel })
  }
  return segs
})

// Fonction pour déterminer si un segment de semaine marque une frontière de mois
function isMonthBoundary(_seg: { week: number; monthLabel: string }, _segIndex: number): boolean {
  // Temporairement désactivé pour éviter les barres indésirables
  return false
  
  /* Logique originale commentée
  if (segIndex === 0) return false // Le premier segment n'est jamais une frontière
  
  const segments = weekSegments.value
  const prevSeg = segments[segIndex - 1]
  
  // C'est une frontière de mois SEULEMENT si :
  // Le segment précédent était de la même semaine mais d'un mois différent
  // (cela indique qu'une semaine chevauche deux mois)
  const isSameWeekDifferentMonth = prevSeg.week === seg.week && prevSeg.monthLabel !== seg.monthLabel
  
  return isSameWeekDifferentMonth
  */
}

// Gestion hover performante
// plus de setters de hover réactifs: supprimés

// Colonne survolée via overlay (CSS var en pixels)

// Fonction pour nettoyer complètement le state de highlighting
function clearAllHighlights() {
  // Nettoyer avec le cache DOM
  if (_currentHighlightedColumn >= 0) {
    const columnElements = _domCache.columnElements.get(_currentHighlightedColumn)
    if (columnElements) {
      columnElements.forEach(el => el.classList.remove('dom-column-hovered'))
    }
  }
  
  if (_currentHighlightedRow >= 0) {
    const rowElements = _domCache.rowElements.get(_currentHighlightedRow)
    if (rowElements) {
      rowElements.forEach(el => el.classList.remove('dom-row-hovered'))
    }
  }
  
  // Reset des variables de tracking
  _currentHighlightedColumn = -1
  _currentHighlightedRow = -1
  
  // Reset Vue reactivity
  hoveredColumnIndex.value = -1
  hoveredRowIndex.value = -1
  
  // Nettoyer le timer
  if (_debounceTimer) {
    clearTimeout(_debounceTimer)
    _debounceTimer = null
  }
}

function onGridMouseLeave() {
  clearAllHighlights()
  
  // Arrêter l'auto-scroll si on sort de la grille
  stopAutoScroll()
  
  // Nettoyer les attributs de column hover ET row hover
  if (planningScroll.value) {
    planningScroll.value.querySelectorAll('[data-column-hover="true"]').forEach(el => {
      el.removeAttribute('data-column-hover')
    })
    planningScroll.value.querySelectorAll('[data-row-hover="true"]').forEach(el => {
      el.removeAttribute('data-row-hover')
    })
  }
  
  // Reset simple des index - le CSS s'occupe du reste
  hoveredColumnIndex.value = -1
  hoveredRowIndex.value = -1
  
  // Reset des coordonnées
  _lastPointerX = 0
  _lastPointerY = 0
  
  // Nettoyer le timer de fin de scroll
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer)
    scrollEndTimer = null
  }
  
  // Nettoyer le hover collaboratif
  collaborationService.onMouseLeavePlanning()
}

// Fonction centralisée pour nettoyer les highlights crosshair
// Throttle pour cleanHoverHighlights - max 30fps (33ms) pour réactivité
let cleanHoverThrottleTimer: number | null = null
let pendingCleanHover = false

function cleanHoverHighlights() {
  if (!planningScroll.value) return
  
  // Si un nettoyage est déjà programmé, ne rien faire
  if (pendingCleanHover) return
  
  // Si le throttle est actif, programmer pour plus tard
  if (cleanHoverThrottleTimer !== null) {
    pendingCleanHover = true
    return
  }
  
  // Exécuter le nettoyage immédiatement
  executeCleanHover()
  
  // Activer le throttle
  cleanHoverThrottleTimer = window.setTimeout(() => {
    cleanHoverThrottleTimer = null
    
    // Si un nettoyage était en attente, l'exécuter maintenant
    if (pendingCleanHover) {
      pendingCleanHover = false
      executeCleanHover()
    }
  }, 50) // Max 20 nettoyages/seconde pour éviter les artefacts visuels
}

function executeCleanHover() {
  if (!planningScroll.value) return
  
  // Nettoyer tous les data attributes de hover
  const hoveredElements = planningScroll.value.querySelectorAll('[data-column-hover], [data-row-hover]')
  hoveredElements.forEach(el => {
    el.removeAttribute('data-column-hover')
    el.removeAttribute('data-row-hover')
  })
  
  // Nettoyer les styles inline weekend
  const weekendHoveredElements = planningScroll.value.querySelectorAll('.excel-cell.day-6, .excel-cell.day-0')
  weekendHoveredElements.forEach(el => {
    (el as HTMLElement).style.backgroundColor = ''
  })
}

// Plus aucune synchronisation JS nécessaire: header et colonne gauche sont sticky

// === HELPER FUNCTIONS ===

// Générer un ID collaborateur standardisé (compatible avec les docs Firestore)
// (generateCollaborateurId supprimée – inutilisée)

// Disponibilités
function getDisponibilites(collaborateurId: string, date: string): Disponibilite[] {
  // Ne retourner que les disponibilités du jour.
  // Les continuations (overnight/slot-night) de la veille sont gérées explicitement
  // par getCellDispos et par l’enrichissement de la modale.
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

// (timeKey supprimée – inutilisée)

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

// (timeLabelForCell supprimée – inutilisée)

// (fullTimeLabel supprimée – remplacée par getTemporalDisplay unifié)

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
  // NOTE: Les continuations overnight ont été désactivées à la demande des utilisateurs
  // Les disponibilités de nuit n'apparaissent maintenant que sur le jour de début
  // pour simplifier l'affichage et éviter la confusion
  return out
}

// Cache memoizé pour éviter de recalculer le tri à chaque render
function getCellDisposSorted(collaborateurId: string, date: string): CellDispo[] {
  // Clé de cache unique
  const cacheKey = `${collaborateurId}-${date}-${cellDisposCacheVersion}`
  
  // Vérifier le cache
  const cached = cellDisposSortedCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }
  
  // Calculer et mettre en cache
  const result = computeCellDisposSorted(collaborateurId, date)
  cellDisposSortedCache.set(cacheKey, result)
  
  // Limiter la taille du cache (garder les 1000 dernières entrées)
  if (cellDisposSortedCache.size > 1000) {
    const firstKey = cellDisposSortedCache.keys().next().value
    if (firstKey) cellDisposSortedCache.delete(firstKey)
  }
  
  return result
}

// Fonction de calcul effectif (appelée seulement si pas en cache)
function computeCellDisposSorted(collaborateurId: string, date: string): CellDispo[] {
  const toMin = (t?: string) => {
    if (!t) return 10_000
    const [h, m] = (t || '').split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const slotKey = (d: CellDispo) => {
    const k = resolveDispoKind(d)
    if (k.timeKind !== 'slot' || !k.slots?.length) return 10_000
    const sorted = [...k.slots].sort((a, b) => (slotOrder[a] || 99) - (slotOrder[b] || 99))
    return slotOrder[sorted[0]] || 99
  }
  const rangeKey = (d: CellDispo) => toMin(d.heure_debut)
  const continuationKey = (d: CellDispo) => {
    const k = resolveDispoKind(d)
    // Continuation slot-night: considérer une fin à 06:00
    if (k.timeKind === 'slot' && Array.isArray(k.slots) && k.slots.includes('night')) return 6 * 60
    return toMin(d.heure_fin)
  }
  return getCellDispos(collaborateurId, date)
    .slice()
    .sort((a, b) => {
      const ka = resolveDispoKind(a)
      const kb = resolveDispoKind(b)

      // full-day toujours après
      const aIsFull = ka.timeKind === 'full-day'
      const bIsFull = kb.timeKind === 'full-day'
      if (aIsFull && !bIsFull) return 1
      if (bIsFull && !aIsFull) return -1

      // continuations overnight (_cont==='end') en premier, triées par heure de fin
      const aIsCont = a._cont === 'end'
      const bIsCont = b._cont === 'end'
      if (aIsCont && bIsCont) return continuationKey(a) - continuationKey(b)
      if (aIsCont && !bIsCont) return -1
      if (bIsCont && !aIsCont) return 1

      // slots ensuite (ordre logique)
      const aIsSlot = ka.timeKind === 'slot'
      const bIsSlot = kb.timeKind === 'slot'
      if (aIsSlot && bIsSlot) return slotKey(a) - slotKey(b)
      if (aIsSlot && !bIsSlot) return -1
      if (bIsSlot && !aIsSlot) return 1

      // ranges et overnight starts: trier par heure de début
      return rangeKey(a) - rangeKey(b) || (typePriority(a) - typePriority(b))
    })
}

function resolveDispoKind(dispo: Disponibilite) {
  // Supporter modèles multiples:
  // - Legacy: type in {'mission','disponible','indisponible'}, timeKind in {'range','slot','full-day','overnight'}
  // - RTDB alt: type in {'standard','formation','urgence','maintenance'}, timeKind in {'fixed','flexible','oncall'}
  let type = dispo.type as any
  let timeKind = dispo.timeKind as any
  const slots = dispo.slots

  // Mapper types alternatifs vers legacy pour l’UI
  const mapTypeAltToLegacy = (t: string | undefined) => {
    switch (t) {
      case 'maintenance': return 'indisponible'
      case 'urgence': return 'mission'
      case 'formation': return 'mission'
      case 'standard': return 'disponible' // défaut neutre
      default: return t
    }
  }
  const mapTimeKindAltToLegacy = (k: string | undefined) => {
    switch (k) {
      case 'fixed':
        // fixed: si des slots existent, considérer comme 'slot', sinon fallback sur 'range'
        if (Array.isArray(dispo.slots) && dispo.slots.length > 0) return 'slot'
        if (dispo.heure_debut && dispo.heure_fin) return 'range'
        return 'range'
      case 'oncall': return 'slot'
      case 'flexible':
        // flexible: heures => range, slots => slot, sinon full-day
        if (dispo.heure_debut && dispo.heure_fin) return 'range'
        if (Array.isArray(dispo.slots) && dispo.slots.length > 0) return 'slot'
        return deriveTimeKindFromData(dispo) // ✅ garde le fallback centralisé
      default: return k
    }
  }

  type = mapTypeAltToLegacy(type)
  timeKind = mapTimeKindAltToLegacy(timeKind)

  if (type) {
    return { type, timeKind: (timeKind as any) || 'full-day', slots: slots || [] as string[] }
  }
  
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
    return { type: hasSpecificLocation ? 'mission' : 'disponible', timeKind: detectedTimeKind as any, slots: [] }
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
    if (timeKind !== 'full-day' && timeKind !== 'range' && timeKind !== 'slot' && timeKind !== 'overnight') {
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
    if (timeKind === 'overnight') {
      // Overnight = "Journée de nuit" (un seul jour, pas d'heures, juste affiche "Nuit")
      return { ...d, type, timeKind: 'overnight', isFullDay: true, lieu: '', heure_debut: '', heure_fin: '', slots: [] }
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

// (getDispoBarClass supprimée – ancien style)

function isOvernightContinuation(dispo: Partial<Disponibilite> & { _cont?: 'start'|'end' }, _cellDate: string) {
  // Si c'est marqué comme continuation, c'est une continuation
  if (dispo._cont === 'end') return true
  
  return false
}

function isOvernightStart(dispo: Partial<Disponibilite> & { _cont?: 'start'|'end' }, _cellDate: string) {
  // Si c'est une continuation, ce n'est pas un start
  if (dispo._cont === 'end') return false
  
  // Vérifier les slots pour "night"
  const k = resolveDispoKind(dispo as Disponibilite)
  if (k.timeKind === 'slot' && k.slots?.includes('night')) {
    return true
  }
  
  // Vérifier les horaires pour overnight
  if (dispo.heure_debut && dispo.heure_fin) {
    const startHour = parseInt(dispo.heure_debut.split(':')[0])
    const endHour = parseInt(dispo.heure_fin.split(':')[0])
    return endHour < startHour
  }
  
  return false
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
// Utilise getCellDisposSorted (memoizé) pour éviter les recalculs
function getCellKindClass(collaborateurId: string, date: string) {
  const list = getCellDisposSorted(collaborateurId, date)
  if (!list.length) return 'cell-empty'
  const hasInd = list.some(d => resolveDispoKind(d).type === 'indisponible')
  if (hasInd) return 'cell-indispo'
  const hasMission = list.some(d => resolveDispoKind(d).type === 'mission')
  if (hasMission) return 'cell-mission'
  return 'cell-dispo'
}

// (getDispoBarStyle supprimée – inutilisée)

// Info-bulle compacte pour chaque barre (léger: utilise l'attribut title natif)
function getDispoBarTitle(dispo: Disponibilite, _cellDate: string): string {
  const k = resolveDispoKind(dispo)

  // Helper pour libellé des créneaux avec horaires indicatifs
  const slotRange = (s: string) => {
    const map: Record<string, [string, string]> = {
      morning: ['06:00', '12:00'],
      midday: ['12:00', '14:00'],
      lunch: ['12:00', '14:00'],
      afternoon: ['14:00', '18:00'],
      evening: ['18:00', '22:00'],
      night: ['22:00', '06:00']
    }
    const r = map[s]
    if (!r) return ''
    const fmt = (t: string) => t.replace(':', 'h')
    return `${fmt(r[0])}–${fmt(r[1])}`
  }
  const slotsTooltip = (slots?: string[]) => {
    const arr = (slots || []).filter(Boolean)
    if (!arr.length) return ''
    // On affiche le libellé du créneau et une plage indicative
    const parts = arr.map(s => `${sharedSlotLabel(s)} (${slotRange(s)})`)
    return parts.join(' · ')
  }

  // Affichage temporel unifié (gère "Nuit", "Journée", horaires, créneaux)
  const temporal = sharedGetTemporalDisplay(dispo as any)

  if (k.type === 'mission') {
    const lieu = dispo.lieu ? canonicalizeLieu(dispo.lieu) : ''
    if (k.timeKind === 'slot' && k.slots?.length) {
      const st = slotsTooltip(k.slots)
      if (st) return lieu ? `${lieu} — ${st}` : st
      return lieu || 'Mission'
    }
    // Pour range/overnight/full-day: concaténer lieu + temporal
    if (temporal) return lieu ? `${lieu} — ${temporal}` : (lieu || temporal)
    return lieu || 'Mission'
  }

  if (k.type === 'disponible') {
    if (k.timeKind === 'slot' && k.slots?.length) {
      const st = slotsTooltip(k.slots)
      if (st) return st
    }
    return temporal || 'Disponible'
  }

  if (k.type === 'indisponible') {
    return 'Indisponible'
  }

  return temporal || ''
}

// ============================================
// NOUVELLES FONCTIONS POUR LE DESIGN AMÉLIORÉ
// ============================================

function getDispoCardClass(dispo: Disponibilite) {
  const k = resolveDispoKind(dispo)
  return `dispo-card-${k.type}`
}

function getDispoCardStyle(_dispo: Disponibilite) {
  return { width: '100%' }
}

function getDispoTypeIcon(dispo: Disponibilite) {
  return sharedGetDispoTypeIcon(dispo as any)
}

// (getDispoDisplayLabel supprimée – inutilisée)

// (formatTimeForCard supprimée – inutilisée)

// (slotLabel supprimée – inutilisée)

// Fonction unifiée pour l'affichage temporel (horaire/créneau/journée)
function getTemporalDisplay(dispo: Disponibilite, _cellDate: string): string {
  return sharedGetTemporalDisplay(dispo as any)
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
// (onStartTimeChange supprimée – inutilisée)

// Utils d'affichage

// Fonction pour corriger les missions overnight existantes
// (detectAndFixExistingOvernightMissions supprimée – maintenance manuelle)

// Fonction pour analyser les missions overnight sans les corriger (dry-run)
// (analyzeOvernightMissions supprimée – maintenance manuelle)

function formatPhone(phone: string) {
  return formatPhoneUtil(phone)
}

// Ancien calcul par durée — non utilisé depuis le layout vertical

// Layout des barres dans une cellule: single => une barre occupe toute la hauteur; dual => 2 barres se partagent à 50%; multi => barres partagent la hauteur
function getDispoBarsLayoutClass(collaborateurId: string, date: string) {
  // Utiliser les dispos enrichies de la cellule (inclut continuations de la veille)
  const count = getCellDispos(collaborateurId, date).length
  return sharedGetDispoBarsLayoutClass(count)
}

// Ancien calcul de durée supprimé (non utilisé)

// Modal
function openDispoModal(collaborateurId: string, date: string) {

  
  // Vérifier si la cellule est verrouillée par un autre utilisateur
  if (collaborationService && collaborationService.isCellLocked(collaborateurId, date)) {
    const lock = collaborationService.getCellLock(collaborateurId, date)
    if (lock) {
      // notify({
      //   title: 'Cellule verrouillée',
      //   message: `${lock.userName} est en train d'éditer cette cellule`,
      //   color: 'warning',
      //   duration: 3000
      // })

      return
    }
  }
  
  // Verrouiller la cellule pour cet utilisateur
  if (collaborationService) {
    collaborationService.lockCellForEditing(collaborateurId, date)
      .then(success => {
        if (!success) {
          // notify({
          //   title: 'Cellule verrouillée',
          //   message: 'Un autre utilisateur a verrouillé cette cellule en même temps',
          //   color: 'warning'
          // })
          return
        }

      })
  }
  
  // Notifier la présence de l'édition active
  handleCellEdit(date, collaborateurId)
  
  selectedCell.value = { collaborateurId, date }
  // Enrichir les dispos existantes pour édition (assurer type/timeKind/slots)
  const sameDaySanitized = getDisponibilites(collaborateurId, date).map((d) => {
    const cont = (d as any)._cont as ('start'|'end'|undefined)
    const k = resolveDispoKind(d)
    const merged: Partial<Disponibilite> = {
      ...d,
      type: k.type as Disponibilite['type'],
      timeKind: k.timeKind as Disponibilite['timeKind'],
      slots: k.timeKind === 'slot' ? (k.slots || []) : [],
    }
    const cleaned = sanitizeDisposition(merged)
    if (cleaned.timeKind === 'range') {
      cleaned.heure_debut = (d.heure_debut || '')
      cleaned.heure_fin = (d.heure_fin || '')
    }
    if (cleaned.type === 'mission') {
      cleaned.lieu = d.lieu || ''
    }
    if (cont) (cleaned as any)._cont = cont
    return cleaned as Disponibilite
  })

  // Ajouter les continuations depuis la veille (overnight range ou slot-night)
  const prev = addDaysStr(date, -1)
  const prevContinuations = getDisponibilites(collaborateurId, prev)
    .filter((d) => {
      const k = resolveDispoKind(d)
      // overnight range de la veille qui se poursuit aujourd'hui
      const isOvernightRange = (k.timeKind === 'range' || k.timeKind === 'overnight') && !!d.heure_debut && !!d.heure_fin && toMinutes(d.heure_fin)! < toMinutes(d.heure_debut)!
      // slot-night (22:00–06:00) de la veille
      const isSlotNight = k.timeKind === 'slot' && Array.isArray(k.slots) && k.slots.includes('night')
      return isOvernightRange || isSlotNight
    })
    .map((d) => {
      const k = resolveDispoKind(d)
      const merged: Partial<Disponibilite> = {
        ...d,
        type: k.type as Disponibilite['type'],
        timeKind: (k.timeKind === 'overnight' ? 'range' : k.timeKind) as Disponibilite['timeKind'],
        slots: k.timeKind === 'slot' ? (k.slots || []) : [],
      }
      const cleaned = sanitizeDisposition(merged)
      if (cleaned.timeKind === 'range') {
        cleaned.heure_debut = (d.heure_debut || '')
        cleaned.heure_fin = (d.heure_fin || '')
      }
      if (cleaned.type === 'mission') {
        cleaned.lieu = d.lieu || ''
      }
      // Marquer comme continuation; conserver la date d'origine (veille)
      ;(cleaned as any)._cont = 'end'
      return cleaned as Disponibilite
    })

  selectedCellDispos.value = [...prevContinuations, ...sameDaySanitized]
  showDispoModal.value = true
}


function getSelectedCollaborateur(): Collaborateur | null {
  // En mode batch, utiliser batchCollaborateurId
  if (isBatchMode.value && batchCollaborateurId.value) {
    const c = filteredCollaborateurs.value.find(c => c.id === batchCollaborateurId.value)
    return c || null
  }
  
  // En mode simple, utiliser selectedCell
  if (!selectedCell.value) return null
  const c = filteredCollaborateurs.value.find(c => c.id === selectedCell.value!.collaborateurId)
  return c || null
}

function formatModalDate(date: string) {
  // CORRECTION: Utiliser T12:00:00 pour éviter les problèmes de timezone UTC
  // Le problème "clic sur 22 → affichage 21" vient du décalage timezone
  return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Ouvrir le modal en mode batch (multi-dates)
 */
function openBatchModal() {
  // Ouvre la modale en mode batch à partir des cellules sélectionnées
  
  if (selectedCells.value.size === 0) {
    console.warn('❌ Aucune cellule sélectionnée')
    return
  }
  
  // Extraire le collaborateur et les dates (format attendu: `${collabId}-${YYYY-MM-DD}`)
  const cellsArray = Array.from(selectedCells.value)
  const firstCellId = cellsArray[0]
  // Utiliser slice pour être robuste même si l'ID contient des underscores
  const collabId = firstCellId.slice(0, -11)
  batchCollaborateurId.value = collabId
  // Filtrer pour ne garder que les cellules du même collaborateur
  const sameCollabCells = cellsArray.filter(id => id.startsWith(collabId + '-'))
  batchDates.value = sameCollabCells.map(cellId => cellId.slice(-10))
  if (batchDates.value.length === 0) {
    notify({ message: 'Sélection invalide: aucune date pour ce collaborateur', color: 'warning', position: 'top-right' })
    return
  }
  
  // Récupérer les disponibilités existantes pour toutes les dates sélectionnées
  const existingDispos: any[] = []
  for (const date of batchDates.value) {
    const dayDispos = getDisponibilites(collabId, date)
    dayDispos.forEach(dispo => {
      // Ajouter l'info de date pour l'affichage
      existingDispos.push({
        ...dispo,
        _batchDate: date,
        _batchFormattedDate: formatModalDate(date)
      })
    })
  }
  
  // Affecter les dispos existantes pour affichage dans la modale
  selectedCellDispos.value = existingDispos
  
  // Initialiser le formulaire
  const prefs = getLastFormPreferences()
  editingDispo.value = {
    type: prefs.type || 'disponible',
    timeKind: prefs.timeKind || 'full-day',
    heure_debut: prefs.heure_debut || '09:00',
    heure_fin: prefs.heure_fin || '17:00',
    lieu: prefs.lieu || '',
    slots: Array.isArray(prefs.slots) ? prefs.slots : []
  }
  
  // console.debug('Prefs:', prefs)
  
  // Ouvrir le modal
  isBatchMode.value = true
  isAddingNewDispo.value = true
  showDispoModal.value = true
  // Double assurance en fin de tick
  setTimeout(() => {
    if (!showDispoModal.value) showDispoModal.value = true
  }, 0)
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
// Fonction utilitaire pour identifier les continuations overnight de la veille (pour validation de conflit)
function isOvernightContinuationFromPrevDay(dispo: Partial<Disponibilite>): boolean {
  return (dispo as any)._cont === 'end'
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
    // Bloquer uniquement si une mission coexiste avec une indisponibilité journée complète
    const hasIndispoFD = list.some(d => {
      const k = resolveDispoKind(d as Disponibilite)
      return k.type === 'indisponible' && k.timeKind === 'full-day'
    })
    if (hasIndispoFD) return true

    // Laisser passer la cohabitation mission + disponible (elle sera nettoyée par handleAutoReplacementLogic)
  }
  return false
}
function wouldConflictWithCandidate(existing: Partial<Disponibilite>[], candidate: Partial<Disponibilite>): boolean {
  // Si le candidat est full-day et qu'il n'y a que des continuations overnight de la veille,
  // permettre l'ajout car une disponibilité full-day peut coexister avec des continuations overnight
  const candidateKind = resolveDispoKind(sanitizeDisposition({ ...candidate }) as Disponibilite)
  if (candidateKind.timeKind === 'full-day') {
    // Vérifier si toutes les disponibilités existantes sont des continuations overnight
    const onlyOvernightContinuations = existing.every(d => isOvernightContinuationFromPrevDay(d))
    if (onlyOvernightContinuations) {
      return false // Pas de conflit : full-day peut coexister avec des continuations overnight
    }
    
    // Filtrer les continuations overnight pour les autres vérifications de conflit
    const realExisting = existing.filter(d => !isOvernightContinuationFromPrevDay(d))
    const list = [...realExisting.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })]
    return wouldConflict(list)
  }
  
  // Pour les autres types, appliquer la logique normale
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
  }
  return null
}
function getConflictMessageWithCandidate(existing: Partial<Disponibilite>[], candidate: Partial<Disponibilite>): string | null {
  // Appliquer la même logique que wouldConflictWithCandidate
  const candidateKind = resolveDispoKind(sanitizeDisposition({ ...candidate }) as Disponibilite)
  if (candidateKind.timeKind === 'full-day') {
    const onlyOvernightContinuations = existing.every(d => isOvernightContinuationFromPrevDay(d))
    if (onlyOvernightContinuations) {
      return null // Pas de message de conflit
    }
    
    const realExisting = existing.filter(d => !isOvernightContinuationFromPrevDay(d))
    return getConflictMessage([...realExisting.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })])
  }
  
  return getConflictMessage([...existing.map(x => ({ ...x })), sanitizeDisposition({ ...candidate })])
}

function addNewDispo() {
  if (!selectedCell.value) return
  if (!canAddDispo.value) {
  const msg = getConflictMessageWithCandidate(selectedCellDispos.value, newDispo.value) || (violatesMissionDispoOverlap(selectedCellDispos.value, newDispo.value) ? 'Conflit: cette disponibilité chevauche une mission existante.' : null)
    // Notification supprimée: trop de toasts
    console.warn('⚠️ Conflit disponibilité:', msg)
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

    }
  }
  
  const dispo: Partial<Disponibilite> = {
    nom: collab.nom,
    prenom: collab.prenom,
    metier: collab.metier,
    phone: collab.phone || '',
    email: collab.email || '',
  note: collab.note || '',
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

// (addInlineRow supprimée – inutilisée)

function removeDispo(index: number) {
  selectedCellDispos.value.splice(index, 1)
  // Enregistrer automatiquement après suppression
  saveDispos()
}

function editDispo(dispo: Disponibilite | (Disponibilite & { _cont?: 'start'|'end' }), cellDate?: string) {
  const originalDate = dispo.date
  const k = resolveDispoKind(dispo as Disponibilite)
  // Si c’est une continuation venant de la veille (cellDate != originalDate), ouvrir la modale sur la date d’origine
  const targetDate = (cellDate && cellDate !== originalDate && k.timeKind === 'range') ? originalDate : (cellDate || originalDate)
  openDispoModal((dispo as any).collaborateurId || `${dispo.nom}-${dispo.prenom}`, targetDate)
}

// Conversion rapide disponibilité → mission
/*
async function convertDispoToMission(dispo: Disponibilite, newLieu?: string) {
  if (!dispo.id) {
    console.error('❌ Impossible de convertir: ID manquant')
    return
  }

  try {
    const currentKind = resolveDispoKind(dispo)
    
    // Si c'est déjà une mission, ne rien faire
    if (currentKind.type === 'mission') {
      notify({
        message: 'Cette disponibilité est déjà une mission',
        color: 'info'
      })
      return
    }

    const lieu = newLieu || prompt('Lieu de la mission:', dispo.lieu || '') || dispo.lieu || 'Mission'
    
    const updates = {
      lieu: lieu,
      type: 'urgence' as const, // Type RTDB pour mission
      version: (dispo.version || 0) + 1,
      updatedAt: Date.now(),
      updatedBy: 'conversion-rapide'
    }

    await disponibilitesRTDBService.updateDisponibilite(dispo.id, updates)
    
    notify({
      message: `✅ Disponibilité convertie en mission: ${lieu}`,
      color: 'success'
    })

    // Rafraîchir l'affichage
    await refreshDisponibilites(false)
    
  } catch (error) {
    console.error('❌ Erreur lors de la conversion:', error)
    notify({
      message: 'Erreur lors de la conversion',
      color: 'danger'
    })
  }
}
*/

// Gestion du remplacement automatique des disponibilités en conflit avec les missions
async function handleAutoReplacementLogic(date: string, collabId: string, newDispos: any[]): Promise<{ removedIds: string[]; removedEntries: Disponibilite[] }> {
  
  // Récupérer les disponibilités existantes pour cette date et ce collaborateur
  const existing = (disponibilitesCache.value.get(date) || []).filter(d => 
    d.collaborateurId === collabId && !(d as any)._cont
  )

  

  // Identifier les nouvelles missions
  const newMissions = newDispos.filter(d => resolveDispoKind(d).type === 'mission')

  

  const removedIds: string[] = []
  const removedEntries: Disponibilite[] = []

  // Pour chaque nouvelle mission, vérifier les conflits avec les disponibilités existantes
  for (const mission of newMissions) {
    const conflictingDispos = existing.filter(existingDispo => {
  const existingKind = resolveDispoKind(existingDispo)
      
      // Seules les disponibilités de type "disponible" peuvent être remplacées par des missions
      // Cela exclut les indisponibilités et autres missions
      if (existingKind.type !== 'disponible') return false
      
      // Vérifier le conflit horaire
      const hasConflict = hasTimeConflict(mission, existingDispo)
      return hasConflict
    })
    

    // Supprimer automatiquement les disponibilités en conflit
    for (const conflicting of conflictingDispos) {
      if (conflicting.id) {
        await disponibilitesRTDBService.deleteDisponibilite(conflicting.id)
        removedIds.push(conflicting.id)
        removedEntries.push(conflicting as Disponibilite)
        
        // Retirer du cache local
        const cached = disponibilitesCache.value.get(date) || []
        const filtered = cached.filter(d => d.id !== conflicting.id)
        disponibilitesCache.value.set(date, filtered)
        
        notify({
          message: `🔄 Disponibilité remplacée par la mission`,
          color: 'info'
        })
      }
    }
  }

  return { removedIds, removedEntries }
}

// Vérifier si deux disponibilités ont un conflit horaire
function hasTimeConflict(dispo1: any, dispo2: any): boolean {
  const kind1 = resolveDispoKind(dispo1)
  const kind2 = resolveDispoKind(dispo2)
  
  // Si l'une des deux est full-day, il y a conflit
  if (kind1.timeKind === 'full-day' || kind2.timeKind === 'full-day') {
    return true
  }
  
  // Si les deux ont des horaires, vérifier le chevauchement
  if (kind1.timeKind === 'range' && kind2.timeKind === 'range') {
    const start1 = dispo1.heure_debut
    const end1 = dispo1.heure_fin
    const start2 = dispo2.heure_debut
    const end2 = dispo2.heure_fin
    
    if (start1 && end1 && start2 && end2) {
      // Deux plages horaires se chevauchent si l'une commence avant que l'autre ne finisse
      const hasConflict = start1 < end2 && start2 < end1
      return hasConflict
    }
  }
  
  // Si l'une a des créneaux et l'autre des horaires, conflit potentiel
  if ((kind1.timeKind === 'slot' && kind2.timeKind === 'range') || 
      (kind1.timeKind === 'range' && kind2.timeKind === 'slot')) return true
      
  // Si les deux ont des créneaux, vérifier s'ils se chevauchent
  if (kind1.timeKind === 'slot' && kind2.timeKind === 'slot') {
    const slots1 = kind1.slots || []
    const slots2 = kind2.slots || []
    return slots1.some(s1 => slots2.includes(s1))
  }
  
  // Par défaut, pas de conflit
  return false
}

// (setExistingType supprimée – inutilisée)

// (setExistingTimeKind supprimée – inutilisée)

// (limitExistingSlots supprimée – non utilisée)

// === HELPER FUNCTIONS POUR BOUTONS ===

function getTypeColor(type: string): string {
  switch(type) {
    case 'mission': return 'primary'
    case 'disponible': return 'success'
    case 'indisponible': return 'danger'
    default: return 'secondary'
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

// (toggleExistingSlot supprimée – inutilisée)

// === FONCTIONS GESTION ÉDITION LIGNE ===

function getTypeText(type: string | undefined): string {
  const typeOpt = (typeOptions.value as any[]).find((opt: any) => opt.value === type)
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

  editingDispoIndex.value = null
  isAddingNewDispo.value = true
  // Charger les dernières préférences sauvegardées
  const prefs = getLastFormPreferences()
  editingDispo.value = {
    type: prefs.type,
    timeKind: prefs.timeKind,
    heure_debut: prefs.heure_debut,
    heure_fin: prefs.heure_fin,
    lieu: prefs.lieu,
    slots: [...prefs.slots] // Copier le tableau pour éviter les mutations
  }

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
  // Reset aux valeurs par défaut UNIQUEMENT si les champs sont vides
  if (timeKind === 'full-day') {
    // Journée entière: pas d'heures spécifiques (représente minuit à minuit implicitement)
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
    editingDispo.value.slots = []
  } else if (timeKind === 'range') {
    // Réinitialiser si les horaires sont vides (venant de full-day ou overnight)
    if (!editingDispo.value.heure_debut) {
      editingDispo.value.heure_debut = '09:00'
    }
    if (!editingDispo.value.heure_fin) {
      editingDispo.value.heure_fin = '17:00'
    }
    editingDispo.value.slots = []
  } else if (timeKind === 'slot') {
    editingDispo.value.slots = editingDispo.value.slots || []
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
  } else if (timeKind === 'overnight') {
    // Nuit = comme journée: pas d'heures, pas de slots, juste un flag d'affichage
    editingDispo.value.slots = []
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
  }
}

function toggleEditingSlot(slotValue: string) {
  // Cas spécial : si on sélectionne "journee", passer en mode full-day
  if (slotValue === 'journee') {
    editingDispo.value.timeKind = 'full-day'
    editingDispo.value.slots = []
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
    return
  }

  const currentSlots = editingDispo.value.slots || []
  editingDispo.value.slots = currentSlots.includes(slotValue)
    ? currentSlots.filter(s => s !== slotValue)
    : [...currentSlots, slotValue]
}

const isEditFormValid = computed(() => {
  const dispo = editingDispo.value
  
  if (!dispo.type || !dispo.timeKind) {
    return false
  }
  
  if (dispo.timeKind === 'range') {
    if (!dispo.heure_debut || !dispo.heure_fin) {
      return false
    }
  }
  
  if (dispo.timeKind === 'slot') {
    if (!dispo.slots || dispo.slots.length === 0) {
      return false
    }
  }
  
  if (dispo.type === 'mission' && !dispo.lieu) {
    return false
  }
  
  return true
})

function saveEditDispo() {
  if (!isEditFormValid.value) {
    return
  }
  
  // Appliquer la détection automatique des missions overnight comme côté admin
  let processedDispo = { ...editingDispo.value }
  
  // Détection automatique des missions overnight
  if (processedDispo.timeKind === 'range' && processedDispo.heure_debut && processedDispo.heure_fin) {
    const startTime = parseInt(processedDispo.heure_debut.split(':')[0])
    const endTime = parseInt(processedDispo.heure_fin.split(':')[0])
    
    // Si l'heure de fin est plus petite que l'heure de début, c'est une mission de nuit
    if (endTime < startTime || (endTime === startTime && processedDispo.heure_fin < processedDispo.heure_debut)) {
      // Garder timeKind comme 'range' mais le système détectera automatiquement l'overnight
      // côté affichage et traitement
    }
  }
  
  const newDispo = sanitizeDisposition(processedDispo) as Disponibilite
  
  if (isAddingNewDispo.value) {
    // Mode simple: remplacement complet des dispos existantes par la nouvelle
    // pour uniformiser avec le comportement batch.
    selectedCellDispos.value = [newDispo]
    
    // Sauvegarder les préférences de formulaire pour réutilisation
    saveFormPreferences({
      type: processedDispo.type,
      timeKind: processedDispo.timeKind,
      heure_debut: processedDispo.heure_debut || '09:00',
      heure_fin: processedDispo.heure_fin || '17:00',
      lieu: processedDispo.lieu || '',
      slots: processedDispo.slots || []
    })

  } else {
    // Modifier ligne existante
    const index = editingDispoIndex.value!
    const temp = selectedCellDispos.value.slice()
    temp[index] = newDispo
    if (wouldConflict(temp)) {
      // const msg = getConflictMessage(temp) || 'Conflit: combinaison invalide pour cette journée.'
      // notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
      return
    }
    selectedCellDispos.value[index] = newDispo
    
  }
  
  cancelEditDispo()
  
  // Enregistrer automatiquement la disponibilité
  saveDispos()
}

/**
 * Sauvegarder les disponibilités en mode batch (plusieurs dates)
 */
async function saveBatchDispos() {
  if (!isBatchMode.value || batchDates.value.length === 0 || !batchCollaborateurId.value) {
    return
  }
  
  if (!isEditFormValid.value) {
    notify({
      message: 'Veuillez compléter le formulaire (type, durée, et lieu si mission).',
      color: 'warning',
      position: 'top-right',
      duration: 3000
    })
    return
  }
  
  saving.value = true
  try {
    const collabId = batchCollaborateurId.value
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    // Préparer la disponibilité à créer
    let processedDispo = { ...editingDispo.value }
    
    // Détection automatique des missions overnight
    if (processedDispo.timeKind === 'range' && processedDispo.heure_debut && processedDispo.heure_fin) {
      const startTime = parseInt(processedDispo.heure_debut.split(':')[0])
      const endTime = parseInt(processedDispo.heure_fin.split(':')[0])
      
      if (endTime < startTime || (endTime === startTime && processedDispo.heure_fin < processedDispo.heure_debut)) {
        // Garder timeKind comme 'range' mais le système détectera automatiquement l'overnight
      }
    }
    
  const newDispo = sanitizeDisposition(processedDispo) as Disponibilite
    
    // Créer la disponibilité pour chaque date sélectionnée (remplace les existantes)
    for (const date of batchDates.value) {
      // 0) Supprimer d'abord les disponibilités existantes de ce collaborateur sur cette date
      const existingDispos = getDisponibilites(collabId, date)
      
      // 1) Nettoyage optimiste du cache local (supprimer les existantes du collaborateur)
      const existingCache = disponibilitesCache.value.get(date) || []
      const filteredCache = existingCache.filter(d => d.collaborateurId !== collabId)
      
      // 2) Ajouter la nouvelle disponibilité au cache
      const localId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const localDispo: any = {
        id: localId,
        collaborateurId: collabId,
        date,
        type: newDispo.type,
        timeKind: newDispo.timeKind,
        isFullDay: newDispo.timeKind === 'full-day',
        lieu: newDispo.lieu || '',
        heure_debut: newDispo.heure_debut || '',
        heure_fin: newDispo.heure_fin || '',
        slots: newDispo.slots || [],
        tenantId,
      }
      disponibilitesCache.value.set(date, [...filteredCache, localDispo])
      
      // 3) Suppression distante des disponibilités existantes
      for (const existingDispo of existingDispos) {
        if (existingDispo.id) {
          try {
            await disponibilitesRTDBService.deleteDisponibilite(existingDispo.id)
          } catch (e) {
            console.error('Échec suppression existante pour', date, existingDispo.id, e)
          }
        }
      }
      
      // 4) Persistance distante de la nouvelle disponibilité (RTDB)
      const canonLieu = newDispo.lieu ? canonicalizeLieu(newDispo.lieu) : ''
      
      // Mapper les types legacy vers RTDB
      const mapLegacyTypeToRTDB = (legacyType: string | undefined): 'standard' | 'formation' | 'urgence' | 'maintenance' => {
        switch (legacyType) {
          case 'mission': return 'urgence'
          case 'disponible': return 'standard'
          case 'indisponible': return 'maintenance'
          default: return 'standard'
        }
      }
      
      const mapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' | 'overnight' => {
        switch (legacyTimeKind) {
          case 'range': return 'flexible'
          case 'slot': return 'fixed'
          case 'full-day': return 'flexible'
          case 'overnight': return 'overnight' // Préserver overnight explicitement
          default: return 'flexible'
        }
      }
      
      const dispoData = {
        date,
        collaborateurId: collabId,
        tenantId,
        type: mapLegacyTypeToRTDB(newDispo.type),
        timeKind: mapLegacyTimeKindToRTDB(newDispo.timeKind),
        heure_debut: newDispo.heure_debut || '',
        heure_fin: newDispo.heure_fin || '',
        lieu: canonLieu,
        slots: newDispo.slots || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'ui',
        version: 1
      }
      
      try {
        await disponibilitesRTDBService.createDisponibilite(dispoData as any)
      } catch (e) {
        console.error('Échec création distante pour', date, e)
      }
    }
    
    // Sauvegarder les préférences de formulaire
    saveFormPreferences({
      type: processedDispo.type,
      timeKind: processedDispo.timeKind,
      heure_debut: processedDispo.heure_debut || '09:00',
      heure_fin: processedDispo.heure_fin || '17:00',
      lieu: processedDispo.lieu || '',
      slots: processedDispo.slots || []
    })
    
    // Afficher notification de succès
    notify({ 
      message: `${batchDates.value.length} disponibilité${batchDates.value.length > 1 ? 's' : ''} mise${batchDates.value.length > 1 ? 's' : ''} à jour`, 
      color: 'success',
      position: 'top-right',
      duration: 3000
    })
    
    // Mettre à jour selectedCellDispos pour refléter le remplacement
    const newBatchDispos: any[] = []
    for (const date of batchDates.value) {
      newBatchDispos.push({
        ...newDispo,
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        collaborateurId: collabId,
        date,
        _batchDate: date,
        _batchFormattedDate: formatModalDate(date)
      })
    }
    selectedCellDispos.value = newBatchDispos
    
    // Nettoyer la sélection et fermer le modal
    clearSelection()
    cancelModal()
    // Optionnel: synchroniser en arrière-plan pour remplacer les IDs temporaires
    setTimeout(() => {
      refreshDisponibilites(false)
    }, 400)
    
  } catch (error: any) {
    console.error('Erreur lors de la création batch:', error)
    notify({ 
      message: 'Erreur lors de la création des disponibilités', 
      color: 'danger',
      position: 'top-right',
      duration: 4000
    })
  } finally {
    saving.value = false
  }
}

/**
 * Supprimer toutes les disponibilités des dates sélectionnées en mode batch
 */
async function deleteBatchDispos() {
  if (!isBatchMode.value || batchDates.value.length === 0 || !batchCollaborateurId.value) {
    return
  }
  
  // Compter les disponibilités à supprimer
  let totalDispos = 0
  for (const date of batchDates.value) {
    const existingDispos = getDisponibilites(batchCollaborateurId.value, date)
    totalDispos += existingDispos.length
  }
  
  if (totalDispos === 0) {
    notify({
      message: 'Aucune disponibilité à supprimer sur les dates sélectionnées.',
      color: 'info',
      position: 'top-right',
      duration: 3000
    })
    return
  }
  
  saving.value = true
  try {
    const collabId = batchCollaborateurId.value
    
    // Supprimer pour chaque date sélectionnée
    for (const date of batchDates.value) {
      const existingDispos = getDisponibilites(collabId, date)
      
      // 1) Suppression optimiste du cache local
      const existingCache = disponibilitesCache.value.get(date) || []
      const filteredCache = existingCache.filter(d => d.collaborateurId !== collabId)
      disponibilitesCache.value.set(date, filteredCache)
      
      // 2) Suppression distante (RTDB)
      for (const dispo of existingDispos) {
        if (dispo.id) {
          try {
            await disponibilitesRTDBService.deleteDisponibilite(dispo.id)
          } catch (e) {
            console.error('Échec suppression distante pour', date, dispo.id, e)
          }
        }
      }
    }
    
    // Vider la liste des dispos dans la modale
    selectedCellDispos.value = []
    
    // Afficher notification de succès
    notify({ 
      message: `${totalDispos} disponibilité${totalDispos > 1 ? 's' : ''} supprimée${totalDispos > 1 ? 's' : ''}`, 
      color: 'success',
      position: 'top-right',
      duration: 3000
    })
    
    // Optionnel: synchroniser en arrière-plan
    setTimeout(() => {
      refreshDisponibilites(false)
    }, 400)
    
  } catch (error: any) {
    console.error('Erreur lors de la suppression batch:', error)
    notify({ 
      message: 'Erreur lors de la suppression des disponibilités', 
      color: 'danger',
      position: 'top-right',
      duration: 4000
    })
  } finally {
    saving.value = false
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
      // const msg = getConflictMessage(selectedCellDispos.value) || 'Conflit: combinaison invalide pour cette journée.'
      // notify({ message: msg, color: 'warning', position: 'top-right', duration: 3500 })
      // ne rien sauvegarder; rester dans la modale
      saving.value = false
      return
    }

    const tenantId = AuthService.currentTenantId || 'keydispo'
    const date = selectedCell.value.date
    const collabId = selectedCell.value.collaborateurId

    // Récupérer l'état avant édition
    const before = (disponibilitesCache.value.get(date) || []).filter(d => d.collaborateurId === collabId)
    // Exclure les continuations (_cont==='end') de la sauvegarde: elles sont affichées pour contexte mais appartiennent à la veille
    let after = selectedCellDispos.value.filter(d => (d as any)._cont !== 'end')

    // NOUVELLE LOGIQUE : Remplacement automatique des disponibilités en conflit avec les missions
    const replacementResult = await handleAutoReplacementLogic(date, collabId, after)

    if (replacementResult.removedIds.length || replacementResult.removedEntries.length) {
      const removedIdSet = new Set(replacementResult.removedIds)
      const shouldRemove = (entry: Partial<Disponibilite>) => {
        if (entry.id && removedIdSet.has(entry.id)) return true
        return replacementResult.removedEntries.some(removed => !removed.id && !entry.id && removed.type === entry.type && removed.timeKind === entry.timeKind && removed.lieu === entry.lieu && removed.heure_debut === entry.heure_debut && removed.heure_fin === entry.heure_fin)
      }

      selectedCellDispos.value = selectedCellDispos.value.filter(d => !shouldRemove(d))
      after = after.filter(d => !shouldRemove(d))
      
    }

    // Recalculer les diff après éventuelles suppressions
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

    // MIGRATION VERS RTDB: Remplacer Firestore batch par des opérations RTDB séquentielles

    // Créations
    for (const d of toCreate) {
      const canonLieu = d.lieu ? canonicalizeLieu(d.lieu) : ''
      
      // Mapper les types legacy vers RTDB (préserver la sémantique)
      const mapLegacyTypeToRTDB = (legacyType: string | undefined): 'standard' | 'formation' | 'urgence' | 'maintenance' => {
        switch (legacyType) {
          case 'mission': return 'urgence'  // Mission = urgence pour distinction
          case 'disponible': return 'standard'  // Disponible = standard
          case 'indisponible': return 'maintenance'  // Indisponible = maintenance
          default: return 'standard'
        }
      }
      
      const mapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' | 'overnight' => {
        switch (legacyTimeKind) {
          case 'range': return 'flexible'
          case 'slot': return 'fixed'
          case 'full-day': return 'flexible'
          case 'overnight': return 'overnight' // Préserver overnight explicitement
          default: return 'flexible'
        }
      }
      
      const newDispo = {
        // clés principales (id sera généré automatiquement par RTDB)
        tenantId,
        collaborateurId: collabId,
        date,
        // identité
        nom: d.nom || '', 
        prenom: d.prenom || '', 
        metier: d.metier || '', 
        phone: d.phone || '', 
        email: d.email || '', 
        ville: d.ville || '',
        // modèle dispo
        lieu: canonLieu || '',
        heure_debut: d.heure_debut || '',
        heure_fin: d.heure_fin || '',
        type: mapLegacyTypeToRTDB(d.type),
        timeKind: mapLegacyTimeKindToRTDB(d.timeKind),
        slots: Array.isArray(d.slots) ? d.slots : [],
        isFullDay: d.timeKind === 'full-day' || d.timeKind === 'overnight', // overnight aussi full-day
        // audit minimal
        version: 1,
        updatedAt: Date.now(),
        updatedBy: 'ui',
      }
      
      const createdDispoId = await disponibilitesRTDBService.createDisponibilite(newDispo)
      d.id = createdDispoId // Mettre à jour l'ID local
      
      if (canonLieu) {
        lieuOptions.value = Array.from(new Set([...lieuOptions.value, canonLieu]))
      }
    }

    // Mises à jour
    for (const d of toUpdate) {
      const canonLieu = d.lieu ? canonicalizeLieu(d.lieu) : ''
      
      // Mapper les types legacy vers RTDB (réutiliser les fonctions de mapping cohérentes)
      const mapLegacyTypeToRTDB = (legacyType: string | undefined): 'standard' | 'formation' | 'urgence' | 'maintenance' => {
        switch (legacyType) {
          case 'mission': return 'urgence'  // Mission = urgence pour distinction
          case 'disponible': return 'standard'  // Disponible = standard
          case 'indisponible': return 'maintenance'  // Indisponible = maintenance
          default: return 'standard'
        }
      }
      
      const mapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' | 'overnight' => {
        switch (legacyTimeKind) {
          case 'range': return 'flexible'
          case 'slot': return 'fixed'
          case 'full-day': return 'flexible'
          case 'overnight': return 'overnight' // Préserver overnight explicitement
          default: return 'flexible'
        }
      }
      
      const updatedData = {
        lieu: canonLieu || '',
        // Overnight n'a pas d'heures (comme full-day)
        heure_debut: d.timeKind === 'range' ? (d.heure_debut || '') : '',
        heure_fin: d.timeKind === 'range' ? (d.heure_fin || '') : '',
        type: mapLegacyTypeToRTDB(d.type),
        timeKind: mapLegacyTimeKindToRTDB(d.timeKind),
        slots: Array.isArray(d.slots) ? d.slots : [],
        isFullDay: d.timeKind === 'full-day' || d.timeKind === 'overnight', // overnight aussi full-day
        updatedAt: Date.now(),
        updatedBy: 'ui',
      }
      
      await disponibilitesRTDBService.updateDisponibilite(d.id!, updatedData)
      
      if (canonLieu) {
        lieuOptions.value = Array.from(new Set([...lieuOptions.value, canonLieu]))
      }
    }

    // Suppressions
    for (const id of toDeleteIds) {
      await disponibilitesRTDBService.deleteDisponibilite(id)
    }

    // ✅ MISE À JOUR DU CACHE LOCAL IMMÉDIATEMENT
    // Mettre à jour le cache local avec les nouvelles données pour affichage immédiat
    const existingForDate = disponibilitesCache.value.get(date) || []
    const updatedForDate = existingForDate.filter(d => d.collaborateurId !== collabId)
    
    // Ajouter les nouvelles disponibilités sauvegardées
  for (const d of after) {
      updatedForDate.push({
        ...d,
        tenantId,
        collaborateurId: collabId,
        date,
        updatedAt: new Date(), // Timestamp local
        updatedBy: 'ui'
      })
    }
    
    // Mettre à jour le cache
    disponibilitesCache.value.set(date, updatedForDate)


    // Forcer un rafraîchissement visuel
    await nextTick()

    // Notifier la fin de l'édition et fermer le modal
    handleEditClose()
    
    // Notification de succès SUPPRIMÉE
    // notify({ 
    //   message: 'Disponibilité sauvegardée avec succès', 
    //   color: 'success',
    //   position: 'top-right',
    //   duration: 3000
    // })
  } catch (error) {
    console.error('Erreur sauvegarde:', error)
  } finally {
    saving.value = false
  }
}

function cancelModal() {
  // Notifier la fin de l'édition et fermer le modal
  handleEditClose()
}

// Navigation

function goToToday() {
  const scroller = planningScroll.value
  if (!scroller) return
  
  // Chercher l'index d'aujourd'hui dans les jours visibles (filtrés), pas dans tous les jours chargés
  const todayIndex = visibleDays.value.findIndex(d => d.isToday)
  
  if (todayIndex < 0) {
    // Aujourd'hui n'est pas dans la plage filtrée - afficher un message ou ne rien faire
    
    return
  }
  
  // Calculer la position de scroll basée sur l'index dans visibleDays
  const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
  scroller.scrollTo({ left: centerOffset, behavior: 'auto' })
  
  
  // Plus besoin d'updateTodayOverlayX - highlights gérés par CSS
}

// (goToNextWeek supprimée – inutilisée)

// Chargement des données
// (loadCollaborateursFromFirebase supprimée – gérée par composable)

async function loadDisponibilitesFromRTDB(dateDebut: string, dateFin: string) {
  if (loadingDisponibilites.value) return []
  
  try {
    loadingDisponibilites.value = true

    
    // Utiliser le nouveau service RTDB (0 lecture Firestore!)
    const disponibilites = await disponibilitesRTDBService.getDisponibilitesByDateRange(dateDebut, dateFin)
    
    // console.log(`✅ RTDB: ${disponibilites.length} disponibilités chargées`)
    
    // Transformer les données RTDB vers le format existant pour compatibilité
    const formattedDisponibilites = disponibilites.map((dispo: DisponibiliteRTDB) => {
      const canonLieu = canonicalizeLieu(dispo.lieu || '')
      
      // Mapper les types RTDB vers les types attendus par l'interface
      const mapRTDBTypeToLegacy = (rtdbType: string | undefined) => {
        switch (rtdbType) {
          case 'standard': return 'disponible'  // Standard = disponible
          case 'formation': return 'mission'    // Formation = mission
          case 'urgence': return 'mission'      // Urgence = mission 
          case 'maintenance': return 'indisponible'
          default: return 'disponible'
        }
      }
      
      const mapRTDBTimeKindToLegacy = (rtdbTimeKind: string | undefined): 'range' | 'slot' | 'full-day' | 'overnight' => {
        switch (rtdbTimeKind) {
          case 'fixed': return 'slot'
          case 'flexible': return dispo.isFullDay ? 'full-day' : 'range'
          case 'overnight': return 'overnight' // Préserver overnight explicitement depuis RTDB
          default: return 'range'
        }
      }
      
      const formatted = {
        id: dispo.id,
        collaborateurId: dispo.collaborateurId,
        date: dispo.date,
        lieu: canonLieu,
        heure_debut: dispo.heure_debut || '',
        heure_fin: dispo.heure_fin || '',
        type: mapRTDBTypeToLegacy(dispo.type),
        timeKind: mapRTDBTimeKindToLegacy(dispo.timeKind), // Lire directement depuis RTDB
        slots: Array.isArray(dispo.slots) ? dispo.slots : undefined,
        isFullDay: dispo.isFullDay ?? undefined,
        nom: dispo.nom || '',
        prenom: dispo.prenom || '',
        metier: dispo.metier || '',
        phone: dispo.phone || '',
        email: dispo.email || '',
        note: dispo.note || '',
        tenantId: dispo.tenantId,
        // Champs requis par l'interface Disponibilite
        version: dispo.version || 1,
        updatedAt: new Date(dispo.updatedAt || Date.now()), // Convertir timestamp en Date
        updatedBy: dispo.updatedBy || 'system'
      }
      
      return formatted
    })
    
    return formattedDisponibilites
    
  } catch (error) {
    console.error('❌ Erreur chargement disponibilités RTDB:', error)
    // Plus de fallback Firestore - RTDB uniquement
    return [] // Retourner un tableau vide en cas d'erreur
  } finally {
    loadingDisponibilites.value = false
    
    // Vérifier si le planning est prêt
    checkPlanningReadiness()
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
    // console.log(`📅 Fenêtre ${dateDebut} → ${dateFin} déjà en cache, pas de fetch`)
  } else {
    // console.log(`📅 Chargement dispos (sous-plages manquantes):`, missing)
    fetchingRanges.value = true
    try {
      for (const sub of missing) {
        // MIGRATION RTDB: Chargement depuis Realtime Database
        const disponibilites = await loadDisponibilitesFromRTDB(sub.start, sub.end)
        // Organiser par date et fusionner
        const byDate = new Map<string, any[]>()
        
        // S'assurer que disponibilites est un tableau
        if (Array.isArray(disponibilites)) {

          disponibilites.forEach(dispo => {
            const date = dispo.date
            if (!byDate.has(date)) byDate.set(date, [])
            byDate.get(date)!.push(dispo)
          })
        } else {
          console.warn('⚠️ Les disponibilités ne sont pas un tableau:', disponibilites)
        }
        
        for (const [date, dispos] of byDate) {
          const existing = disponibilitesCache.value.get(date) || []
          // Varier la stratégie: ici on remplace la journée entière par les dernières données
          disponibilitesCache.value.set(date, dispos.length ? dispos : existing)
        }
        // Marquer comme chargée cette sous-plage
        addLoadedRange(sub.start, sub.end)
      }
      
      // Log final du cache
      let totalDispos = 0
      disponibilitesCache.value.forEach(dispos => totalDispos += dispos.length)
      // console.log(`📊 TOTAL CACHE après chargement: ${totalDispos} disponibilités sur ${disponibilitesCache.value.size} jours`)
      
    } finally {
      fetchingRanges.value = false
      
      // Vérifier si le planning est prêt
      checkPlanningReadiness()
    }
  }
  
  // Mettre à jour les options de lieux
  updateLieuxOptions()
  
  // 🔄 AJOUT LISTENER TEMPS RÉEL pour synchronisation automatique
  disponibilitesRTDBService.listenToDisponibilitesByDateRange(
    dateDebut, 
    dateFin,
    (disponibilites) => {
      
      // Organiser par date exactement comme le chargement initial
      const byDate = new Map<string, any[]>()
      
      if (Array.isArray(disponibilites)) {
        // Helpers de mapping vers le modèle UI (legacy)
        const mapTypeAnyToLegacy = (t: string | undefined) => {
          switch (t) {
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
  // (mapTimeKindAnyToLegacy supprimée – non utilisée)

        disponibilites.forEach(dispo => {
          const canonLieu = canonicalizeLieu(dispo.lieu || '')
          // Fallback: si type/timeKind absents, normaliser depuis lieu/heures
          const normalized = (!dispo.type && !dispo.timeKind)
            ? normalizeDispoShared({
                date: dispo.date,
                lieu: dispo.lieu || '',
                heure_debut: dispo.heure_debut || '',
                heure_fin: dispo.heure_fin || ''
              })
            : null
          
          const formatted = {
            id: dispo.id,
            collaborateurId: dispo.collaborateurId,
            date: dispo.date,
            lieu: canonLieu,
            heure_debut: dispo.heure_debut || '',
            heure_fin: dispo.heure_fin || '',
            type: normalized ? normalized.type : mapTypeAnyToLegacy(dispo.type as any),
            timeKind: normalized ? normalized.timeKind : (dispo.timeKind === 'overnight' ? 'overnight' : (dispo.timeKind === 'fixed' ? (Array.isArray(dispo.slots) && dispo.slots.length > 0 ? 'slot' : (dispo.heure_debut && dispo.heure_fin ? 'range' : 'range')) : (dispo.timeKind === 'flexible' ? ((dispo.heure_debut && dispo.heure_fin) ? 'range' : (Array.isArray(dispo.slots) && dispo.slots.length > 0 ? 'slot' : 'full-day')) : (dispo.heure_debut && dispo.heure_fin ? 'range' : 'full-day')))),
            slots: Array.isArray(dispo.slots) ? dispo.slots : undefined,
            isFullDay: dispo.isFullDay ?? undefined,
            nom: dispo.nom || '',
            prenom: dispo.prenom || '',
            metier: dispo.metier || '',
            phone: dispo.phone || '',
            email: dispo.email || '',
            note: dispo.note || '',
            tenantId: dispo.tenantId,
            version: dispo.version || 1,
            updatedAt: dispo.updatedAt,
            updatedBy: dispo.updatedBy
          }
          
          if (!byDate.has(dispo.date)) byDate.set(dispo.date, [])
          byDate.get(dispo.date)!.push(formatted)
        })
        
        // Mettre à jour le cache existant SANS changer le format
        byDate.forEach((dispos, date) => {
          disponibilitesCache.value.set(date, dispos)
        })
      }
    }
  )
}

// ==========================================
// SYNCHRONISATION TEMPS RÉEL
// ==========================================

/**
 * Démarrer la synchronisation temps réel pour la zone visible
 */
function startRealtimeSync() {
  if (!visibleDays.value.length) {
    return
  }
  
  const firstDay = visibleDays.value[0]
  const lastDay = visibleDays.value[visibleDays.value.length - 1]
  if (!firstDay || !lastDay) {
    console.warn('⚠️ Impossible de démarrer sync temps réel: jours non définis')
    return
  }
  
  const dateDebut = firstDay.date
  const dateFin = lastDay.date
  
  // Vérifier si on a déjà un listener pour cette plage exacte
  const currentListenerId = `${dateDebut}_${dateFin}`
  if (realtimeListeners.value.includes(currentListenerId)) {
    
    return
  }
  
  
  
  // Démarrer le listener RTDB pour cette plage
  const listenerId = disponibilitesRTDBService.listenToDisponibilitesByDateRange(
    dateDebut, 
    dateFin,
    (disponibilites) => {
      

      // Regrouper par date (clé = date) pour rester cohérent avec le cache
      const byDate = new Map<string, any[]>()

      const mapTypeAnyToLegacy = (t: string | undefined) => {
        switch (t) {
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
  // (mapTimeKindAnyToLegacy supprimée – non utilisée)

      disponibilites.forEach(dispo => {
        const date = dispo.date
        if (!byDate.has(date)) byDate.set(date, [])
        const canonLieu = canonicalizeLieu(dispo.lieu || '')
        const normalized = (!dispo.type && !dispo.timeKind)
          ? normalizeDispoShared({
              date: dispo.date,
              lieu: dispo.lieu || '',
              heure_debut: dispo.heure_debut || '',
              heure_fin: dispo.heure_fin || ''
            })
          : null
        
        byDate.get(date)!.push({
          id: dispo.id,
          collaborateurId: dispo.collaborateurId,
          nom: dispo.nom || '',
          prenom: dispo.prenom || '',
          metier: dispo.metier || '',
          phone: dispo.phone || '',
          email: dispo.email || '',
          note: dispo.note || '',
          date,
          lieu: canonLieu,
          heure_debut: dispo.heure_debut || '',
          heure_fin: dispo.heure_fin || '',
          type: normalized ? normalized.type : mapTypeAnyToLegacy(dispo.type as any),
          timeKind: normalized ? normalized.timeKind : (dispo.timeKind === 'overnight' ? 'overnight' : (dispo.timeKind === 'fixed' ? (Array.isArray(dispo.slots) && dispo.slots.length > 0 ? 'slot' : (dispo.heure_debut && dispo.heure_fin ? 'range' : 'range')) : (dispo.timeKind === 'flexible' ? ((dispo.heure_debut && dispo.heure_fin) ? 'range' : (Array.isArray(dispo.slots) && dispo.slots.length > 0 ? 'slot' : 'full-day')) : (dispo.heure_debut && dispo.heure_fin ? 'range' : 'full-day')))),
          slots: Array.isArray(dispo.slots) ? dispo.slots : undefined,
          isFullDay: dispo.isFullDay ?? undefined,
          tenantId: dispo.tenantId,
          version: dispo.version || 1,
          updatedAt: dispo.updatedAt,
          updatedBy: dispo.updatedBy
        })
      })

      // Nettoyer les dates de la plage puis appliquer les nouvelles valeurs par date
      for (const [key] of disponibilitesCache.value.entries()) {
        // Clé du cache attendue = 'YYYY-MM-DD' (10 caractères)
        if (key.length === 10 && key >= dateDebut && key <= dateFin) {
          disponibilitesCache.value.delete(key)
        }
      }
      byDate.forEach((dispos, date) => {
        disponibilitesCache.value.set(date, dispos)
      })

      
    }
  )
  
  if (listenerId) {
    realtimeListeners.value.push(listenerId)
    addRealtimeListener(listenerId) // Synchroniser avec sessionDisplayService
    isRealtimeActive.value = true
  } else {
    console.error('❌ Échec création listener RTDB')
  }
  
  // Retourner une fonction de nettoyage
  return () => {
    if (listenerId) {
      disponibilitesRTDBService.stopListener(listenerId)
      realtimeListeners.value = realtimeListeners.value.filter(id => id !== listenerId)
      removeRealtimeListener(listenerId) // Synchroniser avec sessionDisplayService
      if (realtimeListeners.value.length === 0) {
        isRealtimeActive.value = false
      }
      
    }
  }
}

/**
 * Arrêter toute la synchronisation temps réel
 */
function stopRealtimeSync() {
  // Arrêter tous les listeners RTDB
  realtimeListeners.value.forEach(listenerId => {
    disponibilitesRTDBService.stopListener(listenerId)
  })
  
  realtimeListeners.value = []
  clearRealtimeListeners() // Synchroniser avec sessionDisplayService
  isRealtimeActive.value = false
}

/**
 * Afficher les statistiques de synchronisation
 */
function showRealtimeStats() {
  // Migration RTDB: anciennes stats Firestore désactivées
  collaborationService.getStats()
  
  
  // notify({
  //   message: `📡 ${stats.activeListeners} listener(s) • 👥 ${collaborationStats.totalUsers + collaborationStats.totalActivities + collaborationStats.totalLocks} état(s) actif(s)`,
  //   color: 'info',
  //   position: 'top-right',
  //   duration: 4000
  // })
}

// ==========================================
// GESTION DE PRÉSENCE UTILISATEUR
// ==========================================

/**
 * Obtenir les utilisateurs actifs sur le planning (présence, locks, sélections)
 */
function getActiveUsers() {
  if (!collaborationService) return []
  
  const activeUsers = new Map()
  
  // Logique unidirectionnelle : les collaborateurs ne voient que les admins,
  // mais les admins voient tout le monde
  // (currentUserIsCollaborateur supprimé – non utilisé)
  
  // Ajouter les utilisateurs avec présence active
  collaborationService.presence.forEach(user => {
    if (user.status === 'online') {
      activeUsers.set(user.userId, {
        userId: user.userId,
        userName: user.userName,
        status: 'présent'
      })
    }
  })
  
  // Ajouter les utilisateurs avec locks actifs
  collaborationService.locks.forEach(lock => {
    // Même logique pour les locks
    activeUsers.set(lock.userId, {
      userId: lock.userId,
      userName: lock.userName,
      status: 'modification'
    })
  })
  
  // Ajouter les utilisateurs avec sélections actives
  collaborationService.remoteSelections.forEach(selection => {
    // Même logique pour les sélections
    activeUsers.set(selection.userId, {
      userId: selection.userId,
      userName: selection.userName,
      status: 'sélection'
    })
  })
  
  return Array.from(activeUsers.values())
}

/**
 * Obtenir le nombre d'utilisateurs uniques connectés
 */
function getUniqueUsersCount(): number {
  const uniqueIds = new Set(connectedUsers.value.map(u => u.uid))
  return uniqueIds.size
}

/**
 * Obtenir le nombre total de sessions
 */
function getTotalSessionsCount(): number {
  return connectedUsers.value.reduce((sum, u) => sum + (u.sessions?.length || 1), 0)
}

/**
 * Obtenir le tooltip de statut utilisateur
 */
function getUserStatusTooltip(user: DisplayUser): string {
  const sessions = user.sessions?.length || 1
  return `${user.displayName || user.email} - ${sessions} session${sessions > 1 ? 's' : ''}`
}

/**
 * Vérifier si un utilisateur a plusieurs sessions
 */
// (isUserWithMultipleSessions supprimée – non utilisée)

/**
 * Gestionnaire pour les mises à jour de préférences depuis d'autres composants
 */
function handleUserPreferencesUpdate(event: Event) {
  const customEvent = event as CustomEvent
  // console.log('📢 Réception d\'un événement de changement de préférences:', customEvent.detail)
  
  if (customEvent.detail.colorChanged) {
    // Mise à jour forcée des couleurs dans le planning
    
    // Forcer la mise à jour des variables CSS
    updateUserColorVariables()
    
    // Déclencher un re-render des composants visuels qui affichent les couleurs
    nextTick(() => {
      // Forcer la mise à jour des éléments ayant des couleurs utilisateur
      const avatarElements = document.querySelectorAll('[data-user-avatar]')
      avatarElements.forEach(el => {
        const element = el as HTMLElement
        if (element.style.backgroundColor) {
          // Forcer une re-application de la couleur
          const customEvent = event as CustomEvent
          element.style.backgroundColor = getUserColorWrapper(customEvent.detail.userId)
        }
      })
    })
  }
}

/**
 * Configurer la synchronisation temps réel des préférences utilisateur
 * ⚠️ OPTIMISÉ : Mode urgence avec cache local
 */
function setupRealtimePreferences() {
  if (!auth.currentUser || !AuthService.currentTenantId) return
  
  // ⚠️ CONTRÔLE D'URGENCE : Désactiver en mode urgence
  if (emergencyOptimization?.isServiceDisabled?.('DISABLE_PRESENCE_TRACKING')) {
    console.warn('🚨 [EMERGENCY] Sync préférences désactivée - Mode cache local')
    // Charger une seule fois les préférences puis utiliser le cache
    if (loadPreferences && auth.currentUser) {
      loadPreferences(auth.currentUser.uid).then(() => {
        updateUserColorVariables()
      })
    }
    return
  }
  
  const userRef = rtdbRef(rtdb, `tenants/${AuthService.currentTenantId}/users/${auth.currentUser.uid}`)
  
  // Nettoyer l'ancien listener s'il existe
  if (preferencesUnsubscribe) {
    preferencesUnsubscribe()
  }
  
  // ⚠️ LIMITE : Créer un listener seulement si on peut
  if (!emergencyOptimization?.canCreateListener?.()) {
    console.warn('🚨 [EMERGENCY] Limite listeners atteinte - Préférences en mode cache')
    return
  }
  
  // Créer un nouveau listener temps réel
  const unsubscribeFn = onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const userData = snapshot.val()
      const newPreferences = userData.preferences || {}
      
      // Préférences mises à jour en temps réel
      
      // Vérifier si la couleur a changé
      const oldColor = preferences.value.presenceColor
      const newColor = newPreferences.presenceColor
      
      if (oldColor !== newColor && newColor) {
        // Couleur de présence mise à jour en temps réel
        
        // Recharger les préférences via le service pour mettre à jour l'état réactif
        if (loadPreferences && auth.currentUser) {
          loadPreferences(auth.currentUser.uid).then(() => {
            // Mettre à jour les variables CSS après rechargement
            updateUserColorVariables()
            
            // Forcer la mise à jour des composants qui utilisent getUserColorWrapper
            nextTick(() => {
              // Déclencher un re-render des éléments qui utilisent la couleur utilisateur
              const event = new CustomEvent('userPreferencesUpdated', { 
                detail: { 
                  userId: auth.currentUser!.uid, 
                  preferences: newPreferences,
                  colorChanged: true,
                  oldColor: oldColor,
                  newColor: newColor
                } 
              })
              document.dispatchEvent(event)
            })
          })
        }
      }
    }
  }, (error) => {
    console.error('❌ Erreur listener préférences:', error)
  })
  
  preferencesUnsubscribe = () => off(userRef, 'value', unsubscribeFn)
}

/**
 * Configurer la synchronisation des couleurs utilisateurs
 */
function setupUserColorsSync() {
  if (!auth.currentUser) return

  // Écouter la couleur de l'utilisateur actuel
  UserColorsService.listenToUserColor(auth.currentUser.uid)
  
  // Watch pour ajouter des listeners pour les nouveaux utilisateurs connectés
  watch(connectedUsers, (newUsers) => {
    const userIds = newUsers.map((user: any) => user.uid).filter((uid: string) => uid)
    UserColorsService.listenToMultipleUsers(userIds)
  }, { immediate: true })
  
  
}

/**
 * Mettre à jour les variables CSS pour la couleur de l'utilisateur actuel
 */
function updateUserColorVariables() {
  if (!auth.currentUser) return
  
  const userColor = getUserColorWrapper(auth.currentUser.uid)
  const root = document.documentElement
  
  // Mettre à jour la variable CSS pour la couleur de l'utilisateur actuel
  root.style.setProperty('--current-user-color', userColor)
  
  // Mettre à jour également la variable pour les indicateurs
  root.style.setProperty('--user-indicator-color', userColor)
  
  // Variables CSS mises à jour avec la couleur
}

/**
 * Nettoyer les sessions expirées
 */
async function cleanupSessions() {
  try {
    // Géré automatiquement dans le nouveau système
  } catch (error) {
    console.error('❌ Erreur nettoyage sessions:', error)
  }
}

/**
 * Initialiser la présence utilisateur
 */
async function initializePresence() {
  try {
    // Début initialisation collaboration
    
    // Utiliser les informations auth directement
    const user = auth.currentUser
    
    if (!user) {
      // console.log('❌ Aucun utilisateur connecté pour la collaboration')
      return
    }
    
    // console.log('👤 Utilisateur trouvé:', user.displayName || user.email)
    
    if (USE_NEW_COLLABORATION) {
      // Initialisation simplifiée similaire au collaborateur
      const user = auth.currentUser
      if (user) {
        const tenantId = AuthService.currentTenantId || 'keydispo'
        await collaborationService.init(tenantId, {
          userId: user.uid,
          userEmail: user.email || 'admin@exemple.com',
          userName: user.displayName || user.email || 'Admin'
        })
        // Service collaboration admin initialisé
      } else {
        console.warn('⚠️ Utilisateur non connecté')
        return
      }
    
    // S'abonner aux changements d'activités pour mettre à jour l'UI en temps réel
    activityUnsubscribe.value = collaborationService.onActivityChange(() => {
      // Changement activités détecté
      debouncedUpdatePresenceSets()
  updateDomHoverIndicators()
    })
    
    // S'abonner aux changements de locks
    lockUnsubscribe.value = collaborationService.onLockChange(() => {
      debouncedUpdatePresenceSets()  
    })
    
    // S'abonner aux changements de sélections distantes
    selectionUnsubscribe.value = collaborationService.onSelectionChange(() => {
      // console.log('📋 Sélections distantes mises à jour')
      debouncedUpdatePresenceSets()
      // Les initiales sont maintenant gérées de manière réactive via :data-initials dans le template
    })
    }
    
    // Présence utilisateur initialisée
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la présence:', error)
    notify({
      title: 'Erreur de présence',
      message: 'Impossible d\'initialiser la présence utilisateur',
      color: 'danger'
    })
  }
}

/**
 * Mettre à jour la vue actuelle pour la présence
 */
// (updatePresenceView supprimée – plus nécessaire)

// Fallback impératif: met à jour les classes CSS des cellules survolées par d'autres (basé sur RTDB direct)
function updateDomHoverIndicators() {
  try {
  const root = document.querySelector('.excel-planning-container') as HTMLElement | null
  if (!root) return
    // Pour chaque cellule visible, toggler une classe si hovered par d'autres
    const cells = root.querySelectorAll('[data-cell-id]')
    cells.forEach((el) => {
      const cellId = (el as HTMLElement).getAttribute('data-cell-id') || ''
      const [collaborateurId, date] = cellId.split('_')
      if (!collaborateurId || !date) return
      const hovered = isHoveredByOthers(collaborateurId, date)
      ;(el as HTMLElement).classList.toggle('has-presence', hovered)
      ;(el as HTMLElement).classList.toggle('has-indicator', hovered)
      ;(el as HTMLElement).style.setProperty('--hovering-user-color', getHoveringUserColor(collaborateurId, date))
    })
  } catch {}
}

// La fonction getUserColor est maintenant importée depuis avatarUtils
// Wrapper pour maintenir la compatibilité avec les préférences utilisateur
function getUserColorWrapper(uid: string): string {
  // Utiliser le service unifié de couleurs qui gère automatiquement 
  // les couleurs personnalisées et le cache temps réel
  return UserColorsService.getUserColor(uid)
}

/**
 * Vérifier si une cellule est verrouillée par un autre utilisateur
 */
function isCellLockedByOther(collaborateurId: string, date: string): boolean {
  try {
    // Vérification défensive : si les services ne sont pas encore initialisés
    if (!collaborationService) return false
    
    // Utiliser lockUpdateCounter pour forcer la réactivité
    lockUpdateCounter.value // lecture de la variable réactive
    
    // Utiliser connectedUsers pour la réactivité avec vérification défensive
    const users = connectedUsers?.value || []
    
    // Vérifier dans les sessions des utilisateurs connectés
    const isLockedInUsers = users.some((user: DisplayUser) => 
      user.sessions?.some((session: any) => 
        session.currentAction?.type === 'editing' &&
        session.currentAction?.collaborateurId === collaborateurId &&
        session.currentAction?.date === date &&
        session.status === 'online'
      )
    )
    
    // Fallback sur le service
    const isLockedInService = collaborationService.isCellLocked(collaborateurId, date)
    
    // Vérifier si la cellule est sélectionnée par d'autres utilisateurs (multiselect)
    const isSelectedByOthers = collaborationService.isCellSelectedByOthers(collaborateurId, date)
    
    const isLocked = isLockedInUsers || isLockedInService || isSelectedByOthers
    
    return isLocked
  } catch (error) {
    console.warn('⚠️ Erreur dans isCellLockedByOther:', error)
    return false
  }
}

/**
 * Obtenir les informations de verrouillage d'une cellule
 */
// (getCellLockInfo supprimée – non utilisée)

/**
 * Vérifier si un utilisateur édite une cellule spécifique
 */
// (isUserEditingCell supprimée – non utilisée)

/**
 * Obtenir les classes CSS pour une cellule en fonction de son état de verrouillage
 */
function getCellLockClasses(collaborateurId: string, date: string): string[] {
  const classes: string[] = []
  
  if (isCellLockedByOther(collaborateurId, date)) {
    classes.push('cell-locked')
    // Note: Les anciennes classes lock-type-* sont supprimées car nous utilisons maintenant l'overlay
  }
  
  return classes
}

/**
 * Obtenir les utilisateurs qui survolent une cellule spécifique
 */
// (getHoveringUsers supprimée – non utilisée)

/**
 * Gérer le survol d'une cellule (instantané)
 */
function handleCellHover(collaborateurId: string, date: string) {
  
  // Annuler le timer de fin de hover si on revient rapidement
  if (hoverEndGraceTimer) {
    clearTimeout(hoverEndGraceTimer)
    hoverEndGraceTimer = null
  }

  // Annuler le timer précédent de debounce s'il existe
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer)
    hoverDebounceTimer = null
  }

  // Mise à jour instantanée pour une réactivité maximale
  if (collaborationService && typeof collaborationService.updateHoveredCell === 'function') {
    collaborationService.updateHoveredCell(collaborateurId, date)
  }
}

/**
 * Gérer la sortie du survol d'une cellule (instantané)
 */
function handleCellHoverEnd() {
  // Annuler le timer de debounce (on ne veut plus envoyer un nouveau hover)
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer)
    hoverDebounceTimer = null
  }

  // Si on reçoit un leave, appliquer une petite grâce avant de nettoyer pour éviter le flicker
  if (hoverEndGraceTimer) {
    clearTimeout(hoverEndGraceTimer)
    hoverEndGraceTimer = null
  }
  hoverEndGraceTimer = setTimeout(() => {
    if (collaborationService && typeof collaborationService.clearHoveredCell === 'function') {
      collaborationService.clearHoveredCell()
    }
    hoverEndGraceTimer = null
  }, 250)
}

/**
 * Gérer l'ouverture d'une cellule pour l'édition
 */
function handleCellEdit(_date: string, _collaborateurId: string) {
  // Notifier l'édition active (optionnel)
}

/**
 * Gérer la fermeture de l'édition
 */
function handleEditClose() {
  // handleEditClose appelée
  
  // Libérer le verrou de la cellule si elle était verrouillée
  if (selectedCell.value && collaborationService) {
    
    collaborationService.unlockCell(selectedCell.value.collaborateurId, selectedCell.value.date)
  }
  
  // Fermer les modaux et nettoyer l'état
  showDispoModal.value = false
  showCollabModal.value = false
  selectedCell.value = null
  selectedCollaborateur.value = null
  selectedCellDispos.value = []
  selectedCollabDispos.value = []
  
  // Réinitialiser le mode batch
  isBatchMode.value = false
  batchDates.value = []
  batchCollaborateurId.value = ''
  
  // État nettoyé après fermeture du formulaire
}

/**
 * Gérer les changements temps réel reçus
 */
// (handleRealtimeChanges supprimée – non utilisée)

function generateInitialDays() {
  const days: any[] = []
  const today = new Date()
  const todayStr = toDateStr(today)
  
  // CORRECTION : Respecter les filtres de dates
  let startStr: string
  let endStr: string
  
  // Si on a une date de début définie, partir de là
  if (dateFrom.value) {
    startStr = dateFrom.value
  } else if (dateTo.value) {
    // Si on a seulement une date de fin, partir de 1 an dans le passé à partir de cette date
    const endDate = new Date(dateTo.value)
    const startDate = new Date(endDate)
    startDate.setFullYear(endDate.getFullYear() - 1)
    startStr = toDateStr(startDate)
  } else {
    // Sinon, partir de 3 mois dans le passé
    startStr = minPastDate.value
  }
  
  // Si on a une date de fin définie, s'arrêter là
  if (dateTo.value) {
    endStr = dateTo.value
  } else {
    // Sinon, aller dans le futur
    const daysAhead = isCollaborateurInterface.value ? 60 : 14
    endStr = addDaysStr(todayStr, daysAhead)
  }
  
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
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
      dayOfWeek: cursor.getDay() // 0=dimanche, 6=samedi
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  loadedDays.value = days
  
  // CORRECTION : Positionner le scroll intelligemment selon les filtres
  setTimeout(() => {
    const scroller = planningScroll.value
    if (!scroller) return
    
    // Si on a une date de fin mais pas de date de début, scroller vers la fin
    if (dateTo.value && !dateFrom.value) {
      // Positionner vers la fin de la plage visible
      const endIndex = days.findIndex(d => d.date === dateTo.value)
      if (endIndex >= 0) {
        const centerOffset = Math.max(0, endIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
        scroller.scrollLeft = centerOffset
      }
    } else {
      // Sinon, centrer sur aujourd'hui (comportement par défaut)
      const todayIndex = days.findIndex(d => d.isToday)
      if (todayIndex >= 0) {
        const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
        scroller.scrollLeft = centerOffset
      }
    }
  }, 100) // Délai pour s'assurer que le DOM est prêt
}

// Extension dynamique lors du scroll
let scrollDebounceTimer: number | null = null
let scrollEndTimer: number | null = null

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

  // OPTIMISATION: Pendant l'auto-scroll de sélection, ignorer complètement
  // La boucle d'auto-scroll gère son propre recompute avec throttling
  if (isAutoScrolling.value) {
    return
  }

  // Nettoyer les highlights de hover pendant le scroll SEULEMENT si pas en scroll rapide
  if (!isScrollingFast.value) {
    cleanHoverHighlights()
  }
  
  // Maintenir le hover pendant le scroll
  updateHoverOnScroll(scroller)
  
  // Calculer le mois visible
  updateCurrentVisibleMonth(scroller)
  
  // Recalcule la fenêtre virtualisée
  recomputeWindow(scroller)

  // Extension dynamique conditionnelle:
  // - Avec uniquement une borne de début (dateFrom), on autorise l'extension vers la droite
  // - Avec uniquement une borne de fin (dateTo), on autorise l'extension vers la gauche et on borne à droite
  // - Avec les deux bornes, on n'étend pas
  const hasFromOnly = !!dateFrom.value && !dateTo.value
  const hasToOnly = !!dateTo.value && !dateFrom.value
  const hasBothBounds = !!dateFrom.value && !!dateTo.value
  
  // Bloquer le scroll horizontal quand les deux dates sont définies
  if (hasBothBounds) {
    // Calculer les indices de début et fin dans loadedDays qui correspondent aux dates filtrées
    const firstVisibleDate = visibleDays.value[0]?.date
    const lastVisibleDate = visibleDays.value[visibleDays.value.length - 1]?.date
    
    if (firstVisibleDate && lastVisibleDate) {
      const firstLoadedIndex = loadedDays.value.findIndex(d => d.date === firstVisibleDate)
      const lastLoadedIndex = loadedDays.value.findIndex(d => d.date === lastVisibleDate)
      
      if (firstLoadedIndex !== -1 && lastLoadedIndex !== -1) {
        // Calculer les limites de scroll
        const minScrollLeft = firstLoadedIndex * dayWidth.value
        const maxScrollLeft = Math.max(minScrollLeft, (lastLoadedIndex + 1) * dayWidth.value - scroller.clientWidth)
        
        // Clamper le scroll dans ces limites
        if (scroller.scrollLeft < minScrollLeft) {
          scroller.scrollLeft = minScrollLeft
        } else if (scroller.scrollLeft > maxScrollLeft) {
          scroller.scrollLeft = maxScrollLeft
        }
      }
    }
    return
  }

  // Debounce adaptatif selon la vitesse de scroll
  if (scrollDebounceTimer) {
    clearTimeout(scrollDebounceTimer)
  }

  // Délai plus court pour scroll rapide
  const debounceDelay = isScrollingFast.value ? 50 : 100

  scrollDebounceTimer = setTimeout(() => {
    const { scrollLeft, clientWidth } = scroller
  const totalCols = loadedDays.value.length
  const firstVisibleIdx = Math.floor(scrollLeft / dayWidth.value)
  const lastVisibleIdx = Math.min(totalCols - 1, Math.floor((scrollLeft + clientWidth) / dayWidth.value))

  // Réserves adaptatives selon la vitesse de scroll
  const baseLeftReserve = 150
  const baseRightReserve = 150
  const fastScrollMultiplier = isScrollingFast.value ? 2 : 1
  
  const targetLeftReserve = baseLeftReserve * fastScrollMultiplier
  const minLeftReserve = Math.floor(90 * fastScrollMultiplier)
  const targetRightReserve = baseRightReserve * fastScrollMultiplier
  const minRightReserve = Math.floor(90 * fastScrollMultiplier)

  // GAUCHE: si la réserve visuelle est basse, pré-précharger en un bloc
  // En mode from-only (plage ouverte vers le futur), ne pas étendre vers la gauche
  const leftReserve = firstVisibleIdx
  if (!hasFromOnly && leftReserve < minLeftReserve && !extending.value) {
      extending.value = true
      try {
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
      } finally {
        extending.value = false
      }
    }

      // DROITE: si la réserve est basse, ajouter un gros bloc (borné par dateTo si hasToOnly)
      const rightReserve = (totalCols - 1) - lastVisibleIdx
      if (rightReserve < minRightReserve) {
        const lastDate = loadedDays.value[loadedDays.value.length - 1]?.date
        let toAdd = targetRightReserve - rightReserve
        if (toAdd > 0) {
          // Si seule la borne de fin est définie, ne pas dépasser dateTo
          if (hasToOnly && dateTo.value && lastDate) {
            const remaining = Math.max(0, diffDays(lastDate, dateTo.value))
            toAdd = Math.min(toAdd, remaining)
          }
          if (toAdd > 0) {
            appendDays(toAdd)
            if (lastDate) {
              const start = addDaysStr(lastDate, 1)
              const end = addDaysStr(lastDate, toAdd)
            
              // Préchargement agressif pour scroll rapide
              if (isScrollingFast.value) {
                // Charger immédiatement sans attendre
                generateDisponibilitesForDateRange(start, end).catch(console.error)
              } else {
                generateDisponibilitesForDateRange(start, end)
              }
            }
          }
        }
      }

    // Décharger visuellement (cache conservé)
    prunePastIfFar(scroller)
    pruneFutureIfFar(scroller)
    
    // PREFETCH INTELLIGENT: Charger les données des semaines adjacentes en arrière-plan
    // Ne pas prefetcher pendant le scroll rapide ou si les deux bornes sont définies
    if (!isScrollingFast.value && !hasBothBounds) {
      const firstVisibleDate = loadedDays.value[firstVisibleIdx]?.date
      const lastVisibleDate = loadedDays.value[lastVisibleIdx]?.date
      if (firstVisibleDate && lastVisibleDate) {
        planningData.triggerPrefetch(firstVisibleDate, lastVisibleDate)
      }
    }
  }, debounceDelay)
  
  // Détecter la fin de scroll pour déclencher le hover sous le curseur
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer)
  }
  
  scrollEndTimer = setTimeout(() => {
    // Déclencher le hover sur la cellule sous le curseur quand le scroll se termine
    if (_lastPointerX && _lastPointerY) {
      triggerHoverAtCursor()
    }
  }, debounceDelay + 50) // Délai légèrement plus long que le debounce principal
}

function formatDate(d: Date) {
  // même format local que toDateStr
  return toDateStr(d)
}

// (formatDateLong supprimée – non utilisée)

// Mettre à jour le mois actuellement visible
function updateCurrentVisibleMonth(scroller: HTMLElement) {
  if (!visibleDays.value.length) return
  
  const scrollLeft = scroller.scrollLeft
  const gridLeft = stickyLeftWidth.value
  const pitch = dayWidth.value + 1
  const viewportWidth = scroller.clientWidth
  
  // Calculer le jour au centre de la vue
  const centerX = scrollLeft + viewportWidth / 2
  const dayIndex = Math.floor((centerX - gridLeft) / pitch)
  const clampedIndex = Math.max(0, Math.min(dayIndex, visibleDays.value.length - 1))
  
  if (clampedIndex < visibleDays.value.length) {
    const day = visibleDays.value[clampedIndex]
    const monthName = new Date(day.date).toLocaleDateString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    })
    // Capitaliser la première lettre
    currentVisibleMonth.value = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  }
}

// Repositionne les overlays de hover en se basant sur la dernière position pointeur, utile pendant un scroll sans mousemove
// Throttle pour updateHoverOnScroll - max 30fps (33ms)
let updateHoverThrottleTimer: number | null = null
let pendingUpdateHover: HTMLElement | null = null

function updateHoverOnScroll(scroller: HTMLElement) {
  if (!_lastPointerX && !_lastPointerY) return
  
  // Si un update est déjà programmé, mémoriser le scroller pour plus tard
  if (updateHoverThrottleTimer !== null) {
    pendingUpdateHover = scroller
    return
  }
  
  // Exécuter immédiatement
  executeUpdateHover(scroller)
  
  // Activer le throttle
  updateHoverThrottleTimer = window.setTimeout(() => {
    updateHoverThrottleTimer = null
    
    // Si un update était en attente, l'exécuter maintenant
    if (pendingUpdateHover) {
      const scrollerToUpdate = pendingUpdateHover
      pendingUpdateHover = null
      executeUpdateHover(scrollerToUpdate)
    }
  }, 50) // Max 20 updates/seconde pour éviter les artefacts visuels
}

function executeUpdateHover(scroller: HTMLElement) {
  if (!_lastPointerX && !_lastPointerY) return
  
  // Utiliser le cache ou recalculer si nécessaire
  const now = performance.now()
  if (!_cachedGridValues || (now - _cachedGridValues.timestamp) > 100) {
    const rowsEl = rowsRef.value
    _cachedGridValues = {
      gridLeft: gridLeftBodyPx.value || (stickyLeftWidth.value),
      pitch: dayPitchBodyPx.value || (dayWidth.value + 1),
      rowsOffset: rowsEl ? rowsEl.offsetTop : 0,
      nRows: paginatedCollaborateurs.value.length,
      rect: scroller.getBoundingClientRect(),
      timestamp: now
    }
  }
  
  const { gridLeft, pitch, rowsOffset, nRows, rect } = _cachedGridValues
  
  // Colonne (X)
  const xContent = _lastPointerX - rect.left + scroller.scrollLeft
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
  
  // Ligne (Y)
  const yContent = _lastPointerY - rect.top + scroller.scrollTop - rowsOffset
  if (yContent < 0) {
    rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
    return
  }
  
  let rowIdx = Math.floor(yContent / rowPitchPx.value)
  if (rowIdx < 0 || rowIdx >= nRows) {
    rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
    return
  }
  
  rowIdx = Math.max(0, Math.min(nRows - 1, rowIdx))
  const topPx = Math.round(rowIdx * rowPitchPx.value)
  rowHoverEl.value && (rowHoverEl.value.style.transform = `translate3d(0,${topPx}px,0)`)
}

/**
 * Détecter et déclencher le hover sur la cellule sous le curseur après scroll
 * Debounced pour réduire les appels à elementsFromPoint
 */
let triggerHoverDebounceTimer: number | null = null

function triggerHoverAtCursor() {
  // Debounce à 150ms pour éviter les artefacts visuels lors de mouvements rapides
  if (triggerHoverDebounceTimer) {
    clearTimeout(triggerHoverDebounceTimer)
  }
  
  triggerHoverDebounceTimer = window.setTimeout(() => {
    executeTriggerHover()
  }, 150)
}

function executeTriggerHover() {
  if (!_lastPointerX || !_lastPointerY || !planningScroll.value) return
  
  // Obtenir l'élément directement sous la position du curseur
  const elementsAtCursor = document.elementsFromPoint(_lastPointerX, _lastPointerY)
  
  // Trouver la cellule excel dans la pile d'éléments
  let cellElement: HTMLElement | null = null
  for (const element of elementsAtCursor) {
    if (element.classList.contains('excel-cell')) {
      cellElement = element as HTMLElement
      break
    }
  }
  
  if (cellElement) {
    // Extraire les IDs de la cellule
    const cellId = cellElement.getAttribute('data-cell-id')
    const dayDate = cellElement.getAttribute('data-day-date')
    
    if (cellId && dayDate) {
      const collaborateurId = cellId.split('_')[0]
      
      // Déclencher le hover sur cette cellule
      handleCellMouseEnter(collaborateurId, dayDate)
      
      // Mettre à jour les highlights visuels aussi
      const dayIndexStr = cellElement.getAttribute('data-day-index')
      const rowIndexStr = cellElement.getAttribute('data-row-index')
      
      if (dayIndexStr && rowIndexStr) {
        const dayIndex = parseInt(dayIndexStr, 10)
        const rowIndex = parseInt(rowIndexStr, 10)
        
        // Nettoyer les highlights précédents
        cleanHoverHighlights()
        
        // Utiliser les sélecteurs directs (plus fiable)
        const columnSelector = `[data-day-index="${dayIndex}"]`
        const rowSelector = `[data-row-index="${rowIndex}"]`
        
        const columnCells = planningScroll.value.querySelectorAll(columnSelector)
        if (columnCells) {
          columnCells.forEach(cell => {
            cell.setAttribute('data-column-hover', 'true')
          })
        }
        
        const rowCells = planningScroll.value.querySelectorAll(rowSelector)
        if (rowCells) {
          rowCells.forEach(cell => {
            cell.setAttribute('data-row-hover', 'true')
          })
        }
      }
    }
  }
}

// S'assurer qu'une date est présente dans loadedDays; étend à gauche/droite si besoin et charge les dispo
// (ensureDatePresent supprimée – non utilisée)

// S'assurer qu'une plage [start,end] est présente (et chargée) avant scroll
// (ensureRangePresent supprimée – non utilisée)

async function appendDays(count: number) {
  if (loadedDays.value.length === 0) {
    console.warn('⚠️ Impossible d\'ajouter des jours: loadedDays vide')
    return
  }
  
  const lastDay = loadedDays.value[loadedDays.value.length - 1]
  if (!lastDay) {
    console.warn('⚠️ Impossible d\'ajouter des jours: dernier jour non défini')
    return
  }
  
  const lastDateStr = lastDay.date
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
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      dayOfWeek: date.getDay() // 0=dimanche, 6=samedi
    })
  }
  // Recalibrer la hauteur de header (si contenu wrap) et buffer
  if (planningScroll.value) {
    measureAndSetHeaderHeight()
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
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      dayOfWeek: date.getDay() // 0=dimanche, 6=samedi
    })
  }
  loadedDays.value = [...toPrepend, ...loadedDays.value]
  
  // rien - highlights gérés par CSS
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
  scroller.querySelector('.excel-weeks-row')
  const monthsH = 0 // Plus besoin de calculer la hauteur des mois puisqu'on les a supprimés
  scroller.style.setProperty('--months-h', `${monthsH}px`)
}

const onResize = () => measureAndSetHeaderHeight()

// MAJ de la position locale du jour courant pour les overlays
// Plus besoin d'updateTodayOverlayX - les highlights sont gérés par CSS directement sur les cellules
  
  // Plus besoin de forcer les z-index, gérés par les props de la modale
  watch(() => showDispoModal.value, () => {
    // Réservé pour logique future si nécessaire
  })

// ===== NOUVELLES FONCTIONNALITÉS =====

// Gestion du scroll infini (version simplifiée)
async function setupInfiniteScroll() {
  try {
    // Pour l'instant, on utilise le système existant
    // Infinite scroll configuré
  } catch (error) {
    console.error('❌ Erreur configuration infinite scroll:', error)
  }
}

// Gestion des interactions planning (version simplifiée)
async function setupPlanningInteractions() {
  try {
    // Pour l'instant, on gère localement
    // Interactions planning configurées
  } catch (error) {
    console.error('❌ Erreur configuration interactions:', error)
  }
}

// Nouvelle fonction de gestion de clic de cellule
function handleCellClickNew(collaborateurId: string, date: string, event: MouseEvent) {
  
  // Vérifier si la cellule est verrouillée par un autre utilisateur
  if (collaborationService && collaborationService.isCellLocked(collaborateurId, date)) {
    const lock = collaborationService.getCellLock(collaborateurId, date)
    if (lock) {
      notify({
        title: 'Cellule verrouillée',
        message: `${lock.userName} est en train d'interagir avec cette cellule`,
        color: 'warning',
        duration: 3000
      })
      
      
      return // Empêcher toute interaction
    }
  }
  
  // Vérifier si la cellule est sélectionnée par un autre utilisateur (multiselect)
  if (collaborationService && collaborationService.isCellSelectedByOthers(collaborateurId, date)) {
    const selection = collaborationService.getCellSelection(collaborateurId, date)
    if (selection) {
      notify({
        title: 'Cellule en cours de sélection',
        message: `${selection.userName} a sélectionné cette cellule`,
        color: 'warning',
        duration: 3000
      })
      
      
      return // Empêcher toute interaction
    }
  }
  
  // Si Ctrl/Cmd est maintenu (mode sélection multiple) OU mode sélection mobile activé - AUCUNE modale ne doit s'ouvrir
  if (event.ctrlKey || event.metaKey || (isMobileView.value && isSelectionMode.value)) {
    event.preventDefault()
    event.stopPropagation()
    
    // Le toggle a déjà été fait par handleCellMouseDown
    // On nettoie juste les flags ici
    if (isDraggingSelection.value) {
      isDraggingSelection.value = false
      dragStartCell.value = null
      hasMouseMoved.value = false
    }
    
    return // Ne rien faire d'autre, pas de re-toggle
    
  } else {
    // Clic normal 
    
    
    // Désactiver le mode sélection pour un clic normal
    isSelectionMode.value = false
    
    // Si il y a une sélection active, la vider mais permettre l'ouverture de la modale
    if (selectedCells.value.size > 0) {
      selectedCells.value.clear()
    }
    
    // Toujours ouvrir la modale pour un clic normal
    openModalForCollaborateur(collaborateurId, date)
  }
}

// Gestion des clics sur éléments internes (cartes/boutons) pour respecter le multisélection
function onInnerDispoClick(dispo: Disponibilite | (Disponibilite & { _cont?: 'start'|'end' }), _collaborateurId: string, date: string, event: MouseEvent) {
  // Si on est en mode multisélection (desktop Ctrl/Cmd ou mobile FAB), laisser l'événement remonter vers la cellule parent
  if (event.ctrlKey || event.metaKey || (isMobileView.value && isSelectionMode.value)) {
    // Ne pas arrêter la propagation - l'événement remonte vers handleCellClickNew de la cellule parent
    return
  }
  // Comportement normal: empêcher la propagation et ouvrir l'édition de la dispo
  event.stopPropagation()
  editDispo(dispo as any, date)
}

function onInnerAddClick(collaborateurId: string, date: string, event: MouseEvent) {
  // En mode multisélection, laisser l'événement remonter vers la cellule parent
  if (event.ctrlKey || event.metaKey || (isMobileView.value && isSelectionMode.value)) {
    // Ne pas arrêter la propagation - l'événement remonte vers handleCellClickNew de la cellule parent
    return
  }
  // Sinon, empêcher la propagation et ouvrir la modale d'ajout
  event.stopPropagation()
  openModalForCollaborateur(collaborateurId, date)
}

// Vider la sélection
function clearSelection() {
  selectedCells.value.clear()
  selectedCells.value = new Set() // Déclencher la réactivité
  
  // Nettoyer aussi les sélections distantes
  if (collaborationService.isActive) {
    collaborationService.clearSelectedCells()
  }
  
  
}

// Fonction pour toggler le mode sélection sur mobile
function toggleSelectionMode() {
  isSelectionMode.value = !isSelectionMode.value
  
  // Si on sort du mode sélection MANUELLEMENT, vider les sélections
  if (!isSelectionMode.value) {
    clearSelection()
  }
  
  
}

// Obtenir le collaborateur actuellement sélectionné (s'il y en a un)
function getCurrentSelectedCollaborateur(): string | null {
  if (selectedCells.value.size === 0) return null
  
  // Prendre la première cellule sélectionnée pour déterminer le collaborateur
  const firstCellId = Array.from(selectedCells.value)[0]
  // L'ID est au format "collaborateurId-YYYY-MM-DD"
  // On cherche le pattern de date YYYY-MM-DD à la fin
  const dateRegex = /-(\d{4}-\d{2}-\d{2})$/
  const match = firstCellId.match(dateRegex)
  if (!match) return null
  
  // Retourner tout ce qui précède la date
  return firstCellId.substring(0, firstCellId.length - match[1].length - 1)
}

// Valider que toutes les cellules sélectionnées appartiennent au même collaborateur
function validateSingleCollaboratorSelection(): boolean {
  if (selectedCells.value.size <= 1) return true
  
  const collaborateurs = new Set<string>()
  
  for (const cellId of selectedCells.value) {
    // Chercher le pattern de date YYYY-MM-DD à la fin
    const dateRegex = /-(\d{4}-\d{2}-\d{2})$/
    const match = cellId.match(dateRegex)
    if (!match) continue
    
    const collaborateurId = cellId.substring(0, cellId.length - match[1].length - 1)
    collaborateurs.add(collaborateurId)
  }
  
  return collaborateurs.size <= 1
}

// Nettoyer la sélection pour ne garder que les cellules du même collaborateur
function cleanSelectionToSingleCollaborator() {
  if (selectedCells.value.size <= 1) return
  
  const currentCollaborateur = getCurrentSelectedCollaborateur()
  if (!currentCollaborateur) return
  
  const validCells = new Set<string>()
  
  for (const cellId of selectedCells.value) {
    // Chercher le pattern de date YYYY-MM-DD à la fin
    const dateRegex = /-(\d{4}-\d{2}-\d{2})$/
    const match = cellId.match(dateRegex)
    if (!match) continue
    
    const collaborateurId = cellId.substring(0, cellId.length - match[1].length - 1)
    if (collaborateurId === currentCollaborateur) {
      validCells.add(cellId)
    }
  }
  
  selectedCells.value = validCells
}

// Vérifier si on peut ajouter une cellule à la sélection sans violer la règle du collaborateur unique
function canAddCellToSelection(collaborateurId: string): boolean {
  if (selectedCells.value.size === 0) return true
  const currentCollaborateur = getCurrentSelectedCollaborateur()
  return currentCollaborateur === collaborateurId
}

// Gestion du clic-glisser pour la sélection multiple
function handleCellMouseDown(collaborateurId: string, date: string, event: MouseEvent) {
  
  
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    
    // VALIDATION ULTRA-STRICTE: Aucune sélection multi-collaborateur autorisée
    if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
      
      return
    }
    
    // Réinitialiser le flag de mouvement
    hasMouseMoved.value = false
    
    isDraggingSelection.value = true
    dragStartCell.value = `${collaborateurId}-${date}`
    
    // Sélectionner/désélectionner la cellule de départ
    const cellId = `${collaborateurId}-${date}`
    if (selectedCells.value.has(cellId)) {
      selectedCells.value.delete(cellId)
      
    } else {
      selectedCells.value.add(cellId)
      
    }
    
    // VALIDATION POST-AJOUT (sécurité supplémentaire)
    if (!validateSingleCollaboratorSelection()) {
      
      cleanSelectionToSingleCollaborator()
    }
    
    selectedCells.value = new Set(selectedCells.value)
    
  }
}

function handleCellMouseEnter(collaborateurId: string, date: string) {
  // Éviter de propager les survols pendant le scroll rapide
  if (isScrollingFast.value) return
  
  // Debounce pour le hover collaboratif (pas pour la sélection)
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer)
    hoverDebounceTimer = null
  }
  
  // Gérer la sélection SANS debounce pour réactivité immédiate
  if (isDraggingSelection.value) {
    // Marquer qu'on a bougé la souris pendant le drag
    hasMouseMoved.value = true
    
    const cellId = `${collaborateurId}-${date}`
    
    // VALIDATION ULTRA-STRICTE: Bloquer immédiatement toute tentative de changement de collaborateur
    const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
    
    if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
      
      isDraggingSelection.value = false
      dragStartCell.value = null
      return
    }
    
    // Ajouter à la sélection pendant le glissement (même pendant l'auto-scroll)
    if (!selectedCells.value.has(cellId)) {
      selectedCells.value.add(cellId)
      // Validation post-ajout (sécurité)
      if (!validateSingleCollaboratorSelection()) {
        
        cleanSelectionToSingleCollaborator()
      }
      // Forcer la réactivité
      selectedCells.value = new Set(selectedCells.value)
    }
    return // Ne pas faire de hover collaboratif pendant la sélection
  }
  
  // Hover collaboratif avec debounce (seulement si pas en mode sélection)
  hoverDebounceTimer = setTimeout(() => {
    handleCellHover(collaborateurId, date)
  }, 100)
}

function handleCellMouseUp() {
  if (isDraggingSelection.value) {
    isDraggingSelection.value = false
    dragStartCell.value = null
    
    // Arrêter l'auto-scroll
    stopAutoScroll()
    
    // VALIDATION FINALE: S'assurer que la sélection respecte les règles
    if (!validateSingleCollaboratorSelection()) {
      
      cleanSelectionToSingleCollaborator()
    }
    
    // En vue collaborateur, sortir explicitement du mode sélection pour éviter de bloquer l'ouverture de modale
    if (isCollaborateurInterface.value && !canAccessAdminFeatures.value) {
      isSelectionMode.value = false
    }

    
  }
}

// Gestionnaire global pour arrêter le glissement si on sort de la zone
function handleGlobalMouseUp() {
  if (isDraggingSelection.value) {
    isDraggingSelection.value = false
    dragStartCell.value = null
    
    // Arrêter l'auto-scroll
    stopAutoScroll()
    
    
    // Si on est en mode collaborateur, on vide aussi la sélection par sécurité
    if (isCollaborateurInterface.value) {
      selectedCells.value.clear()
      
    }
  }
}

// Gestionnaire pour nettoyer le hover quand la souris sort de la fenêtre
function handleWindowMouseLeave() {
  collaborationService.onMouseLeaveWindow()
}

// Gestion de la création par lot
// Vérifier que le planning est vraiment prêt visuellement
async function checkPlanningReadiness() {
  // Attendre que Vue ait fini de rendre
  await nextTick()
  
  // Conditions pour que le planning soit prêt
  const hasCollaborateurs = allCollaborateurs.value.length > 0
  const hasVisibleDays = visibleDays.value.length > 0
  const dataLoaded = !loadingCollaborateurs.value && !loadingDisponibilites.value && !fetchingRanges.value
  
  // Si les données de base sont prêtes, considérer le planning comme prêt
  // Les éléments DOM se créeront après la fermeture de la modale
  if (hasCollaborateurs && hasVisibleDays && dataLoaded) {
    setTimeout(() => {
      planningReady.value = true
      
      // Centrer sur aujourd'hui avant de masquer l'overlay
      const scroller = planningScroll.value
      if (scroller) {
        const todayIndex = visibleDays.value.findIndex(d => d.isToday)
        if (todayIndex >= 0) {
          const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
          scroller.scrollLeft = centerOffset
        }
      }
      
      // Masquer l'overlay après une petite transition
      setTimeout(() => {
        isInitialLoad.value = false
      }, 300)
    }, 100)
  } else {
    // Réessayer dans un moment, mais avec un timeout de sécurité court
    const now = Date.now()
    const maxWaitTime = 5000 // 5 secondes max au lieu de 15
    
    if (!(window as any).planningReadinessStartTime) {
      (window as any).planningReadinessStartTime = now
    }
    
    if (now - (window as any).planningReadinessStartTime > maxWaitTime) {
      // Forcer le planning comme prêt après 5s
      planningReady.value = true
      
      // Centrer sur aujourd'hui même en cas de timeout
      const scroller = planningScroll.value
      if (scroller) {
        const todayIndex = visibleDays.value.findIndex(d => d.isToday)
        if (todayIndex >= 0) {
          const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
          scroller.scrollLeft = centerOffset
        }
      }
      
      setTimeout(() => {
        isInitialLoad.value = false
      }, 300)
    } else {
      // Réessayer normalement
      setTimeout(checkPlanningReadiness, 150)
    }
  }
}

async function refreshDisponibilites(clearCache = true) {
  try {
    if (clearCache) {
      // Vider le cache pour forcer le rechargement
      
      disponibilitesCache.value.clear()
      
      // Reset de l'état de chargement des ranges
      // Reset des ranges chargées
      loadedDateRanges.value = []
    } else {
      
    }
    
    // Recharger les données pour la période visible
    
    if (visibleDays.value.length > 0) {
      const firstDay = visibleDays.value[0]
      const lastDay = visibleDays.value[visibleDays.value.length - 1]
      if (!firstDay || !lastDay) {
        return
      }
      
      const dateDebut = firstDay.date
      const dateFin = lastDay.date
      
      await generateDisponibilitesForDateRange(dateDebut, dateFin)
      
      updateLieuxOptions() // Fonction synchrone, pas besoin d'await
      
    } else {
      // Aucun jour visible, impossible de recharger
    }
    
    // Démarrer la synchronisation temps réel après le chargement initial
    if (clearCache && visibleDays.value.length > 0) {
      stopRealtimeSync() // Arrêter les anciens listeners
      startRealtimeSync() // Démarrer un nouveau listener pour la zone visible
    }
    
  } catch (error) {
    console.error('❌ Erreur actualisation:', error)
  }
}

// Sauvegarde par lot avec gestion de version
// Obtenir la couleur d'un collaborateur
function getCollaborateurColor(collaborateurId: string): string {
  // Préférer la source centralisée filtrée (visible à l'écran)
  const collFromFiltered = filteredCollaborateurs.value.find(c => c.id === collaborateurId)
  if (collFromFiltered?.color) return collFromFiltered.color
  // Fallback sur la liste locale si dispo
  const collFromLocal = collaborateurs.value.find(c => c.id === collaborateurId)
  return collFromLocal?.color || '#666'
}

// === Gestion du modal d'informations collaborateur ===

const openCollaborateurInfo = async (collaborateur: Collaborateur) => {
  try {
    // Récupérer toutes les disponibilités du collaborateur pour les jours visibles
    const dispos: any[] = []
    for (const day of visibleDays.value) {
      const dayDispos = getDisponibilites(collaborateur.id, day.date)
      dispos.push(...dayDispos)
    }
    
    // Utiliser le nouveau système modal unifié
    selectedCollaborateur.value = collaborateur
    selectedCollabDispos.value = dispos
    showCollabModal.value = true
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
  
  notify({
    message: `Édition de ${collaborateur.prenom} ${collaborateur.nom}`,
    color: 'info'
  })
}

const handleSaveCollaborateurNotes = async (collaborateur: Collaborateur, notes: string) => {
  try {
    // Sauvegarder via le service de collaborateurs
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const userId = auth.currentUser?.uid || 'anonymous'
    
    await CollaborateursServiceV2.updateCollaborateur(
      tenantId,
      collaborateur.id || '', 
      { note: notes }, // Utiliser 'note' pour correspondre au type CollaborateurV2
      userId
    )
    
    // Mettre à jour localement après sauvegarde réussie (les deux champs pour compatibilité)
    const index = collaborateurs.value.findIndex(c => c.id === collaborateur.id)
    if (index !== -1) {
      collaborateurs.value[index].note = notes
      collaborateurs.value[index].notes = notes // Compatibilité
    }
    
    // Mettre à jour aussi dans la modale si elle est ouverte pour ce collaborateur
    if (selectedCollaborateur.value?.id === collaborateur.id) {
      selectedCollaborateur.value.note = notes
      selectedCollaborateur.value.notes = notes // Compatibilité
    }
    
    notify({
      message: 'Notes sauvegardées avec succès',
      color: 'success'
    })
    
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des notes:', error)
    notify({
      message: 'Erreur lors de la sauvegarde des notes',
      color: 'danger'
    })
  }
}

onMounted(async () => {
  // Initialiser les filtres depuis les paramètres de query
  initFiltersFromQuery()

  // Génération des jours initiaux
  await new Promise(resolve => setTimeout(resolve, 50))
  generateInitialDays()
  
  await planningData.loadCollaborateurs()
  
  // CORRECTION: Forcer la réactivité après le chargement des collaborateurs
  await nextTick()
  
  // Initialiser le moteur WASM ultra-performant
  await initializeWASMEngine()
  
  // Charger les disponibilités initiales
  if (visibleDays.value.length > 0) {
    const firstDay = visibleDays.value[0]
    const lastDay = visibleDays.value[visibleDays.value.length - 1]
    if (firstDay && lastDay) {
      await generateDisponibilitesForDateRange(firstDay.date, lastDay.date)
    }
  }
  
  // CORRECTION: Forcer la réactivité après le chargement des disponibilités 
  await nextTick()
  
  // Configurer le moteur WASM avec les données actuelles
  updateWASMConfiguration()
  
  // Initialiser l'affichage du mois actuel
  await nextTick()
  const scroller = planningScroll.value
  if (scroller) {
    updateCurrentVisibleMonth(scroller)
  // Important: premier recompute pour éviter fenêtre vide après refresh
  recomputeWindow(scroller)
  recomputeRowWindow(scroller)
  }
  
  // Charger les préférences utilisateur
  if (auth.currentUser && loadPreferences) {
    try {
      await loadPreferences(auth.currentUser.uid)
      // Préférences utilisateur chargées
    } catch (error) {
      console.warn('⚠️ Erreur lors du chargement des préférences:', error)
    }
  }
  
  // CORRECTION: Forcer un recalcul final pour s'assurer que le filtrage est appliqué
  await nextTick()
  // Forcer le recalcul si nécessaire
  if (scroller) {
    recomputeRowWindow(scroller)
    ensureRowsVisible()
  }
  
  // Initialiser les couleurs CSS de l'utilisateur
  updateUserColorVariables()
  
  // Configurer la synchronisation temps réel des préférences
  setupRealtimePreferences()
  
  // Configurer la synchronisation des couleurs utilisateurs
  setupUserColorsSync()
  
  // Ajouter un listener pour les changements de préférences depuis d'autres composants
  document.addEventListener('userPreferencesUpdated', handleUserPreferencesUpdate)
  
  // Initialiser les nouveaux services
  await setupInfiniteScroll()
  await setupPlanningInteractions()
  
  // Initialiser la présence utilisateur
  await initializePresence()
  
  // Démarrer le système réactif de présence
  startPresenceUpdates()
  
  // Construire le cache DOM après que tout soit rendu
  await nextTick()
  setTimeout(buildDOMCache, 100) // Petit délai pour assurer le rendu complet
  
  // S'abonner aux changements de locks pour la réactivité
  if (collaborationService && typeof collaborationService.onLockChange === 'function') {
    collaborationService.onLockChange(() => {
      // Incrémenter le compteur pour forcer la réactivité des locks
      lockUpdateCounter.value++
      // Mise à jour locks détectée
    })
  }
  
  // Exposer globalement quelques fonctions de debug uniquement si activé
  if (import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' && typeof window !== 'undefined') {
    ;(window as any).collaborationService = collaborationService
    ;(window as any).testDOMCache = function() {
      return {
        cacheValid: _domCache.cacheValid,
        columnCount: _domCache.columnElements.size,
        rowCount: _domCache.rowElements.size,
        lastBuilt: new Date(_domCache.lastBuilt)
      }
    }
    ;(window as any).benchmarkHighlight = function(iterations = 100) {
      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        const col = Math.floor(Math.random() * visibleDays.value.length)
        const row = Math.floor(Math.random() * paginatedCollaborateurs.value.length)
        updateHighlightWithDOMCache(col, row)
      }
      const end = performance.now()
      return (end - start) / iterations
    }
    ;(window as any).rebuildCache = function() {
      invalidateDOMCache('Test manuel')
      buildDOMCache()
    }
    ;(window as any).testLock = function(collaborateurId: string, date: string) {
      if (collaborationService) {
        return {
          before: {
            isCellLocked: collaborationService.isCellLocked(collaborateurId, date),
            lock: collaborationService.getCellLock(collaborateurId, date)
          }
        }
      }
    }
    ;(window as any).testUnlock = function(collaborateurId: string, date: string) {
      if (collaborationService) {
        collaborationService.unlockCell(collaborateurId, date)
        return {
          after: {
            isCellLocked: collaborationService.isCellLocked(collaborateurId, date),
            lock: collaborationService.getCellLock(collaborateurId, date)
          }
        }
      }
    }
    ;(window as any).testHover = function(collaborateurId: string, date: string) {
      if (collaborationService) {
        const before = collaborationService.getHoveringUsers(collaborateurId, date)
        collaborationService.updateHoveredCell(collaborateurId, date)
        return { before }
      }
    }
    ;(window as any).testCellClasses = function(collaborateurId: string, date: string) {
      const cellSelector = `[data-day-date="${date}"]`
      const cells = document.querySelectorAll(cellSelector)
      const cell = Array.from(cells).find(el => {
        const row = el.closest('.excel-row')
        return row?.getAttribute('data-collaborateur-id') === collaborateurId
      }) as HTMLElement | undefined
      if (!cell) return null
      return {
        element: cell,
        classes: cell.className,
        hasIndicator: cell.classList.contains('has-indicator'),
        hasPresence: cell.classList.contains('has-presence'),
        locked: cell.classList.contains('locked')
      }
    }
    ;(window as any).forceTestClasses = function(collaborateurId?: string, date?: string) {
      const targetCollab = collaborateurId || paginatedCollaborateurs.value[0]?.id
      const targetDate = date || visibleDays.value[0]?.date
      if (!targetCollab || !targetDate) return null
      const cellSelector = `[data-day-date="${targetDate}"]`
      const cells = document.querySelectorAll(cellSelector)
      const cell = Array.from(cells).find(el => {
        const row = el.closest('.excel-row')
        return row?.getAttribute('data-collaborateur-id') === targetCollab
      }) as HTMLElement | undefined
      if (!cell) return null
      cell.classList.add('has-indicator', 'has-presence')
      return cell
    }
  }
  
  // Gestionnaires d'événements clavier pour la sélection par lot
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  document.addEventListener('blur', () => isSelectionMode.value = false)
  
  // Gestionnaire global pour le clic-glisser
  document.addEventListener('mouseup', handleGlobalMouseUp)
  
  // Gestionnaire pour nettoyer le hover quand la souris sort de la fenêtre
  document.addEventListener('mouseleave', handleWindowMouseLeave)
  
  // Gestionnaire pour les mouvements de souris (désactivé - on utilise le survol de cellules)
  
  measureAndSetHeaderHeight()
  recomputeWindow(planningScroll.value || null)
  scheduleMeasurements(true) // Système optimisé : mesures + overlay aujourd'hui
  
  // Charger immédiatement les dispos pour la fenêtre initiale complète
  if (loadedDays.value.length > 0) {
    
    // Utiliser refreshDisponibilites au lieu de generateDisponibilitesForDateRange
    // pour déclencher la synchronisation temps réel
    await refreshDisponibilites(true)
    
  // Mettre à jour la vue de présence
  updatePresenceSets()
  updateDomHoverIndicators()
    
    // Détecter et corriger automatiquement les missions overnight existantes (silencieux)
    // Seulement si des données sont chargées et qu'il y a potentiellement des missions à corriger
    // TEMPORAIREMENT DÉSACTIVÉ pendant migration complète vers RTDB
    if (disponibilitesCache.value.size > 0) {
      // detectAndFixExistingOvernightMissions().catch(console.error)
      
    }
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('resize', () => {
    // Utiliser le système optimisé pour les re-mesures
    scheduleMeasurements(true)
  })
  // Pré-remplir la droite pour garder un gros buffer
  if (planningScroll.value) {
    await ensureRightBuffer(planningScroll.value)
    recomputeWindow(planningScroll.value)
    scheduleMeasurements(false) // Pas besoin de l'overlay ici, fait après
  // today overlay piloté par CSS vars
    // Centrer la date du jour
    const todayIndex = loadedDays.value.findIndex(d => d.isToday)
    if (todayIndex >= 0) {
      const scroller = planningScroll.value
      const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - 300) / 2)
      scroller.scrollLeft = centerOffset
      
      // Positionner l'overlay du jour après le scroll
      // Plus besoin d'updateTodayOverlayX - highlights gérés par CSS
    }
  }
})

// Watcher unique pour invalidation du cache DOM et mise à jour WASM
watch([visibleDays, paginatedCollaborateurs], () => {
  clearAllHighlights()
  invalidateDOMCache('Structure du planning modifiée')
  setTimeout(buildDOMCache, 50)
  updateWASMConfiguration()
}, { immediate: false })

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  
  // Nettoyer le listener global pour le drag
  document.removeEventListener('mousemove', handleGlobalMouseMoveDuringDrag)
  
  // Arrêter l'auto-scroll si actif
  stopAutoScroll()
  
  // Nettoyer l'intervalle de présence
  if (presenceUpdateInterval) {
    clearInterval(presenceUpdateInterval)
    presenceUpdateInterval = null
  }
  
  // Nettoyer les timers et RAF pour éviter les fuites mémoire
  if (rafMeasurementId) {
    cancelAnimationFrame(rafMeasurementId)
    rafMeasurementId = null
  }
  
  if (_hoverRafId) {
    cancelAnimationFrame(_hoverRafId)
    _hoverRafId = null
  }
  
  if (scrollDebounceTimer) {
    clearTimeout(scrollDebounceTimer)
    scrollDebounceTimer = null
  }
  
  // Invalider les caches
  _cachedGridValues = null
})

// Réagir à toute mutation des jours chargés (append/prepend)
// Debounced watcher optimisé pour éviter les re-mesures excessives
const loadedDaysDebounced = (() => {
  let timeoutId: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      recomputeWindow(planningScroll.value || null)
      scheduleMeasurements(true) // Système optimisé
    }, 100)
  }
})()

watch(loadedDays, loadedDaysDebounced)

// Watchers pour mettre à jour les Sets réactifs
// Watcher optimisé avec debounce
const updateSetsDebounced = (() => {
  let timeoutId: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      updatePresenceSets()
  updateDomHoverIndicators()
      nextTick(() => {
        // Important: recalculer la fenêtre de lignes avec le scroller pour éviter une fenêtre vide (endIndex=-1)
        if (planningScroll.value) {
          recomputeRowWindow(planningScroll.value)
        }
      })
    }, 50)
  }
})()

watch([visibleDays, paginatedCollaborateurs], updateSetsDebounced, { immediate: true })

// Garde-fou: si la fenêtre de lignes devient vide alors qu'il y a des résultats,
// reclamper automatiquement pour réafficher des lignes
watch(() => windowedRows.value.length, (len) => {
  if (filteredCollaborateurs.value.length > 0 && len === 0) {
    nextTick(() => {
      const scroller = planningScroll.value
      recomputeRowWindow(scroller || (null as any))
    })
  }
})

// Garde additionnelle: si l'index de départ dépasse la taille après un gros shrink,
// réinitialiser le scroll vertical et reclamper immédiatement
watch([() => filteredCollaborateurs.value.length, rowHeight], () => {
  nextTick(() => {
    const total = filteredCollaborateurs.value.length
    if (total <= 0) return
    const scroller = planningScroll.value
    if (!scroller) {
      // Sans scroller, exposer la première ligne
      recomputeRowWindow(null as any)
      return
    }
    // Si la fenêtre pointe hors bornes, reset scroll et recompute
    if (rowWindowStartIndex.value >= total) {
      scroller.scrollTop = 0
      recomputeRowWindow(scroller)
    }
    // Si malgré tout aucune ligne n'est visible, reset hard
    if (windowedRows.value.length === 0) {
      scroller.scrollTop = 0
      recomputeRowWindow(scroller)
    }
  })
}, { immediate: true })

// IMPORTANT: quand visibleDays change (filtres date, extension/pruning),
// re-calculer la fenêtre et corriger un éventuel scroll hors bornes qui
// provoquerait une zone "vide" à l'écran.
watch(visibleDays, async (newDays, _oldDays) => {
  await nextTick()
  const scroller = planningScroll.value
  if (!scroller) return

  // Clamp du scroll horizontal dans la nouvelle largeur de contenu
  const contentWidth = Math.max(0, newDays.length * (dayWidth.value + 1))
  const maxScrollLeft = Math.max(0, contentWidth - scroller.clientWidth)
  if (scroller.scrollLeft > maxScrollLeft) {
    scroller.scrollLeft = maxScrollLeft
  }

  // Recalculer la fenêtre virtuelle pour aligner windowStart/End
  recomputeWindow(scroller)

  // Garde-fou: si les index dépassent, les ramener en borne
  if (windowStartIndex.value >= newDays.length) {
    windowStartIndex.value = Math.max(0, newDays.length - 1)
  }
  if (windowEndIndex.value >= newDays.length) {
    windowEndIndex.value = Math.max(-1, newDays.length - 1)
  }
}, { deep: false })

// Watcher pour les paramètres de query (navigation depuis détail collaborateur)
watch(() => route.query, (newQuery) => {
  if (newQuery.collaborateur && newQuery.collaborateur !== searchTerm.value) {
    searchTerm.value = newQuery.collaborateur as string
    
  }
}, { immediate: true })

// CORRECTION BUG 1: Recharger les collaborateurs quand on revient sur le planning
// (pour prendre en compte les suppressions/modifications faites depuis la liste)
watch(() => route.path, async (newPath, oldPath) => {
  // Si on revient sur le planning depuis une autre page (incluant les pages collaborateurs)
  const isPlanning = newPath === '/semaine' || newPath === '/'
  const wasElsewhere = oldPath && !oldPath.startsWith('/semaine') && oldPath !== '/'
  
  if (isPlanning && wasElsewhere) {
    try {
      await planningData.loadCollaborateurs()
      await nextTick()
      // Forcer la mise à jour de la virtualisation
      const scroller = planningScroll.value
      if (scroller) {
        recomputeRowWindow(scroller)
        recomputeWindow(scroller)
      }
    } catch (error) {
      console.error('Erreur lors du rechargement des collaborateurs:', error)
    }
  }
}, { immediate: false })

// Watchers pour optimisation des filtres
watch(allCollaborateurs, () => {
  // Nettoyer le cache lors du changement des collaborateurs (géré par le composable)
  
}, { deep: true })

// Quand les filtres structurants changent, régénérer les jours et ajuster le scroll
// Note: Le chargement des données est géré automatiquement par usePlanningData
watch([filterMetier, filterStatut, filterLieu, dateFrom, dateTo], () => {
  // Régénérer la liste des jours visibles en fonction des filtres de dates
  generateInitialDays()
  
  // Après la mise à jour du DOM, ajuster le scroll
  nextTick(() => {
    const scroller = planningScroll.value
    if (!scroller) return
    
    // Reset vertical pour éviter un startIndex hors bornes après un shrink
    scroller.scrollTop = 0
    recomputeRowWindow(scroller)
    
    // Sync horizontal aussi (dates filtrées)
    recomputeWindow(scroller)
    
    // Protéger contre toute fenêtre vide
    ensureRowsVisible()
  })
})

// Quand on passe de "filtres actifs" à "aucun filtre", effectuer un reset agressif
watch(() => planningFilters.hasActiveFilters.value, (active, prev) => {
  if (!active && prev) {
    nextTick(() => {
      const scroller = planningScroll.value
      // Réinitialiser la position de scroll et reclamper complètement
      if (scroller) {
        scroller.scrollTop = 0
        scroller.scrollLeft = 0
        try {
          recomputeWindow(scroller)
          recomputeRowWindow(scroller)
        } catch {}
      } else {
        try { recomputeRowWindow(null as any) } catch {}
      }
      // Garantir l'affichage d'au moins une fenêtre de lignes
      ensureRowsVisible()
      // Invalider/reconstruire le cache DOM pour refléter la structure restaurée
      invalidateDOMCache('Reset après clearAllFilters')
      setTimeout(buildDOMCache, 50)
    })
  }
})

watch(() => searchTerm.value, () => {
  // Le cache de recherche est maintenant géré par le composable usePlanningFilters
  // (log supprimé)

  // Pendant la recherche, éviter que scrollTop reste hors bornes si la liste se réduit
  nextTick(() => {
    const scroller = planningScroll.value
    if (scroller) {
      // La recherche peut changer drastiquement la liste: reset vertical immédiat
      scroller.scrollTop = 0
      recomputeRowWindow(scroller)
      recomputeWindow(scroller)
    }
    ensureRowsVisible()
  })
})

// Watcher pour nettoyer le timer de debounce au démontage
onUnmounted(() => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
})

// Watcher pour les préférences utilisateur - mettre à jour les couleurs automatiquement
watch(() => preferences.value.presenceColor, (newColor) => {
  if (newColor && auth.currentUser) {
    
    updateUserColorVariables()
    
    // Forcer la mise à jour des avatars dans la barre d'utilisateurs actifs
    // en déclenchant une nouvelle évaluation de getUserColorWrapper
    nextTick(() => {
      const event = new CustomEvent('userColorChanged', { detail: { userId: auth.currentUser!.uid, color: newColor } })
      document.dispatchEvent(event)
    })
  }
}, { immediate: true })

// Watcher pour l'authentification - charger les préférences quand l'utilisateur change
watch(() => auth.currentUser?.uid, (newUid, oldUid) => {
  if (newUid && newUid !== oldUid && loadPreferences) {
    
    loadPreferences(newUid)
      .then(() => {
        // Préférences chargées
        updateUserColorVariables()
        
        // Configurer la synchronisation temps réel pour le nouvel utilisateur
        setupRealtimePreferences()
      })
      .catch(error => console.warn('⚠️ Erreur chargement préférences:', error))
  } else if (!newUid && preferencesUnsubscribe) {
    // Utilisateur déconnecté, nettoyer le listener
    preferencesUnsubscribe()
    preferencesUnsubscribe = null
  }
}, { immediate: true })

// Update cyclique pour synchroniser avec RTDB
let presenceUpdateInterval: number | null = null
let forceUpdateCounter = 0

function startPresenceUpdates() {
  if (presenceUpdateInterval) clearInterval(presenceUpdateInterval)
  
  presenceUpdateInterval = setInterval(() => {
    forceUpdateCounter++
    // Force une mise à jour complète toutes les 5 itérations (2.5 secondes)
    if (forceUpdateCounter >= 5) {
      forceUpdateCounter = 0
      hoveredCells.value = new Set() // Force le changement
      lockedCells.value = new Set()
    }
    updatePresenceSets()
  }, 500) // Optimisé : 500ms suffit pour la présence temps réel (économie CPU)
}

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
  document.removeEventListener('mouseleave', handleWindowMouseLeave)
  document.body.classList.remove('selection-mode')
  document.body.classList.remove('dragging-selection')
  
  // Fermer les modaux pour éviter les overlays orphelins
  showDispoModal.value = false
  showCollabModal.value = false
  
  // Nettoyer les gestionnaires de curseur collaboratif
  // Nettoyage des gestionnaires d'événements
  
  // Nettoyer la synchronisation temps réel
  stopRealtimeSync()
  
  // Nettoyer le timer de debounce
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer)
    hoverDebounceTimer = null
  }
  
  // Nettoyer la présence utilisateur
  collaborationService.cleanup()
})

// Pan mobile à deux doigts (n'altère pas le scroll à un doigt)
let panTouchStart: { x: number; y: number; scrollLeft: number; scrollTop: number } | null = null
// Tap simple pour sélection en mode mobile (admin)
let singleTouchStart: { x: number; y: number; time: number; targetCellId?: string } | null = null
const TAP_MAX_MOVEMENT = 8 // px
const TAP_MAX_DURATION = 350 // ms

function onTouchStart(e: TouchEvent) {
  const scroller = planningScroll.value
  if (!scroller) return

  // 1) Pan à deux doigts
  if (e.touches.length === 2) {
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
    return
  }

  // 2) Tap simple (un doigt) en mode sélection mobile (admin uniquement)
  if (e.touches.length === 1 && isMobileView.value && !isCollaborateurInterface.value) {
    const touch = e.touches[0]
    singleTouchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    // Capturer la cellule sous le doigt
    const target = e.target as HTMLElement
    const cell = target.closest?.('.excel-cell') as HTMLElement | null
    if (cell) {
      singleTouchStart.targetCellId = cell.getAttribute('data-cell-id') || undefined
    }

    const onSingleMove = (ev: TouchEvent) => {
      if (!singleTouchStart) return
      const t = ev.touches[0]
      const dx = Math.abs(t.clientX - singleTouchStart.x)
      const dy = Math.abs(t.clientY - singleTouchStart.y)
      if (dx > TAP_MAX_MOVEMENT || dy > TAP_MAX_MOVEMENT) {
        // Trop de mouvement: ce n'est plus un tap
        singleTouchStart = null
        window.removeEventListener('touchmove', onSingleMove as any)
        window.removeEventListener('touchend', onSingleEnd as any)
        window.removeEventListener('touchcancel', onSingleEnd as any)
      }
    }

    const onSingleEnd = () => {
      if (!singleTouchStart) return
      const duration = Date.now() - singleTouchStart.time
      const tappedCellId = singleTouchStart.targetCellId
      singleTouchStart = null
      window.removeEventListener('touchmove', onSingleMove as any)
      window.removeEventListener('touchend', onSingleEnd as any)
      window.removeEventListener('touchcancel', onSingleEnd as any)

      // Si on est en mode sélection et que le tap est court, toggler la cellule
      if (isSelectionMode.value && duration <= TAP_MAX_DURATION && tappedCellId) {
        // Extraire collaborateurId et date depuis data attribs pour respecter la règle mono-collaborateur
        const cellEl = planningScroll.value?.querySelector(`[data-cell-id="${tappedCellId}"]`) as HTMLElement | null
        const collaborateurId = cellEl?.getAttribute('data-row-index')
        const date = cellEl?.getAttribute('data-day-date')
        // Fallback sur l'ID composé
        let collabIdFinal = ''
        let dateFinal = ''
        if (tappedCellId.includes('_')) {
          const parts = tappedCellId.split('_')
          collabIdFinal = parts[0]
          dateFinal = parts[1]
        }
        if (!collabIdFinal && collaborateurId && date) {
          collabIdFinal = collaborateurId
          dateFinal = date
        }
        if (collabIdFinal && dateFinal) {
          const fakeEvent = { ctrlKey: true, metaKey: false } as unknown as MouseEvent
          handleCellClickNew(collabIdFinal, dateFinal, fakeEvent)
          // Empêcher le clic qui suivra le touchend de re-déclencher la logique
          const cancelClick = (ce: MouseEvent) => {
            ce.stopImmediatePropagation()
            ce.preventDefault()
          }
          scroller.addEventListener('click', cancelClick, { capture: true, once: true })
        }
      }
    }

    window.addEventListener('touchmove', onSingleMove, { passive: true })
    window.addEventListener('touchend', onSingleEnd, { passive: true })
    window.addEventListener('touchcancel', onSingleEnd, { passive: true })
  }
}

// Cleanup des listeners de collaboration lors du démontage du composant
onUnmounted(() => {
  if (activityUnsubscribe.value) {
    activityUnsubscribe.value()
  }
  if (lockUnsubscribe.value) {
    lockUnsubscribe.value()
  }
  if (selectionUnsubscribe.value) {
    selectionUnsubscribe.value()
  }
  
  // Nettoyer le listener préférences temps réel
  if (preferencesUnsubscribe) {
    preferencesUnsubscribe()
    preferencesUnsubscribe = null
  }
  
  // Nettoyer les listeners de couleurs utilisateurs
  UserColorsService.cleanup()
  
  // Nettoyer l'event listener pour les changements de préférences
  document.removeEventListener('userPreferencesUpdated', handleUserPreferencesUpdate)
})
</script>

<style scoped>
@import "@/styles/planning-semaine.css";
</style>
