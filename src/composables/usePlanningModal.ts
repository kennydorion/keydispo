/**
 * usePlanningModal - Composable pour gérer les modals de disponibilité
 * Encapsule la logique d'ouverture, fermeture, édition et sauvegarde des modals
 */

import { ref, computed, type Ref, type ComputedRef, nextTick } from 'vue'
import type { Disponibilite, Collaborateur } from '@/types'
import { addDaysStr } from '@/utils/dateHelpers'
import { formatModalDate } from '@/utils/planningFormatters'
import { canonicalizeLieu } from '@/services/normalization'
import { AuthService } from '@/services/auth'
import { disponibilitesRTDBService, type DisponibiliteRTDB } from '@/services/disponibilitesRTDBService'
import { saveFormPreferences, getLastFormPreferences } from '@/services/dispoFormPreferences'
import { slotOptions } from '@/services/dispoFormOptions'

// Type pour la fonction notify (injectée depuis le parent)
type NotifyFn = (options: { message: string; color?: string; position?: string; duration?: number }) => void

// Fonction utilitaire locale (évite les imports circulaires)
function toMinutes(hhmm?: string): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

export interface UsePlanningModalOptions {
  // Refs et fonctions externes
  disponibilitesCache: Ref<Map<string, Disponibilite[]>>
  filteredCollaborateurs: ComputedRef<Collaborateur[]>
  isSelectionMode: Ref<boolean>
  isCollaborateurInterface: ComputedRef<boolean>
  canAccessAdminFeatures: ComputedRef<boolean>
  selectedCells: Ref<Set<string>>
  
  // Fonctions de collaboration
  collaborationService: any
  handleCellEdit: (date: string, collaborateurId: string) => void
  handleEditClose: () => void
  
  // Fonctions d'accès aux données
  getDisponibilites: (collaborateurId: string, date: string) => Disponibilite[]
  resolveDispoKind: (d: Disponibilite) => { type: string; timeKind: string; slots?: string[] }
  setCacheDispos: (date: string, dispos: Disponibilite[]) => void
  refreshDisponibilites: (showLoading?: boolean) => Promise<void>
  
  // Fonctions de validation
  wouldConflict: (dispos: Disponibilite[]) => boolean
  wouldConflictWithCandidate: (dispos: Disponibilite[], candidate: Partial<Disponibilite>) => boolean
  getConflictMessageWithCandidate: (dispos: Disponibilite[], candidate: Partial<Disponibilite>) => string | null
  violatesMissionDispoOverlap: (dispos: Disponibilite[], candidate: Partial<Disponibilite>) => boolean
  
  // Type options
  typeOptions: ComputedRef<Array<{ text: string; value: string }>>
  
  // Batch mode
  isBatchMode: Ref<boolean>
  batchDates: Ref<string[]>
  batchCollaborateurId: Ref<string>
  
  // Lieux
  lieuOptions: Ref<string[]>
  lieuxOptionsStrings: ComputedRef<string[]>
  
  // Clearing selection
  clearSelection: () => void
  
  // Notification (from useToast)
  notify: NotifyFn
}

export interface UsePlanningModalReturn {
  // État principal du modal
  showModal: ComputedRef<boolean>
  showDispoModal: Ref<boolean>
  showCollabModal: Ref<boolean>
  selectedCell: Ref<{ collaborateurId: string; date: string } | null>
  selectedCollaborateur: Ref<Collaborateur | null>
  selectedCellDispos: Ref<Disponibilite[]>
  selectedCollabDispos: Ref<Disponibilite[]>
  
  // État d'édition
  editingDispoIndex: Ref<number | null>
  isAddingNewDispo: Ref<boolean>
  editingDispo: Ref<Partial<Disponibilite>>
  newDispo: Ref<Disponibilite>
  saving: Ref<boolean>
  
  // Mock pour batch
  mockBatchCell: ComputedRef<{ collaborateurId: string; date: string } | null>
  batchDateRangeFormatted: ComputedRef<string>
  
