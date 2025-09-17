<template>
  <div class="collaborateur-profil">
    <VaCard>
      <VaCardContent>
        <div class="row">
          <div class="flex md12">
            <h2 class="va-h2">Mon Profil</h2>
          </div>
        </div>

        <VaInnerLoading :loading="loading">
          <!-- Affichage en lecture seule des informations du collaborateur -->
          <div v-if="collaborateur" class="profil-display">
            <div class="row">
              <div class="flex md6 lg6">
                <div class="info-field">
                  <label>Nom</label>
                  <div class="info-value">{{ collaborateur.nom }}</div>
                </div>
              </div>
              <div class="flex md6 lg6">
                <div class="info-field">
                  <label>Prénom</label>
                  <div class="info-value">{{ collaborateur.prenom }}</div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="flex md6 lg6">
                <div class="info-field">
                  <label>Email</label>
                  <div class="info-value">{{ collaborateur.email || 'Non renseigné' }}</div>
                </div>
              </div>
              <div class="flex md6 lg6">
                <div class="info-field">
                  <label>Téléphone</label>
                  <div class="info-value">{{ collaborateur.phone || 'Non renseigné' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Message informatif -->
          <div class="development-notice">
            <div class="notice-icon">
              <span class="material-icons">info</span>
            </div>
            <div class="notice-content">
              <h4>Profil en lecture seule</h4>
              <p>La modification du profil sera disponible prochainement. Pour des changements urgents, contactez un administrateur.</p>
            </div>
          </div>
        </VaInnerLoading>
      </VaCardContent>
    </VaCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  VaCard, 
  VaCardContent, 
  VaInnerLoading,
  useToast
} from 'vuestic-ui'
import { CollaborateurSelfService } from '../services/collaborateurSelf'
import type { CollaborateurProfilLight } from '../services/collaborateurSelf'

const { init: initToast } = useToast()

// État des données
const loading = ref(false)
const collaborateur = ref<CollaborateurProfilLight | null>(null)

// Charger le profil
const chargerProfil = async () => {
  try {
    loading.value = true
    collaborateur.value = await CollaborateurSelfService.getMonProfil()
  } catch (error) {
    console.error('Erreur lors du chargement du profil:', error)
    initToast({ message: 'Erreur lors du chargement du profil', color: 'danger' })
  } finally {
    loading.value = false
  }
}

// Charger au montage
onMounted(() => {
  chargerProfil()
})
</script>

<style scoped>
.collaborateur-profil {
  max-width: 800px;
  margin: 0 auto;
}

.profil-display {
  margin-bottom: 2rem;
}

.info-field {
  margin-bottom: 1rem;
}

.info-field label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  display: block;
}

.info-value {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 1rem;
  color: #1f2937;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.development-notice {
  background: linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-top: 2rem;
}

.notice-icon {
  width: 40px;
  height: 40px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notice-icon .material-icons {
  font-size: 24px;
}

.notice-content h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e40af;
}

.notice-content p {
  margin: 0;
  font-size: 0.95rem;
  color: #1e3a8a;
  line-height: 1.5;
  opacity: 0.9;
}
</style>