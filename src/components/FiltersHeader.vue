<template>
  <header class="modern-planning-header">
    <!-- Header principal -->
    <div class="header-main">
      <div class="header-left">
        <div class="app-title">
          <div class="title-icon">
            <span class="material-icons">calendar_today</span>
          </div>
          <div class="title-content">
            <div class="period-display">Planning</div>
          </div>
        </div>
      </div>
      
      <div class="header-right">
        <!-- Bouton filtres mobile -->
        <button class="mobile-filter-btn" @click="$emit('openMobileFilters')">
          <span class="material-icons filter-icon">search</span>
          <span>Filtres</span>
        </button>
      </div>
    </div>
    
    <!-- Section filtres -->
    <div class="filters-section">
      <div class="filters-container">
        <!-- Barre de recherche principale avec indicateur de résultats et suggestions -->
        <div class="search-container">
          <div class="search-wrapper">
            <div class="search-icon">
              <span class="material-icons">search</span>
            </div>
            <input 
              v-model="local.search" 
              type="text"
              placeholder="Rechercher un collaborateur (nom, email, téléphone)..."
              class="search-input"
              @input="onSearchInput"
              @focus="showSuggestions = true"
              @blur="hideSuggestions"
            />
            <!-- Bouton de reset de recherche si elle n'est pas vide -->
            <button 
              v-if="local.search" 
              @click="clearSearch" 
              class="search-clear-btn"
              type="button"
            >
              <span class="material-icons">close</span>
            </button>
          </div>
          
          <!-- Suggestions de recherche intelligentes -->
          <div v-if="showSuggestions && searchSuggestions.length > 0" class="search-suggestions">
            <div 
              v-for="suggestion in searchSuggestions.slice(0, 5)" 
              :key="suggestion.value"
              @click="selectSuggestion(suggestion)"
              class="suggestion-item"
            >
              <span class="material-icons">{{ suggestion.icon }}</span>
              <span class="suggestion-text">{{ suggestion.text }}</span>
              <span class="suggestion-type">{{ suggestion.type }}</span>
            </div>
          </div>
        </div>
        
        <!-- Filtres avancés avec indicateurs visuels -->
        <div class="filters-grid">
          <div class="filter-group">
            <label class="filter-label">
              <span class="material-icons">work</span>
              Métier
              <span v-if="local.metier" class="active-indicator"></span>
            </label>
            <va-select 
              v-model="local.metier" 
              :options="metiers" 
              placeholder="Tous les métiers" 
              clearable 
              class="modern-select" 
            />
          </div>
          
          <div class="filter-group">
            <label class="filter-label">
              <span class="material-icons">location_on</span>
              Lieu
              <span v-if="local.lieu" class="active-indicator"></span>
            </label>
            <va-select 
              v-model="local.lieu" 
              :options="lieux" 
              placeholder="Tous les lieux" 
              clearable 
              class="modern-select" 
            />
          </div>
          
          <div class="filter-group">
            <label class="filter-label">
              <span class="material-icons">info</span>
              Statut
              <span v-if="local.statut" class="active-indicator"></span>
            </label>
            <va-select 
              v-model="local.statut" 
              :options="statuts" 
              placeholder="Tous les statuts" 
              clearable 
              class="modern-select" 
            />
          </div>
          
          <div class="filter-group">
            <label class="filter-label">
              <span class="material-icons">date_range</span>
              Du
              <span v-if="local.dateFrom" class="active-indicator"></span>
            </label>
            <input 
              v-model="local.dateFrom" 
              type="date" 
              class="date-input"
            />
          </div>
          
          <div class="filter-group">
            <label class="filter-label">
              <span class="material-icons">date_range</span>
              Au
              <span v-if="local.dateTo" class="active-indicator"></span>
            </label>
            <input 
              v-model="local.dateTo" 
              type="date" 
              class="date-input"
            />
          </div>
          
          <!-- Bouton de reset de tous les filtres -->
          <div class="filter-group reset-group" v-if="hasActiveFilters">
            <button @click="clearAllFilters" class="clear-all-btn">
              <span class="material-icons">clear_all</span>
              Effacer tous les filtres
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { reactive, watch, computed, ref } from 'vue'

const props = defineProps<{
  viewMode: 'week'|'month'|'table',
  period: string,
  metiers: Array<{text:string,value:string}>,
  lieux: Array<{text:string,value:string}>,
  statuts: Array<{text:string,value:string}>,
  modelValue: { search: string; metier: string; lieu: string; statut: string; dateFrom?: string; dateTo?: string },
}>()

