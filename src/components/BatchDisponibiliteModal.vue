<template>
  <va-modal
    v-model="isVisible"
    :hide-default-actions="true"
    :fullscreen="false"
    max-width="600px"
    no-padding
    @close="handleClose"
  >
    <!-- En-tête détaillé -->
    <div class="batch-header-detailed">
      <div class="collaborateur-section">
        <div class="collaborateur-avatar-large">
          {{ props.selectedCollaborateur?.prenom?.charAt(0) || '' }}{{ props.selectedCollaborateur?.nom?.charAt(0) || '' }}
        </div>
        <div class="collaborateur-info-detailed">
          <h3 class="collaborateur-name-large">{{ collaborateurName }}</h3>
          <p class="collaborateur-meta-large">{{ props.selectedCollaborateur?.metier || 'Collaborateur' }}</p>
        </div>
      </div>
      
      <div class="dates-summary">
        <div class="dates-count">
          <va-icon name="calendar_month" size="18px" />
          <span>{{ props.selectedDates.length }} date(s) sélectionnée(s)</span>
        </div>
        
        <div class="dates-list">
          <va-chip
            v-for="date in props.selectedDates"
            :key="date"
            color="primary"
            size="small"
            class="date-chip"
          >
            {{ formatDateShort(date) }}
          </va-chip>
        </div>
      </div>
    </div>

    <!-- Formulaire vertical -->
    <div class="batch-form-mobile">
      <!-- Section 1: Type de disponibilité -->
      <div class="form-section-primary">
        <h3 class="section-title-primary">
          <span style="background: var(--va-primary); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">1</span>
          Type de disponibilité
        </h3>
        
        <div class="type-buttons-stack">
          <va-button
            v-for="type in typeOptions"
            :key="type.value"
            :color="formData.type === type.value ? getTypeColor() : 'light'"
            :icon="type.icon"
            class="type-btn-full"
            @click="formData.type = type.value"
          >
            {{ type.label }}
          </va-button>
        </div>
      </div>

            <!-- Section 2: Horaires (si pas indisponible) -->
      <div v-if="formData.type !== 'indisponible'" class="form-section-primary">
        <h3 class="section-title-primary">
          <span style="background: var(--va-primary); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">2</span>
          Horaires
        </h3>
        
        <div class="type-buttons-stack">
          <va-button
            v-for="kind in timeKindOptions"
            :key="kind.value"
            :color="formData.timeKind === kind.value ? 'success' : 'light'"
            :icon="kind.icon"
            class="type-btn-full"
            @click="setTimeKind(kind.value)"
          >
            {{ kind.label }}
          </va-button>
        </div>
      </div>

      <!-- Section Détails horaires (si créneaux standards ou personnalisés) -->
      <Transition name="section" mode="out-in">
        <div v-if="formData.type !== 'indisponible' && formData.timeKind && formData.timeKind !== 'full_day'" key="time-details" class="form-section-details">
          <div class="time-details-container">
            <!-- Créneaux prédéfinis -->
            <div v-if="formData.timeKind === 'predefined'" class="quick-slots-full">
              <div class="slots-grid-full">
                <div
                  v-for="slot in quickTimeSlots"
                  :key="slot.value"
                  :class="['slot-option-full', { active: formData.heureDebut === slot.debut && formData.heureFin === slot.fin }]"
                  @click="selectTimeSlot(slot.debut, slot.fin)"
                >
                  <div :style="{ 
                    fontWeight: '600', 
                    marginBottom: '4px', 
                    fontSize: '13px',
                    color: formData.heureDebut === slot.debut && formData.heureFin === slot.fin ? 'white' : 'var(--va-primary)'
                  }">{{ slot.label }}</div>
                  <div :style="{ 
                    fontSize: '12px', 
                    color: formData.heureDebut === slot.debut && formData.heureFin === slot.fin ? 'rgba(255,255,255,0.9)' : 'var(--va-primary)'
                  }">{{ slot.debut }}-{{ slot.fin }}</div>
                </div>
              </div>
            </div>

            <!-- Heures personnalisées -->
            <div v-if="formData.timeKind === 'custom'" class="custom-hours-full">
              <div class="hours-inputs-full">
                <!-- Heure de début -->
                <div class="custom-time-input-batch">
                  <label class="time-label-batch">Heure de début</label>
                  <div class="time-selects-batch">
                    <va-select
                      v-model="heureDebutHour"
                      :options="hourOptions"
                      placeholder="HH"
                      size="small"
                      class="hour-select-batch"
                      @update:model-value="updateHeureDebut"
                    />
                    <span class="time-separator-batch">:</span>
                    <va-select
                      v-model="heureDebutMinute"
                      :options="quarterOptions"
                      placeholder="MM"
                      size="small"
                      class="minute-select-batch"
                      @update:model-value="updateHeureDebut"
                    />
                  </div>
                </div>
                
                <!-- Heure de fin -->
                <div class="custom-time-input-batch">
                  <label class="time-label-batch">Heure de fin</label>
                  <div class="time-selects-batch">
                    <va-select
                      v-model="heureFinHour"
                      :options="hourOptions"
                      placeholder="HH"
                      size="small"
                      class="hour-select-batch"
                      :disabled="!formData.heureDebut"
                      @update:model-value="updateHeureFin"
                    />
                    <span class="time-separator-batch">:</span>
                    <va-select
                      v-model="heureFinMinute"
                      :options="quarterOptions"
                      placeholder="MM"
                      size="small"
                      class="minute-select-batch"
                      :disabled="!formData.heureDebut"
                      @update:model-value="updateHeureFin"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Alerte débordement overnight -->
              <div v-if="isOvernightSchedule" class="overnight-alert">
                <va-icon name="schedule" size="16px" />
                <div class="overnight-text">
                  <strong>Horaire de nuit détecté</strong>
                  <p>Cette plage horaire s'étend sur le lendemain. Des disponibilités seront automatiquement créées sur les jours suivants.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Section 3: Lieu de mission (seulement pour Mission) -->
      <div v-if="formData.type === 'ponctuel'" class="form-section-primary">
        <h3 class="section-title-primary">
          <span style="background: var(--va-primary); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">3</span>
          Lieu de mission
        </h3>
        
        <div class="lieu-autocomplete-wrapper" ref="lieuInputWrapperRef">
          <va-input
            v-model="formData.lieu"
            label="Lieu de mission"
            placeholder="Saisir ou rechercher un lieu"
            clearable
            class="lieu-input-full"
            @focus="openLieuDropdown()"
            @input="onLieuInput()"
            @keydown.down.prevent="moveHighlight(1)"
            @keydown.up.prevent="moveHighlight(-1)"
            @keydown.enter.prevent="confirmHighlight()"
            @keydown.esc.stop.prevent="closeLieuDropdown()"
            @blur="onLieuBlur"
          >
            <template #prepend>
              <va-icon name="place" size="16px" />
            </template>
            <template #appendInner>
              <va-icon 
                :name="showLieuDropdown ? 'expand_less' : 'expand_more'" 
                size="16px" 
                style="cursor:pointer" 
                @mousedown.prevent="toggleLieuDropdown()" />
            </template>
          </va-input>
          <div class="suggestions-inline-chips" v-if="!formData.lieu && lieuxExistants.length">
            <va-chip
              v-for="lieu in lieuxExistants.slice(0,5)"
              :key="lieu"
              size="small"
              outline
              color="primary"
              clickable
              @mousedown.prevent="selectLieu(lieu)"
            >{{ lieu }}</va-chip>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <va-button
          color="secondary"
          @click="handleClose"
        >
          Annuler
        </va-button>
        
        <va-button
          color="primary"
          :loading="saving"
          :disabled="!isFormValid"
          @click="handleSave"
        >
          Créer {{ props.selectedDates.length }} disponibilité(s)
        </va-button>
      </div>
    </div>
  </va-modal>

  <!-- Dropdown téléporté -->
  <teleport to="body">
    <div 
      v-if="showLieuDropdown && filteredLieuSuggestions.length" 
      class="lieu-autocomplete-dropdown" 
      :style="lieuDropdownStyle"
    >
      <div 
        v-for="(lieu, idx) in filteredLieuSuggestions" 
        :key="lieu" 
        :id="`lieu-suggestion-${idx}`"
        class="lieu-suggestion-item" 
        :class="{ highlighted: idx === highlightedLieu }"
        @mousedown.prevent="selectLieu(lieu)"
      >
        {{ lieu }}
        <span class="tag-nouveau" v-if="idx===0 && !lieuxExistants.includes(formData.lieu.trim()) && formData.lieu.trim() && norm(formData.lieu.trim())===norm(lieu)">nouveau</span>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { AuthService } from '@/services/auth'
