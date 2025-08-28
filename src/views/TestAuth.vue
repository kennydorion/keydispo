<template>
  <div class="test-auth">
    <va-card class="auth-card">
      <va-card-title>
        <h2>Test d'Authentification</h2>
      </va-card-title>
      <va-card-content>
        <div v-if="!user" class="not-connected">
          <va-alert color="info" outline class="mb-4">
            Vous n'êtes pas connecté
          </va-alert>
          
          <div class="login-section">
            <h3>Connexion rapide (test)</h3>
            <va-input v-model="testEmail" label="Email de test" placeholder="test@example.com" class="mb-3" />
            <va-input v-model="testPassword" label="Mot de passe" placeholder="password123" type="password" class="mb-3" />
            
            <div class="actions">
              <va-button :loading="loading" color="primary" @click="loginWithTest">
                Se connecter (test)
              </va-button>
              <va-button :loading="loading" color="secondary" @click="loginWithGoogle">
                <va-icon name="google" class="mr-2" />
                Google
              </va-button>
              <va-button preset="outline" @click="goToLogin">
                Page de connexion
              </va-button>
            </div>
          </div>
          
          <va-alert v-if="error" color="danger" outline class="mt-3">
            {{ error }}
          </va-alert>
        </div>
        
        <div v-else class="connected">
          <va-alert color="success" outline class="mb-4">
            ✅ Connecté avec succès !
          </va-alert>
          
          <div class="user-info">
            <h3>Informations utilisateur</h3>
            <p><strong>Email:</strong> {{ user.email }}</p>
            <p><strong>UID:</strong> {{ user.uid }}</p>
            <p><strong>Nom:</strong> {{ user.displayName || 'Non défini' }}</p>
            <p><strong>Rôle:</strong> {{ userRole || 'En cours de chargement...' }}</p>
          </div>
          
          <div class="actions">
            <va-button color="danger" @click="logout">
              <va-icon name="logout" class="mr-2" />
              Se déconnecter
            </va-button>
            <va-button color="info" preset="outline" @click="router.push('/import')">
              Tester l'import
            </va-button>
          </div>
        </div>
        
        <!-- Section Administration - Utilisateur spécifique -->
        <va-divider class="my-4" />
        
        <div class="admin-section">
          <h3>🔧 Administration - Utilisateur Admin</h3>
          <va-alert color="warning" outline class="mb-3">
            Gestion rapide de l'utilisateur administrateur kdorion@thecompagnie.eu
          </va-alert>
          
          <div class="admin-user-status">
            <p><strong>Email:</strong> kdorion@thecompagnie.eu</p>
            <p><strong>Rôle:</strong> admin</p>
            <p><strong>Statut:</strong> {{ adminUserExists ? '✅ Créé' : '❌ Non créé' }}</p>
          </div>
          
          <div class="admin-actions">
            <va-button 
              v-if="!adminUserExists" 
              :loading="adminLoading" 
              color="success" 
              @click="createAdminUser"
            >
              <va-icon name="add" class="mr-2" />
              Créer l'utilisateur admin
            </va-button>
            
            <template v-else>
              <va-button 
                :loading="adminLoading" 
                color="danger" 
                @click="deleteAdminUser"
                class="mr-2"
              >
                <va-icon name="delete" class="mr-2" />
                Supprimer l'utilisateur
              </va-button>
              
              <va-button 
                :loading="adminLoading" 
                color="warning" 
                @click="recreateAdminUser"
              >
                <va-icon name="refresh" class="mr-2" />
                Supprimer et recréer
              </va-button>
            </template>
          </div>
          
          <va-alert v-if="adminMessage" :color="adminMessageType" outline class="mt-3">
            {{ adminMessage }}
          </va-alert>
        </div>
      </va-card-content>
    </va-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { AuthService } from '../services/auth'
import type { User } from 'firebase/auth'
import { deleteUser, getAuth } from 'firebase/auth'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

const router = useRouter()

const user = ref<User | null>(null)
const userRole = ref<string | null>(null)
const loading = ref(false)
const error = ref('')

const testEmail = ref('test@keydispo.fr')
const testPassword = ref('password123')

// Admin user management
const adminUserExists = ref(false)
const adminLoading = ref(false)
const adminMessage = ref('')
const adminMessageType = ref<'success' | 'danger' | 'warning'>('success')

