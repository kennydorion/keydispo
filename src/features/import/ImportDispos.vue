<template>
  <div class="import-page">
    <!-- Header élégant similaire au planning -->
    <div class="import-header">
      <div class="header-top">
        <div class="header-brand">
          <div class="brand-icon">
            <va-icon name="upload" />
          </div>
          <div class="brand-content">
            <h1 class="brand-title">Import Excel</h1>
            <p class="brand-subtitle">Importer les disponibilités</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Conteneur principal -->
    <div class="import-container">
      <!-- Statut du dernier import -->
      <div v-if="lastImportInfo" class="last-import-info">
        <va-icon name="schedule" color="info" size="16px" />
        <span>Dernier import : {{ formatLastImport(lastImportInfo) }}</span>
      </div>

      <!-- Indicateur d'étapes simplifié -->
      <div class="steps-indicator">
        <div class="step" :class="{ active: step === 'select' }">
          <div class="step-dot"></div>
          <span>Fichier</span>
        </div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: step === 'preview' }">
          <div class="step-dot"></div>
          <span>Validation</span>
        </div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: step === 'importing' || step === 'verifying' }">
          <div class="step-dot"></div>
          <span>Import</span>
        </div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: step === 'completed' }">
          <div class="step-dot"></div>
          <span>Terminé</span>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="main-content">
        <!-- Étape 1: Sélection du fichier -->
        <div v-if="step === 'select'" class="step-content">
          <va-card class="content-card" elevation="2">
            <va-card-content>
              <div class="file-upload-section">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".xlsx,.xls"
                  @change="onFileSelected"
                  style="display: none"
                />
                
                <div class="upload-area" :class="{ 'has-file': selectedFile.length > 0 }">
                  <va-icon name="cloud_upload" size="48px" color="primary" />
                  <h3>Sélectionner un fichier Excel</h3>
                  <p>Formats acceptés : .xlsx, .xls</p>
                  
                  <va-button
                    @click="fileInput?.click()"
                    size="large"
                    color="primary"
                  >
                    Choisir le fichier
                  </va-button>
                  
                  <div v-if="selectedFile.length > 0" class="selected-file">
                    <va-icon name="description" color="success" />
                    <span>{{ selectedFile[0]?.name }}</span>
                    <va-button
                      @click="parseFile()"
                      :loading="parsing"
                      color="success"
                      style="margin-left: 16px;"
                    >
                      {{ parsing ? 'Analyse...' : 'Analyser' }}
                    </va-button>
                  </div>
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div>

        <!-- Étape 2: Validation -->
        <div v-if="step === 'preview'" class="step-content">
          <va-card class="content-card" elevation="2">
            <va-card-content>
              <div v-if="parsing" class="loading-section">
                <va-progress-circle indeterminate />
                <p>Analyse en cours...</p>
              </div>
              
              <div v-else-if="parseResult.stats.totalRows > 0" class="analysis-result">
                <!-- Statistiques compactes -->
                <div class="stats-compact">
                  <div class="stat-item">
                    <span class="stat-number">{{ parseResult.data.length }}</span>
                    <span class="stat-label">Disponibilités</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-number">{{ parseResult.stats.collaborateursUniques }}</span>
                    <span class="stat-label">Collaborateurs</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-number">{{ uniqueDatesCount }}</span>
                    <span class="stat-label">Dates</span>
                  </div>
                </div>

                <!-- Aperçu minimal -->
                <div v-if="previewData.length > 0" class="preview-minimal">
                  <h4>Aperçu ({{ previewData.length }} premiers éléments)</h4>
                  <div class="preview-list">
                    <div v-for="(row, index) in previewData" :key="index" class="preview-item">
                      <strong>{{ row.prenom }} {{ row.nom }}</strong>
                      <span>{{ formatDate(row.date) }} - {{ row.lieu || 'Aucun lieu' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Alertes condensées -->
                <div v-if="validationResult.errors.length > 0" class="alerts">
                  <va-alert color="danger" border="left">
                    <strong>{{ validationResult.errors.length }} erreur(s) bloquante(s)</strong>
                    <ul style="margin: 8px 0 0 20px;">
                      <li v-for="error in validationResult.errors.slice(0, 3)" :key="error">{{ error }}</li>
                      <li v-if="validationResult.errors.length > 3">
                        ... et {{ validationResult.errors.length - 3 }} autres
                      </li>
                    </ul>
                  </va-alert>
                </div>

                <div v-if="parseResult.stats.warnings.length > 0" class="alerts">
                  <va-alert color="warning" border="left">
                    <strong>{{ parseResult.stats.warnings.length }} avertissement(s)</strong>
                  </va-alert>
                </div>

                <!-- Actions -->
                <div class="actions">
                  <va-button 
                    @click="startImport" 
                    color="success" 
                    size="large"
                    :disabled="validationResult.errors.length > 0 || parseResult.data.length === 0"
                  >
                    Importer {{ parseResult.data.length }} disponibilités
                  </va-button>
                  <va-button @click="resetImport" preset="secondary">
                    Recommencer
                  </va-button>
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div>

        <!-- Étape 3: Import -->
        <div v-if="step === 'importing'" class="step-content">
          <va-card class="content-card" elevation="2">
            <va-card-content>
              <div class="importing-section">
                <va-progress-circle :model-value="progressPercent" size="80px" />
                <h3>Import en cours...</h3>
                <p>{{ currentProgress.message }}</p>
                <div class="progress-details">
                  {{ currentProgress.current }}/{{ currentProgress.total }}
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div>

        <!-- Étape 4: Vérification -->
        <div v-if="step === 'verifying'" class="step-content">
          <va-card class="content-card" elevation="2">
            <va-card-content>
              <div class="importing-section">
                <va-progress-circle indeterminate size="80px" />
                <h3>Vérification...</h3>
                <p>Contrôle des données importées</p>
              </div>
            </va-card-content>
          </va-card>
        </div>

        <!-- Étape finale: Résultats -->
        <div v-if="step === 'completed'" class="step-content">
          <va-card class="content-card" elevation="2">
            <va-card-content>
              <div class="result-section">
                <div class="result-header">
                  <va-icon 
                    :name="verificationResult.success ? 'check_circle' : 'error'" 
                    :color="verificationResult.success ? 'success' : 'danger'" 
                    size="64px"
                  />
                  <h3>{{ verificationResult.success ? 'Import réussi !' : 'Problème détecté' }}</h3>
                </div>
                
                <div class="result-summary">
                  <div class="summary-item">
                    <span class="summary-label">Données importées :</span>
                    <span class="summary-value">{{ importStats.disposCreated + importStats.disposMerged }} disponibilités</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">Données vérifiées :</span>
                    <span class="summary-value">{{ verificationResult.details.verifiedCount }}/{{ verificationResult.details.importedCount }}</span>
                  </div>
                </div>

                <div class="actions">
                  <va-button @click="$router.push('/planning')" color="success" size="large">
                    Voir le planning
                  </va-button>
                  <va-button @click="resetImport" preset="secondary">
                    Nouvel import
                  </va-button>
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { parseWorkbook, slugify } from './parseWorkbook'
import { importToRTDB, validateImportDataRTDB, getImportStatusRTDB } from './importToRTDBDirect'
import { disponibilitesRTDBService } from '../../services/disponibilitesRTDBService'
import type { ParseResult, ImportStats, ImportProgress } from './types'
import { normalizeDispo } from '../../services/normalization'

// Refs
const fileInput = ref<HTMLInputElement>()

// État du composant
const step = ref<'select' | 'preview' | 'importing' | 'completed' | 'verifying'>('select')
const selectedFile = ref<File[]>([])
const parsing = ref(false)
const importing = ref(false)
const verifying = ref(false)

// Informations du dernier import
const lastImportInfo = ref<any>(null)

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

// Computed
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

// Fonction de vérification des données importées
const verifyImportedData = async () => {
  try {
    verifying.value = true
    step.value = 'verifying'

    // Récupérer toutes les dispos présentes dans RTDB
    const allDispos = await disponibilitesRTDBService.getAllDisponibilites()

    // Construire l'ensemble des IDs attendus
    const { makeDispoId } = await import('./importToRTDBDirect')

    const expectedIds = new Set(
      parseResult.value.data.map(row => {
        const normalized = normalizeDispo({
          date: row.date,
          lieu: row.lieu || null,
          heure_debut: row.heure_debut || null,
          heure_fin: row.heure_fin || null,
        })
        const collabSlug = slugify(row.nom, row.prenom)
        return makeDispoId(
          collabSlug,
          row.date,
          normalized.heure_debut || row.heure_debut || null,
          normalized.heure_fin || row.heure_fin || null,
          normalized.lieu || row.lieu || null
        )
      })
    )

    const actualIds = new Set(allDispos.map(d => d.id))

    let verified = 0
    const missing: string[] = []
    expectedIds.forEach(id => {
      if (actualIds.has(id)) verified++
      else missing.push(id)
    })

    const importedCount = expectedIds.size
    const verifiedCount = verified
    const missingCount = importedCount - verifiedCount

    verificationResult.value = {
      success: missingCount === 0 && verifiedCount > 0,
      message: missingCount === 0 ? 'Données vérifiées avec succès' : 'Des données semblent manquantes',
      details: {
        importedCount,
        verifiedCount,
        missingCount,
        sampleData: allDispos.slice(0, 5)
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

function formatLastImport(importInfo: any): string {
  if (!importInfo || !importInfo.timestamp) return 'Aucun import récent'
  
  try {
    const date = new Date(importInfo.timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  } catch {
    return 'Date invalide'
  }
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
    validationResult.value = validateImportDataRTDB(result.data)
    
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
    console.log('🚀 Début de l\'import...')
    
    // Vérification de l'authentification
    const { auth } = await import('../../services/firebase')
    const currentUser = auth.currentUser
    
    if (!currentUser) {
      throw new Error('Utilisateur non authentifié. Veuillez vous connecter.')
    }
    
    console.log('👤 Utilisateur authentifié:', currentUser.email)
    
    const tenantId = (import.meta as any).env?.VITE_TENANT_ID || 'keydispo'
    disponibilitesRTDBService.setTenantId(tenantId)
    console.log('🏢 Tenant ID:', tenantId)
    
    const stats = await importToRTDB(
      parseResult.value.data,
      tenantId,
      (progress: ImportProgress) => {
        currentProgress.value = progress
      }
    )
    
    importStats.value = stats
    
    console.log('✅ Import terminé:', stats)
    
    // Recharger les informations du dernier import
    await loadLastImportInfo()
    
    // Lancer la vérification des données
    await verifyImportedData()
    
  } catch (error) {
    console.error('❌ Erreur import:', error)
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

async function loadLastImportInfo() {
  try {
    const tenantId = (import.meta as any).env?.VITE_TENANT_ID || 'keydispo'
    const importInfo = await getImportStatusRTDB(tenantId)
    lastImportInfo.value = importInfo
  } catch (error) {
    console.error('Erreur lors du chargement des infos d\'import:', error)
    lastImportInfo.value = null
  }
}

// Charger les informations du dernier import au montage
onMounted(() => {
  loadLastImportInfo()
})
</script>

<style scoped>
/* ===============================
   VARIABLES ET BASE
   =============================== */
.import-page {
  /* Variables CSS inspirées du planning */
  --surface-light: #ffffff;
  --border-light: #e2e8f0;
  --text-light: #334155;
  --text-muted: #64748b;
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.05);
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  
  font-family: var(--va-font-family, 'Inter', sans-serif);
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===============================
   HEADER ÉLÉGANT
   =============================== */
.import-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface-light);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-soft);
  height: 80px;
  min-height: 80px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 16px 24px;
  background: var(--primary-gradient);
  color: white;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.brand-icon :deep(.va-icon) {
  font-size: 22px;
  color: white;
}

.brand-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.brand-subtitle {
  margin: 2px 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
  line-height: 1.2;
}

/* ===============================
   CONTENEUR PRINCIPAL
   =============================== */
.import-container {
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

/* ===============================
   STATUT DERNIER IMPORT
   =============================== */
.last-import-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
  font-size: 0.9rem;
  color: #0369a1;
}

/* ===============================
   INDICATEUR D'ÉTAPES MODERNE
   =============================== */
.steps-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  background: var(--surface-light);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--border-light);
  transition: all 0.3s ease;
}

.step.active .step-dot {
  background: #667eea;
  box-shadow: 0 0 12px rgba(102, 126, 234, 0.4);
  transform: scale(1.2);
}

.step span {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
}

.step.active span {
  color: #667eea;
  font-weight: 600;
}

.step-line {
  width: 40px;
  height: 2px;
  background: var(--border-light);
  margin: 0 16px;
}

/* ===============================
   CARTES DE CONTENU
   =============================== */
.main-content {
  margin-bottom: 32px;
}

.step-content {
  animation: fadeIn 0.5s ease-out;
}

.content-card {
  border-radius: 16px !important;
  border: 1px solid var(--border-light) !important;
  background: var(--surface-light) !important;
  transition: all 0.3s ease !important;
  box-shadow: var(--shadow-card) !important;
  overflow: hidden !important;
}

.content-card:hover {
  box-shadow: var(--shadow-soft) !important;
}

/* ===============================
   ZONE DE TÉLÉCHARGEMENT
   =============================== */
.file-upload-section {
  padding: 40px 20px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  border: 2px dashed var(--border-light);
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area:hover {
  border-color: #667eea;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.upload-area.has-file {
  border-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.upload-area h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-light);
}

.upload-area p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--surface-light);
  border-radius: 8px;
  border: 1px solid #10b981;
  margin-top: 16px;
  font-size: 0.9rem;
  color: #059669;
}

/* ===============================
   LOADING ET PROGRESS
   =============================== */
.loading-section,
.importing-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  text-align: center;
}

.importing-section h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-light);
}