import { useToast } from 'vuestic-ui'

// Interface plus permissive pour le collaborateur
interface CollaborateurBatch {
  id: string
  nom: string
  prenom: string
  email?: string
  phone?: string
  metier?: string
  ville?: string
  notes?: string
  color?: string
  tenantId: string
  createdAt?: any
  updatedAt?: any
}

// Props
interface Props {
  selectedCells?: string[]
  selectedCollaborateur: CollaborateurBatch | null
  selectedDates: string[]
  lieuxOptions?: string[]
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  selectedCells: () => [],
  lieuxOptions: () => []
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'batch-created': [data: {
    collaborateur: CollaborateurBatch,
    dates: string[],
    dispoData: {
      type: string,
      timeKind: string,
      heureDebut: string,
      heureFin: string,
      lieu: string
    }
  }]
  close: []
  success: []
}>()

// State
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})
const saving = ref(false)
const lieuxExistants = ref<string[]>([])
const { init: notify } = useToast()
// Autocomplete lieu
const showLieuDropdown = ref(false)
const highlightedLieu = ref(-1)
const lieuDropdownStyle = ref<Record<string,string>>({})
const lieuInputWrapperRef = ref<HTMLElement | null>(null)

// Form data
const formData = ref({
  type: 'disponible' as 'disponible' | 'indisponible' | 'ponctuel',
  timeKind: 'full_day' as 'predefined' | 'custom' | 'full_day',
  heureDebut: '09:00',
  heureFin: '17:00',
  lieu: ''
})

