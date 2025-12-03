<template>
  <div class="modifier-collaborateur">
    <!-- Header Élégant -->
    <header class="collaborateur-header">
      <div class="header-top">
        <div class="header-brand">
          <div class="brand-icon">
            <va-icon :name="isCreation ? 'person_add' : 'edit'" />
          </div>
          <div class="brand-text">
            <h1 class="brand-title">
              {{ isCreation ? 'Nouveau collaborateur' : 'Modifier collaborateur' }}
            </h1>
            <p class="brand-subtitle">
              {{ isCreation ? 'Ajoutez un nouveau membre à votre équipe' : 'Modifiez les informations du collaborateur' }}
            </p>
          </div>
        </div>
        
        <div class="header-actions">
          <va-button 
            preset="outline" 
            icon="arrow_back" 
            @click="retourListe"
            class="action-button"
          >
            Retour
          </va-button>
          <va-button
            v-if="!isCreation"
            preset="outline"
            icon="visibility"
            @click="voirDetail"
            class="action-button"
          >
            Voir détail
          </va-button>
          <va-button
            v-if="!isCreation"
            preset="outline"
            icon="delete"
            @click="confirmerSuppression"
            :loading="loading"
            class="action-button"
            color="danger"
          >
            Supprimer
          </va-button>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <div class="collaborateur-container">
      <!-- Formulaire Moderne -->
      <div class="form-card">
        <div class="form-header">
          <div class="form-header-icon">
            <va-icon :name="isCreation ? 'person_add' : 'edit'" />
          </div>
          <div class="form-header-text">
            <h2 class="form-title">Informations personnelles</h2>
            <p class="form-subtitle">Saisissez les informations du collaborateur</p>
          </div>
        </div>

        <form @submit.prevent="sauvegarder" class="collaborateur-form">
          <div class="form-grid">
            <!-- Informations de base -->
            <div class="form-section">
              <h3 class="section-title">
                <va-icon name="person" class="section-icon" />
                Identité
              </h3>
              
              <div class="section-fields">
                <div class="field-row">
                  <div class="form-field">
                    <va-input
                      v-model="form.nom"
                      label="Nom *"
                      :rules="[required]"
                      class="modern-input"
                      :error="!!errors.nom"
                      :error-messages="errors.nom"
                    >
                      <template #prependInner>
                        <va-icon name="person" />
                      </template>
                    </va-input>
                  </div>

                  <div class="form-field">
                    <va-input
                      v-model="form.prenom"
                      label="Prénom *"
                      :rules="[required]"
                      class="modern-input"
                      :error="!!errors.prenom"
                      :error-messages="errors.prenom"
                    >
                      <template #prependInner>
                        <va-icon name="person" />
                      </template>
                    </va-input>
                  </div>
                </div>

                <div class="form-field">
                  <va-input
                    v-model="form.metier"
                    label="Métier *"
                    :rules="[required]"
                    class="modern-input"
                    :error="!!errors.metier"
                    :error-messages="errors.metier"
                    placeholder="Tapez ou sélectionnez un métier..."
                    @input="onMetierInput"
                    @focus="showMetierDropdown = true"
                    @blur="hideMetierDropdownDelayed"
                  >
                    <template #prependInner>
                      <va-icon name="work" />
                    </template>
                    <template #appendInner>
                      <va-icon 
                        :name="showMetierDropdown ? 'expand_less' : 'expand_more'" 
                        @click="toggleMetierDropdown"
                        class="cursor-pointer"
                      />
                    </template>
                  </va-input>
                  
                  <!-- Dropdown personnalisé pour l'autocomplétion -->
                  <div 
                    v-if="showMetierDropdown && filteredMetiers.length > 0"
                    class="metier-dropdown"
                  >
                    <div
                      v-for="metier in filteredMetiers"
                      :key="metier"
                      class="metier-option"
                      @mousedown="selectMetier(metier)"
                    >
                      {{ metier }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contact -->
            <div class="form-section">
              <h3 class="section-title">
                <va-icon name="contact_mail" class="section-icon" />
                Contact
              </h3>
              
              <div class="section-fields">
                <div class="form-field">
                  <va-input
                    v-model="form.email"
                    label="Email"
                    type="email"
                    :rules="[emailRule]"
                    class="modern-input"
                    :error="!!errors.email"
                    :error-messages="errors.email"
                  >
                    <template #prependInner>
                      <va-icon name="email" />
                    </template>
                  </va-input>
                </div>

                <div class="form-field">
                  <va-input
                    v-model="form.phone"
                    label="Téléphone"
                    type="tel"
                    class="modern-input"
                    :rules="[phoneRule]"
                    :error="!!errors.phone"
                    :error-messages="errors.phone"
                  >
                    <template #prependInner>
                      <va-icon name="phone" />
                    </template>
                  </va-input>
                </div>
              </div>
            </div>

            <!-- Note et apparence -->
            <div class="form-section full-width">
              <h3 class="section-title">
                <va-icon name="description" class="section-icon" />
                Informations complémentaires
              </h3>
              
              <div class="section-fields">
                <div class="form-field">
                  <va-textarea
                    v-model="form.note"
                    label="Note"
                    class="modern-textarea"
                    :error="!!errors.note"
                    :error-messages="errors.note"
                    placeholder="Note ou commentaire sur le collaborateur..."
                    :min-rows="3"
                    :max-rows="6"
                    autosize
                  >
                    <template #prependInner>
                      <va-icon name="note" />
                    </template>
                  </va-textarea>
                </div>

                <!-- Couleur d'identification -->
                <div class="color-selection">
                  <label class="color-label">
                    <va-icon name="palette" class="label-icon" />
                    Couleur d'identification
                  </label>
                  <div class="color-selector">
                    <div
                      class="color-option default-option"
                      :class="{ active: form.color === DEFAULT_COLOR || !form.color }"
                      @click="form.color = DEFAULT_COLOR"
                      :style="{ backgroundColor: DEFAULT_COLOR }"
                      title="Couleur par défaut"
                    >
                      <va-icon 
                        v-if="form.color === DEFAULT_COLOR || !form.color"
                        name="check" 
                        size="18px" 
                        color="white"
                      />
                    </div>
                    <div
                      v-for="color in COLLABORATEUR_COLORS"
                      :key="color.name"
                      class="color-option"
                      :class="{ active: form.color === color.value }"
                      @click="form.color = color.value"
                      :style="{ backgroundColor: color.value }"
                      :title="color.label"
                    >
                      <va-icon 
                        v-if="form.color === color.value"
                        name="check" 
                        size="18px" 
                        color="white"
                      />
                    </div>
                  </div>
                  <p class="color-help">
                    Cette couleur sera utilisée dans le planning pour identifier visuellement le collaborateur.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions du formulaire -->
          <div class="form-actions">
            <va-button
              preset="outline"
              @click="annuler"
              class="action-btn secondary"
            >
              <va-icon name="close" />
              Annuler
            </va-button>
            
            <va-button
              type="submit"
              color="primary"
              :loading="loading"
              :disabled="!isFormValid"
              class="action-btn primary"
            >
              <va-icon :name="isCreation ? 'add' : 'save'" />
              {{ isCreation ? 'Créer' : 'Sauvegarder' }}
            </va-button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <va-modal
      v-model="showDeleteModal"
      title="Confirmer la suppression"
      size="medium"
      :ok-text="'Supprimer'"
      :cancel-text="'Annuler'"
      @ok="supprimerCollaborateur"
      hide-default-actions
      :overlay-opacity="0.6"
    >
      <div class="delete-modal-content">
        <va-icon name="warning" color="danger" size="48px" class="mb-4" />
        <h3 class="delete-title">Êtes-vous sûr de vouloir supprimer ce collaborateur ?</h3>
        <p class="delete-text">
          Cette action supprimera définitivement <strong>{{ form.prenom }} {{ form.nom }}</strong> 
          de votre liste de collaborateurs. Cette action est irréversible.
        </p>
        <div class="delete-actions">
          <va-button color="secondary" @click="showDeleteModal = false">
            Annuler
          </va-button>
          <va-button color="danger" @click="supprimerCollaborateur" :loading="loading">
            <va-icon name="delete" class="mr-2" />
            Supprimer définitivement
          </va-button>
        </div>
      </div>
    </va-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vuestic-ui'
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { AuthService } from '../services/auth'
import { auth, rtdb } from '../services/firebase'
import { validatePhone, normalizePhone } from '../utils/phoneFormatter'
import { COLLABORATEUR_COLORS, DEFAULT_COLOR } from '../utils/collaborateurColors'
import { ref as rtdbRef, get } from 'firebase/database'

// Types
interface Collaborateur {
  id?: string
  nom: string
  prenom: string
  email: string
  phone: string
  metier: string
  note: string
  color?: string
  tenantId?: string
  actif?: boolean
  createdAt?: any
  updatedAt?: any
  updatedBy?: string
  version?: number
}

interface FormErrors {
  nom?: string
  prenom?: string
  email?: string
  phone?: string
  metier?: string
  note?: string
}

// Composables
const route = useRoute()
const router = useRouter()
const { init: initToast } = useToast()

// État
const loading = ref(false)
const collaborateur = ref<Collaborateur | null>(null)
const showDeleteModal = ref(false)
const errors = ref<FormErrors>({})

// État pour l'autocomplétion métier
const showMetierDropdown = ref(false)
const metierDropdownTimeout = ref<number | null>(null)

// Données du formulaire
const form = ref<Collaborateur>({
  nom: '',
  prenom: '',
  email: '',
  phone: '',
  metier: '',
  note: '',
  color: DEFAULT_COLOR
})

// Options pour les selects
const metiersOptions = ref([
  'Développeur',
  'Designer',
  'Chef de projet',
  'Analyste',
  'Consultant',
  'Manager',
  'Technicien',
  'Commercial',
  'Marketing',
  'RH',
  'Comptable',
  'Assistant',
  'Stagiaire',
  'Freelance',
  'Autre'
])

// Computed
const isCreation = computed(() => route.name === 'NouveauCollaborateur' || route.params.id === 'nouveau')
const collaborateurId = computed(() => route.params.id as string)
const currentTenantId = computed(() => AuthService.currentTenantId || 'keydispo')

const isFormValid = computed(() => {
  // Validation de base : nom, prénom et métier obligatoires
  const hasRequiredFields = form.value.nom.trim() !== '' &&
         form.value.prenom.trim() !== '' &&
         form.value.metier.trim() !== ''
  
  // Si un email est saisi, il doit être valide
  const isEmailValid = !form.value.email.trim() || emailRule(form.value.email) === true
  
  return hasRequiredFields && isEmailValid
})

// Computed pour l'autocomplétion des métiers
const filteredMetiers = computed(() => {
  if (!form.value.metier || form.value.metier.trim() === '') {
    return metiersOptions.value
  }
  
  const searchTerm = form.value.metier.toLowerCase()
  return metiersOptions.value.filter(metier => 
    metier.toLowerCase().includes(searchTerm)
  )
})

// Règles de validation
const required = (value: any) => {
  if (typeof value === 'string') {
    return value.trim() ? true : 'Ce champ est requis'
  }
  return value ? true : 'Ce champ est requis'
}

const emailRule = (value: string) => {
  if (!value || !value.trim()) return true // Email optionnel
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value) || 'Email invalide'
}

