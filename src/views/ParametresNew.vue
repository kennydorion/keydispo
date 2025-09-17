<template>
  <div class="parametres">
    <div class="parametres-header">
      <h1>Paramètres</h1>
      <p>Configuration et préférences de l'application</p>
    </div>
    
    <div class="parametres-grid">
      <!-- Profil utilisateur -->
      <va-card class="parametre-card">
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

      <!-- Collaboration en temps réel -->
      <va-card class="parametre-card">
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthService } from '../services/auth'
import UserPreferencesService, { useUserPreferences } from '../services/userPreferences'
import { useToast } from 'vuestic-ui'

// State des preferences
const { preferences, loadPreferences, savePreferences, updatePresenceColor } = useUserPreferences()

// État utilisateur
const user = ref<User | null>(null)
const userRole = ref('—')

// État pour la couleur de présence
const selectedColor = ref('')
const saving = ref(false)
const lastSaved = ref<Date | null>(null)

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
    console.log('🎨 Sauvegarde couleur de présence:', selectedColor.value, 'pour utilisateur:', user.value.uid)
    
    // Utiliser la méthode du composable pour cohérence
    await updatePresenceColor(user.value.uid, selectedColor.value)
    lastSaved.value = new Date()
    
    console.log('✅ Couleur sauvegardée, nouvelle valeur preferences:', preferences.value.presenceColor)
    
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
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

/**
 * Charger les données utilisateur et préférences
 */
async function loadUserData() {
  if (!user.value) return
  
  try {
    console.log('🔄 Chargement des données utilisateur:', user.value.uid)
    
    // Charger les préférences
    await loadPreferences(user.value.uid)
    console.log('✅ Préférences chargées:', preferences.value)
    
    // Charger le rôle utilisateur
    const userRoleData = await AuthService.getUserRole(user.value.uid)
    userRole.value = userRoleData?.role || 'viewer'
    
    // Synchroniser la couleur sélectionnée avec les préférences
    selectedColor.value = preferences.value.presenceColor || ''
    console.log('🎨 Couleur synchronisée:', selectedColor.value)
    
  } catch (error) {
    console.error('Erreur lors du chargement des données utilisateur:', error)
  }
}

// Watcher pour synchroniser selectedColor avec les préférences
watch(() => preferences.value.presenceColor, (newColor) => {
  selectedColor.value = newColor || ''
  console.log('🎨 Couleur mise à jour automatiquement:', newColor)
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
  padding: 0;
  font-family: var(--va-font-family, 'Inter', sans-serif);
  background: var(--va-background-primary, #f8fafc);
  min-height: 100vh;
}

/* ===============================
   HEADER
   =============================== */
.parametres-header {
  margin-bottom: 32px;
  text-align: center;
  padding: 2rem 0;
}

.parametres-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--va-primary, #3b82f6);
  margin: 0 0 12px 0;
  line-height: 1.2;
}

.parametres-header p {
  font-size: 1.2rem;
  color: var(--va-text-secondary, #6b7280);
  margin: 0;
}

/* ===============================
   GRID ET CARTES
   =============================== */
.parametres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 32px;
  margin-bottom: 48px;
  padding: 0 2rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.parametre-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border-radius: 24px !important;
  overflow: hidden;
}

.parametre-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1) !important;
}

/* ===============================
   TITRES DE CARTES
   =============================== */
