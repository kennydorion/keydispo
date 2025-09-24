<template>
  <div class="debug-panel" v-if="showDebug">
    <div class="debug-header">
      <h3>🔍 Debug Filtres Planning</h3>
      <button @click="showDebug = false" class="close-btn">✕</button>
    </div>
    
    <div class="debug-content">
      <div class="debug-section">
        <h4>📊 État des Filtres</h4>
        <div class="debug-item">
          <strong>Métier:</strong> "{{ planningFilters.filterState.metier }}"
        </div>
        <div class="debug-item">
          <strong>Lieu:</strong> "{{ planningFilters.filterState.lieu }}"
        </div>
        <div class="debug-item">
          <strong>Statut:</strong> "{{ planningFilters.filterState.statut }}"
        </div>
        <div class="debug-item">
          <strong>Date From:</strong> "{{ planningFilters.filterState.dateFrom }}"
        </div>
        <div class="debug-item">
          <strong>Date To:</strong> "{{ planningFilters.filterState.dateTo }}"
        </div>
      </div>

      <div class="debug-section">
        <h4>📈 Statistiques</h4>
        <div class="debug-item">
          <strong>Total Collaborateurs:</strong> {{ planningData.filterStats.value.totalCollaborateurs }}
        </div>
        <div class="debug-item">
          <strong>Collaborateurs Filtrés:</strong> {{ planningData.filterStats.value.filteredCollaborateurs }}
        </div>
        <div class="debug-item">
          <strong>Total Disponibilités:</strong> {{ planningData.filterStats.value.totalDisponibilites }}
        </div>
        <div class="debug-item">
          <strong>Disponibilités Filtrées:</strong> {{ planningData.filterStats.value.filteredDisponibilites }}
        </div>
      </div>

      <div class="debug-section">
        <h4>👥 Options Disponibles</h4>
        <div class="debug-item">
          <strong>Métiers:</strong> {{ planningFilters.metiersOptions.value.map(m => m.text).join(', ') }}
        </div>
        <div class="debug-item">
          <strong>Lieux:</strong> {{ planningFilters.lieuxOptions.value.map(l => l.text).join(', ') }}
        </div>
      </div>

      <div class="debug-section" v-if="sampleData.length > 0">
        <h4>📋 Échantillon de Données (5 premiers)</h4>
        <div v-for="(item, index) in sampleData.slice(0, 5)" :key="index" class="sample-item">
          <div><strong>{{ item.nom }} {{ item.prenom }}</strong> ({{ item.metier }})</div>
          <div>{{ item.date }} - {{ item.lieu }} - {{ getDispoType(item) }}</div>
        </div>
      </div>

      <div class="debug-actions">
        <button @click="refreshData" class="refresh-btn">🔄 Actualiser</button>
        <button @click="logToConsole" class="log-btn">📝 Log Console</button>
        <button @click="testADVFilter" class="test-btn">🧪 Test Filtre ADV</button>
      </div>
    </div>
  </div>
  
  <!-- Bouton flottant pour ouvrir le debug -->
  <button v-else @click="showDebug = true" class="debug-toggle">
    🔍 Debug
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePlanningFilters } from '../../composables/usePlanningFilters'
import { usePlanningData } from '../../composables/usePlanningData'
import { resolveDispoKind } from '../../services/planningDisplayService'

const showDebug = ref(false)
const planningFilters = usePlanningFilters()
const planningData = usePlanningData()

const sampleData = computed(() => {
  return planningData.filteredDisponibilites.value || []
})

const getDispoType = (dispo: any) => {
  try {
    const kind = resolveDispoKind(dispo)
    return kind.type
  } catch (error) {
    return 'error'
  }
}

const refreshData = async () => {
  
  try {
    await planningData.loadCollaborateurs()
    
  } catch (error) {
    console.error('❌ [DEBUG] Erreur rechargement:', error)
  }
}

const logToConsole = () => {
  /*
  console.log('🔍 [DEBUG] État complet des filtres:', {
    filters: planningFilters.filterState,
    stats: planningData.filterStats.value,
    sampleDispos: sampleData.value.slice(0, 3),
    metiersOptions: planningFilters.metiersOptions.value,
    lieuxOptions: planningFilters.lieuxOptions.value
  })
  */
}

const testADVFilter = () => {
  
  
  // Appliquer les filtres du cas problématique
  planningFilters.updateFilters({
    metier: 'AS',
    lieu: 'ADV', 
    statut: 'En mission',
    dateFrom: '2025-09-15',
    dateTo: '2025-09-15'
  })
  
  
}

onMounted(() => {
  // Auto-ouvrir en mode développement
  if (import.meta.env.DEV) {
    setTimeout(() => {
      
    }, 1000)
    
    // Exposer les instances pour debug global
    if (typeof window !== 'undefined') {
      (window as any).__planningData = planningData
      ;(window as any).__planningFilters = planningFilters
      
      // Fonctions utilitaires debug
      ;(window as any).diagnoseFiltreADV = () => {
        
      }
      
      ;(window as any).testScenarioADV = () => {
        
        planningFilters.updateFilters({
          metier: 'AS',
          lieu: 'ADV',
          statut: 'En mission',
          dateFrom: '2025-09-15',
          dateTo: '2025-09-15'
        })
        setTimeout(() => {
          
        }, 500)
      }
      
      
    }
  }
})
</script>

<style scoped>
.debug-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.debug-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 10px 10px 0 0;
}

.debug-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.debug-content {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.debug-section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.debug-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.debug-section h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.debug-item {
  margin: 4px 0;
  padding: 4px 8px;
  background: #f8fafc;
  border-radius: 4px;
  word-break: break-all;
}

.debug-item strong {
  color: #1f2937;
}

.sample-item {
  margin: 6px 0;
  padding: 6px 8px;
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  font-size: 11px;
}

.debug-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.debug-actions button {
  flex: 1;
  min-width: 80px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn {
  background: #10b981;
  color: white;
}

.refresh-btn:hover {
  background: #059669;
}

.log-btn {
  background: #3b82f6;
  color: white;
}

.log-btn:hover {
  background: #2563eb;
}

.test-btn {
  background: #f59e0b;
  color: white;
}

.test-btn:hover {
  background: #d97706;
}

.debug-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 25px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9998;
  transition: all 0.3s;
}

.debug-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
</style>
