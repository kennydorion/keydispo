<template>
  <nav class="navbar">
    <!-- Mobile burger menu -->
    <button 
      class="navbar-toggle"
      @click="toggleMobileMenu"
      :class="{ active: showMobileMenu }"
      aria-label="Menu"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>

    <!-- Logo -->
    <div class="navbar-brand">
      <img src="/keyplacement_logo_blanc.svg" alt="Key Placement" class="navbar-logo" />
    </div>

    <!-- Desktop Navigation -->
    <div class="navbar-nav">
      <router-link 
        v-for="item in navigationItems" 
        :key="item.path"
        :to="item.path" 
        class="navbar-link"
        :class="{ active: isActiveRoute(item.path) }"
      >
        <i class="material-icons">{{ item.icon }}</i>
        <span>{{ item.label }}</span>
      </router-link>
    </div>

    <!-- User Avatar & Actions -->
    <div class="navbar-actions">
      <div class="navbar-user" ref="userMenuRef">
        <button 
          class="navbar-avatar" 
          @click="toggleUserMenu"
          :style="{ backgroundColor: avatarColor }"
          aria-label="Menu utilisateur"
        >
          {{ avatarInitials }}
        </button>
        
        <!-- User dropdown menu -->
        <div v-if="showUserMenu" class="user-dropdown">
          <div class="user-info">
            <div class="user-avatar" :style="{ backgroundColor: avatarColor }">
              {{ avatarInitials }}
            </div>
            <div class="user-details">
              <div class="user-name">{{ userName }}</div>
              <div class="user-email">{{ userEmail }}</div>
            </div>
          </div>
          <hr class="dropdown-divider" />
          <!-- Option pour changer d'interface (pour les admins seulement) -->
          <button class="dropdown-item" @click="toggleInterface" v-if="!isCollaborateurInterface && canAccessAdmin">
            <i class="material-icons">switch_account</i>
            <span>Interface Collaborateur</span>
          </button>
          <button class="dropdown-item" @click="toggleInterface" v-if="isCollaborateurInterface && canAccessAdmin">
            <i class="material-icons">admin_panel_settings</i>
            <span>Interface Admin</span>
          </button>
          <hr class="dropdown-divider" />
          <button class="dropdown-item" @click="goToSettings">
            <i class="material-icons">{{ isCollaborateurInterface ? 'account_circle' : 'settings' }}</i>
            <span>{{ isCollaborateurInterface ? 'Mon Profil' : 'Paramètres' }}</span>
          </button>
          <button class="dropdown-item" @click="signOut">
            <i class="material-icons">logout</i>
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile overlay -->
    <div 
      v-if="showMobileMenu" 
      class="mobile-overlay"
      @click="closeMobileMenu"
    ></div>

    <!-- Mobile menu -->
    <div class="mobile-menu" :class="{ active: showMobileMenu }">
      <div class="mobile-header">
        <div class="mobile-user">
          <div class="mobile-avatar" :style="{ backgroundColor: avatarColor }">
            {{ avatarInitials }}
          </div>
          <div class="mobile-user-info">
            <div class="mobile-user-name">{{ userName }}</div>
            <div class="mobile-user-email">{{ userEmail }}</div>
          </div>
        </div>
      </div>
      
      <div class="mobile-nav">
        <router-link 
          v-for="item in navigationItems" 
          :key="item.path"
          :to="item.path" 
          class="mobile-link"
          :class="{ active: isActiveRoute(item.path) }"
          @click="closeMobileMenu"
        >
          <i class="material-icons">{{ item.icon }}</i>
          <span>{{ item.label }}</span>
        </router-link>
      </div>
      
      <div class="mobile-footer">
        <!-- Option pour changer d'interface (pour les admins seulement) -->
        <button class="mobile-action" @click="toggleInterface" v-if="!isCollaborateurInterface && canAccessAdmin">
          <i class="material-icons">switch_account</i>
          <span>Interface Collaborateur</span>
        </button>
        <button class="mobile-action" @click="toggleInterface" v-if="isCollaborateurInterface && canAccessAdmin">
          <i class="material-icons">admin_panel_settings</i>
          <span>Interface Admin</span>
        </button>
        <button class="mobile-action" @click="goToSettings">
          <i class="material-icons">{{ isCollaborateurInterface ? 'account_circle' : 'settings' }}</i>
          <span>{{ isCollaborateurInterface ? 'Mon Profil' : 'Paramètres' }}</span>
        </button>
        <button class="mobile-action" @click="signOut">
          <i class="material-icons">logout</i>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { getUserInitials, getUserColor } from '../services/avatarUtils'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '@/services/firebase'
import { signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth'
import { useUserPreferences } from '@/services/userPreferences'
import { AuthService } from '@/services/auth'

const route = useRoute()
const router = useRouter()
const userMenuRef = ref<HTMLElement | null>(null)
const showMobileMenu = ref(false)
const showUserMenu = ref(false)
const userEmail = ref<string>('')
const userUid = ref<string>('')
const userRole = ref<string>('')

// User preferences for avatar color
const { preferences, loadPreferences } = useUserPreferences()

// Détection automatique du contexte selon la route
const isCollaborateurInterface = computed(() => {
  return route.path.startsWith('/collaborateur/')
})

// Vérifier si l'utilisateur peut accéder à l'interface admin
const canAccessAdmin = computed(() => {
  return userRole.value && ['admin', 'editor'].includes(userRole.value)
})

// Navigation items adaptée au contexte
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
      { path: '/import', label: 'Import', icon: 'upload' }
    ]
  }
})

// Computed properties
const userName = computed(() => {
  if (!userEmail.value) return 'Utilisateur'
  return userEmail.value.split('@')[0]
})

const avatarInitials = computed(() => {
  // Utiliser getUserInitials pour une logique cohérente
  return getUserInitials({
    email: userEmail.value
  })
})

const avatarColor = computed(() => {
  if (!userUid.value) return '#6b7280'
  
  // Si couleur personnalisée définie, l'utiliser
  const customColor = preferences.value?.presenceColor
  return getUserColor(userUid.value, customColor)
})

// La fonction getDefaultUserColor est maintenant remplacée par getUserColor depuis avatarUtils

// Methods
const isActiveRoute = (path: string) => {
  return route.path.startsWith(path)
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
  if (showMobileMenu.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

const closeMobileMenu = () => {
  showMobileMenu.value = false
  document.body.style.overflow = ''
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const closeUserMenu = () => {
  showUserMenu.value = false
}

const goToSettings = () => {
  if (isCollaborateurInterface.value) {
    // Pour l'interface collaborateur, aller au profil
    router.push('/collaborateur/profil')
  } else {
    // Pour l'interface admin, aller aux paramètres
    router.push('/parametres')
  }
  closeUserMenu()
  closeMobileMenu()
}

const toggleInterface = () => {
  if (isCollaborateurInterface.value) {
    // Passer à l'interface admin
    router.push('/dashboard')
  } else {
    // Passer à l'interface collaborateur
    router.push('/collaborateur/dashboard')
  }
  closeUserMenu()
  closeMobileMenu()
}

const signOut = async () => {
  try {
    await firebaseSignOut(auth)
    closeUserMenu()
    closeMobileMenu()
    // Rediriger vers la page de connexion appropriée
    if (isCollaborateurInterface.value) {
      router.push('/collaborateur/login')
    } else {
      router.push('/login')
    }
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}

// Click outside to close user menu
const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    closeUserMenu()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  onAuthStateChanged(auth, async (user: User | null) => {
    userEmail.value = user?.email || ''
    userUid.value = user?.uid || ''
    if (user) {
      if (loadPreferences) {
        void loadPreferences(user.uid)
      }
      // Charger le rôle utilisateur
      try {
        const tenantUser = await AuthService.getUserRole(user.uid)
        userRole.value = tenantUser?.role || ''
      } catch (error) {
        console.error('Error loading user role:', error)
        userRole.value = ''
      }
    } else {
      userRole.value = ''
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--dark-surface);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--dark-border);
  padding: 0 2rem;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Mobile burger button */
.navbar-toggle {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  width: 28px;
  height: 28px;
  cursor: pointer;
  position: relative;
  padding: 4px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.navbar-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
}

.navbar-toggle span {
  display: block;
  height: 2px;
  width: 100%;
  background: var(--dark-text-primary);
  margin: 3px 0;
  transition: all 0.3s ease;
  transform-origin: center;
  border-radius: 1px;
}

.navbar-toggle.active span:nth-child(1) {
  transform: rotate(45deg) translate(7px, 7px);
}

.navbar-toggle.active span:nth-child(2) {
  opacity: 0;
}

.navbar-toggle.active span:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -7px);
}

/* Brand */
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--dark-text-primary);
  font-weight: 700;
  font-size: 1.2rem;
}

.navbar-logo {
  height: 60px;
  width: auto;
  object-fit: contain;
  padding: 8px;
}

.navbar-title {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

/* Desktop Navigation */
.navbar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.navbar-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  color: var(--dark-text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  position: relative;
  overflow: hidden;
}

.navbar-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: 10px;
}

.navbar-link:hover {
  color: var(--dark-text-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(94, 129, 172, 0.3);
}

.navbar-link:hover::before {
  opacity: 0.1;
}

.navbar-link.active {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(94, 129, 172, 0.4);
}

.navbar-link.active::before {
  opacity: 0;
}

.navbar-link i {
  font-size: 18px;
  position: relative;
  z-index: 1;
}

.navbar-link span {
  position: relative;
  z-index: 1;
}

/* Actions */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.navbar-btn {
  position: relative;
  background: none;
  border: none;
  color: var(--dark-text-secondary);
  cursor: pointer;
  padding: 10px;
  border-radius: 10px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navbar-btn:hover {
  background: var(--dark-surface-secondary);
  color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.navbar-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: linear-gradient(135deg, var(--error-color), #dc2626);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 12px;
  min-width: 18px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(191, 97, 106, 0.4);
}

/* User */
.navbar-user {
  position: relative;
}

.navbar-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--primary-color);
  color: #fff;
  border: none;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(94, 129, 172, 0.3);
}

.navbar-avatar:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(94, 129, 172, 0.4);
}

/* User dropdown */
.user-dropdown {
  position: absolute;
  top: 52px;
  right: 0;
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: 16px;
  padding: 16px 0;
  min-width: 260px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  z-index: 1100;
  backdrop-filter: blur(10px);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: 0 4px 12px rgba(94, 129, 172, 0.3);
}

.user-details {
  flex: 1;
}

.user-name {
  color: var(--dark-text-primary);
  font-weight: 600;
  font-size: 1rem;
}

.user-email {
  color: var(--dark-text-secondary);
  font-size: 0.8rem;
  margin-top: 2px;
}

.dropdown-divider {
  border: none;
  height: 1px;
  background: var(--dark-border);
  margin: 12px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 20px;
  background: none;
  border: none;
  color: var(--dark-text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--dark-surface-secondary);
  color: var(--primary-color);
}

.dropdown-item i {
  font-size: 18px;
}

/* Mobile */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1050;
}

