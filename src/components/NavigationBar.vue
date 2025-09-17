<template>
  <div class="navigation-wrapper">
    <!-- Navigation principale avec design moderne inspiré du planning admin -->
    <header class="main-navbar">
      <div class="navbar-content">
        <!-- Brand section -->
        <div class="navbar-brand">
          <div class="brand-icon">
            <span class="material-icons">calendar_today</span>
          </div>
          <div class="brand-content">
            <h1 class="brand-title">KeyDispo</h1>
            <p class="brand-subtitle">{{ isCollaborateurInterface ? 'Espace collaborateur' : 'Gestion des disponibilités' }}</p>
          </div>
        </div>
        
        <!-- Navigation items -->
        <nav class="navbar-nav">
          <button 
            v-for="item in navigationItems"
            :key="item.path"
            @click="router.push(item.path)" 
            class="nav-item"
            :class="{ active: $route.path === item.path }"
          >
            <span class="material-icons">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </nav>
        
        <!-- User section -->
        <div class="navbar-user">
          <template v-if="!user">
            <button @click="goToLogin" class="user-action login-btn">
              <span class="material-icons">login</span>
              <span class="action-label">Se connecter</span>
            </button>
          </template>
          <template v-else>
            <div class="user-info">
              <div class="user-avatar">
                <span class="material-icons">account_circle</span>
              </div>
              <div class="user-details">
                <span class="user-email">{{ userEmail }}</span>
                <span class="user-status">Connecté</span>
              </div>
            </div>
            <button @click="handleLogout" class="user-action logout-btn">
              <span class="material-icons">logout</span>
              <span class="action-label">Déconnexion</span>
            </button>
          </template>
        </div>
      </div>
    </header>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { User } from 'firebase/auth'
import { AuthService } from '../services/auth'

// Composables
const router = useRouter()
const route = useRoute()

// Auth state
const user = ref<User | null>(null)
const userEmail = computed(() => user.value?.email || user.value?.displayName || 'Utilisateur')

// Interface detection
const isCollaborateurInterface = computed(() => route.path.startsWith('/collaborateur/'))

// Navigation items based on interface
const navigationItems = computed(() => {
  if (isCollaborateurInterface.value) {
    // Interface collaborateur - navigation simplifiée
    return [
      { path: '/collaborateur/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
      { path: '/collaborateur/planning', label: 'Mon Planning', icon: 'calendar_today' },
      { path: '/collaborateur/profil', label: 'Mon Profil', icon: 'account_circle' }
    ]
  } else {
    // Interface admin - navigation complète
    return [
      { path: '/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
      { path: '/semaine', label: 'Planning', icon: 'calendar_month' },
      { path: '/collaborateurs', label: 'Collaborateurs', icon: 'people' },
      { path: '/import', label: 'Import Excel', icon: 'upload' }
    ]
  }
})

function goToLogin() {
  const loginPath = isCollaborateurInterface.value ? '/collaborateur/login' : '/login'
  router.push(loginPath)
}

async function handleLogout() {
  try {
    await AuthService.signOut()
    user.value = null
    const redirectPath = isCollaborateurInterface.value ? '/collaborateur/dashboard' : '/dashboard'
    router.push(redirectPath)
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}

// Lifecycle
onMounted(() => {
  console.log('🧭 Navigation adaptative montée')
  AuthService.onAuthStateChanged((u) => { 
    user.value = u 
    console.log('🔐 État auth changé:', u ? 'connecté' : 'déconnecté')
  })
})
</script>
<style scoped>
.navigation-wrapper {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--va-background-primary);
}

.main-navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.navbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  min-height: 64px;
  color: white;
}

/* Brand section */
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.brand-icon .material-icons {
  font-size: 24px;
  color: white;
}

.brand-content {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.025em;
  background: linear-gradient(45deg, white, #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: 0.8rem;
  margin: 2px 0 0;
  opacity: 0.9;
  font-weight: 400;
}

/* Navigation items */
.navbar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
}

.nav-item .material-icons {
  font-size: 20px;
}

/* User section */
.navbar-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.user-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.user-avatar .material-icons {
  font-size: 24px;
  color: white;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-email {
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  line-height: 1.2;
}

.user-status {
  font-size: 0.7rem;
  opacity: 0.8;
  color: #a7f3d0;
}

.user-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.login-btn {
  background: rgba(34, 197, 94, 0.8);
  color: white;
  border-color: rgba(34, 197, 94, 0.3);
}

.login-btn:hover {
  background: rgba(34, 197, 94, 1);
  transform: translateY(-1px);
}

.logout-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #fecaca;
  border-color: rgba(239, 68, 68, 0.3);
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: white;
  border-color: rgba(239, 68, 68, 0.5);
}

.user-action .material-icons {
  font-size: 18px;
}

/* Responsive */
@media (max-width: 1024px) {
  .navbar-content {
    padding: 12px 20px;
  }
  
  .brand-subtitle {
    display: none;
  }
  
  .nav-label {
    display: none;
  }
  
  .nav-item {
    padding: 10px 12px;
  }
  
  .user-details {
    display: none;
  }
  
  .action-label {
    display: none;
  }
}

@media (max-width: 768px) {
  .navbar-content {
    padding: 8px 16px;
    min-height: 56px;
  }
  
  .brand-content {
    display: none;
  }
  
  .brand-icon {
    width: 40px;
    height: 40px;
  }
  
  .brand-icon .material-icons {
    font-size: 20px;
  }
  
  .navbar-nav {
    gap: 4px;
  }
  
  .nav-item {
    padding: 8px 10px;
    border-radius: 8px;
  }
  
  .nav-item .material-icons {
    font-size: 18px;
  }
}
</style>