.importing-section p {
  margin: 0;
  color: var(--text-muted);
}

.progress-details {
  font-size: 0.9rem;
  color: var(--text-muted);
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 6px;
}

/* ===============================
   STATISTIQUES COMPACTES
   =============================== */
.stats-compact {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin: 24px 0;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid var(--border-light);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* ===============================
   APERÇU MINIMAL
   =============================== */
.preview-minimal {
  margin: 24px 0;
}

.preview-minimal h4 {
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-light);
}

.preview-list {
  background: var(--surface-light);
  border-radius: 8px;
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-item strong {
  color: var(--text-light);
  font-weight: 600;
}

.preview-item span {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* ===============================
   ALERTES MODERNISÉES
   =============================== */
.alerts {
  margin: 16px 0;
}

:deep(.va-alert) {
  border-radius: 8px !important;
  border-width: 1px !important;
  padding: 16px !important;
}

:deep(.va-alert ul) {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

:deep(.va-alert li) {
  margin: 4px 0;
}

/* ===============================
   RÉSULTATS
   =============================== */
.result-section {
  padding: 40px 20px;
  text-align: center;
}

.result-header {
  margin-bottom: 24px;
}

.result-header h3 {
  margin: 16px 0 0 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-light);
}

.result-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 24px 0;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid var(--border-light);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.summary-value {
  color: var(--text-light);
  font-weight: 600;
}

/* ===============================
   BOUTONS MODERNES
   =============================== */
.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
}

:deep(.va-button) {
  border-radius: 8px !important;
  font-weight: 500 !important;
  padding: 12px 24px !important;
  font-size: 0.95rem !important;
  transition: all 0.3s ease !important;
  text-transform: none !important;
}

:deep(.va-button:hover) {
  transform: translateY(-1px) !important;
}

:deep(.va-button--primary) {
  background: var(--primary-gradient) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
}

:deep(.va-button--primary:hover) {
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
}

:deep(.va-button--success) {
  background: var(--success-gradient) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3) !important;
}

