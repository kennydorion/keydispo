<template>
  <div class="parametres">
    <!-- Header élégant similaire au planning -->
    <div class="parametres-header">
      <div class="header-top">
        <div class="header-brand">
          <div class="brand-icon">
            <va-icon name="settings" />
          </div>
          <div class="brand-content">
            <h1 class="brand-title">Paramètres</h1>
            <p class="brand-subtitle">Configuration et préférences</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Conteneur principal -->
    <div class="parametres-container">
      <div class="parametres-grid">
        <!-- Profil utilisateur -->
        <va-card class="parametre-card" elevation="2">
          <va-card-title class="parametre-title">
            <va-icon name="person" class="parametre-icon" />
            Profil utilisateur
          </va-card-title>
          <va-card-content class="parametre-content">
            <div class="form-grid">
              <va-input
                v-model="userDisplayName"
                label="Nom complet"
                readonly
                class="readonly-input"
              />
              <va-input
                v-model="userEmail"
                label="Email"
                readonly
                class="readonly-input"
              />
              <va-input
                v-model="userRole"
                label="Rôle"
                readonly
                class="readonly-input"
              />
              <va-input
                v-model="currentTenantId"
                label="Tenant ID"
                readonly
                class="readonly-input"
              />
            </div>
          </va-card-content>
        </va-card>

        <!-- Code secret admin (visible uniquement pour les admins) -->
        <va-card v-if="userRole === 'admin'" class="parametre-card" elevation="2">
          <va-card-title class="parametre-title">
            <va-icon name="admin_panel_settings" class="parametre-icon" />
            Administration
          </va-card-title>
          <va-card-content class="parametre-content">
            <div class="admin-section">
              <div class="admin-info">
                <h4>Code secret pour création de compte admin</h4>
                <p class="admin-description">
                  Partagez ce code avec les nouveaux administrateurs pour qu'ils puissent créer leur compte.
                </p>
              </div>
              
              <div class="secret-code-display">
                <div class="code-container">
                  <va-input
                    :model-value="ADMIN_SECRET_CODE"
                    label="Code secret"
                    readonly
                    class="code-input"
                  >
                    <template #appendInner>
                      <va-button
                        preset="plain"
                        icon="content_copy"
                        @click="copyCodeToClipboard"
                        size="small"
                        :color="codeCopied ? 'success' : 'primary'"
                      />
                    </template>
                  </va-input>
                </div>
                <div v-if="codeCopied" class="copy-success">
                  <va-icon name="check_circle" color="success" size="small" />
                  Code copié dans le presse-papiers
                </div>
              </div>
              
              <div class="admin-actions">
                <va-button
                  preset="outline"
                  icon="person_add"
                  @click="openRegisterPage"
                  color="primary"
                >
                  Créer un nouveau compte admin
                </va-button>
              </div>
            </div>
          </va-card-content>
        </va-card>

        <!-- Liste des admins (visible uniquement pour kdorion@thecompagnie.eu) -->
        <va-card v-if="isSuperAdmin" class="parametre-card" elevation="2">
          <va-card-title class="parametre-title">
            <va-icon name="supervisor_account" class="parametre-icon" />
            Super Administration
          </va-card-title>
          <va-card-content class="parametre-content">
            <div class="super-admin-section">
              <div class="super-admin-info">
                <h4>Tous les comptes administrateurs</h4>
                <p class="super-admin-description">
                  Liste de tous les comptes avec privilèges administrateur sur l'application.
                </p>
              </div>
              
              <div class="admins-list">
                <div v-if="loadingAdmins" class="loading-state">
                  <va-progress-circle indeterminate />
                  <span>Chargement des administrateurs...</span>
                </div>
                
                <div v-else-if="adminsList.length === 0" class="empty-admins">
                  <va-icon name="admin_panel_settings" size="48px" color="secondary" />
                  <p>Aucun administrateur trouvé</p>
                </div>
                
                <div v-else class="admins-grid">
                  <div 
                    v-for="admin in adminsList" 
                    :key="admin.uid"
                    class="admin-item"
                  >
                    <div class="admin-avatar">
                      <div class="avatar-circle">
                        {{ getInitials(admin.displayName || admin.email) }}
                      </div>
                      <div class="admin-status" :class="getStatusClass(admin.lastAccess)">
                        <va-icon :name="getStatusIcon(admin.lastAccess)" size="12px" />
                      </div>
                    </div>
                    
                    <div class="admin-details">
                      <div class="admin-name">
                        {{ admin.displayName || 'Nom non défini' }}
                      </div>
                      <div class="admin-email">
                        {{ admin.email }}
                      </div>
                      <div class="admin-meta">
                        <span class="admin-role-badge">
                          <va-icon name="admin_panel_settings" size="12px" />
                          Administrateur
                        </span>
                        <span class="admin-dates">
                          Créé le {{ formatDateShort(admin.createdAt) }}
                        </span>
                      </div>
                      <div class="admin-last-access">
                        Dernière connexion : {{ formatRelativeTime(admin.lastAccess) }}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="admins-actions">
                  <va-button
                    preset="outline"
                    icon="refresh"
                    @click="refreshAdminsList"
                    :loading="loadingAdmins"
                    size="small"
                  >
                    Actualiser
                  </va-button>
                  <div class="admins-count">
                    Total : {{ adminsList.length }} administrateur{{ adminsList.length > 1 ? 's' : '' }}
                  </div>
                </div>
              </div>
            </div>
          </va-card-content>
        </va-card>

        <!-- Collaboration en temps réel -->
        <va-card class="parametre-card" elevation="2">
          <va-card-title class="parametre-title">
            <va-icon name="palette" class="parametre-icon" />
            Collaboration en temps réel
          </va-card-title>
          <va-card-content class="parametre-content">
            <div class="color-section">
              <div class="color-label-section">
                <label class="color-main-label">Couleur de présence</label>
                <p class="color-description">
                  Cette couleur représente votre présence lors de la collaboration en temps réel
                </p>
              </div>
              
              <!-- Aperçu des couleurs -->
              <div class="color-preview">
                <div class="color-comparison">
                  <!-- Couleur actuelle sauvegardée -->
                  <div class="color-display-section">
                    <h5>Couleur actuelle</h5>
                    <div class="current-color-display">
                      <div 
                        class="color-circle"
                        :style="{ backgroundColor: currentUserColor }"
                      ></div>
                      <div class="color-info">
                        <div class="color-label">
                          {{ preferences.presenceColor ? 'Couleur personnalisée' : 'Couleur automatique' }}
                        </div>
                        <div class="color-value">{{ currentUserColor }}</div>
                      </div>
                      <div 
                        class="user-initials-preview"
                        :style="{ backgroundColor: currentUserColor }"
                      >{{ userInitials }}</div>
                    </div>
                  </div>

                  <!-- Aperçu de la couleur sélectionnée -->
                  <div v-if="selectedColor && selectedColor !== preferences.presenceColor" class="color-display-section">
                    <h5>Aperçu nouvelle couleur</h5>
                    <div class="current-color-display preview">
                      <div 
                        class="color-circle"
                        :style="{ backgroundColor: selectedColor }"
                      ></div>
                      <div class="color-info">
                        <div class="color-label">Nouvelle couleur</div>
                        <div class="color-value">{{ selectedColor }}</div>
                      </div>
                      <div 
                        class="user-initials-preview"
                        :style="{ backgroundColor: selectedColor }"
                      >{{ userInitials }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Palette de couleurs prédéfinies -->
              <div class="color-palette">
                <h4>Couleurs prédéfinies</h4>
                <div class="color-grid">
                  <div 
                    v-for="color in availableColors" 
                    :key="color.value"
                    class="color-option"
                    :class="{ 
                      'selected': selectedColor === color.value,
                      'saved': preferences.presenceColor === color.value 
                    }"
                    @click="selectColor(color.value)"
                  >
                    <div 
                      class="color-swatch"
                      :style="{ backgroundColor: color.value }"
                    ></div>
                    <div class="color-name">{{ color.name }}</div>
                    <div v-if="preferences.presenceColor === color.value" class="saved-indicator">✓</div>
                  </div>
                </div>
              </div>

              <div class="action-buttons">
                <va-button 
                  color="primary"
                  @click="saveColorChoice"
                  :loading="saving"
                  :disabled="!selectedColor || selectedColor === preferences.presenceColor"
                >
                  {{ saving ? 'Sauvegarde...' : 'Appliquer la couleur' }}
                </va-button>
                <va-button 
                  preset="secondary"
                  @click="resetToDefault"
                  :disabled="saving || !hasSelectedColor"
                >
                  Couleur automatique
                </va-button>
              </div>
            </div>
          </va-card-content>
        </va-card>
      </div>
      
      <!-- Footer avec statut -->
      <div class="parametres-footer">
        <div class="save-status">
          <va-icon 
            v-if="lastSaved" 
            name="check_circle" 
            color="success" 
            size="16px"
          />
          <span v-if="lastSaved" class="save-text">
            Dernière sauvegarde : {{ formatDate(lastSaved) }}
          </span>
        </div>
        <div class="footer-actions">
          <va-button 
            preset="secondary"
            size="large" 
            @click="resetAllToDefaults"
          >
            Réinitialiser
          </va-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthService } from '../services/auth'
