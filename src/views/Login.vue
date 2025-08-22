<template>
  <main class="login-page" aria-label="Page de connexion">
    <div class="login-container">
      <!-- En-tête avec logo -->
      <header class="login-header" aria-label="En-tête Key Placement">
        <div class="brand-section" tabindex="0" aria-label="Accueil Key Placement">
          <div class="logo-container">
            <img src="/keyplacement_logo_blanc.svg" alt="Logo Key Placement" class="brand-logo" />
          </div>
          <div class="brand-text">
            <p>Gestion des disponibilités</p>
          </div>
        </div>
      </header>
      
      <!-- Carte de connexion -->
      <div class="login-card">
        <div class="login-form">
          <h2>Connexion</h2>
          <p class="form-subtitle">Accédez à votre tableau de bord</p>
          
          <form @submit.prevent="handleLogin" novalidate>
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="votre@email.com"
                class="form-input"
                required
                aria-describedby="email-error"
              />
            </div>
            
            <div class="form-group">
              <label for="password">Mot de passe</label>
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="••••••••"
                class="form-input"
                required
                aria-describedby="password-error"
              />
            </div>
            
            <button type="submit" class="submit-button" :disabled="isLoading">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>Se connecter</span>
            </button>
          </form>
          
          <div class="divider">
            <span>ou</span>
          </div>
          
          <button @click="signInWithGoogle" class="google-button" :disabled="isLoading">
            <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>
          
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>
        
        <!-- Section administrateur (uniquement sur émulateur) -->
        <div v-if="isEmulator" class="admin-section">
          <div class="admin-divider">
            <span>Mode émulateur</span>
          </div>
          <div class="admin-info">
            <div class="info-badge">
              <span class="material-symbols-outlined">developer_mode</span>
              Environnement de développement
            </div>
            <p class="admin-description">
              Créez un compte administrateur pour tester l'application
            </p>
            <button @click="createAdminAccount" class="admin-button" :disabled="isCreatingAdmin">
              <span v-if="isCreatingAdmin" class="loading-spinner"></span>
              <span v-else class="material-symbols-outlined">admin_panel_settings</span>
              <span v-if="!isCreatingAdmin">Créer un compte admin</span>
            </button>
            <button @click="loginAsTestUser" class="admin-button" :disabled="isLoading" style="margin-top: 0.5rem;">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else class="material-symbols-outlined">login</span>
              <span v-if="!isLoading">Connexion test (admin@test.com)</span>
            </button>
            <div v-if="adminCreated" class="success-message">
              Compte admin créé ! Email: kdorion@thecompagnie.eu | Mot de passe: kenoche8
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { AuthService } from '../services/auth'

const router = useRouter()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const isCreatingAdmin = ref(false)
const adminCreated = ref(false)

// Affiche la section émulateur UNIQUEMENT si explicitement activé
// via VITE_USE_EMULATOR=1 (évite l'affichage en prod même si servi en local)
const isEmulator = computed(() => import.meta.env.VITE_USE_EMULATOR === '1')

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Veuillez remplir tous les champs'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await AuthService.signInWithEmail(email.value, password.value)
    // Redirection automatique vers le dashboard via le router guard
    await router.push('/dashboard')
  } catch (err: any) {
    console.error('Login error:', err)
    if (err.code === 'auth/user-not-found') {
      error.value = 'Utilisateur non trouvé'
    } else if (err.code === 'auth/wrong-password') {
      error.value = 'Mot de passe incorrect'
    } else if (err.code === 'auth/invalid-email') {
      error.value = 'Email invalide'
    } else if (err.code === 'auth/too-many-requests') {
      error.value = 'Trop de tentatives. Veuillez réessayer plus tard'
    } else {
      error.value = 'Erreur de connexion. Veuillez réessayer'
    }
  } finally {
    isLoading.value = false
  }
}

const signInWithGoogle = async () => {
  isLoading.value = true
  error.value = ''

  try {
    await AuthService.signInWithGoogle()
    await router.push('/dashboard')
  } catch (err: any) {
    console.error('Google sign in error:', err)
    error.value = 'Erreur de connexion Google'
  } finally {
    isLoading.value = false
  }
}

const createAdminAccount = async () => {
  if (!isEmulator.value) return
  
  isCreatingAdmin.value = true
  error.value = ''
  
  try {
    // Créer le compte admin avec Firebase
    await AuthService.signUpWithEmail('kdorion@thecompagnie.eu', 'kenoche8', 'Kenny Dorion')
    
    adminCreated.value = true
    
    // Auto-remplir les champs avec les identifiants admin
    email.value = 'kdorion@thecompagnie.eu'
    password.value = 'kenoche8'
    
  } catch (err: any) {
    console.error('Admin creation error:', err)
    if (err.code === 'auth/email-already-in-use') {
      // L'admin existe déjà, juste remplir les champs
      adminCreated.value = true
      email.value = 'kdorion@thecompagnie.eu'
      password.value = 'kenoche8'
    } else {
      error.value = 'Erreur lors de la création du compte admin'
    }
  } finally {
    isCreatingAdmin.value = false
  }
}

const loginAsTestUser = async () => {
  if (!isEmulator.value) return
  
  isLoading.value = true
  error.value = ''
  
  try {
    await AuthService.signInWithEmail('admin@test.com', 'password123')
    await router.push('/dashboard')
  } catch (err: any) {
    console.error('Test user login error:', err)
    error.value = 'Erreur de connexion avec l\'utilisateur test'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #2e3440;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: 'Inter', 'Roboto', system-ui, sans-serif;
}

.login-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.login-header {
  text-align: center;
}

.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo {
  width: 320px;
  height: auto;
  object-fit: contain;
}

.brand-text h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #eceff4;
  margin: 0;
  line-height: 1.2;
}

.brand-text p {
  font-size: 1.1rem;
  color: #d8dee9;
  margin: 8px 0 0 0;
  font-weight: 500;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 36px;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.login-form h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
  text-align: center;
}

.form-subtitle {
  font-size: 1rem;
  color: #6B7280;
  text-align: center;
  margin: 0 0 32px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input::placeholder {
  color: #9ca3af;
}

.submit-button {
  width: 100%;
  padding: 12px 16px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-bottom: 24px;
}

.submit-button:hover:not(:disabled) {
  background: #1d4ed8;
}

.submit-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.google-button {
  width: 100%;
  padding: 12px 16px;
  background: #ffffff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 48px;
}

.google-button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider span {
  padding: 0 16px;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 400;
}

.error-message {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 16px;
}

.success-message {
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  color: #16a34a;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 16px;
}

/* Section administrateur */
.admin-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1.5px solid #e5e7eb;
}

.admin-divider {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.admin-divider::before,
.admin-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.admin-divider span {
  padding: 0 16px;
  color: #6B7280;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.admin-info {
  text-align: center;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #d97706;
  margin-bottom: 16px;
}

.info-badge .material-symbols-outlined {
  font-size: 16px;
}

.admin-description {
  font-size: 0.875rem;
  color: #4B5563;
  margin: 0 0 20px 0;
}

.admin-button {
  width: 100%;
  padding: 12px 16px;
  background: #10B981;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
}

.admin-button:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.admin-button:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
  transform: none;
}

.admin-button .material-symbols-outlined {
  font-size: 18px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: 16px;
  }
  
  .login-card {
    padding: 24px;
  }
  
  .brand-text h1 {
    font-size: 1.5rem;
  }
}
</style>