const phoneRule = (value: string) => {
  if (!value) return true // Champ optionnel
  return validatePhone(value) || 'Format de téléphone invalide (ex: +33 X XX XX XX XX, +41 XX XXX XX XX ou 0X XX XX XX XX)'
}

// Méthodes
// Méthodes pour l'autocomplétion des métiers
const onMetierInput = () => {
  showMetierDropdown.value = true
}

const toggleMetierDropdown = () => {
  showMetierDropdown.value = !showMetierDropdown.value
}

const selectMetier = (metier: string) => {
  form.value.metier = metier
  showMetierDropdown.value = false
}

const hideMetierDropdownDelayed = () => {
  // Délai pour permettre le clic sur les options
  if (metierDropdownTimeout.value) {
    clearTimeout(metierDropdownTimeout.value)
  }
  metierDropdownTimeout.value = window.setTimeout(() => {
    showMetierDropdown.value = false
  }, 150)
}

const chargerCollaborateur = async () => {
  if (isCreation.value) return

  try {
    loading.value = true
    const result = await CollaborateursServiceV2.getCollaborateur(currentTenantId.value, collaborateurId.value)
    
    if (result) {
      collaborateur.value = {
        ...result,
        email: result.email || '',
        phone: result.phone || '',
        note: result.note || '',
        color: result.color || DEFAULT_COLOR
      }
      // Remplir le formulaire avec les données existantes
      form.value = {
        nom: result.nom || '',
        prenom: result.prenom || '',
        email: result.email || '',
        phone: result.phone || '',
        metier: result.metier || '',
        note: result.note || '',
        color: result.color || DEFAULT_COLOR
      }
    } else {
      initToast({
        message: 'Collaborateur introuvable',
        color: 'danger'
      })
      router.push('/collaborateurs')
    }
  } catch (error) {
    console.error('Erreur lors du chargement du collaborateur:', error)
    initToast({
      message: 'Erreur lors du chargement du collaborateur',
      color: 'danger'
    })
    router.push('/collaborateurs')
  } finally {
    loading.value = false
  }
}