import UserPreferencesService, { useUserPreferences } from '../services/userPreferences'
import { useToast } from 'vuestic-ui'
import type { TenantUser } from '../types'

// State des preferences
const { preferences, loadPreferences, savePreferences, updatePresenceColor } = useUserPreferences()

// État utilisateur
const user = ref<User | null>(null)
const userRole = ref('—')

// État pour la couleur de présence
const selectedColor = ref('')
const saving = ref(false)
const lastSaved = ref<Date | null>(null)

// État pour le code admin
const ADMIN_SECRET_CODE = 'KPADMIN2025'
const codeCopied = ref(false)

// État pour la super administration
const adminsList = ref<TenantUser[]>([])
const loadingAdmins = ref(false)

// Toast pour les notifications
const { init: toast } = useToast()

// Listener d'authentification
let unsubscribeAuth: (() => void) | null = null

// Computed properties pour l'affichage utilisateur
const userDisplayName = computed(() => {
  if (!user.value) return '—'
  return user.value.displayName || user.value.email?.split('@')[0] || '—'
})

const userEmail = computed(() => user.value?.email || '—')

const currentTenantId = computed(() => AuthService.currentTenantId)

// Vérifier si l'utilisateur actuel est le super admin
const isSuperAdmin = computed(() => {
  return user.value?.email?.toLowerCase() === 'kdorion@thecompagnie.eu'
})

