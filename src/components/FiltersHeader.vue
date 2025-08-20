<template>
  <header class="app-header">
    <div class="header-content">
      <div class="header-left">
        <h1 class="app-title">
          <va-icon name="calendar_today" class="title-icon" />
          Planning Équipe
        </h1>
        <div class="period-display" v-if="viewMode !== 'table'">{{ period }}</div>
      </div>
      
      <div class="header-right">
        <va-button-group>
          <va-button :color="viewMode === 'week' ? 'primary' : 'secondary'" icon="view_week" size="small" @click="$emit('update:viewMode','week')"><span class="btn-text">Semaine</span></va-button>
          <va-button :color="viewMode === 'month' ? 'primary' : 'secondary'" icon="calendar_view_month" size="small" @click="$emit('update:viewMode','month')"><span class="btn-text">Mois</span></va-button>
          <va-button :color="viewMode === 'table' ? 'primary' : 'secondary'" icon="table_chart" size="small" @click="$emit('update:viewMode','table')"><span class="btn-text">Tableau</span></va-button>
        </va-button-group>
        <va-button class="mobile-filter-btn" icon="tune" color="secondary" size="small" @click="$emit('openMobileFilters')">Filtres</va-button>
      </div>
    </div>
    
    <div class="filters-desktop">
      <div class="filters-grid">
        <va-input v-model="local.search" placeholder="Rechercher un collaborateur..." class="search-field">
          <template #prependInner><va-icon name="search" /></template>
        </va-input>
        <va-select v-model="local.metier" :options="metiers" placeholder="Métier" clearable class="filter-field" />
        <va-select v-model="local.lieu" :options="lieux" placeholder="Lieu" clearable class="filter-field" />
        <va-select v-model="local.statut" :options="statuts" placeholder="Statut" clearable class="filter-field" />
        <va-input v-model="local.dateFrom" type="date" placeholder="Du" class="filter-field" />
        <va-input v-model="local.dateTo" type="date" placeholder="Au" class="filter-field" />
      </div>
      <div class="nav-stats-row">
        <div class="navigation-controls" v-if="viewMode !== 'table'">
          <va-button icon="chevron_left" preset="secondary" size="small" @click="$emit('prev')" />
          <va-button preset="primary" size="small" @click="$emit('today')">Aujourd'hui</va-button>
          <va-button icon="chevron_right" preset="secondary" size="small" @click="$emit('next')" />
        </div>
        <div class="stats-info">
          <va-chip color="info" size="small">{{ statsCollaborateurs }} collaborateurs</va-chip>
          <va-chip color="success" size="small">{{ statsDispos }} disponibilités</va-chip>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

const props = defineProps<{
  viewMode: 'week'|'month'|'table',
  period: string,
  metiers: Array<{text:string,value:string}>,
  lieux: Array<{text:string,value:string}>,
  statuts: Array<{text:string,value:string}>,
  modelValue: { search: string; metier: string; lieu: string; statut: string; dateFrom?: string; dateTo?: string },
  statsCollaborateurs: number,
  statsDispos: number,
}>()

const emit = defineEmits(['update:viewMode','update:modelValue','openMobileFilters','prev','today','next'])

const local = reactive({ dateFrom: '', dateTo: '', ...props.modelValue })
watch(() => props.modelValue, (v) => Object.assign(local, v))
watch(local, () => emit('update:modelValue', { ...local }))
</script>

<style scoped>
/* styles allégés, s'appuie sur ceux existants dans la page */
.app-header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); }
.header-content { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; }
.app-title { margin:0; display:flex; align-items:center; gap:.75rem; font-size:1.5rem; font-weight:700; }
.filters-desktop { padding:1rem 1.5rem; }
.filters-grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:1rem; margin-bottom:1rem; }
.nav-stats-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
.mobile-filter-btn { display:none; }
@media (max-width: 768px) { .filters-desktop{ display:none; } .mobile-filter-btn{ display:flex; } }
</style>
