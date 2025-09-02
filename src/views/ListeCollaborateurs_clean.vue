<template>
  <div class="liste-collaborateurs">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <va-icon name="people" class="title-icon" />
            Collaborateurs
          </h1>
          <p class="page-subtitle">
            Gérez et consultez tous les collaborateurs de votre équipe
          </p>
        </div>
        <div class="header-actions">
          <va-button
            preset="outline"
            icon="edit"
            @click="router.push('/collaborateurs/nouveau')"
            :disabled="isLoading"
            class="mr-2"
          >
            Nouveau collaborateur
          </va-button>
          <va-button
            preset="primary"
            icon="add"
            @click="showAddModal = true"
            :disabled="isLoading"
          >
            Ajouter rapidement
          </va-button>
        </div>
      </div>
    </div>

    <!-- Statistiques -->
    <div class="stats-section">
      <div class="stats-grid">
        <va-card class="stat-card">
          <va-card-content>
            <div class="stat-content">
              <va-icon name="people" class="stat-icon" color="primary" />
              <div class="stat-text">
                <div class="stat-value">{{ filteredCollaborateurs.length }}</div>
                <div class="stat-label">Collaborateurs</div>
              </div>
            </div>
          </va-card-content>
        </va-card>
        
        <va-card class="stat-card">
          <va-card-content>
            <div class="stat-content">
              <va-icon name="work" class="stat-icon" color="success" />
              <div class="stat-text">
                <div class="stat-value">{{ uniqueMetiers.length }}</div>
                <div class="stat-label">Métiers</div>
              </div>
            </div>
          </va-card-content>
        </va-card>
        
        <va-card class="stat-card">
          <va-card-content>
            <div class="stat-content">
              <va-icon name="location_city" class="stat-icon" color="info" />
              <div class="stat-text">
                <div class="stat-value">{{ uniqueVilles.length }}</div>
                <div class="stat-label">Villes</div>
              </div>
            </div>
          </va-card-content>
        </va-card>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-section">
      <va-inner-loading loading>
        <div class="loading-content">
          <p>Chargement des collaborateurs...</p>
        </div>
      </va-inner-loading>
    </div>

    <!-- Filtres et recherche -->
    <div v-else class="filters-section">
      <va-card class="filters-card">
        <va-card-content>
          <div class="filters-container">
            <div class="search-section">
              <va-input
                v-model="searchQuery"
                placeholder="Rechercher un collaborateur..."
                icon="search"
                clearable
                class="search-input"
              />
            </div>
            
            <div class="filter-section">
              <va-select
                v-model="selectedMetier"
                :options="['', ...uniqueMetiers]"
                placeholder="Tous les métiers"
                label="Métier"
                clearable
                class="filter-select"
              />
              
              <va-select
                v-model="selectedVille"
                :options="['', ...uniqueVilles]"
                placeholder="Toutes les villes"
                label="Ville"
                clearable
                class="filter-select"
              />
            </div>
            
            <div class="list-actions">
              <va-button
                preset="outline"
                icon="refresh"
                @click="loadCollaborateurs"
                :loading="isRefreshing"
              >
                Actualiser
              </va-button>
            </div>
          </div>
        </va-card-content>
      </va-card>
    </div>

    <!-- Liste des collaborateurs -->
    <div v-if="!isLoading" class="collaborateurs-section">
      <va-card class="collaborateurs-card">
        <va-card-content>
          <div class="table-container">
            <va-data-table
              :items="paginatedCollaborateurs"
              :columns="columns"
              :loading="isRefreshing"
              striped
              hoverable
              :per-page="perPage"
              :current-page="currentPage"
              @update:current-page="currentPage = $event"
            >
              <!-- Colonne Avatar/Nom -->
              <template #cell(name)="{ rowData }">
                <div class="collaborateur-info">
                  <div class="collaborateur-avatar">
                    {{ getInitials(rowData) }}
                  </div>
                  <div class="collaborateur-details">
                    <div class="collaborateur-name">{{ rowData.prenom }} {{ rowData.nom }}</div>
                    <div class="collaborateur-email">{{ rowData.email || 'Pas d\'email' }}</div>
                  </div>
                </div>
              </template>

              <!-- Colonne Métier -->
              <template #cell(metier)="{ rowData }">
                <va-chip color="primary" size="small">
                  <va-icon name="work" size="small" />
                  {{ rowData.metier }}
                </va-chip>
              </template>

              <!-- Colonne Ville -->
              <template #cell(ville)="{ rowData }">
                <va-chip color="info" size="small">
                  <va-icon name="location_on" size="small" />
                  {{ rowData.ville }}
                </va-chip>
              </template>

              <!-- Colonne Actions -->
              <template #cell(actions)="{ rowData }">
                <div class="actions-cell">
                  <va-button
                    preset="plain"
                    icon="edit"
                    size="small"
                    @click="editCollaborateur(rowData)"
                    color="primary"
                  >
                    Modifier
                  </va-button>
                  <va-button
                    preset="plain"
                    icon="visibility"
                    size="small"
                    @click="viewCollaborateur(rowData)"
                    color="info"
                  >
                    Voir
                  </va-button>
                  <va-button
                    preset="plain"
                    icon="delete"
                    size="small"
                    color="danger"
                    @click="confirmDelete(rowData)"
                  >
                    Supprimer
                  </va-button>
                </div>
              </template>
            </va-data-table>

            <!-- Pagination -->
            <div class="pagination-section">
              <va-pagination
                v-model="currentPage"
                :pages="totalPages"
                :visible-pages="5"
                buttons-preset="secondary"
              />
              <div class="pagination-info">
                Affichage de {{ startIndex + 1 }} à {{ endIndex }} sur {{ filteredCollaborateurs.length }} collaborateurs
              </div>
            </div>
          </div>
        </va-card-content>
      </va-card>
    </div>

    <!-- Modal Ajouter Collaborateur -->
    <va-modal
      v-model="showAddModal"
      title="Ajouter un collaborateur"
      size="medium"
      @ok="handleAddCollaborateur"
      :ok-text="'Ajouter'"
      :cancel-text="'Annuler'"
    >
      <div class="add-collaborateur-form">
        <va-form ref="addForm" @submit.prevent="handleAddCollaborateur">
          <div class="form-row">
            <va-input
              v-model="newCollaborateur.nom"
              label="Nom *"
              :rules="[required]"
            />
            <va-input
              v-model="newCollaborateur.prenom"
              label="Prénom *"
              :rules="[required]"
            />
          </div>
          <div class="form-row">
            <va-select
              v-model="newCollaborateur.metier"
              label="Métier *"
              :options="metiersOptions"
              :rules="[required]"
            />
            <va-select
              v-model="newCollaborateur.ville"
              label="Ville *"
              :options="villesOptions"
              :rules="[required]"
            />
          </div>
          <div class="form-row">
            <va-input
              v-model="newCollaborateur.email"
              label="Email"
              type="email"
            />
            <va-input
              v-model="newCollaborateur.phone"
              label="Téléphone"
            />
          </div>
        </va-form>
      </div>
    </va-modal>

    <!-- Modal Confirmation Suppression -->
    <va-modal
      v-model="showDeleteModal"
      title="Confirmer la suppression"
      ok-text="Supprimer"
      cancel-text="Annuler"
      @ok="handleDeleteCollaborateur"
      ok-color="danger"
    >
      <p>
        Êtes-vous sûr de vouloir supprimer le collaborateur 
        <strong>{{ collaborateurToDelete?.prenom }} {{ collaborateurToDelete?.nom }}</strong> ?
      </p>
      <p class="warning-text">
        Cette action est irréversible et supprimera également toutes les disponibilités associées.
      </p>
    </va-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { AuthService } from '../services/auth'
