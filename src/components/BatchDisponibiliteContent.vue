<template>
  <div class="dispo-modal-redesigned batch-mode" ref="modalRootRef">
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
            <p class="date-info">
              <va-icon name="calendar_today" size="16px" />
              {{ formattedDate }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- CORPS SCROLLABLE -->
    <div class="modal-body" ref="modalBodyRef">
      <!-- Formulaire direct sans liste -->
      <div class="section-card edit-card">
        <div class="section-header">
          <div class="section-title">
            <va-icon name="add_circle" color="success" />
            <span>Nouvelle disponibilité</span>
          </div>
        </div>
        <div class="form-content">
          <DispoForm
            v-model="localEditingDispo"
            :type-options="typeOptions"
            :time-kind-options="timeKindOptionsFiltered"
            :slot-options="slotOptions"
            :lieux-options="lieuxOptionsStrings"
            :get-type-icon="getTypeIcon"
            :get-time-kind-icon="getTimeKindIcon"
            @create-lieu="$emit('create-lieu', $event)"
          />
          <div class="form-actions">
            <va-button 
              @click="$emit('cancel-modal')" 
              color="secondary" 
              size="large" 
              preset="secondary"
            >
              Annuler
            </va-button>
            <va-button 
              @click="$emit('save-dispos')" 
              color="success" 
              size="large" 
              :disabled="!isEditFormValid"
              icon="add"
            >
              Créer les disponibilités
            </va-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DispoForm from './DispoForm.vue'
import type { Collaborateur } from '@/types/planning'

interface Disponibilite {
  id?: string
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  lieu?: string
  heure_debut?: string
  heure_fin?: string
  slots?: string[]
}

const props = defineProps<{
  selectedCollaborateur: Collaborateur | null
  collaborateurColor: string
  formattedDate: string
  editingDispo: Partial<Disponibilite>
  typeOptions: Array<{ text: string; value: string }>
  slotOptions: Array<{ text: string; value: string }>
  lieuxOptionsStrings: string[]
  isEditFormValid: boolean
  saving: boolean
  timeKindOptionsFiltered: Array<{ text: string; value: string }>
  getTypeIcon: (t: any) => string
  getTimeKindIcon: (k: any) => string
  getUserInitials: (u: any) => string
}>()

const emit = defineEmits<{
  (e: 'cancel-modal'): void
  (e: 'save-dispos'): void
  (e: 'create-lieu', value: string): void
  (e: 'update:editingDispo', value: Partial<Disponibilite>): void
}>()

const modalRootRef = ref<HTMLElement | null>(null)
const modalBodyRef = ref<HTMLElement | null>(null)

// Créer un ref local pour v-model de DispoForm
const localEditingDispo = computed({
  get: () => props.editingDispo,
  set: (value) => emit('update:editingDispo', value)
})
</script>

<style scoped>
/* Réutiliser les mêmes styles que DispoEditContent */
.dispo-modal-redesigned {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: inherit;
  overflow: hidden;
}

.dispo-modal-redesigned * {
  box-sizing: border-box;
  max-width: 100%;
}

.header-section {
  position: relative;
  background: linear-gradient(135deg, var(--collaborateur-color, var(--primary-color)) 0%, color-mix(in srgb, var(--collaborateur-color, var(--primary-color)) 85%, #8b5cf6) 100%);
  padding: 1rem 1.5rem;
  color: white;
  flex-shrink: 0;
}

.header-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.1) 1px, transparent 0);
  background-size: 20px 20px;
  opacity: 0.5;
}

.header-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.collaborateur-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.info-text {
  min-width: 0;
  flex: 1;
}

.collaborateur-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  margin: 0;
  opacity: 0.9;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1rem 0.75rem;
  background: #f8f9fa;
}

.section-card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  padding: 1rem 1.25rem;
  background: linear-gradient(to bottom, #fafbfc, #f3f4f6);
  border-bottom: 1px solid #e5e7eb;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.form-content {
  padding: 1.25rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}
</style>
