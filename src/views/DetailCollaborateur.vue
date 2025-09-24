<template>
  <div class="detail-collaborateur">
    <!-- En-tête élégant moderne -->
    <header class="elegant-header">
      <div class="header-backdrop"></div>
      <div class="header-container">
        <div class="header-main">
          <div class="header-content">
            <div class="header-navigation">
              <va-button 
                preset="plain" 
                icon="arrow_back" 
                @click="retourListe"
                class="back-button"
              >
                <span class="back-text">Retour</span>
              </va-button>
            </div>
            
            <div class="header-title-section">
              <div class="title-icon-wrapper">
                <va-icon name="person" class="header-icon" />
              </div>
              <div class="title-content">
                <h1 class="page-title">
                  {{ collaborateur?.prenom }} {{ collaborateur?.nom }}
                </h1>
                <div class="header-meta" v-if="collaborateur">
                  <va-chip color="primary" size="small" class="metier-chip">
                    <va-icon name="work" size="small" />
                    {{ collaborateur.metier }}
                  </va-chip>
                  <span class="page-subtitle">Détails du collaborateur</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="header-actions">
            <va-button
              color="primary"
              preset="outline"
              icon="edit"
              @click="editCollaborateur"
              class="header-button"
            >
              Modifier
            </va-button>
            <va-button
              color="danger"
              preset="outline"
              @click="confirmerSuppression"
              class="header-button"
            >
              <va-icon name="delete" />
              Supprimer
            </va-button>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenu principal compact -->
    <div class="main-content" v-if="collaborateur">
      <div class="content-container">
        
        <!-- Grille des informations compacte -->
        <div class="info-grid">
          <!-- Contact -->
          <va-card class="info-card">
            <va-card-title class="card-title">
              <div class="title-with-icon">
                <div class="card-icon-wrapper">
                  <va-icon name="contact_mail" />
                </div>
                <span>Informations de contact</span>
              </div>
            </va-card-title>
            <va-card-content>
              <div class="contact-list">
                <div class="contact-item">
                  <div class="contact-icon">
                    <va-icon name="email" size="small" />
                  </div>
                  <div class="contact-details">
                    <div class="contact-label">Email</div>
                    <div class="contact-value">
                      <a v-if="collaborateur.email" :href="`mailto:${collaborateur.email}`" class="contact-link">
                        {{ collaborateur.email }}
                      </a>
                      <span v-else class="no-data">Pas d'email</span>
                    </div>
                  </div>
                </div>

                <div class="contact-item">
                  <div class="contact-icon">
                    <va-icon name="phone" size="small" />
                  </div>
                  <div class="contact-details">
                    <div class="contact-label">Téléphone</div>
                    <div class="contact-value">
                      <a v-if="collaborateur.phone" :href="`tel:${collaborateur.phone}`" class="contact-link">
                        {{ formatPhone(collaborateur.phone) }}
                      </a>
                      <span v-else class="no-data">Pas de téléphone</span>
                    </div>
                  </div>
                </div>

                <div class="contact-item">
                  <div class="contact-icon">
                    <va-icon name="palette" size="small" />
                  </div>
                  <div class="contact-details">
                    <div class="contact-label">Couleur</div>
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
              </div>
            </va-card-content>
          </va-card>

          <!-- Note -->
          <va-card v-if="collaborateur.note" class="info-card">
            <va-card-title class="card-title">
              <div class="title-with-icon">
                <div class="card-icon-wrapper">
                  <va-icon name="note" />
                </div>
                <span>Note</span>
              </div>
            </va-card-title>
            <va-card-content>
              <p class="note-text">{{ collaborateur.note }}</p>
            </va-card-content>
          </va-card>

          <!-- Statistiques -->
          <va-card class="info-card">
            <va-card-title class="card-title">
              <div class="title-with-icon">
                <div class="card-icon-wrapper">
                  <va-icon name="analytics" />
                </div>
                <span>Statistiques</span>
              </div>
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
          <va-card class="info-card">
            <va-card-title class="card-title">
              <div class="title-with-icon">
                <div class="card-icon-wrapper">
                  <va-icon name="flash_on" />
                </div>
                <span>Actions rapides</span>
              </div>
            </va-card-title>
            <va-card-content>
              <div class="actions-list">
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

          <!-- Codes d'inscription -->
          <va-card class="info-card">
            <va-card-title class="card-title">
              <div class="title-with-icon">
                <div class="card-icon-wrapper">
                  <va-icon name="vpn_key" />
                </div>
                <span>Code d'inscription collaborateur</span>
              </div>
            </va-card-title>
            <va-card-content>
              <div class="registration-section">
                <div class="registration-info">
                  <div class="registration-row">
                    <div class="registration-label">Code actuel</div>
                    <div class="registration-value">
                      <span v-if="registrationCode">{{ registrationCode }}</span>
                      <span v-else class="no-data">Aucun</span>
                    </div>
                  </div>
                  <div class="registration-row">
                    <div class="registration-label">Statut</div>
                    <div class="registration-value">
                      <va-chip :color="statusColor" size="small">{{ registrationStatusDisplay }}</va-chip>
                    </div>
                  </div>
                  <div class="registration-row" v-if="registrationExpiresAt">
                    <div class="registration-label">Expire le</div>
                    <div class="registration-value">{{ formatTimestamp(registrationExpiresAt) }}</div>
                  </div>
                </div>

                <div class="registration-actions">
                  <va-button color="primary" :loading="regLoading" @click="generateCode">
                    <va-icon name="auto_fix_high" />
                    Générer un code
                  </va-button>
                  <va-button preset="outline" :disabled="!registrationCode" @click="copyCode">
                    <va-icon name="content_copy" />
                    Copier
                  </va-button>
                  <va-button color="danger" preset="outline" :disabled="!registrationCode || registrationStatus !== 'active'" :loading="regLoading" @click="revokeCode">
                    <va-icon name="block" />
                    Révoquer
                  </va-button>
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <va-modal
      v-model="showDeleteModal"
      title="Confirmer la suppression"
      size="medium"
      :ok-text="'Supprimer'"
      :cancel-text="'Annuler'"
      @ok="supprimerCollaborateur"
      hide-default-actions
      @before-open="modalA11y.onBeforeOpen"
      @open="modalA11y.onOpen"
      @close="modalA11y.onClose"
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
import { DEFAULT_COLOR } from '../utils/collaborateurColors'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { registrationCodesService } from '../services/registrationCodes'
import { useModalA11y } from '@/composables/useModalA11y'

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
// Registration code reactive state
const registrationCode = ref<string | null>(null)
const registrationStatus = ref<'active' | 'used' | 'revoked' | 'expired' | 'none'>('none')
const registrationExpiresAt = ref<number | null>(null)
const regLoading = ref(false)
// Accessibilité modale
const modalA11y = useModalA11y()

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

