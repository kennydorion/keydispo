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
        <!-- Bouton mobile -->
        <button class="mobile-toggle" @click="$emit('openMobileFilters')">
          <span class="material-icons">tune</span>
        </button>
      </div>
    </div>

    <!-- Section de filtrage moderne et compacte -->
    <div class="filters-panel compact-panel">
      <div class="filters-inner">
        <!-- Ligne de filtres compacte -->
        <div class="compact-filters-row">
          
          <!-- Recherche compacte -->
          <div class="compact-filter-item search-compact">
            <div class="compact-search-wrapper">
              <span class="material-icons search-icon">search</span>
              <input 
                v-model="planningFilters.filterState.search"
                type="text"
                placeholder="Rechercher..."
                class="compact-search-input"
                @input="onSearchInput"
                @focus="onSearchFocus"
                @blur="onSearchBlur"
              />
              <button 
                v-if="planningFilters.filterState.search"
                @click="clearSearch"
                class="compact-search-clear"
                type="button"
              >
                <span class="material-icons">close</span>
              </button>
            </div>
            
            <!-- Suggestions compactes -->
            <div 
              v-if="planningFilters.showSuggestions.value && planningFilters.searchSuggestions.value.length > 0"
              class="compact-suggestions"
            >
              <div 
                v-for="suggestion in planningFilters.searchSuggestions.value"
                :key="`${suggestion.type}-${suggestion.value}`"
                @click="selectSuggestion(suggestion)"
                class="compact-suggestion-item"
              >
                <span class="suggestion-icon material-icons">{{ suggestion.icon }}</span>
                <span class="suggestion-text">{{ suggestion.text }}</span>
              </div>
            </div>
          </div>

          <!-- Métier compact -->
          <div class="compact-filter-item">
            <label class="compact-label">
              <span class="material-icons">work_outline</span>
              Métier
            </label>
            <va-select 
              v-model="planningFilters.filterState.metier"
              :options="planningFilters.metiersOptions.value"
              placeholder="Tous"
              clearable
              class="compact-select"
            />
          </div>

          <!-- Période compacte -->
          <div class="compact-filter-item date-compact">
            <label class="compact-label">
              <span class="material-icons">date_range</span>
              Période
            </label>
            <div class="compact-date-inputs">
              <input 
                v-model="planningFilters.filterState.dateFrom"
                type="date"
                class="compact-date-input"
                title="Date de début"
              />
              <span class="date-separator">→</span>
              <input 
                v-model="planningFilters.filterState.dateTo"
                type="date"
                class="compact-date-input"
                title="Date de fin"
              />
            </div>
          </div>

          <!-- Statut compact -->
          <div 
            v-if="planningFilters.canFilterByLieuStatut.value" 
            class="compact-filter-item"
          >
            <label class="compact-label">
              <span class="material-icons">info_outline</span>
              Statut
            </label>
            <va-select 
              v-model="planningFilters.filterState.statut"
              :options="planningFilters.statutsOptions.value"
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
              placeholder="Tous"
              clearable
              class="compact-select"
            />
          </div>

          <!-- Actions compactes -->
          <div class="compact-actions">
            <button 
              v-if="hasActiveFilters"
              @click="clearAllFilters"
              class="compact-clear-btn"
              title="Réinitialiser tous les filtres"
            >
              <span class="material-icons">refresh</span>
            </button>
            
            <div class="compact-results">
              <span class="results-count">{{ filteredResultsCount || 0 }}</span>
              <span class="results-label">résultats</span>
            </div>
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
        <div v-if="planningFilters.hasDateRange.value" class="compact-period-indicator">
          <span class="material-icons">sync</span>
          <span class="period-text">{{ formatActivePeriod() }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { usePlanningFilters } from '../composables/usePlanningFilters'

// Émissions
defineEmits<{
  'update:viewMode': [mode: 'semaine' | 'mois' | 'jour']
  openMobileFilters: []
  prev: []
  today: []
  next: []
}>()

// Composables
const planningFilters = usePlanningFilters()

// Calculs réactifs
const hasActiveFilters = computed(() => planningFilters.hasActiveFilters.value)

const filteredResultsCount = computed(() => {
  // Utiliser une valeur par défaut pour l'instant
  return 0
})

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
  planningFilters.selectSuggestion(suggestion)
}

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

const clearAllFilters = () => {
  planningFilters.clearAllFilters()
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
/* ================================
   VARIABLES DE COULEURS MODERNES
   ================================ */
.planning-header {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --surface-light: #ffffff;
  --surface-dark: #1a1a2e;
  --surface-card: #f8fafc;
  --border-light: #e2e8f0;
  --border-accent: #3b82f6;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 2px 10px rgba(0, 0, 0, 0.1);
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ================================
   STRUCTURE PRINCIPALE
   ================================ */
.planning-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface-light);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(10px);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px 16px;
  background: var(--primary-gradient);
  color: white;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.brand-icon .material-icons {
  font-size: 28px;
  color: white;
}

.brand-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.025em;
}