const validerFormulaire = (): boolean => {
  errors.value = {}
  let isValid = true

  // Validation nom
  if (!form.value.nom.trim()) {
    errors.value.nom = 'Le nom est requis'
    isValid = false
  }

  // Validation prénom
  if (!form.value.prenom.trim()) {
    errors.value.prenom = 'Le prénom est requis'
    isValid = false
  }

  // Validation email (optionnel)
  if (form.value.email.trim() && emailRule(form.value.email) !== true) {
    errors.value.email = 'Email invalide'
    isValid = false
  }

  // Validation métier
  if (!form.value.metier.trim()) {
    errors.value.metier = 'Le métier est requis'
    isValid = false
  }

  // Validation note (optionnelle)
  if (form.value.note && form.value.note.trim()) {
    // Note valide (optionnelle)
  }

  return isValid
}

const sauvegarder = async () => {
  if (!validerFormulaire()) {
    initToast({
      message: 'Veuillez corriger les erreurs du formulaire',
      color: 'danger'
    })
    return
  }

  if (!auth.currentUser) {
    initToast({
      message: 'Vous devez être connecté pour effectuer cette action',
      color: 'danger'
    })
    return
  }

  try {
    loading.value = true

    const collaborateurData = {
      nom: form.value.nom,
      prenom: form.value.prenom,
      email: form.value.email.trim() || null,
      phone: normalizePhone(form.value.phone),
      metier: form.value.metier,
      note: form.value.note.trim() || null,
      color: form.value.color || DEFAULT_COLOR,
      tenantId: currentTenantId.value,
      actif: true
    }

    if (isCreation.value) {
      // Création
  await CollaborateursServiceV2.createCollaborateur(
        currentTenantId.value, 
        collaborateurData, 
        auth.currentUser.uid
      )
      initToast({
        message: `Collaborateur ${form.value.prenom} ${form.value.nom} créé avec succès`,
        color: 'success'
      })
    } else {
      // Modification
      await CollaborateursServiceV2.updateCollaborateur(
        currentTenantId.value,
        collaborateurId.value, 
        collaborateurData,
        auth.currentUser.uid
      )
      initToast({
        message: `Collaborateur ${form.value.prenom} ${form.value.nom} modifié avec succès`,
        color: 'success'
      })
    }
    router.push('/collaborateurs')
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error)
    console.error('❌ Type d\'erreur:', typeof error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = (error as any)?.code || 'unknown'
    
    console.error('❌ Code d\'erreur:', errorCode)
    console.error('❌ Message d\'erreur:', errorMessage)
    
    if (error instanceof Error && error.stack) {
      console.error('❌ Stack trace:', error.stack)
    }
    
    initToast({
      message: `Erreur lors de la ${isCreation.value ? 'création' : 'modification'} du collaborateur: ${errorMessage}`,
      color: 'danger'
    })
  } finally {
    loading.value = false
  }
}