const userInitials = computed(() => {
  if (!user.value) return '??'
  
  const name = user.value.displayName
  if (name) {
    // Extraire les initiales du nom complet
    const parts = name.split(' ').filter((p: string) => p.length > 0)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  // Fallback sur l'email
  const email = user.value.email
  if (email) {
    const localPart = email.split('@')[0]
    return localPart.substring(0, 2).toUpperCase()
  }
  
  return '??'
})

// Couleurs disponibles
const availableColors = computed(() => UserPreferencesService.getAvailableColors())

// Couleur actuelle de l'utilisateur
const currentUserColor = computed(() => {
  if (!user.value) return '#6b7280'
  
  // Utiliser les préférences réactives
  return preferences.value.presenceColor || getDefaultUserColor(user.value.uid)
})

// Watcher pour synchroniser selectedColor avec les préférences
watch(() => preferences.value.presenceColor, (newColor) => {
  if (newColor) {
    selectedColor.value = newColor
  } else {
    // Pas de couleur personnalisée, utiliser la couleur par défaut
    selectedColor.value = ''
  }
}, { immediate: true })

// Computed pour vérifier si une couleur est sélectionnée
const hasSelectedColor = computed(() => !!selectedColor.value)

/**
 * Calculer la couleur par défaut basée sur l'UID (même logique que SemaineVirtualClean)
 */
function getDefaultUserColor(uid: string): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#06b6d4', '#f97316', '#84cc16'
  ]
  
  let hash = 0
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash + uid.charCodeAt(i)) & 0xffffffff
  }
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Sélectionner une couleur
 */