.brand-subtitle {
  font-size: 0.95rem;
  margin: 4px 0 0;
  opacity: 0.9;
  font-weight: 400;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-toggle {
  display: none;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
  backdrop-filter: blur(10px);
}

.mobile-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* ================================
   SECTION FILTRES COMPACTE
   ================================ */
.compact-panel {
  background: var(--surface-light);
  padding: 16px 32px;
  border-bottom: 1px solid var(--border-light);
}

.compact-filters-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  max-width: 1400px;
  margin: 0 auto;
}

.compact-filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}

.compact-filter-item.search-compact {
  min-width: 280px;
  flex: 1;
  max-width: 350px;
}

.compact-filter-item.date-compact {
  min-width: 240px;
}

/* Animation d'apparition du lieu */
.lieu-compact {
  animation: slideInFromLeft 0.3s ease-out;
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
    max-width: 0;
  }
  to {
    opacity: 1;
    transform: translateX(0);
    max-width: 200px;
  }
}

.compact-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.compact-label .material-icons {
  font-size: 16px;
  color: var(--border-accent);
}

/* ================================
   RECHERCHE COMPACTE
   ================================ */
.compact-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid var(--border-light);
  border-radius: 12px;
  padding: 0 12px;
  transition: var(--transition-smooth);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.compact-search-wrapper:focus-within {
  border-color: var(--border-accent);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.search-icon {
  color: var(--text-secondary);
  font-size: 18px;
  margin-right: 8px;
}

.compact-search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 0;
  font-size: 0.9rem;
  background: transparent;
  color: var(--text-primary);
}

.compact-search-input::placeholder {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.compact-search-clear {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: var(--transition-smooth);
  display: flex;
  align-items: center;
  justify-content: center;
}

.compact-search-clear:hover {
  background: #ef4444;
  color: white;
}

.compact-search-clear .material-icons {
  font-size: 16px;
}

/* Suggestions compactes */
.compact-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  margin-top: 4px;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
}

.compact-suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--border-light);
}

.compact-suggestion-item:last-child {
  border-bottom: none;
}

.compact-suggestion-item:hover {
  background: var(--surface-card);
}

.compact-suggestion-item .suggestion-icon {
  font-size: 16px;
  color: var(--border-accent);
}

.suggestion-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
}

/* ================================
   INPUTS COMPACTS
   ================================ */
.compact-date-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 2px solid var(--border-light);
  border-radius: 12px;
  padding: 8px 12px;
  transition: var(--transition-smooth);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.compact-date-inputs:focus-within {
  border-color: var(--border-accent);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.compact-date-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.85rem;
  color: var(--text-primary);
  width: 100px;
}

.date-separator {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
}

/* ================================
   SELECTS COMPACTS
   ================================ */
:deep(.compact-select .va-input-wrapper) {
  min-height: 42px !important;
  border: 2px solid var(--border-light) !important;
  border-radius: 12px !important;
  background: white !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

:deep(.compact-select .va-input-wrapper:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

:deep(.compact-select .va-input-wrapper--focused) {
  border-color: var(--border-accent) !important;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15) !important;
  transform: translateY(-1px);
}

:deep(.compact-select .va-input) {
  font-size: 0.9rem !important;
  color: var(--text-primary) !important;
  padding: 0 12px !important;
}

:deep(.compact-select .va-input::placeholder) {
  color: var(--text-secondary) !important;
  font-size: 0.85rem !important;
}

/* ================================
   ACTIONS COMPACTES
   ================================ */
.compact-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}

.compact-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
  box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
}

.compact-clear-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 87, 108, 0.4);
}

.compact-clear-btn .material-icons {
  font-size: 20px;
}

.compact-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.results-count {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--border-accent);
  line-height: 1;
}

.results-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

