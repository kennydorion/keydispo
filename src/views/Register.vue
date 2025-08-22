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
          <h2>Créer un compte</h2>
          <p class="form-subtitle">Les comptes créés ont le rôle "viewer" par défaut</p>

          <form @submit.prevent="handleRegister" novalidate>
            <div class="form-group">
              <label for="displayName">Nom / Prénom</label>
              <input id="displayName" v-model="displayName" type="text" class="form-input" placeholder="Ex: Marie Dupont" required />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" v-model="email" type="email" class="form-input" placeholder="vous@email.com" required />
            </div>
            <div class="form-group">
              <label for="password">Mot de passe</label>
              <input id="password" v-model="password" type="password" class="form-input" placeholder="••••••••" required minlength="6" />
            </div>
            <div class="form-group">
              <label for="password2">Confirmer le mot de passe</label>
              <input id="password2" v-model="password2" type="password" class="form-input" placeholder="••••••••" required />
            </div>

            <button type="submit" class="submit-button" :disabled="isLoading">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>S'inscrire</span>
            </button>
          </form>

          <div v-if="error" class="error-message">{{ error }}</div>
          <div v-if="success" class="success-message">Compte créé ! Vous pouvez maintenant vous connecter.</div>

          <p class="switch-link">
            Déjà un compte ? <router-link to="/login">Connexion</router-link>
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AuthService } from '../services/auth'

const router = useRouter()

const displayName = ref('')
const email = ref('')
const password = ref('')
const password2 = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref(false)

async function handleRegister() {
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
    await AuthService.signUpWithEmail(email.value, password.value, displayName.value)
    success.value = true
    // Option: rediriger directement après une courte pause
    setTimeout(() => router.push('/login'), 1200)
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
</style>
