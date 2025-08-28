<template>
  <div class="login-page">
    <div class="login-container">
      
      <!-- En-tête avec logo -->
      <div class="login-header">
        <div class="brand-section">
          <img src="/keyplacementlogo.svg" alt="Key Placement" class="brand-logo" />
          <div class="brand-text">
            <h1>Key Placement</h1>
            <p class="subtitle">Planning & Disponibilités</p>
          </div>
        </div>
      </div>

      <!-- Carte de connexion -->
      <div class="login-card">
        <div class="card-header">
          <h2>Connexion</h2>
          <p class="card-description">Accédez à votre espace planning</p>
        </div>

        <form @submit.prevent="loginEmail" class="login-form">
          <!-- Email -->
          <div class="form-group">
            <label for="email" class="form-label">Adresse email</label>
            <div class="input-container">
              <input 
                id="email"
                v-model="email" 
                type="email" 
                placeholder="exemple@keyplacement.fr"
                class="form-input"
                required
                autocomplete="email"
              />
            </div>
          </div>

          <!-- Mot de passe -->
          <div class="form-group">
            <label for="password" class="form-label">Mot de passe</label>
            <div class="input-container">
              <input 
                id="password"
                v-model="password" 
                type="password" 
                placeholder="Votre mot de passe"
                class="form-input"
                required
                autocomplete="current-password"
              />
            </div>
          </div>

          <!-- Bouton de connexion -->
          <button 
            type="submit" 
            class="submit-button"
            :disabled="loading || !email || !password"
          >
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else>Se connecter</span>
          </button>

          <!-- Erreur -->
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </form>

        <!-- Séparateur -->
        <div class="divider">
          <span>ou</span>
        </div>

        <!-- Connexion Google -->
        <button @click="loginGoogle" class="google-button" :disabled="loading">
          <svg class="google-icon" width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        <!-- Gestion administrateur pour émulateur -->
        <div v-if="isLocalEmulator" class="admin-section">
          <div class="admin-divider">
            <span>Administration locale</span>
          </div>
          
          <div class="admin-info">
            <div class="info-badge">
              <span class="info-icon">⚠️</span>
              <span class="info-text">Mode émulateur détecté</span>
            </div>
            <p class="admin-description">
              Créez le compte administrateur pour les tests locaux
            </p>
            
            <button 
              @click="createAdminUser" 
              class="admin-button"
              :disabled="loading"
            >
              <span v-if="loadingAdmin" class="loading-spinner"></span>
              <span v-else>Créer Admin Local</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { AuthService } from '../services/auth'
import { auth } from '../services/firebase'

const router = useRouter()

// État réactif
const email = ref('')
const password = ref('')
const loading = ref(false)
const loadingAdmin = ref(false)
const error = ref('')

// Détection de l'émulateur
const isLocalEmulator = computed(() => {
  return import.meta.env.VITE_USE_EMULATOR === '1'
})

// Connexion par email/mot de passe
async function loginEmail() {
  if (!email.value || !password.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    await AuthService.signInWithEmail(email.value, password.value)
    router.push('/semaine')
  } catch (err: any) {
    error.value = err.message || 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}

// Connexion Google
async function loginGoogle() {
  loading.value = true
  error.value = ''
  
  try {
    await AuthService.signInWithGoogle()
    router.push('/semaine')
  } catch (err: any) {
    error.value = err.message || 'Erreur de connexion Google'
  } finally {
    loading.value = false
  }
}

// Création d'un utilisateur admin pour l'émulateur local
async function createAdminUser() {
  loadingAdmin.value = true
  error.value = ''
  
  try {
    const adminEmail = 'kdorion@thecompagnie.eu'
    const adminPassword = 'kenoche8'
    
    await AuthService.signUpWithEmail(adminEmail, adminPassword, 'Admin')
    
    email.value = adminEmail
    password.value = adminPassword
    
    console.log('✅ Utilisateur admin créé avec succès')
    
    // Connexion automatique
    await loginEmail()
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la création du compte admin'
  } finally {
    loadingAdmin.value = false
  }
}

// Vérification si l'utilisateur est déjà connecté
onMounted(async () => {
  try {
    if (auth.currentUser) {
      router.push('/semaine')
    }
  } catch (err) {
    // Utilisateur non connecté, reste sur la page de connexion
  }
})
</script>

<style scoped>
/* Design System - Variables */
:root {
  /* Couleurs Key Placement */
  --kp-primary: #0e8388;
  --kp-secondary: #d65745;
  
  /* Système de couleurs neutres */
  --gray-50: #fafafa;
  --gray-100: #f5f5f5;
  --gray-200: #e5e5e5;
  --gray-300: #d4d4d4;
  --gray-400: #a3a3a3;
  --gray-500: #737373;
  --gray-600: #525252;
  --gray-700: #404040;
  --gray-800: #262626;
  --gray-900: #171717;
  
  /* Couleurs sémantiques */
  --error: #ef4444;
  --success: #22c55e;
  --warning: #f59e0b;
  --info: #3b82f6;
  
  /* Système de spacing (8pt grid) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  
  /* Typographie */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* Font weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

/* Reset et base */
.login-page {
  min-height: 100vh;
  background: var(--gray-50);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: var(--leading-normal);
  color: var(--gray-900);
}

.login-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

/* En-tête avec logo */
.login-header {
  text-align: center;
}

.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.brand-logo {
  height: 48px;
  width: auto;
}

.brand-text h1 {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-bold);
  color: var(--kp-primary);
  margin: 0;
  line-height: var(--leading-tight);
}

.subtitle {
  font-size: var(--font-size-base);
  color: var(--gray-600);
  margin: 0;
  font-weight: var(--font-normal);
}

/* Carte de connexion */
.login-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-lg);
}

