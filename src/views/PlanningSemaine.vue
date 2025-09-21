<template>
  <div class="planning-app" :class="{ 'collaborateur-light-theme': isCollaborateurInterface }">
    <!-- Header avec filtres compact (seulement pour admin) -->
    <FiltersHeaderNew
      v-if="!isCollaborateurInterface"
    />

  <!-- Indicateur des filtres actifs supprimé sur demande -->

  <!-- Contenu principal -->
  <div class="main-content">
  <PlanningLoadingModal
    :show-modal="showLoadingModal"
    :loading-collaborateurs="loadingCollaborateurs"
    :loading-disponibilites="loadingDisponibilites"
    :fetching-ranges="fetchingRanges"
    :all-collaborateurs-count="planningData.filterStats.value.totalCollaborateurs"
    :visible-days-count="visibleDays.length"
  />

  <!-- Toast de chargement supprimé: trop de notifications -->

  <div class="planning-manager">
    </div>
  </div>

  <!-- Indicateur de chargement (désactivé: UX non-bloquante, on utilise des placeholders gris) -->

    <!-- Suggestions contextuelles -->
    <div v-if="suggestions.length" class="suggestions">
      <va-icon name="lightbulb" size="14px" class="mr-1" />
      <span v-for="(s, i) in suggestions" :key="i" class="suggestion-item">{{ s }}</span>
    </div>

    <!-- Indicateur de chargement extension (non bloquant) -->
    <div v-if="extending || (isBusy && !isInitialLoad)" class="extending-indicator">
      <va-icon name="refresh" spin size="1rem" />
      <span v-if="extending">Extension en cours...</span>
      <span v-else-if="fetchingRanges">Chargement des données...</span>
      <span v-else>Synchronisation...</span>
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

    <!-- Etat vide quand filtres actifs mais aucun résultat -->
  <div v-if="hasActiveFilters && filteredCollaborateurs.length === 0 && !isBusy" class="empty-state">
      <div class="empty-card">
        <span class="material-icons empty-icon">filter_alt_off</span>
        <div class="empty-title">Aucun collaborateur ne correspond aux filtres</div>
        <div class="empty-sub">Ajustez vos critères ou réinitialisez les filtres.</div>
        <button class="btn-secondary" @click="clearAllFilters">
          <span class="material-icons">clear_all</span>
          Réinitialiser les filtres
        </button>
      </div>
    </div>

    <!-- Stats de virtualisation (dev mode) - DÉSACTIVÉ
    <div v-if="false && isEmulator && virtualizationStats.totalCells > 0" class="virtualization-stats" @click="toggleStatsDetails">
      <div class="stats-summary">
        <va-icon name="dashboard" size="12px" />
        <span>{{ virtualizationStats.visibleCells }}/{{ virtualizationStats.totalCells }}</span>
      </div>
      <div v-if="showStatsDetails" class="stats-details">
        <div>Cellules visibles: {{ virtualizationStats.visibleCells }}</div>
        <div>Total cellules: {{ virtualizationStats.totalCells }}</div>
        <div>Cellules chargées: {{ virtualizationStats.loadedCells }}</div>
        <div>Scroll rapide: {{ virtualizationStats.fastScrollEvents }}</div>
        <div>Ratio: {{ Math.round((virtualizationStats.visibleCells / virtualizationStats.totalCells) * 100) }}%</div>
      </div>
    </div>
    -->

    <!-- Stats moteur WASM ultra-performant temporairement désactivé -->
    <!--
    <div v-if="isEmulator && _wasmReady" class="wasm-stats" @click="toggleWasmStats">
      <div class="stats-summary">
        <va-icon name="flash_on" size="12px" />
        <span v-if="wasmStats.totalCalculations > 0">WASM: {{ wasmStats.averageTime.toFixed(4) }}ms</span>
        <span v-else>WASM: Prêt</span>
        <div class="performance-indicator" :class="wasmPerformanceClass"></div>
      </div>
      <div v-if="showWasmStats" class="stats-details">
        <div>Moteur: {{ _wasmReady ? 'JavaScript ultra-optimisé' : 'Standard' }}</div>
        <div>Calculs totaux: {{ wasmStats.totalCalculations.toLocaleString() }}</div>
        <div v-if="wasmStats.totalCalculations > 0">Temps moyen: {{ wasmStats.averageTime.toFixed(6) }}ms</div>
        <div v-if="wasmStats.totalCalculations > 0">FPS théorique: {{ wasmStats.averageTime > 0 ? Math.round(1000 / wasmStats.averageTime) : '∞' }}</div>
        <div v-if="wasmStats.totalCalculations > 0">Temps total: {{ wasmStats.totalTime.toFixed(2) }}ms</div>
        <div v-else>Survolez le planning pour voir les stats</div>
        <div class="shortcuts">
          <small>⌘+B: Benchmark | ⌘+W: Stats</small>
        </div>
        <button @click.stop="runWasmBenchmark" class="benchmark-btn">🏁 Benchmark</button>
      </div>
    </div>
    -->

    <!-- Badge d’environnement: émulateur local -->
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
    <!-- Planning Excel synchronisé - Scroll unique, sticky header + colonne -->
    <div class="excel-planning-container">
  
  <!-- Bouton flottant pour la sélection par lot - ADMIN UNIQUEMENT -->
  <div v-if="!isCollaborateurInterface && selectedCells.size > 0" class="batch-action-fab">
    <div class="fab-content">
      <va-button
        color="primary"
        icon="bolt"
        @click="batchModalOpen = true"
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
          <!-- Séparateurs hebdo du header (mois+semaines+jours) -->
      <div class="week-separators-header" aria-hidden="true">
            <template v-for="(day, idx) in visibleDays" :key="'sep-'+day.date">
              <div
                v-if="isWeekBoundary(day.date)"
                class="week-sep"
        :style="{ left: `calc(var(--grid-left-header, var(--sticky-left, 260px)) + (${idx} + 1) * var(--day-pitch-header, calc(var(--day-width, 100px) + 1px)) - 1px)` }"
              ></div>
            </template>
          </div>
          <!-- Coin sticky top+left -->
          <div class="excel-corner corner-sticky">
            <!-- Bouton Aujourd'hui en haut -->
            <button class="today-btn" @click="goToToday" title="Aller à aujourd'hui">
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
                  v-for="(day, dayIndex) in windowedDays"
                  :key="day.date"
                  class="excel-day-cell"
                  :data-day-index="windowStartIndex + dayIndex"
                  :class="[
                    {
                      'today': day.isToday,
                      'loading-placeholder': !isDayLoaded(day.date),
                      'week-boundary-right': isWeekBoundary(day.date)
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
              :style="{ 
                height: rowHeight + 'px',
                '--collaborateur-color': getCollaborateurColor(collaborateur.id)
              }"
            >
            <!-- Colonne gauche sticky -->
            <div 
              class="collab-sticky" 
              :data-row-index="rowIndex"
              :class="getCollaborateurRowClasses(rowIndex)"
              :style="{ '--collaborateur-color': getCollaborateurColor(collaborateur.id) }"
            >
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
                    {
                      'today': day.isToday,
                      'has-dispos': getCellDispos(collaborateur.id, day.date).length > 0,
                      'loading-placeholder': !isDayLoaded(day.date),
                      'week-boundary-right': isWeekBoundary(day.date),
                      'selected': selectedCells.has(`${collaborateur.id}-${day.date}`),
                      'locked': isCellLockedByOther(collaborateur.id, day.date),
                      'has-indicator': (() => {
                        const isLocked = isLockedByOthers(collaborateur.id, day.date)
                        const hasHover = isHoveredByOthers(collaborateur.id, day.date)
                        const firstCollab = paginatedCollaborateurs[0]
                        const firstDay = visibleDays[0]
                        const isTestCell = firstCollab && firstDay && collaborateur.id === firstCollab.id && day.date === firstDay.date
                        const result = isLocked || hasHover || isTestCell
                        return result
                      })(),
                      'has-presence': (() => {
                        return isHoveredByOthers(collaborateur.id, day.date)
                      })()
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
                        <!-- Affichage uniforme simplifié -->
                        <div class="dispo-unified-content">
                          <!-- Type de dispo + temporalité en une ligne -->
                          <div class="dispo-main-info">
                            <va-icon 
                              :name="getDispoTypeIcon(dispo)" 
                              size="10px" 
                              class="dispo-type-icon" 
                            />
                            <span class="dispo-temporal">{{ getTemporalDisplay(dispo, day.date) }}</span>
                            <span v-if="isOvernightContinuation(dispo, day.date)" class="overnight-symbol" title="Suite">⤺</span>
                            <span v-if="isOvernightStart(dispo, day.date)" class="overnight-symbol" title="Continue">⤻</span>
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
                      v-if="getCellDisposSorted(collaborateur.id, day.date).length === 0"
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
      v-model="showDispoModal" 
      :hide-default-actions="true"
      :fullscreen="false"
      max-width="600px"
      no-padding
      @before-open="modalA11y.onBeforeOpen"
      @open="modalA11y.onOpen"
      @close="() => { modalA11y.onClose(); cancelModal() }"
    >
      <DispoEditContent
        v-if="selectedCell"
        :selected-cell="selectedCell"
  :selected-collaborateur="getSelectedCollaborateur() || null"
        :collaborateur-color="getCollaborateurColor(getSelectedCollaborateur()?.id || '')"
        :formatted-date="formatModalDate(selectedCell.date)"
        :selected-cell-dispos="selectedCellDispos"
        :editing-dispo-index="editingDispoIndex"
        :is-adding-new-dispo="isAddingNewDispo"
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
        @save-edit-dispo="saveEditDispo"
        @add-new-dispo-line="addNewDispoLine"
        @update-editing-lieu="(v) => editingDispo.lieu = v"
      />
    </va-modal>

  </div> <!-- Fin excel-planning-container -->
  </div> <!-- Fin planning-app -->

  <!-- Modal de sélection par lot (admin seulement) -->
  <BatchDisponibiliteModal
    v-if="InterfaceManager.canAccessAdminFeatures.value"
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

  <!-- Dashboard Firestore supprimé: migration vers RTDB terminée -->

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
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vuestic-ui'
import FiltersHeaderNew from '../components/FiltersHeaderNew.vue'
import { defineAsyncComponent } from 'vue'
const BatchDisponibiliteModal = defineAsyncComponent(() => import('../components/BatchDisponibiliteModal.vue'))
const CollaborateurInfoModal = defineAsyncComponent(() => import('../components/CollaborateurInfoModal.vue'))
// Composant de chargement nécessaire pour l'UX
import PlanningLoadingModal from '../components/planning/PlanningLoadingModal.vue'
const DispoEditContent = defineAsyncComponent(() => import('@/components/DispoEditContent.vue'))
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

// État de filtrage du système centralisé
const hasActiveFilters = planningFilters.hasActiveFilters

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
const selectedCells = ref<Set<string>>(new Set())
// (cellLocks retiré: la grille utilise getCellLockClasses() basé sur le service)
const lockUpdateCounter = ref(0) // Force la réactivité des verrous

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
  // Sur desktop, activer le mode sélection avec Ctrl/Cmd
  // Sur mobile, laisser le FAB gérer le mode sélection
  if ((e.ctrlKey || e.metaKey) && !isMobileView.value) {
    isSelectionMode.value = true
  }
  
  // Raccourci pour le benchmark WASM : Ctrl/Cmd + B
  if ((e.ctrlKey || e.metaKey) && e.key === 'b' && isEmulator && _wasmReady) {
    e.preventDefault()
    runWasmBenchmark()
  }
  
  // Raccourci pour afficher/masquer les stats WASM : Ctrl/Cmd + W
  if ((e.ctrlKey || e.metaKey) && e.key === 'w' && isEmulator && _wasmReady) {
    e.preventDefault()
    showWasmStats.value = !showWasmStats.value
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

// Watcher pour la sélection de cellules (mettre à jour les initiales + transmettre aux autres)
watch(selectedCells, () => {
  // Les initiales sont maintenant gérées de manière réactive via :data-initials dans le template
  // Plus besoin de updatePresenceInitials()
  
  // Transmettre les sélections aux autres utilisateurs via RTDB
  if (collaborationService.isActive) {
    collaborationService.updateSelectedCells(selectedCells.value)
    // console.log('📋 Sélections transmises:', selectedCells.value.size, 'cellules')
  }
}, { deep: true })

// Watcher pour le modal batch - lock des cellules sélectionnées côté admin
watch(batchModalOpen, async (isOpen) => {
  if (!collaborationService.isActive) return
  
  if (isOpen && selectedCells.value.size > 0) {
    // Modal ouvert : verrouiller toutes les cellules sélectionnées
    console.log('🔒 Verrouillage modal batch:', selectedCells.value.size, 'cellules')
    
    const lockPromises: Promise<boolean>[] = []
    selectedCells.value.forEach(cellKey => {
      const [collaborateurId, date] = cellKey.split('-')
      if (collaborateurId && date) {
        const promise = collaborationService.lockCell(collaborateurId, date)
        lockPromises.push(promise)
      }
    })
    
    try {
      const results = await Promise.all(lockPromises)
      const successfulLocks = results.filter(success => success).length
      console.log(`🔒 Modal batch: ${successfulLocks}/${lockPromises.length} cellules verrouillées`)
    } catch (error) {
      console.warn('⚠️ Erreur lors du verrouillage modal batch:', error)
    }
  } else if (!isOpen) {
    // Modal fermé : libérer tous les verrous
    console.log('🔓 Libération verrous modal batch')
    
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
      console.log('🔓 Modal batch: verrous libérés')
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

const minPastDate = ref<string>(calcMinPastDate())

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
const disponibilitesCache = ref<Map<string, Disponibilite[]>>(new Map())

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
const totalUsers = computed(() => sessionStats.value.uniqueUsers)
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

// Détection mode émulateur
const isEmulatorMode = computed(() => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.port === '3000' ||
         window.location.href.includes('emulator')
})

const loadingDisponibilites = ref(false)
const fetchingRanges = ref(false)
const extending = ref(false) // Déclaration déplacée ici pour éviter l'erreur "before initialization"

// Busy state: quand on charge des plages ou qu'on étend
const isBusy = computed(() => {
  const localBusy = loadingCollaborateurs.value || loadingDisponibilites.value || fetchingRanges.value || extending.value
  const composableBusy = planningData.isLoading.value || planningData.loadingDisponibilites.value || planningData.fetchingRanges.value.length > 0
  return localBusy || composableBusy
})

// Garder les états locaux synchronisés avec le composable centralisé
watch(() => planningData.isLoading.value, (v) => { loadingCollaborateurs.value = v }, { immediate: true })
watch(() => (planningData.loadingDisponibilites.value || (planningData.fetchingRanges.value?.length > 0)), (v) => { loadingDisponibilites.value = v }, { immediate: true })

// CORRECTION: Watcher pour forcer le recalcul du filtrage quand le chargement est terminé
watch(isBusy, async (busy, prevBusy) => {
  // Quand on passe de busy=true à busy=false (fin de chargement)
  if (prevBusy && !busy) {
    await nextTick()
    console.log('🔍 [DEBUG] Fin de chargement - forcer recalcul filtrage:', filteredCollaborateurs.value.length)
    // Forcer la réactivité
    const scroller = planningScroll.value
    if (scroller) {
      recomputeRowWindow(scroller)
      ensureRowsVisible()
    }
  }
}, { immediate: false })

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
const modalA11y = useModalA11y()
const selectedCell = ref<{ collaborateurId: string; date: string } | null>(null)
const selectedCellDispos = ref<Disponibilite[]>([])

// État d'édition de ligne
const editingDispoIndex = ref<number | null>(null)
const isAddingNewDispo = ref(false)
const editingDispo = ref<Partial<Disponibilite>>({
  type: 'disponible',
  timeKind: 'full-day', // Valeur par défaut normale
  heure_debut: '09:00',
  heure_fin: '17:00',
  lieu: '',
  slots: []
})

// Options de créneaux
const slotOptions = [
  { text: 'Matin (06:00–12:00)', value: 'morning' },
  { text: 'Midi (12:00–14:00)', value: 'midday' },
  { text: 'Après-midi (14:00–18:00)', value: 'afternoon' },
  { text: 'Soir (18:00–22:00)', value: 'evening' },
  { text: 'Nuit (22:00–06:00)', value: 'night' },
]

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
  return timeKindOptionsFor(type) // Même chose, mais overnight est géré automatiquement
}

// Détection automatique des horaires overnight
const isDetectedOvernight = computed(() => {
  if (editingDispo.value.timeKind !== 'range') return false
  if (!editingDispo.value.heure_debut || !editingDispo.value.heure_fin) return false
  
  const startTime = parseInt(editingDispo.value.heure_debut.split(':')[0])
  const endTime = parseInt(editingDispo.value.heure_fin.split(':')[0])
  
  // Si l'heure de fin est plus petite que l'heure de début, c'est une mission de nuit
  return endTime < startTime || (endTime === startTime && editingDispo.value.heure_fin < editingDispo.value.heure_debut)
})

// Fonction utilitaire pour détecter les horaires overnight  
function isOvernightTime(start?: string, end?: string): boolean {
  if (!start || !end) return false
  
  const startTime = parseInt(start.split(':')[0])
  const endTime = parseInt(end.split(':')[0])
  
  return endTime < startTime || (endTime === startTime && end < start)
}

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
const dayWidthRef = ref(124)
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
  let day = 124
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

  // Deux bornes définies: plage stricte entre a et b
  if (from && to) {
    const a = from <= to ? from : to
    const b = from <= to ? to : from
    return days.filter(d => d.date >= a && d.date <= b)
  }

  // Une seule borne définie
  if (from && !to) {
    // Comportement demandé: plage ouverte vers le futur à partir de from
    // On renvoie toutes les journées chargées >= from; l'extension à droite se fait via le scroll
    const a = from
    return days.filter(d => d.date >= a)
  }
  if (to && !from) {
    // Cas inchangé: afficher un contexte raisonnable en amont de to (7 jours déjà chargés ou plus)
    const a = addDaysStr(to, -6)
    const b = to
    return days.filter(d => d.date >= a && d.date <= b)
  }

  // Aucun filtre: toutes les journées chargées
  return days
})
const gridMinWidth = computed(() => (visibleDays.value.length * dayWidth.value) + 'px')

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
  
  // DEBUG: Log pour tracer le problème de filtrage
  console.log('🔍 [DEBUG] paginatedCollaborateurs calcul:', {
    windowedRowsLength: rows.length,
    filteredCollaborateursLength: filteredCollaborateurs.value.length,
    hasFilters: planningFilters.hasActiveFilters.value
  })
  
  // Filet de sécurité: si la fenêtre virtualisée est vide alors que des résultats existent,
  // tenter un reclamp immédiat, puis exposer un petit sous-ensemble en dernier recours.
  if (rows.length === 0 && filteredCollaborateurs.value.length > 0) {
    console.log('� [DEBUG] PROBLÈME: Fenêtre virtualisée vide mais filteredCollaborateurs non vide!')
    console.log('🔧 [DEBUG] Tentative de correction immédiate...')
    
    // SOLUTION RADICALE: Bypasser complètement la virtualisation pour le filtrage
    // Retourner directement les premiers résultats filtrés
    const directResults = filteredCollaborateurs.value.slice(0, Math.min(50, filteredCollaborateurs.value.length))
    console.log('� [DEBUG] Bypass virtualisation - retour direct:', directResults.length, 'collaborateurs')
    return directResults
  }
  
  console.log('🔍 [DEBUG] Retour windowedRows normal:', rows.length)
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

function onGridMouseMove(e: MouseEvent) {
  const target = e.target as HTMLElement
  
  // Capturer la position actuelle de la souris pour le hover après scroll
  _lastPointerX = e.clientX
  _lastPointerY = e.clientY
  
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
    const dayIndex = cellElement.getAttribute('data-day-index')
    const rowIndex = cellElement.getAttribute('data-row-index')
    
    if (dayIndex && rowIndex && planningScroll.value) {
      // Nettoyer les highlights précédents
      cleanHoverHighlights()
      
      // Highlight colonne et ligne avec early-exit si déjà appliqué
      const columnSelector = `[data-day-index="${dayIndex}"]`
      const rowSelector = `[data-row-index="${rowIndex}"]`
      const prevDay = (onGridMouseMove as any)._prevDayIndex
      const prevRow = (onGridMouseMove as any)._prevRowIndex
      if (prevDay !== dayIndex || prevRow !== rowIndex) {
        cleanHoverHighlights()
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

// Système CSS simple - plus besoin de fonctions complexes ou de variables

// Cache des éléments DOM pour performance maximale
let _domCache = {
  columnElements: new Map<number, HTMLElement[]>(),
  rowElements: new Map<number, HTMLElement[]>(),
  cacheValid: false,
  lastBuilt: 0
}

// Moteur WASM ultra-performant pour calculs de highlights
const wasmEngine = new WASMHighlightEngine()
let _wasmReady = false

// Variables pour les statistiques WASM
const wasmStats = ref({
  totalCalculations: 0,
  totalTime: 0,
  averageTime: 0,
  lastCalculationTime: 0
})

const showWasmStats = ref(false)
let wasmDemoRun = false

// (wasmPerformanceClass retiré: UI masquée)

function updateWasmStats() {
  if (wasmEngine) {
    const stats = wasmEngine.getPerformanceStats()
    if (stats) {
      wasmStats.value = {
        totalCalculations: stats.totalCalculations || 0,
        totalTime: stats.totalTime || 0,
        averageTime: stats.averageTime || 0,
        lastCalculationTime: performance.now()
      }
    }
  }
}

// (toggleWasmStats retiré: UI masquée)

async function runWasmBenchmark() {
  // console.log('🏁 Démarrage du benchmark WASM...')
  
  // Afficher les stats pendant le benchmark
  showWasmStats.value = true
  
  const iterations = 5000
  
  // Notification de début SUPPRIMÉE
  // notify({
  //   message: `🔥 Benchmark ${iterations} calculs en cours...`,
  //   color: 'info',
  //   duration: 2000,
  //   position: 'bottom-right'
  // })
  
  for (let i = 0; i < iterations; i++) {
    // Simule des positions de souris aléatoires
    const mouseX = Math.random() * 800 + 100
    const mouseY = Math.random() * 600 + 100
    wasmEngine.calculateHighlight(mouseX, mouseY)
  }
  
  // const _endTime = performance.now() // inutilisé
  // (totalTime supprimé – uniquement pour logs précédemment)
  // const avgTime = totalTime / iterations
  
  // console.log(`📊 Benchmark terminé:`)
  // console.log(`   • ${iterations} calculs en ${totalTime.toFixed(2)}ms`)
  // console.log(`   • Moyenne: ${avgTime.toFixed(6)}ms par calcul`)
  // console.log(`   • Débit: ${Math.round(iterations / (totalTime / 1000))} calculs/sec`)
  
  updateWasmStats()
  
  // Notification de fin avec résultat SUPPRIMÉE
  // const performance_level = avgTime <= 0.01 ? 'EXCELLENTE 🚀' : 
  //                          avgTime <= 0.05 ? 'TRÈS BONNE ⚡' : 'ACCEPTABLE ⚠️'
  
  // notify({
  //   message: `✅ Performance ${performance_level} - ${avgTime.toFixed(4)}ms/calcul`,
  //   color: avgTime <= 0.01 ? 'success' : avgTime <= 0.05 ? 'warning' : 'info',
  //   duration: 4000,
  //   position: 'bottom-right'
  // })
}

function invalidateDOMCache(reason?: string) {
  if (reason) {
    // console.log('🗑️ Cache DOM invalidé:', reason)
  }
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
      // console.log('🦀 Moteur WASM initialisé et prêt')
      
      // Configuration initiale
      updateWASMConfiguration()
      
      // Notification utilisateur en mode émulateur SUPPRIMÉE
      if (isEmulator) {
        setTimeout(() => {
          // notify({
          //   message: '🚀 Moteur ultra-performant activé',
          //   color: 'success',
          //   duration: 3000,
          //   position: 'bottom-right'
          // })
          
          // Demo automatique une seule fois
          if (!wasmDemoRun) {
            wasmDemoRun = true
            setTimeout(() => {
              // console.log('🔥 Lancement du benchmark initial WASM...')
              runWasmBenchmark()
            }, 2000)
          }
        }, 1000)
      }
    } else {
      console.warn('⚠️ Moteur WASM non disponible, fallback actif')
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
  
  // Mettre à jour le scroll
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
      newColumnElements.forEach(el => el.classList.add('dom-column-hovered'))
    }
  }
  
  if (rowIndex >= 0 && rowIndex !== _currentHighlightedRow) {
    const newRowElements = _domCache.rowElements.get(rowIndex)
    if (newRowElements) {
      newRowElements.forEach(el => el.classList.add('dom-row-hovered'))
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
      oldColumnElements.forEach(el => el.classList.remove('dom-column-hovered'))
    }
  }
  
  // Nettoyer l'ancienne ligne (cache DOM)
  if (_currentHighlightedRow !== rowIndex && _currentHighlightedRow >= 0) {
    const oldRowElements = _domCache.rowElements.get(_currentHighlightedRow)
    if (oldRowElements) {
      oldRowElements.forEach(el => el.classList.remove('dom-row-hovered'))
    }
  }
  
  // Ajouter la nouvelle colonne (cache DOM)
  if (columnIndex >= 0 && columnIndex !== _currentHighlightedColumn) {
    const newColumnElements = _domCache.columnElements.get(columnIndex)
    if (newColumnElements) {
      newColumnElements.forEach(el => el.classList.add('dom-column-hovered'))
    }
  }
  
  // Ajouter la nouvelle ligne (cache DOM)
  if (rowIndex >= 0 && rowIndex !== _currentHighlightedRow) {
    const newRowElements = _domCache.rowElements.get(rowIndex)
    if (newRowElements) {
      newRowElements.forEach(el => el.classList.add('dom-row-hovered'))
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

// Synchroniser les lignes de présence une fois filteredCollaborateurs déclaré
watch(filteredCollaborateurs, (list) => {
  presenceRowsRef.value = list.map(c => ({ id: c.id }))
}, { immediate: true, deep: false })

// CORRECTION: Watcher agressif pour forcer la mise à jour de la virtualisation
watch(filteredCollaborateurs, async (newList, oldList) => {
  console.log('🔍 [DEBUG] filteredCollaborateurs changé:', {
    newLength: newList.length,
    oldLength: oldList?.length,
    windowedRowsLength: windowedRows.value.length
  })
  
  // Toujours forcer le recalcul quand les données filtrées changent
  await nextTick()
  const scroller = planningScroll.value
  console.log('🔍 [DEBUG] Forcer recalcul virtualisation après changement filtrage')
  
  // CRITICAL: Toujours recalculer la fenêtre, pas seulement si elle est vide
  if (scroller) {
    // Recalcule complet (horizontal + vertical)
    recomputeWindow(scroller)
    recomputeRowWindow(scroller)
    ensureRowsVisible()
  } else {
    // Sans scroller, recalcul minimal mais complet
    recomputeWindow(null as any)
    recomputeRowWindow(null as any)
  }
  
  // Double-check: Attendre un autre tick et vérifier si windowedRows a été mis à jour
  await nextTick()
  console.log('🔍 [DEBUG] Après recalcul - windowedRows.length:', windowedRows.value.length)
  
  // Si malgré le recalcul, windowedRows est toujours vide, forcer un reset complet
  if (newList.length > 0 && windowedRows.value.length === 0) {
    console.log('🚨 [DEBUG] PROBLÈME: windowedRows vide malgré recalcul, reset complet')
    // Reset complet de la virtualisation
  rowWindowStartIndex.value = 0
  rowWindowEndIndex.value = Math.min(9, newList.length - 1) // Afficher au moins 10 éléments
  await nextTick()
  // Frame suivante pour laisser le DOM se stabiliser
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    console.log('🔧 [DEBUG] Après reset forcé - windowedRows.length:', windowedRows.value.length)
    if (windowedRows.value.length === 0) {
      // Forcer un re-render de la fenêtre des lignes
      forceRender()
    }
    
    // NOUVEAU: Si même après reset forcé ça ne marche pas, simuler un click
    if (windowedRows.value.length === 0) {
      console.log('🚨 [DEBUG] Reset forcé inefficace, simulation click automatique')
      setTimeout(async () => {
        const container = planningScroll.value || (document.querySelector('.excel-scroll') as HTMLElement | null)
        if (container) {
          container.dispatchEvent(new Event('focus'))
          // Déclenche un léger scroll programmatique pour imiter l'action utilisateur
          container.scrollTop = container.scrollTop + 1
          container.scrollTop = container.scrollTop - 1
          container.click()
          await nextTick()
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
          console.log('🔧 [DEBUG] Après click auto dans watcher - windowedRows.length:', windowedRows.value.length)
        }
      }, 50)
    }
  }
}, { immediate: false, deep: false })

// DEBUG: Watcher pour surveiller les changements de windowedRows
watch(windowedRows, (newRows, oldRows) => {
  console.log('🔍 [DEBUG] windowedRows changé:', {
    newLength: newRows.length,
    oldLength: oldRows?.length,
    filteredLength: filteredCollaborateurs.value.length
  })
}, { immediate: false, deep: false })

// CORRECTION: Watcher sur les changements de filtres pour forcer recalcul virtualisation
watch(planningFilters.filterState, async () => {
  console.log('🔍 [DEBUG] Filtres changés, recalcul virtualisation')
  await nextTick()
  
  // Force le recalcul de la virtualisation quand les filtres changent
  const scroller = planningScroll.value
  if (scroller) {
    // Recalcule complet (horizontal + vertical)
    recomputeWindow(scroller)
    recomputeRowWindow(scroller)
  } else {
    recomputeWindow(null as any)
    recomputeRowWindow(null as any)
  }
  
  await nextTick()
  console.log('🔍 [DEBUG] Après recalcul filtres - windowedRows.length:', windowedRows.value.length)
  
  // NOUVEAU: Force refresh automatique si les résultats ne s'affichent pas
  if (filteredCollaborateurs.value.length > 0 && windowedRows.value.length === 0) {
    console.log('🚨 [DEBUG] Auto-refresh nécessaire, simulation double-clic')
    // Attendre encore un peu puis forcer un refresh complet
    setTimeout(async () => {
      await nextTick()
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      if (filteredCollaborateurs.value.length > 0 && windowedRows.value.length === 0) {
        console.log('🔧 [DEBUG] Force refresh automatique')
        // Simuler un event qui force le re-render (comme le double-clic)
        const container = planningScroll.value || (document.querySelector('.excel-scroll') as HTMLElement | null)
        if (container) {
          container.dispatchEvent(new Event('focus'))
          container.scrollTop = container.scrollTop + 1
          container.scrollTop = container.scrollTop - 1
          container.click()
          await nextTick()
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
          console.log('🔧 [DEBUG] Après click automatique - windowedRows.length:', windowedRows.value.length)
        }
        if (windowedRows.value.length === 0) {
          forceRender()
        }
      }
    }, 100)
  }
}, { immediate: false, deep: true })

// Re-clamper la fenêtre virtualisée à chaque changement de la liste filtrée
const _prevFilteredCount = ref(0)
watch(filteredCollaborateurs, async (list) => {
  const scroller = planningScroll.value
  if (list.length < _prevFilteredCount.value && scroller) {
    scroller.scrollTop = 0
  }
  _prevFilteredCount.value = list.length
  await nextTick()
  try {
    if (scroller) {
      recomputeRowWindow(scroller)
    } else {
      recomputeRowWindow(null as any)
    }
  } catch {}
  ensureRowsVisible()
}, { immediate: true })

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
function cleanHoverHighlights() {
  if (!planningScroll.value) return
  
  // Nettoyer tous les data attributes de hover
  const hoveredElements = planningScroll.value.querySelectorAll('[data-column-hover], [data-row-hover]')
  hoveredElements.forEach(el => {
    el.removeAttribute('data-column-hover')
    el.removeAttribute('data-row-hover')
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
  // Sécurité: ne considérer que les éléments dont la date est bien celle de la veille
  if (d.date !== prev) continue
    const k = resolveDispoKind(d)
    if (k.timeKind === 'range' && d.heure_debut && d.heure_fin) {
      const s = toMinutes(d.heure_debut)!, e = toMinutes(d.heure_fin)!
      if (e < s) { // overnight depuis la veille vers aujourd'hui
        out.push({ ...(d as any), _cont: 'end', date })
      }
    }
    // Slots de nuit (22:00–06:00) de la veille: afficher comme continuation ce jour
    if (k.timeKind === 'slot' && Array.isArray(k.slots) && k.slots.includes('night')) {
      out.push({ ...(d as any), _cont: 'end', date })
    }
  }
  return out
}

function getCellDisposSorted(collaborateurId: string, date: string): CellDispo[] {
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
function getCellKindClass(collaborateurId: string, date: string) {
  // Utiliser les dispos enrichies de la cellule (inclut continuations de la veille)
  const list = getCellDispos(collaborateurId, date)
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
    const parts = arr.map(s => `${sharedSlotLabel(s)} (${slotRange(s)})`)
    return parts.join(' · ')
  }
  
  if (k.type === 'mission') {
    if (k.timeKind === 'slot' && k.slots?.length) {
      const lieu = dispo.lieu ? canonicalizeLieu(dispo.lieu) : ''
      const st = slotsTooltip(k.slots)
      return lieu ? `${lieu} — ${st}` : st
    }
    if ((k.timeKind === 'range' || k.timeKind === 'overnight') && dispo.heure_debut && dispo.heure_fin) {
      const lieu = dispo.lieu ? canonicalizeLieu(dispo.lieu) : ''
      return lieu ? `${lieu} ${fullTimeLabel(dispo)}` : fullTimeLabel(dispo)
    }
    return dispo.lieu ? canonicalizeLieu(dispo.lieu) : 'Mission'
  }
  
  if (k.type === 'disponible') {
    if (k.timeKind === 'slot' && k.slots?.length) {
      return slotsTooltip(k.slots)
    }
    if ((k.timeKind === 'range' || k.timeKind === 'overnight') && dispo.heure_debut && dispo.heure_fin) {
      return fullTimeLabel(dispo)
    }
    return 'Disponible'
  }
  
  if (k.type === 'indisponible') {
    return 'Indisponible'
  }
  
  return dispo.heure_debut && dispo.heure_fin ? fullTimeLabel(dispo) : ''
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
  if (!selectedCell.value) return null
  const c = filteredCollaborateurs.value.find(c => c.id === selectedCell.value!.collaborateurId)
  return c || null
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
}

function editDispo(dispo: Disponibilite | (Disponibilite & { _cont?: 'start'|'end' }), cellDate?: string) {
  const originalDate = dispo.date
  const k = resolveDispoKind(dispo as Disponibilite)
  // Si c’est une continuation venant de la veille (cellDate != originalDate), ouvrir la modale sur la date d’origine
  const targetDate = (cellDate && cellDate !== originalDate && k.timeKind === 'range') ? originalDate : (cellDate || originalDate)
  openDispoModal((dispo as any).collaborateurId || `${dispo.nom}-${dispo.prenom}`, targetDate)
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
  editingDispo.value = {
    type: 'disponible',
    timeKind: 'full-day',
    heure_debut: '09:00',
    heure_fin: '17:00',
    lieu: '',
    slots: []
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
    // Ajouter nouvelle ligne
    const temp = [...selectedCellDispos.value, newDispo]
    if (wouldConflict(temp)) {
      // const msg = getConflictMessage(temp) || 'Conflit: combinaison invalide pour cette journée.'
      // notify({ message: msg, color: 'warning', position: 'top-right', duration: 3000 })
      return
    }
    selectedCellDispos.value.push(newDispo)

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
  const after = selectedCellDispos.value.filter(d => (d as any)._cont !== 'end')

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
      
      const mapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' => {
        switch (legacyTimeKind) {
          case 'range': return 'flexible'
          case 'slot': return 'fixed'
          case 'full-day': return 'flexible'
          case 'overnight': return 'flexible'
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
        isFullDay: d.timeKind === 'full-day',
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
      
      const mapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' => {
        switch (legacyTimeKind) {
          case 'range': return 'flexible'
          case 'slot': return 'fixed'
          case 'full-day': return 'flexible'
          case 'overnight': return 'flexible'
          default: return 'flexible'
        }
      }
      
      const updatedData = {
        lieu: canonLieu || '',
        heure_debut: d.timeKind === 'range' ? (d.heure_debut || '') : '',
        heure_fin: d.timeKind === 'range' ? (d.heure_fin || '') : '',
        type: mapLegacyTypeToRTDB(d.type),
        timeKind: mapLegacyTimeKindToRTDB(d.timeKind),
        slots: Array.isArray(d.slots) ? d.slots : [],
        isFullDay: d.timeKind === 'full-day',
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

// (supprimé) Anciennes actions de formulaire séparé

// Navigation
// Gestion de recherche avec debouncing intelligent
// Réinitialiser tous les filtres
function clearAllFilters() {
  planningFilters.clearAllFilters()

  // Après réinitialisation, s'assurer que la fenêtre est recalculée
  nextTick(() => {
    const scroller = planningScroll.value
    if (scroller) {
      // Reset scroll position
      scroller.scrollTop = 0
      scroller.scrollLeft = 0
      
      // Force recalcul agressif
      recomputeWindow(scroller)
      recomputeRowWindow(scroller)
    } else {
      // Sans scroller, force quand même le recalcul
      recomputeRowWindow(null as any)
    }
    
    // Double vérification après un court délai
    setTimeout(() => {
      if (windowedRows.value.length === 0 && filteredCollaborateurs.value.length > 0) {
        if (scroller) {
          recomputeRowWindow(scroller)
        }
      }
    }, 100)
  })
}

// Navigation avec gestion des filtres
// (updateFilters supprimée – inutilisée ici, gérée par composable)

// (scrollToDate supprimée – non utilisée)

// (goToPreviousWeek supprimée – inutilisée)

function goToToday() {
  const scroller = planningScroll.value
  if (!scroller) return
  const todayIndex = loadedDays.value.findIndex(d => d.isToday)
  if (todayIndex < 0) return
  const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
  scroller.scrollTo({ left: centerOffset, behavior: 'smooth' })
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
      
      const deriveTimeKindFromData = (dispo: any): 'range' | 'slot' | 'full-day' | 'overnight' => {
        if (dispo?.slots && Array.isArray(dispo.slots) && dispo.slots.length > 0) return 'slot'
        if (dispo?.isFullDay) return 'full-day'
        const start = (dispo?.heure_debut || '').toString()
        const end = (dispo?.heure_fin || '').toString()
        if (start && end) {
          if (end < start) return 'overnight'
          return 'range'
        }
        return 'range'
      }
      
      const formatted = {
        id: dispo.id,
        collaborateurId: dispo.collaborateurId,
        date: dispo.date,
        lieu: canonLieu,
        heure_debut: dispo.heure_debut || '',
        heure_fin: dispo.heure_fin || '',
        type: mapRTDBTypeToLegacy(dispo.type),
  timeKind: deriveTimeKindFromData(dispo),
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
            timeKind: normalized ? normalized.timeKind : deriveTimeKindFromData(dispo), // ✅ DÉRIVATION CENTRALISÉE
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
    console.log(`📡 Listener RTDB déjà actif pour ${dateDebut} → ${dateFin}`)
    return
  }
  
  console.log(`📡 Démarrage listener RTDB pour ${dateDebut} → ${dateFin}`)
  
  // Démarrer le listener RTDB pour cette plage
  const listenerId = disponibilitesRTDBService.listenToDisponibilitesByDateRange(
    dateDebut, 
    dateFin,
    (disponibilites) => {
      console.log(`🔄 Mise à jour RTDB temps réel: ${disponibilites.length} disponibilités`)

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
          timeKind: normalized ? normalized.timeKind : deriveTimeKindFromData(dispo), // ✅ DÉRIVATION CENTRALISÉE
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

      console.log(`✅ Cache temps réel synchronisé: ${byDate.size} dates mises à jour`)
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
      console.log(`📡 Listener RTDB arrêté: ${listenerId}`)
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
  const collaborationStats = collaborationService.getStats()
  console.log('� Statistiques de collaboration:', collaborationStats)
  console.log('� Listeners RTDB actifs:', realtimeListeners.value.length)
  
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
 * Obtenir le nombre d'utilisateurs uniques connectés
 */
function getUniqueUsersCount(): number {
  return totalUsers.value
}

/**
 * Obtenir le nombre total de sessions connectées
 */
function getTotalSessionsCount(): number {
  return connectedUsers.value.reduce((total: number, user: DisplayUser) => total + user.sessionCount, 0)
}

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
    console.log('🚨 [EMERGENCY] Sync préférences désactivée - Mode cache local')
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
  
  console.log('🎨 Configuration synchronisation couleurs utilisateurs terminée')
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
 * Obtenir le nombre de sessions pour un utilisateur
 */
function getUserSessionCount(uid: string): number {
  return connectedUsers.value.filter((u: DisplayUser) => u.uid === uid).length
}

/**
 * Obtenir le tooltip pour un utilisateur dans le système
 */
function getUserStatusTooltip(user: DisplayUser): string {
  const sessionCount = getUserSessionCount(user.uid)
  const sessionInfo = sessionCount > 1 ? ` (${sessionCount} onglets)` : ''
  return `${user.displayName} - ${user.status}${sessionInfo}`
}

/**
 * Nettoyer les sessions expirées
 */
async function cleanupSessions() {
  try {
    // await collaborationService.cleanupExpiredSessions() // Géré automatiquement dans le nouveau système
    // console.log('🧹 Nettoyage des sessions terminé')
  } catch (error) {
    console.error('❌ Erreur nettoyage sessions:', error)
  }
}

/**
 * Obtenir le tooltip pour un utilisateur (alias)
 */
// (getUserTooltip supprimée – alias inutile)

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
    const cellId = `${selectedCell.value.collaborateurId}-${selectedCell.value.date}`
    console.log(`🔓 Tentative libération verrou pour: ${cellId}`)
    collaborationService.unlockCell(selectedCell.value.collaborateurId, selectedCell.value.date)
    console.log(`🔓 Verrou libéré pour ${cellId}`)
  }
  
  // Fermer le modal et nettoyer l'état
  showDispoModal.value = false
  selectedCell.value = null
  selectedCellDispos.value = []
  
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
  const startStr = minPastDate.value
  
  // Pour les collaborateurs, afficher plus de jours (2 mois au lieu de 2 semaines)
  const daysAhead = isCollaborateurInterface.value ? 60 : 14
  const endStr = addDaysStr(todayStr, daysAhead)
  
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
  // - Avec une borne de fin (dateTo), on n'étend pas
  // - Avec uniquement une borne de début (dateFrom), on autorise l'extension vers la droite
  const hasToBound = !!dateTo.value
  const hasFromOnly = !!dateFrom.value && !dateTo.value
  if (hasToBound) {
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

    // Décharger visuellement (cache conservé)
    prunePastIfFar(scroller)
    pruneFutureIfFar(scroller)
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
function updateHoverOnScroll(scroller: HTMLElement) {
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
 */
function triggerHoverAtCursor() {
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
      const dayIndex = cellElement.getAttribute('data-day-index')
      const rowIndex = cellElement.getAttribute('data-row-index')
      
      if (dayIndex && rowIndex) {
        // Nettoyer les highlights précédents
        cleanHoverHighlights()
        
        // Highlight toute la colonne
        const columnCells = planningScroll.value.querySelectorAll(`[data-day-index="${dayIndex}"]`)
        columnCells.forEach(cell => {
          cell.setAttribute('data-column-hover', 'true')
        })
        
        // Highlight toute la ligne
        const rowCells = planningScroll.value.querySelectorAll(`[data-row-index="${rowIndex}"]`)
        rowCells.forEach(cell => {
          cell.setAttribute('data-row-hover', 'true')
        })
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
      isWeekend: date.getDay() === 0 || date.getDay() === 6
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
      isWeekend: date.getDay() === 0 || date.getDay() === 6
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
  const monthsRow = scroller.querySelector('.excel-months-row') as HTMLElement | null
  const monthsH = monthsRow ? monthsRow.getBoundingClientRect().height : 0
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
  const cellId = `${collaborateurId}-${date}`
  
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
      
      console.log(`🔒 Interaction bloquée: cellule ${cellId} verrouillée par ${lock.userName}`)
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
      
      console.log(`📋 Interaction bloquée: cellule ${cellId} sélectionnée par ${selection.userName}`)
      return // Empêcher toute interaction
    }
  }
  
  // Si Ctrl/Cmd est maintenu (mode sélection multiple) OU mode sélection mobile activé - AUCUNE modale ne doit s'ouvrir
  if (event.ctrlKey || event.metaKey || (isMobileView.value && isSelectionMode.value)) {
    event.preventDefault()
    event.stopPropagation()
    
    console.log('=== MODE MULTISELECT - AUCUNE MODALE ===')
    console.log('Mode:', event.ctrlKey || event.metaKey ? 'DESKTOP CTRL/CMD' : 'MOBILE FAB')
    console.log('Clic sur:', cellId)
    console.log('Selection avant:', Array.from(selectedCells.value))
    
    // RESTRICTION ULTRA-STRICTE: interdire toute sélection sur un autre collaborateur
    if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
      const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
      console.log('❌ INTERDIT: Tentative de sélection sur un autre collaborateur')
      console.log('🔒 Sélection actuelle:', currentSelectedCollaborateur, '| Tentative:', collaborateurId)
      console.log('⚠️ Impossible de sélectionner des cellules sur différentes lignes de collaborateurs')
      return
    }
    
    // Toggle la sélection
    if (selectedCells.value.has(cellId)) {
      selectedCells.value.delete(cellId)
      console.log('DESELECTION de:', cellId)
    } else {
      selectedCells.value.add(cellId)
      console.log('SELECTION de:', cellId)
    }
    
    // Validation post-ajout (sécurité)
    if (!validateSingleCollaboratorSelection()) {
      console.log('❌ VALIDATION ÉCHOUÉE: Nettoyage de la sélection')
      cleanSelectionToSingleCollaborator()
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
  
  console.log('🧹 Sélection vidée')
}

// Fonction pour toggler le mode sélection sur mobile
function toggleSelectionMode() {
  isSelectionMode.value = !isSelectionMode.value
  
  // Si on sort du mode sélection MANUELLEMENT, vider les sélections
  if (!isSelectionMode.value) {
    clearSelection()
  }
  
  console.log('📱 Mode sélection mobile:', isSelectionMode.value ? 'ACTIVÉ' : 'DÉSACTIVÉ')
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
  console.log(`🧹 Sélection nettoyée: gardé ${validCells.size} cellules pour ${currentCollaborateur}`)
}

// Vérifier si on peut ajouter une cellule à la sélection sans violer la règle du collaborateur unique
function canAddCellToSelection(collaborateurId: string): boolean {
  console.log('🔍 canAddCellToSelection appelée:', {
    collaborateurId,
    tailleSélection: selectedCells.value.size,
    sélectionActuelle: Array.from(selectedCells.value)
  })
  
  if (selectedCells.value.size === 0) {
    console.log('✅ canAddCellToSelection: sélection vide, autoriser')
    return true
  }
  
  const currentCollaborateur = getCurrentSelectedCollaborateur()
  const canAdd = currentCollaborateur === collaborateurId
  
  console.log('🔍 canAddCellToSelection résultat:', {
    collaborateurActuel: currentCollaborateur,
    collaborateurDemandé: collaborateurId,
    peutAjouter: canAdd
  })
  
  return canAdd
}

// Gestion du clic-glisser pour la sélection multiple
function handleCellMouseDown(collaborateurId: string, date: string, event: MouseEvent) {
  console.log('🖱️ MouseDown sur cellule:', collaborateurId, date, 'Ctrl/Cmd:', event.ctrlKey || event.metaKey)
  
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    
    // VALIDATION ULTRA-STRICTE: Aucune sélection multi-collaborateur autorisée
    if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
      console.log('❌ DRAG IMPOSSIBLE: Tentative de drag sur un autre collaborateur bloquée')
      console.log('� Sélection actuelle:', getCurrentSelectedCollaborateur(), '| Tentative:', collaborateurId)
      console.log('⚠️ Le drag ne peut pas traverser différentes lignes de collaborateurs')
      return
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
    
    // VALIDATION POST-AJOUT (sécurité supplémentaire)
    if (!validateSingleCollaboratorSelection()) {
      console.log('❌ VALIDATION DRAG ÉCHOUÉE: Nettoyage de la sélection')
      cleanSelectionToSingleCollaborator()
    }
    
    selectedCells.value = new Set(selectedCells.value)
    console.log('🖱️ Début drag sélection sur:', cellId)
  }
}

function handleCellMouseEnter(collaborateurId: string, date: string) {
  // Éviter de propager les survols pendant le scroll rapide
  if (isScrollingFast.value) return
  // Debounce minimal au niveau composant pour éviter du spam si la souris frôle
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer)
    hoverDebounceTimer = null
  }
  hoverDebounceTimer = setTimeout(() => {
    // Gérer le survol collaboratif
    handleCellHover(collaborateurId, date)
  }, 100)

  
  if (isDraggingSelection.value) {
    const cellId = `${collaborateurId}-${date}`
    
    // VALIDATION ULTRA-STRICTE: Bloquer immédiatement toute tentative de changement de collaborateur
    const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
    console.log('📋 Comparaison:', {current: currentSelectedCollaborateur, nouveau: collaborateurId})
    if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
      console.log('❌ DRAG ENTER INTERDIT: Changement de collaborateur détecté, arrêt du drag')
      isDraggingSelection.value = false
      dragStartCell.value = null
      return
    }
    
    // Ajouter à la sélection pendant le glissement
    if (!selectedCells.value.has(cellId)) {
      selectedCells.value.add(cellId)
      // Validation post-ajout (sécurité)
      if (!validateSingleCollaboratorSelection()) {
        console.log('❌ VALIDATION DRAG ENTER ÉCHOUÉE: Nettoyage de la sélection')
        cleanSelectionToSingleCollaborator()
      }
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
    
    // VALIDATION FINALE: S'assurer que la sélection respecte les règles
    if (!validateSingleCollaboratorSelection()) {
      console.log('❌ VALIDATION FINALE ÉCHOUÉE: Nettoyage de la sélection')
      cleanSelectionToSingleCollaborator()
    }
    
    // En vue collaborateur, sortir explicitement du mode sélection pour éviter de bloquer l'ouverture de modale
    if (isCollaborateurInterface.value && !canAccessAdminFeatures.value) {
      isSelectionMode.value = false
    }

    console.log('🏁 Fin drag sélection')
  }
}

// Gestionnaire global pour arrêter le glissement si on sort de la zone
function handleGlobalMouseUp() {
  if (isDraggingSelection.value) {
    isDraggingSelection.value = false
    dragStartCell.value = null
    console.log('🖱️ Sélection par glisser interrompue')
    
    // Si on est en mode collaborateur, on vide aussi la sélection par sécurité
    if (isCollaborateurInterface.value) {
      selectedCells.value.clear()
      console.log('🚫 Mode collaborateur: sélection vidée par sécurité')
    }
  }
}

// Gestionnaire pour nettoyer le hover quand la souris sort de la fenêtre
function handleWindowMouseLeave() {
  collaborationService.onMouseLeaveWindow()
}

// Gestion de la création par lot
async function handleBatchCreate(data: any) {
  // Lot créé
  
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
    // Refresh automatique après batch (sans vider le cache)
    await refreshDisponibilites(false) // false = ne pas vider le cache
    
    // Nettoyer les données temporaires après que les vraies soient arrivées
    setTimeout(() => {
      console.log('🧹 Nettoyage des données temporaires...')
      cleanupTemporaryData(data.dates)
    }, 1000)
  }, 500)
}

// Nettoyer les données temporaires (IDs commençant par "temp-")
function cleanupTemporaryData(dates: string[]) {
  let cleanedCount = 0
  
  dates.forEach(date => {
    const existingDispos = disponibilitesCache.value.get(date) || []
    const cleanedDispos = existingDispos.filter(d => {
      const isTemp = d.id?.startsWith('temp-')
      if (isTemp) {
        cleanedCount++
        console.log(`🧹 Suppression donnée temporaire: ${d.prenom} ${d.nom} le ${date} (ID: ${d.id})`)
      }
      return !isTemp
    })
    
    if (cleanedDispos.length !== existingDispos.length) {
      disponibilitesCache.value.set(date, cleanedDispos)
    }
  })
  
  if (cleanedCount > 0) {
    // Données temporaires nettoyées
  }
}

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
      console.log('📤 Vidage du cache disponibilités...')
      disponibilitesCache.value.clear()
      
      // Reset de l'état de chargement des ranges
      // Reset des ranges chargées
      loadedDateRanges.value = []
    } else {
      console.log('💾 Conservation du cache existant pour sync en arrière-plan...')
    }
    
    // Recharger les données pour la période visible
    console.log(`📊 visibleDays.value.length: ${visibleDays.value.length}`)
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
    // Chercher d'abord dans la liste centralisée/filtrée (source fiable affichée)
    const fromFiltered = filteredCollaborateurs.value.find(c => c.id === collaborateurId)
    if (fromFiltered) return fromFiltered
    // Fallback sur la liste locale si nécessaire
    const fromLocal = collaborateurs.value.find(c => c.id === collaborateurId)
    if (fromLocal) return fromLocal
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
    
    // Mettre à jour aussi dans la modale si elle est ouverte
    if (collaborateurInfoModal.value.collaborateur?.id === collaborateur.id) {
      collaborateurInfoModal.value.collaborateur.note = notes
      collaborateurInfoModal.value.collaborateur.notes = notes // Compatibilité
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
  // Trigger manuel pour forcer la réactivité du filtrage
  console.log('🔍 [DEBUG] Fin d\'initialisation - collaborateurs filtrés:', filteredCollaborateurs.value.length)
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
  
  // Exposer globalement pour le debug
  if (typeof window !== 'undefined') {
    ;(window as any).collaborationService = collaborationService
    // Migration RTDB: realtimeSync obsolète
    
    // Exposer les fonctions de debug du cache DOM
    ;(window as any).testDOMCache = function() {
      console.log('🧪 Test cache DOM:')
      console.log('Cache valide:', _domCache.cacheValid)
      console.log('Colonnes en cache:', _domCache.columnElements.size)
      console.log('Lignes en cache:', _domCache.rowElements.size)
      console.log('Dernière construction:', new Date(_domCache.lastBuilt))
    }
    
    ;(window as any).benchmarkHighlight = function(iterations = 100) {
      console.log('🏃‍♂️ Benchmark highlighting avec', iterations, 'itérations')
      
      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        const col = Math.floor(Math.random() * visibleDays.value.length)
        const row = Math.floor(Math.random() * paginatedCollaborateurs.value.length)
        updateHighlightWithDOMCache(col, row)
      }
      const end = performance.now()
      
      console.log(`⚡ ${iterations} highlights en ${end - start}ms`)
      console.log(`⚡ Performance: ${((end - start) / iterations).toFixed(2)}ms par highlight`)
      return (end - start) / iterations
    }
    
    ;(window as any).rebuildCache = function() {
      invalidateDOMCache('Test manuel')
      buildDOMCache()
      console.log('🔄 Cache DOM reconstruit')
    }
    
    // Fonction de test pour le verrouillage
    ;(window as any).testLock = function(collaborateurId: string, date: string) {
      console.log('🧪 Test lock pour:', collaborateurId, date)
      if (collaborationService) {
        console.log('📊 État avant lock:')
        console.log('- SessionId:', (collaborationService as any).sessionId?.slice(-6))
        console.log('- isCellLocked:', collaborationService.isCellLocked(collaborateurId, date))
        console.log('- getCellLock:', collaborationService.getCellLock(collaborateurId, date))
        
        collaborationService.lockCellForEditing(collaborateurId, date).then(() => {
          console.log('📊 État après lock:')
          console.log('- isCellLocked:', collaborationService.isCellLocked(collaborateurId, date))
          console.log('- getCellLock:', collaborationService.getCellLock(collaborateurId, date))
        })
      }
    }
    
    ;(window as any).testUnlock = function(collaborateurId: string, date: string) {
      console.log('🧪 Test unlock pour:', collaborateurId, date)
      if (collaborationService) {
        collaborationService.unlockCell(collaborateurId, date)
        console.log('📊 État après unlock:')
        console.log('- isCellLocked:', collaborationService.isCellLocked(collaborateurId, date))
        console.log('- getCellLock:', collaborationService.getCellLock(collaborateurId, date))
      }
    }
    
    // Fonction de test pour le hover
    ;(window as any).testHover = function(collaborateurId: string, date: string) {
      console.log('🧪 Test hover pour:', collaborateurId, date)
      if (collaborationService) {
        console.log('📊 État avant hover:')
        console.log('- getHoveringUsers:', collaborationService.getHoveringUsers(collaborateurId, date))
        
        collaborationService.updateHoveredCell(collaborateurId, date)
        
        setTimeout(() => {
          console.log('📊 État après hover (500ms):')
          console.log('- getHoveringUsers:', collaborationService.getHoveringUsers(collaborateurId, date))
        }, 500)
      }
    }
    
    // Test diagnostique des classes CSS
    ;(window as any).testCellClasses = function(collaborateurId: string, date: string) {
      const cellSelector = `[data-day-date="${date}"]`
      const cells = document.querySelectorAll(cellSelector)
      const cell = Array.from(cells).find(el => {
        const row = el.closest('.excel-row')
        return row?.getAttribute('data-collaborateur-id') === collaborateurId
      })
      
      if (cell) {
        console.log('🎨 Classes CSS pour', collaborateurId, date, ':', cell.className)
        console.log('🎨 Computed styles background:', window.getComputedStyle(cell).backgroundColor)
        return {
          element: cell,
          classes: cell.className,
          hasIndicator: cell.classList.contains('has-indicator'),
          hasPresence: cell.classList.contains('has-presence'),
          locked: cell.classList.contains('locked')
        }
      } else {
        console.log('❌ Cellule non trouvée pour', collaborateurId, date)
        return null
      }
    }
    
    // Test de force pour ajouter les classes CSS à une cellule
    ;(window as any).forceTestClasses = function(collaborateurId?: string, date?: string) {
      const targetCollab = collaborateurId || paginatedCollaborateurs.value[0]?.id
      const targetDate = date || visibleDays.value[0]?.date
      
      if (!targetCollab || !targetDate) {
        console.log('❌ Pas de collaborateur ou date disponible')
        return
      }
      
      const cellSelector = `[data-day-date="${targetDate}"]`
      const cells = document.querySelectorAll(cellSelector)
      const cell = Array.from(cells).find(el => {
        const row = el.closest('.excel-row')
        return row?.getAttribute('data-collaborateur-id') === targetCollab
      }) as HTMLElement
      
      if (cell) {
        cell.classList.add('has-indicator', 'has-presence')
        // Classes forcées
        console.log('🎨 Classes actuelles:', cell.className)
        return cell
      } else {
        console.log('❌ Cellule non trouvée pour', targetCollab, targetDate)
        return null
      }
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
    console.log('🚀 Chargement initial avec sync temps réel...')
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
      console.log('🔧 Auto-correction overnight missions désactivée pendant migration RTDB')
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

// Watchers pour invalidation du cache DOM
watch([visibleDays, paginatedCollaborateurs], () => {
  clearAllHighlights() // Nettoyer d'abord
  invalidateDOMCache('Structure du planning modifiée')
  // Reconstruire le cache après un court délai
  setTimeout(buildDOMCache, 50)
  // Mettre à jour la configuration WASM
  updateWASMConfiguration()
}, { immediate: false })

// Watcher spécifique pour mettre à jour le moteur WASM
watch([visibleDays, paginatedCollaborateurs], () => {
  if (_wasmReady) {
    updateWASMConfiguration()
  }
}, { immediate: false })

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  
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

// Quand la liste des collaborateurs filtrés change (ex: passe de 0 à 1),
// forcer le recalcul de la fenêtre de lignes avec l'élément scroller.
watch(() => filteredCollaborateurs.value.length, (_newLength, _oldLength) => {
  nextTick(() => {
    const scroller = planningScroll.value
    if (scroller) {
  // const maxScrollTop = Math.max(0, contentHeight - scroller.clientHeight) // non utilisé
      
      // Reset agressif pour garantir une fenêtre valide
      scroller.scrollTop = 0

      // Recalculer la fenêtre de lignes et jours
      recomputeRowWindow(scroller)
      recomputeWindow(scroller)
    } else {
      // Même sans scroller, affiche au moins la première ligne
      recomputeRowWindow(null as any)
    }
  })
}, { immediate: false })

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
    console.log(`🔍 Filtre collaborateur mis à jour: "${searchTerm.value}"`)
  }
}, { immediate: true })

// Watchers pour optimisation des filtres
watch(allCollaborateurs, () => {
  // Nettoyer le cache lors du changement des collaborateurs (géré par le composable)
  console.log('🔄 Collaborateurs mis à jour, recalcul des filtres')
}, { deep: true })

// Quand les filtres structurants changent, clamp le scroll vertical et recompute
watch([filterMetier, filterStatut, filterLieu, dateFrom, dateTo], () => {
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

// Quand le tableau filtré change (même si la longueur est identique),
// re-clamper le scroll vertical et recalculer la fenêtre de lignes.
watch(filteredCollaborateurs, () => {
  nextTick(() => {
    const scroller = planningScroll.value
    if (scroller) {
  // Réinitialisation simple et fiable
  scroller.scrollTop = 0
      recomputeRowWindow(scroller)
      // Un petit recalcul horizontal pour synchroniser les conteneurs
      recomputeWindow(scroller)
    } else {
      recomputeRowWindow(null as any)
    }
  ensureRowsVisible()
  })
}, { deep: false })

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

// Quand l'état busy se termine, vérifier que des lignes s'affichent
watch(isBusy, (busy) => {
  if (!busy) nextTick(() => ensureRowsVisible())
}, { immediate: true })

// Watcher pour nettoyer le timer de debounce au démontage
onUnmounted(() => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
})

// Watcher pour les préférences utilisateur - mettre à jour les couleurs automatiquement
watch(() => preferences.value.presenceColor, (newColor) => {
  if (newColor && auth.currentUser) {
    console.log('🎨 Couleur de préférence changée:', newColor)
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
    console.log('👤 Utilisateur changé, chargement des préférences...')
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
    // Force une mise à jour complète toutes les 10 itérations (2 secondes)
    if (forceUpdateCounter >= 10) {
      forceUpdateCounter = 0
      hoveredCells.value = new Set() // Force le changement
      lockedCells.value = new Set()
    }
    updatePresenceSets()
  }, 200) // Équilibre optimal : pas trop rapide pour l'envoi, assez rapide pour la réception
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

    window.addEventListener('touchmove', onSingleMove)
    window.addEventListener('touchend', onSingleEnd)
    window.addEventListener('touchcancel', onSingleEnd)
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
/* ========================================
   MODALE DE CHARGEMENT MODERNE - PLEIN ÉCRAN
   ======================================== */

/* Modale de chargement moderne */
.modern-loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(23, 37, 84, 0.95), rgba(90, 103, 216, 0.95));
  padding: 20px;
}

.loading-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 60px 40px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.2),
    0 8px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: slideIn 0.6s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.loading-header {
  margin-bottom: 40px;
}

.loading-title {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1a237e, #5a67d8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 16px 0 8px 0;
  letter-spacing: -0.02em;
}

.loading-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 500;
  margin: 0;
}

.loading-content {
  margin-bottom: 40px;
}

.loading-spinner-container {
  margin-bottom: 32px;
  position: relative;
}

.loading-spinner-container::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e3f2fd, #f8f9ff);
  z-index: -1;
}

.loading-status {
  margin-bottom: 32px;
}

.status-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #334155;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.progress-container {
  position: relative;
}

.progress-text {
  font-size: 0.9rem;
  color: #64748b;
  margin-top: 12px;
  font-weight: 600;
}

.loading-footer {
  padding-top: 24px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.loading-tip {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-style: italic;
}

/* Responsive */
@media (max-width: 640px) {
  .loading-card {
    padding: 40px 24px;
    margin: 20px;
  }
  
  .loading-title {
    font-size: 2rem;
  }
  
  .loading-subtitle {
    font-size: 1rem;
  }
}

.loading-progress {
  margin-top: 24px;
}

.progress-text {
  display: block;
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ========================================
   PLACEHOLDER DE CHARGEMENT INITIAL
   ======================================== */
.initial-loading-placeholder {
  padding: 20px;
  background: #f8fafc;
  min-height: 600px;
  animation: pulse 1.5s ease-in-out infinite;
}

.placeholder-header {
  margin-bottom: 24px;
}

.placeholder-title {
  height: 28px;
  width: 300px;
  background: #e2e8f0;
  border-radius: 8px;
  margin-bottom: 12px;
}

.placeholder-subtitle {
  height: 18px;
  width: 200px;
  background: #f1f5f9;
  border-radius: 6px;
}

.placeholder-content {
  display: flex;
  gap: 20px;
}

.placeholder-sidebar {
  width: 260px;
  flex-shrink: 0;
}

.placeholder-collaborateur {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
}

.placeholder-avatar {
  width: 40px;
  height: 40px;
  background: #e2e8f0;
  border-radius: 50%;
}

.placeholder-name {
  height: 16px;
  width: 120px;
  background: #f1f5f9;
  border-radius: 4px;
}

.placeholder-grid {
  flex: 1;
  overflow: hidden;
}

.placeholder-days-header {
  display: flex;
  gap: 1px;
  margin-bottom: 8px;
}

.placeholder-day {
  width: 100px;
  height: 60px;
  background: #e2e8f0;
  border-radius: 6px;
}

.placeholder-rows {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.placeholder-row {
  display: flex;
  gap: 1px;
}

.placeholder-cell {
  width: 100px;
  height: 50px;
  background: #f1f5f9;
  border-radius: 4px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* ========================================
   STYLES EXISTANTS
   ======================================== */
/* Modal design mobile-first (style unifié) */
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
  font-size: 16px; /* réduit de 18px à 16px */
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 4px 0;
  text-transform: capitalize; /* première lettre de chaque mot en majuscule */
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
  color: var(--va-dark);
}

.time-input {
  width: 100%;
  min-width: 120px;
}

.custom-time-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-separator {
  font-weight: bold;
  font-size: 16px;
  color: var(--va-dark);
  margin: 0 2px;
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

/* ========================================
   STYLES DE L'INTERFACE PRINCIPALE
   ======================================== */

/* Indicateur des filtres actifs */
.active-filters-indicator {
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-bottom: 1px solid #e1bee7;
  padding: 8px 0;
  transition: all 0.3s ease;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.indicator-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #6a1b9a;
  font-size: 14px;
  font-weight: 500;
}

.indicator-content .material-icons {
  font-size: 16px;
  color: #9c27b0;
}

.filter-type {
  background: #9c27b0;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.perf-indicator {
  background: #4caf50;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-family: monospace;
  font-weight: 600;
}

.perf-indicator.slow {
  background: #ff9800;
}

.filtering-indicator {
  display: flex;
  align-items: center;
}

.filtering-indicator .material-icons {
  font-size: 14px;
  color: #9c27b0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

/* Indicateur de scroll rapide */
.fast-scroll-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background: linear-gradient(135deg, var(--va-primary), color-mix(in srgb, var(--va-primary) 80%, var(--va-info)));
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: fastScrollPulse 1.5s ease-in-out infinite;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.fast-scroll-indicator .buffer-info {
  font-size: 10px;
  opacity: 0.9;
  font-weight: 400;
}

@keyframes fastScrollPulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
}

/* Indicateur DOM Cache (mode dev) */
.dom-cache-indicator {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  border: 1px solid #1d4ed8;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

.dom-cache-indicator:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* Stats de virtualisation (mode dev) */
.virtualization-stats {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  color: #10b981;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid #10b981;
  transition: all 0.3s ease;
}

.virtualization-stats:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.05);
}

.virtualization-stats .stats-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.virtualization-stats .stats-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(16, 185, 129, 0.3);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;
  color: #a7f3d0;
}

/* Stats moteur WASM ultra-performant */
.wasm-stats {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.wasm-stats:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.wasm-stats .stats-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.wasm-stats .performance-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

/* Etat vide quand aucun collaborateur ne correspond aux filtres */
.empty-state { display: flex; justify-content: center; margin-top: 24px; }
.empty-card {
  background: var(--dark-card);
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
.empty-icon { color: var(--dark-text-secondary); }
.empty-title { color: var(--dark-text-primary); font-weight: 700; }
.empty-sub { color: var(--dark-text-secondary); }

.wasm-stats .performance-indicator.excellent {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.wasm-stats .performance-indicator.good {
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
}

.wasm-stats .performance-indicator.acceptable {
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

.wasm-stats .stats-details {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
}

.wasm-stats .benchmark-btn {
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wasm-stats .benchmark-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.wasm-stats .shortcuts {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
}

.wasm-stats .shortcuts small {
  opacity: 0.8;
  font-size: 10px;
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

.realtime-badge {
  position: fixed;
  top: 20px;
  left: 200px;
  z-index: 1000;
  background: #1e40af;
  color: #dbeafe;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid #3b82f6;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.realtime-badge:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.listeners-count {
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  margin-left: 6px;
}

/* Badge présence utilisateurs */
.users-presence-badge {
  position: fixed;
  top: 20px;
  left: 380px;
  z-index: 1000;
  background: #059669;
  color: #d1fae5;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid #10b981;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.users-avatars {
  display: flex;
  gap: 4px;
}

.user-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #10b981;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  border: 1px solid #065f46;
  position: relative;
}

.user-avatar.multi-session {
  border: 2px solid #f59e0b;
  box-shadow: 0 0 0 1px #fbbf24;
}

.multi-tab-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #f59e0b;
  color: white;
  border-radius: 50%;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  border: 1px solid #d97706;
}

.sessions-count {
  font-size: 10px;
  opacity: 0.8;
  margin-left: 4px;
}

.user-avatar.more-users {
  background: #047857;
  font-size: 8px;
}

/* Indicateurs de survol collaboratifs dans les cellules */
.cell-hover-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  pointer-events: none;
  z-index: 4000; /* Au-dessus de la grille et overlays potentiels */
  transition: all 0.3s ease;
  opacity: 0.9;
}

/* Mode édition : plus grand et plus visible */
.cell-hover-indicator.editing-mode {
  width: 40px;
  height: 40px;
  z-index: 4005; /* légèrement au-dessus */
  opacity: 1;
}

.cell-hover-indicator.editing-mode .hover-pulse {
  border-width: 4px;
  animation: pulseEditing 1.5s infinite ease-in-out;
}

.cell-hover-indicator.editing-mode .hover-user-name {
  width: 30px;
  height: 30px;
  font-size: 14px;
  border-width: 3px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.hover-pulse {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 3px solid var(--user-color, #3b82f6);
  border-radius: 50%;
  background: var(--user-color, #3b82f6);
  opacity: 0.3;
  animation: pulseHover 2s infinite ease-in-out;
  transition: all 0.3s ease;
}

.hover-user-name {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: var(--user-color, #3b82f6);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  z-index: 11;
  animation: hoverPersist 3s infinite ease-in-out;
  pointer-events: none;
  /* Forcer priorité sur styles globaux */
  background: var(--user-color, #3b82f6) !important;
}

/* Animation de persistance pour les indicateurs de survol */
@keyframes hoverPersist {
  0%, 90% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  95% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.editing-lock-icon {
  font-size: 12px !important;
  color: white;
  animation: lockBounce 0.5s ease-out;
}

/* Animation d'apparition du cadenas */
@keyframes lockBounce {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Animation du pulse améliorée */
@keyframes pulseHover {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.2; 
  }
  50% { 
    transform: scale(1.4);
    opacity: 0.05; 
  }
}

/* Animation spéciale pour le mode édition */
@keyframes pulseEditing {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.3;
    border-color: var(--user-color, #ef4444);
  }
  50% { 
    transform: scale(1.3);
    opacity: 0.1;
    border-color: #ef4444;
  }
}

.cursor-label::before {
  content: '';
  position: absolute;
  top: -3px;
  left: 4px;
  width: 0;
  height: 0;
  border-left: 3px solid transparent;
  border-right: 3px solid transparent;
  border-bottom: 3px solid var(--user-color, #3b82f6);
}

/* Indicateurs d'édition active */
.active-editing-indicators {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editing-indicator {
  background: var(--user-color, #3b82f6);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  animation: pulse-edit 2s infinite;
}

@keyframes pulse-edit {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.editing-user {
  font-weight: 500;
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
  /* IMPORTANT: forcer le rendu immédiat des lignes pour éviter l'écran vide après filtrage */
  content-visibility: visible; /* au lieu de auto: certains navigateurs ne peignent pas après transform */
  /* supprimer les contain qui peuvent empêcher le paint correct lorsqu'on translate le conteneur */
  contain: none;
  contain-intrinsic-size: auto; /* ne pas réserver artificiellement la hauteur */
}

.excel-months-row, .excel-days-row {
  contain: layout paint;
}

.days-window {
  display: inline-flex;
  will-change: transform;
}

.rows-window {
  display: block;
  will-change: transform;
}

/* S'assurer que la fenêtre de lignes est rendue et visible (pas de clipping caché) */
.rows-window {
  position: relative;
  visibility: visible;
  opacity: 1;
  contain: none;
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

/* Colonne sticky collaborateurs : largeur fortement réduite */
.excel-corner {
  width: var(--sticky-left, 190px);
  min-width: var(--sticky-left, 190px);
  flex: 0 0 var(--sticky-left, 190px);
  background: #f5f5f5;
  padding: 6px 10px; /* Aligné avec collaborateur-content: 6px 10px */
  border-right: 1px solid #e5e7eb; /* Même bordure que collab-sticky */
  box-shadow: 
    2px 0 8px rgba(0,0,0,0.06),
    inset -1px 0 0 rgba(255,255,255,0.8); /* Même shadow que collab-sticky */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  left: 0;
  top: 0;
  z-index: 153; /* au-dessus des éléments du header */
  box-sizing: border-box; /* S'assurer que padding/border sont inclus dans width */
}

.excel-corner .today-btn {
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 3px 5px; /* encore plus compact */
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px; /* plus petit */
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  width: 100%;
  justify-content: center;
  letter-spacing: -0.01em;
}

@media (min-width: 1600px) {
  .excel-corner { width: var(--sticky-left, 210px); min-width: var(--sticky-left, 210px); flex:0 0 var(--sticky-left, 210px); }
  .excel-corner .today-btn { font-size:11px; padding:4px 6px; }
}
@media (max-width: 1300px) and (min-width: 1000px) {
  .excel-corner { width: var(--sticky-left, 180px); min-width: var(--sticky-left, 180px); flex:0 0 var(--sticky-left, 180px); }
}
@media (max-width: 999px) and (min-width: 769px) {
  .excel-corner { width: var(--sticky-left, 175px); min-width: var(--sticky-left, 175px); flex:0 0 var(--sticky-left, 175px); }
  .excel-corner .today-btn { font-size:9.5px; }
}

.excel-corner .today-btn:hover {
  background: #2563EB;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.excel-corner .today-btn .material-icons {
  font-size: 14px; /* Réduit de 16px → 14px */
}

.excel-corner .corner-separator {
  width: 80%;
  height: 1px;
  background: #ddd;
  margin: 4px 0;
}

.excel-corner .corner-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

/* Ancien système overlay supprimé - remplacé par CSS pur */

/* Overlay "aujourd'hui" pour l'en-tête */
.today-overlay-header {
  position: absolute;
  top: 0;
  left: calc(var(--grid-left-header, var(--sticky-left, 220px)) + var(--today-x-local, -9999px));
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
  font-size: 12px; /* Réduit de 14px → 12px */
  color: #333;
}

.corner-count {
  font-size: 10px; /* Réduit de 12px → 10px */
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

/* Highlight de la colonne du jour - CSS pur avec attribut data */
.excel-day-cell[data-today="true"] {
  background: #e3f2fd !important;
  font-weight: 600;
  /* Effet visuel plus marqué pour le jour actuel */
  box-shadow: inset 0 0 0 2px rgba(33, 150, 243, 0.3);
}

.excel-day-cell.today {
  background: #e8f4fd; /* Bleu très clair au lieu de #1976d2 */
  color: #1565c0; /* Texte bleu foncé au lieu de blanc */
  font-weight: 700; /* Garde le poids de police */
  border: 1px solid #bbdefb; /* Bordure discrète */
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
  left: var(--grid-left-body, var(--sticky-left, 220px)); /* origine mesurée, repli sticky */
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden; /* empêche de recouvrir la colonne sticky en rognant à gauche */
  z-index: 20; /* Au-dessus des cellules (z-index 1), sous les overlays */
}

/* Ancien système overlay supprimé - remplacé par CSS pur */

/* Ancien système overlay supprimé - remplacé par CSS pur */

/* === HIGHLIGHTS ULTRA-PERFORMANTS (DOM direct) === */

/* Highlight de colonne via DOM direct (plus rapide que Vue) */
.dom-column-hovered {
  background-color: rgba(76, 175, 80, 0.12) !important;
}

/* Highlight de ligne via DOM direct (plus rapide que Vue) */
.dom-row-hovered {
  background-color: rgba(76, 175, 80, 0.16) !important;
}

/* === HIGHLIGHTS TRADITIONNELS (Vue) === */

/* Highlight de colonne survolée - CSS pur avec hover rapide */
/* SYSTÈME CROISEMENT PARFAIT : ligne + colonne comme la date du jour */

/* Hover sur cellule individuelle - point de croisement */
.excel-scroll:not(.panning):not(.loading) .excel-cell:hover {
  background-color: rgba(76, 175, 80, 0.32) !important;
  position: relative;
  z-index: 5; /* Minimum nécessaire */
  border: 1px solid rgba(76, 175, 80, 0.5) !important;
  will-change: background-color; /* Optimisation GPU ciblée */
  transform: translate3d(0, 0, 0); /* Force l'accélération GPU */
}

/* Hover de colonne complète (en-têtes + cellules) */
[data-column-hover="true"] {
  background-color: rgba(76, 175, 80, 0.2) !important;
  z-index: 3 !important; /* Minimum pour rester au-dessus */
  position: relative;
  will-change: background-color;
  transform: translate3d(0, 0, 0); /* Force l'accélération GPU */
}

/* Hover de ligne complète */
[data-row-hover="true"] {
  background-color: rgba(76, 175, 80, 0.2) !important;
  z-index: 3 !important; /* Minimum pour rester au-dessus */
  position: relative;
  will-change: background-color;
  transform: translate3d(0, 0, 0); /* Force l'accélération GPU */
}

/* Croisement : cellule qui a les deux attributs (point central) */
[data-column-hover="true"][data-row-hover="true"] {
  background-color: rgba(76, 175, 80, 0.38) !important;
  border: 2px solid rgba(76, 175, 80, 0.8) !important;
  z-index: 35 !important; /* Plus haut que les cartes */
  position: relative;
}

/* Style spécial pour l'en-tête de colonne survolée */
.excel-day-cell[data-column-hover="true"] {
  background-color: rgba(76, 175, 80, 0.25) !important;
  font-weight: 600;
  border-bottom: 3px solid rgba(76, 175, 80, 0.8) !important;
  z-index: 32 !important; /* Plus haut que les cartes */
  position: relative;
}

/* Plus besoin des pseudo-éléments, on a le vrai croisement */

/* Suppression explicite du highlight sur la colonne collaborateurs */
.collab-sticky.row-hovered {
  background-color: #f9f9f9 !important; /* Garder le fond normal */
}

/* Highlight de la colonne "aujourd'hui" */
.excel-day-cell.today-column,
.excel-cell.today-column {
  background-color: rgba(25, 118, 210, 0.22) !important;
  z-index: 3; /* Minimum nécessaire */
  position: relative;
  will-change: background-color; /* Optimisation GPU */
}

/* Combinaisons de highlights */
.excel-cell.column-hovered.row-hovered,
.dom-column-hovered.dom-row-hovered {
  background-color: rgba(76, 175, 80, 0.25) !important;
}

/* Combinaisons avec la colonne du jour - système data-today */
.excel-cell[data-today="true"][data-column-hover="true"] {
  background-color: rgba(25, 118, 210, 0.28) !important;
  z-index: 6 !important; /* Juste au-dessus des autres hover */
  position: relative;
  will-change: background-color;
}

.excel-cell[data-today="true"][data-row-hover="true"] {
  background-color: rgba(25, 118, 210, 0.25) !important;
  z-index: 6 !important; /* Juste au-dessus des autres hover */
  position: relative;
  will-change: background-color;
}

/* Masquer les anciens overlays (plus utilisés) */
/* Overlays désactivés - utilisation CSS pur uniquement */
/*
.today-overlay-header,
.today-overlay,
.today-overlay-left,
.column-hover-overlay-header,
.column-hover-overlay,
.row-hover-overlay {
  display: none !important;
}
*/

/* === STYLES EXISTANTS === */
/* Anciens overlays supprimés - CSS pur utilisé à la place
.today-overlay {
  position: absolute;
  top: 0;
  left: var(--today-x-local, -9999px);
  width: var(--day-width, 100px);
  bottom: 0;
  pointer-events: none;
  background: rgba(33, 150, 243, 0.18);
  z-index: 40;
  will-change: left;
}
.today-overlay-left {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--sticky-left, 220px);
  height: 100%;
  pointer-events: none;
  background: transparent;
  box-shadow: inset calc(var(--today-x-local, -9999px)) 0 0 0 rgba(33, 150, 243, 0.18);
*/

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

/* === BARRE DE COULEUR COLLABORATEUR === */
.collaborateur-color-bar {
  width: 4px;
  min-width: 4px;
  background: var(--collaborateur-color, #6366f1);
  flex-shrink: 0;
  border-radius: 0 2px 2px 0;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
}

/* === CONTENU COLLABORATEUR HORIZONTAL === */
.collaborateur-content {
  flex: 1;
  padding: 6px 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 0;
  position: relative;
  background: #ffffff;
  /* border-left supprimée car collab-sticky a déjà border-right */
}

/* === PARTIE GAUCHE: INFOS === */
.collaborateur-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px; /* Augmenté de 2px → 3px pour plus d'espace */
  min-width: 0;
}

.collaborateur-nom-complet {
  display: flex;
  flex-direction: column;
  gap: 2px; /* Augmenté de 1px → 2px pour plus d'espace */
  line-height: 1.2; /* Augmenté de 1.1 → 1.2 */
  overflow: hidden;
}

.collaborateur-nom-complet .nom {
  font-weight: 600;
  font-size: 12px; /* Réduit encore pour colonne plus compacte */
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.02em; /* Condensé pour plus de caractères */
}

.collaborateur-nom-complet .prenom {
  font-weight: 500; /* Augmenté de 400 → 500 */
  font-size: 11px; /* Réduit encore pour colonne plus compacte */
  color: #374151; /* Couleur plus foncée pour meilleur contraste */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.02em; /* Condensé pour plus de caractères */
}

.collaborateur-nom-complet.clickable-name {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
  margin: -2px -4px;
}

.collaborateur-nom-complet.clickable-name:hover {
  background-color: #f3f4f6;
}

.collaborateur-nom-complet.clickable-name:hover .nom {
  color: #111827;
}

.collaborateur-nom-complet.clickable-name:hover .prenom {
  color: #111827;
}

.collaborateur-metier {
  background: #eef2ff; /* Couleur plus douce et lisible */
  color: #374151; /* Texte plus foncé pour meilleur contraste */
  border: 1px solid #c7d2fe; /* Bordure plus douce */
  padding: 1px 4px; /* Padding très compact */
  border-radius: 3px; /* Coins plus petits */
  font-size: 9px; /* Très petit pour économiser l'espace */
  font-weight: 600; /* Augmenté de 500 → 600 */
  line-height: 1.1;
  max-width: fit-content;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px; /* Petit espacement avec le nom */
}

/* === PARTIE DROITE: ACTIONS === */
.collaborateur-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

.collaborateur-actions .contact-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  background: none;
  border: none;
  color: #6b7280;
  text-decoration: none;
  transition: all 0.15s ease;
  flex-shrink: 0;
  padding: 2px;
}

.collaborateur-actions .contact-icon:hover {
  color: #374151;
  transform: scale(1.1);
}

.collaborateur-actions .contact-icon .va-icon {
  width: 14px !important;
  height: 14px !important;
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
  width: var(--sticky-left, 220px);
  min-width: var(--sticky-left, 220px);
  flex: 0 0 var(--sticky-left, 220px); /* ne pas rétrécir/allonger, fixe */
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  box-shadow: 
    2px 0 8px rgba(0,0,0,0.06),
    inset -1px 0 0 rgba(255,255,255,0.8);
  isolation: isolate; /* créer un nouveau contexte de stacking local */
  /* Performance optimisée */
  will-change: auto;
  
  /* Design moderne harmonisé avec les cellules */
  transition: box-shadow 0.2s ease;
  display: flex;
  overflow: hidden; /* Éviter tout débordement */
  box-sizing: border-box; /* S'assurer que padding/border sont inclus dans width */
}

.collab-sticky:hover {
  box-shadow: 
    3px 0 12px rgba(0,0,0,0.1),
    inset -1px 0 0 rgba(255,255,255,0.9);
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
  z-index: 1; /* Contexte de base pour les cellules - sous les hover */
  cursor: pointer;
  /* Optimisations performance globales */
  will-change: auto; /* Pas de will-change par défaut, seulement au hover */
  transform: translate3d(0, 0, 0); /* Force GPU layer pour consistance */
  contain: layout style; /* Conteneur isolé pour limiter recalculs */
  /* Pas de transforms ici pour fiabiliser sticky */
  transition: none !important;
}

/* ==========================================
   DESIGN ÉLÉGANT - COULEURS VUESTIC + ICÔNES MATERIAL
   ========================================== */

/* Cellules verrouillées - Style warning (ambre/orange) */
.excel-cell.locked {
  position: relative;
  background: color-mix(in srgb, var(--va-warning) 15%, var(--va-background-element)) !important;
  border: 2px solid var(--va-warning) !important;
  box-shadow: 
    0 2px 8px color-mix(in srgb, var(--va-warning) 25%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  transition: all 0.2s ease;
  cursor: not-allowed !important;
  pointer-events: none !important; /* ESSENTIEL: empêcher les clics */
}

.excel-cell.locked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 9;
}

.excel-cell.locked::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ed6c02'%3E%3Cpath d='M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 1;
  z-index: 10;
  pointer-events: none;
}

/* Cellules avec présence (hover) - Couleur dynamique de l'utilisateur */
.excel-cell.has-presence {
  position: relative;
  background: color-mix(in srgb, var(--hovering-user-color, var(--va-primary)) 20%, var(--va-background-element)) !important;
  border: 2px solid var(--hovering-user-color, var(--va-primary)) !important;
  box-shadow: 
    0 0 20px color-mix(in srgb, var(--hovering-user-color, var(--va-primary)) 30%, transparent),
    0 2px 8px color-mix(in srgb, var(--hovering-user-color, var(--va-primary)) 25%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  animation: presencePulse 2s infinite ease-in-out;
  transition: all 0.3s ease;
}

.excel-cell.has-presence[data-initials]:not([data-initials=""])::after {
  /* Afficher les initiales via l'attribut data-initials seulement si non vide */
  content: attr(data-initials);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: var(--hovering-user-color, var(--va-primary));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.9);
  z-index: 10;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: initialsAppear 0.3s ease-out;
}

/* Transition vers lock pour les cellules avec initiales */
.excel-cell.has-presence.has-initials-locked::after {
  background: var(--va-warning);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 0 3px color-mix(in srgb, var(--va-warning) 20%, transparent);
  animation: lockTransition 0.5s ease-out;
}

/* Style pour les initiales injectées dynamiquement */
.presence-initials {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: var(--hovering-user-color, var(--va-primary));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.9);
  z-index: 10;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: initialsAppear 0.3s ease-out;
}

/* Animation d'apparition des initiales - simplifiée pour éviter les conflits */
@keyframes initialsAppear {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

/* Style pour les initiales quand la cellule passe en mode lock */
.presence-initials.locked-transition {
  background: var(--va-warning);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 0 3px color-mix(in srgb, var(--va-warning) 20%, transparent);
  animation: lockTransition 0.5s ease-out;
}

/* Animation de transition vers le lock */
@keyframes lockTransition {
  0% {
    background: var(--hovering-user-color, var(--va-primary));
    transform: translate(-50%, -50%) scale(1);
  }
  30% {
    transform: translate(-50%, -50%) scale(0.8);
  }
  60% {
    background: var(--va-warning);
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    background: var(--va-warning);
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Style pour l'overlay du cadenas (pour cohérence avec les initiales) */
.cell-lock-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  background: var(--va-warning);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 0 3px color-mix(in srgb, var(--va-warning) 20%, transparent);
  border: 2px solid rgba(255, 255, 255, 0.95);
  z-index: 15;
  animation: lockAppear 0.4s ease-out;
}

.cell-lock-overlay .lock-icon {
  font-size: 12px !important;
  color: white;
  animation: lockBounce 0.5s ease-out;
}

/* Animation d'apparition du cadenas */
@keyframes lockAppear {
  0% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

/* Animation subtile pour la présence - Couleur dynamique de l'utilisateur */
@keyframes presencePulse {
  0%, 100% {
    box-shadow: 
      0 0 15px color-mix(in srgb, var(--hovering-user-color, var(--va-primary)) 25%, transparent),
      0 2px 8px color-mix(in srgb, var(--hovering-user-color, var(--va-primary)) 20%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow: 
      0 0 25px color-mix(in srgb, var(--hovering-user-color, var(--va-primary)) 40%, transparent),
      0 4px 12px color-mix(in srgb, var(--hovering-user-color, var(--va-primary)) 30%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
}

/* Indicateur générique moins visible pour ne pas interferer */
.excel-cell.has-indicator:not(.locked):not(.has-presence) {
  outline: 1px solid color-mix(in srgb, var(--user-indicator-color, var(--va-primary)) 30%, transparent);
  outline-offset: -1px;
  background: color-mix(in srgb, var(--user-indicator-color, var(--va-primary)) 5%, var(--va-background-element)) !important;
}

/* Interactions avec la souris pour les cellules normales - Performance optimisée */
.excel-cell:not(.locked):not(.has-presence):hover {
  background: color-mix(in srgb, var(--user-indicator-color, var(--va-primary)) 8%, var(--va-background-element)) !important;
  /* Optimisations GPU et performance */
  will-change: background-color, transform;
  transform: translate3d(0, 0, 0) scale(1.02);
  /* Conteneur isolé pour limiter les recalculs */
  contain: layout style paint;
  /* Suppression des transitions pour un hover instantané */
}

/* Effet de survol sur cellules avec présence - Performance optimisée */
.excel-cell.has-presence:hover {
  /* Optimisations GPU pour des hover instantanés */
  will-change: transform, box-shadow;
  transform: translate3d(0, 0, 0) scale(1.05);
  box-shadow: 
    0 0 30px color-mix(in srgb, var(--user-indicator-color, var(--va-primary)) 45%, transparent),
    0 4px 16px color-mix(in srgb, var(--user-indicator-color, var(--va-primary)) 35%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
  /* Conteneur isolé pour optimiser les calculs */
  contain: layout style paint;
}

/* Animation d'apparition pour nouvelles présences */
@keyframes presenceAppear {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.excel-cell.has-presence {
  /* Garder seulement l'animation de pulsation, pas l'animation d'apparition */
  animation: presencePulse 2s infinite ease-in-out;
}

/* Mode sombre - les couleurs CSS Vuestic s'adaptent automatiquement */
@media (prefers-color-scheme: dark) {
  .excel-cell.locked::after,
  .excel-cell.has-presence::after {
    filter: brightness(1.2) contrast(1.1);
  }
}

/* Cellule sélectionnée pour la sélection par lot */
.excel-cell.selected {
  background-color: rgba(59, 130, 246, 0.15);
  border: 2px solid #3b82f6;
  box-shadow: inset 0 0 0 1px #3b82f6;
}

/* Cellules en chargement - affichage moderne et informatif */
.excel-cell.loading-placeholder {
  background: linear-gradient(
    90deg,
    var(--va-background-element) 25%,
    color-mix(in srgb, var(--va-background-element) 85%, var(--va-primary)) 50%,
    var(--va-background-element) 75%
  );
  background-size: 400% 100%;
  animation: loadingShimmer 1.8s ease-in-out infinite;
  border: 1px solid color-mix(in srgb, var(--va-primary) 20%, transparent);
  position: relative;
  cursor: wait;
}

.excel-cell.loading-placeholder::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border: 2px solid color-mix(in srgb, var(--va-primary) 30%, transparent);
  border-top: 2px solid var(--va-primary);
  border-radius: 50%;
  animation: loadingSpinner 1s linear infinite;
}

.excel-cell.loading-placeholder::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 6px;
  height: 6px;
  background: color-mix(in srgb, var(--va-primary) 60%, transparent);
  border-radius: 50%;
  animation: loadingPulse 1.5s ease-in-out infinite;
}

/* Animation shimmer pour loading */
@keyframes loadingShimmer {
  0% { background-position: -400% 0; }
  100% { background-position: 400% 0; }
}

/* Animation spinner pour loading */
@keyframes loadingSpinner {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Animation pulse pour indicateur loading */
@keyframes loadingPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* Mode scroll rapide - loading encore plus visible */
.excel-scroll.fast-scrolling .excel-cell.loading-placeholder {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--va-primary) 15%, var(--va-background-element)) 25%,
    color-mix(in srgb, var(--va-primary) 25%, var(--va-background-element)) 50%,
    color-mix(in srgb, var(--va-primary) 15%, var(--va-background-element)) 75%
  );
  animation: loadingShimmer 1.2s ease-in-out infinite;
}

.excel-scroll.fast-scrolling .excel-cell.loading-placeholder::before {
  border-width: 3px;
  width: 16px;
  height: 16px;
  animation: loadingSpinner 0.8s linear infinite;
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

/* Cellule sélectionnée avec initiales de présence */
.excel-cell.selected[data-initials]::after {
  content: attr(data-initials);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: var(--hovering-user-color, var(--va-primary));
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  font-size: 10px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: initialsAppear 0.3s ease-out;
}

/* Cellule sélectionnée avec initiales en mode lock */
.excel-cell.selected[data-initials].has-initials-locked::after {
  background: var(--va-warning);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 0 3px color-mix(in srgb, var(--va-warning) 20%, transparent);
  animation: lockTransition 0.5s ease-out;
}

/* Effet hover pour les cellules pendant la sélection - Performance optimisée */
.excel-cell:hover {
  background-color: rgba(59, 130, 246, 0.06);
  z-index: 5; /* Minimum nécessaire */
  position: relative;
  /* Optimisations GPU */
  will-change: background-color;
  transform: translate3d(0, 0, 0);
  contain: layout style paint;
}

.excel-cell.selected:hover {
  background-color: rgba(59, 130, 246, 0.15);
}

/* Mode sélection : curseur crosshair */
body.selection-mode .excel-cell {
  cursor: crosshair !important;
}

body.selection-mode .excel-cell:hover {
  background-color: rgba(59, 130, 246, 0.08) !important;
  border: 1px dashed #3b82f6;
  z-index: 5; /* Minimum nécessaire */
  position: relative;
  will-change: background-color, border-color;
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

/* Highlight de la colonne du jour - CSS pur avec attribut data */
.excel-cell[data-today="true"] {
  background: #e3f2fd !important;
  /* Bordure subtile pour marquer la colonne */
  box-shadow: inset 2px 0 0 0 rgba(33, 150, 243, 0.4), inset -2px 0 0 0 rgba(33, 150, 243, 0.4);
}

.excel-cell.today {
  background: #e8f4fd;
  color: #1565c0;
  font-weight: 600;
  z-index: 3; /* Minimum nécessaire */
  position: relative;
  will-change: background-color;
}

.excel-cell.has-dispos { background: #f8f8f8; }
/* Rendu coloré par type (état antérieur) */
.excel-cell.cell-dispo { background: #f3faf4; }
.excel-cell.cell-mission { background: #f3f7ff; }
.excel-cell.cell-indispo { background: #fdf3f3; }
.excel-cell.cell-empty { background: #ffffff; }

/* ==========================================
   NOUVEAU DESIGN DES CELLULES - CARTES COMPACTES
   ========================================== */

.dispo-bars {
  width: 100%;
  padding: 3px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: stretch;
  height: 100%;
  pointer-events: auto;
  position: relative;
  z-index: 1; /* Bas z-index pour ne pas cacher les hover */
}

/* ============ CARTES DE DISPONIBILITÉ ============ */

.dispo-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.15s ease;
  height: 100%; /* Prendre toute la hauteur disponible */
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  z-index: 10; /* Sous les effets de hover (21-25) */
}

/* Types de cartes avec couleurs distinctes */
.dispo-card-mission {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-color: #2563eb;
  color: white;
}

.dispo-card-disponible {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #047857;
  color: white;
}

.dispo-card-indisponible {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: #b91c1c;
  color: white;
}

/* Header avec indicateur de type et overnight */
.dispo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 14px;
  margin-bottom: 2px;
}

.dispo-type-icon {
  opacity: 0.9;
  flex-shrink: 0;
}

.overnight-indicator {
  font-size: 10px;
  opacity: 0.8;
  font-weight: bold;
}

/* Contenu principal de la carte */
.dispo-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}

.dispo-time-range {
  font-weight: 600;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dispo-time-full {
  font-weight: 500;
  font-size: 9px;
  opacity: 0.9;
}

.dispo-slots {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.slot-tag {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 0 3px;
  font-size: 8px;
  line-height: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.slot-more {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 0 2px;
  font-size: 7px;
  line-height: 10px;
  font-weight: bold;
  opacity: 0.8;
}

/* Footer avec lieu */
.dispo-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 10px;
  margin-top: 1px;
}

.dispo-lieu {
  font-size: 7px;
  opacity: 0.8;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

/* États des cartes */
.dispo-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.dispo-card-mission:hover {
  box-shadow: 0 3px 8px rgba(59, 130, 246, 0.3);
}

.dispo-card-disponible:hover {
  box-shadow: 0 3px 8px rgba(16, 185, 129, 0.3);
}

.dispo-card-indisponible:hover {
  box-shadow: 0 3px 8px rgba(239, 68, 68, 0.3);
}

/* Gestion de l'empilement - max 3 cartes */
.dispo-bars.single .dispo-card {
  height: 100%; /* Prendre toute la hauteur de la cellule */
  font-size: 11px;
  justify-content: space-between; /* Distribuer le contenu sur toute la hauteur */
}

.dispo-bars.single .dispo-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dispo-bars.single .dispo-time-range {
  font-size: 12px;
  font-weight: 600;
}

.dispo-bars.multi .dispo-card {
  min-height: 24px;
  max-height: 28px;
  font-size: 9px;
}

.dispo-bars.multi .dispo-time-range {
  font-size: 9px;
}

/* Cas spécial: 2 disponibilités remplissent toute la cellule */
.dispo-bars.dual .dispo-card {
  height: calc(50% - 1px); /* 50% de la hauteur moins l'espacement */
  min-height: 30px;
  font-size: 10px;
  justify-content: space-between;
}

.dispo-bars.dual .dispo-time-range {
  font-size: 10px;
  font-weight: 500;
}

/* Continuation overnight - indicateurs visuels */
.dispo-card.cont-from-prev {
  border-left: 3px solid rgba(255, 255, 255, 0.6);
  padding-left: 4px;
}

.dispo-card.cont-to-next {
  border-right: 3px solid rgba(255, 255, 255, 0.6);
  padding-right: 4px;
}

/* ============ BOUTON D'AJOUT AMÉLIORÉ ============ */

.dispo-add-card {
  width: 100%;
  height: 100%;
  min-height: 40px;
  border: 2px dashed #d1d5db;
  background: rgba(250, 251, 252, 0.4); /* Garde la transparence */
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 8px;
  cursor: pointer;
  /* Suppression complète des transitions pour performance max */
}

.add-icon {
  opacity: 0.7;
}

.add-text {
  font-size: 9px;
  font-weight: 500;
  opacity: 0.8;
}

.dispo-add-card:hover {
  background: rgba(243, 244, 246, 0.6); /* Garde la transparence */
  border-color: #3b82f6;
  color: #3b82f6;
}

.dispo-add-card:hover .add-icon,
.dispo-add-card:hover .add-text {
  opacity: 1;
}

/* Mode dragging */
.dispo-add-card.dragging-mode {
  opacity: 0.4;
  cursor: crosshair;
  border-color: #d1d5db;
  background: #fafbfc;
  color: #6b7280;
}

.dispo-add-card.dragging-mode:hover {
  opacity: 0.4;
  border-color: #d1d5db;
  background: #fafbfc;
  color: #6b7280;
}

/* ============ ANCIEN DESIGN (gardé pour compatibilité) ============ */

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

/* Ancien style .dispo-add désactivé - remplacé par .dispo-add-card */
/*
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

.dispo-add.dragging-mode {
  opacity: 0.4;
  cursor: crosshair;
}

.dispo-add.dragging-mode:hover {
  background: transparent;
  border-color: #d9d9d9;
  color: #9ca3af;
  opacity: 0.4;
}
*/

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
  padding: 6px 10px;
  margin-bottom: 12px;
  font-size: 10px;
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

.batch-action-fab .fab-content {
  display: flex;
  align-items: center;
}

.go-to-today-fab {
  position: fixed;
  top: 180px;
  left: 20px;
  z-index: 1000;
  background: white;
  padding: 4px;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
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

@media (max-width: 768px), (max-height: 500px) and (orientation: landscape) {
  .batch-action-fab {
    bottom: 80px; /* Au-dessus de la navigation mobile éventuelle */
    right: 10px;
    left: 10px;
    justify-content: center;
  }
  
  .go-to-today-fab {
    top: 140px;
    left: 10px;
  }

  /* Amélioration du bouton Aujourd'hui sur mobile */
  .excel-corner .today-btn {
    padding: 6px 8px; /* Réduit de 8px 10px → 6px 8px */
    font-size: 11px; /* Réduit de 12px → 11px */
    min-height: 32px; /* Réduit de 36px → 32px */
    border-radius: 4px; /* Réduit de 6px → 4px */
  }
  
  .excel-corner .today-btn .material-icons {
    font-size: 12px; /* Réduit de 14px → 12px */
  }
  
  /* Corner plus compact sur mobile */
  .excel-corner {
  width: var(--sticky-left, 220px);
  min-width: var(--sticky-left, 220px);
  flex: 0 0 var(--sticky-left, 220px);
    padding: 4px 5px; /* Même padding que collaborateur-content sur mobile */
  }
  
  /* Header plus compact sur mobile */
  .planning-header {
    position: sticky;
    top: 0;
    z-index: 200;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  font-size: 16px; /* réduit de 18px à 16px */
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 4px 0;
  text-transform: capitalize; /* première lettre de chaque mot en majuscule */
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

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Système de statut centralisé */
.system-status-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--va-background-secondary);
  border-radius: 8px;
  font-size: 12px;
  color: var(--va-text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.synced {
  background: #10b981;
  animation: pulse 2s infinite;
}

.status-indicator.users {
  background: #3b82f6;
}

.status-indicator.emulator {
  background: #f59e0b;
}

.mini-avatars {
  display: flex;
  gap: 2px;
  margin-left: 4px;
}

.mini-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--va-primary);
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.mini-avatar.more {
  background: #6b7280;
  font-size: 8px;
}

/* Avatars utilisateurs actifs sur le planning */
.active-user-avatars {
  display: flex;
  gap: 2px;
  margin-left: 4px;
}

.active-user-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--va-primary);
  color: white;
  font-size: 9px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 
    0 2px 6px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
}

.active-user-avatar:hover {
  transform: scale(1.1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 0 2px var(--va-primary);
}

.active-user-avatar.more {
  background: #6b7280;
  font-size: 8px;
}

/* Styles pour distinguer les différents status */
.status-item.active-users .active-user-avatar {
  animation: subtlePulse 2s infinite ease-in-out;
}

@keyframes subtlePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* Thème clair pour les collaborateurs */
.collaborateur-light-theme {
  background: #ffffff !important;
  min-height: 100vh;
}

.collaborateur-light-theme .planning-container {
  background: #ffffff !important;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.collaborateur-light-theme .filters-header {
  background: #fafafa !important;
  border-bottom: 1px solid #e5e7eb;
  backdrop-filter: none;
}

.collaborateur-light-theme .grid-container {
  background: #ffffff !important;
}

.collaborateur-light-theme .collaborateur-row {
  background: #fafafa !important;
  border-bottom: 1px solid #e5e7eb;
}

.collaborateur-light-theme .collaborateur-row:hover {
  background: #f3f4f6 !important;
}

.collaborateur-light-theme .time-header-cell,
.collaborateur-light-theme .corner-cell {
  background: #f9fafb !important;
  border-right: 1px solid #e5e7eb;
  color: #374151 !important;
}

.collaborateur-light-theme .grid-cell {
  border-right: 1px solid #f3f4f6;
  background: #ffffff !important;
}

.collaborateur-light-theme .grid-cell:hover {
  background: #f8fafc !important;
}

.collaborateur-light-theme .dispo-item {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
  border: 1px solid #bfdbfe;
  color: #1e40af !important;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
}

.collaborateur-light-theme .dispo-item:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

/* Navigation plus claire pour collaborateurs */
.collaborateur-light-theme .va-sidebar {
  background: #ffffff !important;
  border-right: 1px solid #e5e7eb !important;
}

.collaborateur-light-theme .va-sidebar-item {
  color: #374151 !important;
}

.collaborateur-light-theme .va-sidebar-item:hover {
  background: #f3f4f6 !important;
}

.collaborateur-light-theme .va-sidebar-item.router-link-active {
  background: #eff6ff !important;
  color: #2563eb !important;
}

/* =================================================
   AFFICHAGE UNIFORME DES CELLULES
   ================================================= */

/* Contenu unifié des cartes de disponibilité */
.dispo-unified-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
}

.dispo-main-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dispo-type-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.dispo-temporal {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overnight-symbol {
  flex-shrink: 0;
  font-size: 8px;
  opacity: 0.8;
  font-weight: bold;
}

/* Styles pour les cellules multiples - empilage vertical */
.dispo-bars.multi {
  gap: 1px !important;
  flex-direction: column !important;
}

.dispo-bars.multi .dispo-card {
  min-height: 18px !important;
  max-height: 20px !important;
  border-radius: 3px !important;
}

.dispo-bars.multi .dispo-main-info {
  font-size: 8px !important;
  gap: 2px !important;
}

.dispo-bars.multi .dispo-type-icon {
  font-size: 8px !important;
}

.dispo-bars.multi .overnight-symbol {
  font-size: 7px !important;
}

/* Styles pour une seule disponibilité - plus grand */
.dispo-bars.single .dispo-main-info {
  font-size: 10px;
  gap: 5px;
}

.dispo-bars.single .dispo-type-icon {
  font-size: 12px !important;
}

/* =================================================
   AMÉLIORATION AFFICHAGE CELLULES MULTIPLES
   ================================================= */

/* Plusieurs barres: affichage en colonne pour plus de clarté */
.dispo-bars.multi {
  gap: 2px !important;
  flex-direction: column !important;
}

/* Styles améliorés pour les cartes multiples */
.dispo-bars.multi .dispo-card {
  min-height: 20px !important;
  max-height: 22px !important;
  font-size: 8px !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
}

.dispo-bars.multi .dispo-content {
  padding: 0 !important;
}

.dispo-bars.multi .dispo-time-range {
  font-size: 8px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
}

.dispo-bars.multi .dispo-time-full {
  font-size: 7px !important;
  font-weight: 500 !important;
  line-height: 1 !important;
}

.dispo-bars.multi .dispo-header {
  padding: 0 !important;
  margin-bottom: 1px !important;
}

.dispo-bars.multi .dispo-type-icon {
  font-size: 8px !important;
}

.dispo-bars.multi .slot-tag {
  font-size: 6px !important;
  padding: 0 2px !important;
  line-height: 10px !important;
}

.dispo-bars.multi .slot-more {
  font-size: 6px !important;
}

.dispo-bars.multi .dispo-footer {
  display: none !important; /* Masquer le lieu en mode multi pour économiser l'espace */
}

/* =================================================
   OPTIMISATIONS MOBILE POUR INFORMATIONS COLLABORATEURS
   ================================================= */

/* Styles spécifiques mobile pour améliorer la lisibilité */
@media (max-width: 640px), (max-height: 500px) and (orientation: landscape) {
  .collaborateur-content {
    padding: 4px 5px; /* Padding très compact pour colonne étroite */
  }
  
  .collaborateur-nom-complet .nom {
    font-size: 12px !important; /* Compact mais lisible */
    font-weight: 700 !important; /* Plus gras pour meilleur contraste */
  }
  
  .collaborateur-nom-complet .prenom {
    font-size: 11px !important; /* Compact mais lisible */
    font-weight: 600 !important; /* Plus gras pour meilleur contraste */
  }
  
  .collaborateur-metier {
    font-size: 9px !important; /* Très compact */
    padding: 1px 3px !important; /* Padding minimal */
    font-weight: 700 !important; /* Plus gras */
    background: #ddd6fe !important; /* Couleur plus contrastée */
    color: #1f2937 !important; /* Texte plus foncé */
  }
  
  .collaborateur-actions .contact-icon {
    width: 16px !important; /* Très compact */
    height: 16px !important;
    font-size: 12px !important;
  }
}

/* Encore plus d'optimisations pour très petits écrans */
@media (max-width: 430px) {
  .collaborateur-nom-complet .nom {
    font-size: 11px !important; /* Maximum compacité sur iPhone */
  }
  
  .collaborateur-nom-complet .prenom {
    font-size: 10px !important; /* Maximum compacité sur iPhone */
  }
  
  .collaborateur-metier {
    font-size: 8px !important; /* Ultra compact sur iPhone */
    padding: 1px 2px !important;
  }
  
  /* Hauteur des lignes optimisée pour le nouvel équilibre ultra-compact */
  .collab-sticky {
    min-height: 58px;
  }
}

/* FAB Mode Sélection Mobile */
.selection-mode-fab {
  position: fixed;
  bottom: 20px;
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
}

@keyframes fabSlideIn {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Optimisations spécifiques mode paysage mobile */
@media (max-height: 500px) and (orientation: landscape) {
  .planning-header {
    padding: 4px 8px !important; /* Réduire la hauteur du header */
  }
  
  .excel-corner {
    padding: 2px 4px !important; /* Ultra-compact en paysage */
  }
  
  .excel-corner .today-btn {
    padding: 3px 5px !important;
    font-size: 10px !important;
    min-height: 26px !important;
  }
  
  .corner-title {
    font-size: 10px !important;
  }
  
  .corner-count {
    font-size: 8px !important;
  }
  
  .collaborateur-content {
    padding: 2px 4px !important; /* Ultra-compact en paysage */
  }
  
  .collab-sticky {
    min-height: 45px !important; /* Réduire hauteur des lignes */
  }
}

/* Fin des styles */
</style>
