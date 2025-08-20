<template>
  <div class="import-dispos">
    <va-card class="import-card">
      <va-card-title>
        <h2>📥 Import Excel - Disponibilités</h2>
        <p class="subtitle">Structure attendue: onglet "Dispos" avec colonnes Nom/Prénom/METIER + dates en colonnes</p>
      </va-card-title>

      <va-card-content>
        <!-- Alerte mode émulateur -->
        <va-alert v-if="isEmulatorMode" color="info" outline class="mb-4">
          <va-icon name="science" class="mr-2" />
          <strong>Mode Émulateur</strong> - Tests uniquement, aucune donnée en production
        </va-alert>

        <!-- Étape 1: Sélection du fichier -->
        <div v-if="step === 'select'" class="step-content">
          <h3>📄 Sélectionner le fichier Excel</h3>
          
          <!-- Input file simple et fiable -->
          <div class="file-input-container">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls"
              @change="onFileSelected"
              style="display: none"
            />
            
            <va-card 
              :color="selectedFile.length > 0 ? 'success' : 'secondary'"
              stripe
              outlined
              class="file-dropzone"
              @click="fileInput?.click()"
            >
              <va-card-content class="text-center">
                <va-icon 
                  :name="selectedFile.length > 0 ? 'check_circle' : 'cloud_upload'" 
                  size="3rem" 
                  :color="selectedFile.length > 0 ? 'success' : 'secondary'"
                />
                
                <h4 v-if="selectedFile.length === 0">
                  Cliquez pour sélectionner un fichier Excel
                </h4>
                <h4 v-else class="text-success">
                  ✅ {{ selectedFile[0]?.name }}
                </h4>
                
                <p class="text-secondary">
                  Formats acceptés: .xlsx, .xls
                </p>
              </va-card-content>
            </va-card>
          </div>
          
          <div class="actions">
            <va-button 
              :disabled="!hasFile" 
              @click="parseFile"
              color="primary"
              :loading="parsing"
            >
              📊 Analyser le fichier
            </va-button>
          </div>
        </div>

        <!-- Étape 2: Aperçu et validation -->
        <div v-if="step === 'preview'" class="step-content">
          <h3>👀 Aperçu des données</h3>
          
          <!-- Statistiques -->
          <div class="stats-grid">
            <va-card color="success" stripe>
              <va-card-content>
                <div class="stat">
                  <h4>{{ parseResult.stats.collaborateursUniques }}</h4>
                  <p>Collaborateurs</p>
                </div>
              </va-card-content>
            </va-card>
            
            <va-card color="info" stripe>
              <va-card-content>
                <div class="stat">
                  <h4>{{ parseResult.stats.validRows }}</h4>
                  <p>Disponibilités</p>
                </div>
              </va-card-content>
            </va-card>
            
            <va-card color="warning" stripe>
              <va-card-content>
                <div class="stat">
                  <h4>{{ parseResult.stats.warnings.length }}</h4>
                  <p>Avertissements</p>
                </div>
              </va-card-content>
            </va-card>
          </div>

          <!-- Avertissements -->
          <va-alert v-if="parseResult.stats.warnings.length > 0" color="warning" outline class="mt-4">
            <h4>⚠️ Avertissements détectés:</h4>
            <ul>
              <li v-for="warning in parseResult.stats.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </va-alert>

          <!-- Erreurs de validation -->
          <va-alert v-if="validationResult.errors.length > 0" color="danger" outline class="mt-4">
            <h4>❌ Erreurs bloquantes:</h4>
            <ul>
              <li v-for="error in validationResult.errors" :key="error">{{ error }}</li>
            </ul>
          </va-alert>

          <!-- Aperçu des données -->
          <div v-if="parseResult.data.length > 0" class="mt-4">
            <h4>📋 Aperçu des premières données ({{ Math.min(5, parseResult.data.length) }}/{{ parseResult.data.length }})</h4>
            
            <va-data-table
              :items="previewData"
              :columns="previewColumns"
              no-data-html="Aucune donnée"
              class="preview-table"
            />
          </div>

          <!-- Actions -->
          <div class="actions">
            <va-button @click="step = 'select'" color="secondary">
              ← Retour
            </va-button>
            
            <va-button 
              @click="startImport"
              color="primary"
              :disabled="!validationResult.isValid"
              :loading="importing"
            >
              🚀 Lancer l'import
            </va-button>
          </div>
        </div>

        <!-- Étape 3: Import en cours -->
        <div v-if="step === 'importing'" class="step-content">
          <h3>⚙️ Import en cours...</h3>
          
          <div class="progress-section">
            <va-progress-bar 
              :value="progressPercent" 
              :color="progressColor"
              class="progress-bar"
            />
            
            <div class="progress-text">
              {{ currentProgress.message }}
            </div>
            
            <div class="progress-details">
              {{ currentProgress.current }} / {{ currentProgress.total }}
            </div>
          </div>
        </div>

        <!-- Étape 4: Résultats -->
        <div v-if="step === 'completed'" class="step-content">
          <h3>✅ Import terminé!</h3>
          
          <div class="results-grid">
            <va-card color="success" stripe>
              <va-card-content>
                <div class="stat">
                  <h4>{{ importStats.collaborateursCreated }}</h4>
                  <p>Collaborateurs créés</p>
                </div>
              </va-card-content>
            </va-card>
            
            <va-card color="info" stripe>
              <va-card-content>
                <div class="stat">
                  <h4>{{ importStats.disposCreated }}</h4>
                  <p>Disponibilités créées</p>
                </div>
              </va-card-content>
            </va-card>
            
            <va-card color="secondary" stripe>
              <va-card-content>
                <div class="stat">
                  <h4>{{ Math.round(importStats.duration / 1000) }}s</h4>
                  <p>Durée d'import</p>
                </div>
              </va-card-content>
            </va-card>
          </div>

          <!-- Erreurs d'import -->
          <va-alert v-if="importStats.errors.length > 0" color="danger" outline class="mt-4">
            <h4>❌ Erreurs durant l'import:</h4>
            <ul>
              <li v-for="error in importStats.errors" :key="error">{{ error }}</li>
            </ul>
          </va-alert>

          <!-- Actions finales -->
          <div class="actions">
            <va-button @click="resetImport" color="secondary">
              🔄 Nouvel import
            </va-button>
            
            <va-button @click="goToPlanning" color="primary">
              📅 Voir le planning
            </va-button>
          </div>
        </div>
      </va-card-content>
    </va-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { parseWorkbook } from './parseWorkbook'