import { auth } from '../services/firebase'
import { emergencyOptimization } from '../services/emergencyOptimization'
import { getUserInitials, getUserColor } from '../services/avatarUtils'

// Type local pour les collaborateurs
interface Collaborateur {
  id?: string
  nom: string
  prenom: string
  metier: string
  ville: string
  email?: string
  phone?: string
  tenantId?: string
  actif?: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Services
const { notify } = useToast()
const router = useRouter()

// Reactive state
const collaborateurs = ref<Collaborateur[]>([])
const isLoading = ref(true)
const isRefreshing = ref(false)
const searchQuery = ref('')
const selectedMetier = ref('')
const selectedVille = ref('')
const currentPage = ref(1)
const perPage = ref(20)

// Modales
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const collaborateurToDelete = ref<Collaborateur | null>(null)

// Formulaire nouveau collaborateur
const newCollaborateur = ref({
  nom: '',
  prenom: '',
  metier: '',
  ville: '',
  email: '',
  phone: ''
})

// Mode urgence - DÉSACTIVÉ pour les collaborateurs
const isEmergencyMode = computed(() => {
  return false // Toujours désactivé pour permettre la gestion des collaborateurs
})

const maxCollaborateurs = computed(() => {
  return 1000 // Limite élevée pour les collaborateurs
})

// Options pour les selects
const metiersOptions = [
  'Développeur', 'Designer', 'Chef de projet', 'Analyste', 'Consultant',
  'Manager', 'Technicien', 'Commercial', 'Marketing', 'RH', 'Comptable',
  'Assistant', 'Stagiaire', 'Freelance', 'Autre'
]

const villesOptions = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes',
  'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes',
  'Reims', 'Saint-Étienne', 'Toulon', 'Le Havre', 'Grenoble',
  'Dijon', 'Angers', 'Villeurbanne', 'Saint-Denis', 'Autre'
]

