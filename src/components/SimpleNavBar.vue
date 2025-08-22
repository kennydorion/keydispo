<template>
  <nav class="navbar" role="navigation" aria-label="Barre de navigation principale">
    <div class="navbar-container">
      <!-- Logo/Brand -->
      <div class="logo-section" tabindex="0" aria-label="Accueil Key Placement">
        <img src="/keyplacementlogo.svg" alt="Logo Key Placement" class="logo" />
        <span class="logo-text" aria-hidden="true">Planning</span>
      </div>

      <!-- Menu principal -->
      <div class="navbar-menu" role="menubar" aria-label="Menu principal">
        <router-link
          v-for="item in menuItems"
          :key="item.name"
          :to="item.path"
          class="menu-item"
          :class="{ active: $route.path === item.path }"
          role="menuitem"
          :aria-current="$route.path === item.path ? 'page' : undefined"
          tabindex="0"
        >
          <span class="menu-icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="menu-text">{{ item.label }}</span>
        </router-link>
      </div>

      <!-- Actions utilisateur -->
      <div class="navbar-actions" role="group" aria-label="Actions utilisateur">
        <template v-if="!user">
          <button class="action-btn login" @click="goToLogin" aria-label="Se connecter" tabindex="0">
            <span class="action-icon" aria-hidden="true">👤</span>
            <span class="action-text">Se connecter</span>
          </button>
        </template>
        <template v-else>
          <span class="user-email" aria-label="Utilisateur connecté">{{ user.email }}</span>
          <button class="action-btn logout" @click="handleLogout" aria-label="Déconnexion" tabindex="0">
            <span class="action-icon" aria-hidden="true">🚪</span>
            <span class="action-text">Déconnexion</span>
          </button>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthService } from '../services/auth'

const router = useRouter()

const user = ref<User | null>(null)

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
    router.push('/login')
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}

// Observer l'état d'authentification
let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
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

/* Navigation bar - Modern glassmorphism */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255,255,255,0.82);
  border-bottom: 1.5px solid color-mix(in srgb, var(--kp-primary) 12%, var(--gray-200));
  backdrop-filter: blur(18px) saturate(1.2);
  box-shadow: 0 6px 24px 0 rgb(14 131 136 / 0.10), 0 1.5px 0 0 color-mix(in srgb, var(--kp-primary) 8%, transparent);
  min-height: 72px;
  transition: background 0.3s cubic-bezier(.4,1,.7,1), box-shadow 0.3s;
  border-radius: 0 0 32px 32px;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  gap: var(--space-xl);
}

/* Logo section */
.logo-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--kp-primary);
  outline: none;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgb(14 131 136 / 0.08);
}

.logo {
  height: 40px;
  width: auto;
  filter: drop-shadow(0 2px 8px rgba(14,131,136,0.10));
  border-radius: 14px;
  background: rgba(255,255,255,0.7);
  padding: 2px 6px;
}

.logo-text {
  color: var(--kp-primary);
  font-weight: 800;
  font-family: 'Segoe UI', 'Inter', system-ui, sans-serif;
  font-size: 1.18em;
  letter-spacing: 0.04em;
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
  padding: var(--space-sm) var(--space-xl);
  border-radius: 22px;
  text-decoration: none;
  color: var(--gray-600);
  font-weight: 700;
  font-size: 1.08rem;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.18s;
  position: relative;
  border: 1.5px solid transparent;
  min-width: 52px;
  min-height: 46px;
  outline: none;
  box-shadow: 0 1px 4px 0 rgb(14 131 136 / 0.04);
  background: rgba(255,255,255,0.7);
  letter-spacing: 0.01em;
  backdrop-filter: blur(2px);
}

.menu-item:hover,
.menu-item:focus-visible {
  color: var(--kp-primary);
  background: color-mix(in srgb, var(--kp-primary) 16%, white 84%);
  border-color: color-mix(in srgb, var(--kp-primary) 30%, transparent);
  transform: translateY(-2px) scale(1.04);
  outline: 2px solid var(--kp-primary);
  outline-offset: 2px;
  box-shadow: 0 4px 16px 0 rgb(14 131 136 / 0.13);
}

.menu-item.active {
  color: var(--kp-primary);
  background: color-mix(in srgb, var(--kp-primary) 22%, white 78%);
  border-color: var(--kp-primary);
  font-weight: 800;
  outline: 2px solid var(--kp-primary);
  outline-offset: 2px;
  box-shadow: 0 6px 24px 0 rgb(14 131 136 / 0.16);
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
  gap: var(--space-xl);
  min-width: 200px;
}

.user-email {
  color: var(--kp-primary);
  font-size: 1.05rem;
  font-weight: 700;
  padding: var(--space-sm) var(--space-xl);
  background: rgba(14,131,136,0.09);
  border-radius: 22px;
  border: 1.5px solid var(--kp-primary);
  box-shadow: 0 1px 4px 0 rgb(14 131 136 / 0.04);
  letter-spacing: 0.01em;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-xl);
  border: 1.5px solid var(--gray-300);
  border-radius: 22px;
  background: rgba(255,255,255,0.85);
  color: var(--gray-700);
  font-weight: 700;
  font-size: 1.08rem;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.18s;
  text-decoration: none;
  min-width: 52px;
  min-height: 46px;
  outline: none;
  box-shadow: 0 1px 4px 0 rgb(14 131 136 / 0.04);
  letter-spacing: 0.01em;
  backdrop-filter: blur(2px);
}

.action-btn:hover,
.action-btn:focus-visible {
  background: color-mix(in srgb, var(--kp-primary) 14%, white 86%);
  border-color: var(--kp-primary);
  color: var(--kp-primary);
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 4px 16px 0 rgb(14 131 136 / 0.13);
  outline: 2px solid var(--kp-primary);
  outline-offset: 2px;
}

.action-btn.login:hover,
.action-btn.login:focus-visible {
  background: linear-gradient(90deg, var(--kp-primary) 80%, #2ed8c3 100%);
  border-color: var(--kp-primary);
  color: white;
  outline: 2px solid var(--kp-primary);
  outline-offset: 2px;
  box-shadow: 0 6px 24px 0 rgb(14 131 136 / 0.13);
}

.action-btn.logout:hover,
.action-btn.logout:focus-visible {
  background: linear-gradient(90deg, #ef4444 80%, #ffb4b4 100%);
  border-color: #ef4444;
  color: white;
  outline: 2px solid #ef4444;
  outline-offset: 2px;
  box-shadow: 0 6px 24px 0 #ef444433;
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

/* Focus pour la navigation clavier : déjà géré sur chaque bouton/menu-item */
</style>
