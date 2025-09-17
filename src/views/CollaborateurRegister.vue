<template>
  <main class="auth-page" aria-label="Inscription collaborateur">
    <div class="auth-container">
      <header class="auth-header">
        <div class="brand-section">
          <img src="/keyplacement_logo_blanc.svg" alt="Logo Key Placement" class="brand-logo" />
          <p class="brand-sub">Activation compte collaborateur</p>
        </div>
      </header>

      <div class="auth-card">
        <div class="auth-form">
          <h2>Activer mon compte</h2>
          <p class="form-subtitle">Saisissez le code fourni par votre administrateur</p>

          <form v-if="step === 1" @submit.prevent="handleVerifyCode" novalidate>
            <div class="form-group">
              <label for="code">Code d'inscription</label>
              <input id="code" v-model="code" type="text" class="form-input" placeholder="Ex: AB3D7K92" required />
            </div>

            <button type="submit" class="submit-button" :disabled="isLoading || !code">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>Vérifier le code</span>
            </button>

            <div v-if="error" class="error-message">{{ error }}</div>
          </form>

          <form v-else @submit.prevent="handleCreatePassword" novalidate>
            <div class="info-box">
              <div class="info-row">
                <label>Collaborateur</label>
                <div class="info-value">{{ collabPrenom }} {{ collabNom }}</div>
              </div>
              <div class="info-row">
                <label>Email</label>
                <div class="info-value">{{ email }}</div>
              </div>
            </div>

            <div class="form-group">
              <label for="password">Créer un mot de passe</label>
              <input id="password" v-model="password" type="password" class="form-input" placeholder="••••••••" required minlength="6" />
            </div>
            <div class="form-group">
              <label for="password2">Confirmer le mot de passe</label>
              <input id="password2" v-model="password2" type="password" class="form-input" placeholder="••••••••" required />
            </div>

            <button type="submit" class="submit-button" :disabled="isLoading || !canSubmitPassword">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>Activer mon compte</span>
            </button>

            <div v-if="error" class="error-message">{{ error }}</div>
            <div v-if="success" class="success-message">Compte activé ! Redirection…</div>
          </form>

          <p class="switch-link">
            Déjà un compte ? <router-link to="/collaborateur/login">Connexion collaborateur</router-link>
          </p>
        </div>
      </div>
    </div>
  </main>
  
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { registrationCodesService } from '@/services/registrationCodes'
import { CollaborateursServiceV2 } from '@/services/collaborateursV2'
import { AuthService } from '@/services/auth'
import { AuthService as AuthApi } from '@/services/auth'

const router = useRouter()

const step = ref<1 | 2>(1)
const code = ref('')
const email = ref('')
const collabId = ref('')
const collabNom = ref('')
const collabPrenom = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref(false)
const password = ref('')
const password2 = ref('')

const canSubmitPassword = computed(() => password.value && password.value.length >= 6 && password.value === password2.value)

async function handleVerifyCode() {
  error.value = ''
  const raw = (code.value || '').trim().toUpperCase()
  if (!raw) return
  isLoading.value = true
  try {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const info = await registrationCodesService.getCode(tenantId, raw)
    if (!info) throw new Error('Code invalide')
    const now = Date.now()
    if (info.status !== 'active') throw new Error('Code non actif')
    if (info.expiresAt && now > info.expiresAt) throw new Error('Code expiré')

    // Charger le collaborateur pour récupérer son email
    const collab = await CollaborateursServiceV2.getCollaborateur(tenantId, info.collaborateurId)
    if (!collab) throw new Error('Collaborateur introuvable pour ce code')
    if (!collab.email) throw new Error("Email non défini pour ce collaborateur. Contactez votre administrateur.")

    email.value = collab.email
    collabId.value = collab.id!
    collabNom.value = collab.nom
    collabPrenom.value = collab.prenom
    step.value = 2
  } catch (e: any) {
    error.value = e?.message || 'Impossible de valider le code'
  } finally {
    isLoading.value = false
  }
}

async function handleCreatePassword() {
  error.value = ''
  success.value = false
  if (!canSubmitPassword.value) {
    error.value = 'Mot de passe invalide ou confirmation incorrecte'
    return
  }
  isLoading.value = true
  try {
    // Créer le compte avec l'email imposé
    const user = await AuthApi.signUpWithEmail(email.value, password.value, `${collabPrenom.value} ${collabNom.value}`)

    // Lier le code au compte créé
    const tenantId = AuthService.currentTenantId || 'keydispo'
    await registrationCodesService.consumeAndLink(tenantId, (code.value || '').trim().toUpperCase(), user.uid)

    success.value = true
    setTimeout(() => router.push('/collaborateur/dashboard'), 1000)
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      error.value = 'Un compte existe déjà pour cet email. Connectez-vous pour lier votre code.'
    } else {
      error.value = err?.message || 'Erreur lors de la création du compte'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#2e3440; padding:24px; }
.auth-container { width:100%; max-width:420px; display:flex; flex-direction:column; gap:32px; }
.brand-section { display:flex; flex-direction:column; align-items:center; gap:16px; }
.brand-logo { width:220px; height:auto; }
.brand-sub { color:#d8dee9; margin:0; font-weight:500; }
.auth-card { background:rgba(255,255,255,0.95); border-radius:20px; padding:32px; box-shadow:0 25px 50px rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,0.1); }
.auth-form h2 { margin:0 0 8px; text-align:center; color:#1e293b; }
.form-subtitle { text-align:center; color:#6B7280; margin:0 0 24px; font-size:.95rem; }
.form-group { margin-bottom:18px; }
.form-group label { display:block; font-size:.8rem; font-weight:600; color:#374151; margin-bottom:6px; }
.form-input { width:100%; padding:12px 14px; border:1px solid #d1d5db; border-radius:8px; background:#fff; font-size:1rem; outline:none; transition:border-color .2s, box-shadow .2s; }
.form-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
.submit-button { width:100%; padding:12px 16px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:1rem; font-weight:500; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px; min-height:48px; }
.submit-button:hover:not(:disabled) { background:#1d4ed8; }
.submit-button:disabled { background:#9ca3af; cursor:not-allowed; }
.error-message { margin-top:12px; color:#dc2626; font-size:.85rem; }
.success-message { margin-top:12px; color:#16a34a; font-size:.85rem; }
.switch-link { margin-top:24px; font-size:.85rem; text-align:center; color:#374151; }
.switch-link a { color:#2563eb; text-decoration:none; font-weight:600; }
.switch-link a:hover { text-decoration:underline; }
.loading-spinner { width:18px; height:18px; border:3px solid rgba(255,255,255,.4); border-top:3px solid #fff; border-radius:50%; animation:spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.info-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:12px 14px; margin-bottom:14px; }
.info-row { display:flex; justify-content:space-between; gap:12px; padding:6px 0; }
.info-row label { font-weight:600; color:#374151; font-size:.85rem; }
.info-value { color:#1f2937; }
</style>