import { importToFirestore, validateImportData } from './importToFirestore'
import type { ParseResult, ImportStats, ImportProgress, NormalizedRow } from './types'

const router = useRouter()

// Refs
const fileInput = ref<HTMLInputElement>()

// État du composant
const step = ref<'select' | 'preview' | 'importing' | 'completed'>('select')
const selectedFile = ref<File[]>([])
const parsing = ref(false)
const importing = ref(false)

// Données de parsing
const parseResult = ref<ParseResult>({
  data: [],
  stats: { totalRows: 0, validRows: 0, collaborateursUniques: 0, warnings: [] }
})

const validationResult = ref({
  isValid: false,
  warnings: [] as string[],
  errors: [] as string[]
})

// Progression et résultats
const currentProgress = ref<ImportProgress>({
  phase: 'processing',
  current: 0,
  total: 1,
  message: 'Initialisation...'
})

const importStats = ref<ImportStats>({
  collaborateursCreated: 0,
  collaborateursMerged: 0,
  disposCreated: 0,
  disposMerged: 0,
  errors: [],
  duration: 0
})

// Computed
const isEmulatorMode = computed(() => {
  const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  return isLocalhost && import.meta.env.VITE_USE_EMULATOR === '1'
})

const hasFile = computed(() => {
  const result = selectedFile.value.length > 0
  console.log('🔍 hasFile check:', {
    length: selectedFile.value.length,
    hasFile: result,
    files: selectedFile.value
  })
  return result
})

const progressPercent = computed(() => {
  if (currentProgress.value.total === 0) return 0
  return Math.round((currentProgress.value.current / currentProgress.value.total) * 100)
})