const confirmerSuppression = () => {
  showDeleteModal.value = true
}

const supprimerCollaborateur = async () => {
  if (!auth.currentUser) {
    initToast({
      message: 'Vous devez être connecté pour effectuer cette action',
      color: 'danger'
    })
    return
  }

  try {
    loading.value = true
    await CollaborateursServiceV2.deleteCollaborateur(
      currentTenantId.value,
      collaborateurId.value, 
      auth.currentUser.uid
    )
    
    initToast({
      message: `Collaborateur ${form.value.prenom} ${form.value.nom} supprimé avec succès`,
      color: 'success'
    })
    
    showDeleteModal.value = false
    router.push('/collaborateurs')
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    initToast({
      message: 'Erreur lors de la suppression du collaborateur',
      color: 'danger'
    })
  } finally {
    loading.value = false
  }
}

const annuler = () => {
  router.push('/collaborateurs')
}

const retourListe = () => {
  router.push('/collaborateurs')
}

const voirDetail = () => {
  if (route.params.id) {
    router.push(`/collaborateurs/${route.params.id}/detail`)
  }
}

// Lifecycle
onMounted(() => {
  // Nettoyage agressif des overlays et éléments résiduels au montage
  // Pour s'assurer qu'aucun élément du planning ne bloque les interactions
  cleanupOrphanElements()
  
  chargerCollaborateur()
  // Vérifier les permissions au chargement
  verifierPermissions()
})

