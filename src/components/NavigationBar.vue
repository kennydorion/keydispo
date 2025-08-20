<template>
  <div class="navigation-wrapper">
    <!-- Navigation principale -->
    <va-navbar class="main-navbar" color="primary">
      <template #left>
        <va-navbar-item class="brand">
          <va-icon name="va-calendar" size="large" class="mr-2" color="white" />
          <span class="brand-text">KeyDispo</span>
        </va-navbar-item>
      </template>
      <template #center>
        <va-navbar-item>
          <va-button color="warning" preset="solid" @click="navigateTo({ path: '/semaine', meta: { title: 'Planning', icon: 'va-calendar' } })" class="nav-button" style="color: white; border-color: white;">
            <va-icon name="va-calendar" class="mr-2" color="white" />
            Planning
          </va-button>
        </va-navbar-item>
        
        <va-navbar-item>
          <va-button color="info" preset="solid" @click="navigateTo({ path: '/import', meta: { title: 'Import Excel', icon: 'va-upload' } })" class="nav-button" style="color: white; border-color: white;">
            <va-icon name="va-upload" class="mr-2" color="white" />
            Import Excel
          </va-button>
        </va-navbar-item>
      </template>
      <template #right>
        <va-navbar-item class="nav-actions">
          <template v-if="!user">
            <va-button color="secondary" preset="solid" @click="goToLogin" class="nav-button" style="color: white; border-color: white;">
              <va-icon name="login" class="mr-2" color="white" />
              Se connecter
            </va-button>
          </template>
          <template v-else>
            <span class="user-email">{{ userEmail }}</span>
            <va-button color="secondary" preset="outline" @click="logout" class="nav-button" style="color: white; border-color: white;">
              <va-icon name="logout" class="mr-2" color="white" />
              Se déconnecter
            </va-button>
          </template>
        </va-navbar-item>
      </template>
    </va-navbar>

  <!-- Sous-navigation désactivée pour interface minimaliste -->

    <!-- Panel de notifications -->
    <va-sidebar v-model="showNotifications" position="right" width="400px">
      <div class="notifications-panel">
        <div class="notifications-header">
          <h3>Notifications</h3>
          <va-button
            preset="plain"
            icon="va-close"
            @click="showNotifications = false"
          />
        </div>
        
        <div class="notifications-content">
          <va-list>
            <va-list-item
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-item"
            >
              <va-list-item-section avatar>
                <va-icon 
                  :name="getNotificationIcon(notification.type)" 
                  :color="notification.type === 'error' ? 'danger' : notification.type === 'warning' ? 'warning' : 'info'"
                />
              </va-list-item-section>
              
              <va-list-item-section>
                <va-list-item-label>{{ notification.title }}</va-list-item-label>
                <va-list-item-label caption>{{ notification.message }}</va-list-item-label>
                <va-list-item-label caption>{{ formatTime(notification.timestamp) }}</va-list-item-label>
              </va-list-item-section>
              
              <va-list-item-section side>
                <va-button
                  preset="plain"
                  icon="va-close"
                  size="small"
                  @click="dismissNotification(notification.id)"
                />
              </va-list-item-section>
            </va-list-item>
          </va-list>
          
          <div v-if="notifications.length === 0" class="no-notifications">
            <va-icon name="va-bell" size="large" color="secondary" />
            <p>Aucune notification</p>
          </div>
        </div>
      </div>
    </va-sidebar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { User } from 'firebase/auth'
import { AuthService } from '../services/auth'

// Composables
const router = useRouter()
// Route active non utilisée pour l'instant

// État local
const showNotifications = ref(false)
// Interface minimaliste, états avancés retirés

// Configuration des routes principales
// Routes réduites à la vue principale

// Sections du dashboard
// Éléments avancés masqués pour l'instant

