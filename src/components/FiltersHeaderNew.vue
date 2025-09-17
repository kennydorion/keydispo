<template>
  <header class="planning-header">
    <!-- En-tête principal avec titre et actions -->
    <div class="header-top">
      <div class="header-brand">
        <div class="brand-icon">
          <span class="material-icons">dashboard</span>
        </div>
        <div class="brand-content">
          <h1 class="brand-title">Planning Admin</h1>
          <p class="brand-subtitle">Gestion des disponibilités</p>
        </div>
      </div>
      
      <div class="header-actions">
        <!-- Bouton toggle filtres mobile -->
        <button 
          v-if="isMobile" 
          class="filters-toggle"
          @click="toggleFilters"
          :class="{ active: !filtersCollapsed }"
        >
          <span class="material-icons">{{ filtersCollapsed ? 'expand_more' : 'expand_less' }}</span>
          <span>Filtres</span>
          <span v-if="hasActiveFilters" class="filter-badge">{{ activeFilterChips.length }}</span>
        </button>
        <!-- Bouton mobile original (masqué) -->
        <button class="mobile-toggle" @click="$emit('openMobileFilters')" style="display: none;">
          <span class="material-icons">tune</span>
        </button>
      </div>
    </div>

  <!-- Section de filtrage moderne et compacte -->
  <div 
    v-show="!isMobile || !filtersCollapsed"
    class="filters-panel compact-panel"
    :class="{ 'mobile-collapsed': isMobile && filtersCollapsed }"
  >
      <div class="filters-inner">
        <!-- Recherche sur ligne complète -->
        <div class="search-full-row">
          <div class="search-full-wrapper">
            <span class="material-icons search-icon">search</span>
            <input 
              v-model="planningFilters.filterState.search"
              type="text"
              placeholder="Rechercher un collaborateur (nom, prénom, email, téléphone)"
              class="search-full-input"
              @input="onSearchInput"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
            />
            <button 
              v-if="planningFilters.filterState.search"
              @click="clearSearch"
              class="search-clear"
              type="button"
            >
              <span class="material-icons">close</span>
            </button>
          </div>
          
          <!-- Suggestions compactes -->
          <div 
            v-if="planningFilters.showSuggestions.value && planningFilters.searchSuggestions.value.length > 0"
            class="search-suggestions"
          >
            <div 
              v-for="suggestion in planningFilters.searchSuggestions.value"
              :key="`${suggestion.type}-${suggestion.value}`"
              @click="selectSuggestion(suggestion)"
              class="suggestion-item"
            >
              <span class="suggestion-icon material-icons">{{ suggestion.icon }}</span>
              <span class="suggestion-text">{{ suggestion.text }}</span>
            </div>
          </div>
        </div>

        <!-- Ligne de filtres en 2 lignes -->
        <div class="compact-filters-row">
          <!-- Ligne 1: Période et Métier -->
          <!-- Période compacte -->
          <div class="compact-filter-item date-compact">
            <label class="compact-label">
              <span class="material-icons">date_range</span>
              Période
            </label>
            <div class="compact-date-inputs">
              <va-date-input
                :model-value="dateFromValue"
                @update:model-value="updateDateFrom"
                placeholder="Date de début"
                clearable
                class="compact-date-input"
                :close-on-click-outside="true"
              />
              <span class="date-separator">→</span>
              <va-date-input
                :model-value="dateToValue"
                @update:model-value="updateDateTo"
                placeholder="Date de fin"
                clearable
                class="compact-date-input"
                :close-on-click-outside="true"
              />
            </div>
          </div>

          <!-- Métier compact -->
          <div class="compact-filter-item metier-item">
            <label class="compact-label">
              <span class="material-icons">work_outline</span>
              Métier
            </label>
            <va-select 
              v-model="planningFilters.filterState.metier"
              :options="planningFilters.metiersOptions.value"
              :text-by="'text'"
              :value-by="'value'"
              placeholder="Tous"
              clearable
              class="compact-select"
            />
          </div>

          <!-- Ligne 2: Statut et Lieu -->
          <!-- Statut compact -->
          <div 
            v-if="planningFilters.canFilterByLieuStatut.value" 
            class="compact-filter-item statut-item"
          >
            <label class="compact-label">
              <span class="material-icons">info_outline</span>
              Statut
            </label>
            <va-select 
              v-model="planningFilters.filterState.statut"
              :options="planningFilters.statutsOptions.value"
              :text-by="'text'"
              :value-by="'value'"
              placeholder="Tous"
              clearable
              class="compact-select"
            />
          </div>

          <!-- Lieu compact (conditionnel) -->
          <div 
            v-if="planningFilters.canFilterByLieuStatut.value && showLieuFilter" 
            class="compact-filter-item lieu-compact"
          >
            <label class="compact-label">
              <span class="material-icons">place</span>
              Lieu
            </label>
            <va-select 
              v-model="planningFilters.filterState.lieu"
              :options="planningFilters.lieuxOptions.value"
              :text-by="'text'"
              :value-by="'value'"
              placeholder="Tous"
              clearable
              class="compact-select"
            />
          </div>
        </div>

        <!-- Chips des filtres actifs -->
        <div v-if="activeFilterChips.length" class="active-chips-row">
          <div 
            v-for="chip in activeFilterChips" 
            :key="chip.key"
            class="filter-chip"
          >
            <span class="material-icons chip-icon">{{ chip.icon }}</span>
            <span class="chip-label">{{ chip.label }}</span>
            <button class="chip-clear" @click="chip.onClear()" title="Retirer ce filtre">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <!-- Indicateur de période active (si définie) -->
        <div 
          v-if="planningFilters.hasDateRange.value && !activeFilterChips.some(c => c.key === 'dates')" 
          class="compact-period-indicator"
        >
          <span class="material-icons">sync</span>
          <span class="period-text">{{ formatActivePeriod() }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import { usePlanningFilters } from '../composables/usePlanningFilters'

// Émissions
defineEmits<{
  'update:viewMode': [mode: 'semaine' | 'mois' | 'jour']
  openMobileFilters: []
  prev: []
  today: []
  next: []
}>()

// État mobile et filtres rétractables
const isMobile = ref(false)
const filtersCollapsed = ref(false)

// Détection mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  // Auto-collapse sur mobile si les filtres ne sont pas utilisés
  if (isMobile.value && !hasActiveFilters.value) {
    filtersCollapsed.value = true
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Toggle des filtres mobile
const toggleFilters = () => {
  filtersCollapsed.value = !filtersCollapsed.value
}

// Composables
const planningFilters = usePlanningFilters()

// Gestion des dates pour va-date-picker
const dateFromValue = computed(() => {
  const dateStr = planningFilters.filterState.dateFrom
  return dateStr ? new Date(dateStr) : null
})

const dateToValue = computed(() => {
  const dateStr = planningFilters.filterState.dateTo
  return dateStr ? new Date(dateStr) : null
})

const updateDateFrom = (date: Date | null) => {
  const dateStr = date ? date.toISOString().split('T')[0] : ''
  planningFilters.updateFilter('dateFrom', dateStr)
}

const updateDateTo = (date: Date | null) => {
  const dateStr = date ? date.toISOString().split('T')[0] : ''
  planningFilters.updateFilter('dateTo', dateStr)
}

// Afficher le filtre lieu seulement si statut = "En mission"
const showLieuFilter = computed(() => {
  const statut = planningFilters.filterState.statut
  
  // Extraire la valeur du statut (peut être un objet ou une string)
  const statutValue = typeof statut === 'object' && statut
    ? (statut as any)?.value || (statut as any)?.text || ''
    : statut || ''
  
  // Normaliser la valeur
  const normalizedStatut = statutValue.toString().toLowerCase()
  
  return normalizedStatut === 'mission' || normalizedStatut === 'en mission'
})

// Méthodes de gestion de la recherche
const onSearchInput = () => {
  // La logique est gérée par le composable
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
  // Pour le type Collaborateur, ne pas effacer la recherche après sélection
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

// Détection des filtres actifs
const hasActiveFilters = computed(() => {
  const { filterState } = planningFilters
  return !!(
    filterState.search ||
    filterState.selectedMetier?.length ||
    filterState.selectedStatut?.length ||
    filterState.selectedLieu?.length ||
    filterState.dateFrom ||
    filterState.dateTo ||
    filterState.startTime ||
    filterState.endTime
  )
})

// Chips des filtres actifs pour clarté et actions rapides
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
  if (filterState.dateFrom || filterState.dateTo) {
    const from = filterState.dateFrom ? formatDateShort(filterState.dateFrom) : '—'
    const to = filterState.dateTo ? formatDateShort(filterState.dateTo) : '—'
    chips.push({
      key: 'dates',
      icon: 'date_range',
      label: `${from} → ${to}`,
      onClear: () => { planningFilters.updateFilter('dateFrom', ''); planningFilters.updateFilter('dateTo', '') }
    })
  }
  return chips
})

// Formater la période active pour l'affichage
const formatActivePeriod = () => {
  const dateFrom = planningFilters.filterState.dateFrom
  const dateTo = planningFilters.filterState.dateTo
  
  if (dateFrom && dateTo) {
    return `${formatDateShort(dateFrom)} → ${formatDateShort(dateTo)}`
  } else if (dateFrom) {
    return `À partir du ${formatDateShort(dateFrom)}`
  } else if (dateTo) {
    return `Jusqu'au ${formatDateShort(dateTo)}`
  }
  return ''
}

const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    })
  } catch {
    return dateStr
  }
}

