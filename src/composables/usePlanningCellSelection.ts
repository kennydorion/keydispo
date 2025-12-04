import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

/**
 * Composable pour gérer la sélection de cellules dans le planning
 * Gère le mode sélection, le glisser-déposer, et la validation mono-collaborateur
 */

export interface UsePlanningCellSelectionOptions {
  /** Service de collaboration pour synchroniser les sélections */
  collaborationService: any
  /** Si l'utilisateur est en vue collaborateur */
  isCollaborateurInterface: ComputedRef<boolean>
  /** Si l'utilisateur peut accéder aux fonctionnalités admin */
  canAccessAdminFeatures: ComputedRef<boolean>
  /** Si le scroll est rapide (désactiver les interactions) */
  isScrollingFast: Ref<boolean>
  /** Si la souris a bougé pendant le drag */
  hasMouseMoved: Ref<boolean>
  /** Fonction pour arrêter l'auto-scroll */
  stopAutoScroll: () => void
  /** Fonction pour gérer le hover collaboratif */
  handleCellHover: (collaborateurId: string, date: string) => void
}

// Pattern regex pour extraire la date d'un cellId "collaborateurId-YYYY-MM-DD"
const CELL_DATE_REGEX = /-(\d{4}-\d{2}-\d{2})$/

export function usePlanningCellSelection(options: UsePlanningCellSelectionOptions) {
  const {
    collaborationService,
    isCollaborateurInterface,
    canAccessAdminFeatures,
    isScrollingFast,
    hasMouseMoved,
    stopAutoScroll,
    handleCellHover
  } = options

  // États de sélection
  const selectedCells = ref<Set<string>>(new Set())
  const isSelectionMode = ref(false)
  const isDraggingSelection = ref(false)
  const dragStartCell = ref<string | null>(null)

  // Timer pour le debounce du hover collaboratif
  let hoverDebounceTimer: ReturnType<typeof setTimeout> | null = null

  // Computed: ID du collaborateur actuellement sélectionné
  const selectedCollaborateurId = computed(() => {
    if (selectedCells.value.size === 0) return null
    return getCurrentSelectedCollaborateur()
  })

  /**
   * Extrait l'ID du collaborateur d'un cellId
   */
  function extractCollaborateurIdFromCell(cellId: string): string | null {
    const match = cellId.match(CELL_DATE_REGEX)
    if (!match) return null
    return cellId.substring(0, cellId.length - match[1].length - 1)
  }

  /**
   * Obtenir le collaborateur actuellement sélectionné (s'il y en a un)
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
   * Vérifier si on peut ajouter une cellule à la sélection
   */
  function canAddCellToSelection(collaborateurId: string): boolean {
    if (selectedCells.value.size === 0) return true
    const currentCollaborateur = getCurrentSelectedCollaborateur()
    return currentCollaborateur === collaborateurId
  }

  /**
   * Vider la sélection
   */
  function clearSelection() {
    selectedCells.value.clear()
    selectedCells.value = new Set() // Déclencher la réactivité
    
    // Nettoyer aussi les sélections distantes
    if (collaborationService?.isActive) {
      collaborationService.clearSelectedCells()
    }
  }

  /**
   * Toggler le mode sélection sur mobile
   */
  function toggleSelectionMode() {
    isSelectionMode.value = !isSelectionMode.value
    
    // Si on sort du mode sélection MANUELLEMENT, vider les sélections
    if (!isSelectionMode.value) {
      clearSelection()
    }
  }

  /**
   * Gérer le mousedown sur une cellule
   */
  function handleCellMouseDown(collaborateurId: string, date: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      
      // VALIDATION ULTRA-STRICTE: Aucune sélection multi-collaborateur autorisée
      if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
        return
      }
      
      // Réinitialiser le flag de mouvement
      hasMouseMoved.value = false
      
      isDraggingSelection.value = true
      dragStartCell.value = `${collaborateurId}-${date}`
      
      // Sélectionner/désélectionner la cellule de départ
      const cellId = `${collaborateurId}-${date}`
      if (selectedCells.value.has(cellId)) {
        selectedCells.value.delete(cellId)
      } else {
        selectedCells.value.add(cellId)
      }
      
      // VALIDATION POST-AJOUT (sécurité supplémentaire)
      if (!validateSingleCollaboratorSelection()) {
        cleanSelectionToSingleCollaborator()
      }
      
      selectedCells.value = new Set(selectedCells.value)
    }
  }

  /**
   * Gérer l'entrée de la souris dans une cellule
   */
  function handleCellMouseEnter(collaborateurId: string, date: string) {
    // Éviter de propager les survols pendant le scroll rapide
    if (isScrollingFast.value) return
    
    // Debounce pour le hover collaboratif (pas pour la sélection)
    if (hoverDebounceTimer) {
      clearTimeout(hoverDebounceTimer)
      hoverDebounceTimer = null
    }
    
    // Gérer la sélection SANS debounce pour réactivité immédiate
    if (isDraggingSelection.value) {
      // Marquer qu'on a bougé la souris pendant le drag
      hasMouseMoved.value = true
      
      const cellId = `${collaborateurId}-${date}`
      
      // VALIDATION ULTRA-STRICTE: Bloquer immédiatement toute tentative de changement de collaborateur
      const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
      
      if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
        isDraggingSelection.value = false
        dragStartCell.value = null
        return
      }
      
      // Ajouter à la sélection pendant le glissement (même pendant l'auto-scroll)
      if (!selectedCells.value.has(cellId)) {
        selectedCells.value.add(cellId)
        // Validation post-ajout (sécurité)
        if (!validateSingleCollaboratorSelection()) {
          cleanSelectionToSingleCollaborator()
        }
        // Forcer la réactivité
        selectedCells.value = new Set(selectedCells.value)
      }
      return // Ne pas faire de hover collaboratif pendant la sélection
    }
    
    // Hover collaboratif avec debounce (seulement si pas en mode sélection)
    hoverDebounceTimer = setTimeout(() => {
      handleCellHover(collaborateurId, date)
    }, 100)
  }

  /**
   * Gérer le mouseup sur une cellule
   */
  function handleCellMouseUp() {
    if (isDraggingSelection.value) {
      isDraggingSelection.value = false
      dragStartCell.value = null
      
      // Arrêter l'auto-scroll
      stopAutoScroll()
      
      // VALIDATION FINALE: S'assurer que la sélection respecte les règles
      if (!validateSingleCollaboratorSelection()) {
        cleanSelectionToSingleCollaborator()
      }
      
      // En vue collaborateur, sortir explicitement du mode sélection pour éviter de bloquer l'ouverture de modale
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
      stopAutoScroll()
      
      // Si on est en mode collaborateur, on vide aussi la sélection par sécurité
      if (isCollaborateurInterface.value) {
        selectedCells.value.clear()
      }
    }
  }

  /**
   * Nettoyage des timers
   */
  function cleanup() {
    if (hoverDebounceTimer) {
      clearTimeout(hoverDebounceTimer)
      hoverDebounceTimer = null
    }
  }

  return {
    // États
    selectedCells,
    isSelectionMode,
    isDraggingSelection,
    dragStartCell,
    selectedCollaborateurId,
    
    // Fonctions utilitaires
    extractCollaborateurIdFromCell,
    getCurrentSelectedCollaborateur,
    validateSingleCollaboratorSelection,
    cleanSelectionToSingleCollaborator,
    canAddCellToSelection,
    
    // Actions
    clearSelection,
    toggleSelectionMode,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    handleGlobalMouseUp,
    cleanup
  }
}