function selectColor(color: string) {
  selectedColor.value = color
}

/**
 * Sauvegarder le choix de couleur
 */
async function saveColorChoice() {
  if (!user.value || !selectedColor.value) return
  
  try {
    saving.value = true
    
    
    // Utiliser la méthode du composable pour cohérence
    await updatePresenceColor(user.value.uid, selectedColor.value)
    lastSaved.value = new Date()
    
    
    
    toast({
      message: 'Couleur de présence mise à jour avec succès',
      color: 'success',
      duration: 3000
    })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    toast({
      message: 'Erreur lors de la sauvegarde de la couleur',
      color: 'danger',
      duration: 5000
    })
  } finally {
    saving.value = false
  }
}

/**
 * Réinitialiser à la couleur automatique
 */
async function resetToDefault() {
  if (!user.value) return
  
  try {
    saving.value = true
    
    // Sauvegarder sans couleur personnalisée (supprime la préférence)
    const newPrefs = { ...preferences.value }
    delete newPrefs.presenceColor
    await savePreferences(user.value.uid, newPrefs)
    
    // Réinitialiser l'état local
    selectedColor.value = ''
    lastSaved.value = new Date()
    
    toast({
      message: 'Couleur réinitialisée à la valeur automatique',
      color: 'info',
      duration: 3000
    })
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error)
    toast({
      message: 'Erreur lors de la réinitialisation',
      color: 'danger',
      duration: 5000
    })
  } finally {
    saving.value = false
  }
}

/**
 * Réinitialiser toutes les préférences
 */
async function resetAllToDefaults() {
  if (!user.value) return
  
  try {
    saving.value = true
    await UserPreferencesService.resetToDefaults(user.value.uid)
    selectedColor.value = ''
    lastSaved.value = new Date()
    
    toast({
      message: 'Toutes les préférences ont été réinitialisées',
      color: 'info',
      duration: 3000
    })
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error)
    toast({
      message: 'Erreur lors de la réinitialisation',
      color: 'danger',
      duration: 5000
    })
  } finally {
    saving.value = false
  }
}

/**
 * Formater une date pour l'affichage
 */
function formatDate(date: Date | number): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(dateObj)
}

/**
 * Copier le code secret dans le presse-papiers
 */
async function copyCodeToClipboard() {
  try {
    await navigator.clipboard.writeText(ADMIN_SECRET_CODE)
    codeCopied.value = true
    toast({
      message: 'Code secret copié dans le presse-papiers',
      color: 'success'
    })
    
    // Réinitialiser l'indicateur après 3 secondes
    setTimeout(() => {
      codeCopied.value = false
    }, 3000)
  } catch (error) {
    console.error('Erreur lors de la copie:', error)
    toast({
      message: 'Erreur lors de la copie du code',
      color: 'danger'
    })
  }
}

/**
 * Ouvrir la page d'inscription admin dans un nouvel onglet
 */
function openRegisterPage() {
  window.open('/register', '_blank')
}

/**
 * Charger la liste des administrateurs (super admin uniquement)
 */
async function loadAdminsList() {
  if (!isSuperAdmin.value || !user.value) return
  
  try {
    loadingAdmins.value = true
    adminsList.value = await AuthService.getAllAdmins(user.value.email!)
    
  } catch (error) {
    console.error('Erreur lors du chargement des admins:', error)
    toast({
      message: 'Erreur lors du chargement de la liste des administrateurs',
      color: 'danger',
      duration: 5000
    })
  } finally {
    loadingAdmins.value = false
  }
}

/**
 * Actualiser la liste des administrateurs
 */
async function refreshAdminsList() {
  await loadAdminsList()
  toast({
    message: 'Liste des administrateurs actualisée',
    color: 'info',
    duration: 2000
  })
}