const ADMIN_EMAIL = 'kdorion@thecompagnie.eu'
const ADMIN_PASSWORD = 'kenoche8'

async function loginWithTest() {
  error.value = ''
  loading.value = true
  try {
    await AuthService.signInWithEmail(testEmail.value, testPassword.value)
  } catch (e: any) {
    // Si l'utilisateur n'existe pas, on le crée
    if (e.code === 'auth/user-not-found') {
      try {
        await AuthService.signUpWithEmail(testEmail.value, testPassword.value, 'Utilisateur Test')
      } catch (signUpError: any) {
        error.value = signUpError?.message || 'Erreur lors de la création du compte'
      }
    } else {
      error.value = e?.message || 'Erreur de connexion'
    }
  } finally {
    loading.value = false
  }
}

async function loginWithGoogle() {
  error.value = ''
  loading.value = true
  try {
    await AuthService.signInWithGoogle()
  } catch (e: any) {
    error.value = e?.message || 'Erreur de connexion Google'
  } finally {
    loading.value = false
  }
}

async function logout() {
  await AuthService.signOut()
}

function goToLogin() {
  router.push('/login')
}

async function loadUserRole() {
  if (user.value) {
    const role = await AuthService.getUserRole(user.value.uid)
    userRole.value = role?.role || null
  }
}

async function checkAdminUserExists() {
  try {
    // Pour les émulateurs, on peut essayer de se connecter pour vérifier
    const currentUser = user.value
    try {
      const testResult = await AuthService.signInWithEmail(ADMIN_EMAIL, ADMIN_PASSWORD)
      adminUserExists.value = true
      // Se reconnecter avec l'utilisateur précédent si il y en avait un
      if (currentUser && testResult.uid !== currentUser.uid) {
        await AuthService.signOut()
        // Pas de reconnexion automatique pour éviter les conflits
      }
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
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
    adminMessage.value = `✅ Utilisateur admin créé avec succès : ${ADMIN_EMAIL}`
    adminMessageType.value = 'success'
    
    // Recharger les informations utilisateur
    await checkAdminUserExists()
    
  } catch (e: any) {
    adminMessage.value = `❌ Erreur lors de la création : ${e.message}`
    adminMessageType.value = 'danger'
  } finally {
    adminLoading.value = false
  }
}

async function deleteAdminUser() {
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
    
    adminUserExists.value = false
    adminMessage.value = `✅ Utilisateur admin supprimé avec succès`
    adminMessageType.value = 'success'
    
    // Déconnecter si c'était l'utilisateur actuel
    user.value = null
    userRole.value = null
    
  } catch (e: any) {
    adminMessage.value = `❌ Erreur lors de la suppression : ${e.message}`
    adminMessageType.value = 'danger'
  } finally {
    adminLoading.value = false
  }
}

async function recreateAdminUser() {
  adminLoading.value = true
  adminMessage.value = ''
  try {
    // Supprimer d'abord
    await deleteAdminUser()
    
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
  AuthService.onAuthStateChanged(async (u) => {
    user.value = u
    if (u) {
      await loadUserRole()
    } else {
      userRole.value = null
    }
  })
  
  // Vérifier l'existence de l'utilisateur admin
  checkAdminUserExists()
})
</script>

<style scoped>
.test-auth {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.auth-card {
  max-width: 600px;
  width: 100%;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.user-info {
  margin: 20px 0;
  padding: 15px;
  background: var(--va-background-element);
  border-radius: 8px;
}

.user-info p {
  margin: 8px 0;
}

.login-section h3 {
  margin-bottom: 15px;
  color: var(--va-primary);
}

.admin-section {
  margin-top: 20px;
  padding: 20px;
  background: var(--va-background-element);
  border-radius: 8px;
  border-left: 4px solid var(--va-warning);
}

.admin-section h3 {
  margin-bottom: 15px;
  color: var(--va-warning);
}

.admin-user-status {
  margin: 15px 0;
  padding: 15px;
  background: var(--va-background-secondary);
  border-radius: 6px;
}

.admin-user-status p {
  margin: 8px 0;
  font-weight: 500;
}

.admin-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 15px 0;
}
</style>
