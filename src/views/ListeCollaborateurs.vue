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
            preset="primary"
            icon="add"
            @click="router.push('/collaborateurs/nouveau')"
            :disabled="isLoading"
          >
            Nouveau collaborateur
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
            </div>
          </div>
        </va-card-content>
      </va-card>
    </div>

    <!-- Liste des collaborateurs -->
    <div v-if="!isLoading" class="collaborateurs-section">
      <!-- État vide -->
      <div v-if="collaborateurs.length === 0" class="empty-state">
        <va-card class="empty-card">
          <va-card-content>
            <div class="empty-content">
              <va-icon name="people_outline" size="4rem" color="secondary" />
              <h3>Aucun collaborateur</h3>
              <p>Commencez par créer votre premier collaborateur pour gérer votre équipe.</p>
              <va-button 
                color="primary" 
                icon="add"
                @click="router.push('/collaborateurs/nouveau')"
              >
                Créer le premier collaborateur
              </va-button>
            </div>
          </va-card-content>
        </va-card>
      </div>

      <!-- Table des collaborateurs -->
      <va-card v-else class="collaborateurs-card">
        <va-card-content>
          <div class="table-container">
            <va-data-table
              :items="paginatedCollaborateurs"
              :columns="columns"
              :loading="isRefreshing"
              striped
              hoverable
            >
              <!-- Colonne Avatar/Nom -->
              <template #cell(name)="{ rowData }">
                <div class="collaborateur-info">
                  <div 
                    class="collaborateur-avatar"
                    :style="{ backgroundColor: rowData.color || DEFAULT_COLOR }"
                  >
                    {{ getInitials(rowData) }}
                  </div>
                  <div class="collaborateur-details">
                    <div class="collaborateur-name">{{ rowData.prenom }} {{ rowData.nom }}</div>
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

              <!-- Colonne Email -->
              <template #cell(email)="{ rowData }">
                <div class="email-cell">
                  <va-icon name="email" size="small" style="margin-right: 8px;" />
                  <a v-if="rowData.email" :href="`mailto:${rowData.email}`" class="email-link">
                    {{ rowData.email }}
                  </a>
                  <span v-else class="no-email">Pas d'email</span>
                </div>
              </template>

              <!-- Colonne Note -->
              <template #cell(note)="{ rowData }">
                <va-chip color="info" size="small">
                  <va-icon name="note" size="small" />
                  {{ rowData.note || 'Aucune note' }}
                </va-chip>
              </template>

              <!-- Colonne Téléphone -->
              <template #cell(phone)="{ rowData }">
                <div class="phone-cell">
                  <a 
                    v-if="rowData.phone" 
                    :href="`tel:${phoneToHref(rowData.phone)}`"
                    class="phone-link"
                  >
                    <va-icon name="phone" size="12px" class="phone-icon" />
                    <span class="phone-display">{{ formatPhone(rowData.phone) }}</span>
                  </a>
                  <span v-else class="no-phone">-</span>
                </div>
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
                    class="action-btn"
                  />
                  <va-button
                    preset="plain"
                    icon="visibility"
                    size="small"
                    @click="viewCollaborateur(rowData)"
                    color="info"
                    class="action-btn"
                  />
                  <va-button
                    preset="plain"
                    icon="delete"
                    size="small"
                    color="danger"
                    @click="confirmDelete(rowData)"
                    class="action-btn"
                  />
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
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { AuthService } from '../services/auth'
import { auth } from '../services/firebase'
import { getUserInitials } from '../services/avatarUtils'
import { formatPhone, phoneToHref } from '../utils/phoneFormatter'
import { DEFAULT_COLOR } from '../utils/collaborateurColors'