// Columns configuration
const columns = [
  { key: 'name', label: 'Collaborateur', width: '300px' },
  { key: 'metier', label: 'Métier', width: '150px' },
  { key: 'ville', label: 'Ville', width: '150px' },
  { key: 'phone', label: 'Téléphone', width: '150px' },
  { key: 'actions', label: 'Actions', width: '200px' }
]

// Computed properties
const uniqueMetiers = computed(() => {
  return [...new Set(collaborateurs.value.map(c => c.metier).filter(Boolean))]
})

const uniqueVilles = computed(() => {
  return [...new Set(collaborateurs.value.map(c => c.ville).filter(Boolean))]
})

const filteredCollaborateurs = computed(() => {
  let filtered = collaborateurs.value.filter(collab => collab.actif !== false)
  
  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase()
    filtered = filtered.filter(collab => 
      collab.nom?.toLowerCase().includes(search) ||
      collab.prenom?.toLowerCase().includes(search) ||
      collab.email?.toLowerCase().includes(search) ||
      collab.metier?.toLowerCase().includes(search) ||
      collab.ville?.toLowerCase().includes(search)
    )
  }
  
  if (selectedMetier.value) {
    filtered = filtered.filter(collab => collab.metier === selectedMetier.value)
  }
  
  if (selectedVille.value) {
    filtered = filtered.filter(collab => collab.ville === selectedVille.value)
  }
  
  return filtered
})

const totalPages = computed(() => {
  return Math.ceil(filteredCollaborateurs.value.length / perPage.value)
})

const startIndex = computed(() => (currentPage.value - 1) * perPage.value)
const endIndex = computed(() => Math.min(startIndex.value + perPage.value, filteredCollaborateurs.value.length))

const paginatedCollaborateurs = computed(() => {
  return filteredCollaborateurs.value.slice(startIndex.value, endIndex.value)
})

// Méthodes utilitaires
const getInitials = (collaborateur: Collaborateur) => {
  return getUserInitials({
    nom: collaborateur.nom,
    prenom: collaborateur.prenom,
    email: collaborateur.email
  })
}

const getAvatarColor = (collaborateur: Collaborateur) => {
  const id = collaborateur.id || `${collaborateur.nom}-${collaborateur.prenom}`
  return getUserColor(id)
}

// Méthodes d'actions
const editCollaborateur = (collaborateur: Collaborateur) => {
  console.log('Navigation vers modification collaborateur:', collaborateur)
  
  if (!collaborateur.id) {
    notify({
      message: 'Erreur: ID collaborateur manquant',
      color: 'danger'
    })
    return
  }
  
  router.push(`/collaborateurs/${collaborateur.id}`)
}

const viewCollaborateur = (collaborateur: Collaborateur) => {
  console.log('View collaborateur:', collaborateur)
  notify({
    message: 'Vue détaillée à venir',
    color: 'info'
  })
}

const confirmDelete = (collaborateur: Collaborateur) => {
  collaborateurToDelete.value = collaborateur
  showDeleteModal.value = true
}

// Validation
const required = (value: string) => {
  return value?.trim() ? true : 'Ce champ est requis'
}

const email = (value: string) => {
  if (!value) return true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value) || 'Email invalide'
}