  // Computed validations
  canAddDispo: ComputedRef<boolean>
  isEditFormValid: ComputedRef<boolean>
  isDetectedOvernight: ComputedRef<boolean>
  
  // Fonctions d'ouverture/fermeture
  openModalForCollaborateur: (collaborateurId: string, date: string) => void
  openDispoModal: (collaborateurId: string, date: string) => void
  openBatchModal: () => void
  cancelModal: () => void
  
  // Fonctions de gestion des dispos
  addNewDispo: () => void
  removeDispo: (index: number) => void
  editDispo: (dispo: Disponibilite, cellDate?: string) => void
  
  // Fonctions d'édition de ligne
  editDispoLine: (index: number) => void
  addNewDispoLine: () => void
  cancelEditDispo: () => void
  setEditingType: (type: string) => void
  setEditingTimeKind: (timeKind: string) => void
  toggleEditingSlot: (slotValue: string) => void
  saveEditDispo: () => void
  
  // Fonctions de sauvegarde
  saveDispos: () => Promise<void>
  saveBatchDispos: () => Promise<void>
  deleteBatchDispos: () => Promise<void>
  setSaveHandlers: (handlers: {
    saveDispos: () => Promise<void>
    saveBatchDispos: () => Promise<void>
    deleteBatchDispos: () => Promise<void>
  }) => void
  
  // Utilitaires
  getSelectedCollaborateur: () => Collaborateur | null
  timeKindOptionsFor: (type: Disponibilite['type'] | undefined) => Array<{ text: string; value: string }>
  timeKindOptionsFilteredFor: (type: Disponibilite['type'] | undefined) => Array<{ text: string; value: string }>
  isOvernightTime: (start?: string, end?: string) => boolean
  getTypeColor: (type: string) => string
  getTypeIcon: (type: string | undefined) => string
  getTimeKindIcon: (timeKind: string) => string
  getTypeText: (type: string | undefined) => string
  getSlotText: (slots?: string[]) => string
  onCreateLieu: (raw: string) => void
  sanitizeDisposition: (d: Partial<Disponibilite>) => Partial<Disponibilite>
}

