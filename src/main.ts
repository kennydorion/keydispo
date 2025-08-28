import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import routes, { setupRouterGuards } from './router/routes'
import { createVuestic } from 'vuestic-ui'
import { installMultiUserSystem } from './services/multiUserPlugin'
import './style.css'

// Création du routeur
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Création de l'application
const app = createApp(App)

// Installation des plugins
app.use(router)
app.use(createVuestic())

// Installation du système multi-utilisateur unifié
app.use(installMultiUserSystem)

// Guards de navigation (auth + rôles)
setupRouterGuards(router)

// Montage de l'application
app.mount('#app')