// Options
const typeOptions = [
  { value: 'disponible' as const, label: 'Disponible', icon: 'check_circle' },
  { value: 'indisponible' as const, label: 'Indisponible', icon: 'cancel' },
  { value: 'ponctuel' as const, label: 'Mission', icon: 'work' }
]

const timeKindOptions = [
  { value: 'full_day' as const, label: 'Journée complète', icon: 'today' },
  { value: 'predefined' as const, label: 'Créneaux standards', icon: 'schedule' },
  { value: 'custom' as const, label: 'Horaires personnalisées', icon: 'edit' }
]

const quickTimeSlots = [
  { value: 'morning', label: 'Matin', debut: '08:00', fin: '12:00' },
  { value: 'lunch', label: 'Midi', debut: '12:00', fin: '14:00' },
  { value: 'afternoon', label: 'Après-midi', debut: '14:00', fin: '18:00' },
  { value: 'evening', label: 'Soirée', debut: '18:00', fin: '22:00' },
  { value: 'late_evening', label: 'Fin de soirée', debut: '22:00', fin: '02:00' },
  { value: 'night', label: 'Nuit', debut: '02:00', fin: '08:00' }
]

// Variables pour les selects d'heures/minutes
const heureDebutHour = ref('09')
const heureDebutMinute = ref('00')
const heureFinHour = ref('17')
const heureFinMinute = ref('00')

// Options pour les selects
const hourOptions = computed(() => {
  const options = []
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0')
    options.push({ text: hour, value: hour })
  }
  return options
})

const quarterOptions = [
  { text: '00', value: '00' },
  { text: '15', value: '15' },
  { text: '30', value: '30' },
  { text: '45', value: '45' }
]

// Méthodes pour synchroniser les selects avec formData
function updateHeureDebut() {
  if (heureDebutHour.value && heureDebutMinute.value) {
    formData.value.heureDebut = `${heureDebutHour.value}:${heureDebutMinute.value}`
  }
}

function updateHeureFin() {
  if (heureFinHour.value && heureFinMinute.value) {
    formData.value.heureFin = `${heureFinHour.value}:${heureFinMinute.value}`
  }
}

// Méthode pour initialiser les selects depuis formData
function initTimeSelects() {
  if (formData.value.heureDebut) {
    const [hour, minute] = formData.value.heureDebut.split(':')
    heureDebutHour.value = hour
    heureDebutMinute.value = minute
  }
  if (formData.value.heureFin) {
    const [hour, minute] = formData.value.heureFin.split(':')
    heureFinHour.value = hour
    heureFinMinute.value = minute
  }
}

