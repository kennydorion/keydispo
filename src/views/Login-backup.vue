<template>
  <main class="login-page" aria-label="Page de connexion">
    <div class="login-container">
      <!-- En-tête avec logo -->
      <header class="login-header" aria-label="En-tête Key Placement">
        <div class="brand-section" tabindex="0" aria-label="Accueil Key Placement">
          <img src="/keyplacementlogo.svg" alt="Logo Key Placement" class="brand-logo" />
          <div class="brand-text">
            <h1>Key Placement</h1>
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
            <div v-if="adminCreated" class="success-message">
              Compte admin créé ! Email: admin@test.com | Mot de passe: admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const isCreatingAdmin = ref(false)
const adminCreated = ref(false)

// Détecter si on est sur l'émulateur
const isEmulator = computed(() => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.port === '5173' ||
         import.meta.env.DEV
})

const handleLogin = async () => {
  // Logique de connexion à implémenter
  console.log('Login attempt:', { email: email.value, password: password.value })
}

const signInWithGoogle = async () => {
  // Logique de connexion Google à implémenter
  console.log('Google sign in')
}

const createAdminAccount = async () => {
  if (!isEmulator.value) return
  
  isCreatingAdmin.value = true
  error.value = ''
  
  try {
    // Simuler la création d'un compte admin
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Dans un vrai projet, ici on appellerait Firebase Auth pour créer le compte
    console.log('Creating admin account...')
    
    adminCreated.value = true
    
    // Auto-remplir les champs avec les identifiants admin
    email.value = 'admin@test.com'
    password.value = 'admin123'
    
  } catch (err) {
    error.value = 'Erreur lors de la création du compte admin'
    console.error('Admin creation error:', err)
  } finally {
    isCreatingAdmin.value = false
  }
}
</script>

<style scoped>
/* Variables CSS */
:root {
  --kp-primary: #2563EB;
  --kp-secondary: #10B981;
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
  --error: #EF4444;
  --warning: #F59E0B;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

.login-page {
  min-height: 100vh;
  background: #F9FAFB;
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

.brand-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.brand-text h1 {
  font-size: 1.875rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}

.brand-text p {
  font-size: 1.125rem;
  color: #6B7280;
  margin: 4px 0 0 0;
}

.login-card {
  background: #fff;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 4px 20px 0 #2563eb0d;
  border: 1.5px solid #f1f5f9;
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
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.18s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #2563EB;
}

.form-input::placeholder {
  color: #9CA3AF;
}

.submit-button {
  width: 100%;
  padding: 12px 16px;
  background: #2563EB;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-bottom: 24px;
}

.submit-button:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.submit-button:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
  transform: none;
}

.google-button {
  width: 100%;
  padding: 12px 16px;
  background: #fff;
  color: #374151;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 48px;
}

.google-button:hover:not(:disabled) {
  background: #F9FAFB;
  border-color: #2563EB;
  transform: translateY(-1px);
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
  color: #6B7280;
  font-size: 0.875rem;
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

