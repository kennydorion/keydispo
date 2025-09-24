<template>
  <va-modal
    v-model="isVisible"
    :hide-default-actions="true"
    :fullscreen="isMobile"
    :max-width="isMobile ? '100vw' : '600px'"
    :max-height="isMobile ? '100vh' : '85vh'"
    :mobile-fullscreen="true"
    no-padding
    class="collab-dispo-modal"
    :class="{ 'collab-dispo-modal--mobile': isMobile }"
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="() => { modalA11y.onClose(); handleClose() }"
  >
    <template v-if="mode === 'dispo'">
      <DispoEditContent
        :selected-cell="selectedCell"
        :selected-collaborateur="mockSelectedCollaborateur"
        :collaborateur-color="avatarColor"
        :formatted-date="formattedDate"
        :selected-cell-dispos="mockSelectedCellDispos"
        :editing-dispo-index="null"
        :is-adding-new-dispo="true"
        :editing-dispo="editingDispo"
        :type-options="typeOptions"
        :slot-options="slotOptions"
        :lieux-options-strings="lieuxExistants"
        :is-edit-form-valid="isFormValid"
        :saving="saving"
        :time-kind-options="timeKindOptions"
        :time-kind-options-filtered="timeKindOptionsFiltered"
        :is-detected-overnight="isOvernightSchedule"
        :is-collaborator-view="!canAccessAdminFeatures"
        :get-type-icon="getTypeIcon"
        :get-type-text="getTypeText"
        :get-type-color="getTypeColor"
        :get-dispo-type-class="getDispoTypeClass"
        :get-slot-text="getSlotText"
        :get-time-kind-icon="getTimeKindIcon"
        :get-user-initials="getUserInitials"
        :is-overnight-time="isOvernightTime"
        @cancel-modal="handleClose"
        @save-dispos="handleSave"
        @set-editing-type="setEditingType"
        @set-editing-time-kind="setEditingTimeKind"
        @toggle-editing-slot="toggleEditingSlot"
        @update-editing-lieu="updateEditingLieu"
        @save-edit-dispo="handleSave"
        @cancel-edit-dispo="handleClose"
        @add-new-dispo-line="() => {}"
        @edit-dispo-line="() => {}"
        @remove-dispo="() => {}"
        @create-lieu="onCreateLieu"
      />
    </template>
    <template v-else>
      <div class="collab-view-content" v-if="mockSelectedCollaborateur">
        <div class="header-block">
          <h3 class="name">{{ mockSelectedCollaborateur.prenom }} {{ mockSelectedCollaborateur.nom }}</h3>
          <div class="meta-line">
            <span v-if="mockSelectedCollaborateur.metier" class="pill">{{ mockSelectedCollaborateur.metier }}</span>
            <span v-if="mockSelectedCollaborateur.ville" class="pill">{{ mockSelectedCollaborateur.ville }}</span>
          </div>
        </div>
        <div class="contact-line" v-if="mockSelectedCollaborateur.phone || mockSelectedCollaborateur.email">
          <a v-if="mockSelectedCollaborateur.phone" :href="`tel:${mockSelectedCollaborateur.phone}`" class="contact-link">
            <va-icon name="phone" size="16px" /> {{ mockSelectedCollaborateur.phone }}
          </a>
          <a v-if="mockSelectedCollaborateur.email" :href="`mailto:${mockSelectedCollaborateur.email}`" class="contact-link">
            <va-icon name="email" size="16px" /> {{ mockSelectedCollaborateur.email }}
          </a>
        </div>
        <div class="notes-zone">
          <div class="notes-header">
            <span class="title">Notes</span>
            <va-badge v-if="hasNotesChanges" color="warning" text="*" />
          </div>
          <div v-if="!editNotes" class="notes-display" @dblclick="startEditNotes">
            {{ notesDisplay || '—' }}
          </div>
          <div v-else class="notes-edit-block">
            <va-textarea v-model="localNotes" min-rows="3" max-rows="6" autosize placeholder="Ajouter des notes..." />
            <div class="notes-actions">
              <va-button size="small" color="success" icon="save" :loading="savingNotes" @click="saveNotes">Sauver</va-button>
              <va-button size="small" color="secondary" @click="cancelNotes">Annuler</va-button>
            </div>
          </div>
        </div>
        <div class="actions-inline">
          <va-button size="small" color="primary" icon="edit" @click="goToProfile">Modifier</va-button>
          <va-button size="small" color="secondary" @click="handleClose">Fermer</va-button>
        </div>
      </div>
    </template>
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useModalA11y } from '@/composables/useModalA11y'
import { useToast } from 'vuestic-ui'
import { getUserInitials, getUserColor } from '../services/avatarUtils'
import { disponibilitesRTDBService } from '../services/disponibilitesRTDBService'
import DispoEditContent from './DispoEditContent.vue'
import {
  slotOptions,
  timeKindOptions,
  typeOptionsFor,
  timeKindOptionsFilteredFor,
  isFormValid as isDraftValid,
  detectOvernight,
  getTypeIcon,
  getTypeColor,
  getSlotText,
  getTimeKindIcon,
  mapUITypeToRTDB,
  mapUITimeKindToRTDB,
} from '@/services/dispoFormOptions'
import type { Collaborateur } from '@/types/planning'
import { InterfaceManager } from '@/services/interfaceManager'
const canAccessAdminFeatures = InterfaceManager.canAccessAdminFeatures