// Nettoyage des éléments orphelins qui pourraient bloquer les interactions
function cleanupOrphanElements() {
  // IMPORTANT: Retirer l'attribut inert que Vuestic ajoute au #app
  const appElement = document.getElementById('app')
  if (appElement) {
    appElement.removeAttribute('inert')
  }
  
  // Supprimer les overlays de modal Vuestic orphelins
  document.querySelectorAll('.va-modal__overlay, .va-modal-overlay, .va-modal__container').forEach(el => {
    el.remove()
  })
  
  // Supprimer la classe va-modal-open du body
  document.body.classList.remove('va-modal-open')
  document.body.classList.remove('selection-mode')
  document.body.classList.remove('dragging-selection')
  
  // Reset des styles du body
  document.body.style.overflow = ''
  document.body.style.pointerEvents = ''
  
  // Supprimer tout élément avec un z-index très élevé qui pourrait bloquer
  document.querySelectorAll('[style*="z-index: 2147483"]').forEach(el => {
    // Ne pas supprimer les toasts
    if (!el.classList.contains('va-toast') && !el.closest('.va-toast')) {
      const rect = el.getBoundingClientRect()
      // Si c'est un élément qui couvre beaucoup de l'écran
      if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
        el.remove()
      }
    }
  })
}

// Nouvelle méthode pour vérifier les permissions
const verifierPermissions = async () => {
  if (!auth.currentUser) {
    return
  }
  
  try {
    const userRef = rtdbRef(rtdb, `tenants/${currentTenantId.value}/users/${auth.currentUser.uid}`)
    const userSnapshot = await get(userRef)
    
    if (!userSnapshot.exists()) {
      return
    }
    
    
    // Permissions lues; aucune trace non essentielle en prod
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des permissions:', error)
  }
}

// Watchers
watch(() => route.params.id, () => {
  chargerCollaborateur()
})
</script>

<style scoped>
.modifier-collaborateur {
  --surface-light: #ffffff;
  --border-light: #e2e8f0;
  --text-light: #334155;
  --text-muted: #64748b;
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.05);
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  font-family: var(--va-font-family, 'Inter', sans-serif);
  background: #f8fafc;
  min-height: 100vh;
  /* Pas de flex pour permettre le scroll naturel de la page */
}

