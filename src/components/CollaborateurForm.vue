<template>
  <va-form ref="formRef" @submit="handleSubmit">
    <div class="collaborateur-form">
      <div class="form-grid">
        <!-- Nom -->
        <div class="form-group">
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
        <div class="form-group">
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
        <div class="form-group">
          <va-input
            v-model="form.email"
            label="Email *"
            type="email"
            :rules="[required, emailValidation]"
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
        <div class="form-group">
          <va-input
            v-model="form.phone"
            label="Téléphone *"
            :rules="[required, phoneValidation]"
            class="w-full"
            :error="!!errors.phone"
            :error-messages="errors.phone"
          >
            <template #prependInner>
              <va-icon name="phone" />
            </template>
          </va-input>
        </div>

        <!-- Métier -->
        <div class="form-group">
          <va-select
            v-model="form.metier"
            label="Métier *"
            :options="metiersOptions"
            :rules="[(v: any) => required(v)]"
            class="w-full"
            :error="!!errors.metier"
            :error-messages="errors.metier"
            searchable
            allow-create
          >
            <template #prependInner>
              <va-icon name="work" />
            </template>
          </va-select>
        </div>

        <!-- Note -->
        <div class="form-group form-group-full">
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
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <va-button
          color="danger"
          preset="secondary"
          @click="$emit('cancel')"
        >
          <va-icon name="close" />
          Annuler
        </va-button>
        
        <va-button
          color="primary"
          type="submit"
          :loading="isSubmitting"
        >
          <va-icon name="save" />
          {{ mode === 'create' ? 'Créer' : 'Sauvegarder' }}
        </va-button>
      </div>
    </div>
  </va-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { validatePhone } from '../utils/phoneFormatter'

// Props
interface Props {
  mode: 'create' | 'edit'
  initialData?: Partial<CollaborateurData>
  isSubmitting?: boolean
}

interface CollaborateurData {
  id?: string
  nom: string
  prenom: string
  email: string
  phone: string
  metier: string
  note: string
}

interface FormErrors {
  nom?: string
  prenom?: string
  email?: string
  phone?: string
  metier?: string
  note?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  initialData: () => ({}),
  isSubmitting: false
})

// Emits
const emit = defineEmits<{
  submit: [data: CollaborateurData]
  cancel: []
}>()

// Form ref
const formRef = ref()

// Form data
const form = reactive({
  nom: '',
  prenom: '',
  email: '',
  phone: '',
  metier: '',
  note: ''
})

// Form errors
const errors = ref<FormErrors>({})

// Options
const metiersOptions = [
  'Développeur',
  'Designer',
  'Chef de projet',
  'Product Owner',
  'Scrum Master',
  'Architecte',
  'DevOps',
  'Testeur QA',
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
]

// Validation rules
const required = (value: string) => {
  return !!value?.trim() || 'Ce champ est requis'
}

const emailValidation = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value) || 'Email invalide'
}

const phoneValidation = (value: string) => {
  const isValid = validatePhone(value)
  return isValid || 'Téléphone invalide'
}

// Watch for initial data changes
watch(() => props.initialData, (newData) => {
  if (newData) {
    Object.assign(form, {
      nom: newData.nom || '',
      prenom: newData.prenom || '',
      email: newData.email || '',
      phone: newData.phone || '',
      metier: newData.metier || '',
      note: newData.note || ''
    })
  }
}, { immediate: true, deep: true })

// Form validation
const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  // Validation nom
  if (!form.nom.trim()) {
    errors.value.nom = 'Le nom est requis'
    isValid = false
  }

  // Validation prénom
  if (!form.prenom.trim()) {
    errors.value.prenom = 'Le prénom est requis'
    isValid = false
  }

  // Validation email
  if (!form.email.trim()) {
    errors.value.email = 'L\'email est requis'
    isValid = false
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      errors.value.email = 'Email invalide'
      isValid = false
    }
  }

  // Validation téléphone
  if (!form.phone.trim()) {
    errors.value.phone = 'Le téléphone est requis'
    isValid = false
  } else {
    const phoneValidationResult = validatePhone(form.phone)
    if (!phoneValidationResult) {
      errors.value.phone = 'Téléphone invalide'
      isValid = false
    }
  }

  // Validation métier
  if (!form.metier.trim()) {
    errors.value.metier = 'Le métier est requis'
    isValid = false
  }

  return isValid
}

// Form submission
const handleSubmit = async (event: Event) => {
  event.preventDefault()
  
  if (!validateForm()) {
    return
  }

  const formData: CollaborateurData = {
    nom: form.nom.trim(),
    prenom: form.prenom.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    metier: form.metier.trim(),
    note: form.note.trim()
  }

  if (props.mode === 'edit' && props.initialData?.id) {
    formData.id = props.initialData.id
  }

  emit('submit', formData)
}

// Reset form
const resetForm = () => {
  Object.assign(form, {
    nom: '',
    prenom: '',
    email: '',
    phone: '',
    metier: '',
    note: ''
  })
  errors.value = {}
}

// Expose methods
defineExpose({
  resetForm,
  validateForm
})
</script>

<style scoped>
.collaborateur-form {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group-full {
  grid-column: 1 / -1; /* Prend toute la largeur de la grille */
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--va-background-border);
}

/* Correction des couleurs des inputs pour être en noir */
:deep(.va-input__content__input) {
  color: #000000 !important;
}

:deep(.va-textarea__content__input) {
  color: #000000 !important;
}

:deep(.va-input__container .va-icon) {
  color: #000000 !important;
}

:deep(.va-input__content__input::placeholder) {
  color: #a0aec0 !important;
}

:deep(.va-textarea__content__input::placeholder) {
  color: #a0aec0 !important;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    justify-content: stretch;
  }
  
  .form-actions .va-button {
    flex: 1;
  }
}
</style>