// Type local pour les collaborateurs
interface Collaborateur {
  id?: string
  nom: string
  prenom: string
  metier: string
  note: string
  color?: string
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
// Loading states
const isLoading = ref(true)
const isRefreshing = ref(false)
const searchQuery = ref('')
const selectedMetier = ref('')
const currentPage = ref(1)
const perPage = ref(20)

// Modales
const showDeleteModal = ref(false)
const collaborateurToDelete = ref<Collaborateur | null>(null)



// Columns configuration
const columns = [
  { key: 'name', label: 'Collaborateur', width: '170px' },
  { key: 'metier', label: 'Métier', width: '90px' },
  { key: 'email', label: 'Email', width: '140px' },
  { key: 'note', label: 'Note', width: '140px' },
  { key: 'phone', label: 'Téléphone', width: '140px' },
  { key: 'actions', label: 'Actions', width: '90px', sortable: false }
]

// Computed properties
const uniqueMetiers = computed(() => {
  return [...new Set(collaborateurs.value.map(c => c.metier).filter(Boolean))]
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
      collab.note?.toLowerCase().includes(search)
    )
  }
  
  if (selectedMetier.value) {
    filtered = filtered.filter(collab => collab.metier === selectedMetier.value)
  }
  
  return filtered
})

const totalPages = computed(() => {
  const total = Math.ceil(filteredCollaborateurs.value.length / perPage.value)
  return Math.max(1, total) // Au minimum 1 page
})

const startIndex = computed(() => {
  // S'assurer que currentPage est valide
  const validPage = Math.max(1, Math.min(currentPage.value, totalPages.value))
  return (validPage - 1) * perPage.value
})

const endIndex = computed(() => Math.min(startIndex.value + perPage.value, filteredCollaborateurs.value.length))

const paginatedCollaborateurs = computed(() => {
  const filtered = filteredCollaborateurs.value
  if (filtered.length === 0) return []
  
  const start = startIndex.value
  const end = endIndex.value
  
  // Si on est au-delà des données disponibles, retourner un tableau vide
  if (start >= filtered.length) return []
  
  return filtered.slice(start, end)
})

// Méthodes utilitaires
const getInitials = (collaborateur: Collaborateur) => {
  return getUserInitials({
    nom: collaborateur.nom,
    prenom: collaborateur.prenom,
    email: collaborateur.email
  })
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
  
  if (!collaborateur.id) {
    notify({
      message: 'Erreur: ID collaborateur manquant',
      color: 'danger'
    })
    return
  }
  
  router.push(`/collaborateurs/${collaborateur.id}/detail`)
}

const confirmDelete = (collaborateur: Collaborateur) => {
  collaborateurToDelete.value = collaborateur
  showDeleteModal.value = true
}

