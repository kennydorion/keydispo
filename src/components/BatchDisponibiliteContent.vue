<template>
  <div v-if="selectedCollaborateur" class="dispo-modal-redesigned batch-mode" ref="modalRootRef">
    <!-- HEADER -->
    <div class="header-section" :style="{ 
      background: `linear-gradient(135deg, ${collaborateurColor} 0%, ${collaborateurColor}dd 100%)`,
      '--collaborateur-color': collaborateurColor 
    }">
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
      <!-- Section info pour le mode batch -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <va-icon name="info" color="primary" />
            <span>Ajout en lot</span>
          </div>
        </div>
        <div class="empty-state">
          <div class="empty-illustration">
            <va-icon name="event_available" size="48px" color="primary" />
          </div>
          <h3 class="empty-title">{{ formattedDate }}</h3>
          <p class="empty-subtitle">La disponibilité sera créée pour toutes les dates sélectionnées</p>
        </div>
      </div>

      <!-- Formulaire direct - toujours visible pour le batch -->
      <Transition name="form-appear" mode="out-in">
        <div key="edit-form" class="section-card edit-card">
          <div class="section-header">
            <div class="section-title">
              <va-icon name="add_circle" color="success" />
              <span>Nouvelle disponibilité (BATCH MODE ✨)</span>
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
              <!-- Bouton principal avec même style que l'ajout simple -->
              <va-button 
                @click="$emit('save-dispos')" 
                color="success" 
                size="large" 
                :disabled="!isEditFormValid"
                icon="add"
              >
                Ajouter une disponibilité
              </va-button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- FOOTER SIMPLIFIÉ (comme DispoEditContent) -->
    <div class="footer-actions" ref="footerRef">
      <va-button 
        color="secondary" 
        size="large" 
        @click="$emit('cancel-modal')" 
        class="cancel-button"
      >
        Fermer
      </va-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DispoForm from './DispoForm.vue'
import type { Collaborateur } from '@/types/planning'

// Debug: vérifier que ce composant est bien chargé
onMounted(() => {
  console.log('✅ BatchDisponibiliteContent monté avec couleur:', props.collaborateurColor)
})

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
const footerRef = ref<HTMLElement | null>(null)

// Créer un ref local pour v-model de DispoForm
const localEditingDispo = computed({
  get: () => props.editingDispo,
  set: (value) => emit('update:editingDispo', value)
})
</script>

<style scoped>
/* === TOUS LES STYLES DE DispoEditContent POUR UNIFORMITÉ COMPLÈTE === */
:root { --footer-height:72px; }

.dispo-modal-redesigned {
  width: min(92vw, 560px);
  max-height: 90vh;
  background: #fff;
  border: 2px solid rgba(0,0,0,0.1);
  border-radius: 18px;
  box-shadow: 0 18px 40px -8px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.dispo-modal-redesigned * {
  box-sizing: border-box;
  max-width: 100%;
}

.dispo-modal-redesigned input,
.dispo-modal-redesigned select,
.dispo-modal-redesigned textarea {
  max-width: 100%;
}

.header-section {
  position: relative;
  background: linear-gradient(135deg, var(--collaborateur-color, var(--primary-color)) 0%, color-mix(in srgb, var(--collaborateur-color, var(--primary-color)) 85%, #8b5cf6) 100%);
  padding: 1rem 1.5rem;
  color: white;
  flex-shrink: 0;
  box-sizing: border-box;
  max-width: 100%;
}

.header-section::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: transparent;
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
  background: #fafbfc;
  scrollbar-width: thin;
}

.modal-body::-webkit-scrollbar { width: 8px; }
.modal-body::-webkit-scrollbar-track { background: transparent; }
.modal-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }

.section-card { 
  background:#fff; 
  border:1px solid var(--gray-200); 
  border-radius:10px; 
  margin-bottom:1rem; 
  overflow:hidden; 
}

.edit-card {
  border: 1.5px solid var(--success-color);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0.01) 100%);
}

.edit-card .section-header {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%);
  border-bottom-color: rgba(16, 185, 129, 0.15);
}

.section-header {
  padding: 0.75rem 1rem;
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
  box-sizing: border-box;
  max-width: 100%;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--gray-800);
}

/* === ÉTAT VIDE === */
.empty-state {
  padding: 2rem 1rem;
  text-align: center;
}

.empty-illustration {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-700);
  margin: 0.5rem 0 0.25rem 0;
}

.empty-subtitle {
  color: var(--gray-500);
  margin: 0;
  font-size: 0.85rem;
}

.form-content {
  padding: 1rem;
  box-sizing: border-box;
  max-width: 100%;
  overflow: visible;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--gray-200);
  margin-top: 1rem;
  box-sizing: border-box;
  max-width: 100%;
}

.form-actions .va-button {
  min-width: 120px;
  font-weight: 600;
}

.form-actions .va-button--primary,
.form-actions .va-button--success {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%) !important;
  border-color: #388e3c !important;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.25) !important;
}

.form-actions .va-button--primary:hover,
.form-actions .va-button--success:hover {
  background: linear-gradient(135deg, #388e3c 0%, #2e7d32 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3) !important;
}

.form-actions .va-button--secondary {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  border-color: #4b5563 !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.25) !important;
}

.form-actions .va-button--secondary:hover {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3) !important;
}

/* === TRANSITIONS === */
.form-appear-enter-active,
.form-appear-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.form-appear-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.form-appear-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

.footer-actions { 
  display:flex; 
  gap:0.75rem; 
  justify-content:flex-end; 
  padding:0.9rem 1.25rem; 
  background:#fff; 
  border-top:1px solid var(--gray-200); 
  flex-shrink:0; 
  box-shadow:0 -2px 6px -2px rgba(0,0,0,0.08); 
}

.cancel-button {
  min-width: 120px;
  font-weight: 600;
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  border-color: #4b5563 !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.25) !important;
}

.cancel-button:hover {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3) !important;
}

/* Responsive */
@media (max-width: 768px) {
  .dispo-modal-redesigned { 
    width:100vw; 
    max-width:100%; 
    border-radius:0; 
    height:100dvh; 
    max-height:100dvh; 
    height:100svh;
    max-height:100svh; 
    display:flex; 
    flex-direction:column; 
    border:0; 
    box-shadow:none; 
    position:relative;
  }
  
  .header-section { 
    position:sticky; 
    top:0; 
    z-index:10; 
  }
  
  .modal-body { 
    flex:1; 
    padding:0.85rem 0.85rem 0.5rem; 
    overflow-y:auto; 
    -webkit-overflow-scrolling:touch; 
    overscroll-behavior:contain; 
    touch-action:pan-y; 
    min-height:0; 
    padding-bottom: calc(var(--footer-height) + env(safe-area-inset-bottom) + 1rem);
  }
  
  .footer-actions { 
    position:fixed; 
    left:0; 
    right:0; 
    bottom:0; 
    padding:0.75rem env(safe-area-inset-right) calc(0.75rem + env(safe-area-inset-bottom)) env(safe-area-inset-left); 
    background:#fff; 
    z-index:1000; 
    backdrop-filter: blur(8px); 
    -webkit-backdrop-filter: blur(8px); 
    border-top:1px solid rgba(0,0,0,0.12);
    box-shadow:0 -2px 10px -2px rgba(0,0,0,0.25);
    border-radius:0; 
  }
  
  .collaborateur-avatar { 
    width:36px; 
    height:36px; 
    font-size:1rem; 
  }
  
  .cancel-button { 
    flex:1; 
    min-width:auto; 
  }
}
</style>
