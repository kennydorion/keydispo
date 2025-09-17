<template>
  <main class="auth-page" aria-label="Page d'inscription">
    <div class="auth-container">
      <header class="auth-header">
        <div class="brand-section">
          <img src="/keyplacement_logo_blanc.svg" alt="Logo Key Placement" class="brand-logo" />
          <p class="brand-sub">Gestion des disponibilités</p>
        </div>
      </header>

      <div class="auth-card">
        <div class="auth-form">
          <h2 v-if="!isCollaborateurRegister">Créer un compte</h2>
          <h2 v-else>Inscription collaborateur</h2>
          <p v-if="!isCollaborateurRegister" class="form-subtitle">Les comptes créés ont le rôle "viewer" par défaut</p>
          <p v-else class="form-subtitle">Saisissez le code fourni par votre administrateur</p>

          <!-- Formulaire admin - Étape 1 : Code secret -->
          <form v-if="!isCollaborateurRegister && adminStep === 1" @submit.prevent="handleVerifyAdminCode" novalidate>
            <div class="form-group">
              <label for="adminCode">Code secret admin</label>
              <input id="adminCode" v-model="adminCode" type="password" class="form-input" placeholder="Code d'accès administrateur" required />
              <small class="form-help">Demandez le code secret à votre administrateur principal</small>
            </div>

            <button type="submit" class="submit-button" :disabled="isLoading || !adminCode">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>Vérifier le code</span>
            </button>
          </form>

          <!-- Formulaire admin - Étape 2 : Inscription -->
          <form v-else-if="!isCollaborateurRegister && adminStep === 2" @submit.prevent="handleRegister" novalidate>
            <div class="form-group">
              <label for="displayName">Nom / Prénom</label>
              <input id="displayName" v-model="displayName" type="text" class="form-input" placeholder="Ex: Marie Dupont" required />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" v-model="email" type="email" class="form-input" placeholder="vous@email.com" required />
            </div>
            <div class="form-group">
              <label for="collabCode">Code d'inscription collaborateur (optionnel)</label>
              <input id="collabCode" v-model="collabCode" type="text" class="form-input" placeholder="Ex: AB3D7K92" />
              <small class="form-help">Laissez vide si vous créez un compte admin uniquement</small>
            </div>
            <div class="form-group">
              <label for="password">Mot de passe</label>
              <input id="password" v-model="password" type="password" class="form-input" placeholder="••••••••" required minlength="6" />
            </div>
            <div class="form-group">
              <label for="password2">Confirmer le mot de passe</label>
              <input id="password2" v-model="password2" type="password" class="form-input" placeholder="••••••••" required />
            </div>

            <button type="submit" class="submit-button" :disabled="isLoading || !configValid">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>Créer le compte admin</span>
            </button>
          </form>

          <!-- Formulaire collaborateur par code - Étape 1 -->
          <form v-else-if="collabStep === 1" @submit.prevent="handleVerifyCode" novalidate>
            <div class="form-group">
              <label for="code">Code d'inscription</label>
              <input id="code" v-model="collabCode" type="text" class="form-input" placeholder="Ex: AB3D7K92" required />
            </div>

            <button type="submit" class="submit-button" :disabled="isLoading || !collabCode">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>Vérifier le code</span>
            </button>
          </form>

          <!-- Formulaire collaborateur par code - Étape 2 -->
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
          </form>

          <div v-if="error" class="error-message">{{ error }}</div>
          <div v-if="!configValid && !isCollaborateurRegister" class="error-message" style="margin-top:8px;">
            Configuration Firebase invalide / incomplète ({{ missingVarsDisplay }}). Inscription désactivée.
          </div>
          <div v-if="success" class="success-message">
            <span v-if="!isCollaborateurRegister">Compte créé ! Vous pouvez maintenant vous connecter.</span>
            <span v-else>Compte activé ! Redirection…</span>
          </div>

          <p class="switch-link">
            Déjà un compte ?
            <template v-if="isCollaborateurRegister">
              <router-link to="/collaborateur/login">Connexion collaborateur</router-link>
            </template>
            <template v-else>
              <router-link to="/login">Connexion</router-link>
            </template>
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AuthService } from '../services/auth'
import { firebaseStatus } from '../services/firebase'
import { registrationCodesService } from '../services/registrationCodes'
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { InterfaceManager } from '../services/interfaceManager'
import { auth } from '../services/firebase'

const router = useRouter()
const route = useRoute()

const displayName = ref('')
const email = ref('')
const collabCode = ref('')
const password = ref('')
const password2 = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref(false)
const configValid = firebaseStatus.configValid
const missingVarsDisplay = firebaseStatus.missing.length ? firebaseStatus.missing.join(', ') : (firebaseStatus.fakeKey ? 'apiKey factice' : 'variables OK')
const isCollaborateurRegister = ref(false)
const isLoggedIn = ref(false)
const currentUid = ref<string | null>(null)

