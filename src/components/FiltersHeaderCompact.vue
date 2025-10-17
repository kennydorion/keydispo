<template>
  <header class="planning-header-compact">
    <!-- En-tête avec titre -->
    <div class="header-top">
      <div class="header-brand">
        <span class="material-icons brand-icon">calendar_month</span>
        <div class="brand-content">
          <h1 class="brand-title">Planning Admin</h1>
          <p class="brand-subtitle">Gestion des disponibilités</p>
        </div>
      </div>
      
      <!-- Toggle mobile -->
      <button 
        v-if="isMobile" 
        class="filters-toggle"
        @click="toggleFilters"
      >
        <span class="material-icons">{{ filtersCollapsed ? 'expand_more' : 'expand_less' }}</span>
        {{ filtersCollapsed ? 'Filtres' : 'Masquer' }}
        <span v-if="hasActiveFilters" class="badge">{{ activeFiltersCount }}</span>
      </button>
    </div>

    <!-- Panel de filtres -->
    <div 
      v-show="!isMobile || !filtersCollapsed"
      class="filters-panel"
    >
      <!-- Recherche collaborateur avec suggestions -->
      <div class="search-section">
        <div class="search-wrapper">
          <span class="material-icons search-icon">search</span>
          <input 
            v-model="planningFilters.filterState.search"
            type="text"
            placeholder="Rechercher un collaborateur..."
            class="search-input"
            @input="onSearchInput"
            @focus="onSearchFocus"
            @blur="onSearchBlur"
          />
          <button 
            v-if="planningFilters.filterState.search"
            @click="clearSearch"
            class="search-clear"
            type="button"
            aria-label="Effacer la recherche"
          >
            <span class="material-icons">close</span>
          </button>
        </div>
        
        <!-- Suggestions -->
        <div 
          v-if="planningFilters.showSuggestions.value && planningFilters.searchSuggestions.value.length > 0"
          class="suggestions-dropdown"
          role="listbox"
          aria-label="Suggestions de recherche"
        >
          <div 
            v-for="suggestion in planningFilters.searchSuggestions.value"
            :key="`${suggestion.type}-${suggestion.value}`"
            @click="selectSuggestion(suggestion)"
            @keydown.enter="selectSuggestion(suggestion)"
            @keydown.space.prevent="selectSuggestion(suggestion)"
            class="suggestion-item"
            role="option"
            tabindex="0"
            :aria-selected="false"
          >
            <span class="material-icons">{{ suggestion.icon }}</span>
            <span>{{ suggestion.text }}</span>
          </div>
        </div>
      </div>

      <!-- Filtres en ligne -->
      <div class="filters-row">
        <!-- Date de début -->
        <div class="filter-group">
          <label class="filter-label">
            <span class="material-icons">event</span>
            Date début
          </label>
          <VDatePicker
            v-model="dateStart"
            locale="fr"
            :popover="{ visibility: 'click' }"
            mode="date"
          >
            <template #default="{ togglePopover }">
              <div class="date-input-wrapper" @click="togglePopover">
                <input
                  :value="dateStart ? formatSingleDate(dateStart) : ''"
                  placeholder="Date de début"
                  class="date-input"
                  readonly
                />
                <span class="material-icons date-icon">calendar_today</span>
                <button
                  v-if="dateStart"
                  @click.stop="clearDateStart"
                  class="date-clear"
                  type="button"
                  aria-label="Effacer la date de début"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>
            </template>
          </VDatePicker>
        </div>

        <!-- Date de fin -->
        <div class="filter-group">
          <label class="filter-label">
            <span class="material-icons">event</span>
            Date fin
          </label>
          <VDatePicker
            v-model="dateEnd"
            locale="fr"
            :popover="{ visibility: 'click' }"
            mode="date"
          >
            <template #default="{ togglePopover }">
              <div class="date-input-wrapper" @click="togglePopover">
                <input
                  :value="dateEnd ? formatSingleDate(dateEnd) : ''"
                  placeholder="Date de fin"
                  class="date-input"
                  readonly
                />
                <span class="material-icons date-icon">calendar_today</span>
                <button
                  v-if="dateEnd"
                  @click.stop="clearDateEnd"
                  class="date-clear"
                  type="button"
                  aria-label="Effacer la date de fin"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>
            </template>
          </VDatePicker>
        </div>

        <!-- Métier -->
        <div class="filter-group">
          <label class="filter-label" for="filter-metier">
            <span class="material-icons">work_outline</span>
            Métier
          </label>
          <select 
            id="filter-metier"
            v-model="planningFilters.filterState.metier"
            class="filter-select-native"
            aria-label="Filtrer par métier"
          >
            <option value="">Tous</option>
            <option 
              v-for="option in planningFilters.metiersOptions.value"
              :key="option.value"
              :value="option.value"
            >
              {{ option.text }}
            </option>
          </select>
        </div>

        <!-- Statut -->
        <div class="filter-group">
          <label class="filter-label" for="filter-statut">
            <span class="material-icons">info_outline</span>
            Statut
          </label>
          <select 
            id="filter-statut"
            v-model="planningFilters.filterState.statut"
            class="filter-select-native"
            aria-label="Filtrer par statut"
          >
            <option value="">Tous</option>
            <option 
              v-for="option in planningFilters.statutsOptions.value"
              :key="option.value"
              :value="option.value"
            >
              {{ option.text }}
            </option>
          </select>
        </div>

        <!-- Lieu -->
        <div class="filter-group">
          <label class="filter-label" for="filter-lieu">
            <span class="material-icons">place</span>
            Lieu
          </label>
          <select 
            id="filter-lieu"
            v-model="planningFilters.filterState.lieu"
            class="filter-select-native"
            aria-label="Filtrer par lieu"
          >
            <option value="">Tous</option>
            <option 
              v-for="option in planningFilters.lieuxOptions.value"
              :key="option.value"
              :value="option.value"
            >
              {{ option.text }}
            </option>
          </select>
        </div>
      </div>

      <!-- Chips des filtres actifs -->
      <div v-if="activeFilterChips.length" class="filter-chips">
        <div 
          v-for="chip in activeFilterChips" 
          :key="chip.key"
          class="filter-chip"
        >
          <span class="material-icons">{{ chip.icon }}</span>
          <span>{{ chip.label }}</span>
          <button 
            @click="chip.onClear()" 
            class="chip-remove"
            type="button"
            :aria-label="`Retirer le filtre ${chip.label}`"
          >
            <span class="material-icons">close</span>
          </button>
        </div>
        <button 
          v-if="activeFilterChips.length > 1"
          @click="clearAllFilters"
          class="clear-all-btn"
          type="button"
          aria-label="Effacer tous les filtres"
        >
          Tout effacer
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { DatePicker as VDatePicker } from 'v-calendar'
import { usePlanningFilters } from '@/composables/usePlanningFilters'
import { toDateStr } from '@/utils/dateHelpers'

