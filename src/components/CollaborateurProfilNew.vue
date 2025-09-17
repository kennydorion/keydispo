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
          <!-- Edition limitée du profil -->
          <div v-if="collaborateur" class="profil-display">
            <div class="row">
              <div class="flex md6 lg6">
                <div class="info-field">
                  <label>Nom</label>
                  <input v-model="form.nom" class="form-input" type="text" />
                </div>
              </div>
              <div class="flex md6 lg6">
                <div class="info-field">
                  <label>Prénom</label>
                  <input v-model="form.prenom" class="form-input" type="text" />
                </div>
              </div>
            </div>

            <div class="row">
              <div class="flex md6 lg6">
                <div class="info-field">
                  <label>Email (non modifiable)</label>
                  <div class="info-value">{{ collaborateur.email || 'Non renseigné' }}</div>
                </div>
              </div>
              <div class="flex md6 lg6">
                <div class="info-field">
                  <label>Téléphone</label>
                  <input v-model="form.phone" class="form-input" type="tel" />
                </div>
              </div>
            </div>

            <div class="actions">
              <button class="submit-button" :disabled="saving || !isValid" @click="save">
                <span v-if="saving" class="loading-spinner"></span>
                <span v-else>Enregistrer</span>
              </button>
            </div>
          </div>
        </VaInnerLoading>
      </VaCardContent>
    </VaCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  VaCard, 
  VaCardContent, 
  VaInnerLoading,
  useToast
} from 'vuestic-ui'
import { CollaborateurSelfService } from '../services/collaborateurSelf'
import { AuthService } from '@/services/auth'
import { CollaborateursServiceV2 } from '@/services/collaborateursV2'
import type { CollaborateurProfilLight } from '../services/collaborateurSelf'

const { init: initToast } = useToast()

// État des données
const loading = ref(false)
const collaborateur = ref<CollaborateurProfilLight | null>(null)
const form = ref<{ nom: string; prenom: string; phone: string | null }>({ nom: '', prenom: '', phone: '' })
const saving = ref(false)
const isValid = computed(() => !!form.value.nom && !!form.value.prenom)

// Charger le profil
const chargerProfil = async () => {
  try {
    loading.value = true
    collaborateur.value = await CollaborateurSelfService.getMonProfil()
  form.value = { nom: collaborateur.value.nom, prenom: collaborateur.value.prenom, phone: collaborateur.value.phone || '' }
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

// Sauvegarde limitée: nom, prénom, téléphone
const save = async () => {
  if (!collaborateur.value) return
  saving.value = true
  try {
    await CollaborateursServiceV2.updateCollaborateur(
      AuthService.currentTenantId || 'keydispo',
      collaborateur.value.id,
      { nom: form.value.nom, prenom: form.value.prenom, phone: form.value.phone || '' },
      'self'
    )
    await chargerProfil()
    initToast({ message: 'Profil mis à jour', color: 'success' })
  } catch (e) {
    console.error(e)
    initToast({ message: 'Erreur lors de la mise à jour', color: 'danger' })
  } finally {
    saving.value = false
  }
}
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

.form-input { width:100%; padding:12px 14px; border:1px solid #d1d5db; border-radius:8px; background:#fff; font-size:1rem; outline:none; }
.form-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
.actions { margin-top: 16px; display:flex; gap:12px; }
.submit-button { padding:10px 14px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
.submit-button:disabled { background:#9ca3af; cursor:not-allowed; }

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