/* Chips actifs */
.active-chips-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px }
.filter-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: #eef2ff; color: #3730a3; border: 1px solid #e0e7ff }
.chip-icon { font-size: 14px }
.chip-label { font-size: 12px; font-weight: 600 }
.chip-clear { background: transparent; border: none; padding: 0; margin-left: 2px; display: grid; place-items: center; cursor: pointer; color: #6366f1 }
.chip-clear .material-icons { font-size: 16px }
.chip-clear:hover { color: #3730a3 }

/* ================================
   INDICATEUR DE PÉRIODE COMPACT
   ================================ */
.compact-period-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  max-width: fit-content;
  animation: fadeInUp 0.3s ease-out;
}

.compact-period-indicator .material-icons {
  color: var(--border-accent);
  font-size: 16px;
  animation: rotate 2s linear infinite;
}

.period-text {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ================================
   RESPONSIVE COMPACT
   ================================ */
@media (max-width: 1200px) {
  .compact-filters-row {
    gap: 16px;
  }
  
  .compact-filter-item {
    min-width: 140px;
  }
  
  .compact-filter-item.search-compact {
    min-width: 250px;
  }
}

@media (max-width: 768px) {
  .compact-panel {
    padding: 12px 20px;
  }
  
  .compact-filters-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .compact-filter-item {
    min-width: 100%;
  }
  
  .compact-actions {
    margin-left: 0;
    justify-content: space-between;
  }
  
  .compact-date-inputs {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .compact-panel {
    padding: 8px 16px;
  }
  
  .compact-date-inputs {
    flex-direction: column;
    gap: 8px;
  }
  
  .date-separator {
    transform: rotate(90deg);
  }
  
  .compact-date-input {
    width: 100%;
    text-align: center;
  }
}

.filters-inner {
  max-width: 1400px;
  margin: 0 auto;
}

/* ================================
   RECHERCHE MODERNE
   ================================ */
.search-section {
  margin-bottom: 24px;
}

.search-group {
  position: relative;
  max-width: 600px;
}

/* Conteneur principal de la recherche */
.search-container {
  position: relative;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--va-background-primary);
  border: 1px solid var(--va-background-border);
  border-radius: 8px;
  padding: 0 12px;
  transition: var(--transition-smooth);
}

.search-input-wrapper:focus-within {
  border-color: var(--va-primary);
  box-shadow: 0 0 0 2px rgba(var(--va-primary-rgb), 0.1);
}

.search-icon {
  color: var(--text-secondary);
  margin-right: 12px;
  font-size: 20px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 0;
  font-size: 0.95rem;
  background: transparent;
  color: var(--va-text-primary);
}

.search-input::placeholder {
  color: var(--va-secondary);
  font-size: 0.9rem;
}

.search-clear {
  background: none;
  border: none;
  color: var(--va-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: var(--transition-smooth);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear:hover {
  background: var(--va-danger);
  color: white;
}

.search-clear .material-icons {
  font-size: 18px;
}

/* Suggestions d'autocomplétion */
.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--va-background-border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--va-background-border);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: var(--va-background-secondary);
}

.suggestion-icon {
  color: var(--va-primary);
  margin-right: 12px;
  font-size: 20px;
}

.suggestion-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggestion-text {
  font-size: 0.95rem;
  color: var(--va-text-primary);
  font-weight: 500;
}

.suggestion-type {
  font-size: 0.8rem;
  color: var(--va-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ================================
   SUGGESTIONS INTELLIGENTES
   ================================ */
.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--surface-card);
  border-bottom: 1px solid var(--border-light);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.suggestion-item:hover {
  background: var(--surface-card);
  transform: translateX(4px);
}

.suggestion-icon {
  color: var(--text-secondary);
  font-size: 18px;
}

.suggestion-content {
  flex: 1;
}

.suggestion-text {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
}

.suggestion-type {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ================================
   CARTES DE FILTRES
   ================================ */

/* Section des filtres */
.filter-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.filter-section:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.filter-section.section-disabled {
  opacity: 0.6;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  position: relative;
}

.section-header .material-icons {
  font-size: 24px;
  color: var(--primary);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  margin: 0;
}

.section-subtitle {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin-left: auto;
  font-style: italic;
}

.section-header .filter-active-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

/* Carte de recherche spéciale */
.search-card {
  min-width: 350px;
}

.search-card .search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-card .search-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.search-card .search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-card .search-input:focus {
  outline: none;
  border-color: var(--primary);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filters-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filters-row {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.primary-filters {
  gap: 24px;
}

.filter-card {
  min-width: 200px;
  flex: 1;
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  position: relative;
}

.filter-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.filter-active-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  margin-left: auto;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.filter-card.filter-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.filter-card.filter-disabled .filter-header .material-icons,
.filter-card.filter-disabled .filter-title {
  color: rgba(255, 255, 255, 0.5) !important;
}

.filter-header .material-icons {
  font-size: 18px;
  color: var(--text-secondary);
}

/* ================================
   SECTION DATES ET ACTIONS
   ================================ */
.date-filters {
  align-items: center;
  background: var(--surface-card);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--border-light);
}

.date-range-section {
  flex: 1;
}

.date-range-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.date-title {
  font-weight: 600;
  color: var(--text-primary);
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Indicateur de période active */
.active-period-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(var(--va-primary-rgb), 0.1), rgba(var(--va-success-rgb), 0.1));
  border: 1px solid rgba(var(--va-primary-rgb), 0.2);
  border-radius: 6px;
  margin-bottom: 1rem;
  animation: fadeIn 0.3s ease-out;
}

.active-period-indicator .material-icons {
  color: var(--va-primary);
  font-size: 1rem;
  animation: rotate 2s linear infinite;
}

.period-text {
  font-size: 0.9rem;
  color: var(--va-text-primary);
  font-weight: 500;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.date-input {
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: white;
  font-size: 0.9rem;
  transition: var(--transition-smooth);
  min-width: 140px;
}

.date-input:focus {
  outline: none;
  border-color: var(--border-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.date-separator {
  margin-top: 16px;
  color: var(--text-secondary);
}

/* Styles pour les filtres avancés intégrés */
.advanced-filters-container {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--va-background-border);
  animation: slideDown 0.3s ease-out;
}

.advanced-filters-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.advanced-filters-header .material-icons {
  color: var(--va-primary);
  font-size: 1.2rem;
}

.advanced-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--va-text-primary);
  margin: 0;
}

.advanced-subtitle {
  font-size: 0.85rem;
  color: var(--va-success);
  background: rgba(var(--va-success-rgb), 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.advanced-row {
  gap: 1rem;
}

/* Styles compacts pour les filtres */
.compact-row {
  gap: 0.75rem !important;
  align-items: flex-start;
}

.compact-row .filter-card {
  min-width: 180px;
  max-width: 220px;
}

/* Animation d'apparition du lieu */
.lieu-card {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.advanced-card {
  background: rgba(var(--va-primary-rgb), 0.02);
  border: 1px solid rgba(var(--va-primary-rgb), 0.1);
  padding: 12px; /* Réduit de 16px à 12px */
}

.advanced-card:hover {
  background: rgba(var(--va-primary-rgb), 0.04);
  border-color: rgba(var(--va-primary-rgb), 0.2);
}

.advanced-card .filter-header {
  margin-bottom: 6px; /* Réduit de 8px à 6px */
}

.advanced-card .filter-title {
  font-size: 0.85rem; /* Réduit de 0.9rem */
}

/* Sélecteurs compacts */
:deep(.compact-select .va-input-wrapper) {
  min-height: 36px !important; /* Réduit de 40px par défaut */
  padding: 6px 12px !important;
}

:deep(.compact-select .va-input) {
  font-size: 0.9rem !important;
  padding: 0 !important;
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

.filter-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: auto;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--secondary-gradient);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
  box-shadow: var(--shadow-card);
}

.clear-filters-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 87, 108, 0.3);
}

.results-summary {
  text-align: right;
}

.results-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.results-text strong {
  color: var(--text-primary);
  font-size: 1.1rem;
}

/* ================================
   PERSONNALISATION VUESTIC
   ================================ */
:deep(.va-select) {
  --va-select-background: white;
  --va-select-border-color: var(--border-light);
  --va-select-border-color-focused: var(--border-accent);
}

:deep(.va-select .va-input-wrapper) {
  border-radius: 12px !important;
  transition: var(--transition-smooth);
  box-shadow: var(--shadow-card);
}

:deep(.va-select .va-input-wrapper:hover) {
  transform: translateY(-1px);
}

:deep(.va-select .va-input-wrapper--focused) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

/* ================================
   RESPONSIVE DESIGN
   ================================ */
@media (max-width: 1024px) {
  .header-top {
    padding: 20px 24px 16px;
  }
  
  .filters-panel {
    padding: 20px 24px;
  }
  
  .primary-filters {
    gap: 16px;
  }
  
  .filter-card {
    min-width: 180px;
  }
}

@media (max-width: 768px) {
  .header-top {
    padding: 16px 20px 12px;
  }
  
  .brand-title {
    font-size: 1.6rem;
  }
  
  .mobile-toggle {
    display: flex;
  }
  
  .filters-panel {
    padding: 16px 20px;
  }
  
  .search-group {
    max-width: 100%;
  }
  
  .primary-filters {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-card {
    min-width: 100%;
  }
  
  .date-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .date-inputs {
    flex-direction: column;
    gap: 12px;
  }
  
  .date-input {
    min-width: 100%;
  }
  
  .filter-actions {
    margin-left: 0;
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .header-top {
    padding: 12px 16px 8px;
  }
  
  .brand-icon {
    width: 48px;
    height: 48px;
  }
  
  .brand-icon .material-icons {
    font-size: 24px;
  }
  
  .brand-title {
    font-size: 1.4rem;
  }
  
  .filters-panel {
    padding: 12px 16px;
  }
}

/* ================================
   MODE SOMBRE (À ACTIVER SI NÉCESSAIRE)
   ================================ */
@media (prefers-color-scheme: dark) {
  .planning-header {
    --surface-light: #1e293b;
    --surface-card: #334155;
    --border-light: #475569;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.3);
    --shadow-card: 0 2px 10px rgba(0, 0, 0, 0.2);
  }
  
  .search-input-wrapper,
  .date-input {
    background: var(--surface-card);
    color: var(--text-primary);
  }
}
</style>