// Actions CRUD
const loadCollaborateurs = async () => {
  try {
    isRefreshing.value = true
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    console.log('🔄 Chargement des collaborateurs pour tenant:', tenantId)
    console.log('� Utilisateur connecté:', auth.currentUser?.email)
    
    // Charger depuis RTDB d'abord (plus de données)
    let data = []
    try {
      data = await CollaborateursServiceV2.loadCollaborateursFromRTDB(tenantId)
      console.log('✅ Données RTDB chargées:', data.length)
    } catch (rtdbError) {
      console.warn('⚠️ Erreur RTDB, tentative Firestore:', rtdbError)
      // Fallback sur Firestore
      try {
        data = await CollaborateursServiceV2.loadCollaborateurs(tenantId)
      } catch (firestoreError) {
        console.warn('⚠️ Erreur Firestore aussi:', firestoreError)
        // Dernier fallback avec la méthode d'import
        data = await CollaborateursServiceV2.loadCollaborateursFromImport(tenantId)
      }
    }
    
    collaborateurs.value = data.map(collab => ({
      id: collab.id || `${collab.nom}-${collab.prenom}`.toLowerCase().replace(/\s+/g, '-'),
      nom: collab.nom,
      prenom: collab.prenom,
      metier: collab.metier,
      note: collab.note || '',
      color: collab.color || undefined,
      email: collab.email || '',
      phone: collab.phone || '',
      tenantId: collab.tenantId,
      actif: collab.actif,
      createdAt: collab.createdAt,
      updatedAt: collab.updatedAt
    }))
    
    // Log temporaire pour vérifier les couleurs
    console.log('🎨 Collaborateurs avec couleurs:', collaborateurs.value.map(c => ({
      nom: `${c.prenom} ${c.nom}`,
      color: c.color
    })))
    
    console.log(`✅ ${collaborateurs.value.length} collaborateurs chargés`)
    
    if (collaborateurs.value.length === 0) {
      notify({
        message: 'Aucun collaborateur trouvé. Créez votre premier collaborateur.',
        color: 'info'
      })
    }
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

// Watchers - Réinitialiser la pagination quand les filtres changent
watch([searchQuery, selectedMetier], () => {
  currentPage.value = 1
})

// Watcher pour s'assurer que currentPage ne dépasse jamais totalPages
watch(totalPages, (newTotalPages) => {
  if (currentPage.value > newTotalPages && newTotalPages > 0) {
    currentPage.value = newTotalPages
  }
})

// Lifecycle
onMounted(() => {
  loadCollaborateurs()
})
</script>

<style scoped>
.liste-collaborateurs {
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
  gap: 1rem;
  padding: 16px;
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

.stats-section,
.filters-section,
.collaborateurs-section {
  padding: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--va-background-secondary);
  border-radius: 8px;
  border: 1px solid var(--va-background-border);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  background: var(--va-background-secondary);
  border-radius: 8px;
  border: 1px solid var(--va-background-border);
}

.filters-container {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 1.5rem;
  align-items: end;
}

.search-section {
  width: 100%;
}

.search-input {
  width: 100%;
  min-width: 300px;
}

.filter-section {
  display: flex;
  gap: 1rem;
}

.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.collaborateur-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.collaborateur-name {
  font-weight: 600;
  color: var(--va-text-primary);
  font-size: 0.9rem;
}

.actions-cell {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  align-items: center;
  min-width: 90px;
}

.action-btn {
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  border-radius: 6px !important;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: scale(1.1);
}

.table-container {
  overflow-x: auto;
}

.table-container .va-data-table {
  min-width: 100%;
}

.email-cell {
  display: flex;
  align-items: center;
  max-width: 140px;
  overflow: hidden;
}

.email-link {
  color: var(--va-primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-link:hover {
  text-decoration: underline;
}

.no-email {
  color: var(--va-text-secondary);
  font-style: italic;
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

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.empty-card {
  background: var(--va-background-secondary);
  border-radius: 8px;
  border: 1px solid var(--va-background-border);
  max-width: 500px;
  width: 100%;
}

.empty-content {
  text-align: center;
  padding: 2rem;
}

.empty-content h3 {
  margin: 1rem 0 0.5rem;
  color: var(--va-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.empty-content p {
  color: var(--va-text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
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

.phone-display {
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', 'Liberation Mono', monospace;
  font-size: 0.75rem;
  color: var(--va-text-primary);
  font-weight: 500;
  letter-spacing: 0.3px;
}

.phone-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--va-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  background: rgba(var(--va-primary-rgb), 0.05);
  border: 1px solid rgba(var(--va-primary-rgb), 0.1);
}

.phone-link:hover {
  background-color: rgba(var(--va-primary-rgb), 0.1);
  color: var(--va-primary-dark);
  text-decoration: none;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--va-primary-rgb), 0.2);
}

.phone-link:active {
  transform: translateY(0);
}

.phone-icon {
  margin-right: 4px;
  opacity: 0.7;
}

.phone-cell {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.no-phone {
  color: var(--va-text-secondary);
  font-style: italic;
  font-size: 0.8rem;
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

  .search-input {
    min-width: 250px;
  }

  .filter-section {
    flex-direction: column;
    width: 100%;
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
  .page-container {
    padding: 0 !important;
  }
  
  .stats-section,
  .filters-section,
  .collaborateurs-section {
    padding: 8px;
  }

  .search-input {
    min-width: 200px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .title-icon {
    font-size: 1.5rem;
  }
}
</style>
