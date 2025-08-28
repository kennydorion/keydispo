<template>
  <div class="modern-login-page">
    <div class="login-container">
      <!-- Header avec logo -->
      <div class="login-header">
        <div class="logo">
          <div class="logo-icon">📅</div>
          <h1 class="logo-text">KeyDispo</h1>
        </div>
        <p class="tagline">Gérez vos disponibilités en toute simplicité</p>
      </div>

      <!-- Formulaire de connexion -->
      <div class="login-card">
        <h2 class="card-title">Connexion</h2>
        <div class="login-form">
          <div class="input-group">
            <label class="input-label">Adresse email</label>
            <div class="input-wrapper">
              <div class="input-icon">📧</div>
              <input 
                v-model="email" 
                type="email" 
                placeholder="Entrez votre email"
                class="modern-input"
                required
              />
            </div>
          </div>
          
          <div class="input-group">
            <label class="input-label">Mot de passe</label>
            <div class="input-wrapper">
              <div class="input-icon">🔒</div>
              <input 
                v-model="password" 
                type="password" 
                placeholder="Entrez votre mot de passe"
                class="modern-input"
                required
              />
            </div>
          </div>
          
          <div class="auth-buttons">
            <va-button 
              :loading="loading" 
              color="primary" 
              @click="loginEmail"
              class="primary-btn"
              size="large"
              block
            >
              <div class="btn-content">
                <span class="btn-icon">🔐</span>
                <span>Se connecter</span>
              </div>
            </va-button>
            
            <div class="divider">
              <span>ou</span>
            </div>
            
            <va-button 
              :loading="loading" 
              color="secondary" 
              @click="loginGoogle"
              class="google-btn"
              size="large"
              block
              preset="outline"
            >
              <div class="btn-content">
                <span class="btn-icon">🌐</span>
                <span>Continuer avec Google</span>
              </div>
            </va-button>
          </div>
          
          <va-alert v-if="error" color="danger" class="error-alert">
            {{ error }}
          </va-alert>
        </div>
      </div>
      
      <!-- Section Admin pour émulateur local -->
      <template v-if="isLocalEmulator">
        <div class="admin-card">
          <div class="admin-header">
            <div class="admin-badge">🧪 Mode Développement</div>
          </div>
          
          <div class="admin-content">
            <div class="admin-info">
              <h3>Utilisateur Administrateur</h3>
              <div class="admin-details">
                <p><strong>Email:</strong> {{ ADMIN_EMAIL }}</p>
                <p><strong>Statut:</strong> 
                  <span :class="adminUserExists ? 'status-ok' : 'status-error'">
                    {{ adminUserExists ? '✅ Disponible' : '❌ Non créé' }}
                  </span>
                </p>
              </div>
            </div>
            
            <div class="admin-actions">
              <template v-if="!adminUserExists">
                <va-button 
                  :loading="adminLoading" 
                  color="success" 
                  @click="createAdminUser"
                  size="medium"
                  class="admin-btn"
                >
                  <span class="btn-icon">➕</span>
                  Créer l'admin
                </va-button>
              </template>
              <template v-else>
                <va-button 
                  :loading="adminLoading" 
                  color="primary" 
                  @click="loginAsAdmin"
                  size="medium"
                  class="admin-btn mr-2"
                >
                  <span class="btn-icon">🚀</span>
                  Connexion admin
                </va-button>
                <va-button 
                  :loading="adminLoading" 
                  color="warning" 
                  @click="recreateAdminUser"
                  size="medium"
                  preset="outline"
                  class="admin-btn"
                >
                  <span class="btn-icon">🔄</span>
                  Recréer
                </va-button>
              </template>
            </div>
            
            <va-alert v-if="adminMessage" :color="adminMessageType" class="admin-alert">
              {{ adminMessage }}
            </va-alert>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { AuthService } from '../services/auth'
import { deleteUser, getAuth } from 'firebase/auth'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// Admin user management
const adminUserExists = ref(false)
const adminLoading = ref(false)
const adminMessage = ref('')
const adminMessageType = ref<'success' | 'danger' | 'warning'>('success')

const ADMIN_EMAIL = 'kdorion@thecompagnie.eu'
const ADMIN_PASSWORD = 'kenoche8'

// Détection de l'émulateur local
const isLocalEmulator = computed(() => {
  const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const useEmulator = (import.meta.env.VITE_USE_EMULATOR === '1') && isLocalhost
  return useEmulator
})

