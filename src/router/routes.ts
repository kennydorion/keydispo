import type { RouteRecordRaw, Router } from 'vue-router'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthService } from '../services/auth'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  
  // Routes ADMIN (sans préfixe)
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: 'Tableau de bord', icon: 'dashboard', requiresAuth: true, interface: 'admin' }
  },
  {
    path: '/semaine',
    name: 'Semaine',
    component: () => import('../views/PlanningSemaine.vue'),
    meta: { title: 'Planning', icon: 'calendar_month', requiresAuth: true, interface: 'admin' }
  },
  {
    path: '/collaborateurs',
    name: 'Collaborateurs',
    component: () => import('../views/ListeCollaborateurs.vue'),
    meta: { title: 'Collaborateurs', icon: 'people', requiresAuth: true, roles: ['admin', 'editor'], interface: 'admin' }
  },
  {
    path: '/collaborateurs/nouveau',
    name: 'NouveauCollaborateur',
    component: () => import('../views/ModifierCollaborateur.vue'),
    meta: { title: 'Nouveau collaborateur', icon: 'person_add', requiresAuth: true, roles: ['admin', 'editor'], interface: 'admin' }
  },
  {
    path: '/collaborateurs/:id/detail',
    name: 'DetailCollaborateur',
    component: () => import('../views/DetailCollaborateur.vue'),
    meta: { title: 'Détail collaborateur', icon: 'person', requiresAuth: true, roles: ['admin', 'editor'], interface: 'admin' }
  },
  {
    path: '/collaborateurs/:id',
    name: 'ModifierCollaborateur',
    component: () => import('../views/ModifierCollaborateur.vue'),
    meta: { title: 'Modifier collaborateur', icon: 'edit', requiresAuth: true, roles: ['admin', 'editor'], interface: 'admin' }
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('../features/import/ImportDispos.vue'),
    meta: { title: 'Import', icon: 'upload', requiresAuth: true, roles: ['admin', 'editor'], interface: 'admin' }
  },
  {
    path: '/parametres',
    name: 'Parametres',
    component: () => import('../views/Parametres.vue'),
    meta: { title: 'Paramètres', icon: 'settings', requiresAuth: true, roles: ['admin'], interface: 'admin' }
  },

  // Routes COLLABORATEUR (avec préfixe /collaborateur/)
  {
    path: '/collaborateur',
    redirect: '/collaborateur/dashboard'
  },
  {
    path: '/collaborateur/dashboard',
    name: 'CollaborateurDashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: 'Mon tableau de bord', icon: 'dashboard', requiresAuth: true, interface: 'collaborateur' }
  },
  {
    path: '/collaborateur/planning',
    name: 'CollaborateurPlanning',
    component: () => import('../views/PlanningCollaborateur.vue'),
    meta: { title: 'Mon planning', icon: 'calendar_today', requiresAuth: true, interface: 'collaborateur' }
  },
  {
    path: '/collaborateur/profil',
    name: 'CollaborateurProfil',
    component: () => import('../views/ProfilCollaborateur.vue'),
    meta: { title: 'Mon profil', icon: 'account_circle', requiresAuth: true, interface: 'collaborateur' }
  },

  // Routes d'authentification
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: 'Connexion', public: true }
  },
  {
    path: '/collaborateur/login',
    name: 'CollaborateurLogin',
    component: () => import('../views/CollaborateurLogin.vue'),
    meta: { title: 'Connexion Collaborateur', public: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { title: 'Inscription', public: true }
  },
  {
  path: '/collaborateur/register',
  name: 'CollaborateurRegister',
  component: () => import('../views/CollaborateurRegister.vue'),
  meta: { title: 'Inscription Collaborateur', public: true }
  },

  // Routes de test et autres
  {
    path: '/test-toasts',
    name: 'TestToasts',
    component: () => import('../views/TestToasts.vue'),
    meta: { title: 'Test Toasts Z-Index', requiresAuth: true }
  },

  // Redirections par défaut
  { 
    path: '/:pathMatch(.*)*', 
    redirect: (to) => {
      // Si la route commence par /collaborateur/, rediriger vers le dashboard collaborateur
      if (to.path.startsWith('/collaborateur/')) {
        return '/collaborateur/dashboard'
      }
      // Sinon rediriger vers le dashboard admin
      return '/dashboard'
    }
  },
]

function waitForAuthState(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user)
    })
  })
}

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to) => {
    const requiresAuth = to.matched.some(r => (r.meta as any)?.requiresAuth)
    const allowedRoles = (to.meta as any)?.roles as Array<'admin' | 'editor' | 'viewer'> | undefined
    const targetInterface = (to.meta as any)?.interface as 'admin' | 'collaborateur' | undefined

    if (!requiresAuth && !allowedRoles) return true

    const user = auth.currentUser || await waitForAuthState()
    if (!user) {
      const isCollaborateurRoute = to.path.startsWith('/collaborateur/')
      return { path: isCollaborateurRoute ? '/collaborateur/login' : '/login', query: { redirect: to.fullPath } }
    }

    // Vérification des rôles seulement pour les routes admin avec restrictions
    if (allowedRoles && allowedRoles.length > 0 && targetInterface === 'admin') {
      const tenantUser = await AuthService.getUserRole(user.uid)
      const role = tenantUser?.role
      
      // Si on n'arrive pas à récupérer le rôle, laisser passer (problème temporaire)
      if (!tenantUser) {
        console.warn('Unable to fetch user role, allowing access temporarily')
        return true
      }
      
      // Si l'utilisateur n'a pas le bon rôle, rediriger
      if (!role || !allowedRoles.includes(role)) {
        console.log(`Access denied: user role '${role}' not in allowed roles:`, allowedRoles)
        // Rediriger vers l'interface appropriée selon le contexte
        if (to.path.startsWith('/collaborateur/')) {
          return { path: '/collaborateur/dashboard' }
        } else {
          // Pour les routes admin, rediriger vers l'interface collaborateur
          return { path: '/collaborateur/dashboard' }
        }
      }
    }

    return true
  })
}

export default routes
