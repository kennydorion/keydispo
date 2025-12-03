<template>
  <transition name="planning-warmup-fade">
    <div v-if="show" class="planning-warmup-overlay" role="status" aria-live="polite">
      <div class="warmup-card">
        <div class="warmup-glow"></div>
        
        <!-- Logo SVG animé -->
        <div class="logo-container">
          <KeyplacementLogo class="animated-logo" />
        </div>
        
        <!-- Message de bienvenue personnalisé -->
        <div class="warmup-text">
          <p class="warmup-title">Bonjour {{ userName }}</p>
          <p class="warmup-subtitle">Nous chargeons le planning</p>
        </div>
        
        <!-- Spinner simple -->
        <div class="simple-spinner">
          <div class="spinner-circle"></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import KeyplacementLogo from './KeyplacementLogo.vue'

defineProps<{
  show: boolean
  userName: string
}>()
</script>

<style scoped>
.planning-warmup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.warmup-card {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 48px 64px;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 90vw;
}

.warmup-glow {
  position: absolute;
  inset: -4px;
  border-radius: 28px;
  background: linear-gradient(45deg, #667eea, #764ba2, #667eea);
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
  z-index: -1;
  filter: blur(8px);
  opacity: 0.7;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.logo-container {
  width: 200px;
  height: 60px;
  margin: 0 auto 24px;
}

.logo-container :deep(.animated-logo) {
  width: 100%;
  height: 100%;
}

.warmup-text {
  margin-bottom: 24px;
}

.warmup-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
}

.warmup-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.simple-spinner {
  display: flex;
  justify-content: center;
}

.spinner-circle {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transition */
.planning-warmup-fade-enter-active,
.planning-warmup-fade-leave-active {
  transition: opacity 0.3s ease;
}

.planning-warmup-fade-enter-from,
.planning-warmup-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .warmup-card {
    padding: 32px 24px;
  }
  
  .logo-container {
    width: 160px;
    height: 48px;
  }
  
  .warmup-title {
    font-size: 20px;
  }
}
</style>