async function loginEmail() {
  error.value = ''
  loading.value = true
  try {
    await AuthService.signInWithEmail(email.value, password.value)
    redirectAfterLogin()
  } catch (e: any) {
    error.value = e?.message || 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}

async function loginGoogle() {
  error.value = ''
  loading.value = true
  try {
    await AuthService.signInWithGoogle()
    redirectAfterLogin()
  } catch (e: any) {
    error.value = e?.message || 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}

function redirectAfterLogin() {
  const redirect = (route.query.redirect as string) || '/semaine'
  router.replace(redirect)
}

// Admin functions
async function checkAdminUserExists() {
  if (!isLocalEmulator.value) return
  
  try {
    try {
      await AuthService.signInWithEmail(ADMIN_EMAIL, ADMIN_PASSWORD)
      adminUserExists.value = true
      // Se déconnecter immédiatement après le test
      await AuthService.signOut()
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        adminUserExists.value = false
      } else {
        adminUserExists.value = false
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'utilisateur admin:', error)
    adminUserExists.value = false
  }
}

async function createAdminUser() {
  adminLoading.value = true
  adminMessage.value = ''
  try {
    await AuthService.signUpWithEmail(ADMIN_EMAIL, ADMIN_PASSWORD, 'Kenny Dorion')
    
    // Assigner le rôle admin
    const currentUser = getAuth().currentUser
    if (currentUser) {
      await AuthService.updateUserRole(currentUser.uid, 'admin')
    }
    
    adminUserExists.value = true
    adminMessage.value = `✅ Utilisateur admin créé avec succès`
    adminMessageType.value = 'success'
    
    // Se déconnecter pour revenir à l'état de connexion
    await AuthService.signOut()
    
  } catch (e: any) {
    adminMessage.value = `❌ Erreur lors de la création : ${e.message}`
    adminMessageType.value = 'danger'
  } finally {
    adminLoading.value = false
  }
}

async function loginAsAdmin() {
  adminLoading.value = true
  adminMessage.value = ''
  try {
    await AuthService.signInWithEmail(ADMIN_EMAIL, ADMIN_PASSWORD)
    redirectAfterLogin()
  } catch (e: any) {
    adminMessage.value = `❌ Erreur de connexion admin : ${e.message}`
    adminMessageType.value = 'danger'
    adminLoading.value = false
  }
}

async function recreateAdminUser() {
  adminLoading.value = true
  adminMessage.value = ''
  try {
    // Se connecter avec l'utilisateur admin pour le supprimer
    const adminUser = await AuthService.signInWithEmail(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    // Supprimer le document utilisateur dans Firestore
    const tenantId = AuthService.currentTenantId
    const userDocRef = doc(db, `tenants/${tenantId}/users/${adminUser.uid}`)
    await deleteDoc(userDocRef)
    
    // Supprimer l'utilisateur de Firebase Auth
    await deleteUser(adminUser)
    
    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Recréer
    await createAdminUser()
    
    adminMessage.value = `✅ Utilisateur admin recréé avec succès`
    adminMessageType.value = 'success'
    
  } catch (e: any) {
    adminMessage.value = `❌ Erreur lors de la recréation : ${e.message}`
    adminMessageType.value = 'danger'
  } finally {
    adminLoading.value = false
  }
}

onMounted(() => {
  if (isLocalEmulator.value) {
    checkAdminUserExists()
  }
})
</script>

<style scoped>
.modern-login-page {
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.modern-login-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%);
  pointer-events: none;
}

.login-container {
  position: relative;
  z-index: 1;
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-header {
  text-align: center;
  margin-bottom: 12px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 3.5rem;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.logo-text {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 4px 8px rgba(0,0,0,0.3);
  letter-spacing: -1px;
  margin: 0;
}

.tagline {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin: 0;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.2),
    0 8px 25px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.card-title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 24px 0;
  background: linear-gradient(135deg, #d65745, #0e8388);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  font-weight: 700;
  font-size: 0.9rem;
  color: #374151;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
  color: #9ca3af;
  transition: color 0.3s ease;
  z-index: 2;
  pointer-events: none;
}

.modern-input {
  width: 100%;
  padding: 16px 20px 16px 52px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 500;
  background: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #1f2937;
  outline: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.modern-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.modern-input:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.modern-input:focus {
  border-color: #0e8388;
  background: white;
  box-shadow: 
    0 0 0 3px rgba(14, 131, 136, 0.1),
    0 8px 24px rgba(14, 131, 136, 0.12);
  transform: translateY(-1px);
}

.modern-input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: #6ee7b7;
}

.auth-buttons {
  margin-top: 32px;
}

.primary-btn {
  margin-bottom: 16px;
  --va-button-border-radius: 12px;
  --va-button-padding-y: 16px;
  background: linear-gradient(135deg, #d65745 0%, #0e8388 100%);
  border: none;
  box-shadow: 0 8px 24px rgba(14, 131, 136, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(14, 131, 136, 0.4);
}

.divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  text-align: center;
  color: #666;
  font-weight: 500;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #ddd, transparent);
}

.divider span {
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.9rem;
}

.google-btn {
  --va-button-border-radius: 12px;
  --va-button-padding-y: 16px;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.google-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  border-color: #cbd5e0;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-weight: 600;
}

.btn-icon {
  font-size: 1.2rem;
}

.error-alert {
  margin-top: 20px;
  border-radius: 12px;
}

.admin-card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 
    0 16px 48px rgba(0, 0, 0, 0.15),
    0 6px 20px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.admin-header {
  text-align: center;
  margin-bottom: 20px;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 16px rgba(240, 147, 251, 0.3);
}

.admin-content h3 {
  color: #333;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-align: center;
}

.admin-details {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}

.admin-details p {
  margin: 8px 0;
  font-size: 0.95rem;
  color: #4a5568;
}

.status-ok {
  color: #38a169;
  font-weight: 600;
}

.status-error {
  color: #e53e3e;
  font-weight: 600;
}

.admin-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.admin-btn {
  --va-button-border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.admin-alert {
  margin-top: 16px;
  border-radius: 12px;
}

@media (max-width: 640px) {
  .login-container {
    padding: 0 16px;
    gap: 20px;
  }
  
  .login-card {
    padding: 24px 20px;
  }
  
  .logo {
    flex-direction: column;
    gap: 8px;
  }
  
  .logo-icon {
    font-size: 2.5rem;
  }
  
  .logo-text {
    font-size: 2rem;
  }
  
  .tagline {
    font-size: 1rem;
  }
  
  .card-title {
    font-size: 1.5rem;
  }
  
  .admin-card {
    padding: 20px 16px;
  }
  
  .admin-actions {
    flex-direction: column;
  }
  
  .admin-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .modern-login-page {
    padding: 16px;
  }
  
  .login-card {
    padding: 20px 16px;
  }
  
  .btn-content {
    gap: 8px;
  }
  
  .divider span {
    padding: 0 12px;
  }
}
</style>
