import type { RouteRecordRaw, Router } from 'vue-router'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthService } from '../services/auth'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: 'Tableau de bord', icon: 'dashboard', requiresAuth: true }
  },
  {
    path: '/semaine',
    name: 'Semaine',
    component: () => import('../views/SemaineVirtualClean.vue'),
    meta: { title: 'Planning', icon: 'calendar_month', requiresAuth: true }
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('../features/import/ImportDispos.vue'),
    meta: { title: 'Import', icon: 'upload', requiresAuth: true }
  },
  {
    path: '/parametres',
    name: 'Parametres',
    component: () => import('../views/Parametres.vue'),
    meta: { title: 'Paramètres', icon: 'settings', requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: 'Connexion', public: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { title: 'Inscription', public: true }
  },
  {
    path: '/test-toasts',
    name: 'TestToasts',
    component: () => import('../views/TestToasts.vue'),
    meta: { title: 'Test Toasts Z-Index', requiresAuth: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
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

    if (!requiresAuth && !allowedRoles) return true

    const user = auth.currentUser || await waitForAuthState()
    if (!user) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const tenantUser = await AuthService.getUserRole(user.uid)
      const role = tenantUser?.role
      if (!role || !allowedRoles.includes(role)) {
        // Accès refusé, retourne au dashboard
        return { path: '/dashboard' }
      }
    }

    return true
  })
}

export default routes
