/**
 * usePlanningSelection.ts
 * 
 * Composable gérant la sélection de cellules dans le planning :
 * - Mode sélection (Ctrl/Cmd ou toggle mobile)
 * - Sélection par drag
 * - Validation de la règle "un seul collaborateur"
 * - Synchronisation avec le service de collaboration
 */

import { ref, computed, watch, type Ref, type ComputedRef, onMounted, onUnmounted } from 'vue'

// Types
interface UsePlanningSelectionOptions {
  // Vue
  isMobileView: Ref<boolean>
  isCollaborateurInterface: ComputedRef<boolean>
  canAccessAdminFeatures: ComputedRef<boolean>
  isScrollingFast: Ref<boolean>
  
  // Collaboration service (interface minimale)
  collaborationService: {
    isActive: boolean
    updateSelectedCells: (cells: Set<string>) => void
    clearSelectedCells: () => void
  }
  
  // Callbacks optionnels
  onSelectionChange?: (cells: Set<string>) => void
  stopAutoScroll?: () => void
}

// Pattern regex pour extraire la date d'un cellId "collaborateurId-YYYY-MM-DD"
const CELL_DATE_REGEX = /-(\d{4}-\d{2}-\d{2})$/

export function usePlanningSelection(options: UsePlanningSelectionOptions) {
  const {
    isMobileView,
    isCollaborateurInterface,
    canAccessAdminFeatures,
    isScrollingFast,
    collaborationService,
    onSelectionChange,
    stopAutoScroll
  } = options

  // === ÉTAT ===
  const selectedCells = ref<Set<string>>(new Set())
  const isSelectionMode = ref(false)
  const isDraggingSelection = ref(false)
  const dragStartCell = ref<string | null>(null)
  const hasMouseMoved = ref(false) // Flag pour distinguer clic simple vs drag

  // Debounce timer pour la synchronisation
  let syncSelectedCellsTimer: number | null = null

  // === COMPUTED ===
  
  // ID du collaborateur actuellement sélectionné (pour griser les autres lignes)
  const selectedCollaborateurId = computed(() => {
    if (selectedCells.value.size === 0) return null
    return getCurrentSelectedCollaborateur()
  })

  // === HELPERS ===

  /**
   * Extrait l'ID du collaborateur d'un cellId
   * Format attendu: "collaborateurId-YYYY-MM-DD"
   */
  function extractCollaborateurIdFromCell(cellId: string): string | null {
    const match = cellId.match(CELL_DATE_REGEX)
    if (!match) return null
    return cellId.substring(0, cellId.length - match[1].length - 1)
  }

  /**
   * Extrait la date d'un cellId
   * Format attendu: "collaborateurId-YYYY-MM-DD"
   */
  function extractDateFromCell(cellId: string): string | null {
    const match = cellId.match(CELL_DATE_REGEX)
    return match ? match[1] : null
  }

  /**
   * Obtenir le collaborateur actuellement sélectionné
   */
  function getCurrentSelectedCollaborateur(): string | null {
    if (selectedCells.value.size === 0) return null
    const firstCellId = Array.from(selectedCells.value)[0]
    return extractCollaborateurIdFromCell(firstCellId)
  }

  /**
   * Valider que toutes les cellules sélectionnées appartiennent au même collaborateur
   */
  function validateSingleCollaboratorSelection(): boolean {
    if (selectedCells.value.size <= 1) return true
    
    const collaborateurs = new Set<string>()
    for (const cellId of selectedCells.value) {
      const collabId = extractCollaborateurIdFromCell(cellId)
      if (collabId) collaborateurs.add(collabId)
    }
    return collaborateurs.size <= 1
  }

  /**
   * Nettoyer la sélection pour ne garder que les cellules du même collaborateur
   */
  function cleanSelectionToSingleCollaborator() {
    if (selectedCells.value.size <= 1) return
    
    const currentCollaborateur = getCurrentSelectedCollaborateur()
    if (!currentCollaborateur) return
    
    const validCells = new Set<string>()
    for (const cellId of selectedCells.value) {
      const collabId = extractCollaborateurIdFromCell(cellId)
      if (collabId === currentCollaborateur) {
        validCells.add(cellId)
      }
    }
    selectedCells.value = validCells
  }

  /**
   * Vérifier si on peut ajouter une cellule sans violer la règle du collaborateur unique
   */
  function canAddCellToSelection(collaborateurId: string): boolean {
    if (selectedCells.value.size === 0) return true
    const currentCollaborateur = getCurrentSelectedCollaborateur()
    return currentCollaborateur === collaborateurId
  }

  // === ACTIONS ===

  /**
   * Vider la sélection
   */
  function clearSelection() {
    selectedCells.value.clear()
    selectedCells.value = new Set() // Déclencher la réactivité
    
    // Nettoyer aussi les sélections distantes
    if (collaborationService.isActive) {
      collaborationService.clearSelectedCells()
    }
  }

  /**
   * Toggle le mode sélection (pour mobile)
   */
  function toggleSelectionMode() {
    isSelectionMode.value = !isSelectionMode.value
    
    // Si on sort du mode sélection MANUELLEMENT, vider les sélections
    if (!isSelectionMode.value) {
      clearSelection()
    }
  }

  /**
   * Gestion du mousedown sur une cellule
   */
  function handleCellMouseDown(collaborateurId: string, date: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      
      // VALIDATION: Aucune sélection multi-collaborateur autorisée
      if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
        return
      }
      
      // Réinitialiser le flag de mouvement
      hasMouseMoved.value = false
      
      isDraggingSelection.value = true
      dragStartCell.value = `${collaborateurId}-${date}`
      
      // Toggle la cellule de départ
      const cellId = `${collaborateurId}-${date}`
      if (selectedCells.value.has(cellId)) {
        selectedCells.value.delete(cellId)
      } else {
        selectedCells.value.add(cellId)
      }
      
      // VALIDATION POST-AJOUT
      if (!validateSingleCollaboratorSelection()) {
        cleanSelectionToSingleCollaborator()
      }
      
      selectedCells.value = new Set(selectedCells.value)
    }
  }

  /**
   * Gestion du mouseenter sur une cellule (pendant drag)
   * Retourne true si l'événement a été géré par la sélection
   */
  function handleCellMouseEnterForSelection(collaborateurId: string, date: string): boolean {
    // Éviter pendant le scroll rapide
    if (isScrollingFast.value) return false
    
    // Gérer la sélection SANS debounce pour réactivité immédiate
    if (isDraggingSelection.value) {
      // Marquer qu'on a bougé la souris pendant le drag
      hasMouseMoved.value = true
      
      const cellId = `${collaborateurId}-${date}`
      
      // VALIDATION: Bloquer tout changement de collaborateur
      const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
      
      if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
        isDraggingSelection.value = false
        dragStartCell.value = null
        return true
      }
      
      // Ajouter à la sélection pendant le glissement
      if (!selectedCells.value.has(cellId)) {
        selectedCells.value.add(cellId)
        // Validation post-ajout
        if (!validateSingleCollaboratorSelection()) {
          cleanSelectionToSingleCollaborator()
        }
        // Forcer la réactivité
        selectedCells.value = new Set(selectedCells.value)
      }
      return true // Ne pas faire de hover collaboratif pendant la sélection
    }
    
    return false
  }

  /**
   * Gestion du mouseup sur une cellule
   */
  function handleCellMouseUp() {
    if (isDraggingSelection.value) {
      isDraggingSelection.value = false
      dragStartCell.value = null
      
      // Arrêter l'auto-scroll
      if (stopAutoScroll) {
        stopAutoScroll()
      }
      
      // VALIDATION FINALE
      if (!validateSingleCollaboratorSelection()) {
        cleanSelectionToSingleCollaborator()
      }
      
      // En vue collaborateur, sortir du mode sélection
      if (isCollaborateurInterface.value && !canAccessAdminFeatures.value) {
        isSelectionMode.value = false
      }
    }
  }

  /**
   * Gestionnaire global pour arrêter le glissement si on sort de la zone
   */
  function handleGlobalMouseUp() {
    if (isDraggingSelection.value) {
      isDraggingSelection.value = false
      dragStartCell.value = null
      
      // Arrêter l'auto-scroll
      if (stopAutoScroll) {
        stopAutoScroll()
      }
      
      // Si on est en mode collaborateur, vider la sélection par sécurité
      if (isCollaborateurInterface.value) {
        selectedCells.value.clear()
      }
    }
  }

  /**
   * Obtenir les infos de sélection pour le batch modal
   */
  function getSelectionForBatch(): { collaborateurId: string; dates: string[] } | null {
    if (selectedCells.value.size === 0) return null
    
    const cellsArray = Array.from(selectedCells.value)
    const firstCellId = cellsArray[0]
    const collabId = extractCollaborateurIdFromCell(firstCellId)
    
    if (!collabId) return null
    
    // Filtrer pour ne garder que les cellules du même collaborateur
    const sameCollabCells = cellsArray.filter(id => {
      const cellCollabId = extractCollaborateurIdFromCell(id)
      return cellCollabId === collabId
    })
    
    const dates = sameCollabCells
      .map(cellId => extractDateFromCell(cellId))
      .filter((date): date is string => date !== null)
    
    return { collaborateurId: collabId, dates }
  }

  // === EVENT HANDLERS POUR CLAVIER ===

  function handleKeyDown(e: KeyboardEvent) {
    // Sur desktop, activer le mode sélection avec Ctrl/Cmd
    // Sur mobile, laisser le FAB gérer le mode sélection
    if ((e.ctrlKey || e.metaKey) && !isMobileView.value) {
      isSelectionMode.value = true
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    // Sur desktop, désactiver le mode sélection quand on relâche Ctrl/Cmd
    // Sur mobile, laisser le FAB gérer le mode sélection
    if (!e.ctrlKey && !e.metaKey && !isMobileView.value) {
      isSelectionMode.value = false
    }
  }

  // === WATCHERS ===

  // Watcher pour les classes CSS du body
  watch([isSelectionMode, isDraggingSelection], ([selMode, dragMode]) => {
    document.body.classList.toggle('selection-mode', selMode)
    document.body.classList.toggle('dragging-selection', dragMode)
  })

  // Watcher pour synchroniser les sélections
  watch(selectedCells, () => {
    // Debounce la synchronisation
    if (syncSelectedCellsTimer) {
      clearTimeout(syncSelectedCellsTimer)
    }
    syncSelectedCellsTimer = window.setTimeout(() => {
      if (collaborationService.isActive) {
        collaborationService.updateSelectedCells(selectedCells.value)
      }
      
      // Callback optionnel
      if (onSelectionChange) {
        onSelectionChange(selectedCells.value)
      }
    }, 100)
  }, { deep: true })

  // === LIFECYCLE ===

  function setupKeyboardListeners() {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }

  function cleanupKeyboardListeners() {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    document.removeEventListener('mouseup', handleGlobalMouseUp)
  }

  // Cleanup du timer
  function cleanup() {
    if (syncSelectedCellsTimer) {
      clearTimeout(syncSelectedCellsTimer)
      syncSelectedCellsTimer = null
    }
    cleanupKeyboardListeners()
    document.body.classList.remove('selection-mode')
    document.body.classList.remove('dragging-selection')
  }

  return {
    // État
    selectedCells,
    isSelectionMode,
    isDraggingSelection,
    dragStartCell,
    hasMouseMoved,
    selectedCollaborateurId,
    
    // Helpers
    extractCollaborateurIdFromCell,
    extractDateFromCell,
    getCurrentSelectedCollaborateur,
    validateSingleCollaboratorSelection,
    cleanSelectionToSingleCollaborator,
    canAddCellToSelection,
    
    // Actions
    clearSelection,
    toggleSelectionMode,
    handleCellMouseDown,
    handleCellMouseEnterForSelection,
    handleCellMouseUp,
    handleGlobalMouseUp,
    getSelectionForBatch,
    
    // Keyboard
    handleKeyDown,
    handleKeyUp,
    setupKeyboardListeners,
    cleanupKeyboardListeners,
    
    // Lifecycle
    cleanup
  }
}
