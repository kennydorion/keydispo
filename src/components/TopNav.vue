<template>
  <nav class="topnav" aria-label="Navigation principale">
    <div class="topnav-left">
      <button
        class="mobile-menu-toggle"
        aria-label="Ouvrir le menu"
        aria-controls="mobile-drawer"
        :aria-expanded="showMobileMenu ? 'true' : 'false'"
        @click="toggleMobileMenu"
      >
        <i class="material-icons" aria-hidden="true">{{ showMobileMenu ? 'close' : 'menu' }}</i>
      </button>
      <div class="topnav-brand">
        <img src="/keyplacementlogo.svg" alt="Key Placement" />
        <span class="brand-name">Key Placement</span>
      </div>
    </div>
    <ul class="topnav-list desktop-only">
      <li v-for="item in items" :key="item.name">
        <router-link 
          :to="item.path" 
          class="topnav-link" 
          :class="{active: $route.path.startsWith(item.path)}" 
          :aria-current="$route.path.startsWith(item.path) ? 'page' : undefined"
        >
          <i class="material-icons" aria-hidden="true">{{ item.icon }}</i>
          <span class="topnav-label">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
    
    <!-- Barre de statut des sessions multi-utilisateur (Phase 3) -->
    <div v-if="showSessionStatus" class="session-status-wrapper">
      <div class="session-avatars">
        <div 
          v-for="user in displayUsers.slice(0, 3)" 
          :key="user.uid"
          class="user-avatar-mini"
          :style="{ backgroundColor: user.color }"
          :title="`${user.displayName} (${user.sessionCount} session${user.sessionCount > 1 ? 's' : ''})`"
        >
          {{ user.displayName?.charAt(0)?.toUpperCase() || '?' }}
        </div>
        <div v-if="totalUsers > 3" class="more-users">
          +{{ totalUsers - 3 }}
        </div>
      </div>
      <div class="session-count">
        {{ totalUsers }} utilisateur{{ totalUsers > 1 ? 's' : '' }}
      </div>
    </div>
    
    <!-- Indicateur de debug pour voir si le système est actif -->
    <div v-if="!showSessionStatus && $route.path.includes('/semaine')" class="debug-indicator">
      🔄 Multi-User: {{ totalUsers }} users
    </div>
    
    <div class="topnav-actions">
      <button class="topnav-btn desktop-only" aria-label="Recherche">
        <i class="material-icons">search</i>
      </button>
      
      <!-- Composant de notifications multi-utilisateur (Phase 4) -->
      <NotificationBell class="desktop-only" />
      <div class="user-menu-wrapper" ref="userMenuRef">
        <button class="topnav-btn user-btn" aria-label="Profil utilisateur" :aria-expanded="showUserMenu ? 'true' : 'false'" @click="toggleUserMenu">
          <i class="material-icons">account_circle</i>
        </button>
        <transition name="fade-menu">
          <div v-if="showUserMenu" class="user-menu" role="menu" @keydown.esc.prevent="closeUserMenu">
            <div class="user-menu-header">
              <div class="user-avatar">
                <i class="material-icons" aria-hidden="true">person</i>
              </div>
              <div class="user-info">
                <span class="user-email">{{ currentUserEmail || 'Utilisateur' }}</span>
              </div>
            </div>
            <button class="user-menu-item" role="menuitem" @click="goToParametres">
              <i class="material-icons" aria-hidden="true">settings</i>
              <span>Paramètres</span>
            </button>
            <button class="user-menu-item" role="menuitem" @click="signOutUser">
              <i class="material-icons" aria-hidden="true">logout</i>
              <span>Déconnexion</span>
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- Drawer mobile -->
    <transition name="drawer-fade">
      <div
        v-if="showMobileMenu"
        class="mobile-backdrop"
        aria-hidden="true"
        @click="closeMobileMenu"
      ></div>
    </transition>
    <transition name="drawer-slide">
      <aside
        v-if="showMobileMenu"
        id="mobile-drawer"
        class="mobile-drawer"
        role="dialog"
        aria-label="Menu de navigation"
      >
        <div class="drawer-header">
          <img src="/keyplacementlogo.svg" alt="Key Placement" class="drawer-logo" />
          <button class="drawer-close" aria-label="Fermer" @click="closeMobileMenu">
            <i class="material-icons" aria-hidden="true">close</i>
          </button>
        </div>
        <nav class="drawer-nav">
          <ul>
            <li v-for="item in items" :key="item.name" @click="navigateMobile(item.path)">
              <router-link 
                :to="item.path" 
                class="drawer-link" 
                :class="{active: $route.path.startsWith(item.path)}"
                :aria-current="$route.path.startsWith(item.path) ? 'page' : undefined"
              >
                <i class="material-icons" aria-hidden="true">{{ item.icon }}</i>
                <span class="drawer-label">{{ item.label }}</span>
              </router-link>
            </li>
          </ul>
        </nav>
        <div class="drawer-footer">
          <button class="drawer-action" aria-label="Paramètres" @click="navigateMobile('/parametres')">
            <i class="material-icons" aria-hidden="true">settings</i>
            <span>Paramètres</span>
          </button>
          <button class="drawer-action" aria-label="Déconnexion" @click="mobileSignOut">
            <i class="material-icons" aria-hidden="true">logout</i>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '@/services/firebase'
import { signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { useSessionDisplay } from '../services/sessionDisplayService'
import NotificationBell from './NotificationBell.vue'
const $route = useRoute()
const router = useRouter()
const items = [
  { name: 'dashboard', label: 'Tableau de bord', path: '/dashboard', icon: 'dashboard' },
  { name: 'planning', label: 'Planning', path: '/semaine', icon: 'calendar_today' },
  { name: 'import', label: 'Import', path: '/import', icon: 'upload_file' },
  { name: 'parametres', label: 'Paramètres', path: '/parametres', icon: 'settings' }
]

const showMobileMenu = ref(false)
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const currentUserEmail = ref<string>('')

// Session multi-utilisateur (Phase 3)
const sessionDisplay = useSessionDisplay()

// Utiliser seulement les vraies données du système
const displayUsers = computed(() => sessionDisplay.users.value || [])
const totalUsers = computed(() => sessionDisplay.stats.value.uniqueUsers || 0)
const showSessionStatus = computed(() => displayUsers.value.length > 0) // Afficher seulement s'il y a de vrais utilisateurs
function toggleMobileMenu() { showMobileMenu.value = !showMobileMenu.value }
function closeMobileMenu() { showMobileMenu.value = false }
function navigateMobile(path: string) {
  closeMobileMenu()
  if ($route.path !== path) router.push(path)
}

function toggleUserMenu() { showUserMenu.value = !showUserMenu.value }
function closeUserMenu() { showUserMenu.value = false }
function goToParametres() {
  closeUserMenu()
  if ($route.path !== '/parametres') router.push('/parametres')
}
async function signOutUser() {
  try {
    await signOut(auth)
    closeUserMenu()
    router.push('/login')
  } catch (e) {
    console.error('Erreur déconnexion:', e)
  }
}
async function mobileSignOut() {
  await signOutUser()
  closeMobileMenu()
}

// Fermer le menu utilisateur en cliquant à l'extérieur
function onClickOutside(e: MouseEvent) {
  if (!showUserMenu.value) return
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    closeUserMenu()
  }
}
onMounted(() => {
  document.addEventListener('click', onClickOutside)
  onAuthStateChanged(auth, (user: User | null) => {
    currentUserEmail.value = user?.email || ''
  })
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})

// Fermer sur changement de route (navigation externe, back/forward)
watch(() => $route.fullPath, () => {
  if (showMobileMenu.value) closeMobileMenu()
})

// Empêche le scroll du body quand le drawer est ouvert
watch(showMobileMenu, (val) => {
  const body = document?.body
  if (!body) return
  if (val) {
    body.style.overflow = 'hidden'
    body.style.touchAction = 'none'
  } else {
    body.style.overflow = ''
    body.style.touchAction = ''
  }
})

// Gestion touche ESC
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && showMobileMenu.value) {
    closeMobileMenu()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.topnav-left { display: flex; align-items: center; gap: 8px; }
.topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--dark-surface);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--dark-border);
  padding: 0 24px;
  height: 64px;
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.topnav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topnav-brand img {
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.brand-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--dark-text-primary);
}

.topnav-list {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 8px;
}

.topnav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  color: var(--dark-text-secondary);
  font-weight: 500;
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.2s ease;
  outline: none;
}

.topnav-link:hover,
.topnav-link:focus-visible {
  background: rgba(255, 255, 255, 0.1);
  color: var(--primary-color);
}

.topnav-link.active {
  background: var(--primary-color);
  color: #ffffff;
  font-weight: 600;
}

.topnav-link .material-icons {
  font-size: 18px;
}

.topnav-label {
  white-space: nowrap;
}