// Nettoyer le filtre lieu quand le statut change et n'est plus "En mission"
watch(
  () => planningFilters.filterState.statut,
  (newStatut) => {
    const statutValue = typeof newStatut === 'object' && newStatut
      ? (newStatut as any)?.value || (newStatut as any)?.text || ''
      : newStatut || ''
    
    const normalizedStatut = statutValue.toString().toLowerCase()
    const isMission = normalizedStatut === 'mission' || normalizedStatut === 'en mission'
    
    // Si le statut n'est plus "En mission", nettoyer le filtre lieu
    if (!isMission && planningFilters.filterState.lieu) {
      planningFilters.updateFilter('lieu', '')
    }
  }
)
</script>

<style scoped>
/* En-tête */
.planning-header {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --surface-light: #ffffff;
  --border-light: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --transition-smooth: all 0.2s ease;
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface-light);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-soft);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--primary-gradient);
  color: white;
}

.header-brand { display: flex; align-items: center; gap: 12px; }
.brand-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 10px; background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.3) }
.brand-icon .material-icons { font-size: 22px; color: white }
.brand-title { margin: 0; font-size: 1.25rem; font-weight: 700 }
.brand-subtitle { margin: 2px 0 0; opacity: .9; font-size: .9rem }
.header-actions { display: flex; align-items: center; gap: 12px }
.mobile-toggle { display: none }

