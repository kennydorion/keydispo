<template>
  <div class="parametres">
      <div class="parametres-header">
        <h1>Paramètres</h1>
        <p>Configuration et préférences de l'application</p>
      </div>
      
      <div class="parametres-grid">
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">person</span>
              <h3>Profil utilisateur</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="form-group">
              <label>Nom complet</label>
              <input 
                type="text" 
                :value="userDisplayName" 
                readonly
                class="readonly-field"
              />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input 
                type="email" 
                :value="userEmail" 
                readonly
                class="readonly-field"
              />
            </div>
            <div class="form-group">
              <label>Rôle</label>
              <select disabled>
                <option>{{ userRole }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tenant ID</label>
              <input 
                type="text" 
                :value="currentTenantId" 
                readonly
                class="readonly-field"
              />
            </div>
            <button class="btn-secondary" disabled>Modifier le profil</button>
          </div>
        </div>

        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">palette</span>
              <h3>Collaboration en temps réel</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="form-group">
              <label>Couleur de présence</label>
              <p class="form-description">
                Cette couleur représente votre présence lors de la collaboration en temps réel
              </p>
              
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
                <button 
                  class="btn-primary"
                  @click="saveColorChoice"
                  :disabled="saving || !selectedColor || selectedColor === preferences.presenceColor"
                >
                  {{ saving ? 'Sauvegarde...' : 'Appliquer la couleur' }}
                </button>
                <button 
                  class="btn-outline"
                  @click="resetToDefault"
                  :disabled="saving || !hasSelectedColor"
                >
                  Couleur automatique
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">notifications</span>
              <h3>Notifications</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Nouvelles disponibilités</div>
                <div class="setting-desc">Recevoir une notification lors de nouvelles disponibilités</div>
              </div>
              <div class="toggle">
                <input 
                  type="checkbox" 
                  id="notif-dispo" 
                  :checked="preferences.notifications?.newAvailabilities"
                  @change="saveNotificationPreference('newAvailabilities', ($event.target as HTMLInputElement).checked)"
                />
                <label for="notif-dispo"></label>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Modifications</div>
                <div class="setting-desc">Être alerté des modifications de planning</div>
              </div>
              <div class="toggle">
                <input 
                  type="checkbox" 
                  id="notif-modif" 
                  :checked="preferences.notifications?.modifications"
                  @change="saveNotificationPreference('modifications', ($event.target as HTMLInputElement).checked)"
                />
                <label for="notif-modif"></label>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Rappels quotidiens</div>
                <div class="setting-desc">Résumé quotidien des disponibilités du jour</div>
              </div>
              <div class="toggle">
                <input 
                  type="checkbox" 
                  id="notif-rappel" 
                  :checked="preferences.notifications?.dailyReminders"
                  @change="saveNotificationPreference('dailyReminders', ($event.target as HTMLInputElement).checked)"
                />
                <label for="notif-rappel"></label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">palette</span>
              <h3>Préférences d'affichage</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="form-group">
              <label>Format de date</label>
              <select 
                :value="preferences.dateFormat"
                @change="saveDisplayPreference('dateFormat', ($event.target as HTMLSelectElement).value)"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div class="form-group">
              <label>Format d'heure</label>
              <select 
                :value="preferences.timeFormat"
                @change="saveDisplayPreference('timeFormat', ($event.target as HTMLSelectElement).value)"
              >
                <option value="24h">24 heures</option>
                <option value="12h">12 heures (AM/PM)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Langue</label>
              <select 
                :value="preferences.language"
                @change="saveDisplayPreference('language', ($event.target as HTMLSelectElement).value)"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Mode sombre</div>
                <div class="setting-desc">Interface avec thème sombre</div>
              </div>
              <div class="toggle">
                <input 
                  type="checkbox" 
                  id="dark-mode" 
                  :checked="preferences.darkMode"
                  @change="saveDisplayPreference('darkMode', ($event.target as HTMLInputElement).checked)"
                />
                <label for="dark-mode"></label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">security</span>
              <h3>Sécurité</h3>
            </div>
          </div>
          <div class="parametre-content">
            <button class="btn-outline">Changer le mot de passe</button>
            <button class="btn-outline">Sessions actives</button>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Authentification à deux facteurs</div>
                <div class="setting-desc">Sécurité renforcée pour votre compte</div>
              </div>
              <div class="toggle">
                <input type="checkbox" id="two-factor" />
                <label for="two-factor"></label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">group</span>
              <h3>Gestion de l'équipe</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="team-stats">
              <div class="stat-item">
                <div class="stat-value">{{ teamStats.collaborators || '—' }}</div>
                <div class="stat-label">Collaborateurs</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ teamStats.admins || '—' }}</div>
                <div class="stat-label">Administrateurs</div>
              </div>
            </div>
            <button class="btn-primary">Inviter un collaborateur</button>
            <button class="btn-outline">Gérer les rôles</button>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">download</span>
              <h3>Données et export</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">Export complet</div>
                <div class="export-desc">Télécharger toutes les données</div>
              </div>
              <button class="btn-outline small">CSV</button>
            </div>
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">Sauvegarde mensuelle</div>
                <div class="export-desc">Archive des données du mois</div>
              </div>
              <button class="btn-outline small">ZIP</button>
            </div>
            <button class="btn-danger">Supprimer toutes les données</button>
          </div>
        </div>
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
          <button class="btn-outline large" @click="resetAllToDefaults">
            Réinitialiser
          </button>
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
const teamStats = ref({ collaborators: 0, admins: 0 })

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
 * Sauvegarder une préférence de notification
 */
