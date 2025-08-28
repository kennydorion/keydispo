<template>
  <div class="notification-bell" v-if="showNotifications">
    <!-- Bouton notification avec badge -->
    <button 
      class="notification-btn"
      @click="togglePanel"
      :class="{ 'has-unread': unreadCount > 0 }"
      :title="`${unreadCount} notifications non lues`"
    >
      <i class="material-icons">notifications</i>
      <span v-if="unreadCount > 0" class="notification-badge">
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Panel des notifications -->
    <transition name="fade-slide">
      <div v-if="showPanel" class="notification-panel" @click.stop>
        <div class="panel-header">
          <h3>Notifications</h3>
          <div class="header-actions">
            <button 
              v-if="unreadCount > 0"
              @click="markAllAsRead"
              class="mark-all-btn"
              title="Marquer tout comme lu"
            >
              ✓
            </button>
            <button 
              @click="clearAll"
              class="clear-all-btn"
              title="Supprimer toutes les notifications"
            >
              🗑️
            </button>
            <button @click="closePanel" class="close-btn">✕</button>
          </div>
        </div>

        <div class="panel-content">
          <!-- Liste des notifications -->
          <div v-if="recentNotifications.length > 0" class="notifications-list">
            <div 
              v-for="notification in recentNotifications"
              :key="notification.id"
              class="notification-item"
              :class="{ 
                'unread': isUnread(notification),
                'persistent': notification.persistent,
                [`type-${notification.type}`]: true
              }"
            >
              <div class="notification-icon">
                <i class="material-icons">{{ getNotificationIcon(notification.type) }}</i>
              </div>
              
              <div class="notification-content">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-message">{{ notification.message }}</div>
                <div class="notification-time">{{ formatTime(notification.timestamp) }}</div>
              </div>

              <div class="notification-actions">
                <button 
                  v-if="notification.action"
                  @click="notification.action.handler"
                  class="action-btn"
                >
                  {{ notification.action.label }}
                </button>
                <button 
                  @click="removeNotification(notification.id)"
                  class="remove-btn"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <!-- État vide -->
          <div v-else class="empty-state">
            <i class="material-icons">notifications_none</i>
            <p>Aucune notification</p>
          </div>
        </div>

        <div class="panel-footer">
          <div class="stats">
            {{ stats.total }} notification{{ stats.total > 1 ? 's' : '' }} 
            · {{ stats.unread }} non lue{{ stats.unread > 1 ? 's' : '' }}
          </div>
          <button 
            @click="setEnabled(!isEnabled)"
            class="toggle-btn"
            :class="{ disabled: !isEnabled }"
          >
            {{ isEnabled ? '🔔' : '🔕' }}
          </button>
        </div>
      </div>
    </transition>

    <!-- Overlay pour fermer le panel -->
    <div v-if="showPanel" class="notification-overlay" @click="closePanel"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMultiUserNotifications } from '../services/multiUserNotificationService'

// ==========================================
// COMPOSABLE NOTIFICATIONS
// ==========================================

const {
  notifications,
  recentNotifications, 
  unreadCount,
  stats,
  isEnabled,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAll,
  setEnabled
} = useMultiUserNotifications()

// ==========================================
// ÉTAT LOCAL
// ==========================================

const showPanel = ref(false)
const unreadNotificationIds = ref(new Set<string>())

// Affichage conditionnel des notifications
const showNotifications = computed(() => {
  // Afficher seulement si il y a eu des notifications ou si panel ouvert
  return notifications.value.length > 0 || showPanel.value
})

// ==========================================
// MÉTHODES
// ==========================================

function togglePanel() {
  showPanel.value = !showPanel.value
}

function closePanel() {
  showPanel.value = false
}

function isUnread(notification: any): boolean {
  return unreadNotificationIds.value.has(notification.id)
}

function getNotificationIcon(type: string): string {
  const iconMap = {
    'user-join': 'person_add',
    'user-leave': 'person_remove', 
    'cell-conflict': 'warning',
    'session-expired': 'schedule',
    'info': 'info'
  }
  return iconMap[type as keyof typeof iconMap] || 'notifications'
}

