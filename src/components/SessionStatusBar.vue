<!--
  Composant SessionStatusBar
  
  Affiche une barre de statut moderne pour les sessions utilisateur :
  - Utilisateurs connectés avec avatars
  - Indicateur multi-onglets
  - Statistiques de synchronisation
  - Actions de maintenance
-->

<template>
  <div class="session-status-bar">
    <!-- Indicateur de synchronisation temps réel -->
    <div 
      v-if="realtimeActive" 
      class="status-item realtime"
      @click="showRealtimeStats"
      title="Synchronisation temps réel active"
    >
      <va-icon name="sync" spin size="14px" />
      <span>Temps réel</span>
      <span class="count">{{ realtimeListeners }}</span>
    </div>

    <!-- Utilisateurs connectés -->
    <div v-if="displayUsers.length > 0" class="status-item users">
      <va-icon name="people" size="14px" />
      <span>{{ stats.uniqueUsers }} utilisateur{{ stats.uniqueUsers > 1 ? 's' : '' }}</span>
      
      <!-- Indicateur sessions multiples -->
      <span v-if="stats.totalSessions > stats.uniqueUsers" class="sessions-info">
        {{ stats.totalSessions }} sessions
      </span>
      
      <!-- Avatars des utilisateurs -->
      <div class="user-avatars">
        <div 
          v-for="user in displayUsers.slice(0, 4)" 
          :key="user.uid"
          class="user-avatar"
          :class="{ 
            'multi-session': user.isMultiSession,
            'status-idle': user.status === 'idle',
            'status-background': user.status === 'background'
          }"
          :style="{ 
            backgroundColor: user.color,
            borderColor: getStatusBorderColor(user.status)
          }"
          :title="getUserTooltip(user)"
        >
          {{ user.initials }}
          
          <!-- Indicateur multi-sessions -->
          <div v-if="user.isMultiSession" class="multi-session-badge">
            {{ user.sessionCount }}
          </div>
          
          <!-- Indicateur d'activité -->
          <div 
            v-if="user.currentActivity" 
            class="activity-indicator"
            :class="`activity-${user.currentActivity.type}`"
            :title="`${user.displayName} ${getActivityText(user.currentActivity.type)}`"
          >
            <va-icon 
              :name="getActivityIcon(user.currentActivity.type)" 
              size="8px" 
            />
          </div>
        </div>
        
        <!-- Indicateur utilisateurs supplémentaires -->
        <div 
          v-if="displayUsers.length > 4" 
          class="user-avatar more-users"
          :title="`+${displayUsers.length - 4} autres utilisateurs`"
        >
          +{{ displayUsers.length - 4 }}
        </div>
      </div>
    </div>

    <!-- Indicateur d'activités importantes -->
    <div 
      v-if="importantActivities.length > 0" 
      class="status-item activities"
      @click="showActivitiesDetail"
      title="Activités en cours"
    >
      <va-icon name="edit" size="14px" />
      <span>{{ importantActivities.length }} cellule{{ importantActivities.length > 1 ? 's' : '' }}</span>
      <div class="activity-types">
        <span v-if="stats.activities.locked > 0" class="activity-badge locked">
          {{ stats.activities.locked }}🔒
        </span>
        <span v-if="stats.activities.editing > 0" class="activity-badge editing">
          {{ stats.activities.editing }}✏️
        </span>
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
        title="Nettoyer les sessions expirées"
      />
    </div>

    <!-- Actions rapides -->
    <div class="status-actions">
      <va-button
        preset="plain"
        size="small"
        icon="info"
        @click="showStatsModal = true"
        title="Voir les statistiques détaillées"
      />
      
      <va-button
        v-if="isEmulatorMode"
        preset="plain"
        size="small"
        icon="bug_report"
        @click="debugMultiUser"
        title="Debug multi-utilisateur"
      />
    </div>
  </div>

  <!-- Modal des statistiques détaillées -->
  <va-modal
    v-model="showStatsModal"
    title="Statistiques multi-utilisateur"
    size="large"
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="modalA11y.onClose"
  >
    <div class="stats-modal">
      <!-- Résumé général -->
      <div class="stats-section">
        <h3>📊 Vue d'ensemble</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats.uniqueUsers }}</div>
            <div class="stat-label">Utilisateurs uniques</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalSessions }}</div>
            <div class="stat-label">Sessions actives</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.activities.total }}</div>
            <div class="stat-label">Activités en cours</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.multiSessionUsers }}</div>
            <div class="stat-label">Multi-onglets</div>
          </div>
        </div>
      </div>

      <!-- Utilisateurs détaillés -->
      <div class="stats-section">
        <h3>👥 Utilisateurs connectés</h3>
        <div class="users-list">
          <div 
            v-for="user in sortedUsers" 
            :key="user.uid"
            class="user-detail"
          >
            <div class="user-avatar-large" :style="{ backgroundColor: user.color }">
              {{ user.initials }}
            </div>
            <div class="user-info">
              <div class="user-name">{{ user.displayName }}</div>
              <div class="user-status">
                <span class="status-badge" :class="`status-${user.status}`">
                  {{ user.status }}
                </span>
                <span v-if="user.isMultiSession" class="session-count">
                  {{ user.sessionCount }} onglets
                </span>
                <span class="last-activity">
                  Actif {{ formatRelativeTime(user.lastActivity) }}
                </span>
              </div>
              <div v-if="user.currentActivity" class="current-activity">
                {{ getActivityText(user.currentActivity.type) }}
                <span v-if="user.currentActivity.collaborateurId">
                  sur {{ user.currentActivity.collaborateurId }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Conflits actuels -->
      <div v-if="conflicts.count > 0" class="stats-section">
        <h3>⚠️ Cellules verrouillées ({{ conflicts.count }})</h3>
        <div class="conflicts-list">
          <div 
            v-for="conflict in conflicts.cells" 
            :key="conflict.cellId"
            class="conflict-item"
          >
            <va-icon name="lock" size="16px" class="conflict-icon" />
            <div class="conflict-info">
              <span class="conflict-cell">{{ conflict.collaborateurId }} - {{ conflict.date }}</span>
              <span class="conflict-owner">verrouillée par {{ conflict.lockOwner }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <va-button @click="showStatsModal = false">Fermer</va-button>
      <va-button 
        v-if="isEmulatorMode"
        preset="primary"
        @click="cleanupSessions"
      >
        Nettoyer les sessions
      </va-button>
    </template>
  </va-modal>

  <!-- Modal des activités détaillées -->
  <va-modal
    v-model="showActivitiesModal"
    title="Activités en cours"
    size="medium"
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="modalA11y.onClose"
  >
    <div class="activities-modal">
      <div 
        v-for="indicator in importantActivities" 
        :key="indicator.cellId"
        class="activity-detail"
      >
        <div class="activity-cell">
          <strong>{{ indicator.collaborateurId }}</strong> - {{ indicator.date }}
        </div>
        <div class="activity-users">
          <div 
            v-for="user in indicator.users.filter(u => !u.isOwn)" 
            :key="user.sessionId"
            class="activity-user"
            :style="{ color: user.color }"
          >
            <va-icon :name="getActivityIcon(user.activityType)" size="14px" />
            {{ user.displayName }} ({{ getActivityText(user.activityType) }})
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <va-button @click="showActivitiesModal = false">Fermer</va-button>
    </template>
  </va-modal>
</template>

<script setup lang="ts">
// COMPOSANT SESSIONSTATUSBAR - VERSION AUTONOME PHASE 3
// ==========================================

import { computed, ref } from 'vue'
import { useModalA11y } from '@/composables/useModalA11y'
import { useToast } from 'vuestic-ui'
import { useSessionDisplay } from '../services/sessionDisplayService'
import type { DisplayUser } from '../services/sessionDisplayService'

// Utiliser directement le service sans props externes
const sessionDisplay = useSessionDisplay()

// Propriétés réactives depuis le service
const displayUsers = computed(() => sessionDisplay.users.value)
const sortedUsers = computed(() => sessionDisplay.sortedUsers.value) 
const stats = computed(() => sessionDisplay.stats.value)
const importantActivities = computed(() => sessionDisplay.getImportantCellIndicators())
const conflicts = computed(() => sessionDisplay.getCurrentConflicts())

// État système depuis le service
const realtimeActive = computed(() => sessionDisplay.realtimeActive.value)
const realtimeListeners = computed(() => sessionDisplay.realtimeListeners.value.length)
const isEmulatorMode = computed(() => sessionDisplay.isEmulatorMode.value)

interface Emits {
  (e: 'cleanup-sessions'): void
  (e: 'show-realtime-stats'): void
  (e: 'debug-multi-user'): void
}

const emit = defineEmits<Emits>()

// ==========================================
// STATE RÉACTIF
// ==========================================

const showStatsModal = ref(false)
const showActivitiesModal = ref(false)
const { notify } = useToast()
const modalA11y = useModalA11y()

// ==========================================
// MÉTHODES UTILITAIRES
// ==========================================

function getStatusBorderColor(status: string): string {
  const colors = {
    online: '#10b981',
    idle: '#f59e0b',
    background: '#6b7280',
    offline: '#ef4444'
  }
  return colors[status as keyof typeof colors] || '#6b7280'
}

function getUserTooltip(user: DisplayUser): string {
  const sessionInfo = user.isMultiSession ? ` (${user.sessionCount} onglets)` : ''
  let activityInfo = ''
  
  if (user.currentActivity) {
    const activityText = getActivityText(user.currentActivity.type)
    if (user.currentActivity.collaborateurId && user.currentActivity.date) {
      activityInfo = ` • ${activityText} ${user.currentActivity.collaborateurId}-${user.currentActivity.date}`
    } else {
      activityInfo = ` • ${activityText}`
    }
  }
  
  return `${user.displayName} - ${user.status}${sessionInfo}${activityInfo}`
}

function getActivityText(type: string): string {
  const texts = {
    viewing: 'consulte',
    hovering: 'survole',
    editing: 'édite',
    modal: 'édite'
  }
  return texts[type as keyof typeof texts] || type
}

function getActivityIcon(type: string): string {
  const icons = {
    viewing: 'visibility',
    hovering: 'mouse',
    editing: 'edit',
    modal: 'edit',
    locked: 'lock'
  }
  return icons[type as keyof typeof icons] || 'help'
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffMinutes < 1) return 'à l\'instant'
  if (diffMinutes < 60) return `il y a ${diffMinutes}min`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `il y a ${diffHours}h`
  
  const diffDays = Math.floor(diffHours / 24)
  return `il y a ${diffDays}j`
}

// ==========================================
// ACTIONS
// ==========================================

function showRealtimeStats() {
  emit('show-realtime-stats')
}

function showActivitiesDetail() {
  showActivitiesModal.value = true
}

function cleanupSessions() {
  emit('cleanup-sessions')
  notify({
    title: 'Nettoyage',
    message: 'Nettoyage des sessions lancé',
    color: 'info',
    duration: 2000
  })
}

function debugMultiUser() {
  emit('debug-multi-user')
}
</script>

<style scoped>
.session-status-bar {
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
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.status-item.realtime {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.status-item.users {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-item.activities {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.status-item.emulator {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.count {
  background: currentColor;
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.sessions-info {
  font-size: 10px;
  opacity: 0.8;
  margin-left: 4px;
}

.user-avatars {
  display: flex;
  gap: 2px;
  margin-left: 6px;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  position: relative;
  transition: all 0.2s ease;
}

.user-avatar.multi-session {
  border-color: #f59e0b;
  box-shadow: 0 0 0 1px #fbbf24;
}

.user-avatar.status-idle {
  opacity: 0.7;
}

.user-avatar.status-background {
  opacity: 0.5;
}

.user-avatar.more-users {
  background: #6b7280;
  font-size: 8px;
}

.multi-session-badge {
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
  border: 1px solid white;
}

.activity-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid white;
}

.activity-indicator.activity-editing {
  background: #3b82f6;
  color: white;
}

.activity-indicator.activity-viewing {
  background: #10b981;
  color: white;
}

.activity-indicator.activity-hovering {
  background: #f59e0b;
  color: white;
}

.activity-types {
  display: flex;
  gap: 4px;
  margin-left: 4px;
}

.activity-badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
}

.status-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

/* Modal styles */
.stats-modal {
  max-height: 70vh;
  overflow-y: auto;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
  padding: 12px;
  border: 1px solid var(--va-background-secondary);
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--va-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--va-text-secondary);
  margin-top: 4px;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-detail {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--va-background-secondary);
  border-radius: 8px;
}

.user-avatar-large {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--va-text-secondary);
}

.status-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 600;
}

.status-badge.status-online {
  background: #10b981;
  color: white;
}

.status-badge.status-idle {
  background: #f59e0b;
  color: white;
}

.status-badge.status-background {
  background: #6b7280;
  color: white;
}

.session-count {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.current-activity {
  font-size: 12px;
  color: var(--va-primary);
  margin-top: 4px;
}

.conflicts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conflict-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
}

.conflict-icon {
  color: #ef4444;
}

.conflict-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conflict-cell {
  font-weight: 600;
}

.conflict-owner {
  font-size: 12px;
  color: var(--va-text-secondary);
}

.activities-modal {
  max-height: 50vh;
  overflow-y: auto;
}

.activity-detail {
  padding: 12px;
  border: 1px solid var(--va-background-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
}

.activity-cell {
  font-weight: 600;
  margin-bottom: 8px;
}

.activity-users {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-user {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}
</style>
