<template>
  <div v-if="selectedCollaborateur" class="collab-modal-redesigned" ref="modalRootRef">
    <!-- HEADER -->
    <div class="header-section" :style="{ '--collaborateur-color': collaborateurColor }">
      <div class="header-background"></div>
      <div class="header-content">
        <div class="collaborateur-info">
          <div class="avatar-container">
            <div class="collaborateur-avatar" :style="{ backgroundColor: collaborateurColor }">
              {{ getUserInitials(selectedCollaborateur) }}
            </div>
          </div>
          <div class="info-text">
            <h2 class="collaborateur-name">{{ selectedCollaborateur.prenom }} {{ selectedCollaborateur.nom }}</h2>
            <p class="metier-info" v-if="selectedCollaborateur.metier">
              <va-icon name="work" size="16px" />
              {{ selectedCollaborateur.metier }}
            </p>
            <p class="ville-info" v-if="selectedCollaborateur.ville">
              <va-icon name="place" size="16px" />
              {{ selectedCollaborateur.ville }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- CORPS SCROLLABLE -->
    <div class="modal-body" ref="modalBodyRef">
      <!-- Section Contact -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <va-icon name="contact_phone" color="primary" />
            <span>Contact</span>
          </div>
        </div>
        <div class="contact-content">
          <div v-if="selectedCollaborateur.phone" class="contact-item">
            <a :href="`tel:${selectedCollaborateur.phone}`" class="contact-link">
              <va-icon name="phone" size="20px" color="success" />
              <div class="contact-info">
                <span class="contact-label">Téléphone</span>
                <span class="contact-value">{{ selectedCollaborateur.phone }}</span>
              </div>
            </a>
          </div>
          <div v-if="selectedCollaborateur.email" class="contact-item">
            <a :href="`mailto:${selectedCollaborateur.email}`" class="contact-link">
              <va-icon name="email" size="20px" color="info" />
              <div class="contact-info">
                <span class="contact-label">Email</span>
                <span class="contact-value">{{ selectedCollaborateur.email }}</span>
              </div>
            </a>
          </div>
          <div v-if="!selectedCollaborateur.phone && !selectedCollaborateur.email" class="no-contact">
            <va-icon name="contact_mail" size="32px" color="secondary" />
            <span>Aucune information de contact</span>
          </div>
        </div>
      </div>

      <!-- Section Notes -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <va-icon name="note" color="primary" />
            <span>Notes</span>
            <va-badge v-if="hasNotesChanges" color="warning" text="*" />
          </div>
        </div>
        <div class="notes-content">
          <div v-if="!editingNotes" class="notes-display" @dblclick="startEditNotes">
            <div v-if="notesDisplay" class="notes-text">{{ notesDisplay }}</div>
            <div v-else class="notes-empty">
              <va-icon name="edit_note" size="24px" color="secondary" />
              <span>Double-cliquez pour ajouter des notes</span>
            </div>
          </div>
          <div v-else class="notes-edit">
            <va-textarea
              v-model="localNotes"
              placeholder="Ajouter des notes sur ce collaborateur..."
              autosize
              min-rows="4"
              max-rows="10"
              class="notes-textarea"
            />
            <div class="notes-actions">
              <va-button 
                size="small"
                color="success"
                icon="save"
                @click="saveNotes"
                :loading="savingNotes"
              >
                Sauvegarder
              </va-button>
              <va-button 
                size="small"
                color="secondary"
                @click="cancelNotesEdit"
              >
                Annuler
              </va-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER ACTIONS -->
    <div class="modal-footer">
      <div class="actions-grid">
        <va-button
          color="primary"
          icon="edit"
          @click="editCollaborateur"
          class="action-btn-primary"
        >
          Modifier le profil
        </va-button>
        <va-button
          color="secondary"
          @click="$emit('cancel-modal')"
          class="action-btn-secondary"
        >
          Fermer
        </va-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Collaborateur } from '@/types/planning'