const progressColor = computed(() => {
  switch (currentProgress.value.phase) {
    case 'processing': return 'info'
    case 'collaborateurs': return 'warning'
    case 'disponibilites': return 'primary'
    case 'completed': return 'success'
    default: return 'info'
  }
})

const previewData = computed(() => {
  return parseResult.value.data.slice(0, 5).map((row: NormalizedRow) => ({
    collaborateur: `${row.prenom} ${row.nom}`,
    metier: row.metier,
    date: row.date,
    lieu: row.lieu || '-',
    heure_debut: row.heure_debut || '-',
    heure_fin: row.heure_fin || '-'
  }))
})

const previewColumns = [
  { key: 'collaborateur', label: 'Collaborateur' },
  { key: 'metier', label: 'Métier' },
  { key: 'date', label: 'Date' },
  { key: 'lieu', label: 'Lieu' },
  { key: 'heure_debut', label: 'Début' },
  { key: 'heure_fin', label: 'Fin' }
]

// Méthodes
function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    console.log('� Fichier sélectionné:', files[0])
    selectedFile.value = [files[0]]
  }
}

async function parseFile() {
  if (!selectedFile.value.length || !selectedFile.value[0]) return
  
  parsing.value = true
  
  try {
    console.log('📊 Début du parsing Excel...')
    const result = await parseWorkbook(selectedFile.value[0])
    parseResult.value = result
    
    // Validation des données
    validationResult.value = validateImportData(result.data)
    
    step.value = 'preview'
    console.log('✅ Parsing terminé:', result.stats)
    
  } catch (error) {
    console.error('❌ Erreur parsing:', error)
    // TODO: Afficher l'erreur à l'utilisateur
  } finally {
    parsing.value = false
  }
}

async function startImport() {
  if (!validationResult.value.isValid) return
  
  importing.value = true
  step.value = 'importing'
  
  try {
    console.log('🚀 Début de l\'import Firestore...')
    
    const stats = await importToFirestore(
      parseResult.value.data,
      'keydispo', // TODO: récupérer le vrai tenantId
      (progress) => {
        currentProgress.value = progress
      }
    )
    
    importStats.value = stats
    step.value = 'completed'
    
    console.log('✅ Import terminé:', stats)
    
  } catch (error) {
    console.error('❌ Erreur import:', error)
    // TODO: Afficher l'erreur à l'utilisateur
  } finally {
    importing.value = false
  }
}

function resetImport() {
  step.value = 'select'
  selectedFile.value = []
  parseResult.value = {
    data: [],
    stats: { totalRows: 0, validRows: 0, collaborateursUniques: 0, warnings: [] }
  }
  validationResult.value = { isValid: false, warnings: [], errors: [] }
  importStats.value = {
    collaborateursCreated: 0,
    collaborateursMerged: 0,
    disposCreated: 0,
    disposMerged: 0,
    errors: [],
    duration: 0
  }
}

function goToPlanning() {
  router.push('/semaine')
}
</script>

<style scoped>
.import-dispos {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.import-card {
  margin-bottom: 20px;
}

.subtitle {
  color: var(--va-text-secondary);
  margin-top: 8px;
  font-size: 0.9rem;
}

.step-content {
  padding: 20px 0;
}

.file-upload {
  margin: 20px 0;
}

.file-input-container {
  margin: 20px 0;
}

.file-dropzone {
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 150px;
  display: flex;
  align-items: center;
}

.file-dropzone:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: flex-end;
}

.stats-grid,
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.stat {
  text-align: center;
}

.stat h4 {
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
  color: var(--va-primary);
}

.stat p {
  margin: 4px 0 0 0;
  color: var(--va-text-secondary);
  font-size: 0.9rem;
}

.progress-section {
  padding: 20px;
  text-align: center;
}

.progress-bar {
  margin-bottom: 16px;
}

.progress-text {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.progress-details {
  color: var(--va-text-secondary);
  font-size: 0.9rem;
}

.preview-table {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .import-dispos {
    padding: 10px;
  }
  
  .stats-grid,
  .results-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
}
</style>