// Actions CRUD
const loadCollaborateurs = async () => {
  try {
    isRefreshing.value = true
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const data = await CollaborateursServiceV2.loadCollaborateursFromImport(tenantId)
    
    collaborateurs.value = data.map(collab => ({
      id: collab.id,
      nom: collab.nom,
      prenom: collab.prenom,
      metier: collab.metier,
      ville: collab.ville || '',
      email: collab.email || '',
      phone: collab.phone || '',
      tenantId: collab.tenantId,
      actif: collab.actif,
      createdAt: collab.createdAt,
      updatedAt: collab.updatedAt
    }))
    
    console.log(`✅ ${collaborateurs.value.length} collaborateurs chargés`)
  } catch (error) {
    console.error('❌ Erreur chargement collaborateurs:', error)
    notify({
      message: 'Erreur lors du chargement des collaborateurs',
      color: 'danger'
    })
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const handleAddCollaborateur = async () => {
  if (!auth.currentUser) {
    notify({
      message: 'Vous devez être connecté pour ajouter un collaborateur',
      color: 'danger'
    })
    return
  }

  try {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    const collaborateurData = {
      nom: newCollaborateur.value.nom,
      prenom: newCollaborateur.value.prenom,
      metier: newCollaborateur.value.metier,
      ville: newCollaborateur.value.ville,
      email: newCollaborateur.value.email,
      phone: newCollaborateur.value.phone,
      tenantId: tenantId,
      actif: true
    }

    await CollaborateursServiceV2.createCollaborateur(
      tenantId,
      collaborateurData,
      auth.currentUser.uid
    )

    notify({
      message: `Collaborateur ${newCollaborateur.value.prenom} ${newCollaborateur.value.nom} ajouté avec succès`,
      color: 'success'
    })

    // Reset form
    newCollaborateur.value = {
      nom: '',
      prenom: '',
      metier: '',
      ville: '',
      email: '',
      phone: ''
    }

    showAddModal.value = false
    await loadCollaborateurs()
  } catch (error) {
    console.error('❌ Erreur ajout collaborateur:', error)
    notify({
      message: 'Erreur lors de l\'ajout du collaborateur',
      color: 'danger'
    })
  }
}

const handleDeleteCollaborateur = async () => {
  if (!collaborateurToDelete.value || !auth.currentUser) {
    return
  }

  try {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    await CollaborateursServiceV2.deleteCollaborateur(
      tenantId,
      collaborateurToDelete.value.id!,
      auth.currentUser.uid
    )

    notify({
      message: `Collaborateur ${collaborateurToDelete.value.prenom} ${collaborateurToDelete.value.nom} supprimé avec succès`,
      color: 'success'
    })

    showDeleteModal.value = false
    collaborateurToDelete.value = null
    await loadCollaborateurs()
  } catch (error) {
    console.error('❌ Erreur suppression collaborateur:', error)
    notify({
      message: 'Erreur lors de la suppression du collaborateur',
      color: 'danger'
    })
  }
}

// Lifecycle
onMounted(() => {
  loadCollaborateurs()
})
</script>

<style scoped>
.liste-collaborateurs {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 0;
}

.page-header {
  background: linear-gradient(135deg, var(--va-primary) 0%, #1e40af 100%);
  color: white;
  padding: 2rem 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
}

.title-icon {
  font-size: 2.5rem;
}

.page-subtitle {
  opacity: 0.9;
  font-size: 1.1rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.stats-section,
.filters-section,
.collaborateurs-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--va-text-primary);
}

.stat-label {
  color: var(--va-text-secondary);
  font-size: 0.9rem;
}

.filters-card,
.collaborateurs-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.filters-container {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 1.5rem;
  align-items: end;
}

.filter-section {
  display: flex;
  gap: 1rem;
}

.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.collaborateur-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--va-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.collaborateur-name {
  font-weight: 600;
  color: var(--va-text-primary);
}

.collaborateur-email {
  font-size: 0.8rem;
  color: var(--va-text-secondary);
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
}

.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.pagination-info {
  color: var(--va-text-secondary);
  font-size: 0.9rem;
}

.loading-section {
  padding: 4rem 2rem;
  text-align: center;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.warning-text {
  color: var(--va-danger);
  font-size: 0.9rem;
  margin-top: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .title-icon {
    font-size: 2rem;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filters-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .filter-section {
    flex-direction: column;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .pagination-section {
    flex-direction: column;
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .stats-section,
  .filters-section,
  .collaborateurs-section {
    padding: 1rem;
  }

  .header-content {
    padding: 0 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .title-icon {
    font-size: 1.5rem;
  }
}
</style>