// Computed
const collaborateurName = computed(() => {
  const collab = props.selectedCollaborateur
  if (!collab) return 'Collaborateur'
  return `${collab.prenom} ${collab.nom}`
})

// Normalisation simple pour recherche insensible aux accents / casse
function norm(str: string) {
  return (str || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

const filteredLieuSuggestions = computed(() => {
  const value = formData.value.lieu.trim()
  if (!value) return lieuxExistants.value.slice(0, 20)
  const n = norm(value)
  return lieuxExistants.value.filter(l => norm(l).includes(n)).slice(0, 20)
})

// ==== AUTOCOMPLETE LIEU ====
function openLieuDropdown() {
  showLieuDropdown.value = true
  highlightedLieu.value = -1
  nextTick(updateLieuDropdownPosition)
}

function closeLieuDropdown() {
  showLieuDropdown.value = false
  highlightedLieu.value = -1
}

function toggleLieuDropdown() {
  if (showLieuDropdown.value) {
    closeLieuDropdown()
  } else {
    openLieuDropdown()
  }
}

function onLieuInput() {
  if (!showLieuDropdown.value) openLieuDropdown()
  else nextTick(updateLieuDropdownPosition)
}

function moveHighlight(delta: number) {
  if (!showLieuDropdown.value) openLieuDropdown()
  const max = filteredLieuSuggestions.value.length
  if (!max) return
  highlightedLieu.value = (highlightedLieu.value + delta + max) % max
  scrollHighlightedIntoView()
}

function confirmHighlight() {
  if (highlightedLieu.value >= 0 && highlightedLieu.value < filteredLieuSuggestions.value.length) {
    selectLieu(filteredLieuSuggestions.value[highlightedLieu.value])
  } else if (formData.value.lieu.trim()) {
    const v = formData.value.lieu.trim()
    if (!lieuxExistants.value.includes(v)) {
      lieuxExistants.value.unshift(v)
    }
    closeLieuDropdown()
  }
}

function selectLieu(lieu: string) {
  formData.value.lieu = lieu
  if (!lieuxExistants.value.includes(lieu)) {
    lieuxExistants.value.unshift(lieu)
  }
  closeLieuDropdown()
}

function onLieuBlur() {
  setTimeout(() => {
    // si le focus n'est pas sur une suggestion on ferme
    const active = document.activeElement as HTMLElement | null
    if (!active || !active.classList.contains('lieu-suggestion-item')) {
      closeLieuDropdown()
    }
  }, 120)
}

function updateLieuDropdownPosition() {
  const el = lieuInputWrapperRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  lieuDropdownStyle.value = {
    top: `${rect.bottom + window.scrollY + 4}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`
  }
}

function handleWindowEvents() {
  if (showLieuDropdown.value) updateLieuDropdownPosition()
}

function scrollHighlightedIntoView() {
  const id = `lieu-suggestion-${highlightedLieu.value}`
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ block: 'nearest' })
}

const isFormValid = computed(() => {
  if (!formData.value.type) return false
  if (!formData.value.timeKind) return false
  
  if (formData.value.timeKind === 'custom') {

    if (!formData.value.heureDebut || !formData.value.heureFin) return false
  }
  
  if (formData.value.timeKind === 'predefined') {
    // Vérifier qu'un créneau standard est sélectionné
    const isStandardSlotSelected = quickTimeSlots.some(slot => 
      formData.value.heureDebut === slot.debut && formData.value.heureFin === slot.fin
    )
    if (!isStandardSlotSelected) return false
  }
  
  if (formData.value.type === 'ponctuel' && !formData.value.lieu) return false
  
  return true
})

// Détection des horaires overnight
const isOvernightSchedule = computed(() => {
  if (formData.value.timeKind !== 'custom') return false
  if (!formData.value.heureDebut || !formData.value.heureFin) return false
  
  const [hDebut] = formData.value.heureDebut.split(':').map(Number)
  const [hFin] = formData.value.heureFin.split(':').map(Number)
  return hFin < hDebut // Ex: 22:00 -> 06:00
})

// Methods
const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit' 
  })
}
  // ===== DROPDOWN TELEPORT =====
  // (aucune logique supplémentaire ici, seulement styles + position)


const getTypeColor = (): string => {
  // Tous les types sélectionnés sont en vert (success)
  return 'success'
}