const emit = defineEmits(['update:viewMode','update:modelValue','openMobileFilters','prev','today','next'])

const local = reactive({ dateFrom: '', dateTo: '', ...props.modelValue })
watch(() => props.modelValue, (v) => Object.assign(local, v))
watch(local, () => emit('update:modelValue', { ...local }))

// États pour les suggestions de recherche
const showSuggestions = ref(false)

// Fonction pour gérer la recherche avec debounce
let searchTimeout: number | null = null
function onSearchInput(event: Event) {
  const target = event.target as HTMLInputElement
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    local.search = target.value
  }, 200) // Debounce de 200ms pour éviter trop d'appels
}

// Fonction pour effacer la recherche
function clearSearch() {
  local.search = ''
  showSuggestions.value = false
}

// Computed pour savoir si des filtres sont actifs
const hasActiveFilters = computed(() => {
  return local.search || local.metier || local.lieu || local.statut || local.dateFrom || local.dateTo
})

// Fonction pour effacer tous les filtres
function clearAllFilters() {
  local.search = ''
  local.metier = ''
  local.lieu = ''
  local.statut = ''
  local.dateFrom = ''
  local.dateTo = ''
}

// Suggestions de recherche intelligentes
const searchSuggestions = computed(() => {
  if (!local.search || local.search.length < 2) return []
  
  const suggestions: Array<{value: string, text: string, type: string, icon: string}> = []
  const searchLower = local.search.toLowerCase()
  
  // Suggestions basées sur les métiers
  props.metiers.forEach(metier => {
    if (metier.text.toLowerCase().includes(searchLower)) {
      suggestions.push({
        value: metier.value,
        text: metier.text,
        type: 'Métier',
        icon: 'work'
      })
    }
  })
  
  // Suggestions basées sur les lieux
  props.lieux.forEach(lieu => {
    if (lieu.text.toLowerCase().includes(searchLower)) {
      suggestions.push({
        value: lieu.value,
        text: lieu.text,
        type: 'Lieu',
        icon: 'location_on'
      })
    }
  })
  
  return suggestions.slice(0, 5)
})

// Gestion des suggestions
function selectSuggestion(suggestion: any) {
  if (suggestion.type === 'Métier') {
    local.metier = suggestion.value
  } else if (suggestion.type === 'Lieu') {
    local.lieu = suggestion.value
  }
  local.search = ''
  showSuggestions.value = false
}

function hideSuggestions() {
  // Délai pour permettre le clic sur une suggestion
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}
</script>

<style scoped>
.modern-planning-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--dark-surface);
  border-bottom: 1px solid var(--dark-border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  gap: 24px;
}