interface DisponibiliteData {
  type: string
  timeKind: string
  heureDebut: string
  heureFin: string
  lieu: string
  slots: string[]
}

// Accepte un collaborateur minimal (profil light) et enrichit localement les champs requis
interface MinimalCollaborateur {
  id: string
  nom: string
  prenom: string
  tenantId: string
  email?: string | null
  phone?: string | null
  metier?: string | null
  ville?: string | null
  color?: string | null
  createdAt?: any
  updatedAt?: any
}

interface Props {
  collaborateur: MinimalCollaborateur | null
  date: string
  modelValue?: boolean
  editingDisponibilite?: any
  existingDisponibilites?: any[]
  mode?: 'dispo' | 'collaborateur'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  mode: 'dispo'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: DisponibiliteData]
  delete: [id: string]
  close: []
  'save-collaborateur-notes': [collaborateur: Collaborateur, notes: string]
}>()

// State
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})
const saving = ref(false)
const lieuxExistants = ref<string[]>([])
const { init: notify } = useToast()
const modalA11y = useModalA11y()

// Configuration responsive
const isMobile = ref(false)

// Form data pour DispoEditContent
const editingDispo = ref({
  type: 'disponible' as 'mission' | 'disponible' | 'indisponible',
  timeKind: 'full-day' as 'range' | 'slot' | 'full-day' | 'overnight',
  heure_debut: '09:00',
  heure_fin: '17:00',
  lieu: '',
  slots: [] as string[]
})

// Mock data for DispoEditContent
const selectedCell = computed(() => ({
  collaborateurId: props.collaborateur?.id || '',
  date: props.date || ''
}))

const mockSelectedCellDispos = computed(() => {
  return props.existingDisponibilites || []
})

const mockSelectedCollaborateur = computed<Collaborateur | null>(() => {
  const c = props.collaborateur
  if (!c) return null
  // Normaliser pour respecter le type Collaborateur (pas de null)
  const normalized: Collaborateur = {
    id: c.id,
    nom: c.nom,
    prenom: c.prenom,
    tenantId: c.tenantId,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    metier: c.metier ?? undefined,
    ville: c.ville ?? undefined,
    note: undefined,
    notes: undefined,
    color: c.color ?? avatarColor.value,
    createdAt: c.createdAt ?? new Date(),
    updatedAt: c.updatedAt ?? new Date(),
  }
  return normalized
})

// ===== Mode collaborateur : gestion notes (après déclaration collaborateur) =====
const editNotes = ref(false)
const localNotes = ref('')
const savingNotes = ref(false)
const notesDisplay = computed(() => mockSelectedCollaborateur.value?.notes || mockSelectedCollaborateur.value?.note || '')
watch(mockSelectedCollaborateur, (c) => { if (c) localNotes.value = c.notes || c.note || '' }, { immediate: true })
const hasNotesChanges = computed(() => localNotes.value !== (mockSelectedCollaborateur.value?.notes || mockSelectedCollaborateur.value?.note || ''))
function startEditNotes() { editNotes.value = true }
function cancelNotes() { localNotes.value = mockSelectedCollaborateur.value?.notes || mockSelectedCollaborateur.value?.note || ''; editNotes.value = false }
async function saveNotes() {
  if (!mockSelectedCollaborateur.value) return
  savingNotes.value = true
  try {
    emit('save-collaborateur-notes', mockSelectedCollaborateur.value, localNotes.value)
    editNotes.value = false
  } finally { savingNotes.value = false }
}
function goToProfile() {
  if (!mockSelectedCollaborateur.value) return
  window.location.href = `/collaborateurs/${mockSelectedCollaborateur.value.id}`
}