// Variables pour le flux collaborateur
const collabStep = ref<1 | 2>(1)
const collabId = ref('')
const collabNom = ref('')
const collabPrenom = ref('')

// Variables pour le flux admin
const adminStep = ref<1 | 2>(1)
const adminCode = ref('')
const ADMIN_SECRET_CODE = 'KPADMIN2025'

const canSubmitPassword = computed(() => password.value && password.value.length >= 6 && password.value === password2.value)

onMounted(() => {
  isCollaborateurRegister.value = route.path.includes('/collaborateur/')
  if (isCollaborateurRegister.value) {
    InterfaceManager.setTemporaryInterface('collaborateur')
    InterfaceManager.setLoginOrigin('collaborateur')
  } else {
    InterfaceManager.setTemporaryInterface('admin')
    InterfaceManager.setLoginOrigin('admin')
  }
  // État d'auth courant
  isLoggedIn.value = !!auth.currentUser
  currentUid.value = auth.currentUser?.uid ?? null
})

async function handleVerifyCode() {
  error.value = ''
  const raw = (collabCode.value || '').trim().toUpperCase()
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
    collabStep.value = 2
  } catch (e: any) {
    error.value = e?.message || 'Impossible de valider le code'
  } finally {
    isLoading.value = false
  }
}

async function handleVerifyAdminCode() {
  error.value = ''
  if (!adminCode.value) return
  
  if (adminCode.value.trim() !== ADMIN_SECRET_CODE) {
    error.value = 'Code secret administrateur incorrect'
    return
  }
  
  // Code correct, passer à l'étape 2
  adminStep.value = 2
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
    const user = await AuthService.signUpWithEmail(email.value, password.value, `${collabPrenom.value} ${collabNom.value}`)

    // Lier le code au compte créé
    const tenantId = AuthService.currentTenantId || 'keydispo'
    await registrationCodesService.consumeAndLink(tenantId, (collabCode.value || '').trim().toUpperCase(), user.uid)

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
}async function handleRegister() {
  error.value = ''
  success.value = false

  if (!displayName.value || !email.value || !password.value || !password2.value) {
    error.value = 'Tous les champs sont requis'
    return
  }
  if (password.value !== password2.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Mot de passe trop court (min 6 caractères)'
    return
  }

  isLoading.value = true
  try {
    // Prévalidation du code collaborateur (si fourni)
    const code = (collabCode.value || '').trim().toUpperCase()
    if (code) {
      try {
        const info = await registrationCodesService.getCode(AuthService.currentTenantId || 'keydispo', code)
        const now = Date.now()
        if (!info) throw new Error('Code invalide')
        if (info.status !== 'active') throw new Error('Code non actif')
        if (info.expiresAt && now > info.expiresAt) throw new Error('Code expiré')
      } catch (preErr: any) {
        error.value = preErr?.message || 'Code collaborateur invalide'
        return
      }
    }
    // Si déjà connecté: ne pas créer un nouveau compte
    if (auth.currentUser) {
      if (!code) {
        error.value = 'Vous êtes déjà connecté. Déconnectez-vous pour créer un nouveau compte ou saisissez un code collaborateur pour lier votre compte.'
        return
      }
      try {
        await registrationCodesService.consumeAndLink(AuthService.currentTenantId || 'keydispo', code, auth.currentUser.uid)
        success.value = true
        // Rediriger selon l’interface courante
        const target = route.path.includes('/collaborateur/') ? '/collaborateur/planning' : '/dashboard'
        setTimeout(() => router.push(target), 1200)
        return
      } catch (linkErr: any) {
        console.warn('Lien collaborateur échoué (compte existant):', linkErr)
        error.value = linkErr?.message || 'Code collaborateur invalide'
        return
      }
    }

    // Sinon: créer le compte puis lier le code si présent
    const user = await AuthService.signUpWithEmail(email.value, password.value, displayName.value)
    if (code) {
      try {
        await registrationCodesService.consumeAndLink(AuthService.currentTenantId || 'keydispo', code, user.uid)
      } catch (linkErr: any) {
        console.warn('Lien collaborateur échoué:', linkErr)
        error.value = linkErr?.message || 'Code collaborateur invalide'
        return
      }
    }
    success.value = true
    const targetLogin = route.path.includes('/collaborateur/') ? '/collaborateur/login' : '/login'
    setTimeout(() => router.push(targetLogin), 1200)
  } catch (err: any) {
    console.error('Register error', err)
    if (err.code === 'auth/email-already-in-use') error.value = 'Email déjà utilisé'
    else if (err.code === 'auth/invalid-email') error.value = 'Email invalide'
    else error.value = 'Erreur lors de la création du compte'
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
.form-help { display:block; font-size:.75rem; color:#6b7280; margin-top:4px; font-style:italic; }
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