const setTimeKind = (kind: 'predefined' | 'custom' | 'full_day') => {
  formData.value.timeKind = kind
  
  // Reset aux valeurs par défaut et désélection
  if (kind === 'full_day') {
    formData.value.heureDebut = '00:00'
    formData.value.heureFin = '23:59'
  } else if (kind === 'predefined') {
    // Reset pour forcer la sélection d'un créneau
    formData.value.heureDebut = ''
    formData.value.heureFin = ''
  } else if (kind === 'custom') {
    formData.value.heureDebut = '09:00'
    formData.value.heureFin = '17:00'
    initTimeSelects()
  }
}

const selectTimeSlot = (debut: string, fin: string) => {
  formData.value.heureDebut = debut
  formData.value.heureFin = fin
}

const getSelectedSlotValue = () => {
  // Trouve le slot correspondant aux heures sélectionnées
  const slot = quickTimeSlots.find(s => 
    s.debut === formData.value.heureDebut && s.fin === formData.value.heureFin
  )
  return slot?.value || 'custom'
}

const handleClose = () => {
  isVisible.value = false
  emit('close')
}

const handleSave = async () => {
  if (!isFormValid.value || !props.selectedCollaborateur) return
  
  saving.value = true
  
  try {
    const { writeBatch, doc, collection, serverTimestamp } = await import('firebase/firestore')
    
    console.log(`Création de ${props.selectedDates.length} disponibilité(s) pour ${collaborateurName.value}`)
    
    // Créer un batch pour toutes les disponibilités
    const batch = writeBatch(db)
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    // Fonction pour vérifier si les horaires débordent (overnight)
    const isOvernightRange = (debut: string, fin: string): boolean => {
      if (!debut || !fin) return false
      const [hDebut] = debut.split(':').map(Number)
      const [hFin] = fin.split(':').map(Number)
      return hFin < hDebut // Ex: 22:00 -> 06:00
    }
    
    // Fonction pour ajouter un jour à une date string YYYY-MM-DD
    const addOneDay = (dateStr: string): string => {
      const date = new Date(dateStr + 'T00:00:00')
      date.setDate(date.getDate() + 1)
      return date.toISOString().split('T')[0]
    }
    
    // Créer une disponibilité pour chaque date sélectionnée
    const allCreatedDates: string[] = []
    
    for (const date of props.selectedDates) {
      const dispoRef = doc(collection(db, 'dispos'))
      
      const baseDispoData = {
        id: dispoRef.id,
        tenantId,
        collaborateurId: props.selectedCollaborateur.id,
        nom: props.selectedCollaborateur.nom,
        prenom: props.selectedCollaborateur.prenom,
        metier: props.selectedCollaborateur.metier || '',
        phone: props.selectedCollaborateur.phone || '',
        email: props.selectedCollaborateur.email || '',
        ville: props.selectedCollaborateur.ville || '',
        date: date,
        lieu: formData.value.lieu || '',
        heure_debut: formData.value.heureDebut || '',
        heure_fin: formData.value.heureFin || '',
        type: formData.value.type,
        timeKind: formData.value.timeKind,
        isFullDay: formData.value.timeKind === 'full_day',
        slots: formData.value.timeKind === 'predefined' ? [getSelectedSlotValue()] : [],
        version: 1,
        updatedAt: serverTimestamp(),
        updatedBy: 'batch-modal'
      }
      
      console.log(`🔥 Création dispo Firebase pour ${date}:`, baseDispoData)
      batch.set(dispoRef, baseDispoData)
      allCreatedDates.push(date)
      
      // Si c'est une plage horaire qui déborde sur le lendemain (overnight)
      if (formData.value.timeKind === 'custom' && 
          isOvernightRange(formData.value.heureDebut, formData.value.heureFin)) {
        
        const nextDay = addOneDay(date)
        
        // Vérifier si le jour suivant n'est pas déjà dans la sélection
        // pour éviter les doublons
        if (!props.selectedDates.includes(nextDay)) {
          const nextDayRef = doc(collection(db, 'dispos'))
          const nextDayData = {
            ...baseDispoData,
            id: nextDayRef.id,
            date: nextDay,
            // Garder les mêmes horaires - la logique d'affichage gère l'overnight
          }
          
          console.log(`🌙 Création dispo overnight pour ${nextDay}:`, nextDayData)
          batch.set(nextDayRef, nextDayData)
          allCreatedDates.push(nextDay)
        }
      }
    }
    
    // Exécuter le batch
    await batch.commit()
    
    console.log(`✅ ${allCreatedDates.length} disponibilité(s) créée(s) avec succès (dont ${allCreatedDates.length - props.selectedDates.length} overnight)`)
    
    // Émettre l'événement avec toutes les dates créées
    emit('batch-created', {
      collaborateur: props.selectedCollaborateur,
      dates: allCreatedDates, // Inclut les dates overnight ajoutées
      dispoData: {
        type: formData.value.type,
        timeKind: formData.value.timeKind,
        heureDebut: formData.value.heureDebut,
        heureFin: formData.value.heureFin,
        lieu: formData.value.lieu
      }
    })
    emit('success')
    handleClose()
  } catch (error) {
    console.error('Erreur lors de la création des disponibilités:', error)
    notify({
      message: 'Erreur lors de la création des disponibilités',
      color: 'danger'
    })
  } finally {
    saving.value = false
  }
}