/* Panel compact */
.compact-panel { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px 20px }
.filters-inner { max-width: 1400px; margin: 0 auto }

/* Recherche pleine largeur */
.search-full-row { margin-bottom: 16px; position: relative }
.search-full-wrapper { position: relative; display: flex; align-items: center; background: white; border-radius: 12px; padding: 0 16px; box-shadow: 0 2px 8px rgba(0,0,0,.1); transition: all 0.2s ease }
.search-full-wrapper:focus-within { box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15); transform: translateY(-1px) }
.search-icon { color: #9ca3af; font-size: 20px !important; margin-right: 12px }
.search-full-input { flex: 1; border: none; outline: none; padding: 16px 0; font-size: 16px; background: transparent; color: #1e293b }
.search-full-input::placeholder { color: #9ca3af }
.search-clear { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; color: #9ca3af; display: grid; place-items: center; transition: all 0.2s ease }
.search-clear:hover { background: #f3f4f6; color: #6b7280 }
.search-clear .material-icons { font-size: 18px }

/* Suggestions pleine largeur */
.search-suggestions { position: absolute; top: 100%; left: 0; right: 0; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.12); z-index: 10; max-height: 250px; overflow-y: auto; margin-top: 0 }
.suggestion-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background-color 0.2s ease }
.suggestion-item:hover { background: #f8fafc }
.suggestion-item:last-child { border-bottom: none }
.suggestion-icon { font-size: 18px !important; color: #667eea }
.suggestion-text { font-size: 14px; color: #374151; font-weight: 500 }

/* OVERRIDE GLOBAL POUR FORCER TEXTE NOIR PARTOUT */
.compact-filters-row :deep(*) {
  color: #000 !important;
}
.compact-filters-row :deep(.va-input__placeholder) {
  color: #94a3b8 !important;
}
.compact-filters-row :deep(.material-icons) {
  color: #667eea !important;
}
.compact-filters-row :deep(.va-select__dropdown-icon) {
  color: #666 !important;
}
.compact-filters-row :deep(.va-date-input__icon) {
  color: #666 !important;
}

/* UNIFORMISATION HAUTEUR GLOBALE */
.compact-filters-row :deep(.va-input-wrapper) {
  min-height: 42px !important;
}
.compact-filters-row :deep(.va-input-wrapper__field) {
  min-height: 28px !important;
}

/* Ligne compacte des filtres - Layout 2 lignes */
.compact-filters-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  grid-template-areas: 
    "periode metier"
    "statut lieu";
  column-gap: 20px;
  row-gap: 16px;
  align-items: center;
  background: rgba(255, 255, 255, 0.98);
  padding: 18px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(31,41,55,0.04);
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

.compact-filter-item { 
  display: flex; 
  flex-direction: column; 
  gap: 6px; 
  min-width: 140px;
  align-self: stretch;
  justify-content: flex-start;
}
.compact-filter-item.metier-item { 
  grid-area: metier; 
  align-self: stretch;
}
.compact-filter-item.date-compact { 
  grid-area: periode; 
  min-width: 280px; 
  max-width: 100%; 
  align-self: stretch;
}
.compact-filter-item.statut-item { grid-area: statut; }
.compact-filter-item.lieu-compact { grid-area: lieu; animation: slideInFromLeft .25s ease-out; }

@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-10px) } to { opacity: 1; transform: translateX(0) } }

.compact-label { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  font-size: 12px; 
  font-weight: 700; 
  color: #4a5568; 
  text-transform: uppercase; 
  letter-spacing: .5px; 
  margin-bottom: 4px;
  height: 20px; /* Hauteur fixe pour aligner les labels */
}
.compact-label .material-icons { font-size: 16px; color: #667eea }

/* Sélecteurs compacts - TEXTE NOIR FORCÉ */
.compact-select { 
  min-height: 42px !important; 
  color: #000 !important;
}
.compact-select :deep(.va-input-wrapper) { 
  min-height: 42px !important; 
  padding: 6px 12px !important; 
  border-radius: 8px !important; 
  border: 1px solid #d8e0ea !important; 
  background: #fff !important;
  box-shadow: none !important;
  display: flex !important;
  align-items: center !important;
  color: #000 !important;
}
.compact-select :deep(.va-input-wrapper__field) { 
  min-height: 28px !important; 
  font-size: 14px !important;
  color: #000 !important;
  display: flex !important;
  align-items: center !important;
}
.compact-select :deep(.va-input-wrapper):focus-within { 
  border-color: #667eea !important; 
  box-shadow: 0 0 0 2px rgba(102,126,234,.18) !important 
}
/* TOUS LES TEXTES EN NOIR - APPROCHE AGRESSIVE */
.compact-select :deep(*) { color: #000 !important; }
.compact-select :deep(.va-input__placeholder) { color: #94a3b8 !important; font-weight: 500 !important }
.compact-select :deep(.va-input__content) { color: #000 !important; font-weight: 600 !important }
.compact-select :deep(.va-select__value) { color: #000 !important; font-weight: 600 !important }
.compact-select :deep(.va-select__value .va-chip) { background: #eef2ff !important; color: #000 !important }
.compact-select :deep(.va-select__anchor) { color: #000 !important }
.compact-select :deep(.va-input-wrapper__text) { color: #000 !important }
.compact-select :deep(.va-select__content-wrapper) { color: #000 !important }
.compact-select :deep(.va-input) { color: #000 !important }
.compact-select :deep(.va-input__field) { color: #000 !important }
.compact-select :deep(.va-select__dropdown-icon) { color: #666 !important }
.compact-select :deep(.va-select__selection) { color: #000 !important }
.compact-select :deep(.va-select__selectedValue) { color: #000 !important }
.compact-select :deep(input) { color: #000 !important }
.compact-select :deep(span) { color: #000 !important }
.compact-select :deep(div) { color: #000 !important }

/* Date inputs compacts - TEXTE NOIR FORCÉ */
.compact-date-input { 
  min-height: 42px !important; 
  flex: 1;
  width: 100%;
  color: #000 !important;
}
.compact-date-input :deep(.va-input-wrapper) { 
  min-height: 42px !important; 
  padding: 6px 12px !important; 
  border-radius: 8px !important; 
  border: 1px solid #d8e0ea !important;
  background: #fff !important;
  width: 100%;
  box-shadow: none !important;
  display: flex !important;
  align-items: center !important;
  color: #000 !important;
}
.compact-date-input :deep(.va-input-wrapper__field) { 
  min-height: 28px !important; 
  font-size: 14px !important;
  align-items: center !important;
  display: flex !important;
  width: 100%;
  color: #000 !important;
}
.compact-date-input :deep(.va-input-wrapper):focus-within { 
  border-color: #667eea !important; 
  box-shadow: 0 0 0 2px rgba(102,126,234,.18) !important 
}
/* TOUS LES TEXTES DE DATE EN NOIR - APPROCHE AGRESSIVE */
.compact-date-input :deep(*) { color: #000 !important; }
.compact-date-input :deep(.va-input-wrapper__text) { 
  font-size: 14px !important; 
  color: #000 !important; 
  font-weight: 600 !important;
}
.compact-date-input :deep(.va-input__placeholder) { 
  color: #94a3b8 !important; 
  font-weight: 500 !important;
}
.compact-date-input :deep(.va-date-input__input) {
  cursor: pointer;
  color: #000 !important;
}
.compact-date-input :deep(.va-input) {
  color: #000 !important;
}
.compact-date-input :deep(.va-input__content) {
  color: #000 !important;
}
.compact-date-input :deep(.va-input__field) {
  color: #000 !important;
}
.compact-date-input :deep(.va-date-input__icon) {
  color: #666 !important;
}
.compact-date-input :deep(input) { color: #000 !important; }
.compact-date-input :deep(span) { color: #000 !important; }
.compact-date-input :deep(div) { color: #000 !important; }

/* Dates container - Alignement vertical parfait */
.compact-date-inputs { 
  display: grid; 
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  min-height: 42px;
}
.date-separator { 
  color: #667eea; 
  font-weight: 600; 
  font-size: 18px; 
  flex-shrink: 0;
  line-height: 1; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  margin: 0 2px;
  align-self: center;
}

/* Chips actifs */
.active-chips-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px }
.active-chips-row { padding: 4px 2px 0 }

.compact-results { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  background: #4f66d6;
  color: white;
  padding: 10px 18px 9px;
  border-radius: 28px;
  white-space: nowrap;
  font-weight:600;
  font-size:13px;
  line-height:1;
}
.results-count { font-size: 18px; font-weight: 800; color: white; letter-spacing:.5px }
.results-label { font-size: 11px; opacity:.9; text-transform: uppercase; letter-spacing: .6px }

/* Responsive pour layout 2 lignes */
@media (max-width: 1000px) {
  .compact-filters-row { 
    grid-template-columns: 1fr;
    grid-template-areas: 
      "metier"
      "periode"
      "statut"
      "lieu";
    gap: 14px; 
  }
  .compact-filter-item.date-compact { min-width: auto; }
}

@media (max-width: 640px) {
  .compact-filters-row { 
    padding: 16px;
    gap: 12px;
  }
  .compact-filter-item { min-width: auto; }
  .compact-date-inputs { 
    grid-template-columns: 1fr;
    gap: 8px;
    height: auto;
  }
  .date-separator {
    display: none;
  }
}

/* Chips actifs */
.active-chips-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px }
.active-chips-row { padding: 4px 2px 0 }
.filter-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: #eef2ff; color: #3730a3; border: 1px solid #e0e7ff }
.chip-icon { font-size: 14px }
.chip-label { font-size: 12px; font-weight: 600 }
.chip-clear { background: transparent; border: none; padding: 0; margin-left: 2px; display: grid; place-items: center; cursor: pointer; color: #6366f1 }
.chip-clear .material-icons { font-size: 16px }
.chip-clear:hover { color: #3730a3 }

/* Indicateur période */
.compact-period-indicator { display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; padding: 8px 12px; background: rgba(255,255,255,.92); border-radius: 8px; font-size: 13px; color: #4a5568 }
.compact-period-indicator .material-icons { font-size: 16px; color: #667eea }
.period-text { font-weight: 600 }
</style>
