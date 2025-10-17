<template>
  <div class="liste-collaborateurs">
    <!-- Header élégant similaire au planning -->
    <div class="collaborateurs-header">
      <div class="header-top">
        <div class="header-brand">
          <div class="brand-icon">
            <va-icon name="people" />
          </div>
          <div class="brand-content">
            <h1 class="brand-title">Collaborateurs</h1>
            <p class="brand-subtitle">Gérez votre équipe</p>
          </div>
        </div>
        <div class="header-actions">
          <va-button
            preset="primary"
            icon="add"
            @click="router.push('/collaborateurs/nouveau')"
            :disabled="isLoading"
            class="action-button"
          >
            Nouveau collaborateur
          </va-button>
        </div>
      </div>
    </div>

    <!-- Conteneur principal -->
    <div class="collaborateurs-container">
      <!-- Statistiques élégantes -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-icon-wrapper" style="background: rgba(99, 102, 241, 0.1);">
                <va-icon name="people" color="#6366f1" size="24px" />
              </div>
              <div class="stat-text">
                <div class="stat-number">{{ filteredCollaborateurs.length }}</div>
                <div class="stat-label">Collaborateurs</div>
              </div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-icon-wrapper" style="background: rgba(16, 185, 129, 0.1);">
                <va-icon name="work" color="#10b981" size="24px" />
              </div>
              <div class="stat-text">
                <div class="stat-number">{{ uniqueMetiers.length }}</div>
                <div class="stat-label">Métiers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="loading-section">
        <div class="loading-content">
          <va-progress-circle size="large" indeterminate />
          <p>Chargement des collaborateurs...</p>
        </div>
      </div>

      <!-- Filtres modernisés -->
      <div v-else class="filters-section">
        <div class="filters-card">
          <div class="filters-container">
            <div class="search-section">
              <va-input
                v-model="searchQuery"
                placeholder="Rechercher un collaborateur..."
                icon="search"
                clearable
                class="search-input"
                style="color: #000000 !important;"
                :style="{ 'color': '#000000 !important' }"
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
                style="color: #000000 !important;"
                :style="{ 'color': '#000000 !important' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des collaborateurs -->
      <div v-if="!isLoading" class="collaborateurs-section">
        <!-- État vide -->
        <div v-if="collaborateurs.length === 0" class="empty-state">
          <div class="empty-card">
            <div class="empty-content">
              <va-icon name="people_outline" size="4rem" color="#94a3b8" />
              <h3>Aucun collaborateur</h3>
              <p>Commencez par créer votre premier collaborateur pour gérer votre équipe.</p>
              <va-button 
                preset="primary"
                icon="add"
                @click="router.push('/collaborateurs/nouveau')"
              >
                Créer le premier collaborateur
              </va-button>
            </div>
          </div>
        </div>

        <!-- Table des collaborateurs -->
        <div v-else class="collaborateurs-card">
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
        </div>
      </div>
    </div>

    <!-- Modal Confirmation Suppression -->
    <va-modal
      v-model="showDeleteModal"
      title="Confirmer la suppression"
      ok-text="Supprimer"
      cancel-text="Annuler"
      @ok="handleDeleteCollaborateur"
      ok-color="danger"
      :overlay-opacity="0.6"
      @before-open="modalA11y.onBeforeOpen"
      @open="modalA11y.onOpen"
      @close="modalA11y.onClose"
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
import type { CollaborateurV2 } from '../types/optimized-v2'
import { AuthService } from '../services/auth'
import { auth } from '../services/firebase'
import { getUserInitials } from '../services/avatarUtils'
import { formatPhone, phoneToHref } from '../utils/phoneFormatter'
import { DEFAULT_COLOR } from '../utils/collaborateurColors'
import { useModalA11y } from '@/composables/useModalA11y'

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
// Accessibilité modale
const modalA11y = useModalA11y()



