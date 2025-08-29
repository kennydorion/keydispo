<!--
  Panneau d'état centralisé du planning
  Extrait de SemaineVirtualClean.vue pour améliorer la modularité
-->
<template>
  <div class="system-status-panel">
    <!-- Sync temps réel -->
    <div v-if="isRealtimeActive" class="status-item realtime" @click="$emit('showRealtimeStats')">
      <va-icon name="sync" spin size="14px" />
      <span>Temps réel</span>
      <span class="count">{{ realtimeListeners.length }}</span>
    </div>

    <!-- Utilisateurs actifs sur le planning -->
    <div v-if="activeUsers.length > 0" class="status-item active-users">
      <va-icon name="visibility" size="14px" />
      <span>{{ activeUsers.length }} actif{{ activeUsers.length > 1 ? 's' : '' }}</span>
      
      <!-- Initiales des utilisateurs actifs -->
      <div class="active-user-avatars">
        <div 
          v-for="user in activeUsers.slice(0, 5)" 
          :key="user.userId"
          class="active-user-avatar"
          :style="{ backgroundColor: getUserColor(user.userId) }"
          :title="`${user.userName} - ${user.status}`"
        >
          {{ getUserInitials({ userEmail: user.userName }) }}
        </div>
        <div v-if="activeUsers.length > 5" class="active-user-avatar more">
          +{{ activeUsers.length - 5 }}
        </div>
      </div>
    </div>

    <!-- Utilisateurs connectés -->
    <div v-if="connectedUsers.length > 0" class="status-item users">
      <va-icon name="people" size="14px" />
      <span>{{ uniqueUsersCount }} utilisateur{{ uniqueUsersCount > 1 ? 's' : '' }}</span>
      <span v-if="totalSessionsCount > uniqueUsersCount" class="count">
        {{ totalSessionsCount }} sessions
      </span>
      
      <!-- Avatars simplifiés -->
      <div class="mini-avatars">
        <div 
          v-for="user in connectedUsers.slice(0, 4)" 
          :key="user.uid"
          class="mini-avatar"
          :style="{ backgroundColor: getUserColor(user.uid) }"
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
        @click="$emit('cleanupSessions')"
        title="Nettoyer sessions expirées"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getUserInitials, getUserColor } from '../../services/avatarUtils'

interface ActiveUser {
  userId: string
  userName: string
  status: string
}

interface ConnectedUser {
  uid: string
  displayName?: string
  [key: string]: any
}

interface Props {
  isRealtimeActive: boolean
  realtimeListeners: string[]
  activeUsers: ActiveUser[]
  connectedUsers: ConnectedUser[]
  isEmulatorMode: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  showRealtimeStats: []
  cleanupSessions: []
}>()

// Computed pour les statistiques utilisateurs
const uniqueUsersCount = computed(() => {
  const uniqueUids = new Set(props.connectedUsers.map(user => user.uid))
  return uniqueUids.size
})

const totalSessionsCount = computed(() => props.connectedUsers.length)

// Helper pour le tooltip des utilisateurs
function getUserStatusTooltip(user: ConnectedUser): string {
  return user.displayName || user.uid
}
</script>

<style scoped>
.system-status-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  margin-bottom: 16px;
  min-height: 40px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.status-item.realtime {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  cursor: pointer;
}

.status-item.realtime:hover {
  background: rgba(76, 175, 80, 0.2);
}

.status-item.active-users {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
}

.status-item.users {
  background: rgba(156, 39, 176, 0.1);
  color: #9C27B0;
}

.status-item.emulator {
  background: rgba(255, 193, 7, 0.1);
  color: #FFC107;
}

.count {
  background: currentColor;
  color: white;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
}

.active-user-avatars {
  display: flex;
  gap: 4px;
  margin-left: 4px;
}

.active-user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: white;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.active-user-avatar.more {
  background: #666;
  font-size: 9px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: white;
  border: 1px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.mini-avatar.more {
  background: #888;
  font-size: 8px;
}

/* Responsive pour mobile */
@media (max-width: 768px) {
  .system-status-panel {
    gap: 8px;
    padding: 6px 12px;
    margin-bottom: 12px;
  }
  
  .status-item {
    font-size: 11px;
    padding: 3px 6px;
    gap: 4px;
  }
  
  .active-user-avatar,
  .mini-avatar {
    width: 18px;
    height: 18px;
    font-size: 8px;
  }
}
</style>
