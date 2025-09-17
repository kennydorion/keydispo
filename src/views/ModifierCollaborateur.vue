<template>
  <div class="modifier-collaborateur">
    <!-- En-tête -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-left">
          <va-button 
            preset="plain" 
            icon="arrow_back" 
            @click="retourListe"
            class="back-button"
          >
            Retour
          </va-button>
          <div class="header-info">
            <h1 class="page-title">
              <va-icon name="edit" class="title-icon" />
              {{ isCreation ? 'Nouveau collaborateur' : 'Modifier collaborateur' }}
            </h1>
            <p class="page-subtitle">
              {{ isCreation ? 'Ajoutez un nouveau collaborateur à votre équipe' : 'Modifiez les informations du collaborateur' }}
            </p>
          </div>
        </div>
        <div class="header-actions">
          <va-button
            v-if="!isCreation"
            color="primary"
            preset="outline"
            icon="visibility"
            @click="voirDetail"
          >
            Voir détail
          </va-button>
          <va-button
            v-if="!isCreation"
            color="danger"
            preset="outline"
            @click="confirmerSuppression"
            :loading="loading"
          >
            <va-icon name="delete" class="mr-2" />
            Supprimer
          </va-button>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <div class="page-content">
      <div class="form-container">
        <!-- Formulaire de modification -->
        <va-card class="form-card">
          <va-card-title>
            <va-icon :name="isCreation ? 'person_add' : 'edit'" class="mr-2" />
            Informations personnelles
          </va-card-title>
          
          <va-card-content>
            <form @submit.prevent="sauvegarder" class="collaborateur-form">
              <div class="form-grid">
                <!-- Nom -->
                <div class="form-field">
                  <va-input
                    v-model="form.nom"
                    label="Nom *"
                    :rules="[required]"
                    class="w-full"
                    :error="!!errors.nom"
                    :error-messages="errors.nom"
                  >
                    <template #prependInner>
                      <va-icon name="person" />
                    </template>
                  </va-input>
                </div>

                <!-- Prénom -->
                <div class="form-field">
                  <va-input
                    v-model="form.prenom"
                    label="Prénom *"
                    :rules="[required]"
                    class="w-full"
                    :error="!!errors.prenom"
                    :error-messages="errors.prenom"
                  >
                    <template #prependInner>
                      <va-icon name="person" />
                    </template>
                  </va-input>
                </div>

                <!-- Email -->
                <div class="form-field">
                  <va-input
                    v-model="form.email"
                    label="Email"
                    type="email"
                    :rules="[emailRule]"
                    class="w-full"
                    :error="!!errors.email"
                    :error-messages="errors.email"
                  >
                    <template #prependInner>
                      <va-icon name="email" />
                    </template>
                  </va-input>
                </div>

                <!-- Téléphone -->
                <div class="form-field">
                  <va-input
                    v-model="form.phone"
                    label="Téléphone"
                    type="tel"
                    class="w-full"
                    :rules="[phoneRule]"
                    :error="!!errors.phone"
                    :error-messages="errors.phone"
                  >
                    <template #prependInner>
                      <va-icon name="phone" />
                    </template>
                  </va-input>
                </div>

                <!-- Métier -->
                <div class="form-field">
                  <va-input
                    v-model="form.metier"
                    label="Métier *"
                    :rules="[required]"
                    class="w-full"
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

                <!-- Note -->
                <div class="form-field">
                  <va-textarea
                    v-model="form.note"
                    label="Note"
                    class="w-full"
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

                <!-- Couleur -->
                <div class="form-field color-field">
                  <label class="color-label">
                    <va-icon name="palette" class="mr-2" />
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

              <!-- Actions du formulaire -->
              <div class="form-actions">
                <va-button
                  color="danger"
                  preset="outline"
                  @click="annuler"
                >
                  Annuler
                </va-button>
                
                <va-button
                  type="submit"
                  color="primary"
                  :loading="loading"
                  :disabled="!isFormValid"
                >
                  <va-icon :name="isCreation ? 'add' : 'save'" class="mr-2" />
                  {{ isCreation ? 'Créer' : 'Sauvegarder' }}
                </va-button>
              </div>
            </form>
          </va-card-content>
        </va-card>
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
  console.log('🔄 Début sauvegarde collaborateur...')
  console.log('📋 Données du formulaire:', form.value)
  
  if (!validerFormulaire()) {
    console.log('❌ Validation du formulaire échouée')
    initToast({
      message: 'Veuillez corriger les erreurs du formulaire',
      color: 'danger'
    })
    return
  }
  console.log('✅ Validation du formulaire réussie')

  if (!auth.currentUser) {
    console.log('❌ Utilisateur non connecté')
    initToast({
      message: 'Vous devez être connecté pour effectuer cette action',
      color: 'danger'
    })
    return
  }
  console.log('✅ Utilisateur connecté:', auth.currentUser.uid)

  try {
    loading.value = true
    console.log('⏳ Préparation des données...')

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
    
    console.log('📝 Données préparées:', collaborateurData)
    console.log('🏢 Tenant ID:', currentTenantId.value)
    console.log('👤 User ID:', auth.currentUser.uid)

    if (isCreation.value) {
      console.log('🆕 Mode création')
      // Création
      const newId = await CollaborateursServiceV2.createCollaborateur(
        currentTenantId.value, 
        collaborateurData, 
        auth.currentUser.uid
      )
      console.log('✅ Collaborateur créé avec ID:', newId)
      initToast({
        message: `Collaborateur ${form.value.prenom} ${form.value.nom} créé avec succès`,
        color: 'success'
      })
    } else {
      console.log('✏️ Mode modification, ID:', collaborateurId.value)
      // Modification
      await CollaborateursServiceV2.updateCollaborateur(
        currentTenantId.value,
        collaborateurId.value, 
        collaborateurData,
        auth.currentUser.uid
      )
      console.log('✅ Collaborateur modifié')
      initToast({
        message: `Collaborateur ${form.value.prenom} ${form.value.nom} modifié avec succès`,
        color: 'success'
      })
    }

    console.log('🔄 Redirection vers /collaborateurs')
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
    console.log('🔄 Fin du processus de sauvegarde')
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
  chargerCollaborateur()
  // Vérifier les permissions au chargement
  verifierPermissions()
})