.mobile-menu {
  position: fixed;
  top: 0;
  left: -340px;
  width: 340px;
  height: 100vh;
  background: var(--dark-surface);
  border-right: 1px solid var(--dark-border);
  z-index: 1100;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
}

.mobile-menu.active {
  left: 0;
}

.mobile-header {
  padding: 24px 20px;
  border-bottom: 1px solid var(--dark-border);
  background: linear-gradient(135deg, var(--dark-surface), var(--dark-surface-secondary));
}

.mobile-user {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mobile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  box-shadow: 0 4px 12px rgba(94, 129, 172, 0.3);
}

.mobile-user-info {
  flex: 1;
}

.mobile-user-name {
  color: var(--dark-text-primary);
  font-weight: 600;
  font-size: 1.1rem;
}

.mobile-user-email {
  color: var(--dark-text-secondary);
  font-size: 0.85rem;
  margin-top: 3px;
}

.mobile-nav {
  flex: 1;
  padding: 24px 0;
}

.mobile-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  color: var(--dark-text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 1rem;
  position: relative;
}

.mobile-link::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 0;
  background: linear-gradient(180deg, var(--primary-color), var(--primary-hover));
  transition: height 0.2s ease;
  border-radius: 0 2px 2px 0;
}

.mobile-link:hover {
  background: var(--dark-surface-secondary);
  color: var(--primary-color);
}

.mobile-link:hover::before {
  height: 60%;
}

.mobile-link.active {
  background: linear-gradient(90deg, rgba(94, 129, 172, 0.15), transparent);
  color: var(--primary-color);
}

.mobile-link.active::before {
  height: 80%;
}

.mobile-link i {
  font-size: 22px;
}

.mobile-footer {
  border-top: 1px solid var(--dark-border);
  padding: 24px 0;
  background: var(--dark-background);
}

.mobile-action {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px 24px;
  background: none;
  border: none;
  color: var(--dark-text-secondary);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  text-align: left;
}

.mobile-action:hover {
  background: var(--dark-surface-secondary);
  color: var(--primary-color);
}

.mobile-action i {
  font-size: 22px;
}

/* Mobile styles */
@media (max-width: 768px) {
  .navbar {
    padding: 0 1rem;
    height: 56px;
  }
  
  .navbar-toggle {
    display: flex;
  }
  
  .navbar-title {
    display: none;
  }
  
  .navbar-logo {
    height: 50px;
    width: auto;
    padding: 6px;
  }
  
  .navbar-nav {
    display: none;
  }
  
  .navbar-btn {
    padding: 8px;
  }
  
  .navbar-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.8rem;
  }
  
  .user-dropdown {
    right: -8px;
    min-width: 240px;
  }
}

@media (max-width: 480px) {
  .navbar {
    padding: 0 0.75rem;
  }
  
  .mobile-menu {
    width: 300px;
    left: -300px;
  }
}
</style>