// Fonction pour récupérer les lieux existants
async function fetchLieuxExistants() {
  try {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const q = query(
      collection(db, 'dispos'),
      where('tenantId', '==', tenantId)
    )
    
    const querySnapshot = await getDocs(q)
    const lieuxSet = new Set<string>()
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.lieu && typeof data.lieu === 'string' && data.lieu.trim()) {
        lieuxSet.add(data.lieu.trim())
      }
    })
    
    // Ajouter quelques lieux par défaut
    const lieuxParDefaut = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Nantes', 'Toulouse', 'Bordeaux']
    lieuxParDefaut.forEach(lieu => lieuxSet.add(lieu))
    
    lieuxExistants.value = Array.from(lieuxSet).sort()
  } catch (error) {
    console.error('Erreur lors de la récupération des lieux:', error)
    // Utiliser des lieux par défaut en cas d'erreur
    lieuxExistants.value = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Nantes', 'Toulouse', 'Bordeaux']
  }
}

// Lifecycle
onMounted(() => {
  fetchLieuxExistants()
  window.addEventListener('scroll', handleWindowEvents, true)
  window.addEventListener('resize', handleWindowEvents)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowEvents, true)
  window.removeEventListener('resize', handleWindowEvents)
})

// Watchers
watch(() => props.selectedCollaborateur, (newCollab) => {
  if (newCollab) {
    formData.value.lieu = newCollab.ville || ''
  }
}, { immediate: true })
</script>

<style scoped>
/* Design mobile-first vertical */
.batch-form-mobile {
  padding: 12px;
  max-height: none;
  transition: all 0.3s ease;
}

/* En-tête détaillé */
.batch-header-detailed {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.collaborateur-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.collaborateur-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--va-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
}

.collaborateur-info-detailed {
  flex: 1;
}

.collaborateur-name-large {
  font-size: 18px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin: 0 0 4px 0;
}

.collaborateur-meta-large {
  font-size: 14px;
  color: var(--va-color-text-secondary);
  margin: 0;
}

.dates-summary {
  border-top: 1px solid var(--va-color-border);
  padding-top: 16px;
}

.dates-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  margin-bottom: 12px;
}

.dates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.date-chip {
  font-size: 12px !important;
}

/* Sections principales numérotées */
.form-section-primary {
  background: var(--va-color-background-element);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--va-color-border);
  transition: all 0.3s ease;
}

.section-title-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--va-color-text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--va-primary);
}

/* Boutons de type pleine largeur */
.type-buttons-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-btn-full {
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
  width: 100%;
  border-radius: 4px;
  background: transparent;
  color: var(--va-primary);
  border: 1px solid var(--va-primary);
}

.type-btn-full[color="success"] {
  background: var(--va-success);
  color: white;
  border-color: var(--va-success);
}

.type-btn-full[color="danger"] {
  background: var(--va-danger);
  color: white;
  border-color: var(--va-danger);
}

.type-btn-full[color="primary"] {
  background: var(--va-primary);
  color: white;
  border-color: var(--va-primary);
}

/* Boutons horaires pleine largeur */
.time-kind-buttons-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-kind-btn-full {
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
  width: 100%;
  border-radius: 4px;
  background: transparent;
  color: var(--va-primary);
  border: 1px solid var(--va-primary);
}

