<template>
  <div class="detail-collaborateur">
    <!-- En-tête -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-left">
          <va-button 
            preset="plain" 
            icon="arrow_back" 
            @click="retourListe"
            class="back-button"
          >
            Retour
          </va-button>
          <div class="header-info">
            <h1 class="page-title">
              <va-icon name="person" class="title-icon" />
              {{ collaborateur?.prenom }} {{ collaborateur?.nom }}
            </h1>
            <p class="page-subtitle">
              Détails du collaborateur
            </p>
          </div>
        </div>
        <div class="header-actions">
          <va-button
            color="primary"
            preset="outline"
            icon="edit"
            @click="editCollaborateur"
          >
            Modifier
          </va-button>
          <va-button
            color="danger"
            preset="outline"
            @click="confirmerSuppression"
          >
            <va-icon name="delete" class="mr-2" />
            Supprimer
          </va-button>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <div class="page-content" v-if="collaborateur">
      <div class="detail-container">
        <!-- Informations principales -->
        <va-card class="main-info-card">
          <va-card-content>
            <div class="collaborateur-header">
              <div 
                class="collaborateur-avatar-large"
                :style="{ backgroundColor: collaborateur.color || DEFAULT_COLOR }"
              >
                {{ getInitials(collaborateur) }}
              </div>
              <div class="collaborateur-info">
                <h2 class="collaborateur-name">{{ collaborateur.prenom }} {{ collaborateur.nom }}</h2>
                <va-chip color="primary" size="large" class="metier-chip">
                  <va-icon name="work" size="small" class="mr-2" />
                  {{ collaborateur.metier }}
                </va-chip>
              </div>
            </div>
          </va-card-content>
        </va-card>

        <!-- Détails des contacts -->
        <va-card class="contact-card">
          <va-card-title>
            <va-icon name="contact_mail" class="mr-2" />
            Informations de contact
          </va-card-title>
          <va-card-content>
            <div class="contact-grid">
              <div class="contact-item">
                <div class="contact-label">
                  <va-icon name="email" class="contact-icon" />
                  Email
                </div>
                <div class="contact-value">
                  <a v-if="collaborateur.email" :href="`mailto:${collaborateur.email}`" class="email-link">
                    {{ collaborateur.email }}
                  </a>
                  <span v-else class="no-data">Pas d'email</span>
                </div>
              </div>

              <div class="contact-item">
                <div class="contact-label">
                  <va-icon name="phone" class="contact-icon" />
                  Téléphone
                </div>
                <div class="contact-value">
                  <a v-if="collaborateur.phone" :href="`tel:${collaborateur.phone}`" class="phone-link">
                    {{ formatPhone(collaborateur.phone) }}
                  </a>
                  <span v-else class="no-data">Pas de téléphone</span>
                </div>
              </div>

              <div class="contact-item">
                <div class="contact-label">
                  <va-icon name="palette" class="contact-icon" />
                  Couleur
                </div>
                <div class="contact-value">
                  <div class="color-indicator">
                    <div 
                      class="color-swatch" 
                      :style="{ backgroundColor: collaborateur.color || DEFAULT_COLOR }"
                    ></div>
                    <span class="color-text">Couleur d'identification</span>
                  </div>
                </div>
              </div>
            </div>
          </va-card-content>
        </va-card>

        <!-- Note -->
        <va-card v-if="collaborateur.note" class="note-card">
          <va-card-title>
            <va-icon name="note" class="mr-2" />
            Note
          </va-card-title>
          <va-card-content>
            <p class="note-text">{{ collaborateur.note }}</p>
          </va-card-content>
        </va-card>

        <!-- Statistiques -->
        <va-card class="stats-card">
          <va-card-title>
            <va-icon name="analytics" class="mr-2" />
            Statistiques
          </va-card-title>
          <va-card-content>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ disponibilitesCount }}</div>
                <div class="stat-label">Disponibilités</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ formatDate(collaborateur.createdAt) }}</div>
                <div class="stat-label">Créé le</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ formatDate(collaborateur.updatedAt) }}</div>
                <div class="stat-label">Dernière modification</div>
              </div>
            </div>
          </va-card-content>
        </va-card>

        <!-- Actions rapides -->
        <va-card class="actions-card">
          <va-card-title>
            <va-icon name="flash_on" class="mr-2" />
            Actions rapides
          </va-card-title>
          <va-card-content>
            <div class="quick-actions">
              <va-button
                preset="outline"
                icon="calendar_month"
                @click="voirDisponibilites"
                size="large"
                class="action-button"
              >
                Voir les disponibilités
              </va-button>
              <va-button
                preset="outline"
                icon="email"
                @click="envoyerEmail"
                size="large"
                class="action-button"
                :disabled="!collaborateur.email"
              >
                Envoyer un email
              </va-button>
            </div>
          </va-card-content>
        </va-card>
      </div>
    </div>

    <!-- Loading state -->
    <va-inner-loading :loading="loading" class="loading-container">
      <div class="loading-content">
        <p>Chargement du collaborateur...</p>
      </div>
    </va-inner-loading>

    <!-- Modal de confirmation de suppression -->
    <va-modal
      v-model="showDeleteModal"
      title="Confirmer la suppression"
      size="medium"
      :ok-text="'Supprimer'"
      :cancel-text="'Annuler'"
      @ok="supprimerCollaborateur"
      hide-default-actions
    >
      <div class="delete-modal-content">
        <va-icon name="warning" color="danger" size="48px" class="mb-4" />
        <h3 class="delete-title">Êtes-vous sûr de vouloir supprimer ce collaborateur ?</h3>
        <p class="delete-text">
          Cette action supprimera définitivement <strong>{{ collaborateur?.prenom }} {{ collaborateur?.nom }}</strong> 
          de votre liste de collaborateurs. Cette action est irréversible.
        </p>
        <div class="delete-actions">
          <va-button color="secondary" @click="showDeleteModal = false">
            Annuler
          </va-button>
          <va-button color="danger" @click="supprimerCollaborateur" :loading="deleting">
            <va-icon name="delete" class="mr-2" />
            Supprimer définitivement
          </va-button>
        </div>
      </div>
    </va-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vuestic-ui'
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { AuthService } from '../services/auth'
import { auth } from '../services/firebase'
import { formatPhone } from '../utils/phoneFormatter'
import { getUserInitials } from '../services/avatarUtils'
import { DEFAULT_COLOR } from '../utils/collaborateurColors'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Types
interface Collaborateur {
  id?: string
  nom: string
  prenom: string
  email: string | null
  phone: string | null
  metier: string
  note: string | null
  color?: string
  tenantId?: string
  actif?: boolean
  createdAt?: any
  updatedAt?: any
  version?: number
}

