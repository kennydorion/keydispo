<template>
  <div class="import-app">
      <!-- En-tête -->
      <div class="header-section">
        <div class="title-container">
          <i class="material-icons-outlined">upload_file</i>
          <h1 class="page-title">Import de données Excel</h1>
        </div>
      </div>

      <!-- Étapes -->
      <div class="steps-container">
        <div class="step" :class="{ active: step === 'select' }">
          <div class="step-number">1</div>
          <span>Sélection du fichier</span>
        </div>
        <div class="step" :class="{ active: step === 'preview' }">
          <div class="step-number">2</div>
          <span>Analyse et validation</span>
        </div>
        <div class="step" :class="{ active: step === 'importing' }">
          <div class="step-number">3</div>
          <span>Import des données</span>
        </div>
        <div class="step" :class="{ active: step === 'verifying' || step === 'completed' }">
          <div class="step-number">4</div>
          <span>Vérification</span>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="main-content">
        <!-- Étape 1: Sélection du fichier -->
        <div v-if="step === 'select'" class="step-content">
          <va-card>
            <va-card-content>
              <div class="file-upload-section">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".xlsx,.xls"
                  @change="onFileSelected"
                  style="display: none"
                />
                <va-button
                  @click="fileInput?.click()"
                  size="large"
                  color="primary"
                  icon="upload_file"
                >
                  Sélectionner un fichier Excel
                </va-button>
                <p class="file-info" v-if="selectedFile.length > 0">
                  Fichier sélectionné : {{ selectedFile[0]?.name }}
                </p>
                <div v-if="selectedFile.length > 0" class="file-actions">
                  <va-button @click="parseFile()" :loading="parsing" color="success">
                    {{ parsing ? 'Analyse en cours...' : 'Analyser le fichier' }}
                  </va-button>
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div>

        <!-- Étape 2: Analyse -->
        <div v-if="step === 'preview'" class="step-content">
          <va-card>
            <va-card-content>
              <div v-if="parsing" class="analyzing-section">
                <va-progress-circle indeterminate />
                <p>Analyse du fichier en cours...</p>
              </div>
              
              <div v-if="parseResult.stats.totalRows > 0" class="analysis-result">
                <h3>Résultat de l'analyse</h3>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-number">{{ parseResult.data.length }}</div>
                    <div class="stat-label">Disponibilités trouvées</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-number">{{ parseResult.stats.collaborateursUniques }}</div>
                    <div class="stat-label">Collaborateurs uniques</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-number">{{ uniqueDatesCount }}</div>
                    <div class="stat-label">Dates différentes</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-number">{{ parseResult.stats.warnings.length + validationResult.errors.length }}</div>
                    <div class="stat-label">Alertes</div>
                  </div>
                </div>

                <!-- Aperçu des données -->
                <div v-if="previewData.length > 0" class="preview-section">
                  <h4>Aperçu des données (5 premières entrées)</h4>
                  <div class="preview-table-container">
                    <table class="preview-table">
                      <thead>
                        <tr>
                          <th>Collaborateur</th>
                          <th>Métier</th>
                          <th>Date</th>
                          <th>Lieu</th>
                          <th>Horaires</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, index) in previewData" :key="index">
                          <td>{{ row.prenom }} {{ row.nom }}</td>
                          <td>{{ row.metier }}</td>
                          <td>{{ formatDate(row.date) }}</td>
                          <td>{{ row.lieu || '-' }}</td>
                          <td>{{ formatHoraires(row.heure_debut, row.heure_fin) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Alertes -->
                <div v-if="parseResult.stats.warnings.length > 0" class="warnings-section">
                  <h4>⚠️ Alertes ({{ parseResult.stats.warnings.length }})</h4>
                  <ul>
                    <li v-for="warning in parseResult.stats.warnings" :key="warning">{{ warning }}</li>
                  </ul>
                </div>
                
                <div v-if="validationResult.errors.length > 0" class="errors-section">
                  <h4>❌ Erreurs bloquantes ({{ validationResult.errors.length }})</h4>
                  <ul>
                    <li v-for="error in validationResult.errors" :key="error">{{ error }}</li>
                  </ul>
                </div>

                <div class="actions">
                  <va-button 
                    @click="startImport" 
                    color="success" 
                    :disabled="validationResult.errors.length > 0 || parseResult.data.length === 0"
                  >
                    Importer {{ parseResult.data.length }} disponibilités
                  </va-button>
                  <va-button @click="resetImport" color="secondary">
                    Recommencer
                  </va-button>
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div>

        <!-- Étape 3: Import -->
        <div v-if="step === 'importing'" class="step-content">
          <va-card>
            <va-card-content>
              <div class="importing-section">
                <va-progress-bar :model-value="progressPercent" />
                <p class="progress-message">{{ currentProgress.message }}</p>
              </div>
            </va-card-content>
          </va-card>
        </div>

        <!-- Étape 4: Vérification -->
        <div v-if="step === 'verifying'" class="step-content">
          <va-card>
            <va-card-content>
              <div class="verifying-section">
                <div class="verify-header">
                  <i class="material-icons-outlined spin">search</i>
                  <h3>Vérification des données dans le planning...</h3>
                </div>
                <p>Nous vérifions que les données importées sont bien visibles dans le planning.</p>
                <va-progress-bar indeterminate />
              </div>
            </va-card-content>
          </va-card>
        </div>

        <!-- Étape finale: Résultats -->
        <div v-if="step === 'completed'" class="step-content">
          <va-card>
            <va-card-content>
              <div class="import-result">
                <div class="result-header">
                  <i class="material-icons-outlined" :class="verificationResult.success ? 'success-icon' : 'error-icon'">
                    {{ verificationResult.success ? 'check_circle' : 'error' }}
                  </i>
                  <h3>{{ verificationResult.success ? 'Import et vérification réussis !' : 'Problème détecté' }}</h3>
                </div>
                
                <div class="result-stats">
                  <p><strong>Import :</strong> {{ importStats.disposCreated + importStats.disposMerged }} disponibilités, {{ importStats.collaborateursCreated + importStats.collaborateursMerged }} collaborateurs</p>
                  <p><strong>Vérification :</strong> {{ verificationResult.details.verifiedCount }}/{{ verificationResult.details.importedCount }} données trouvées dans le planning</p>
                  <p v-if="verificationResult.details.missingCount > 0" class="warning">
                    ⚠️ {{ verificationResult.details.missingCount }} données non trouvées dans le planning
                  </p>
                </div>

                <div v-if="verificationResult.details.sampleData.length > 0" class="sample-data">
                  <h4>Exemples de données vérifiées :</h4>
                  <div class="sample-list">
                    <div v-for="(sample, index) in verificationResult.details.sampleData.slice(0, 3)" :key="index" class="sample-item">
                      {{ sample.nom }} {{ sample.prenom }} - {{ sample.date }} ({{ sample.lieu }})
                    </div>
                  </div>
                </div>

                <div class="actions">
                  <va-button @click="$router.push('/planning')" color="success">
                    Voir le planning
                  </va-button>
                  <va-button @click="resetImport" color="secondary">
                    Nouvel import
                  </va-button>
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
// PlanningLayout retiré : TopNav globale dans App.vue
import { parseWorkbook } from './parseWorkbook'
import { importToRTDB, validateImportData } from './importToRTDB'
import { disponibilitesRTDBService } from '../../services/disponibilitesRTDBService'
import type { ParseResult, ImportStats, ImportProgress } from './types'

// Refs
const fileInput = ref<HTMLInputElement>()

// État du composant
const step = ref<'select' | 'preview' | 'importing' | 'completed' | 'verifying'>('select')
const selectedFile = ref<File[]>([])
const parsing = ref(false)
const importing = ref(false)
const verifying = ref(false)

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

// Variables de vérification
const verificationResult = ref<{
  success: boolean
  message: string
  details: {
    importedCount: number
    verifiedCount: number
    missingCount: number
    sampleData: any[]
  }
}>({
  success: false,
  message: '',
  details: {
    importedCount: 0,
    verifiedCount: 0,
    missingCount: 0,
    sampleData: []
  }
})

// Fonction de vérification des données importées
const verifyImportedData = async () => {
  try {
    verifying.value = true
    step.value = 'verifying'

    // Récupérer les données importées depuis RTDB
    const importedDispos = await disponibilitesRTDBService.getAllDisponibilites()
    
    // Filtrer les données récemment importées (dernière heure)
    const recentImports = importedDispos.filter(dispo => {
      const importTime = new Date(dispo.updatedAt)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      return importTime > oneHourAgo
    })

    const importedCount = importStats.value.disposCreated + importStats.value.disposMerged
    const verifiedCount = recentImports.length
    const missingCount = Math.max(0, importedCount - verifiedCount)

    verificationResult.value = {
      success: missingCount === 0 && verifiedCount > 0,
      message: verifiedCount > 0 ? 'Données vérifiées avec succès' : 'Aucune donnée trouvée dans le planning',
      details: {
        importedCount,
        verifiedCount,
        missingCount,
        sampleData: recentImports.slice(0, 5)
      }
    }

    // Attendre un peu pour montrer la vérification
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    step.value = 'completed'
  } catch (error) {
    console.error('Erreur lors de la vérification:', error)
    verificationResult.value = {
      success: false,
      message: 'Erreur lors de la vérification',
      details: {
        importedCount: importStats.value.disposCreated + importStats.value.disposMerged,
        verifiedCount: 0,
        missingCount: importStats.value.disposCreated + importStats.value.disposMerged,
        sampleData: []
      }
    }
    step.value = 'completed'
  } finally {
    verifying.value = false
  }
}

// Computed
// (variables isEmulatorMode / hasFile retirées car non utilisées après refactor)

const progressPercent = computed(() => {
  if (currentProgress.value.total === 0) return 0
  return Math.round((currentProgress.value.current / currentProgress.value.total) * 100)
})

const previewData = computed(() => {
  return parseResult.value.data.slice(0, 5)
})

const uniqueDatesCount = computed(() => {
  const dates = new Set(parseResult.value.data.map(row => row.date))
  return dates.size
})

// Méthodes
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function formatHoraires(debut?: string, fin?: string): string {
  if (!debut && !fin) return '-'
  if (debut && fin) return `${debut} - ${fin}`
  if (debut) return `${debut} -`
  if (fin) return `- ${fin}`
  return '-'
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    console.log('📁 Fichier sélectionné:', files[0])
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
    
    // Vérification de l'authentification
  // Utiliser le service firebase centralisé
  const { auth } = await import('../../services/firebase')
    const currentUser = auth.currentUser
    
    if (!currentUser) {
      throw new Error('Utilisateur non authentifié. Veuillez vous connecter.')
    }
    
    console.log('👤 Utilisateur authentifié:', currentUser.email)
    
    const tenantId = (import.meta as any).env?.VITE_TENANT_ID || 'keydispo'
    console.log('🏢 Tenant ID:', tenantId)
    
    const stats = await importToRTDB(
      parseResult.value.data,
      tenantId,
      (progress) => {
        currentProgress.value = progress
      }
    )
    
    importStats.value = stats
    
    console.log('✅ Import terminé:', stats)
    
    // Lancer la vérification des données
    await verifyImportedData()
    
  } catch (error) {
    console.error('❌ Erreur import:', error)
    // TODO: Afficher l'erreur à l'utilisateur
    step.value = 'completed'
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
</script>

<style scoped>
/* === STYLES MODERNES POUR IMPORT === */

.import-app {
  padding: 0;
  background: var(--dark-background);
  min-height: 100vh;
  color: var(--dark-text-primary);
}

/* En-tête modernisé */
.header-section {
  background: linear-gradient(135deg, var(--dark-surface) 0%, rgba(45, 56, 79, 0.8) 100%);
  border-bottom: 1px solid var(--dark-border);
  padding: 2rem 0;
  margin-bottom: 2rem;
}

.title-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.title-container i {
  font-size: 2.5rem;
  color: var(--primary-400);
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--dark-text-primary);
  margin: 0;
}

/* Indicateur d'étapes modernisé */
.steps-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 3rem;
  gap: 2rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 12px;
  transition: all 0.3s ease;
  opacity: 0.6;
}

.step.active {
  opacity: 1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid var(--primary-400);
}

.step-number {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--dark-surface);
  border: 2px solid var(--dark-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--dark-text-secondary);
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: var(--primary-400);
  border-color: var(--primary-400);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.step span {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--dark-text-secondary);
  text-align: center;
}