.card-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.card-header h2 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
  margin: 0 0 var(--space-sm) 0;
  line-height: var(--leading-tight);
}

.card-description {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  margin: 0;
}

/* Formulaire */
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-medium);
  color: var(--gray-700);
}

.input-container {
  position: relative;
}

.form-input {
  width: 100%;
  padding: var(--space-md);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--kp-primary);
  box-shadow: 0 0 0 3px rgb(14 131 136 / 0.1);
}

.form-input::placeholder {
  color: var(--gray-400);
}

.form-input:disabled {
  background: var(--gray-100);
  cursor: not-allowed;
}

/* Boutons */
.submit-button {
  width: 100%;
  padding: var(--space-md);
  background: var(--kp-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  min-height: 48px;
}

.submit-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kp-primary) 90%, black);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.submit-button:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.google-button {
  width: 100%;
  padding: var(--space-md);
  background: white;
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  min-height: 48px;
}

.google-button:hover:not(:disabled) {
  background: var(--gray-50);
  border-color: var(--gray-400);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.google-icon {
  flex-shrink: 0;
}

/* Séparateur */
.divider {
  display: flex;
  align-items: center;
  margin: var(--space-lg) 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--gray-200);
}

.divider span {
  padding: 0 var(--space-md);
  color: var(--gray-500);
  font-size: var(--font-size-sm);
}

/* Messages d'erreur */
.error-message {
  padding: var(--space-md);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
  border-radius: var(--radius-md);
  color: var(--error);
  font-size: var(--font-size-sm);
  text-align: center;
}

/* Section administrateur */
.admin-section {
  margin-top: var(--space-2xl);
  padding-top: var(--space-2xl);
  border-top: 1px solid var(--gray-200);
}

.admin-divider {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.admin-divider::before,
.admin-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--gray-200);
}

.admin-divider span {
  padding: 0 var(--space-md);
  color: var(--gray-500);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  font-weight: var(--font-medium);
  letter-spacing: 0.5px;
}

.admin-info {
  text-align: center;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-xs);
  font-weight: var(--font-medium);
  color: var(--warning);
  margin-bottom: var(--space-md);
}

.admin-description {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  margin: 0 0 var(--space-lg) 0;
}

.admin-button {
  width: 100%;
  padding: var(--space-md);
  background: var(--kp-secondary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  min-height: 44px;
}

.admin-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kp-secondary) 90%, black);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Spinner de chargement */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .login-page {
    padding: var(--space-md);
  }
  
  .login-card {
    padding: var(--space-lg);
  }
  
  .brand-text h1 {
    font-size: var(--font-size-2xl);
  }
}

/* Amélioration de l'accessibilité */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus pour la navigation clavier */
.form-input:focus-visible,
.submit-button:focus-visible,
.google-button:focus-visible,
.admin-button:focus-visible {
  outline: 2px solid var(--kp-primary);
  outline-offset: 2px;
}
</style>