// Columns configuration
// Toutes les colonnes toujours visibles avec scroll horizontal
const columns = computed(() => {
  return [
    { key: 'name', label: 'Collaborateur', width: '170px' },
    { key: 'metier', label: 'Métier', width: '120px' },
    { key: 'email', label: 'Email', width: '180px' },
    { key: 'note', label: 'Note', width: '150px' },
    { key: 'phone', label: 'Téléphone', width: '140px' },
    { key: 'actions', label: 'Actions', width: '90px', sortable: false }
  ]
})

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
    
    // Charger depuis RTDB d'abord (plus de données)
    let data: CollaborateurV2[] = []
    try {
      data = await CollaborateursServiceV2.loadCollaborateursFromRTDB(tenantId)
      // Si RTDB est vide, fallback explicite vers import
      if (!data || data.length === 0) {
        try {
          data = await CollaborateursServiceV2.loadCollaborateurs(tenantId)
        } catch (rtdbError) {
          console.warn('⚠️ Erreur RTDB, fallback import:', rtdbError)
          data = await CollaborateursServiceV2.loadCollaborateursFromImport(tenantId)
        }
      }
    } catch (rtdbError) {
      console.warn('⚠️ Erreur RTDB:', rtdbError)
      // Fallback sur la méthode d'import
      try {
        data = await CollaborateursServiceV2.loadCollaborateursFromImport(tenantId)
      } catch (importError) {
        console.warn('⚠️ Erreur import aussi:', importError)
        data = []
      }
    }
    
    collaborateurs.value = data.map((collab: CollaborateurV2) => ({
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
/* ===============================
   VARIABLES ET BASE
   =============================== */
.liste-collaborateurs {
  --surface-light: #ffffff;
  --border-light: #e2e8f0;
  --text-light: #334155;
  --text-muted: #64748b;
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.05);
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  
  font-family: var(--va-font-family, 'Inter', sans-serif);
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===============================
   FORCER COULEURS NOIRES INPUTS
   =============================== */
/* UNIQUEMENT pour les inputs de filtres */
.filters-section :deep(.search-input input),
.filters-section :deep(.filter-select input),
.filters-section :deep(.va-input-wrapper input) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.filters-section :deep(.search-input input::placeholder),
.filters-section :deep(.filter-select input::placeholder),
.filters-section :deep(.va-input-wrapper input::placeholder) {
  color: #666666 !important;
  -webkit-text-fill-color: #666666 !important;
}

/* UNIQUEMENT les icônes dans les champs de filtres */
.filters-section :deep(.search-input .va-input__icons .va-icon),
.filters-section :deep(.filter-select .va-input__icons .va-icon) {
  color: #000000 !important;
}

/* ===============================
   HEADER ÉLÉGANT
   =============================== */
.collaborateurs-header {
  background: var(--surface-light);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-soft);
  position: relative;
  z-index: 10;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 16px 24px;
  background: var(--primary-gradient);
  color: white;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.brand-icon :deep(.va-icon) {
  font-size: 22px;
  color: white;
}

.brand-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.brand-subtitle {
  margin: 2px 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
  line-height: 1.2;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-button {
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: white !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  padding: 10px 20px !important;
  transition: all 0.3s ease !important;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  transform: translateY(-1px) !important;
}

.page-subtitle {
  color: var(--va-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

/* ===============================
   CONTENEUR PRINCIPAL
   =============================== */
.collaborateurs-container {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
  overflow: auto;
  min-height: 0;
}

/* ===============================
   STATISTIQUES MODERNES
   =============================== */
.stats-section {
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
}

.stat-card {
  background: var(--surface-light);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-light);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.stat-text {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-light);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ===============================
   LOADING
   =============================== */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  text-align: center;
}

.loading-content p {
  margin: 0;
  color: var(--text-muted);
  font-size: 1.1rem;
}

/* ===============================
   FILTRES MODERNISÉS
   =============================== */
.filters-section {
  margin-bottom: 32px;
}

.filters-card {
  background: var(--surface-light);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-light);
}

.filters-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  align-items: end;
}

/* ===============================
   STYLES INPUTS FILTRES
   =============================== */
/* Forcer la couleur noire UNIQUEMENT pour les inputs de recherche */
.search-input {
  --va-input-text-color: #000000 !important;
}

.search-input :deep(.va-input-wrapper .va-input__content input) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.search-input :deep(.va-input-wrapper .va-input__content input::placeholder) {
  color: #666666 !important;
  -webkit-text-fill-color: #666666 !important;
}

.search-input :deep(.va-input-wrapper .va-input__icons .va-icon) {
  color: #000000 !important;
}

/* Forcer la couleur noire UNIQUEMENT pour le sélecteur de métier */
.filter-select {
  --va-input-text-color: #000000 !important;
  --va-select-text-color: #000000 !important;
}

.filter-select :deep(.va-input-wrapper .va-input__content input) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.filter-select :deep(.va-input-wrapper .va-input__content input::placeholder) {
  color: #666666 !important;
  -webkit-text-fill-color: #666666 !important;
}

.filter-select :deep(.va-input-wrapper .va-input__icons .va-icon) {
  color: #000000 !important;
}

/* ===============================
   ÉTAT VIDE ÉLÉGANT
   =============================== */
.empty-state {
  margin-bottom: 32px;
}

.empty-card {
  background: var(--surface-light);
  border-radius: 16px;
  padding: 60px 40px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-light);
  text-align: center;
}

.empty-content h3 {
  margin: 16px 0 8px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-light);
}

.empty-content p {
  margin: 0 0 32px 0;
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1.6;
}

/* ===============================
   TABLE MODERNISÉE
   =============================== */
.collaborateurs-card {
  background: var(--surface-light);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-light);
  overflow: hidden;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

:deep(.va-data-table) {
  border-radius: 12px !important;
  overflow: visible !important;
  width: 100% !important;
}

:deep(.va-data-table__table) {
  width: 100% !important;
  table-layout: auto !important;
}

:deep(.va-data-table__table-tr:hover) {
  background: #f8fafc !important;
}

:deep(.va-data-table__table-th) {
  background: #f1f5f9 !important;
  color: var(--text-light) !important;
  font-weight: 600 !important;
  padding: 16px 12px !important;
  border-bottom: 2px solid var(--border-light) !important;
}

:deep(.va-data-table__table-td) {
  padding: 16px 12px !important;
  border-bottom: 1px solid #f1f5f9 !important;
}

/* Largeurs fixes pour chaque colonne sur desktop */
:deep(.va-data-table__table th:nth-child(1)),
:deep(.va-data-table__table td:nth-child(1)) {
  width: 170px !important;
  max-width: 170px !important;
}

:deep(.va-data-table__table th:nth-child(2)),
:deep(.va-data-table__table td:nth-child(2)) {
  width: 120px !important;
  max-width: 120px !important;
}

:deep(.va-data-table__table th:nth-child(3)),
:deep(.va-data-table__table td:nth-child(3)) {
  width: 180px !important;
  max-width: 180px !important;
}

:deep(.va-data-table__table th:nth-child(4)),
:deep(.va-data-table__table td:nth-child(4)) {
  width: 150px !important;
  max-width: 150px !important;
}

:deep(.va-data-table__table th:nth-child(5)),
:deep(.va-data-table__table td:nth-child(5)) {
  width: 140px !important;
  max-width: 140px !important;
}

:deep(.va-data-table__table th:nth-child(6)),
:deep(.va-data-table__table td:nth-child(6)) {
  width: 90px !important;
  max-width: 90px !important;
}

/* ===============================
   CELLULES TABLE
   =============================== */
.collaborateur-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collaborateur-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.collaborateur-name {
  font-weight: 600;
  color: var(--text-light);
}

.email-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.email-link {
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.email-link:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.no-email {
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.875rem;
}

.phone-cell {
  display: flex;
  align-items: center;
}

.phone-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: #6366f1;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: all 0.2s ease;
  font-weight: 500;
}

.phone-link:hover {
  background: rgba(99, 102, 241, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

.phone-display {
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.8rem;
  letter-spacing: 0.3px;
}

.no-phone {
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.875rem;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  padding: 8px !important;
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
}

.action-btn:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

/* ===============================
   PAGINATION
   =============================== */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
}

.pagination-info {
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* ===============================
   MODAL
   =============================== */
.warning-text {
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 1rem;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Overlay de la modale avec fond sombre */
:deep(.va-modal__overlay) {
  background-color: rgba(0, 0, 0, 0.6) !important;
  /* Pas de backdrop-filter pour éviter que le flou affecte la modale */
}

/* Contenu de la modale avec fond blanc */
:deep(.va-modal__container) {
  background-color: white !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
  border-radius: 12px !important;
}

/* ===============================
   CHIPS VUESTIC
   =============================== */
:deep(.va-chip) {
  border-radius: 6px !important;
  font-weight: 500 !important;
  font-size: 0.75rem !important;
  padding: 4px 8px !important;
}

:deep(.va-chip .va-icon) {
  margin-right: 4px !important;
}

/* ===============================
   BOUTONS MODERNISÉS
   =============================== */
:deep(.va-button) {
  border-radius: 8px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  text-transform: none !important;
}

:deep(.va-button:hover) {
  transform: translateY(-1px) !important;
}

:deep(.va-button--primary) {
  background: var(--primary-gradient) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
}

:deep(.va-button--primary:hover) {
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
}

/* ===============================
   RESPONSIVE DESIGN
   =============================== */
@media (max-width: 768px) {
  .header-top {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    height: auto;
    min-height: 120px;
  }
  
  .header-brand {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
  
  .action-button {
    width: 100%;
    max-width: 300px;
  }
  
  .brand-icon {
    width: 38px;
    height: 38px;
  }
  
  .brand-icon :deep(.va-icon) {
    font-size: 20px;
  }
  
  .brand-title {
    font-size: 1.125rem;
    text-align: center;
  }
  
  .brand-subtitle {
    font-size: 0.8rem;
    text-align: center;
  }
  
  .collaborateurs-container {
    padding: 20px 16px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .filters-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .filters-card {
    padding: 1.5rem;
  }
  
  .collaborateurs-card {
    padding: 1.5rem;
  }
  
  .pagination-section {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
  }
  
  .actions-cell {
    flex-direction: row;
    gap: 8px;
    justify-content: center;
  }
  
  .collaborateur-info {
    flex-direction: row;
    text-align: left;
    gap: 12px;
    align-items: center;
  }
  
  /* Table responsive pour tablette */
  .collaborateurs-card :deep(.va-data-table__table th),
  .collaborateurs-card :deep(.va-data-table__table td) {
    padding: 0.6rem 0.4rem;
    font-size: 0.85rem;
  }

  .collaborateurs-card {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .collaborateurs-card :deep(.va-data-table__table) {
    min-width: 850px !important; /* Largeur pour toutes les colonnes */
    width: 850px !important;
    table-layout: fixed !important;
  }

  /* Largeurs fixes pour chaque colonne sur tablette aussi */
  .collaborateurs-card :deep(.va-data-table__table th:nth-child(1)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(1)) {
    width: 170px !important;
    max-width: 170px !important;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(2)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(2)) {
    width: 120px !important;
    max-width: 120px !important;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(3)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(3)) {
    width: 180px !important;
    max-width: 180px !important;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(4)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(4)) {
    width: 150px !important;
    max-width: 150px !important;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(5)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(5)) {
    width: 140px !important;
    max-width: 140px !important;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(6)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(6)) {
    width: 90px !important;
    max-width: 90px !important;
  }

  .collaborateur-name {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .email-link,
  .phone-link {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 480px) {
  .header-top {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    height: auto;
    min-height: 120px;
  }
  
  .header-brand {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
  
  .action-button {
    width: 100%;
    max-width: 280px;
    padding: 1rem;
    font-size: 0.9rem;
  }
  
  .brand-icon {
    width: 36px;
    height: 36px;
  }
  
  .brand-icon :deep(.va-icon) {
    font-size: 18px;
  }
  
  .brand-title {
    font-size: 1.1rem;
    text-align: center;
  }
  
  .brand-subtitle {
    font-size: 0.8rem;
    text-align: center;
  }
  
  .collaborateurs-container {
    padding: 1rem 0.8rem;
  }
  
  .filters-card,
  .collaborateurs-card,
  .empty-card {
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1rem;
  }
  
  .filters-container {
    gap: 1rem;
  }
  
  .search-section,
  .filter-section {
    width: 100%;
  }
  
  .search-input,
  .filter-select {
    margin-bottom: 0.8rem;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-number {
    font-size: 1.4rem;
  }
  
  .stat-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  /* Stats mobile - largeur adaptée */
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }
  
  .stat-content {
    gap: 10px;
  }
  
  .stat-text {
    min-width: 0; /* Permet la compression du texte */
  }
  
  .stat-label {
    font-size: 0.7rem;
    line-height: 1.2;
  }

  /* Table responsive améliorée - Mobile très compact avec toutes les colonnes */
  .collaborateurs-card :deep(.va-data-table) {
    font-size: 0.7rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .collaborateurs-card :deep(.va-data-table__table) {
    min-width: 850px; /* Largeur pour toutes les colonnes - scroll horizontal */
    width: 850px;
    table-layout: fixed;
  }

  .collaborateurs-card :deep(.va-data-table__table th),
  .collaborateurs-card :deep(.va-data-table__table td) {
    padding: 0.3rem 0.15rem;
    font-size: 0.7rem;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    height: auto;
  }

  /* Largeurs fixes pour chaque colonne sur mobile */
  .collaborateurs-card :deep(.va-data-table__table th:nth-child(1)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(1)) {
    width: 170px;
    max-width: 170px;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(2)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(2)) {
    width: 120px;
    max-width: 120px;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(3)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(3)) {
    width: 180px;
    max-width: 180px;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(4)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(4)) {
    width: 150px;
    max-width: 150px;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(5)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(5)) {
    width: 140px;
    max-width: 140px;
  }

  .collaborateurs-card :deep(.va-data-table__table th:nth-child(6)),
  .collaborateurs-card :deep(.va-data-table__table td:nth-child(6)) {
    width: 90px;
    max-width: 90px;
  }

  .collaborateurs-card :deep(.va-data-table__table th:first-child),
  .collaborateurs-card :deep(.va-data-table__table td:first-child) {
    padding-left: 0.4rem;
  }

  .collaborateurs-card :deep(.va-data-table__table th:last-child),
  .collaborateurs-card :deep(.va-data-table__table td:last-child) {
    padding-right: 0.4rem;
  }

  /* Réduire drastiquement la hauteur des lignes */
  .collaborateurs-card :deep(.va-data-table__table tr) {
    height: auto !important;
    min-height: 28px !important;
  }

  .collaborateurs-card :deep(.va-data-table__table tbody tr) {
    min-height: 28px !important;
    height: 28px !important;
  }

  .action-btn {
    min-width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
    border-radius: 4px !important;
  }

  .action-btn :deep(.va-icon) {
    font-size: 0.9rem !important;
  }

  .collaborateur-avatar {
    width: 24px !important;
    height: 24px !important;
    font-size: 10px !important;
    border-radius: 4px !important;
  }

  .collaborateur-name {
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    line-height: 1 !important;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .collaborateur-info {
    gap: 0.3rem;
    align-items: center;
    min-height: 24px;
  }

  .email-link,
  .phone-link {
    font-size: 0.65rem !important;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 4px !important;
    border-radius: 3px !important;
  }

  .phone-cell,
  .email-cell {
    font-size: 0.65rem;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .no-email,
  .no-phone {
    font-size: 0.6rem !important;
  }

  .actions-cell {
    gap: 0.15rem;
    justify-content: center;
    min-width: 60px;
  }

  /* Amélioration des chips sur mobile - plus compacts */
  .collaborateurs-card :deep(.va-chip) {
    font-size: 0.6rem !important;
    padding: 0.1rem 0.3rem !important;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    height: auto !important;
    min-height: 16px !important;
    line-height: 1 !important;
  }

  .collaborateurs-card :deep(.va-chip .va-icon) {
    font-size: 0.6rem !important;
    margin-right: 0.1rem !important;
  }

  /* Conteneur du tableau mobile - scroll horizontal fluide */
  .collaborateurs-card {
    overflow-x: auto;
    padding: 0.6rem;
    -webkit-overflow-scrolling: touch;
    position: relative;
  }

  /* Pagination ultra compacte */
  .pagination-section {
    padding: 0.6rem;
    gap: 0.6rem;
  }

  .pagination-info {
    font-size: 0.7rem;
    margin: 0.3rem 0;
    text-align: center;
  }

  .collaborateurs-card :deep(.va-pagination) {
    font-size: 0.7rem;
  }

  .collaborateurs-card :deep(.va-pagination .va-button) {
    min-width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
    font-size: 0.7rem !important;
  }
}
</style>

<!-- Styles globaux pour forcer la couleur noire des inputs -->
<style>
/* UNIQUEMENT pour les inputs de filtres - pas les icônes de liste/badges */
.filters-section .search-input input,
.filters-section .search-input .va-input-wrapper input,
.filters-section .filter-select input,
.filters-section .filter-select .va-input-wrapper input {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.filters-section .search-input input::placeholder,
.filters-section .filter-select input::placeholder {
  color: #666666 !important;
  -webkit-text-fill-color: #666666 !important;
}

/* UNIQUEMENT les icônes dans les inputs de filtres */
.filters-section .search-input .va-input-wrapper .va-input__icons .va-icon,
.filters-section .filter-select .va-input-wrapper .va-input__icons .va-icon {
  color: #000000 !important;
}
</style>
