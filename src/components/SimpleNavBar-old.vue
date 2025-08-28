<template>
  <nav class="simple-navbar">
    <div class="navbar-container">
      <!-- Logo/Brand -->
            <div class="logo-section">
        <img src="/keyplacementlogo.svg" alt="Key Placement" class="logo" />
        <span class="logo-text">Planning</span>
      </div>

      <!-- Menu principal -->
      <div class="navbar-menu">
        <router-link
          v-for="item in menuItems"
          :key="item.name"
          :to="item.path"
          class="menu-item"
          :class="{ active: $route.path === item.path }"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-text">{{ item.label }}</span>
        </router-link>
      </div>

      <!-- Actions utilisateur simplifiées -->
      <div class="navbar-actions">
        <template v-if="!user">
          <button class="action-btn login" @click="goToLogin">
            <span class="action-icon">�</span>
            <span class="action-text">Se connecter</span>
          </button>
        </template>
        <template v-else>
          <span class="user-email">{{ userEmail }}</span>
          <button class="action-btn logout" @click="handleLogout">
            <span class="action-icon">🚪</span>
            <span class="action-text">Se déconnecter</span>
          </button>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { User } from 'firebase/auth'
import { AuthService } from '../services/auth'

const router = useRouter()

const user = ref<User | null>(null)
const userEmail = computed(() => user.value?.email || user.value?.displayName || 'Utilisateur')

const menuItems = ref([
  { name: 'semaine', label: 'Planning', path: '/semaine', icon: '📅' },
  { name: 'import', label: 'Import', path: '/import', icon: '📥' }
])

function goToLogin() {
  router.push('/login')
}

async function handleLogout() {
  try {
    await AuthService.signOut()
    user.value = null
    router.push('/login')
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}

// Lifecycle
onMounted(() => {
  console.log('🧭 Simple NavigationBar component loaded successfully')
  AuthService.onAuthStateChanged((u) => { 
    user.value = u 
    console.log('🔐 État auth changé:', u ? 'connecté' : 'déconnecté')
  })
})
</script>

<style scoped>
/* Design System - Variables */
:root {
  /* Couleurs Key Placement */
  --kp-primary: #0e8388;
  --kp-secondary: #d65745;
  
  /* Système de couleurs neutres */
  --gray-50: #fafafa;
  --gray-100: #f5f5f5;
  --gray-200: #e5e5e5;
  --gray-300: #d4d4d4;
  --gray-400: #a3a3a3;
  --gray-500: #737373;
  --gray-600: #525252;
  --gray-700: #404040;
  --gray-800: #262626;
  --gray-900: #171717;
  
  /* Système de spacing (8pt grid) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

/* Navigation bar */
.simple-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid var(--gray-200);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-sm);
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

/* Logo section */
.logo-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  font-weight: 600;
  font-size: 1.125rem;
  color: var(--kp-primary);
}

.logo {
  height: 32px;
  width: auto;
}

.logo-text {
  color: var(--kp-primary);
  font-weight: 600;
}

/* Navigation menu */
.navbar-menu {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--gray-600);
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid transparent;
}

.menu-item:hover {
  color: var(--kp-primary);
  background: color-mix(in srgb, var(--kp-primary) 8%, transparent);
  border-color: color-mix(in srgb, var(--kp-primary) 20%, transparent);
  transform: translateY(-1px);
}

.menu-item.active {
  color: var(--kp-primary);
  background: color-mix(in srgb, var(--kp-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--kp-primary) 30%, transparent);
  font-weight: 600;
}

.menu-icon {
  font-size: 1.125rem;
}

.menu-text {
  font-weight: inherit;
}

/* User actions */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.user-email {
  color: var(--gray-700);
  font-size: 0.875rem;
  font-weight: 500;
  padding: var(--space-sm) var(--space-md);
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-lg);
  background: white;
  color: var(--gray-700);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.action-btn:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.action-btn.login:hover {
  background: var(--kp-primary);
  border-color: var(--kp-primary);
  color: white;
}