interface Props {
  selectedCollaborateur: Collaborateur | null
  collaborateurColor: string
  getUserInitials: (collaborateur: Collaborateur) => string
  saving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  saving: false
})

const emit = defineEmits<{
  'cancel-modal': []
  'save-notes': [collaborateur: Collaborateur, notes: string]
}>()

const router = useRouter()

// Notes management
const editingNotes = ref(false)
const localNotes = ref('')
const savingNotes = ref(false)

const notesDisplay = computed(() => 
  props.selectedCollaborateur?.notes || props.selectedCollaborateur?.note || ''
)

const hasNotesChanges = computed(() => 
  localNotes.value !== notesDisplay.value
)

// Watch collaborateur changes
watch(() => props.selectedCollaborateur, (newCollab) => {
  if (newCollab) {
    localNotes.value = newCollab.notes || newCollab.note || ''
    editingNotes.value = false
  }
}, { immediate: true })

// Notes methods
const startEditNotes = () => {
  editingNotes.value = true
}

const cancelNotesEdit = () => {
  localNotes.value = notesDisplay.value
  editingNotes.value = false
}

const saveNotes = async () => {
  if (!props.selectedCollaborateur) return
  
  savingNotes.value = true
  try {
    emit('save-notes', props.selectedCollaborateur, localNotes.value)
    editingNotes.value = false
  } finally {
    savingNotes.value = false
  }
}

const editCollaborateur = () => {
  if (props.selectedCollaborateur?.id) {
    emit('cancel-modal')
    router.push(`/collaborateurs/${props.selectedCollaborateur.id}`)
  }
}

// Refs for modal
const modalRootRef = ref<HTMLElement>()
const modalBodyRef = ref<HTMLElement>()
</script>

<style scoped>
/* Reprise des styles de DispoEditContent avec adaptations pour collaborateur */
.collab-modal-redesigned {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* HEADER */
.header-section {
  position: relative;
  background: linear-gradient(135deg, var(--collaborateur-color, #3b82f6) 0%, 
              color-mix(in srgb, var(--collaborateur-color, #3b82f6) 85%, #000) 100%);
  color: white;
  padding: 24px;
  flex-shrink: 0;
}

.header-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
}

.header-content {
  position: relative;
  z-index: 1;
}

.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-container {
  flex-shrink: 0;
}

.collaborateur-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 20px;
  color: white;
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.info-text {
  flex: 1;
}

.collaborateur-name {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.metier-info, .ville-info {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* MODAL BODY */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* SECTION CARDS */
.section-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  padding: 16px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #374151;
}

/* CONTACT CONTENT */
.contact-content {
  padding: 20px;
}

.contact-item {
  margin-bottom: 16px;
}

.contact-item:last-child {
  margin-bottom: 0;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.contact-link:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.contact-value {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
}

.no-contact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: #6b7280;
  font-size: 14px;
}

/* NOTES CONTENT */
.notes-content {
  padding: 20px;
}

.notes-display {
  min-height: 80px;
  cursor: pointer;
  border-radius: 8px;
  padding: 16px;
  border: 2px dashed #d1d5db;
  transition: all 0.2s ease;
}

.notes-display:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.notes-text {
  white-space: pre-line;
  line-height: 1.6;
  color: #374151;
}

.notes-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
}

.notes-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notes-actions {
  display: flex;
  gap: 12px;
}

/* FOOTER */
.modal-footer {
  padding: 20px 24px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.actions-grid {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.action-btn-primary {
  min-width: 140px;
}

.action-btn-secondary {
  min-width: 100px;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .header-section {
    padding: 20px 16px;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .modal-footer {
    padding: 16px;
  }
  
  .actions-grid {
    flex-direction: column;
  }
  
  .contact-link {
    padding: 12px;
  }
  
  .collaborateur-avatar {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }
  
  .collaborateur-name {
    font-size: 20px;
  }
}
</style>