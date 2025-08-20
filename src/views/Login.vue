<template>
  <div class="login-page">
    <va-card class="login-card">
      <va-card-title>
        <h2>Connexion</h2>
      </va-card-title>
      <va-card-content>
        <va-input v-model="email" type="email" label="Email" class="mb-3" />
        <va-input v-model="password" type="password" label="Mot de passe" class="mb-3" />
        <div class="actions">
          <va-button :loading="loading" color="primary" @click="loginEmail">Se connecter</va-button>
          <va-button :loading="loading" color="secondary" preset="outline" @click="loginGoogle">Google</va-button>
        </div>
        <va-alert v-if="error" color="danger" outline class="mt-3">{{ error }}</va-alert>
      </va-card-content>
    </va-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { AuthService } from '../services/auth'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function loginEmail() {
  error.value = ''
  loading.value = true
  try {
    await AuthService.signInWithEmail(email.value, password.value)
    redirectAfterLogin()
  } catch (e: any) {
    error.value = e?.message || 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}

async function loginGoogle() {
  error.value = ''
  loading.value = true
  try {
    await AuthService.signInWithGoogle()
    redirectAfterLogin()
  } catch (e: any) {
    error.value = e?.message || 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}

function redirectAfterLogin() {
  const redirect = (route.query.redirect as string) || '/semaine'
  router.replace(redirect)
}
</script>

<style scoped>
.login-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.login-card { max-width: 420px; width: 100%; }
.actions { display: flex; gap: 12px; }
</style>