async function saveNotificationPreference(key: string, value: boolean) {
  if (!user.value) return
  
  try {
    const newNotifications = { ...preferences.value.notifications, [key]: value }
    await savePreferences(user.value.uid, { notifications: newNotifications })
    lastSaved.value = new Date()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des notifications:', error)
    toast({
      message: 'Erreur lors de la sauvegarde des notifications',
      color: 'danger',
      duration: 3000
    })
  }
}

/**
 * Sauvegarder une préférence d'affichage
 */
async function saveDisplayPreference(key: string, value: any) {
  if (!user.value) return
  
  try {
    await savePreferences(user.value.uid, { [key]: value })
    lastSaved.value = new Date()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des préférences d\'affichage:', error)
    toast({
      message: 'Erreur lors de la sauvegarde des préférences',
      color: 'danger',
      duration: 3000
    })
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
.parametres {
  padding: 0;
  font-family: 'Inter', 'Roboto', system-ui, sans-serif;
}
.parametres-header {
  margin-bottom: 32px;
}
.parametres-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.2;
}
.parametres-header p {
  font-size: 1.1rem;
  color: #6B7280;
  margin: 0;
}
.parametres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}
.parametre-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px 0 #2563eb0d;
  border: 1.5px solid #f1f5f9;
}
.parametre-header {
  margin-bottom: 20px;
}
.parametre-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.parametre-icon {
  color: #2563EB;
  font-size: 24px;
}
.parametre-title h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
.parametre-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}
.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 0.95rem;
  outline: none;
}
.form-group input:focus,
.form-group select:focus {
  border-color: #2563EB;
}
.form-group select:disabled {
  background: #f9fafb;
  color: #6B7280;
  cursor: not-allowed;
}
.readonly-field {
  background: #f9fafb !important;
  color: #6B7280 !important;
  cursor: not-allowed !important;
}
.form-description {
  font-size: 0.85rem;
  color: #6B7280;
  margin: 8px 0 16px 0;
  line-height: 1.4;
}

/* Styles pour le sélecteur de couleur */
.color-preview {
  margin-bottom: 24px;
}
.color-comparison {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}
.color-display-section {
  flex: 1;
  min-width: 250px;
}
.color-display-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}
.current-color-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.current-color-display.preview {
  background: #fefce8;
  border-color: #eab308;
}

/* Version mobile de la comparaison */
@media (max-width: 640px) {
  .color-comparison {
    flex-direction: column;
  }
  .color-display-section {
    width: 100%;
    min-width: unset;
  }
}
.color-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.color-info {
  flex: 1;
}
.color-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}
.color-value {
  font-size: 0.8rem;
  color: #6B7280;
  font-family: 'Monaco', 'Menlo', monospace;
}
.user-initials-preview {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.color-palette h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
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
  gap: 6px;
  padding: 12px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.color-option:hover {
  background: #f8fafc;
  transform: translateY(-2px);
}
.color-option.selected {
  border-color: #2563EB;
  background: #eff6ff;
}
.color-option.saved {
  border-color: #10b981;
  background: #f0fdf4;
}
.color-option.selected.saved {
  border-color: #2563EB;
  background: linear-gradient(135deg, #eff6ff 50%, #f0fdf4 50%);
}
.saved-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
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
}
.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.color-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6B7280;
  font-size: 0.9rem;
}
.save-text {
  color: #10b981;
}
.footer-actions {
  display: flex;
  gap: 16px;
}
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-info {
  flex: 1;
}
.setting-label {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}
.setting-desc {
  font-size: 0.9rem;
  color: #6B7280;
}
.toggle {
  position: relative;
}
.toggle input {
  display: none;
}
.toggle label {
  width: 44px;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  display: block;
}
.toggle label::after {
  content: '';
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}
.toggle input:checked + label {
  background: #2563EB;
}
.toggle input:checked + label::after {
  transform: translateX(20px);
}
.btn-primary,
.btn-secondary,
.btn-outline,
.btn-danger {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  border: none;
  outline: none;
}
.btn-primary {
  background: #2563EB;
  color: #fff;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-secondary {
  background: #f1f5f9;
  color: #374151;
}
.btn-secondary:hover {
  background: #e2e8f0;
}
.btn-outline {
  background: transparent;
  color: #374151;
  border: 1.5px solid #e5e7eb;
}
.btn-outline:hover {
  background: #f9fafb;
  border-color: #2563EB;
  color: #2563EB;
}
.btn-danger {
  background: #ef4444;
  color: #fff;
}
.btn-danger:hover {
  background: #dc2626;
}
.btn-outline.small {
  padding: 6px 12px;
  font-size: 0.85rem;
}
.team-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}
.stat-item {
  text-align: center;
}
.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: #2563EB;
  line-height: 1;
}
.stat-label {
  font-size: 0.9rem;
  color: #6B7280;
  margin-top: 4px;
}
.export-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.export-item:last-child {
  border-bottom: none;
  margin-bottom: 16px;
}
.export-info {
  flex: 1;
}
.export-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}
.export-desc {
  font-size: 0.9rem;
  color: #6B7280;
}
.parametres-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 24px;
  border-top: 1.5px solid #f1f5f9;
}
.btn-primary.large,
.btn-outline.large {
  padding: 12px 24px;
  font-size: 1rem;
}
@media (max-width: 768px) {
  .parametres-grid {
    grid-template-columns: 1fr;
  }
  .parametres-footer {
    flex-direction: column;
  }
  .team-stats {
    justify-content: center;
  }
}
</style>