function formatTime(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `${minutes}min`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  
  const days = Math.floor(hours / 24)
  return `${days}j`
}

// ==========================================
// GESTION DES NOTIFICATIONS NON LUES
// ==========================================

// Suivre les nouvelles notifications pour les marquer comme non lues
let lastNotificationCount = 0

function updateUnreadTracking() {
  const currentNotifications = notifications.value
  
  if (currentNotifications.length > lastNotificationCount) {
    // Nouvelles notifications
    const newNotifications = currentNotifications.slice(0, currentNotifications.length - lastNotificationCount)
    newNotifications.forEach(notification => {
      unreadNotificationIds.value.add(notification.id)
    })
  }
  
  lastNotificationCount = currentNotifications.length
}

// Surveiller les changements de notifications
const unwatchNotifications = computed(() => {
  updateUnreadTracking()
  return notifications.value.length
})

// Marquer comme lu quand le panel est ouvert
function markVisibleAsRead() {
  if (showPanel.value) {
    recentNotifications.value.forEach(notification => {
      if (unreadNotificationIds.value.has(notification.id)) {
        unreadNotificationIds.value.delete(notification.id)
        markAsRead(notification.id)
      }
    })
  }
}

// ==========================================
// CYCLE DE VIE
// ==========================================

onMounted(() => {
  // Marquer les notifications visibles comme lues quand le panel s'ouvre
  const unwatchPanel = computed(() => {
    if (showPanel.value) {
      setTimeout(markVisibleAsRead, 1000) // Délai pour que l'utilisateur les voie
    }
    return showPanel.value
  })
  
  // Fermer le panel si on clique ailleurs
  document.addEventListener('click', closePanel)
})

onUnmounted(() => {
  document.removeEventListener('click', closePanel)
})
</script>

<style scoped>
.notification-bell {
  position: relative;
  display: inline-block;
}

.notification-btn {
  position: relative;
  background: none;
  border: none;
  color: var(--dark-text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--dark-text-primary);
}

.notification-btn.has-unread {
  color: #ffc107;
  animation: pulse 2s infinite;
}

.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #dc3545;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
  line-height: 1;
}

.notification-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 350px;
  max-height: 500px;
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
  margin-top: 8px;
}

.notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--dark-border);
  background: var(--dark-background);
}

.panel-header h3 {
  margin: 0;
  color: var(--dark-text-primary);
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions button {
  background: none;
  border: none;
  color: var(--dark-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 14px;
  transition: background 0.2s;
}

.header-actions button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--dark-text-primary);
}

.panel-content {
  max-height: 400px;
  overflow-y: auto;
}

.notifications-list {
  padding: 8px 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.notification-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.notification-item.unread {
  background: rgba(0, 123, 255, 0.1);
  border-left: 3px solid #007bff;
}

.notification-item.persistent {
  border-left: 3px solid #ffc107;
}

.notification-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.type-user-join .notification-icon {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.type-user-leave .notification-icon {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
}

.type-cell-conflict .notification-icon {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.type-session-expired .notification-icon {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  color: var(--dark-text-primary);
  font-size: 14px;
  margin-bottom: 4px;
}

.notification-message {
  color: var(--dark-text-secondary);
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.notification-time {
  color: var(--dark-text-tertiary);
  font-size: 11px;
}

.notification-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.action-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #0056b3;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--dark-text-tertiary);
  cursor: pointer;
  padding: 2px;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.remove-btn:hover {
  opacity: 1;
  color: #dc3545;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--dark-text-secondary);
}

.empty-state .material-icons {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--dark-border);
  background: var(--dark-background);
}

.stats {
  color: var(--dark-text-tertiary);
  font-size: 11px;
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--dark-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 16px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toggle-btn.disabled {
  opacity: 0.5;
}

/* Animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive */
@media (max-width: 768px) {
  .notification-panel {
    width: 320px;
    right: -8px;
  }
}
</style>
