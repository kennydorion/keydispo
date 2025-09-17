<template>
  <va-card>
    <va-card-title>
      <va-icon name="schedule" color="primary" class="mr-2" />
      Mes Disponibilités
    </va-card-title>
    
    <va-card-content>
      <div v-if="loading" class="text-center py-4">
        <va-progress-circle indeterminate color="primary" />
        <p class="mt-2">Chargement des disponibilités...</p>
      </div>

      <div v-else>
        <!-- Filtres -->
        <div class="row mb-4">
          <div class="flex md4">
            <va-date-input
              v-model="filtreDateDebut"
              label="Date de début"
              placeholder="Sélectionner une date"
              @update:model-value="chargerDisponibilites"
            />
          </div>
          <div class="flex md4">
            <va-date-input
              v-model="filtreDateFin"
              label="Date de fin"
              placeholder="Sélectionner une date"
              @update:model-value="chargerDisponibilites"
            />
          </div>
          <div class="flex md4">
            <va-select
              v-model="filtreLieu"
              :options="lieuxDisponibles"
              label="Lieu"
              placeholder="Tous les lieux"
              clearable
              @update:model-value="chargerDisponibilites"
            />
          </div>
        </div>

        <!-- Bouton d'ajout -->
        <div class="mb-4">
          <va-button @click="ouvrirModalCreation" color="primary" icon="add">
            Ajouter une disponibilité
          </va-button>
        </div>

        <!-- Liste des disponibilités -->
        <div v-if="disponibilites.length === 0" class="text-center py-4">
          <va-icon name="event_busy" size="48px" color="secondary" />
          <p class="mt-2 text-secondary">Aucune disponibilité trouvée</p>
        </div>

        <div v-else>
          <va-data-table
            :items="disponibilites"
            :columns="colonnes"
            :per-page="10"
            hoverable
            striped
          >
            <template #cell(date)="{ rowData }">
              {{ formatDate(rowData.date) }}
            </template>
            
            <template #cell(heures)="{ rowData }">
              {{ rowData.heure_debut }} - {{ rowData.heure_fin }}
            </template>
            
            <template #cell(actions)="{ rowData }">
              <va-button-group>
                <va-button
                  @click="modifierDisponibilite(rowData)"
                  size="small"
                  preset="primary"
                  icon="edit"
                />
                <va-button
                  @click="supprimerDisponibilite(rowData)"
                  size="small"
                  preset="danger"
                  icon="delete"
                />
              </va-button-group>
            </template>
          </va-data-table>
        </div>
      </div>
    </va-card-content>

    <!-- Modal de création/modification -->
    <va-modal
      v-model="showModal"
      :title="editMode ? 'Modifier la disponibilité' : 'Nouvelle disponibilité'"
      size="medium"
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="modalA11y.onClose"
      @ok="sauvegarderDisponibilite"
      @cancel="fermerModal"
    >
      <form @submit.prevent="sauvegarderDisponibilite">
        <div class="row">
          <div class="flex md6">
            <va-date-input
              v-model="form.date"
              label="Date"
              :rules="[required]"
              required
            />
          </div>
          <div class="flex md6">
            <va-input
              v-model="form.lieu"
              label="Lieu"
              :rules="[required]"
              required
            />
          </div>
        </div>
        
        <div class="row">
          <div class="flex md6">
            <va-input
              v-model="form.heure_debut"
              label="Heure de début (HH:MM)"
              placeholder="09:00"
              :rules="[required]"
              required
            />
          </div>
          <div class="flex md6">
            <va-input
              v-model="form.heure_fin"
              label="Heure de fin (HH:MM)"
              placeholder="17:00"
              :rules="[required, validateHeuresFin]"
              required
            />
          </div>
        </div>
      </form>
    </va-modal>

    <!-- Modal de confirmation suppression -->
    <va-modal
      v-model="showDeleteModal"
      title="Confirmer la suppression"
      message="Êtes-vous sûr de vouloir supprimer cette disponibilité ?"
  @before-open="modalA11y.onBeforeOpen"
  @open="modalA11y.onOpen"
  @close="modalA11y.onClose"
      @ok="confirmerSuppression"
      @cancel="showDeleteModal = false"
    />
  </va-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vuestic-ui'
import { CollaborateurSelfService } from '@/services/collaborateurSelf'
import type { CollaborateurDisponibilite } from '@/services/collaborateurSelf'
import { useModalA11y } from '@/composables/useModalA11y'

// Composables
const { init: initToast } = useToast()

// État
const loading = ref(false)
const disponibilites = ref<CollaborateurDisponibilite[]>([])
const showModal = ref(false)
const showDeleteModal = ref(false)
const editMode = ref(false)
const dispoASupprimer = ref<CollaborateurDisponibilite | null>(null)
const modalA11y = useModalA11y()

// Filtres
const filtreDateDebut = ref<Date | null>(null)
const filtreDateFin = ref<Date | null>(null)
const filtreLieu = ref<string>('')

