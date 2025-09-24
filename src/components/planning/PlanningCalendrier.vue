<template>
  <div class="planning-calendrier">
    <!-- Header avec navigation mensuelle -->
    <div class="planning-header">
      <div class="month-navigation">
        <va-button @click="previousMonth" icon="chevron_left" preset="secondary" size="small" />
        <h3>{{ formatMonth(currentDate) }}</h3>
        <va-button @click="nextMonth" icon="chevron_right" preset="secondary" size="small" />
      </div>
      <va-button @click="addDisponibilite" icon="add" preset="primary" size="small">
        Ajouter une disponibilité
      </va-button>
    </div>

    <!-- Calendrier -->
    <div class="calendar-grid">
      <div class="calendar-header">
        <div class="day-header" v-for="jour in joursHeader" :key="jour">{{ jour }}</div>
      </div>
      <div class="calendar-body">
        <div
          v-for="date in getDatesOfMonth(currentDate)"
          :key="date.toISOString()"
          class="calendar-day"
          :class="{
            'other-month': !isSameMonth(date, currentDate),
            'today': isToday(date),
            'has-availability': hasAvailabilityOnDate(date)
          }"
        >
          <div class="day-number">{{ date.getDate() }}</div>
          <div class="day-availabilities">
            <div
              v-for="dispo in getDisponibilitesForDate(date)"
              :key="dispo.id"
              class="availability-item"
              @click="editDisponibilite(dispo)"
            >
              <div class="availability-time">{{ dispo.heure_debut }} - {{ dispo.heure_fin }}</div>
              <div class="availability-location">{{ dispo.lieu }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'ajout/édition -->
    <va-modal 
      v-model="showAddModal" 
      title="Disponibilité" 
      max-width="500px"
      @before-open="modalA11y.onBeforeOpen"
      @open="modalA11y.onOpen"
      @close="modalA11y.onClose"
    >
      <div class="dispo-form">
        <va-input v-model="formData.date" type="date" label="Date" class="mb-3" />
        <va-select v-model="formData.type" :options="typeOptions" label="Type" class="mb-3" />
        <va-input v-model="formData.lieu" label="Lieu" class="mb-3" />
        <div class="time-inputs">
          <va-input v-model="formData.heureDebut" type="time" label="Heure début" class="mb-3 mr-2" />
          <va-input v-model="formData.heureFin" type="time" label="Heure fin" class="mb-3" />
        </div>
      </div>
      <template #footer>
        <va-button @click="showAddModal = false" preset="secondary">Annuler</va-button>
        <va-button @click="saveDisponibilite" preset="primary">{{ editingDisponibilite ? 'Modifier' : 'Ajouter' }}</va-button>
      </template>
    </va-modal>
  </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useModalA11y } from '@/composables/useModalA11y'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'
import { AuthService } from '@/services/auth'
import { CollaborateursServiceV2 } from '@/services/collaborateursV2'
import { disponibilitesRTDBService } from '@/services/disponibilitesRTDBService'
import type { DisponibiliteRTDB } from '@/services/disponibilitesRTDBService'

// État principal
const currentUser = ref<any>(null)
const currentCollaborateur = ref<any>(null)
const disponibilites = ref<DisponibiliteRTDB[]>([])
const currentDate = ref(new Date())
const showAddModal = ref(false)
const editingDisponibilite = ref<DisponibiliteRTDB | null>(null)
const currentListener = ref<string | null>(null)
const activeTenant = ref<string>('')
const currentUrl = ref('')
const modalA11y = useModalA11y()

if (typeof window !== 'undefined') {
  currentUrl.value = window.location.href
}

// UI
const typeOptions = [
  { value: 'disponible', text: 'Disponible' },
  { value: 'occupe', text: 'Occupé' },
  { value: 'conge', text: 'Congé' }
]
const joursHeader = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const formatMonth = (date: Date) => date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

// Dates helpers
const getDatesOfMonth = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  const dayOfWeek = firstDay.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDate.setDate(firstDay.getDate() - daysFromMonday)
  const dates: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    dates.push(d)
  }
  return dates
}
const isSameMonth = (date: Date, refDate: Date) => date.getMonth() === refDate.getMonth() && date.getFullYear() === refDate.getFullYear()
const isToday = (date: Date) => date.toDateString() === new Date().toDateString()
const hasAvailabilityOnDate = (date: Date) => disponibilites.value.some(d => d.date === date.toISOString().split('T')[0])
const getDisponibilitesForDate = (date: Date) => disponibilites.value.filter(d => d.date === date.toISOString().split('T')[0])

// Navigation
const previousMonth = () => { currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1); loadDisponibilites() }
const nextMonth = () => { currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1); loadDisponibilites() }