const formattedDate = computed(() => {
  return new Date(props.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Options pour DispoEditContent (inclut Mission si admin/editor)
const typeOptions = computed(() => typeOptionsFor(!InterfaceManager.canAccessAdminFeatures.value))
// timeKindOptions fourni, filtrer selon type
const timeKindOptionsFiltered = computed(() => timeKindOptionsFilteredFor(editingDispo.value.type as any))

// Computed properties
const avatarColor = computed(() => {
  const c = props.collaborateur
  if (!c) return '#6366f1'
  return c.color || getUserColor(c.id)
})

const isFormValid = computed(() => isDraftValid(editingDispo.value as any))

const isOvernightSchedule = computed(() => detectOvernight(editingDispo.value as any))

// Helper functions for DispoEditContent
const getTypeText = (type: string) => {
  const option = typeOptions.value.find((opt: { value: string; text: string }) => opt.value === type)
  return option?.text || type
}

const getDispoTypeClass = (dispo: any) => {
  return `type-${dispo.type || 'unknown'}`
}
const isOvernightTime = (start?: string, end?: string) => {
  if (!start || !end) return false
  const d = { type: editingDispo.value.type, timeKind: 'range', heure_debut: start, heure_fin: end, slots: [] } as any
  return detectOvernight(d)
}

// Event handlers for DispoEditContent
const setEditingType = (type: string) => {
  editingDispo.value.type = type as any
}

const setEditingTimeKind = (timeKind: string) => {
  editingDispo.value.timeKind = timeKind as any
  
  // Reset related fields when changing time kind
  if (timeKind === 'full-day') {
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
    editingDispo.value.slots = []
  } else if (timeKind === 'slot') {
    editingDispo.value.heure_debut = ''
    editingDispo.value.heure_fin = ''
  } else if (timeKind === 'range') {
    editingDispo.value.slots = []
    if (!editingDispo.value.heure_debut) editingDispo.value.heure_debut = '09:00'
    if (!editingDispo.value.heure_fin) editingDispo.value.heure_fin = '17:00'
  }
}

const toggleEditingSlot = (slot: string) => {
  if (!editingDispo.value.slots) editingDispo.value.slots = []
  
  const index = editingDispo.value.slots.indexOf(slot)
  if (index > -1) {
    editingDispo.value.slots.splice(index, 1)
  } else {
    editingDispo.value.slots.push(slot)
  }
}

const updateEditingLieu = (lieu: string) => {
  editingDispo.value.lieu = lieu
}

const onCreateLieu = (lieu: string) => {
  if (lieu && !lieuxExistants.value.includes(lieu)) {
    lieuxExistants.value.push(lieu)
    lieuxExistants.value.sort()
  }
  editingDispo.value.lieu = lieu
}

const handleClose = () => {
  isVisible.value = false
  emit('close')
}

const handleSave = async () => {
  if (!isFormValid.value || !props.collaborateur) return
  
  saving.value = true
  
  try {
    console.log(`🔄 RTDB: Création de disponibilité pour ${props.collaborateur.prenom} ${props.collaborateur.nom}`)
    
    const dispoData = {
      collaborateurId: props.collaborateur.id,
      nom: props.collaborateur.nom,
      prenom: props.collaborateur.prenom,
      metier: props.collaborateur.metier || '',
      phone: props.collaborateur.phone || '',
      email: props.collaborateur.email || '',
      ville: props.collaborateur.ville || '',
      date: props.date,
      lieu: editingDispo.value.lieu || '',
      heure_debut: editingDispo.value.heure_debut || '',
      heure_fin: editingDispo.value.heure_fin || '',
  type: mapUITypeToRTDB(editingDispo.value.type as any),
  timeKind: mapUITimeKindToRTDB(editingDispo.value.timeKind as any),
      isFullDay: editingDispo.value.timeKind === 'full-day',
      slots: editingDispo.value.slots || [],
      updatedBy: 'collaborateur-modal'
    }
    
    await disponibilitesRTDBService.createDisponibilite(dispoData)
    
    console.log(`✅ RTDB: Disponibilité créée avec succès`, { 
      typeUI: editingDispo.value.type, 
      typeRTDB: dispoData.type 
    })
    
    emit('save', {
      type: editingDispo.value.type,
      timeKind: editingDispo.value.timeKind,
      heureDebut: editingDispo.value.heure_debut,
      heureFin: editingDispo.value.heure_fin,
      lieu: editingDispo.value.lieu,
      slots: editingDispo.value.slots
    })
    
    notify({
      message: 'Disponibilité ajoutée avec succès',
      color: 'success'
    })
    
    handleClose()
  } catch (error) {
    console.error('❌ Erreur lors de la création de la disponibilité RTDB:', error)
    notify({
      message: 'Erreur lors de la création de la disponibilité',
      color: 'danger'
    })
  } finally {
    saving.value = false
  }
}

// Fonction pour récupérer les lieux existants depuis RTDB
async function fetchLieuxExistants() {
  try {
    const allDispos = await disponibilitesRTDBService.getAllDisponibilites('keydispo')
    const lieuxSet = new Set<string>()
    
    allDispos.forEach((dispo) => {
      if (dispo.lieu && typeof dispo.lieu === 'string' && dispo.lieu.trim()) {
        lieuxSet.add(dispo.lieu.trim())
      }
    })
    
    // Ajouter quelques lieux par défaut
    const lieuxParDefaut = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Nantes', 'Toulouse', 'Bordeaux']
    lieuxParDefaut.forEach(lieu => lieuxSet.add(lieu))
    
    lieuxExistants.value = Array.from(lieuxSet).sort()
  } catch (error) {
    console.error('Erreur lors de la récupération des lieux:', error)
    lieuxExistants.value = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Nantes', 'Toulouse', 'Bordeaux']
  }
}

// Lifecycle
onMounted(() => {
  fetchLieuxExistants()
  
  // Détecter le mode mobile
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // Nettoyer l'event listener à la destruction
  const cleanup = () => {
    window.removeEventListener('resize', checkMobile)
  }
  
  // Retourner la fonction de nettoyage pour onBeforeUnmount implicite
  return cleanup
})

// Watchers
watch(() => props.collaborateur, (newCollab) => {
  if (newCollab) {
    editingDispo.value.lieu = newCollab.ville || ''
  }
}, { immediate: true })
</script>

<style scoped>
/* === CSS SIMPLIFIÉ POUR RESPECTER DispoEditContent === */

/* Styles de base pour le modal */
.collab-dispo-modal {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
}

/* Mobile : Plein écran comme défini dans DispoEditContent */
@media (max-width: 768px) {
  :deep(.collab-dispo-modal--mobile .va-modal__container) {
    padding: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    margin: 0 !important;
  }

  :deep(.collab-dispo-modal--mobile .va-modal__dialog) {
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  :deep(.collab-dispo-modal--mobile .va-modal__content) {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
}

/* Desktop : Taille normale comme défini dans DispoEditContent */
@media (min-width: 769px) {
  :deep(.collab-dispo-modal:not(.collab-dispo-modal--mobile) .va-modal__container) {
    padding: 10px !important;
  }

  :deep(.collab-dispo-modal:not(.collab-dispo-modal--mobile) .va-modal__dialog) {
    max-width: 600px !important;
    max-height: 85vh !important;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  :deep(.collab-dispo-modal:not(.collab-dispo-modal--mobile) .va-modal__content) {
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
}

/* Laisser DispoEditContent gérer sa propre responsivité */
:deep(.dispo-modal-redesigned) {
  border-radius: 0 !important;
  box-shadow: none !important;
  width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
}

/* ===== Vue Collaborateur ===== */
.collab-view-content { padding:24px; display:flex; flex-direction:column; gap:20px; }
.collab-view-content .header-block { display:flex; flex-direction:column; gap:10px; }
.collab-view-content .name { margin:0; font-size:20px; font-weight:600; }
.collab-view-content .meta-line { display:flex; gap:8px; flex-wrap:wrap; }
.collab-view-content .pill { background:#f1f5f9; border:1px solid #e2e8f0; padding:4px 8px; border-radius:999px; font-size:12px; font-weight:500; }
.collab-view-content .contact-line { display:flex; gap:16px; flex-wrap:wrap; }
.collab-view-content .contact-link { display:inline-flex; align-items:center; gap:6px; font-size:14px; color:#334155; text-decoration:none; }
.collab-view-content .contact-link:hover { text-decoration:underline; }
.collab-view-content .notes-zone { display:flex; flex-direction:column; gap:8px; }
.collab-view-content .notes-header { display:flex; align-items:center; gap:8px; font-weight:600; font-size:14px; }
.collab-view-content .notes-display { font-size:14px; line-height:1.5; background:#f8fafc; padding:12px 14px; border:1px solid #e2e8f0; border-radius:8px; min-height:54px; white-space:pre-line; cursor:text; }
.collab-view-content .notes-edit-block { display:flex; flex-direction:column; gap:12px; }
.collab-view-content .notes-actions { display:flex; gap:12px; }
.collab-view-content .actions-inline { display:flex; gap:12px; }
</style>