/* Header Élégant */
.collaborateur-header {
  background: var(--surface-light);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-soft);
  position: relative;
  z-index: 10;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80px;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-button {
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: white !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  padding: 10px 20px !important;
  transition: all 0.3s ease !important;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  transform: translateY(-1px) !important;
}

/* Conteneur Principal */
.collaborateur-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 24px 6rem 24px; /* Augmentation du padding-bottom pour garantir la visibilité du bouton */
  width: 100%;
  background: #f8fafc;
  /* Pas de contrainte de hauteur - le scroll se fait naturellement sur la page */
  position: relative;
  z-index: 1; /* S'assurer que le conteneur est cliquable et au-dessus de tout overlay potentiel */
}

/* Carte de Formulaire */
.form-card {
  background: var(--surface-light);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid var(--border-light);
}

.form-header-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.form-header-icon :deep(.va-icon) {
  font-size: 22px;
}

.form-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-light);
  line-height: 1.2;
}

.form-subtitle {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.2;
}

/* Formulaire */
.collaborateur-form {
  padding: 32px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section.full-width {
  grid-column: 1 / -1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-light);
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border-light);
}

.section-icon {
  color: #6366f1;
}

.section-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Inputs Modernisés */
.modern-input :deep(.va-input__container),
.modern-textarea :deep(.va-input__container) {
  border-radius: 12px !important;
  border: 2px solid var(--border-light) !important;
  background: var(--surface-light) !important;
  transition: all 0.3s ease !important;
}

.modern-input :deep(.va-input__container):hover,
.modern-textarea :deep(.va-input__container):hover {
  border-color: #a5b4fc !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
}

.modern-input :deep(.va-input__container.va-input__container--focused),
.modern-textarea :deep(.va-input__container.va-input__container--focused) {
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
}

.modern-input :deep(.va-input__content__input),
.modern-textarea :deep(.va-input__content__input) {
  padding: 16px !important;
  font-size: 1rem !important;
  color: #000000 !important;
}

.modern-input :deep(.va-input__label),
.modern-textarea :deep(.va-input__label) {
  font-weight: 500 !important;
  color: #4a5568 !important;
}

/* Icônes des inputs */
.modern-input :deep(.va-input__container .va-icon),
.modern-textarea :deep(.va-input__container .va-icon) {
  color: #000000 !important;
}

/* Placeholder text */
.modern-input :deep(.va-input__content__input::placeholder),
.modern-textarea :deep(.va-input__content__input::placeholder) {
  color: #a0aec0 !important;
}

/* Correction des couleurs des inputs pour être en noir */
.modern-input :deep(.va-input__content__input),
.modern-textarea :deep(.va-textarea__content__input) {
  color: #000000 !important;
}

.modern-input :deep(.va-input__container .va-icon),
.modern-textarea :deep(.va-textarea__container .va-icon) {
  color: #666666 !important;
}

/* Actions du Formulaire */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
  margin-bottom: 64px; /* Augmentation pour garantir la visibilité sur mobile et desktop */
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
}

.action-btn {
  padding: 12px 24px !important;
  border-radius: 8px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.action-btn:hover {
  transform: translateY(-1px) !important;
}

.action-btn.primary {
  background: var(--primary-gradient) !important;
  border: none !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
}

.action-btn.primary:hover {
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
}

.action-btn.secondary {
  background: #f8fafc !important;
  border: 2px solid var(--border-light) !important;
  color: var(--text-light) !important;
}

.action-btn.secondary:hover {
  background: #f1f5f9 !important;
  border-color: #a5b4fc !important;
}

.delete-modal-content {
  text-align: center;
  padding: 24px;
}

.delete-title {
  color: #ef4444;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 16px 0 8px;
}

.delete-text {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 24px;
}

.delete-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Overlay de la modale de suppression avec fond sombre - uniquement quand showDeleteModal est true */
/* Note: pas besoin de forcer z-index ici, le style global avec body.va-modal-open s'en charge */

/* Contenu de la modale avec fond blanc */
:deep(.va-modal__container) { background-color: transparent !important; }

/* S'assurer que le contenu interne est bien opaque */
:deep(.va-modal__dialog),
:deep(.va-modal__inner),
:deep(.va-modal__content),
:deep(.va-modal__body) {
  background: #ffffff !important;
  color: #000 !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
  z-index: 2147483647 !important; /* au-dessus de l'overlay */
}

/* Styles pour l'autocomplétion des métiers */
.form-field {
  position: relative;
}

.metier-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--va-outline);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.metier-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.metier-option:last-child {
  border-bottom: none;
}