// Nouvelle méthode pour vérifier les permissions
const verifierPermissions = async () => {
  console.log('🔍 Vérification des permissions utilisateur...')
  
  if (!auth.currentUser) {
    console.log('❌ Aucun utilisateur connecté')
    return
  }
  
  console.log('✅ Utilisateur connecté:', {
    uid: auth.currentUser.uid,
    email: auth.currentUser.email
  })
  
  try {
    const userRef = rtdbRef(rtdb, `tenants/${currentTenantId.value}/users/${auth.currentUser.uid}`)
    const userSnapshot = await get(userRef)
    
    if (!userSnapshot.exists()) {
      console.log('❌ Utilisateur non trouvé dans le tenant')
      console.log('👉 L\'utilisateur doit être ajouté au tenant par un administrateur')
      return
    }
    
    const userData = userSnapshot.val()
    console.log('✅ Permissions utilisateur:', userData)
    
    if (userData.role === 'admin' || userData.role === 'editor') {
      console.log('✅ L\'utilisateur a les permissions pour créer/modifier des collaborateurs')
    } else {
      console.log('❌ L\'utilisateur n\'a pas les permissions suffisantes')
      console.log('👉 Rôle requis: admin ou editor')
      console.log('👉 Rôle actuel:', userData.role)
    }
    
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
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--va-background-primary);
}

.page-header {
  background: var(--va-background-secondary);
  border-bottom: 1px solid var(--va-background-border);
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 0;
  gap: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-button {
  color: var(--va-text-primary) !important;
  background: var(--va-background-element) !important;
  border: 1px solid var(--va-background-border) !important;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: var(--va-background-secondary) !important;
  transform: translateX(-2px);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--va-text-primary);
}

.title-icon {
  font-size: 1.5rem;
}

.page-subtitle {
  color: var(--va-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.page-content {
  padding: 0;
  background: var(--va-background-primary);
}

.form-container {
  display: grid;
  grid-template-columns: 1fr;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  gap: 24px;
}

.form-card {
  background: var(--va-background-secondary);
  border-radius: 16px;
  border: 1px solid var(--va-background-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.form-card .va-card-title {
  padding: 24px 24px 8px;
  margin-bottom: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--va-text-primary);
}

.form-card .va-card-content {
  padding: 0 24px 24px;
}

.collaborateur-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field .va-input,
.form-field .va-textarea {
  --va-input-border-radius: 12px;
  --va-input-padding: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--va-background-border);
}

.delete-modal-content {
  text-align: center;
  padding: 1rem;
}

.delete-title {
  color: var(--va-danger);
  margin-bottom: 1rem;
}

.delete-text {
  color: var(--va-text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.delete-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
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
  .header-controls {
    flex-direction: column;
    gap: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .page-content {
    padding: 12px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .page-content {
    padding: 1rem;
  }

  .form-container {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
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

@media (max-width: 480px) {
  .color-selector {
    gap: 12px;
  }

  .color-option {
    width: 42px;
    height: 42px;
  }
}
</style>