// Notifications
const notifications = ref([
  {
    id: '1',
    type: 'info',
    icon: 'va-info-circle',
    title: 'Import terminé',
    message: '86 collaborateurs importés avec succès',
    timestamp: Date.now() - 5 * 60 * 1000
  },
  {
    id: '2',
    type: 'warning',
    icon: 'va-exclamation-triangle',
    title: 'Données incomplètes',
    message: '3 collaborateurs sans email',
    timestamp: Date.now() - 10 * 60 * 1000
  },
  {
    id: '3',
    type: 'success',
    icon: 'va-check-circle',
    title: 'Cache optimisé',
    message: 'Performance améliorée de 40%',
    timestamp: Date.now() - 15 * 60 * 1000
  }
])

// Métriques de performance (simulées)
// Métriques désactivées

// Computed
// Route courante disponible si besoin

// Sous-navigation désactivée

// Méthodes de navigation
const navigateTo = (targetRoute: any) => {
  router.push(targetRoute.path)
}

// Auth state
const user = ref<User | null>(null)
const userEmail = computed(() => user.value?.email || user.value?.displayName || 'Utilisateur')

function goToLogin() {
  router.push('/login')
}

async function logout() {
  await AuthService.signOut()
  user.value = null
  router.push('/login')
}

// Actions utilisateur avancées retirées pour l'instant

// Gestion des notifications
const dismissNotification = (notificationId: string) => {
  const index = notifications.value.findIndex(n => n.id === notificationId)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case 'success': return 'va-check-circle'
    case 'error': return 'va-exclamation-circle'
    case 'warning': return 'va-exclamation-triangle'
    case 'info': return 'va-info-circle'
    default: return 'va-info-circle'
  }
}

const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  if (hours > 0) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`
  if (minutes > 0) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  return 'À l\'instant'
}

// Mise à jour des métriques de performance
// Indicateurs désactivés pour l'instant

// Lifecycle
onMounted(() => {
  console.log('🧭 Navigation montée')
  AuthService.onAuthStateChanged((u) => { user.value = u })
})

// Watchers
// Watchers simplifiés, rien à faire pour l'instant
</script>

<style scoped>
.navigation-wrapper {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--va-background-primary);
}

.main-navbar {
  box-shadow: var(--va-box-shadow);
  background: linear-gradient(135deg, var(--va-primary), var(--va-primary-dark));
}

.brand {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 1.25rem;
  color: white;
}

.brand-text {
  background: linear-gradient(45deg, white, #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: bold;
}

.nav-button {
  margin: 0 0.25rem;
  transition: all 0.2s ease;
  color: white !important;
  border-color: rgba(255,255,255,0.3) !important;
}

.nav-button:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.1) !important;
  border-color: white !important;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.notification-btn {
  position: relative;
  color: white !important;
}

.notification-btn:hover {
  background: rgba(255,255,255,0.1) !important;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
}

.user-menu-btn {
  display: flex;
  align-items: center;
  color: white !important;
}

.user-menu-btn:hover {
  background: rgba(255,255,255,0.1) !important;
}

.sub-navigation {
  border-bottom: 1px solid var(--va-background-border);
}

.sub-nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.dashboard-nav,
.planning-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.section-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.section-chip:hover {
  transform: translateY(-1px);
}

.planning-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.planning-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.performance-indicators {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.notifications-panel {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--va-background-border);
}

.notifications-content {
  flex: 1;
  overflow-y: auto;
}

.notification-item {
  border-bottom: 1px solid var(--va-background-border);
  transition: background 0.2s ease;
}

.notification-item:hover {
  background: var(--va-background-element);
}

.no-notifications {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--va-text-secondary);
}

@media (max-width: 768px) {
  .sub-nav-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .planning-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .planning-filters {
    justify-content: center;
  }
  
  .performance-indicators {
    justify-content: center;
  }

  .brand-text {
    display: none;
  }
  
  .nav-button span {
    display: none;
  }
}

@media (max-width: 480px) {
  .nav-actions {
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .dashboard-nav,
  .planning-nav {
    justify-content: center;
  }
}
</style>