// Formulaire
const formData = ref({ date: '', type: 'disponible', lieu: '', heureDebut: '09:00', heureFin: '17:00' })
const addDisponibilite = () => { const today = new Date().toISOString().split('T')[0]; formData.value = { date: today, type: 'disponible', lieu: '', heureDebut: '09:00', heureFin: '17:00' }; editingDisponibilite.value = null; showAddModal.value = true }
const editDisponibilite = (dispo: DisponibiliteRTDB) => { formData.value = { date: dispo.date, type: dispo.type || 'disponible', lieu: dispo.lieu, heureDebut: dispo.heure_debut, heureFin: dispo.heure_fin }; editingDisponibilite.value = dispo; showAddModal.value = true }
const saveDisponibilite = async () => {
  if (!currentCollaborateur.value) return
  const d: any = {
    collaborateurId: currentCollaborateur.value.id,
    tenantId: currentCollaborateur.value.tenantId,
    nom: currentCollaborateur.value.nom,
    prenom: currentCollaborateur.value.prenom,
    email: currentCollaborateur.value.email,
    metier: currentCollaborateur.value.metier || '',
    phone: currentCollaborateur.value.phone || '',
    ville: currentCollaborateur.value.ville || '',
    note: '',
    date: formData.value.date,
    lieu: formData.value.lieu,
    heure_debut: formData.value.heureDebut,
    heure_fin: formData.value.heureFin,
    updatedBy: currentUser.value?.email || 'collaborateur'
  }
  try {
    if (editingDisponibilite.value) await disponibilitesRTDBService.updateDisponibilite(editingDisponibilite.value.id, d)
    else await disponibilitesRTDBService.createDisponibilite(d)
    showAddModal.value = false
  } catch (e) { console.error('Erreur sauvegarde dispo:', e) }
}

// Chargement RTDB
const loadDisponibilites = async () => {
  if (!currentCollaborateur.value) { return }
  if (currentListener.value) { disponibilitesRTDBService.stopListener(currentListener.value); currentListener.value = null }

  const firstDay = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
  const lastDay = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0)
  const startDate = new Date(firstDay); const dayOfWeek = firstDay.getDay(); const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; startDate.setDate(firstDay.getDate() - daysFromMonday)
  const endDate = new Date(lastDay); const lastDayOfWeek = lastDay.getDay(); const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek; endDate.setDate(lastDay.getDate() + daysToSunday)
  const start = startDate.toISOString().split('T')[0]; const end = endDate.toISOString().split('T')[0]

  
  

  currentListener.value = await disponibilitesRTDBService.listenToDisponibilitesByDateRange(start, end, (dispos) => {
    
    
    // Filtrer par collaborateur (email → id → nom+prénom)
    const collab = currentCollaborateur.value
    const mesDispos = dispos.filter((dispo: any) => {
      if (!collab) return false
      if (dispo.email && collab.email && dispo.email === collab.email) return true
      if (dispo.collaborateurId && collab.id && dispo.collaborateurId === collab.id) return true
      if (dispo.nom && dispo.prenom && collab.nom && collab.prenom) {
        return `${dispo.nom} ${dispo.prenom}`.toLowerCase().trim() === `${collab.nom} ${collab.prenom}`.toLowerCase().trim()
      }
      return false
    })
    
    disponibilites.value = mesDispos
  })
}

// Réactivité
watch(currentCollaborateur, (c) => { if (c) loadDisponibilites() }, { immediate: true })

// Montage
onMounted(() => {
  activeTenant.value = AuthService.currentTenantId
  try {
    disponibilitesRTDBService.setTenantId(AuthService.currentTenantId)
    
  } catch (e) { console.warn('⚠️ setTenantId RTDB:', e) }

  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user
    
    if (user?.email) {
      try {
        // Charger tous les collaborateurs et filtrer par email
        const allCollaborateurs = await CollaborateursServiceV2.loadCollaborateurs(AuthService.currentTenantId)
        const collab = allCollaborateurs.find((c: any) => c.email === user.email)
  if (collab) { currentCollaborateur.value = collab }
  else { /* no collaborator for user */ }
      } catch (e) { console.error('❌ Erreur loadCollaborateur:', e) }
    }
  })
})

onUnmounted(() => { if (currentListener.value) disponibilitesRTDBService.stopListener(currentListener.value) })
</script>

<style scoped>
.planning-calendrier { padding: 20px; max-width: 1200px; margin: 0 auto; }
.planning-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.month-navigation { display: flex; align-items: center; gap: 15px; }
.month-navigation h3 { margin: 0; font-size: 1.5rem; text-transform: capitalize; }
.calendar-grid { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
.calendar-header { display: grid; grid-template-columns: repeat(7, 1fr); background-color: #f5f5f5; }
.day-header { padding: 12px; text-align: center; font-weight: 600; border-right: 1px solid #e0e0e0; }
.day-header:last-child { border-right: none; }
.calendar-body { display: grid; grid-template-columns: repeat(7, 1fr); }
.calendar-day { min-height: 100px; border-right: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; padding: 8px; background: white; position: relative; }
.calendar-day:nth-child(7n) { border-right: none; }
.calendar-day.other-month { background-color: #fafafa; color: #999; }
.calendar-day.today { background-color: #e3f2fd; }
.calendar-day.has-availability { border-left: 4px solid #2196f3; }
.day-number { font-weight: 600; margin-bottom: 4px; }
.day-availabilities { display: flex; flex-direction: column; gap: 2px; }
.availability-item { background: #2196f3; color: white; padding: 4px 6px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; transition: background-color 0.2s; }
.availability-item:hover { background: #1976d2; }
.availability-time { font-weight: 600; }
.availability-location { font-size: 0.7rem; opacity: 0.9; }
.dispo-form { display: flex; flex-direction: column; gap: 12px; }
.time-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 768px) {
  .planning-calendrier { padding: 10px; }
  .calendar-day { min-height: 80px; padding: 4px; }
  .planning-header { flex-direction: column; gap: 15px; }
  .time-inputs { grid-template-columns: 1fr; }
}
</style>