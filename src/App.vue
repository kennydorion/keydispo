<template>
  <div id="app" :class="{ 
    'collaborateur-light-theme': isCollaborateurInterface,
    'admin-interface': isAdminInterface,
    'unauthorized': !isAuthorized,
    'is-planning': isPlanningRoute,
  }">
    
    
  <NavBar v-if="showNavBar" />
  <div class="app-main" :class="{ 'no-nav': !showNavBar, 'is-planning': isPlanningRoute }">
      <!-- Message d'autorisation si nécessaire -->
      <div v-if="!isAuthorized && route.meta.requiresAuth" class="unauthorized-message">
        <div class="unauthorized-content">
          <i class="material-icons">lock</i>
          <h2>Accès non autorisé</h2>
          <p>Vous n'avez pas les permissions nécessaires pour accéder à cette interface.</p>
          <button @click="goToAuthorizedInterface" class="btn-primary">
            Aller à l'interface autorisée
          </button>
        </div>
      </div>
      
      <!-- Interface normale -->
      <router-view v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { AuthService } from './services/auth'
import { useRouter, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import { InterfaceManager } from './services/interfaceManager'
// import { auth } from './services/firebase'

const router = useRouter()
const route = useRoute()

// Utiliser le nouvel InterfaceManager
const isAdminInterface = InterfaceManager.isAdminInterface
const isCollaborateurInterface = InterfaceManager.isCollaborateurInterface
const isAuthorized = InterfaceManager.isAuthorized
const userRole = InterfaceManager.userRole
// Debug helpers supprimés

// Afficher la NavBar sauf sur les routes publiques (login)
const showNavBar = computed(() => 
  !route.meta.public && 
  route.path !== '/login' && 
  route.path !== '/collaborateur/login'
)

// Détermine si on est sur la page planning pour adapter le layout (scroll interne)
// Admin: "/semaine" est la route du planning. On garde aussi "/planning" en fallback.
// Collaborateur: "/collaborateur/planning" doit aussi désactiver le scroll global.
const isPlanningRoute = computed(() => {
  const p = route.path
  return p === '/semaine' || p === '/planning' || p.startsWith('/collaborateur/planning')
})

// Redirection vers l'interface autorisée
function goToAuthorizedInterface() {
  const role = userRole.value
  if (role) {
    if (['admin', 'editor', 'viewer'].includes(role)) {
      InterfaceManager.forceAdminInterface()
    } else {
      InterfaceManager.forceCollaborateurInterface()
    }
  } else {
    router.push('/login')
  }
}

onMounted(() => {
  // Écouter les changements d'état d'authentification
  AuthService.onAuthStateChanged((user) => {
    if (!user && router.currentRoute.value.meta.requiresAuth) {
      router.push('/login')
    }
  })
})

// Nettoyer les overlays de modal orphelins lors de la navigation
// Vuestic téléporte les modaux au niveau du body, ils peuvent rester après navigation
watch(() => route.path, () => {
  // Nettoyer les overlays de modal Vuestic orphelins
  const overlays = document.querySelectorAll('.va-modal__overlay, .va-modal-overlay')
  overlays.forEach(overlay => {
    // Vérifier si l'overlay n'a pas de modal associé visible
    const container = overlay.closest('.va-modal__container')
    if (!container || !container.querySelector('.va-modal__dialog')) {
      overlay.remove()
    }
  })
  
  // Nettoyer aussi les classes du body qui pourraient bloquer les interactions
  document.body.classList.remove('selection-mode')
  document.body.classList.remove('dragging-selection')
  document.body.style.overflow = ''
  document.body.style.pointerEvents = ''
})
</script>

<style>
#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--dark-background);
  color: var(--dark-text-primary);
  font-family: var(--kd-font);
  overflow-y: auto;
  overflow-x: hidden;
}

/* Pour les pages de type planning : pas de scroll sur #app, tout se passe à l'intérieur */
#app.is-planning {
  height: 100vh;
  overflow: hidden;
}

/* Interface collaborateur - thème plus clair */
.collaborateur-light-theme {
  background: var(--va-background-primary, #f8f9fa);
  color: var(--va-text-primary, #212529);
}

/* Interface admin - thème sombre */
.admin-interface {
  background: var(--dark-background);
  color: var(--dark-text-primary);
}

.app-main {
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow-y: visible;
  overflow-x: hidden;
}

/* Pour les pages de type planning : pas de scroll sur .app-main */
.app-main.is-planning,
#app.is-planning .app-main {
  overflow: hidden;
}

/* En mode planning, contraindre la hauteur de la zone de contenu
   pour empêcher le scroll de la page et laisser le scroll interne au planning */
.app-main.is-planning {
  height: calc(100vh - 64px); /* 64px = hauteur de la NavBar */
}

/* Cas sans NavBar (si jamais) */
.app-main.is-planning.no-nav {
  height: 100vh;
}

@media (max-width: 768px) {
  .app-main { padding: 0; }
}

.app-main.no-nav {
  padding: 0;
}

/* Message d'autorisation */
.unauthorized-message {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  padding: 2rem;
}

.unauthorized-content {
  text-align: center;
  max-width: 400px;
}

.unauthorized-content .material-icons {
  font-size: 4rem;
  color: var(--va-warning, #f59e0b);
  margin-bottom: 1rem;
}

.unauthorized-content h2 {
  margin: 0 0 1rem 0;
  color: var(--va-text-primary, #212529);
}

.unauthorized-content p {
  margin: 0 0 2rem 0;
  color: var(--va-text-secondary, #6c757d);
  line-height: 1.5;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--va-primary, #007bff);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background: var(--va-primary-darken1, #0056b3);
}
</style>