// Formulaire
const form = ref({
  date: null as Date | null,
  lieu: '',
  heure_debut: '',
  heure_fin: ''
})

const dispoEnEdition = ref<CollaborateurDisponibilite | null>(null)

// Colonnes du tableau
const colonnes = [
  { key: 'date', name: 'Date' },
  { key: 'lieu', name: 'Lieu' },
  { key: 'heures', name: 'Heures' },
  { key: 'actions', name: 'Actions', width: 120 }
]

// Lieux disponibles (calculé à partir des disponibilités)
const lieuxDisponibles = computed(() => {
  const lieux = [...new Set(disponibilites.value.map((d: CollaborateurDisponibilite) => d.lieu))]
  return lieux.map(lieu => ({ text: lieu, value: lieu })).sort((a, b) => a.text.localeCompare(b.text))
})

// Validation
const required = (value: any) => !!value || 'Ce champ est requis'

const validateHeuresFin = (value: string) => {
  if (!value || !form.value.heure_debut) return true
  // Permettre les horaires de nuit (ex: 22:00 -> 06:00)
  // Plus de validation stricte pour permettre les overnight
  return true
}

// Méthodes
const chargerDisponibilites = async () => {
  try {
    loading.value = true
    
    // Par défaut, charger les 3 prochains mois si pas de filtres
    const dateDebut = filtreDateDebut.value?.toISOString().split('T')[0] || 
                      new Date().toISOString().split('T')[0]
    
    const dateFin = filtreDateFin.value?.toISOString().split('T')[0] || (() => {
      const future = new Date()
      future.setMonth(future.getMonth() + 3)
      return future.toISOString().split('T')[0]
    })()
    
    let allDispos = await CollaborateurSelfService.getMesDisponibilites(dateDebut, dateFin)
    
    // Filtrer par lieu si spécifié
    if (filtreLieu.value) {
      allDispos = allDispos.filter(d => d.lieu === filtreLieu.value)
    }
    
    disponibilites.value = allDispos
  } catch (error) {
    console.error('Erreur lors du chargement des disponibilités:', error)
    initToast({
      message: 'Erreur lors du chargement des disponibilités',
      color: 'danger'
    })
  } finally {
    loading.value = false
  }
}

const ouvrirModalCreation = () => {
  editMode.value = false
  dispoEnEdition.value = null
  resetForm()
  showModal.value = true
}

const modifierDisponibilite = (dispo: CollaborateurDisponibilite) => {
  editMode.value = true
  dispoEnEdition.value = dispo
  
  form.value = {
    date: new Date(dispo.date),
    lieu: dispo.lieu,
    heure_debut: dispo.heure_debut,
    heure_fin: dispo.heure_fin
  }
  
  showModal.value = true
}

const supprimerDisponibilite = (dispo: CollaborateurDisponibilite) => {
  dispoASupprimer.value = dispo
  showDeleteModal.value = true
}

const sauvegarderDisponibilite = async () => {
  if (!form.value.date || !form.value.lieu || !form.value.heure_debut || !form.value.heure_fin) {
    initToast({
      message: 'Veuillez remplir tous les champs',
      color: 'warning'
    })
    return
  }

  try {
    const dispoData = {
      date: form.value.date.toISOString().split('T')[0],
      lieu: form.value.lieu,
      heure_debut: form.value.heure_debut,
      heure_fin: form.value.heure_fin
    }

    if (editMode.value && dispoEnEdition.value) {
      await CollaborateurSelfService.updateMaDisponibilite(dispoEnEdition.value.id!, {
        ...dispoData,
        version: dispoEnEdition.value.version || 1
      })
      initToast({
        message: 'Disponibilité modifiée avec succès',
        color: 'success'
      })
    } else {
      await CollaborateurSelfService.createMaDisponibilite(dispoData)
      initToast({
        message: 'Disponibilité créée avec succès',
        color: 'success'
      })
    }

    showModal.value = false
    await chargerDisponibilites()
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    initToast({
      message: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde',
      color: 'danger'
    })
  }
}

const confirmerSuppression = async () => {
  if (!dispoASupprimer.value) return

  try {
    await CollaborateurSelfService.deleteMaDisponibilite(dispoASupprimer.value.id!)
    
    initToast({
      message: 'Disponibilité supprimée avec succès',
      color: 'success'
    })

    showDeleteModal.value = false
    dispoASupprimer.value = null
    await chargerDisponibilites()
    
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    initToast({
      message: error instanceof Error ? error.message : 'Erreur lors de la suppression',
      color: 'danger'
    })
  }
}

const fermerModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.value = {
    date: null,
    lieu: '',
    heure_debut: '',
    heure_fin: ''
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Chargement initial
onMounted(() => {
  chargerDisponibilites()
})
</script>

<style scoped>
.va-data-table {
  --va-data-table-thead-color: var(--va-primary);
}
</style>