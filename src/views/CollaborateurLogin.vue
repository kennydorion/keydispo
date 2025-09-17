<template>
  <LoginForm />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import LoginForm from './Login.vue'
import { InterfaceManager } from '../services/interfaceManager'

onMounted(() => {
  // Forcer l'interface et l'origine collaborateur pour cette page
  InterfaceManager.setTemporaryInterface('collaborateur')
  InterfaceManager.setLoginOrigin('collaborateur')
})
</script>

<style scoped>
/* Aucun style supplémentaire, on réutilise Login */
</style>
