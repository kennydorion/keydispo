<!-- TABLEAU DE BORD D'URGENCE FIRESTORE -->
<template>
  <div id="emergency-firestore-dashboard" style="
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
    background: #1a1a1a;
    color: white;
    padding: 10px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    min-width: 250px;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  ">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <h4 style="margin: 0; color: #ff6b6b;">🔥 Firestore Monitor</h4>
      <button @click="toggleDashboard" style="
        background: #333;
        border: none;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;
      ">
        {{ collapsed ? '+' : '-' }}
      </button>
    </div>
    
    <div v-if="!collapsed">
      <!-- Compteur principal -->
      <div style="margin-bottom: 10px;">
        <div :style="{
          color: totalReads > 1000 ? '#ff6b6b' : totalReads > 500 ? '#ffa500' : '#4caf50'
        }">
          📊 Total lectures: <strong>{{ totalReads }}</strong>
        </div>
        <div style="
          background: #333;
          height: 6px;
          border-radius: 3px;
          margin: 4px 0;
          overflow: hidden;
        ">
          <div :style="{
            background: totalReads > 1000 ? '#ff6b6b' : totalReads > 500 ? '#ffa500' : '#4caf50',
            height: '100%',
            width: Math.min((totalReads / 2000) * 100, 100) + '%',
            transition: 'width 0.3s ease'
          }"></div>
        </div>
        <div style="font-size: 10px; opacity: 0.7;">
          Quota quotidien: {{ Math.round((totalReads / 50000) * 100) }}%
        </div>
      </div>

      <!-- Top collections -->
      <div style="margin-bottom: 10px;">
        <div style="font-weight: bold; margin-bottom: 4px;">📚 Top Collections:</div>
        <div v-for="(count, collection) in topCollections" :key="collection" 
             style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>{{ collection }}</span>
          <span :style="{
            color: count > 200 ? '#ff6b6b' : count > 100 ? '#ffa500' : '#4caf50'
          }">{{ count }}</span>
        </div>
      </div>

      <!-- Cache stats -->
      <div style="margin-bottom: 10px;">
        <div style="font-weight: bold; margin-bottom: 4px;">💾 Cache:</div>
        <div style="font-size: 11px;">
          <div>Taux de succès: {{ cacheStats.hitRate }}</div>
          <div>Entrées: {{ cacheStats.validEntries }}</div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
        <button @click="resetCounters" style="
          background: #4caf50;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
        ">Reset</button>
        
        <button @click="clearCache" style="
          background: #ff9800;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
        ">Clear Cache</button>
        
        <button @click="enableEmergencyMode" :disabled="emergencyMode" style="
          background: #f44336;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
        ">
          {{ emergencyMode ? 'Mode urgence ON' : 'Mode urgence' }}
        </button>
      </div>

      <!-- Alertes -->
      <div v-if="alerts.length > 0" style="
        margin-top: 8px;
        padding: 4px;
        background: #ff6b6b;
        border-radius: 4px;
        font-size: 10px;
      ">
        🚨 {{ alerts[alerts.length - 1] }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { firestoreCounter } from '../utils/firestoreReadCounter'
import { firestoreCache } from '../utils/emergencyFirestoreCache'
import { emergencyMiddleware } from '../utils/emergencyFirestoreMiddleware'

const collapsed = ref(false)
const totalReads = ref(0)
const operationsByCollection = ref<Record<string, number>>({})
const cacheStats = ref({ hitRate: '0%', validEntries: 0 })
const emergencyMode = ref(false)
const alerts = ref<string[]>([])

let updateInterval: number

const topCollections = computed(() => {
  const sorted = Object.entries(operationsByCollection.value)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
  return Object.fromEntries(sorted)
})

function updateStats() {
  const stats = firestoreCounter.getStats()
  totalReads.value = stats.totalReads
  operationsByCollection.value = stats.operationsByCollection
  cacheStats.value = firestoreCache.getStats()

  // Ajouter des alertes
  if (stats.totalReads > 1000 && !alerts.value.includes('1k lectures dépassées!')) {
    alerts.value.push('1k lectures dépassées!')
  }
  if (stats.totalReads > 2000 && !alerts.value.includes('2k lectures dépassées!')) {
    alerts.value.push('2k lectures dépassées!')
  }
}

function toggleDashboard() {
  collapsed.value = !collapsed.value
}

function resetCounters() {
  firestoreCounter.reset()
  totalReads.value = 0
  operationsByCollection.value = {}
  alerts.value = []
}

function clearCache() {
  firestoreCache.clear()
}

function enableEmergencyMode() {
  emergencyMiddleware.enableEmergencyMode()
  emergencyMode.value = true
  alerts.value.push('Mode d\'urgence activé!')
}

onMounted(() => {
  updateInterval = setInterval(updateStats, 2000)
  updateStats()
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>