// Props & Emits
defineEmits<{
  'update:viewMode': [mode: 'semaine' | 'mois' | 'jour']
  openMobileFilters: []
  prev: []
  today: []
  next: []
}>()

// Composables
const planningFilters = usePlanningFilters()

// État mobile
const isMobile = ref(false)
const filtersCollapsed = ref(false)

const checkMobile = () => {
  const w = window.innerWidth
  isMobile.value = w <= 768
  if (!isMobile.value) {
    filtersCollapsed.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const toggleFilters = () => {
  filtersCollapsed.value = !filtersCollapsed.value
}

// Gestion des dates séparées avec v-calendar
const dateStart = ref<Date | null>(null)
const dateEnd = ref<Date | null>(null)

// Synchroniser dateStart avec le filtre dateFrom
watch(
  () => planningFilters.filterState.dateFrom,
  (from) => {
    if (from) {
      const date = new Date(from)
      if (!isNaN(date.getTime())) {
        dateStart.value = date
      }
    } else {
      dateStart.value = null
    }
  },
  { immediate: true }
)

// Synchroniser dateEnd avec le filtre dateTo
watch(
  () => planningFilters.filterState.dateTo,
  (to) => {
    if (to) {
      const date = new Date(to)
      if (!isNaN(date.getTime())) {
        dateEnd.value = date
      }
    } else {
      dateEnd.value = null
    }
  },
  { immediate: true }
)

// Mettre à jour le filtre quand dateStart change
watch(dateStart, (newDate) => {
  if (newDate && !isNaN(newDate.getTime())) {
    planningFilters.updateFilter('dateFrom', toDateStr(newDate))
  } else {
    planningFilters.updateFilter('dateFrom', '')
  }
})

// Mettre à jour le filtre quand dateEnd change
watch(dateEnd, (newDate) => {
  if (newDate && !isNaN(newDate.getTime())) {
    planningFilters.updateFilter('dateTo', toDateStr(newDate))
  } else {
    planningFilters.updateFilter('dateTo', '')
  }
})

const formatSingleDate = (inputValue: any): string => {
  if (!inputValue) return ''
  
  const date = new Date(inputValue)
  if (isNaN(date.getTime())) return ''
  
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const clearDateStart = () => {
  dateStart.value = null
}

const clearDateEnd = () => {
  dateEnd.value = null
}

// Gestion de la recherche
const onSearchInput = () => {
  // Logique gérée par le composable
}

const onSearchFocus = () => {
  planningFilters.handleSearchFocus()
}

const onSearchBlur = () => {
  planningFilters.handleSearchBlur()
}

const clearSearch = () => {
  planningFilters.updateFilter('search', '')
}

const selectSuggestion = (suggestion: any) => {
  if (suggestion?.type === 'Collaborateur') {
    const label = String(suggestion.value || suggestion.text || '').trim()
    if (label) {
      planningFilters.updateFilter('search', label)
    }
    planningFilters.handleSearchBlur()
  } else {
    planningFilters.selectSuggestion(suggestion)
  }
}

// Filtres actifs
const hasActiveFilters = computed(() => {
  const { filterState } = planningFilters
  return !!(
    filterState.search ||
    filterState.metier ||
    filterState.statut ||
    filterState.lieu ||
    filterState.dateFrom ||
    filterState.dateTo
  )
})

const activeFiltersCount = computed(() => activeFilterChips.value.length)

type Chip = { key: string; icon: string; label: string; onClear: () => void }
const activeFilterChips = computed<Chip[]>(() => {
  const chips: Chip[] = []
  const { filterState } = planningFilters

  if (filterState.search) {
    chips.push({
      key: 'search',
      icon: 'search',
      label: String(filterState.search),
      onClear: () => planningFilters.updateFilter('search', '')
    })
  }
  if (filterState.metier) {
    const val = typeof filterState.metier === 'object' && filterState.metier
      ? (filterState.metier as any)?.text || (filterState.metier as any)?.value
      : filterState.metier
    chips.push({
      key: 'metier',
      icon: 'work_outline',
      label: String(val),
      onClear: () => planningFilters.updateFilter('metier', '')
    })
  }
  if (filterState.statut) {
    const val = typeof filterState.statut === 'object' && filterState.statut
      ? (filterState.statut as any)?.text || (filterState.statut as any)?.value
      : filterState.statut
    chips.push({
      key: 'statut',
      icon: 'info_outline',
      label: String(val),
      onClear: () => planningFilters.updateFilter('statut', '')
    })
  }
  if (filterState.lieu) {
    const val = typeof filterState.lieu === 'object' && filterState.lieu
      ? (filterState.lieu as any)?.text || (filterState.lieu as any)?.value
      : filterState.lieu
    chips.push({
      key: 'lieu',
      icon: 'place',
      label: String(val),
      onClear: () => planningFilters.updateFilter('lieu', '')
    })
  }
  // Chip pour date de début
  if (filterState.dateFrom) {
    const fromDate = new Date(filterState.dateFrom)
    if (!isNaN(fromDate.getTime())) {
      chips.push({
        key: 'dateFrom',
        icon: 'event',
        label: `Début: ${fromDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        onClear: () => {
          dateStart.value = null
          planningFilters.updateFilter('dateFrom', '')
        }
      })
    }
  }
  
  // Chip pour date de fin
  if (filterState.dateTo) {
    const toDate = new Date(filterState.dateTo)
    if (!isNaN(toDate.getTime())) {
      chips.push({
        key: 'dateTo',
        icon: 'event',
        label: `Fin: ${toDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        onClear: () => {
          dateEnd.value = null
          planningFilters.updateFilter('dateTo', '')
        }
      })
    }
  }
  return chips
})

const clearAllFilters = () => {
  dateStart.value = null
  dateEnd.value = null
  planningFilters.updateFilter('search', '')
  planningFilters.updateFilter('metier', '')
  planningFilters.updateFilter('statut', '')
  planningFilters.updateFilter('lieu', '')
  planningFilters.updateFilter('dateFrom', '')
  planningFilters.updateFilter('dateTo', '')
}
</script>

<style scoped>
.planning-header-compact {
  position: sticky;
  top: 0;
  z-index: 5000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: inset 0 -8px 16px -8px rgba(0, 0, 0, 0.2);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  color: white;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 28px;
}

.brand-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.brand-subtitle {
  margin: 2px 0 0;
  font-size: 0.875rem;
  opacity: 0.9;
}

.filters-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.filters-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
}

.badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.filters-panel {
  background: white;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  box-shadow: inset 0 -4px 12px -4px rgba(0, 0, 0, 0.1);
}

/* Recherche */
.search-section {
  position: relative;
  margin-bottom: 16px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 12px;
  transition: all 0.2s;
}

.search-wrapper:focus-within {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  color: #9ca3af;
  font-size: 20px;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 0;
  font-size: 14px;
  color: #1e293b;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-clear {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.search-clear:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.search-clear:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.search-clear .material-icons {
  font-size: 18px;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 50;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item:focus {
  background: #f8fafc;
  outline: none;
}

.suggestion-item:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: -2px;
}

.suggestion-item .material-icons {
  font-size: 18px;
  color: #667eea;
}

.suggestion-item span:not(.material-icons) {
  color: #1e293b;
}

/* Filtres en ligne */
.filters-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  gap: 12px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-label .material-icons {
  font-size: 14px;
  color: #667eea;
}

/* Date picker v-calendar */
.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  min-height: 38px;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
}

.date-input-wrapper:hover {
  border-color: #cbd5e1;
}

.date-input-wrapper:focus-within {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.date-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #1e293b;
  cursor: pointer;
  background: transparent;
}

.date-input::placeholder {
  color: #94a3b8;
}

.date-icon {
  font-size: 18px;
  color: #64748b;
  margin-left: 8px;
}

.date-clear {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  margin-left: 4px;
  border-radius: 4px;
  color: #64748b;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.date-clear:hover {
  background: #f1f5f9;
  color: #334155;
}

.date-clear:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.date-clear .material-icons {
  font-size: 16px;
}

/* Selects natifs */
.filter-select-native {
  width: 100%;
  min-height: 38px;
  padding: 8px 32px 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
}

.filter-select-native:hover {
  border-color: #cbd5e1;
}

.filter-select-native:focus,
.filter-select-native:focus-visible {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select-native option {
  color: #1e293b;
  background: white;
  padding: 8px;
}

/* Chips */
.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #e0e7ff;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.filter-chip .material-icons {
  font-size: 16px;
}

.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 2px;
  color: #6366f1;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.chip-remove:hover {
  color: #4338ca;
}

.chip-remove:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
  border-radius: 4px;
}

.chip-remove .material-icons {
  font-size: 16px;
}

.clear-all-btn {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background: #fecaca;
  border-color: #fca5a5;
}

.clear-all-btn:focus-visible {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 1200px) {
  .filters-row {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .header-top {
    padding: 12px 16px;
  }
  
  .brand-title {
    font-size: 1rem;
  }
  
  .brand-subtitle {
    font-size: 0.75rem;
  }
  
  .filters-panel {
    padding: 16px;
  }
  
  .filters-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Z-index très élevé pour le calendrier v-calendar - au-dessus de tous les éléments du planning */
:deep(.vc-popover-content-wrapper) {
  z-index: 99999 !important;
}

:deep(.vc-container) {
  z-index: 99999 !important;
}

:deep(.vc-popover-content) {
  z-index: 99999 !important;
}

/* S'assurer que le popover parent a aussi un z-index élevé */
.date-picker :deep(.vc-container),
.date-picker :deep([role="dialog"]) {
  z-index: 99999 !important;
}
</style>