.topnav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topnav-btn {
  background: none;
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dark-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.topnav-btn:hover,
.topnav-btn:focus-visible {
  background: rgba(255, 255, 255, 0.1);
  color: var(--primary-color);
}

.topnav-btn .material-icons {
  font-size: 20px;
}

/* User menu */
.user-menu-wrapper { position: relative; }
.user-btn { position: relative; }
.user-menu { position: absolute; top: 48px; right: 0; background: var(--dark-surface); border: 1px solid var(--dark-border); border-radius: 12px; padding: 10px 0; min-width: 220px; box-shadow: 0 8px 28px rgba(0,0,0,0.4); z-index: 1600; display:flex; flex-direction:column; }
.user-menu-header { display:flex; align-items:center; gap:10px; padding:10px 16px 12px; border-bottom:1px solid var(--dark-border); }
.user-avatar { width:38px; height:38px; background: var(--primary-color); border-radius: 10px; display:flex; align-items:center; justify-content:center; color:#fff; }
.user-info { display:flex; flex-direction:column; }
.user-email { font-size:0.85rem; font-weight:600; color: var(--dark-text-primary); max-width:140px; overflow:hidden; text-overflow:ellipsis; }
.user-menu-item { background:none; border:none; width:100%; text-align:left; display:flex; align-items:center; gap:10px; padding:10px 16px; color: var(--dark-text-secondary); font-size:0.85rem; cursor:pointer; transition:background .2s,color .2s; }
.user-menu-item i { font-size:18px; }
.user-menu-item:hover, .user-menu-item:focus-visible { background: rgba(255,255,255,0.08); color: var(--primary-color); outline:none; }

.fade-menu-enter-from, .fade-menu-leave-to { opacity:0; transform: translateY(-4px); }
.fade-menu-enter-active, .fade-menu-leave-active { transition: all .18s ease; }

/* Mobile drawer */
.mobile-menu-toggle {
  display: none; /* caché par défaut, visible seulement en mobile */
  background: none;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  color: var(--dark-text-secondary);
  cursor: pointer;
  transition: background .2s ease, color .2s ease;
}
.mobile-menu-toggle:hover { background: rgba(255,255,255,0.08); color: var(--primary-color); }

.mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(2px);
  z-index: 1400;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(78vw, 310px);
  background: var(--dark-surface);
  border-right: 1px solid var(--dark-border);
  box-shadow: 4px 0 18px rgba(0,0,0,0.35);
  z-index: 1450;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 18px;
  overflow-y: auto;
}
.drawer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.drawer-logo { width: 40px; height: 40px; border-radius: 10px; }
.drawer-close { background: none; border: none; color: var(--dark-text-secondary); width: 40px; height: 40px; border-radius: 8px; display: flex; align-items:center; justify-content:center; cursor:pointer; }
.drawer-close:hover { background: rgba(255,255,255,0.08); color: var(--primary-color); }
.drawer-nav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.drawer-link { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; color: var(--dark-text-secondary); text-decoration:none; font-weight:500; font-size:0.95rem; transition:background .18s,color .18s; }
.drawer-link .material-icons { font-size:20px; opacity:0.9; }
.drawer-link:hover { background: rgba(255,255,255,0.08); color: var(--primary-color); }
.drawer-link.active { background: var(--primary-color); color:#fff; }
.drawer-footer { margin-top:auto; display:flex; flex-direction:column; gap:6px; padding-top:14px; border-top:1px solid var(--dark-border); }
.drawer-action { background:none; border:1px solid var(--dark-border); color: var(--dark-text-secondary); padding:10px 12px; border-radius:10px; display:flex; align-items:center; gap:10px; font-size:0.85rem; cursor:pointer; transition:all .2s; }
.drawer-action .material-icons { font-size:18px; }
.drawer-action:hover { background: rgba(255,255,255,0.08); color: var(--primary-color); border-color: var(--primary-color); }

/* Animations */
.drawer-slide-enter-from { transform: translateX(-110%); opacity: 0; }
.drawer-slide-enter-active { transition: all .28s cubic-bezier(.4,.0,.2,1); }
.drawer-slide-leave-active { transition: all .24s cubic-bezier(.4,.0,.2,1); }
.drawer-slide-leave-to { transform: translateX(-110%); opacity: 0; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity .25s; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-menu-toggle { display: flex; }
  .topnav-actions { gap: 4px; }
  .topnav-actions .topnav-btn.desktop-only { display: none; }
}

@media (max-width: 768px) {
  .topnav { padding: 0 6px; height: 50px; }
  .topnav-brand img { width: 30px; height: 30px; }
  .brand-name { display: none; }
  .topnav-link { padding: 6px 10px; }
  .topnav-btn { width: 38px; height: 38px; }
  .topnav-btn .material-icons { font-size: 18px; }
  .session-status-wrapper { display: none; }
}

/* Session Status Bar Styles (Phase 3) */
.session-status-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.session-avatars {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-avatar-mini {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.user-avatar-mini:hover {
  transform: scale(1.1);
}

.more-users {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.session-count {
  color: var(--dark-text-secondary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* Debug indicator */
.debug-indicator {
  padding: 4px 8px;
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #ffc107;
  font-size: 11px;
  font-weight: 500;
}
</style>