.parametre-title {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 1.4rem !important;
  font-weight: 700 !important;
  color: var(--va-primary, #3b82f6) !important;
  margin-bottom: 0 !important;
}

.parametre-icon {
  color: var(--va-primary, #3b82f6) !important;
  font-size: 28px !important;
}

/* ===============================
   CONTENU DES CARTES
   =============================== */
.parametre-content {
  padding: 0 !important;
}

/* Grille de formulaire pour les inputs */
.form-grid {
  display: grid;
  gap: 24px;
}

/* ===============================
   INPUTS VUESTIC CUSTOMISÉS
   =============================== */
.readonly-input :deep(.va-input-wrapper) {
  background: var(--va-background-secondary, #f1f5f9) !important;
  border: 1px solid var(--va-background-border, #e2e8f0) !important;
  border-radius: 12px !important;
}

.readonly-input :deep(.va-input-wrapper__field) {
  padding: 14px 16px !important;
  font-size: 1rem !important;
  color: var(--va-text-primary, #1e293b) !important;
  font-weight: 500 !important;
}

.readonly-input :deep(.va-input-wrapper__label) {
  font-size: 0.9rem !important;
  font-weight: 600 !important;
  color: var(--va-primary, #3b82f6) !important;
  margin-bottom: 8px !important;
}

/* ===============================
   SECTION COULEUR
   =============================== */
.color-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.color-label-section {
  text-align: center;
}

.color-main-label {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--va-text-primary, #1e293b);
  display: block;
  margin-bottom: 8px;
}

.color-description {
  font-size: 1rem;
  color: var(--va-text-secondary, #6b7280);
  line-height: 1.6;
  margin: 0;
}

/* Aperçu des couleurs */
.color-preview {
  margin-bottom: 24px;
}

.color-comparison {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}

.color-display-section {
  flex: 1;
  min-width: 280px;
}

.color-display-section h5 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--va-text-primary, #374151);
}

.current-color-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--va-background-element, #ffffff);
  border-radius: 16px;
  border: 2px solid var(--va-background-border, #e2e8f0);
  transition: all 0.3s ease;
}

.current-color-display.preview {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: var(--va-warning, #f59e0b);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.2);
}

.color-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.color-info {
  flex: 1;
}

.color-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--va-text-primary, #374151);
  margin-bottom: 4px;
}

.color-value {
  font-size: 0.9rem;
  color: var(--va-text-secondary, #6b7280);
  font-family: 'Monaco', 'Menlo', monospace;
  background: var(--va-background-secondary, #f8fafc);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
}

.user-initials-preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

/* ===============================
   PALETTE DE COULEURS
   =============================== */
.color-palette h4 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--va-text-primary, #374151);
  margin-bottom: 20px;
  text-align: center;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.color-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 2px solid transparent;
  background: var(--va-background-element, #ffffff);
}

.color-option:hover {
  background: var(--va-background-secondary, #f8fafc);
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.color-option.selected {
  border-color: var(--va-primary, #3b82f6);
  background: var(--va-primary-light, #eff6ff);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.25);
}

.color-option.saved {
  border-color: var(--va-success, #10b981);
  background: var(--va-success-light, #f0fdf4);
}

.color-option.selected.saved {
  border-color: var(--va-primary, #3b82f6);
  background: linear-gradient(135deg, #eff6ff 50%, #f0fdf4 50%);
}

.saved-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--va-success, #10b981);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.color-swatch {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.color-option:hover .color-swatch {
  transform: scale(1.1);
}

.color-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--va-text-primary, #374151);
  text-align: center;
}

/* ===============================
   BOUTONS D'ACTION
   =============================== */
.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Customisation des boutons Vuestic */
:deep(.va-button) {
  border-radius: 12px !important;
  font-weight: 600 !important;
  padding: 14px 28px !important;
  font-size: 1rem !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

:deep(.va-button:hover) {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

:deep(.va-button--primary) {
  background: linear-gradient(135deg, var(--va-primary, #3b82f6) 0%, #1d4ed8 100%) !important;
}

:deep(.va-button--secondary) {
  background: var(--va-background-element, #ffffff) !important;
  border: 2px solid var(--va-background-border, #e2e8f0) !important;
  color: var(--va-text-primary, #374151) !important;
}

:deep(.va-button--secondary:hover) {
  border-color: var(--va-primary, #3b82f6) !important;
  color: var(--va-primary, #3b82f6) !important;
}

/* ===============================
   FOOTER
   =============================== */
.parametres-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px 2rem;
  border-top: 2px solid var(--va-background-border, #e2e8f0);
  background: var(--va-background-element, #ffffff);
  border-radius: 24px 24px 0 0;
  margin-top: 48px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--va-text-secondary, #6b7280);
  font-size: 1rem;
}

.save-text {
  color: var(--va-success, #10b981);
  font-weight: 600;
}

.footer-actions {
  display: flex;
  gap: 16px;
}

/* ===============================
   RESPONSIVE
   =============================== */
@media (max-width: 768px) {
  .parametres {
    padding: 0 1rem;
  }
  
  .parametres-grid {
    grid-template-columns: 1fr;
    padding: 0;
    gap: 24px;
  }
  
  .parametres-header {
    padding: 1rem 0;
  }
  
  .parametres-header h1 {
    font-size: 2rem;
  }
  
  .parametres-footer {
    flex-direction: column;
    gap: 20px;
    padding: 24px 1rem;
  }
  
  .color-comparison {
    flex-direction: column;
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
  .color-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 12px;
  }
  
  .parametres-header h1 {
    font-size: 1.8rem;
  }
  
  .parametres-header p {
    font-size: 1rem;
  }
}
</style>