// Composables
const route = useRoute()
const router = useRouter()
const { notify } = useToast()

// Reactive data
const collaborateur = ref<Collaborateur | null>(null)
const loading = ref(true)
const deleting = ref(false)
const showDeleteModal = ref(false)
const disponibilitesCount = ref(0)

// Computed
const collaborateurId = computed(() => route.params.id as string)

// Methods
const retourListe = () => {
  router.push('/collaborateurs')
}

const editCollaborateur = () => {
  router.push(`/collaborateurs/${collaborateurId.value}`)
}

const confirmerSuppression = () => {
  showDeleteModal.value = true
}

const getInitials = (collab: Collaborateur) => {
  return getUserInitials({
    nom: collab.nom,
    prenom: collab.prenom,
    email: collab.email || ''
  })
}

const formatDate = (date: any) => {
  if (!date) return 'Non défini'
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date)
    return format(dateObj, 'dd MMMM yyyy', { locale: fr })
  } catch {
    return 'Date invalide'
  }
}

const voirDisponibilites = () => {
  if (collaborateur.value) {
    // Naviguer vers le planning avec filtre du collaborateur
    const queryParams = {
      collaborateur: `${collaborateur.value.prenom} ${collaborateur.value.nom}`
    }
    router.push({ 
      path: '/semaine', 
      query: queryParams 
    })
  }
}

const envoyerEmail = () => {
  if (collaborateur.value?.email) {
    window.open(`mailto:${collaborateur.value.email}`)
  }
}