.step.active span {
  color: var(--primary-400);
}

/* Contenu principal */
.main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;
}

.step-content {
  margin-bottom: 2rem;
  animation: fadeInUp 0.5s ease-out;
}

/* Cards Vuestic avec thème sombre */
:deep(.va-card) {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 16px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
}

:deep(.va-card-content) {
  padding: 2rem !important;
  color: var(--dark-text-primary) !important;
}

/* Section de téléchargement de fichier */
.file-upload-section {
  text-align: center;
}

.file-info {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  color: #4ade80;
  font-weight: 500;
}

.file-actions {
  margin-top: 1rem;
}

/* Section d'analyse */
.analyzing-section {
  text-align: center;
  padding: 3rem 0;
}

.analyzing-section p {
  margin-top: 1rem;
  font-size: 1.1rem;
  color: var(--dark-text-secondary);
}

.analysis-result h3 {
  color: var(--dark-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 2rem;
  text-align: center;
}

/* Grille de statistiques */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  border-color: var(--primary-400);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #60a5fa;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #e5e7eb;
  font-weight: 500;
}

/* Section d'erreurs */
.errors-section {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.errors-section h4 {
  color: #f87171;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.errors-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.errors-section li {
  padding: 0.5rem 0;
  color: #fca5a5;
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

.errors-section li:last-child {
  border-bottom: none;
}

/* Section d'alertes/warnings */
.warnings-section {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.warnings-section h4 {
  color: #fbbf24;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.warnings-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.warnings-section li {
  padding: 0.5rem 0;
  color: #fcd34d;
  border-bottom: 1px solid rgba(245, 158, 11, 0.2);
}

.warnings-section li:last-child {
  border-bottom: none;
}

/* Section de prévisualisation */
.preview-section {
  margin: 2rem 0;
}

.preview-section h4 {
  color: var(--dark-text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.preview-table-container {
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th {
  background: var(--dark-hover);
  color: var(--dark-text-primary);
  font-weight: 600;
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--dark-border);
  font-size: 0.875rem;
}

.preview-table td {
  padding: 1rem;
  color: var(--dark-text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.875rem;
}

.preview-table tr:last-child td {
  border-bottom: none;
}

.preview-table tr:hover {
  background: var(--dark-hover);
}

/* Section d'import */
.importing-section {
  text-align: center;
  padding: 3rem 0;
}

.progress-message {
  margin-top: 1rem;
  font-size: 1.1rem;
  color: var(--dark-text-secondary);
}

/* Résultats d'import */
.import-result {
  text-align: center;
}

.result-header {
  margin-bottom: 2rem;
}

.result-header i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.result-header i.success-icon {
  color: var(--success-400);
}

.result-header i.error-icon {
  color: var(--error-400);
}

.result-header h3 {
  color: var(--dark-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.result-stats {
  margin-bottom: 2rem;
}

.result-stats p {
  margin: 0.5rem 0;
  color: var(--dark-text-secondary);
  font-size: 1.1rem;
}

/* Actions */
.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

/* Boutons Vuestic avec style sombre */
:deep(.va-button) {
  border-radius: 8px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  padding: 0.75rem 1.5rem !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.3s ease !important;
}

:deep(.va-button:hover) {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4) !important;
}

:deep(.va-button--primary) {
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%) !important;
  border: none !important;
  color: white !important;
}

:deep(.va-button--success) {
  background: linear-gradient(135deg, var(--success-500) 0%, var(--success-600) 100%) !important;
  border: none !important;
  color: white !important;
}

:deep(.va-button--secondary) {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  color: var(--dark-text-primary) !important;
}

:deep(.va-button--secondary:hover) {
  background: var(--dark-hover) !important;
  border-color: var(--primary-400) !important;
}

/* Progress bar personnalisée */
:deep(.va-progress-bar) {
  background: var(--dark-surface) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  height: 12px !important;
}

:deep(.va-progress-bar__overlay) {
  background: linear-gradient(90deg, var(--primary-500) 0%, var(--primary-400) 100%) !important;
  border-radius: 8px !important;
}

/* Progress circle */
:deep(.va-progress-circle) {
  --va-progress-circle-color: var(--primary-400) !important;
}

:deep(.va-progress-circle .va-progress-circle__wrapper) {
  filter: drop-shadow(0 4px 8px rgba(99, 102, 241, 0.3)) !important;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .steps-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .step {
    flex-direction: row;
    padding: 0.75rem 1.5rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .title-container i {
    font-size: 2rem;
  }
  
  .main-content {
    padding: 0 0.5rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
  
  :deep(.va-button) {
    width: 100% !important;
    max-width: 300px !important;
  }
}

/* Styles pour la vérification */
.verifying-section {
  text-align: center;
  padding: 20px;
}

.verify-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 15px;
}

.verify-header i.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.result-stats {
  margin: 15px 0;
}

.result-stats p {
  margin: 5px 0;
}

.result-stats .warning {
  color: var(--warning-500);
  font-weight: 500;
}

.sample-data {
  margin: 20px 0;
  text-align: left;
  background: var(--background-secondary);
  padding: 15px;
  border-radius: 4px;
}

.sample-list {
  margin-top: 10px;
}

.sample-item {
  padding: 5px 0;
  border-bottom: 1px solid var(--divider);
  font-family: monospace;
  font-size: 0.9em;
}

.sample-item:last-child {
  border-bottom: none;
}

/* Focus states pour l'accessibilité */
:deep(.va-button:focus-visible) {
  outline: 2px solid var(--primary-400) !important;
  outline-offset: 2px !important;
}

.step:focus-visible {
  outline: 2px solid var(--primary-400);
  outline-offset: 2px;
}
</style>