/**
 * Obtenir les initiales d'un nom ou email
 */
function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return '??'
  
  // Si c'est un nom complet
  if (nameOrEmail.includes(' ')) {
    const parts = nameOrEmail.split(' ').filter(p => p.length > 0)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  // Si c'est un email
  if (nameOrEmail.includes('@')) {
    const localPart = nameOrEmail.split('@')[0]
    return localPart.substring(0, 2).toUpperCase()
  }
  
  // Autres cas
  return nameOrEmail.substring(0, 2).toUpperCase()
}

/**
 * Obtenir la classe CSS pour le statut de connexion
 */
function getStatusClass(lastAccess: Date): string {
  const now = new Date()
  const diffHours = (now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60)
  
  if (diffHours < 1) return 'status-online'
  if (diffHours < 24) return 'status-recent'
  if (diffHours < 168) return 'status-week'
  return 'status-old'
}

/**
 * Obtenir l'icône pour le statut de connexion
 */
function getStatusIcon(lastAccess: Date): string {
  const now = new Date()
  const diffHours = (now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60)
  
  if (diffHours < 1) return 'circle'
  if (diffHours < 24) return 'schedule'
  return 'history'
}

/**
 * Formater une date en format court
 */
function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

/**
 * Formater un temps relatif
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`
  
  return formatDateShort(date)
}

/**
 * Charger les données utilisateur et préférences
 */
async function loadUserData() {
  if (!user.value) return
  
  try {
    
    
    // Charger les préférences
    await loadPreferences(user.value.uid)
    
    
    // Charger le rôle utilisateur
    const userRoleData = await AuthService.getUserRole(user.value.uid)
    userRole.value = userRoleData?.role || 'viewer'
    
    // Synchroniser la couleur sélectionnée avec les préférences
    selectedColor.value = preferences.value.presenceColor || ''
    
    
    // Charger la liste des admins si super admin
    if (isSuperAdmin.value) {
      await loadAdminsList()
    }
    
  } catch (error) {
    console.error('Erreur lors du chargement des données utilisateur:', error)
  }
}

// Watcher pour synchroniser selectedColor avec les préférences
watch(() => preferences.value.presenceColor, (newColor) => {
  selectedColor.value = newColor || ''
  
}, { immediate: true })

// Setup de l'authentification
onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
    user.value = authUser
    if (authUser) {
      await loadUserData()
    }
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth()
  }
})
</script>

<style scoped>
/* ===============================
   VARIABLES GLOBALES
   =============================== */
.parametres {
  /* Variables CSS inspirées du planning */
  --surface-light: #ffffff;
  --border-light: #e2e8f0;
  --text-light: #334155;
  --text-muted: #64748b;
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.05);
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --success-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  
  font-family: var(--va-font-family, 'Inter', sans-serif);
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===============================
   HEADER ÉLÉGANT (inspiré du planning)
   =============================== */
.parametres-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface-light);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-soft);
  height: 80px;
  min-height: 80px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 16px 24px;
  background: var(--primary-gradient);
  color: white;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.brand-icon :deep(.va-icon) {
  font-size: 22px;
  color: white;
}

.brand-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.brand-subtitle {
  margin: 2px 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
  line-height: 1.2;
}

/* ===============================
   CONTENEUR PRINCIPAL
   =============================== */
