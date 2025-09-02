<template>
  <div class="navigation-wrapper">
    <!-- Navigation principale simplifiée -->
    <va-navbar class="main-navbar" color="primary">
      <template #left>
        <va-navbar-item class="brand">
          <va-icon name="va-calendar" size="large" class="mr-2" color="white" />
          <span class="brand-text">KeyDispo</span>
        </va-navbar-item>
      </template>
      
      <template #center>
        <va-navbar-item>
          <va-button color="warning" preset="solid" @click="router.push('/semaine')" class="nav-button">
            <va-icon name="va-calendar" class="mr-2" color="white" />
            Planning
          </va-button>
        </va-navbar-item>
        
        <va-navbar-item>
          <va-button color="success" preset="solid" @click="router.push('/collaborateurs')" class="nav-button">
            <va-icon name="people" class="mr-2" color="white" />
            Collaborateurs
          </va-button>
        </va-navbar-item>
        
        <va-navbar-item>
          <va-button color="info" preset="solid" @click="router.push('/import')" class="nav-button">
            <va-icon name="va-upload" class="mr-2" color="white" />
            Import Excel
          </va-button>
        </va-navbar-item>
        
        
      </template>
      
      <template #right>
        <va-navbar-item class="nav-actions">
          <template v-if="!user">
            <va-button color="secondary" preset="solid" @click="goToLogin" class="nav-button">
              <va-icon name="login" class="mr-2" color="white" />
              Se connecter
            </va-button>
          </template>
          <template v-else>
            <span class="user-email">{{ userEmail }}</span>
            <va-button color="danger" preset="outline" @click="handleLogout" class="nav-button">
              <va-icon name="logout" class="mr-2" color="white" />
              Se déconnecter
            </va-button>
          </template>
        </va-navbar-item>
      </template>
    </va-navbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { User } from 'firebase/auth'
import { AuthService } from '../services/auth'

// Composables
const router = useRouter()

// Auth state
const user = ref<User | null>(null)
const userEmail = computed(() => user.value?.email || user.value?.displayName || 'Utilisateur')

function goToLogin() {
  router.push('/login')
}

async function handleLogout() {
  try {
    await AuthService.signOut()
    user.value = null
    router.push('/semaine')
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}

// Lifecycle
onMounted(() => {
  console.log('🧭 Navigation simplifiée montée')
  AuthService.onAuthStateChanged((u) => { 
    user.value = u 
    console.log('🔐 État auth changé:', u ? 'connecté' : 'déconnecté')
  })
})
</script>
<style scoped>
.navigation-wrapper {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--va-background-primary);
}

.main-navbar {
  box-shadow: var(--va-box-shadow);
  background: linear-gradient(135deg, var(--va-primary), var(--va-primary-dark));
}

.brand {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 1.25rem;
  color: white;
}

.brand-text {
  background: linear-gradient(45deg, white, #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: bold;
}

.nav-button {
  margin: 0 0.25rem;
  transition: all 0.2s ease;
  color: white !important;
  border-color: rgba(255,255,255,0.3) !important;
}

.nav-button:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.1) !important;
  border-color: white !important;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-email {
  color: white;
  font-size: 0.9rem;
  margin-right: 0.5rem;
}

@media (max-width: 768px) {
  .brand-text {
    display: none;
  }
  
  .nav-button span {
    display: none;
  }
  
  .user-email {
    display: none;
  }
}
</style>
