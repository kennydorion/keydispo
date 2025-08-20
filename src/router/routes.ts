import type { RouteRecordRaw } from 'vue-router'

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
    meta: { title: 'Import Excel', icon: 'va-upload' }
  },
  // Pages mises en pause pour simplifier l'interface
  { path: '/:pathMatch(.*)*', redirect: '/semaine' },
]

export function setupRouterGuards(_router: any) {
  // Guards désactivés pour la démo/émulateur
}

export default routes