.parametres-container {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

/* ===============================
   GRID ET CARTES
   =============================== */
.parametres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.parametre-card {
  border-radius: 16px !important;
  border: 1px solid var(--border-light) !important;
  background: var(--surface-light) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  box-shadow: var(--shadow-card) !important;
  overflow: hidden !important;
}

.parametre-card:hover {
  transform: translateY(-2px) !important;
  box-shadow: var(--shadow-soft) !important;
}

/* ===============================
   TITRES DE CARTES
   =============================== */
.parametre-title {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  font-size: 1.2rem !important;
  font-weight: 600 !important;
  color: var(--text-light) !important;
  margin-bottom: 0 !important;
  padding: 20px 24px 16px 24px !important;
  border-bottom: 1px solid var(--border-light) !important;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
}

.parametre-icon {
  color: #667eea !important;
  font-size: 24px !important;
}

/* ===============================
   CONTENU DES CARTES
   =============================== */
.parametre-content {
  padding: 24px !important;
}

.form-grid {
  display: grid;
  gap: 20px;
}

/* ===============================
   INPUTS RAFFINÉS
   =============================== */
.readonly-input :deep(.va-input-wrapper) {
  background: #f8fafc !important;
  border: 1px solid var(--border-light) !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

.readonly-input :deep(.va-input-wrapper:hover) {
  border-color: #667eea !important;
}

.readonly-input :deep(.va-input-wrapper__field) {
  padding: 12px 16px !important;
  font-size: 0.95rem !important;
  color: #000000 !important;
  font-weight: 500 !important;
}

.readonly-input :deep(.va-input-wrapper__label) {
  font-size: 0.85rem !important;
  font-weight: 600 !important;
  color: #667eea !important;
  margin-bottom: 6px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
}

/* Correction des couleurs des inputs en général pour cette page */
:deep(.va-input__content__input) {
  color: #000000 !important;
}

:deep(.va-input__container .va-icon) {
  color: #000000 !important;
}

:deep(.va-input__content__input::placeholder) {
  color: #a0aec0 !important;
}

/* ===============================
   SECTION COULEUR RAFFINÉE
   =============================== */
.color-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.color-label-section {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid var(--border-light);
}

.color-main-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-light);
  display: block;
  margin-bottom: 6px;
}

.color-description {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

/* Aperçu des couleurs */
.color-preview {
  margin-bottom: 20px;
}

.color-comparison {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.color-display-section {
  flex: 1;
  min-width: 260px;
}

.color-display-section h5 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.current-color-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--surface-light);
  border-radius: 12px;
  border: 1px solid var(--border-light);
  transition: all 0.3s ease;
}

.current-color-display.preview {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.2);
}

.color-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.color-info {
  flex: 1;
}

.color-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-light);
  margin-bottom: 4px;
}

.color-value {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.user-initials-preview {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

/* ===============================
   PALETTE DE COULEURS MODERNE
   =============================== */
.color-palette h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-light);
  margin-bottom: 16px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.color-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid transparent;
  background: var(--surface-light);
}

.color-option:hover {
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.color-option.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.25);
}

.color-option.saved {
  border-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.saved-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.color-option:hover .color-swatch {
  transform: scale(1.1);
}

.color-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-light);
  text-align: center;
  line-height: 1.2;
}

/* ===============================
   BOUTONS MODERNES
   =============================== */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

:deep(.va-button) {
  border-radius: 8px !important;
  font-weight: 500 !important;
  padding: 10px 20px !important;
  font-size: 0.9rem !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  text-transform: none !important;
}

:deep(.va-button:hover) {
  transform: translateY(-1px) !important;
}

:deep(.va-button--primary) {
  background: var(--primary-gradient) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
}

:deep(.va-button--primary:hover) {
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
}

:deep(.va-button--secondary) {
  background: var(--surface-light) !important;
  border: 1px solid var(--border-light) !important;
  color: var(--text-light) !important;
}

:deep(.va-button--secondary:hover) {
  border-color: #667eea !important;
  color: #667eea !important;
  background: #f8fafc !important;
}

/* ===============================
   FOOTER ÉLÉGANT
   =============================== */