.time-kind-btn-full[color="success"] {
  background: var(--va-success);
  color: white;
  border-color: var(--va-success);
}

.time-kind-btn-full[color="primary"] {
  background: var(--va-primary);
  color: white;
  border-color: var(--va-primary);
}

/* Section détails avec hauteur fixe */
.form-section-details {
  background: var(--va-color-background-element);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--va-color-border);
  min-height: 180px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.time-details-container {
  height: 160px;
  overflow: visible;
  background: var(--va-color-background-secondary);
  border-radius: 6px;
  padding: 12px;
  transition: all 0.3s ease;
}

/* Créneaux pleine largeur */
.quick-slots-full {
  width: 100%;
}

.slots-grid-full {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  height: 100%;
}

.slot-option-full {
  border: 1px solid var(--va-primary);
  border-radius: 4px;
  padding: 12px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: transparent;
  text-align: center;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 12px;
  color: var(--va-primary);
}

.slot-option-full:hover {
  border-color: var(--va-success);
  background: var(--va-color-success-lighten5);
  transform: translateY(-1px);
  color: var(--va-success);
}

.slot-option-full.active {
  border-color: var(--va-success);
  background: var(--va-success);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

/* Heures personnalisées */
.custom-hours-full {
  width: 100%;
}

.hours-inputs-full {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.custom-time-input-batch {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-label-batch {
  font-size: 14px;
  font-weight: 500;
  color: var(--va-dark);
}

.time-selects-batch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hour-select-batch,
.minute-select-batch {
  flex: 1;
}

/* Fix z-index pour les dropdowns des selects d'heures dans la modale */
.hour-select-batch :deep(.va-select__dropdown),
.minute-select-batch :deep(.va-select__dropdown) {
  z-index: 9999 !important;
}

/* Fix global pour tous les selects dans cette modale */
.batch-form-mobile :deep(.va-select__dropdown) {
  z-index: 9999 !important;
}

.time-separator-batch {
  font-weight: bold;
  font-size: 16px;
  color: var(--va-dark);
  margin: 0 2px;
}

.hour-input-full {
  font-size: 16px;
  min-height: 56px;
}

/* Alerte horaire overnight */
.overnight-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
}

.overnight-text {
  flex: 1;
}

.overnight-text strong {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

.overnight-text p {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}

/* Message journée complète */
.full-day-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 500;
  color: var(--va-color-text-primary);
  height: 100px;
  border: 2px dashed var(--va-primary);
  border-radius: 8px;
  background: var(--va-color-primary-lighten5);
}

/* Lieu pleine largeur */
.lieu-input-full {
  width: 100%;
  min-height: 56px;
}

/* Actions */
.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--va-color-border);
  margin-top: 8px;
}

.actions .va-button {
  min-width: 120px;
}

/* Transitions pour les sections dynamiques */
.section-enter-active, .section-leave-active {
  transition: all 0.3s ease;
  max-height: 300px;
  opacity: 1;
}

.section-enter-from, .section-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin: 0;
}

/* Transitions pour les changements de taille de modale */
.batch-form-mobile, 
.form-section-details,
.time-details-container,
.form-section-primary {
  transition: all 0.3s ease;
  overflow: hidden;
}

/* Styles pour le champ lieu */
.lieu-input-full {
  width: 100%;
}

.lieu-suggestions {
  margin-top: 12px;
}

.suggestions-label {
  font-size: 12px;
  color: var(--va-color-text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.suggestions-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.suggestions-chips .va-chip {
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestions-chips .va-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Autocomplete lieu */
.lieu-autocomplete-wrapper { position: relative; }

.lieu-autocomplete-dropdown {
  position: absolute; /* transformé en position via style inline (top/left/width) */
  z-index: 100000;
  background: var(--va-color-background-element);
  border: 1px solid var(--va-color-border);
  border-radius: 8px;
  max-height: 260px;
  overflow-y: auto;
  box-shadow: 0 8px 25px rgba(0,0,0,0.25);
  padding: 4px;
}

.lieu-suggestion-item {
  padding: 10px 12px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--va-color-text-primary);
}

.lieu-suggestion-item:hover, .lieu-suggestion-item.highlighted {
  background: var(--va-primary);
  color: #fff;
}

.tag-nouveau {
  background: var(--va-success);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: .5px;
  font-weight: 600;
  margin-left: auto;
}
</style>
