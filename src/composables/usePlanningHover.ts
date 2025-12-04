/**
 * usePlanningHover - Composable pour gérer le hover des cellules du planning
 * Encapsule la logique de survol (crosshair, hover collaboratif, nettoyage)
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface UsePlanningHoverOptions {
  planningScrollRef: Ref<HTMLElement | undefined>
  isScrollingFast: Ref<boolean>
  isBusy: ComputedRef<boolean>
  collaborationService: any
  isDraggingSelection: Ref<boolean>
  hasMouseMoved: Ref<boolean>
}

export interface DOMCache {
  columnElements: Map<number, HTMLElement[]>
  rowElements: Map<number, HTMLElement[]>
}

export function usePlanningHover(options: UsePlanningHoverOptions) {
  const {
    planningScrollRef,
    isScrollingFast,
    isBusy,
    collaborationService,
    isDraggingSelection,
    hasMouseMoved
  } = options

  // === ÉTAT RÉACTIF ===
  const hoveredColumnIndex = ref(-1)
  const hoveredRowIndex = ref(-1)
  
  // Timers
  let hoverDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let hoverEndGraceTimer: ReturnType<typeof setTimeout> | null = null
  let cleanHoverThrottleTimer: number | null = null
  let pendingCleanHover = false
  let _debounceTimer: ReturnType<typeof setTimeout> | null = null
  
  // Variables de tracking pour le cache DOM
  let _currentHighlightedColumn = -1
  let _currentHighlightedRow = -1
  let _lastPointerX = 0
  let _lastPointerY = 0
  
  // Cache DOM pour les éléments
  const _domCache: DOMCache = {
    columnElements: new Map(),
    rowElements: new Map()
  }

  // === NETTOYAGE DES HIGHLIGHTS ===
  
  /**
   * Nettoyer complètement le state de highlighting
   */
  function clearAllHighlights() {
    // Nettoyer avec le cache DOM
    if (_currentHighlightedColumn >= 0) {
      const columnElements = _domCache.columnElements.get(_currentHighlightedColumn)
      if (columnElements) {
        columnElements.forEach(el => el.classList.remove('dom-column-hovered'))
      }
    }
    
    if (_currentHighlightedRow >= 0) {
      const rowElements = _domCache.rowElements.get(_currentHighlightedRow)
      if (rowElements) {
        rowElements.forEach(el => el.classList.remove('dom-row-hovered'))
      }
    }
    
    // Reset des variables de tracking
    _currentHighlightedColumn = -1
    _currentHighlightedRow = -1
    
    // Reset Vue reactivity
    hoveredColumnIndex.value = -1
    hoveredRowIndex.value = -1
    
    // Nettoyer le timer
    if (_debounceTimer) {
      clearTimeout(_debounceTimer)
      _debounceTimer = null
    }
  }

  /**
   * Nettoyer les highlights crosshair avec throttle (max 30fps)
   */
  function cleanHoverHighlights() {
    const scroller = planningScrollRef.value
    if (!scroller) return
    
    // Si un nettoyage est déjà programmé, ne rien faire
    if (pendingCleanHover) return
    
    // Si le throttle est actif, programmer pour plus tard
    if (cleanHoverThrottleTimer !== null) {
      pendingCleanHover = true
      return
    }
    
    // Exécuter le nettoyage immédiatement
    doCleanHoverHighlights(scroller)
    
    // Activer le throttle pour les prochains appels
    cleanHoverThrottleTimer = window.setTimeout(() => {
      cleanHoverThrottleTimer = null
      if (pendingCleanHover) {
        pendingCleanHover = false
        cleanHoverHighlights()
      }
    }, 33) // ~30fps
  }
  
  function doCleanHoverHighlights(scroller: HTMLElement) {
    // Nettoyer les attributs de hover
    scroller.querySelectorAll('[data-column-hover="true"]').forEach(el => {
      el.removeAttribute('data-column-hover')
    })
    scroller.querySelectorAll('[data-row-hover="true"]').forEach(el => {
      el.removeAttribute('data-row-hover')
    })
  }

  // === GESTION DU HOVER COLLABORATIF ===
  
  /**
   * Gérer le survol d'une cellule (instantané)
   */
  function handleCellHover(collaborateurId: string, date: string) {
    // Annuler le timer de fin de hover si on revient rapidement
    if (hoverEndGraceTimer) {
      clearTimeout(hoverEndGraceTimer)
      hoverEndGraceTimer = null
    }

    // Annuler le timer précédent de debounce s'il existe
    if (hoverDebounceTimer) {
      clearTimeout(hoverDebounceTimer)
      hoverDebounceTimer = null
    }

    // Mise à jour instantanée pour une réactivité maximale
    if (collaborationService && typeof collaborationService.updateHoveredCell === 'function') {
      collaborationService.updateHoveredCell(collaborateurId, date)
    }
  }

  /**
   * Gérer la sortie du survol d'une cellule (avec grâce)
   */
  function handleCellHoverEnd() {
    // Annuler le timer de debounce
    if (hoverDebounceTimer) {
      clearTimeout(hoverDebounceTimer)
      hoverDebounceTimer = null
    }

    // Petite grâce avant de nettoyer pour éviter le flicker
    if (hoverEndGraceTimer) {
      clearTimeout(hoverEndGraceTimer)
      hoverEndGraceTimer = null
    }
    hoverEndGraceTimer = setTimeout(() => {
      if (collaborationService && typeof collaborationService.clearHoveredCell === 'function') {
        collaborationService.clearHoveredCell()
      }
      hoverEndGraceTimer = null
    }, 250)
  }

  /**
   * Entrée de souris sur une cellule avec debounce pour le hover collaboratif
   */
  function handleCellMouseEnter(
    collaborateurId: string, 
    date: string,
    callbacks?: {
      onDragSelect?: (collaborateurId: string, date: string) => void
      validateSelection?: () => boolean
      cleanSelection?: () => void
      getCurrentSelectedCollaborateur?: () => string | null
    }
  ) {
    // Éviter de propager les survols pendant le scroll rapide
    if (isScrollingFast.value) return
    
    // Debounce pour le hover
    if (hoverDebounceTimer) {
      clearTimeout(hoverDebounceTimer)
      hoverDebounceTimer = null
    }
    
    // Gérer la sélection SANS debounce pour réactivité immédiate
    if (isDraggingSelection.value && callbacks?.onDragSelect) {
      hasMouseMoved.value = true
      
      // Validation stricte du collaborateur
      const currentSelectedCollaborateur = callbacks.getCurrentSelectedCollaborateur?.()
      if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
        isDraggingSelection.value = false
        return
      }
      
      callbacks.onDragSelect(collaborateurId, date)
      return // Pas de hover collaboratif pendant la sélection
    }
    
    // Hover collaboratif avec debounce
    hoverDebounceTimer = setTimeout(() => {
      handleCellHover(collaborateurId, date)
    }, 100)
  }

  // === GESTION DU MOUVEMENT SOURIS SUR LA GRILLE ===
  
  /**
   * Sortie de la grille
   */
  function onGridMouseLeave(stopAutoScroll?: () => void) {
    clearAllHighlights()
    
    stopAutoScroll?.()
    
    // Nettoyer les attributs de column hover ET row hover
    const scroller = planningScrollRef.value
    if (scroller) {
      scroller.querySelectorAll('[data-column-hover="true"]').forEach(el => {
        el.removeAttribute('data-column-hover')
      })
      scroller.querySelectorAll('[data-row-hover="true"]').forEach(el => {
        el.removeAttribute('data-row-hover')
      })
    }
    
    // Reset des index
    hoveredColumnIndex.value = -1
    hoveredRowIndex.value = -1
    
    // Reset des coordonnées
    _lastPointerX = 0
    _lastPointerY = 0
    
    // Nettoyer le hover collaboratif
    if (collaborationService?.onMouseLeavePlanning) {
      collaborationService.onMouseLeavePlanning()
    }
  }

  // === GETTERS ===
  
  function getLastPointerPosition() {
    return { x: _lastPointerX, y: _lastPointerY }
  }
  
  function setLastPointerPosition(x: number, y: number) {
    _lastPointerX = x
    _lastPointerY = y
  }

  // === CLEANUP ===
  
  function cleanup() {
    if (hoverDebounceTimer) {
      clearTimeout(hoverDebounceTimer)
      hoverDebounceTimer = null
    }
    if (hoverEndGraceTimer) {
      clearTimeout(hoverEndGraceTimer)
      hoverEndGraceTimer = null
    }
    if (cleanHoverThrottleTimer !== null) {
      clearTimeout(cleanHoverThrottleTimer)
      cleanHoverThrottleTimer = null
    }
    if (_debounceTimer) {
      clearTimeout(_debounceTimer)
      _debounceTimer = null
    }
    _domCache.columnElements.clear()
    _domCache.rowElements.clear()
    clearAllHighlights()
  }

  return {
    // État
    hoveredColumnIndex,
    hoveredRowIndex,
    
    // Getters/Setters pour position souris
    getLastPointerPosition,
    setLastPointerPosition,
    
    // Fonctions de nettoyage
    clearAllHighlights,
    cleanHoverHighlights,
    
    // Fonctions de hover
    handleCellHover,
    handleCellHoverEnd,
    handleCellMouseEnter,
    
    // Gestion grille
    onGridMouseLeave,
    
    // Cache DOM
    domCache: _domCache,
    
    // Cleanup
    cleanup
  }
}