.parametres-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-top: 1px solid var(--border-light);
  background: var(--surface-light);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.save-text {
  color: #10b981;
  font-weight: 500;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

/* ===============================
   RESPONSIVE DESIGN
   =============================== */
@media (max-width: 768px) {
  .header-top {
    padding: 12px 16px;
  }
  
  .brand-icon {
    width: 38px;
    height: 38px;
  }
  
  .brand-icon :deep(.va-icon) {
    font-size: 20px;
  }
  
  .brand-title {
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .brand-subtitle {
    font-size: 0.8rem;
  }
  
  .parametres-container {
    padding: 20px 16px;
  }
  
  .parametres-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .parametres-footer {
    flex-direction: column;
    gap: 16px;
    padding: 20px 16px;
  }
  
  .color-comparison {
    flex-direction: column;
    gap: 16px;
  }
  
  .color-display-section {
    width: 100%;
    min-width: unset;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  :deep(.va-button) {
    width: 100% !important;
  }
}

@media (max-width: 480px) {
  .header-top {
    padding: 10px 12px;
    gap: 8px;
  }
  
  .brand-icon {
    width: 34px;
    height: 34px;
  }
  
  .brand-icon :deep(.va-icon) {
    font-size: 18px;
  }
  
  .brand-title {
    font-size: 1rem;
    line-height: 1.2;
  }
  
  .brand-subtitle {
    font-size: 0.75rem;
    line-height: 1.2;
  }
  
  .parametres-container {
    padding: 16px 12px;
  }
  
  .color-grid {
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 10px;
  }
  
  .parametre-content {
    padding: 20px !important;
  }
  
  .parametre-title {
    padding: 16px 20px 12px 20px !important;
    font-size: 1.1rem !important;
  }
}

/* Styles pour la section admin */
.admin-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.admin-info h4 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
}

.admin-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
}

.secret-code-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.code-container {
  max-width: 300px;
}

.code-input :deep(.va-input__container) {
  background: #f9fafb;
  border: 2px dashed #d1d5db;
}

.copy-success {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #16a34a;
  font-size: 0.85rem;
  font-weight: 500;
}

.admin-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* Styles pour la gestion de la liste blanche */
.security-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.security-info {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.security-description {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
  color: #2c3e50;
}

.security-note {
  margin: 0;
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

.allowlist-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.empty-allowlist {
  text-align: center;
  padding: 32px 16px;
  color: #6c757d;
}

.empty-allowlist p {
  margin: 8px 0;
}

.empty-note {
  font-size: 0.85rem;
  font-style: italic;
}

.allowlist-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.allowlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.email-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.email-text {
  font-weight: 500;
  color: #2c3e50;
}

.email-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.role-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.role-admin {
  background: #dc3545;
  color: white;
}

.role-editor {
  background: #fd7e14;
  color: white;
}

.role-viewer {
  background: #6c757d;
  color: white;
}

.role-collaborateur {
  background: #28a745;
  color: white;
}

.added-date {
  font-size: 0.75rem;
  color: #6c757d;
}

.add-email-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* ===============================
   SUPER ADMINISTRATION STYLES
   =============================== */
.super-admin-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.super-admin-info h4 {
  margin: 0 0 8px 0;
  color: #dc2626;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.super-admin-info h4::before {
  content: "🔒";
  font-size: 1rem;
}

.super-admin-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
}

.admins-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.empty-admins {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.empty-admins p {
  margin: 12px 0;
  font-size: 1rem;
}

.admins-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.admin-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: var(--surface-light);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.admin-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
  border-color: #667eea;
}

.admin-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.admin-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-online {
  background: #10b981;
  color: white;
}

.status-recent {
  background: #f59e0b;
  color: white;
}

.status-week {
  background: #6b7280;
  color: white;
}

.status-old {
  background: #ef4444;
  color: white;
}

.admin-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-light);
  line-height: 1.3;
}

.admin-email {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  max-width: fit-content;
}

.admin-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.admin-role-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.admin-dates {
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 4px 8px;
  background: #f8fafc;
  border-radius: 6px;
}

.admin-last-access {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

.admins-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 0 0;
  border-top: 1px solid var(--border-light);
  flex-wrap: wrap;
  gap: 12px;
}

.admins-count {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 500;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}

/* Responsive pour la section super admin */
@media (max-width: 768px) {
  .admin-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }
  
  .admin-details {
    align-items: center;
  }
  
  .admin-email {
    font-size: 0.8rem;
    word-break: break-all;
  }
  
  .admins-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .admins-count {
    text-align: center;
  }
}
</style>