const loadCollaborateur = async () => {
  try {
    loading.value = true
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    console.log('🔄 Chargement collaborateur:', collaborateurId.value, 'tenant:', tenantId)
    
    // Essayer RTDB d'abord
    let collab = null
    try {
      collab = await CollaborateursServiceV2.getCollaborateurFromRTDB(tenantId, collaborateurId.value)
      console.log('✅ Collaborateur RTDB trouvé:', collab)
    } catch (rtdbError) {
      console.warn('⚠️ Erreur RTDB, tentative Firestore:', rtdbError)
      // Fallback sur Firestore
      collab = await CollaborateursServiceV2.getCollaborateur(tenantId, collaborateurId.value)
    }
    
    if (!collab) {
      console.error('❌ Collaborateur non trouvé')
      notify({
        message: 'Collaborateur introuvable',
        color: 'danger'
      })
      router.push('/collaborateurs')
      return
    }
    
    collaborateur.value = {
      ...collab,
      email: collab.email || '',
      phone: collab.phone || '',
      note: collab.note || ''
    }
    
    console.log('✅ Collaborateur chargé:', collaborateur.value)
    
    // TODO: Charger le nombre de disponibilités
    disponibilitesCount.value = 0 // Placeholder pour l'instant
    
  } catch (error) {
    console.error('❌ Erreur chargement collaborateur:', error)
    notify({
      message: 'Erreur lors du chargement du collaborateur',
      color: 'danger'
    })
    router.push('/collaborateurs')
  } finally {
    loading.value = false
  }
}

const supprimerCollaborateur = async () => {
  try {
    deleting.value = true
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    await CollaborateursServiceV2.deleteCollaborateur(
      tenantId,
      collaborateurId.value,
      auth.currentUser?.uid || ''
    )

    notify({
      message: `Collaborateur ${collaborateur.value?.prenom} ${collaborateur.value?.nom} supprimé avec succès`,
      color: 'success'
    })

    router.push('/collaborateurs')
  } catch (error) {
    console.error('❌ Erreur suppression collaborateur:', error)
    notify({
      message: 'Erreur lors de la suppression du collaborateur',
      color: 'danger'
    })
  } finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadCollaborateur()
})
</script>

<style scoped>
.detail-collaborateur {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--va-background-primary);
}

.page-header {
  background: var(--va-background-secondary);
  border-bottom: 1px solid var(--va-background-border);
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 0;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-button {
  color: var(--va-primary);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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

.page-content {
  padding: 16px;
  width: 100%;
}

.detail-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.main-info-card {
  grid-column: 1 / -1;
  background: var(--va-background-secondary);
  border-radius: 8px;
  border: 1px solid var(--va-background-border);
}

.collaborateur-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.collaborateur-avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  flex-shrink: 0;
}

.collaborateur-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collaborateur-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--va-text-primary);
}

.metier-chip {
  align-self: flex-start;
}

.contact-card,
.note-card,
.stats-card,
.actions-card {
  background: var(--va-background-secondary);
  border-radius: 8px;
  border: 1px solid var(--va-background-border);
}

.contact-card .va-card-content,
.note-card .va-card-content,
.stats-card .va-card-content,
.actions-card .va-card-content {
  padding: 16px;
}

.contact-card .va-card-title,
.note-card .va-card-title,
.stats-card .va-card-title,
.actions-card .va-card-title {
  padding: 16px 16px 8px;
  margin-bottom: 0;
}

.contact-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.contact-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contact-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--va-text-secondary);
  font-size: 0.875rem;
}

.contact-icon {
  font-size: 1rem;
}

.contact-value {
  font-size: 1rem;
}

.email-link,
.phone-link {
  color: var(--va-primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.email-link:hover,
.phone-link:hover {
  text-decoration: underline;
}

.no-data {
  color: var(--va-text-secondary);
  font-style: italic;
}

.note-text {
  margin: 0;
  line-height: 1.6;
  color: var(--va-text-primary);
  white-space: pre-wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--va-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--va-text-secondary);
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-button {
  justify-content: flex-start;
  width: 100%;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.loading-content {
  text-align: center;
  color: var(--va-text-secondary);
}

.delete-modal-content {
  text-align: center;
  padding: 16px;
}

.delete-title {
  font-size: 1.25rem;
  margin: 16px 0;
  color: var(--va-text-primary);
}

.delete-text {
  color: var(--va-text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.delete-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .page-content {
    padding: 12px;
  }

  .detail-container {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .collaborateur-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .collaborateur-avatar-large {
    width: 48px;
    height: 48px;
    font-size: 1.25rem;
  }

  .collaborateur-name {
    font-size: 1.25rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Indicateur de couleur */
.color-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2px solid var(--va-background-secondary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-text {
  font-size: 0.9rem;
  color: var(--va-text-secondary);
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.25rem;
  }

  .collaborateur-name {
    font-size: 1rem;
  }

  .page-content {
    padding: 8px;
  }

  .stats-section,
  .filters-section,
  .collaborateurs-section {
    padding: 8px;
  }
}
</style>