:deep(.va-button--success:hover) {
  box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4) !important;
}

:deep(.va-button--secondary) {
  background: var(--surface-light) !important;
  border: 1px solid var(--border-light) !important;
  color: var(--text-light) !important;
}

:deep(.va-button--secondary:hover) {
  border-color: #667eea !important;
  color: #667eea !important;
  background: #f8fafc !important;
}

/* ===============================
   COMPOSANTS VUESTIC CUSTOMISÉS
   =============================== */
:deep(.va-progress-circle) {
  --va-progress-circle-color: #667eea !important;
}

:deep(.va-card-content) {
  padding: 0 !important;
}

/* ===============================
   ANIMATIONS
   =============================== */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===============================
   RESPONSIVE DESIGN
   =============================== */
@media (max-width: 768px) {
  .header-top {
    padding: 12px 16px;
  }
  
  .brand-icon {
    width: 38px;
    height: 38px;
  }
  
  .brand-icon :deep(.va-icon) {
    font-size: 20px;
  }
  
  .brand-title {
    font-size: 1.125rem;
  }
  
  .brand-subtitle {
    font-size: 0.8rem;
  }
  
  .import-container {
    padding: 20px 16px;
  }
  
  .steps-indicator {
    padding: 16px;
    margin-bottom: 24px;
  }
  
  .step-line {
    width: 20px;
    margin: 0 8px;
  }
  
  .stats-compact {
    flex-direction: column;
    gap: 16px;
  }
  
  .actions {
    flex-direction: column;
  }
  
  :deep(.va-button) {
    width: 100% !important;
  }
  
  .upload-area {
    padding: 24px 16px;
  }
  
  .preview-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .header-top {
    padding: 10px 12px;
  }
  
  .brand-icon {
    width: 34px;
    height: 34px;
  }
  
  .brand-icon :deep(.va-icon) {
    font-size: 18px;
  }
  
  .brand-title {
    font-size: 1rem;
  }
  
  .brand-subtitle {
    font-size: 0.75rem;
  }
  
  .import-container {
    padding: 16px 12px;
  }
  
  .steps-indicator {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .step-line {
    display: none;
  }
}
</style>