const formatDate = (date: any) => {
  if (!date) return 'Non défini'
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date)
    return format(dateObj, 'dd MMMM yyyy', { locale: fr })
  } catch {
    return 'Date invalide'
  }
}

const formatTimestamp = (ts: number) => {
  try {
    return format(new Date(ts), 'dd MMM yyyy HH:mm', { locale: fr })
  } catch {
    return '—'
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
    
    
    
    // Essayer RTDB d'abord
    let collab = null
    try {
      collab = await CollaborateursServiceV2.getCollaborateurFromRTDB(tenantId, collaborateurId.value)
      
    } catch (rtdbError) {
      console.warn('⚠️ Erreur RTDB, tentative fallback:', rtdbError)
      // Fallback sur méthode alternative
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
    
    
    
    // TODO: Charger le nombre de disponibilités (placeholder)
    disponibilitesCount.value = 0

    // Charger le code d'inscription depuis RTDB (index côté collaborateur) si dispo
    try {
      const rc = (collab as any).registrationCode || null
      const rs = (collab as any).registrationStatus || 'none'
      const re = (collab as any).registrationExpiresAt || null
      registrationCode.value = rc
      registrationStatus.value = rs
      registrationExpiresAt.value = re
    } catch {}
    
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

const statusColor = computed(() => {
  switch (registrationStatus.value) {
    case 'active': return 'success'
    case 'used': return 'info'
    case 'revoked': return 'danger'
    case 'expired': return 'warning'
    default: return 'secondary'
  }
})

const registrationStatusDisplay = computed(() => {
  switch (registrationStatus.value) {
    case 'active': return 'Actif'
    case 'used': return 'Utilisé'
    case 'revoked': return 'Révoqué'
    case 'expired': return 'Expiré'
    default: return 'Aucun'
  }
})

const generateCode = async () => {
  if (!collaborateur.value) return
  try {
    regLoading.value = true
    const tenantId = AuthService.currentTenantId || 'keydispo'
    // Révoquer le code actuel s'il est actif
    if (registrationCode.value && registrationStatus.value === 'active') {
      try {
        await registrationCodesService.revoke(tenantId, registrationCode.value, auth.currentUser?.uid || 'system')
      } catch (e) {
        console.warn('Impossible de révoquer le code existant avant régénération')
      }
    }
    const res = await registrationCodesService.generateForCollaborateur(
      tenantId,
      collaborateur.value.id!,
      auth.currentUser?.uid || 'system',
      { expiresInDays: 7 }
    )
    registrationCode.value = res.code
    registrationStatus.value = res.status
    registrationExpiresAt.value = res.expiresAt || null
    notify({ message: `Code généré: ${res.code}`, color: 'success' })
  } catch (e: any) {
    notify({ message: e?.message || 'Erreur génération du code', color: 'danger' })
  } finally {
    regLoading.value = false
  }
}

const copyCode = async () => {
  if (!registrationCode.value) return
  try {
    await navigator.clipboard.writeText(registrationCode.value)
    notify({ message: 'Code copié dans le presse-papiers', color: 'success' })
  } catch {
    notify({ message: 'Impossible de copier le code', color: 'warning' })
  }
}

const revokeCode = async () => {
  if (!registrationCode.value) return
  try {
    regLoading.value = true
    const tenantId = AuthService.currentTenantId || 'keydispo'
    await registrationCodesService.revoke(tenantId, registrationCode.value, auth.currentUser?.uid || 'system')
    registrationStatus.value = 'revoked'
    notify({ message: 'Code révoqué', color: 'success' })
  } catch (e: any) {
    notify({ message: e?.message || 'Erreur révocation du code', color: 'danger' })
  } finally {
    regLoading.value = false
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
/* Variables et design moderne */
.detail-collaborateur {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --surface-light: #ffffff;
  --surface-secondary: #f8fafc;
  --border-light: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  
  min-height: 100vh;
  background: #f8fafc;
}

/* Header élégant avec gradient */
.elegant-header {
  position: relative;
  background: var(--primary-gradient);
  min-height: 200px;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.header-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
}

.header-container {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  z-index: 1;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex: 1;
}

.header-navigation {
  flex-shrink: 0;
}

.back-button {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.back-text {
  margin-left: 0.5rem;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.title-icon-wrapper {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-icon {
  font-size: 2rem;
  color: white;
}

.title-content h1.page-title {
  color: white;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.title-content .page-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  margin: 0.25rem 0 0 0;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.header-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.header-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Contenu principal compact */
.main-content {
  position: relative;
  background: #f8fafc;
  min-height: calc(100vh - 200px);
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.profile-section {
  margin-bottom: 2rem;
}

.profile-card {
  background: var(--surface-light);
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
}

.avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.profile-info {
  flex: 1;
}

.collaborateur-name {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  line-height: 1.2;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.metier-chip {
  font-weight: 600;
}

.page-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  margin: 0;
  font-weight: 400;
}

/* Grille des informations compacte */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.2rem;
}

@media (max-width: 600px) {
  .info-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

.info-card {
  background: var(--surface-light);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-light);
  transition: all 0.3s ease;
  overflow: hidden;
}

.info-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.card-title {
  background: var(--surface-secondary);
  border-bottom: 1px solid var(--border-light);
  padding: 1rem 1.2rem;
  margin: 0;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.3;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.card-icon-wrapper {
  background: var(--primary-gradient);
  border-radius: 10px;
  padding: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  min-width: 2rem;
  min-height: 2rem;
}

/* Contenu des cartes compact */
.contact-list,
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.2rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  background: var(--surface-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-light);
}

.contact-icon {
  background: var(--primary-gradient);
  border-radius: 10px;
  padding: 0.5rem;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
}

.contact-details {
  flex: 1;
  min-width: 0; /* Permet la réduction de la flex item */
  overflow: hidden;
}

.contact-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.contact-value {
  font-size: 1rem;
  color: var(--text-primary);
  word-wrap: break-word;
  overflow-wrap: break-word;
  text-overflow: ellipsis;
  overflow: hidden;
}

.contact-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  display: inline-block;
  max-width: 100%;
}

.contact-link:hover {
  color: #764ba2;
  text-decoration: underline;
}

.no-data {
  color: var(--text-muted);
  font-style: italic;
}

/* Indicateur de couleur */
.color-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-swatch {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 6px;
  box-shadow: var(--shadow-sm);
  border: 2px solid white;
}

.color-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Note */
.note-text {
  margin: 0;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  padding: 1.5rem;
  background: var(--surface-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-light);
}

/* Statistiques compactes */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  padding: 1.2rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: var(--surface-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-light);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 0.5rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.3;
}

/* Actions */
.action-button {
  justify-content: flex-start;
  width: 100%;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

/* Section d'inscription compacte */
.registration-section {
  padding: 1.2rem;
}

.registration-info {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.registration-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.8rem;
  padding: 0.8rem;
  background: var(--surface-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-light);
  flex-wrap: wrap;
}

.registration-label {
  font-weight: 600;
  color: var(--text-secondary);
  word-wrap: break-word;
  overflow-wrap: break-word;
  flex-shrink: 0;
}

.registration-value {
  color: var(--text-primary);
  font-weight: 500;
  word-wrap: break-word;
  overflow-wrap: break-word;
  text-align: right;
  min-width: 0;
}

.registration-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.registration-actions .va-button {
  border-radius: 12px;
  font-weight: 600;
}

/* Responsive Design - Mobile First et optimisé */
@media (max-width: 768px) {
  .elegant-header {
    min-height: 160px;
  }
  
  .header-container {
    padding: 1.5rem;
  }
  
  .header-main {
    flex-direction: column;
    gap: 1.5rem;
    align-items: flex-start;
  }
  
  .header-content {
    width: 100%;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .header-navigation {
    width: 100%;
  }
  
  .header-title-section {
    width: 100%;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
    gap: 0.8rem;
  }
  
  .content-container {
    padding: 1.5rem 1rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .card-title {
    padding: 1rem;
  }
}

/* Modal de suppression compact */
.delete-modal-content {
  text-align: center;
  padding: 1.5rem;
}

.delete-title {
  font-size: 1.3rem;
  margin: 1rem 0;
  color: var(--text-primary);
  font-weight: 600;
}

.delete-text {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
  font-size: 0.95rem;
}

.delete-actions {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
}

@media (max-width: 480px) {
  .elegant-header {
    min-height: 140px;
  }
  
  .header-container {
    padding: 1rem;
  }
  
  .header-main {
    gap: 1rem;
  }
  
  .header-content {
    gap: 0.8rem;
  }
  
  .title-content h1.page-title {
    font-size: 1.3rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
    line-height: 1.2;
  }
  
  .header-meta {
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .page-subtitle {
    font-size: 0.8rem;
  }
  
  .metier-chip {
    font-size: 0.8rem;
    padding: 0.3rem 0.8rem;
  }
  
  .header-actions {
    gap: 0.6rem;
  }
  
  .header-button {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
  
  .content-container {
    padding: 1rem 0.8rem;
  }
  
  .info-grid {
    gap: 0.8rem;
  }
  
  .card-title {
    padding: 0.8rem 1rem;
  }
  
  .contact-list,
  .actions-list {
    padding: 1rem;
    gap: 0.8rem;
  }
  
  .stats-grid {
    padding: 1rem;
    gap: 0.8rem;
    grid-template-columns: 1fr;
  }
  
  .stat-item {
    padding: 0.8rem;
  }
  
  .title-with-icon {
    font-size: 0.9rem;
    gap: 0.8rem;
  }
  
  .contact-item {
    padding: 0.8rem;
  }
  
  .action-button {
    width: 100%;
    justify-content: center;
  }
  
  .registration-section {
    padding: 1rem;
  }
  
  .registration-row {
    padding: 0.6rem;
  }
  
  .delete-actions {
    flex-direction: column;
    gap: 0.6rem;
  }
}
</style>
