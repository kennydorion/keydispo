import type { RouteRecordRaw, Router } from 'vue-router'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthService } from '../services/auth'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/semaine' },
  {
    path: '/semaine',
    name: 'Semaine',
    component: () => import('../views/SemaineVirtualClean.vue'),
    meta: { title: 'Planning', icon: 'va-calendar' }
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('../features/import/ImportDispos.vue'),
    meta: { title: 'Import Excel', icon: 'va-upload', requiresAuth: true, roles: ['admin', 'editor'] }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: 'Connexion', public: true }
  },
  // Pages mises en pause pour simplifier l'interface
  { path: '/:pathMatch(.*)*', redirect: '/semaine' },
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
        // Accès refusé, retourne au planning
        return { path: '/semaine' }
      }
    }

    return true
  })
}

export default routes