.metier-option:hover {
  background-color: var(--va-background-secondary);
}

.metier-option:active {
  background-color: var(--va-primary);
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .header-top {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    height: auto;
    min-height: 120px;
  }
  
  .header-brand {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  
  .brand-icon {
    width: 40px;
    height: 40px;
  }
  
  .brand-icon :deep(.va-icon) {
    font-size: 20px;
  }
  
  .brand-title {
    font-size: 1.2rem;
  }
  
  .brand-subtitle {
    font-size: 0.85rem;
  }
  
  .collaborateur-container {
    padding: 1.5rem 1rem 4rem 1rem; /* Augmentation du padding-bottom sur mobile pour voir le bouton */
  }
  
  .form-card {
    border-radius: 12px;
  }
  
  .form-header {
    padding: 1.5rem;
  }
  
  .collaborateur-form {
    padding: 1.5rem;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .field-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .form-actions {
    flex-direction: column-reverse;
    gap: 1rem;
  }
  
  .action-btn {
    width: 100% !important;
    justify-content: center !important;
  }
  
  .color-selector {
    gap: 0.8rem;
    justify-content: center;
  }
}

/* Styles pour le sélecteur de couleur */
.color-field {
  grid-column: 1 / -1; /* Prend toute la largeur */
}

.color-label {
  display: flex;
  align-items: center;
  font-weight: 500;
  color: var(--va-text-primary);
  margin-bottom: 16px;
  font-size: 0.95rem;
}

.color-selector {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.color-option {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  cursor: pointer;
  border: 3px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-option:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  border-color: var(--va-background-border);
}

.color-option.active {
  border-color: var(--va-primary);
  transform: translateY(-2px) scale(1.08);
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.3);
}

.default-option {
  border: 3px solid var(--va-background-border);
  position: relative;
}

.default-option::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--va-background-secondary);
  border: 2px solid var(--va-text-secondary);
  opacity: 0.6;
}

.default-option.active::before {
  display: none;
}

.default-option:hover {
  border-color: var(--va-primary);
}

.default-option.active {
  background: var(--va-background-element) !important;
  border-color: var(--va-primary);
}

.color-help {
  font-size: 0.85rem;
  color: var(--va-text-secondary);
  margin: 0;
  line-height: 1.4;
  font-style: italic;
}

/* Responsive Design Optimisé - règles consolidées ci-dessus */

@media (max-width: 480px) {
  .header-top {
    padding: 0.8rem;
  }
  
  .brand-icon {
    width: 32px;
    height: 32px;
  }
  
  .brand-icon :deep(.va-icon) {
    font-size: 16px;
  }
  
  .brand-title {
    font-size: 1rem;
  }
  
  .brand-subtitle {
    font-size: 0.75rem;
  }
  
  .collaborateur-container {
    padding: 0.8rem 0.8rem 4rem 0.8rem; /* Augmentation du padding-bottom sur très petit écran */
  }
  
  .form-card {
    border-radius: 10px;
  }
  
  .form-header {
    padding: 1rem;
  }
  
  .collaborateur-form {
    padding: 1rem;
  }
  
  .form-header-icon {
    width: 36px;
    height: 36px;
  }
  
  .form-title {
    font-size: 1.2rem;
  }
  
  .section-title {
    font-size: 0.95rem;
  }
  
  .color-selector {
    gap: 0.8rem;
    justify-content: center;
  }

  .color-option {
    width: 40px;
    height: 40px;
  }
  
  .field-row {
    gap: 0.8rem;
  }
  
  .modern-input,
  .modern-textarea {
    margin-bottom: 0.8rem;
  }
}
</style>