export function usePlanningModal(options: UsePlanningModalOptions): UsePlanningModalReturn {
  const {
    disponibilitesCache,
    filteredCollaborateurs,
    isSelectionMode,
    isCollaborateurInterface,
    canAccessAdminFeatures,
    selectedCells,
    collaborationService,
    handleCellEdit,
    handleEditClose,
    getDisponibilites,
    resolveDispoKind,
    setCacheDispos,
    refreshDisponibilites,
    wouldConflict,
    wouldConflictWithCandidate,
    getConflictMessageWithCandidate,
    violatesMissionDispoOverlap,
    typeOptions,
    isBatchMode,
    batchDates,
    batchCollaborateurId,
    lieuOptions,
    lieuxOptionsStrings,
    clearSelection,
    notify
  } = options

  // === ÉTAT PRINCIPAL DU MODAL ===
  const showDispoModal = ref(false)
  const showCollabModal = ref(false)
  const selectedCell = ref<{ collaborateurId: string; date: string } | null>(null)
  const selectedCollaborateur = ref<Collaborateur | null>(null)
  const selectedCellDispos = ref<Disponibilite[]>([])
  const selectedCollabDispos = ref<Disponibilite[]>([])
  const saving = ref(false)

  // Modal unifié
  const showModal = computed({
    get: () => showDispoModal.value || showCollabModal.value,
    set: (value: boolean) => {
      if (!value) {
        showDispoModal.value = false
        showCollabModal.value = false
      }
    }
  })

  // === ÉTAT D'ÉDITION ===
  const editingDispoIndex = ref<number | null>(null)
  const isAddingNewDispo = ref(false)
  
  const savedPrefs = getLastFormPreferences()
  const editingDispo = ref<Partial<Disponibilite>>({
    type: savedPrefs.type,
    timeKind: savedPrefs.timeKind,
    heure_debut: savedPrefs.heure_debut,
    heure_fin: savedPrefs.heure_fin,
    lieu: savedPrefs.lieu,
    slots: savedPrefs.slots
  })

  const newDispo = ref<Disponibilite>({
    id: undefined,
    nom: '', prenom: '', metier: '', phone: '', email: '', ville: '',
    date: '', lieu: '', heure_debut: '', heure_fin: '',
    tenantId: 'keydispo', collaborateurId: '',
    type: 'mission', timeKind: 'range', slots: [], isFullDay: false,
  } as Disponibilite)

  // === BATCH MODE HELPERS ===
  const mockBatchCell = computed(() => {
    if (!isBatchMode.value || batchDates.value.length === 0) return null
    return { collaborateurId: batchCollaborateurId.value, date: batchDates.value[0] }
  })

  const batchDateRangeFormatted = computed(() => {
    if (batchDates.value.length === 0) return ''
    if (batchDates.value.length === 1) return formatModalDate(batchDates.value[0])
    const sorted = [...batchDates.value].sort()
    const first = new Date(sorted[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    const last = new Date(sorted[sorted.length - 1]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    return `${sorted.length} dates · ${first} → ${last}`
  })

  // === VALIDATION HELPERS ===
  function isOvernightTime(start?: string, end?: string): boolean {
    if (!start || !end) return false
    const [startH] = start.split(':').map(Number)
    const [endH] = end.split(':').map(Number)
    return endH < startH || (endH === startH && end < start)
  }

  const isDetectedOvernight = computed(() => {
    if (editingDispo.value.timeKind !== 'range') return false
    return isOvernightTime(editingDispo.value.heure_debut, editingDispo.value.heure_fin)
  })

  function dispoSignature(d: Partial<Disponibilite>) {
    const t = d.type
    const k = d.timeKind
    if (t === 'indisponible') return 'indisponible:full-day'
    if (t === 'mission') {
      if (k === 'slot') return `mission:slot:${(d.slots || []).slice().sort().join(',')}:${d.lieu || ''}`
      if (k === 'range') return `mission:range:${d.lieu || ''}:${d.heure_debut || ''}-${d.heure_fin || ''}`
      return `mission:full-day:${d.lieu || ''}`
    }
    if (t === 'disponible') {
      if (k === 'slot') return `disponible:slot:${(d.slots || []).slice().sort().join(',')}`
      if (k === 'range') return `disponible:range:${d.heure_debut || ''}-${d.heure_fin || ''}`
      return 'disponible:full-day'
    }
    return 'other'
  }

  function hasDuplicateInModal(sig: string): boolean {
    return selectedCellDispos.value.some(x => dispoSignature(x) === sig)
  }

  const canAddDispo = computed(() => {
    const d = newDispo.value
    if (selectedCellDispos.value.length && wouldConflictWithCandidate(selectedCellDispos.value, d)) return false
    if (violatesMissionDispoOverlap(selectedCellDispos.value, d)) return false
    if (d.type === 'mission') {
      if (d.timeKind === 'range') return !!(d.heure_debut && d.heure_fin)
      if (d.timeKind === 'slot') {
        if (!Array.isArray(d.slots) || d.slots.length === 0) return false
      }
      const sig = dispoSignature(d)
      if (hasDuplicateInModal(sig)) return false
      return true
    }
    if (d.type === 'disponible') {
      if (d.timeKind === 'range') return !!(d.heure_debut && d.heure_fin)
      if (d.timeKind === 'slot') {
        if (!Array.isArray(d.slots) || d.slots.length === 0) return false
        const sig = dispoSignature(d)
        if (hasDuplicateInModal(sig)) return false
        if (violatesMissionDispoOverlap(selectedCellDispos.value, d)) return false
        return true
      }
      const sig = dispoSignature(d)
      if (hasDuplicateInModal(sig)) return false
      return true
    }
    const sig = dispoSignature(d)
    if (hasDuplicateInModal(sig)) return false
    return true
  })

  const isEditFormValid = computed(() => {
    const dispo = editingDispo.value
    if (!dispo.type || !dispo.timeKind) return false
    if (dispo.timeKind === 'range') {
      if (!dispo.heure_debut || !dispo.heure_fin) return false
    }
    if (dispo.timeKind === 'slot') {
      if (!dispo.slots || dispo.slots.length === 0) return false
    }
    if (dispo.type === 'mission' && !dispo.lieu) return false
    return true
  })

  // === TIME KIND OPTIONS ===
  function timeKindOptionsFor(type: Disponibilite['type'] | undefined) {
    if (type === 'indisponible') return [{ text: 'Journée', value: 'full-day' }]
    return [
      { text: 'Journée', value: 'full-day' },
      { text: 'Heures', value: 'range' },
      { text: 'Créneaux', value: 'slot' },
    ]
  }

  function timeKindOptionsFilteredFor(type: Disponibilite['type'] | undefined) {
    return timeKindOptionsFor(type)
  }

  // === UTILITY FUNCTIONS ===
  function getTypeColor(type: string): string {
    switch (type) {
      case 'mission': return 'primary'
      case 'disponible': return 'success'
      case 'indisponible': return 'danger'
      default: return 'secondary'
    }
  }

  function getTypeIcon(type: string | undefined): string {
    switch (type) {
      case 'mission': return 'work'
      case 'disponible': return 'check_circle'
      case 'indisponible': return 'cancel'
      default: return 'help'
    }
  }

  function getTimeKindIcon(timeKind: string): string {
    switch (timeKind) {
      case 'full-day': return 'today'
      case 'range': return 'schedule'
      case 'slot': return 'view_module'
      default: return 'help'
    }
  }

  function getTypeText(type: string | undefined): string {
    const typeOpt = (typeOptions.value as any[]).find((opt: any) => opt.value === type)
    return typeOpt?.text || type || 'Non défini'
  }

  function getSlotText(slots: string[] = []): string {
    if (slots.length === 0) return 'Aucun créneau'
    const slotNames = slots.map(slot => {
      const slotOpt = slotOptions.find(opt => opt.value === slot)
      return slotOpt?.text || slot
    })
    return slotNames.join(', ')
  }

  function onCreateLieu(raw: string) {
    const canon = canonicalizeLieu(raw)
    if (!canon) return
    if (!lieuOptions.value.includes(canon)) {
      lieuOptions.value = [...lieuOptions.value, canon]
    }
  }

  function sanitizeDisposition(d: Partial<Disponibilite>): Partial<Disponibilite> {
    const result = { ...d }
    if (result.type === 'indisponible') {
      result.timeKind = 'full-day'
      result.lieu = ''
      result.heure_debut = ''
      result.heure_fin = ''
      result.slots = []
    }
    if (result.timeKind === 'full-day') {
      result.heure_debut = ''
      result.heure_fin = ''
      result.slots = []
    }
    if (result.timeKind === 'slot') {
      result.heure_debut = ''
      result.heure_fin = ''
    }
    if (result.type !== 'mission') {
      result.lieu = ''
    }
    return result
  }

  // === COLLABORATEUR HELPER ===
  function getSelectedCollaborateur(): Collaborateur | null {
    if (isBatchMode.value && batchCollaborateurId.value) {
      const c = filteredCollaborateurs.value.find(c => c.id === batchCollaborateurId.value)
      return c || null
    }
    if (!selectedCell.value) return null
    const c = filteredCollaborateurs.value.find(c => c.id === selectedCell.value!.collaborateurId)
    return c || null
  }

  // === MODAL OPEN/CLOSE ===
  function openModalForCollaborateur(collaborateurId: string, date: string) {
    if (isSelectionMode.value) {
      if (isCollaborateurInterface.value && !canAccessAdminFeatures.value) {
        isSelectionMode.value = false
        if (selectedCells.value.size > 0) selectedCells.value.clear()
      } else {
        return
      }
    }

    if (collaborationService && collaborationService.isCellLocked(collaborateurId, date)) {
      const lock = collaborationService.getCellLock(collaborateurId, date)
      if (lock) return
    }

    if (collaborationService && collaborationService.isCellSelectedByOthers(collaborateurId, date)) {
      const selection = collaborationService.getCellSelection(collaborateurId, date)
      if (selection) return
    }

    openDispoModal(collaborateurId, date)
  }

  function openDispoModal(collaborateurId: string, date: string) {
    if (collaborationService && collaborationService.isCellLocked(collaborateurId, date)) {
      const lock = collaborationService.getCellLock(collaborateurId, date)
      if (lock) return
    }

    if (collaborationService) {
      collaborationService.lockCellForEditing(collaborateurId, date)
        .then((success: boolean) => {
          if (!success) return
        })
    }

    handleCellEdit(date, collaborateurId)

    selectedCell.value = { collaborateurId, date }
    const sameDaySanitized = getDisponibilites(collaborateurId, date).map((d) => {
      const cont = (d as any)._cont as ('start' | 'end' | undefined)
      const k = resolveDispoKind(d as Disponibilite)
      const merged: Partial<Disponibilite> = {
        ...d,
        type: k.type as Disponibilite['type'],
        timeKind: k.timeKind as Disponibilite['timeKind'],
        slots: k.timeKind === 'slot' ? (k.slots || []) : [],
      }
      const cleaned = sanitizeDisposition(merged)
      if (cleaned.timeKind === 'range') {
        cleaned.heure_debut = (d.heure_debut || '')
        cleaned.heure_fin = (d.heure_fin || '')
      }
      if (cleaned.type === 'mission') {
        cleaned.lieu = d.lieu || ''
      }
      if (cont) (cleaned as any)._cont = cont
      return cleaned as Disponibilite
    })

    const prev = addDaysStr(date, -1)
    const prevContinuations = getDisponibilites(collaborateurId, prev)
      .filter((d) => {
        const k = resolveDispoKind(d as Disponibilite)
        const isOvernightRange = (k.timeKind === 'range' || k.timeKind === 'overnight') && !!d.heure_debut && !!d.heure_fin && toMinutes(d.heure_fin)! < toMinutes(d.heure_debut)!
        const isSlotNight = k.timeKind === 'slot' && Array.isArray(k.slots) && k.slots.includes('night')
        return isOvernightRange || isSlotNight
      })
      .map((d) => {
        const k = resolveDispoKind(d as Disponibilite)
        const merged: Partial<Disponibilite> = {
          ...d,
          type: k.type as Disponibilite['type'],
          timeKind: (k.timeKind === 'overnight' ? 'range' : k.timeKind) as Disponibilite['timeKind'],
          slots: k.timeKind === 'slot' ? (k.slots || []) : [],
        }
        const cleaned = sanitizeDisposition(merged)
        if (cleaned.timeKind === 'range') {
          cleaned.heure_debut = (d.heure_debut || '')
          cleaned.heure_fin = (d.heure_fin || '')
        }
        if (cleaned.type === 'mission') {
          cleaned.lieu = d.lieu || ''
        }
        ;(cleaned as any)._cont = 'end'
        return cleaned as Disponibilite
      })

    selectedCellDispos.value = [...prevContinuations, ...sameDaySanitized]
    showDispoModal.value = true
  }

  function openBatchModal() {
    if (selectedCells.value.size === 0) {
      console.warn('❌ Aucune cellule sélectionnée')
      return
    }

    const cellsArray = Array.from(selectedCells.value)
    const firstCellId = cellsArray[0]
    const collabId = firstCellId.slice(0, -11)
    batchCollaborateurId.value = collabId
    const sameCollabCells = cellsArray.filter(id => id.startsWith(collabId + '-'))
    batchDates.value = sameCollabCells.map(cellId => cellId.slice(-10))
    
    if (batchDates.value.length === 0) {
      notify({ message: 'Sélection invalide: aucune date pour ce collaborateur', color: 'warning', position: 'top-right' })
      return
    }

    const existingDispos: any[] = []
    for (const date of batchDates.value) {
      const dayDispos = getDisponibilites(collabId, date)
      dayDispos.forEach(dispo => {
        existingDispos.push({
          ...dispo,
          _batchDate: date,
          _batchFormattedDate: formatModalDate(date)
        })
      })
    }

    selectedCellDispos.value = existingDispos

    const prefs = getLastFormPreferences()
    editingDispo.value = {
      type: prefs.type || 'disponible',
      timeKind: prefs.timeKind || 'full-day',
      heure_debut: prefs.heure_debut || '09:00',
      heure_fin: prefs.heure_fin || '17:00',
      lieu: prefs.lieu || '',
      slots: Array.isArray(prefs.slots) ? prefs.slots : []
    }

    isBatchMode.value = true
    isAddingNewDispo.value = true
    showDispoModal.value = true
    setTimeout(() => {
      if (!showDispoModal.value) showDispoModal.value = true
    }, 0)
  }

  function cancelModal() {
    handleEditClose()
  }

  // === DISPO MANAGEMENT ===
  function addNewDispo() {
    if (!selectedCell.value) return
    if (!canAddDispo.value) {
      const msg = getConflictMessageWithCandidate(selectedCellDispos.value, newDispo.value) || 
        (violatesMissionDispoOverlap(selectedCellDispos.value, newDispo.value) ? 'Conflit: cette disponibilité chevauche une mission existante.' : null)
      console.warn('⚠️ Conflit disponibilité:', msg)
      return
    }

    const collab = getSelectedCollaborateur()
    if (!collab) return

    const d = newDispo.value
    let finalTimeKind = d.timeKind
    if (d.timeKind === 'range' && d.heure_debut && d.heure_fin) {
      const startTime = parseInt(d.heure_debut.split(':')[0])
      const endTime = parseInt(d.heure_fin.split(':')[0])
      if (endTime < startTime || (endTime === startTime && d.heure_fin < d.heure_debut)) {
        finalTimeKind = 'overnight'
      }
    }

    const dispo: Partial<Disponibilite> = {
      nom: collab.nom,
      prenom: collab.prenom,
      metier: collab.metier,
      phone: collab.phone || '',
      email: collab.email || '',
      note: collab.note || '',
      date: selectedCell.value.date,
      tenantId: 'keydispo',
      collaborateurId: selectedCell.value.collaborateurId,
      type: d.type,
      timeKind: finalTimeKind,
      slots: finalTimeKind === 'slot' ? (d.slots || []) : [],
      isFullDay: finalTimeKind === 'full-day',
      lieu: d.type === 'mission' ? d.lieu : '',
      heure_debut: (finalTimeKind === 'range' || finalTimeKind === 'overnight') ? d.heure_debut : '',
      heure_fin: (finalTimeKind === 'range' || finalTimeKind === 'overnight') ? d.heure_fin : '',
    }

    selectedCellDispos.value.push(dispo as Disponibilite)
    if (dispo.lieu) {
      const canon = canonicalizeLieu(dispo.lieu)
      if (canon) {
        lieuOptions.value = Array.from(new Set([...lieuOptions.value, canon]))
      }
    }
    
    newDispo.value = {
      nom: '', prenom: '', metier: '', phone: '', email: '', ville: '', tenantId: 'keydispo',
      date: selectedCell.value.date,
      collaborateurId: selectedCell.value.collaborateurId,
      lieu: '', heure_debut: '', heure_fin: '',
      type: 'mission', timeKind: 'range', slots: [], isFullDay: false,
    } as Disponibilite
  }

  function removeDispo(index: number) {
    selectedCellDispos.value.splice(index, 1)
    saveDispos()
  }

  function editDispo(dispo: Disponibilite | (Disponibilite & { _cont?: 'start' | 'end' }), cellDate?: string) {
    const originalDate = dispo.date
    const k = resolveDispoKind(dispo as Disponibilite)
    const targetDate = (cellDate && cellDate !== originalDate && k.timeKind === 'range') ? originalDate : (cellDate || originalDate)
    openDispoModal((dispo as any).collaborateurId || `${dispo.nom}-${dispo.prenom}`, targetDate)
  }

  // === EDITING LINE FUNCTIONS ===
  function editDispoLine(index: number) {
    if (editingDispoIndex.value === index) {
      cancelEditDispo()
      return
    }
    const dispo = selectedCellDispos.value[index]
    if (!dispo) return
    editingDispoIndex.value = index
    isAddingNewDispo.value = false
    editingDispo.value = { ...dispo }
  }

  function addNewDispoLine() {
    editingDispoIndex.value = null
    isAddingNewDispo.value = true
    const prefs = getLastFormPreferences()
    editingDispo.value = {
      type: prefs.type,
      timeKind: prefs.timeKind,
      heure_debut: prefs.heure_debut,
      heure_fin: prefs.heure_fin,
      lieu: prefs.lieu,
      slots: [...prefs.slots]
    }
  }

  function cancelEditDispo() {
    editingDispoIndex.value = null
    isAddingNewDispo.value = false
    editingDispo.value = {
      type: 'disponible',
      timeKind: 'full-day',
      heure_debut: '09:00',
      heure_fin: '17:00',
      lieu: '',
      slots: []
    }
  }

  function setEditingType(type: string) {
    editingDispo.value.type = type as Disponibilite['type']
    if (type === 'indisponible') {
      editingDispo.value.timeKind = 'full-day'
    }
  }

  function setEditingTimeKind(timeKind: string) {
    editingDispo.value.timeKind = timeKind as Disponibilite['timeKind']
    if (timeKind === 'full-day') {
      editingDispo.value.heure_debut = ''
      editingDispo.value.heure_fin = ''
      editingDispo.value.slots = []
    } else if (timeKind === 'range') {
      if (!editingDispo.value.heure_debut) editingDispo.value.heure_debut = '09:00'
      if (!editingDispo.value.heure_fin) editingDispo.value.heure_fin = '17:00'
      editingDispo.value.slots = []
    } else if (timeKind === 'slot') {
      editingDispo.value.slots = editingDispo.value.slots || []
      editingDispo.value.heure_debut = ''
      editingDispo.value.heure_fin = ''
    } else if (timeKind === 'overnight') {
      editingDispo.value.slots = []
      editingDispo.value.heure_debut = ''
      editingDispo.value.heure_fin = ''
    }
  }

  function toggleEditingSlot(slotValue: string) {
    if (slotValue === 'journee') {
      editingDispo.value.timeKind = 'full-day'
      editingDispo.value.slots = []
      editingDispo.value.heure_debut = ''
      editingDispo.value.heure_fin = ''
      return
    }
    const currentSlots = editingDispo.value.slots || []
    editingDispo.value.slots = currentSlots.includes(slotValue)
      ? currentSlots.filter(s => s !== slotValue)
      : [...currentSlots, slotValue]
  }

  function saveEditDispo() {
    if (!isEditFormValid.value) return

    let processedDispo = { ...editingDispo.value }
    if (processedDispo.timeKind === 'range' && processedDispo.heure_debut && processedDispo.heure_fin) {
      const startTime = parseInt(processedDispo.heure_debut.split(':')[0])
      const endTime = parseInt(processedDispo.heure_fin.split(':')[0])
      if (endTime < startTime || (endTime === startTime && processedDispo.heure_fin < processedDispo.heure_debut)) {
        // Auto-detect overnight - kept as range but system detects it
      }
    }

    const newDispoValue = sanitizeDisposition(processedDispo) as Disponibilite

    if (isAddingNewDispo.value) {
      selectedCellDispos.value = [newDispoValue]
      saveFormPreferences({
        type: processedDispo.type,
        timeKind: processedDispo.timeKind,
        heure_debut: processedDispo.heure_debut || '09:00',
        heure_fin: processedDispo.heure_fin || '17:00',
        lieu: processedDispo.lieu || '',
        slots: processedDispo.slots || []
      })
    } else {
      const index = editingDispoIndex.value!
      const temp = selectedCellDispos.value.slice()
      temp[index] = newDispoValue
      if (wouldConflict(temp)) return
      selectedCellDispos.value[index] = newDispoValue
    }

    cancelEditDispo()
    saveDispos()
  }

  // === SAVE FUNCTIONS (late-binding pattern) ===
  // Ces fonctions sont définies après l'initialisation via setSaveHandlers
  let _saveDisposHandler: (() => Promise<void>) | null = null
  let _saveBatchDisposHandler: (() => Promise<void>) | null = null
  let _deleteBatchDisposHandler: (() => Promise<void>) | null = null

  function setSaveHandlers(handlers: {
    saveDispos: () => Promise<void>
    saveBatchDispos: () => Promise<void>
    deleteBatchDispos: () => Promise<void>
  }) {
    _saveDisposHandler = handlers.saveDispos
    _saveBatchDisposHandler = handlers.saveBatchDispos
    _deleteBatchDisposHandler = handlers.deleteBatchDispos
  }

  async function saveDispos(): Promise<void> {
    if (_saveDisposHandler) {
      await _saveDisposHandler()
    } else {
      console.warn('[usePlanningModal] saveDispos not configured - call setSaveHandlers first')
    }
  }

  async function saveBatchDispos(): Promise<void> {
    if (_saveBatchDisposHandler) {
      await _saveBatchDisposHandler()
    } else {
      console.warn('[usePlanningModal] saveBatchDispos not configured - call setSaveHandlers first')
    }
  }

  async function deleteBatchDispos(): Promise<void> {
    if (_deleteBatchDisposHandler) {
      await _deleteBatchDisposHandler()
    } else {
      console.warn('[usePlanningModal] deleteBatchDispos not configured - call setSaveHandlers first')
    }
  }

  return {
    // État principal
    showModal,
    showDispoModal,
    showCollabModal,
    selectedCell,
    selectedCollaborateur,
    selectedCellDispos,
    selectedCollabDispos,
    
    // État d'édition
    editingDispoIndex,
    isAddingNewDispo,
    editingDispo,
    newDispo,
    saving,
    
    // Batch helpers
    mockBatchCell,
    batchDateRangeFormatted,
    
    // Validations
    canAddDispo,
    isEditFormValid,
    isDetectedOvernight,
    
    // Open/Close
    openModalForCollaborateur,
    openDispoModal,
    openBatchModal,
    cancelModal,
    
    // Dispo management
    addNewDispo,
    removeDispo,
    editDispo,
    
    // Line editing
    editDispoLine,
    addNewDispoLine,
    cancelEditDispo,
    setEditingType,
    setEditingTimeKind,
    toggleEditingSlot,
    saveEditDispo,
    
    // Save functions (placeholders)
    saveDispos,
    saveBatchDispos,
    deleteBatchDispos,
    setSaveHandlers,
    
    // Utilities
    getSelectedCollaborateur,
    timeKindOptionsFor,
    timeKindOptionsFilteredFor,
    isOvernightTime,
    getTypeColor,
    getTypeIcon,
    getTimeKindIcon,
    getTypeText,
    getSlotText,
    onCreateLieu,
    sanitizeDisposition
  }
}
