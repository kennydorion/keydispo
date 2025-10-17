import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import routes, { setupRouterGuards } from './router/routes'
import { createVuestic } from 'vuestic-ui'
import { installMultiUserSystem } from './services/multiUserPlugin'
import { InterfaceManager } from './services/interfaceManager'
import VCalendar from 'v-calendar'
import 'v-calendar/style.css'
import './style.css'

// Garde globale pour désactiver les logs verbeux (réactivables via VITE_ENABLE_DEBUG_LOGS="true")
const enableDebugLogs = import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true'
if (!enableDebugLogs) {
  const noop = () => {}
  console.log = noop
  console.debug = noop
  console.info = noop
  console.trace = noop
}

// Création du routeur
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Création de l'application
const app = createApp(App)

// Installation des plugins avec configuration Vuestic pour locale française
app.use(router)
app.use(createVuestic({
  config: {
    i18n: {
      locale: 'fr',
    }
  }
}))

// Installation de V-Calendar avec locale française et lundi en premier
app.use(VCalendar, {
  locales: {
    'fr': {
      firstDayOfWeek: 2, // 2 = Monday (1 = Sunday)
      masks: {
        L: 'DD/MM/YYYY',
        input: 'DD/MM/YYYY',
        title: 'MMMM YYYY'
      }
    }
  }
})

// Installation du système multi-utilisateur unifié
app.use(installMultiUserSystem)

// Initialisation du gestionnaire d'interfaces
InterfaceManager.initialize(router)

// Guards de navigation (auth + rôles)
setupRouterGuards(router)

// Montage de l'application
app.mount('#app')

// Exposition globale pour debug (dev seulement)
if (import.meta.env.DEV) {
  // @ts-ignore
  window.debugInterfaceManager = InterfaceManager
}