.action-btn.logout:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

.action-icon {
  font-size: 1rem;
}

.action-text {
  font-weight: inherit;
}

/* Responsive design */
@media (max-width: 768px) {
  .navbar-container {
    padding: 0 var(--space-md);
  }
  
  .menu-text {
    display: none;
  }
  
  .user-email {
    display: none;
  }
  
  .action-text {
    display: none;
  }
  
  .logo-text {
    display: none;
  }
}

@media (max-width: 640px) {
  .navbar-menu {
    gap: var(--space-xs);
  }
  
  .menu-item {
    padding: var(--space-sm);
    min-width: 44px;
    justify-content: center;
  }
  
  .action-btn {
    padding: var(--space-sm);
    min-width: 44px;
    justify-content: center;
  }
}

/* Focus pour la navigation clavier */
.menu-item:focus-visible,
.action-btn:focus-visible {
  outline: 2px solid var(--kp-primary);
  outline-offset: 2px;
}
</style>
.simple-navbar {
  background: linear-gradient(135deg, #a7f3d0 0%, #93c5fd 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 1.4rem;
  color: #0e8388;
}

.logo {
  height: 40px;
  width: auto;
}

.logo-text {
  color: #0e8388;
  font-weight: 600;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.navbar-brand:hover {
  transform: scale(1.05);
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  letter-spacing: -0.5px;
}

.navbar-menu {
  display: flex;
  gap: 8px;
  align-items: center;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  text-decoration: none;
  color: #6c757d;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.menu-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(14, 131, 136, 0.1), transparent);
  transition: left 0.5s;
}

.menu-item:hover::before {
  left: 100%;
}

.menu-item:hover {
  background: rgba(14, 131, 136, 0.1);
  color: #0e8388;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(14, 131, 136, 0.2);
}

.menu-item.active {
  background: rgba(14, 131, 136, 0.15);
  border-color: rgba(14, 131, 136, 0.3);
  color: #0e8388;
  box-shadow: 0 4px 15px rgba(14, 131, 136, 0.2);
}

.menu-icon {
  font-size: 1.3rem;
  color: inherit;
}

.menu-text {
  color: inherit;
  font-weight: inherit;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-email {
  color: #0e8388;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 8px 16px;
  background: rgba(14, 131, 136, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(14, 131, 136, 0.2);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid rgba(14, 131, 136, 0.3);
  border-radius: 12px;
  background: rgba(14, 131, 136, 0.1);
  color: #0e8388;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(14, 131, 136, 0.2), transparent);
  transition: left 0.5s;
}

.action-btn:hover::before {
  left: 100%;
}

.action-btn:hover {
  background: rgba(14, 131, 136, 0.2);
  border-color: rgba(14, 131, 136, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(14, 131, 136, 0.3);
}

.action-btn:active {
  transform: translateY(0);
}

.action-btn.logout:hover {
  background: rgba(220, 53, 69, 0.2);
  border-color: rgba(220, 53, 69, 0.4);
  color: #dc3545;
}

.action-icon {
  font-size: 1.1rem;
}

.action-text {
  color: inherit;
  font-weight: inherit;
}

@media (max-width: 768px) {
  .navbar-container {
    padding: 0 16px;
    height: 60px;
  }
  
  .navbar-menu {
    gap: 4px;
  }
  
  .menu-item {
    padding: 10px 12px;
  }
  
  .menu-text {
    display: none;
  }
  
  .user-email {
    display: none;
  }
  
  .action-text {
    display: none;
  }
  
  .navbar-actions {
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .navbar-menu {
    gap: 2px;
  }
  
  .menu-item {
    padding: 8px 10px;
  }
  
  .menu-icon {
    font-size: 1.2rem;
  }
  
  .action-btn {
    padding: 10px 12px;
  }
}
</style>
