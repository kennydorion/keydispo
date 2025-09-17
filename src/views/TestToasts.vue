<template>
  <div class="toast-test-page">
    <div class="test-container">
      <h1>🧪 Test Toasts Vuestic UI - Z-Index Fix</h1>
      
      <div class="instructions">
        <h3>📋 Instructions</h3>
        <p>Testez les différents types de toasts pour vérifier qu'ils sont toujours visibles au-dessus de tous les éléments.</p>
      </div>

      <div class="test-section">
        <h3>🎯 Tests de Base Vuestic UI</h3>
        <va-button color="primary" @click="testBasicToast" class="test-btn">
          📢 Toast Basique
        </va-button>
        <va-button color="success" @click="testSuccessToast" class="test-btn">
          ✅ Toast Succès
        </va-button>
        <va-button color="warning" @click="testWarningToast" class="test-btn">
          ⚠️ Toast Avertissement
        </va-button>
        <va-button color="danger" @click="testErrorToast" class="test-btn">
          ❌ Toast Erreur
        </va-button>
      </div>

      <div class="test-section">
        <h3>🔒 Tests Multi-Utilisateur</h3>
        <va-button color="info" @click="testUserJoinToast" class="test-btn">
          👥 Utilisateur Connecté
        </va-button>
        <va-button color="info" @click="testUserLeaveToast" class="test-btn">
          👋 Utilisateur Déconnecté
        </va-button>
        <va-button color="primary" @click="testCollabToast" class="test-btn">
          🤝 Notification Collaborative
        </va-button>
      </div>

      <div class="test-section">
        <h3>🎲 Tests avec Éléments Z-Index Élevé</h3>
        <va-button color="secondary" @click="showHighZElement" class="test-btn">
          🎯 Afficher Élément Z-Index 5000
        </va-button>
        <va-button color="warning" @click="testMultipleToasts" class="test-btn">
          📚 Toasts Multiples
        </va-button>
        <va-button color="info" @click="testToastWithModal" class="test-btn">
          🪟 Toast + Modal
        </va-button>
      </div>

      <!-- Élément avec z-index élevé pour test -->
      <div v-if="showHighZElement_" class="high-z-element">
        <h3>🔴 Élément Z-Index 5000</h3>
        <p>Les toasts doivent apparaître AU-DESSUS de cet élément</p>
        <va-button color="secondary" @click="hideHighZElement">
          Masquer
        </va-button>
      </div>

      <!-- Modal de test -->
      <va-modal
        v-model="showModal"
        :hide-default-actions="true"
        max-width="500px"
        @before-open="modalA11y.onBeforeOpen"
        @open="modalA11y.onOpen"
        @close="modalA11y.onClose"
      >
        <div class="modal-content">
          <h3>🪟 Modal de Test</h3>
          <p>Cette modal teste l'interaction avec les toasts.</p>
          <div class="modal-buttons">
            <va-button color="primary" @click="testToastFromModal">
              📢 Toast depuis Modal
            </va-button>
            <va-button color="secondary" @click="showModal = false">
              Fermer
            </va-button>
          </div>
        </div>
      </va-modal>

      <div class="status">
        ✅ Page de test Vuestic UI chargée - Z-index fix actif
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'vuestic-ui'
import { useModalA11y } from '@/composables/useModalA11y'

const toast = useToast()
const showHighZElement_ = ref(false)
const showModal = ref(false)
const modalA11y = useModalA11y()

// Tests de base
function testBasicToast() {
  toast.notify({
    message: 'Toast basique - Test z-index Vuestic UI',
    color: 'info',
    duration: 4000,
    position: 'top-right'
  })
}

function testSuccessToast() {
  toast.notify({
    message: '✅ Opération réussie ! Toast visible ?',
    color: 'success',
    duration: 4000,
    position: 'top-right'
  })
}

function testWarningToast() {
  toast.notify({
    message: '⚠️ Attention : vérifiez la visibilité du toast',
    color: 'warning',
    duration: 5000,
    position: 'top-right'
  })
}

function testErrorToast() {
  toast.notify({
    message: '❌ Erreur : ce toast est-il caché ?',
    color: 'danger',
    duration: 5000,
    position: 'top-right'
  })
}

// Tests multi-utilisateur (simulation)
function testUserJoinToast() {
  toast.notify({
    message: '👤 Jean Dupont s\'est connecté au planning',
    color: 'success',
    duration: 3000,
    position: 'top-right'
  })
}

function testUserLeaveToast() {
  toast.notify({
    message: '👋 Marie Martin a quitté le planning',
    color: 'info',
    duration: 3000,
    position: 'top-right'
  })
}

function testCollabToast() {
  toast.notify({
    message: '🤝 Nouvelle activité collaborative détectée',
    color: 'primary',
    duration: 4000,
    position: 'top-right'
  })
}

// Tests avancés
function testMultipleToasts() {
  toast.notify({
    message: '📚 Toast 1/3 - Premier toast',
    color: 'info',
    duration: 6000,
    position: 'top-right'
  })
  
  setTimeout(() => {
    toast.notify({
      message: '📚 Toast 2/3 - Deuxième toast',
      color: 'warning',
      duration: 6000,
      position: 'top-right'
    })
  }, 1000)
  
  setTimeout(() => {
    toast.notify({
      message: '📚 Toast 3/3 - Troisième toast',
      color: 'success',
      duration: 6000,
      position: 'top-right'
    })
  }, 2000)
}

function showHighZElement() {
  showHighZElement_.value = true
  setTimeout(() => {
    toast.notify({
      message: '🎯 Ce toast doit être visible AU-DESSUS de l\'élément rouge !',
      color: 'warning',
      duration: 8000,
      position: 'top-right'
    })
  }, 1000)
}

function hideHighZElement() {
  showHighZElement_.value = false
}

function testToastWithModal() {
  showModal.value = true
  setTimeout(() => {
    toast.notify({
      message: '🪟 Toast avec modal ouverte - Visible ?',
      color: 'primary',
      duration: 6000,
      position: 'top-right'
    })
  }, 500)
}

function testToastFromModal() {
  toast.notify({
    message: '📢 Toast déclenché depuis une modal',
    color: 'success',
    duration: 4000,
    position: 'top-right'
  })
}
</script>

<style scoped>
.toast-test-page {
  min-height: 100vh;
  background: var(--dark-background, #1a1a1a);
  color: var(--dark-text-primary, #ffffff);
  padding: 20px;
}

.test-container {
  max-width: 900px;
  margin: 0 auto;
}

.instructions {
  background: var(--va-primary);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
}

.test-section {
  background: var(--dark-surface, #2a2a2a);
  border-radius: 12px;
  padding: 25px;
  margin: 25px 0;
  border: 1px solid var(--dark-border, #3a3a3a);
}

.test-section h3 {
  margin-top: 0;
  color: var(--va-primary);
}

.test-btn {
  margin: 8px;
}

.high-z-element {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(220, 38, 38, 0.95);
  color: white;
  padding: 40px;
  border-radius: 12px;
  z-index: 5000;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 2px solid #dc2626;
}

.modal-content {
  padding: 30px;
  text-align: center;
}

.modal-buttons {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.status {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: var(--va-success);
  color: white;
  padding: 12px 18px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 1000;
}

h1 {
  text-align: center;
  color: var(--va-primary);
  margin-bottom: 30px;
}
</style>
