<template>
  <div class="system-status-panel">
    <!-- Sync temps réel -->
    <div v-if="isRealtimeActive" class="status-item realtime" @click="$emit('show-realtime-stats')">
      <va-icon name="sync" spin size="14px" />
      <span>Temps réel</span>
      <span class="count">{{ realtimeListenersCount }}</span>
    </div>

    <!-- Utilisateurs actifs sur le planning -->
    <div v-if="activeUsers.length > 0" class="status-item active-users">
      <va-icon name="visibility" size="14px" />
      <span>{{ activeUsers.length }} actif{{ activeUsers.length > 1 ? 's' : '' }}</span>
      
      <div class="active-user-avatars">
        <div 
          v-for="user in activeUsers.slice(0, 5)" 
          :key="user.userId"
          class="active-user-avatar"
          :style="{ backgroundColor: getUserColor(user.userId) }"
          :title="`${user.userName} - ${user.status}`"
        >
          {{ getInitials({ userEmail: user.userName }) }}
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
      
      <div class="mini-avatars">
        <div 
          v-for="user in connectedUsers.slice(0, 4)" 
          :key="user.uid"
          class="mini-avatar"
          :style="{ backgroundColor: getUserColor(user.uid) }"
          :title="getUserStatusTooltip(user)"
        >
          {{ getInitials({ displayName: user.displayName }) }}
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
        @click="$emit('cleanup-sessions')"
        title="Nettoyer sessions expirées"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getUserInitials } from '@/services/avatarUtils'
import type { DisplayUser } from '@/services/sessionDisplayService'

interface ActiveUser {
  userId: string
  userName: string
  status: string
}

const props = defineProps<{
  isRealtimeActive: boolean
  realtimeListenersCount: number
  activeUsers: ActiveUser[]
  connectedUsers: DisplayUser[]
  isEmulatorMode: boolean
  getUserColor: (userId: string) => string
}>()

defineEmits<{
  'show-realtime-stats': []
  'cleanup-sessions': []
}>()

const getInitials = getUserInitials

const uniqueUsersCount = computed(() => {
  const uniqueIds = new Set(props.connectedUsers.map(u => u.uid))
  return uniqueIds.size
})

const totalSessionsCount = computed(() => {
  return props.connectedUsers.reduce((sum, u) => sum + (u.sessions?.length || 1), 0)
})

function getUserStatusTooltip(user: DisplayUser): string {
  const sessions = user.sessions?.length || 1
  return `${user.displayName || user.email} - ${sessions} session${sessions > 1 ? 's' : ''}`
}
</script>

<!-- Pas de styles scoped - utilise les styles globaux de planning-semaine.css -->