.header-left {
  flex: 1;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.title-icon .material-icons {
  font-size: 24px;
}

.title-content h1 {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--dark-text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

.period-display {
  font-size: 1.5rem; /* Plus gros comme sur les autres pages */
  color: var(--dark-text-primary); /* Couleur plus claire */
  font-weight: 700;
  margin-top: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.mobile-filter-btn {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  background: var(--dark-card);
  color: var(--dark-text-primary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mobile-filter-btn:hover {
  background: var(--dark-surface);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.mobile-filter-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.filter-icon {
  font-size: 1.1rem;
}

.filters-section {
  background: var(--dark-surface);
  border-top: 1px solid var(--dark-border);
}

.filters-container {
  padding: 24px 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.search-container {
  margin-bottom: 24px;
  position: relative;
}

.search-wrapper {
  position: relative;
  max-width: 500px;
  display: flex;
  align-items: center;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 4px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--dark-border);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: var(--dark-surface-secondary);
}

.suggestion-item .material-icons {
  font-size: 16px;
  color: var(--dark-text-secondary);
}

.suggestion-text {
  flex: 1;
  color: var(--dark-text-primary);
  font-weight: 500;
}

.suggestion-type {
  font-size: 12px;
  color: var(--dark-text-secondary);
  background: var(--dark-border);
  padding: 2px 8px;
  border-radius: 8px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem;
  color: var(--dark-text-secondary);
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 16px 20px 16px 48px;
  padding-right: 48px; /* Espace pour le bouton clear */
  border: 1px solid var(--dark-border);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 500;
  background: var(--dark-card);
  color: var(--dark-text-primary);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}

.search-clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--dark-text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 2;
}

.search-clear-btn:hover {
  background: var(--dark-surface);
  color: var(--dark-text-primary);
}

.search-clear-btn .material-icons {
  font-size: 18px;
}

.search-input::placeholder {
  color: var(--dark-text-secondary);
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.2);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--dark-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.filter-label .material-icons {
  font-size: 16px;
  color: var(--dark-text-secondary);
}

.active-indicator {
  width: 6px;
  height: 6px;
  background: var(--primary-color);
  border-radius: 50%;
  margin-left: auto;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.reset-group {
  display: flex;
  align-items: end;
}

.clear-all-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--dark-card);
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  color: var(--dark-text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  width: 100%;
  justify-content: center;
}

.clear-all-btn:hover {
  background: var(--dark-surface);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.clear-all-btn .material-icons {
  font-size: 18px;
}

.modern-select {
  --va-select-border-radius: 12px;
  --va-select-padding: 12px 16px;
}

/* Styles pour les dropdowns des filtres - thème sombre */
:deep(.va-select) {
  --va-background-color: var(--dark-card);
  --va-color: var(--dark-text-primary);
  --va-border-color: var(--dark-border);
}

:deep(.va-select__anchor) {
  background: var(--dark-card) !important;
  color: var(--dark-text-primary) !important;
  border-color: var(--dark-border) !important;
}

:deep(.va-select__anchor:hover) {
  border-color: var(--primary-color) !important;
}

:deep(.va-select__anchor:focus-within) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.2) !important;
}

/* Dropdown menu - fond sombre avec texte clair */
:deep(.va-select-dropdown__content),
:deep(.va-select-option-list) {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4) !important;
  z-index: 10000 !important;
  max-height: 300px;
  overflow-y: auto;
}

/* Options dans le dropdown - texte clair sur fond sombre */
:deep(.va-select-option) {
  background: transparent !important;
  color: var(--dark-text-primary) !important;
  padding: 12px 16px !important;
  border-bottom: 1px solid var(--dark-border);
  transition: background-color 0.2s ease;
}

:deep(.va-select-option:last-child) {
  border-bottom: none;
}

:deep(.va-select-option:hover) {
  background: var(--dark-surface-secondary) !important;
  color: var(--dark-text-primary) !important;
}

:deep(.va-select-option--selected) {
  background: var(--primary-color) !important;
  color: #ffffff !important;
}

:deep(.va-select-option--selected:hover) {
  background: var(--primary-color) !important;
  opacity: 0.9;
}

/* Texte du placeholder */
:deep(.va-select__content-wrapper .va-select__placeholder) {
  color: var(--dark-text-secondary) !important;
}

/* Icône de dropdown */
:deep(.va-select__content-wrapper .va-select__append .va-select__toggle-icon) {
  color: var(--dark-text-secondary) !important;
}

/* Clear button */
:deep(.va-select__clear) {
  color: var(--dark-text-secondary) !important;
}

:deep(.va-select__clear:hover) {
  color: var(--dark-text-primary) !important;
}

.date-input {
  padding: 12px 16px;
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  background: var(--dark-card);
  color: var(--dark-text-primary);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}

.date-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.2);
}

.actions-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-actions {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary, .btn-icon {
  position: relative;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.3px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  padding: 14px 20px;
  box-shadow: 0 2px 8px rgba(108, 92, 231, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(108, 92, 231, 0.4);
}

.btn-secondary {
  background: var(--dark-card);
  color: var(--dark-text-primary);
  padding: 14px 20px;
  border: 1px solid var(--dark-border);
}

.btn-secondary:hover {
  background: var(--dark-surface);
  transform: translateY(-1px);
}

.btn-icon {
  background: transparent;
  border: 1px solid var(--dark-border);
  color: var(--dark-text-secondary);
  padding: 14px;
  border-radius: 12px;
  min-width: 50px;
  min-height: 50px;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--dark-card);
  color: var(--dark-text-primary);
  border-color: var(--primary-color);
}

@media (max-width: 1024px) {
  .header-main {
    padding: 16px 24px;
  }
  
  .filters-container {
    padding: 20px 24px;
  }
  
  .filters-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .filters-section {
    display: none;
  }
  
  .mobile-filter-btn {
    display: flex;
  }
  
  .header-main {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .app-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .header-main {
    padding: 12px 16px;
  }
}
</style>
