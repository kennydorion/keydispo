/**
 * usePlanningScroll.ts
 * 
 * Composable gérant le scroll horizontal/vertical du planning :
 * - Extension dynamique des jours (prepend/append)
 * - Auto-scroll pendant la sélection par drag
 * - Mise à jour du hover pendant le scroll
 * - Debounce et throttle des événements scroll
 * - Cache des valeurs calculées pour performance
 */

import { ref, computed, type Ref, type ComputedRef, onBeforeUnmount } from 'vue'
import { addDaysStr, diffDays } from '@/utils/dateHelpers'

// Types
interface DayInfo {
  date: string
  // label est optionnel car PlanningDay n'a pas label
  label?: string
  [key: string]: any
}

interface UsePlanningScrollOptions {
  // Refs du DOM
  planningScrollRef: Ref<HTMLElement | undefined>
  rowsRef: Ref<HTMLElement | null>
  
  // Dimensions
  dayWidth: Ref<number>
  stickyLeftWidth: Ref<number>
  rowHeight: Ref<number>
  
  // Données
  loadedDays: Ref<DayInfo[]>
  visibleDays: ComputedRef<DayInfo[]>
  filteredCollaborateurs: Ref<any[]>
  paginatedCollaborateurs: ComputedRef<any[]>
  
  // Dates
  dateFrom: ComputedRef<string>
  dateTo: ComputedRef<string>
  minPastDate: ComputedRef<string>
  
  // États
  isScrollingFast: Ref<boolean>
  isBusy: Ref<boolean>
  isSelectionMode: Ref<boolean>
  isDraggingSelection: Ref<boolean>
  extending: Ref<boolean>
  
  // Virtualisation
  windowStartIndex: Ref<number>
  recomputeWindow: (scroller: HTMLElement) => void
  recomputeRowWindow: (scroller: HTMLElement) => void
  
  // Hover (indices)
  hoveredColumnIndex: Ref<number>
  hoveredRowIndex: Ref<number>
  
  // Refs pour les overlays hover
  colHoverEl: Ref<HTMLElement | null>
  colHoverHeaderEl: Ref<HTMLElement | null>
  rowHoverEl: Ref<HTMLElement | null>
  
  // Computed de mesures DOM
  gridLeftBodyPx: Ref<number>
  dayPitchBodyPx: Ref<number>
  rowPitchPx: Ref<number>
  
  // Fonctions externes
  appendDays: (count: number) => Promise<any>
  prependDays: (count: number) => Promise<any>
  prunePastIfFar: (scroller: HTMLElement) => void
  pruneFutureIfFar: (scroller: HTMLElement) => void
  generateDisponibilitesForDateRange: (start: string, end: string) => Promise<any>
  triggerPrefetch: (start: string, end: string) => void
  cleanHoverHighlights: () => void
  
  // Ref du mois visible (à mettre à jour)
  currentVisibleMonth: Ref<string>
}

export function usePlanningScroll(options: UsePlanningScrollOptions) {
  const {
    planningScrollRef,
    rowsRef,
    dayWidth,
    stickyLeftWidth,
    rowHeight,
    loadedDays,
    visibleDays,
    filteredCollaborateurs,
    paginatedCollaborateurs,
    dateFrom,
    dateTo,
    minPastDate,
    isScrollingFast,
    isBusy,
    isSelectionMode,
    isDraggingSelection,
    extending,
    windowStartIndex,
    recomputeWindow,
    recomputeRowWindow,
    hoveredColumnIndex,
    hoveredRowIndex,
    colHoverEl,
    colHoverHeaderEl,
    rowHoverEl,
    gridLeftBodyPx,
    dayPitchBodyPx,
    rowPitchPx,
    appendDays,
    prependDays,
    prunePastIfFar,
    pruneFutureIfFar,
    generateDisponibilitesForDateRange,
    triggerPrefetch,
    cleanHoverHighlights,
    currentVisibleMonth
  } = options

  // Late-bound function for handleCellMouseEnter (set after definition)
  let _handleCellMouseEnter: ((collaborateurId: string, date: string) => void) | null = null
  function setHandleCellMouseEnter(fn: (collaborateurId: string, date: string) => void) {
    _handleCellMouseEnter = fn
  }

  // Late-bound function for generateDisponibilitesForDateRange (set after definition in PlanningSemaine)
  let _generateDisponibilitesForDateRange = generateDisponibilitesForDateRange
  function setGenerateDisponibilitesForDateRange(fn: (start: string, end: string) => Promise<any>) {
    _generateDisponibilitesForDateRange = fn
  }

  // === TIMERS ===
  let scrollDebounceTimer: number | null = null
  let scrollEndTimer: number | null = null
  let pendingUpdateHover: HTMLElement | null = null
  let triggerHoverDebounceTimer: number | null = null

  // === AUTO-SCROLL POUR SÉLECTION ===
  let autoScrollRAF: number | null = null
  const isAutoScrolling = ref(false)
  
  // Configuration auto-scroll
  const EDGE_ZONE = 100
  const MAX_SPEED_X = 15
  const MAX_SPEED_Y = 10
  
  // Position souris pour auto-scroll
  let lastClientX = 0
  let lastClientY = 0

  // === CACHE HOVER ===
  let _lastPointerX = 0
  let _lastPointerY = 0
  let _cachedGridValues: {
    gridLeft: number
    pitch: number
    rowsOffset: number
    nRows: number
    rect: DOMRect
    timestamp: number
  } | null = null

  function invalidateHoverCache() {
    _cachedGridValues = null
  }

  function getLastPointerPosition() {
    return { x: _lastPointerX, y: _lastPointerY }
  }

  function setLastPointerPosition(x: number, y: number) {
    _lastPointerX = x
    _lastPointerY = y
  }

  function resetPointerPosition() {
    _lastPointerX = 0
    _lastPointerY = 0
  }

  // === AUTO-SCROLL ===
  function autoScrollLoop() {
    const scroller = planningScrollRef.value
    if (!scroller || !isSelectionMode.value || !isDraggingSelection.value) {
      stopAutoScroll()
      return
    }
    
    const rect = scroller.getBoundingClientRect()
    const mouseX = lastClientX - rect.left
    const mouseY = lastClientY - rect.top
    
    let dx = 0
    let dy = 0
    
    // Calcul simple et direct des déplacements
    if (mouseX < EDGE_ZONE) {
      dx = -MAX_SPEED_X * (1 - mouseX / EDGE_ZONE)
    } else if (mouseX > rect.width - EDGE_ZONE) {
      dx = MAX_SPEED_X * (1 - (rect.width - mouseX) / EDGE_ZONE)
    }
    
    if (mouseY < EDGE_ZONE) {
      dy = -MAX_SPEED_Y * (1 - mouseY / EDGE_ZONE)
    } else if (mouseY > rect.height - EDGE_ZONE) {
      dy = MAX_SPEED_Y * (1 - (rect.height - mouseY) / EDGE_ZONE)
    }
    
    // Appliquer directement - PAS de recompute, le navigateur gère le rendu
    if (dx !== 0) scroller.scrollLeft += dx
    if (dy !== 0) scroller.scrollTop += dy
    
    autoScrollRAF = requestAnimationFrame(autoScrollLoop)
  }

  function handleAutoScroll(e: MouseEvent) {
    lastClientX = e.clientX
    lastClientY = e.clientY
    
    const scroller = planningScrollRef.value
    if (isSelectionMode.value && isDraggingSelection.value && scroller && !autoScrollRAF) {
      isAutoScrolling.value = true
      autoScrollRAF = requestAnimationFrame(autoScrollLoop)
    }
  }

  function stopAutoScroll() {
    if (autoScrollRAF) {
      cancelAnimationFrame(autoScrollRAF)
      autoScrollRAF = null
    }
    // Recompute final quand on arrête
    const scroller = planningScrollRef.value
    if (scroller && isAutoScrolling.value) {
      recomputeWindow(scroller)
      recomputeRowWindow(scroller)
    }
    isAutoScrolling.value = false
  }

  // Gestionnaire global pour le mousemove pendant le drag
  function handleGlobalMouseMoveDuringDrag(e: MouseEvent) {
    if (!isDraggingSelection.value || !planningScrollRef.value) {
      return
    }
    handleAutoScroll(e)
  }

  // === UPDATE HOVER ON SCROLL ===
  // RAF-based throttle pour hover update
  let updateHoverRafId: number | null = null
  
  function updateHoverOnScroll(scroller: HTMLElement) {
    if (!_lastPointerX && !_lastPointerY) return
    
    // Mémoriser le scroller le plus récent
    pendingUpdateHover = scroller
    
    // Si un update RAF est déjà planifié, il utilisera le scroller le plus récent
    if (updateHoverRafId !== null) {
      return
    }
    
    // Planifier l'update au prochain frame
    updateHoverRafId = requestAnimationFrame(() => {
      updateHoverRafId = null
      if (pendingUpdateHover) {
        executeUpdateHover(pendingUpdateHover)
        pendingUpdateHover = null
      }
    })
  }

  function executeUpdateHover(scroller: HTMLElement) {
    if (!_lastPointerX && !_lastPointerY) return
    
    // Utiliser le cache ou recalculer si nécessaire (cache plus long = moins de recalculs)
    const now = performance.now()
    if (!_cachedGridValues || (now - _cachedGridValues.timestamp) > 250) {
      const rowsEl = rowsRef.value
      _cachedGridValues = {
        gridLeft: gridLeftBodyPx.value || stickyLeftWidth.value,
        pitch: dayPitchBodyPx.value || (dayWidth.value + 1),
        rowsOffset: rowsEl ? rowsEl.offsetTop : 0,
        nRows: paginatedCollaborateurs.value.length,
        rect: scroller.getBoundingClientRect(),
        timestamp: now
      }
    }
    
    const { gridLeft, pitch, rowsOffset, nRows, rect } = _cachedGridValues
    
    // Colonne (X)
    const xContent = _lastPointerX - rect.left + scroller.scrollLeft
    const colIdx = Math.floor((xContent - gridLeft) / pitch)
    const colX = colIdx * pitch
    
    if (colIdx < 0 || colIdx >= visibleDays.value.length) {
      colHoverEl.value && (colHoverEl.value.style.transform = 'translate3d(-9999px,0,0)')
      colHoverHeaderEl.value && (colHoverHeaderEl.value.style.transform = 'translate3d(-9999px,0,0)')
    } else {
      const tx = `translate3d(${colX}px,0,0)`
      colHoverEl.value && (colHoverEl.value.style.transform = tx)
      colHoverHeaderEl.value && (colHoverHeaderEl.value.style.transform = tx)
    }
    
    // Ligne (Y)
    const yContent = _lastPointerY - rect.top + scroller.scrollTop - rowsOffset
    if (yContent < 0) {
      rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
      return
    }
    
    let rowIdx = Math.floor(yContent / rowPitchPx.value)
    if (rowIdx < 0 || rowIdx >= nRows) {
      rowHoverEl.value && (rowHoverEl.value.style.transform = 'translate3d(0,-9999px,0)')
      return
    }
    
    rowIdx = Math.max(0, Math.min(nRows - 1, rowIdx))
    const topPx = Math.round(rowIdx * rowPitchPx.value)
    rowHoverEl.value && (rowHoverEl.value.style.transform = `translate3d(0,${topPx}px,0)`)
  }

  // === TRIGGER HOVER AT CURSOR ===
  function triggerHoverAtCursor() {
    // Debounce à 150ms pour éviter les artefacts visuels lors de mouvements rapides
    if (triggerHoverDebounceTimer) {
      clearTimeout(triggerHoverDebounceTimer)
    }
    
    triggerHoverDebounceTimer = window.setTimeout(() => {
      executeTriggerHover()
    }, 150)
  }

  function executeTriggerHover() {
    const scroller = planningScrollRef.value
    if (!_lastPointerX || !_lastPointerY || !scroller) return
    
    // Obtenir l'élément directement sous la position du curseur
    const elementsAtCursor = document.elementsFromPoint(_lastPointerX, _lastPointerY)
    
    // Trouver la cellule excel dans la pile d'éléments
    let cellElement: HTMLElement | null = null
    for (const element of elementsAtCursor) {
      if (element.classList.contains('excel-cell')) {
        cellElement = element as HTMLElement
        break
      }
    }
    
    if (cellElement) {
      // Extraire les IDs de la cellule
      const cellId = cellElement.getAttribute('data-cell-id')
      const dayDate = cellElement.getAttribute('data-day-date')
      
      if (cellId && dayDate) {
        const collaborateurId = cellId.split('_')[0]
        
        // Déclencher le hover sur cette cellule (si le handler est configuré)
        if (_handleCellMouseEnter) {
          _handleCellMouseEnter(collaborateurId, dayDate)
        }
        
        // Mettre à jour les highlights visuels aussi
        const dayIndexStr = cellElement.getAttribute('data-day-index')
        const rowIndexStr = cellElement.getAttribute('data-row-index')
        
        if (dayIndexStr && rowIndexStr) {
          const dayIndex = parseInt(dayIndexStr, 10)
          const rowIndex = parseInt(rowIndexStr, 10)
          
          // Nettoyer les highlights précédents
          cleanHoverHighlights()
          
          // Utiliser les sélecteurs directs (plus fiable)
          const columnSelector = `[data-day-index="${dayIndex}"]`
          const rowSelector = `[data-row-index="${rowIndex}"]`
          
          const columnCells = scroller.querySelectorAll(columnSelector)
          if (columnCells) {
            columnCells.forEach(cell => {
              cell.setAttribute('data-column-hover', 'true')
            })
          }
          
          const rowCells = scroller.querySelectorAll(rowSelector)
          if (rowCells) {
            rowCells.forEach(cell => {
              cell.setAttribute('data-row-hover', 'true')
            })
          }
        }
      }
    }
  }

  // === UPDATE CURRENT VISIBLE MONTH ===
  function updateCurrentVisibleMonth(scroller: HTMLElement) {
    if (!visibleDays.value.length) return
    
    const scrollLeft = scroller.scrollLeft
    const gridLeft = stickyLeftWidth.value
    const pitch = dayWidth.value + 1
    const viewportWidth = scroller.clientWidth
    
    // Calculer le jour au centre de la vue
    const centerX = scrollLeft + viewportWidth / 2
    const dayIndex = Math.floor((centerX - gridLeft) / pitch)
    const clampedIndex = Math.max(0, Math.min(dayIndex, visibleDays.value.length - 1))
    
    if (clampedIndex < visibleDays.value.length) {
      const day = visibleDays.value[clampedIndex]
      const monthName = new Date(day.date).toLocaleDateString('fr-FR', { 
        month: 'long', 
        year: 'numeric' 
      })
      // Capitaliser la première lettre
      currentVisibleMonth.value = monthName.charAt(0).toUpperCase() + monthName.slice(1)
    }
  }

  // === MAIN SCROLL HANDLER ===
  async function onScrollExtend(e: Event) {
    const scroller = e.currentTarget as HTMLElement
    if (!scroller) return

    // OPTIMISATION: Pendant l'auto-scroll de sélection, ignorer complètement
    if (isAutoScrolling.value) {
      return
    }

    // Nettoyer les highlights de hover pendant le scroll SEULEMENT si pas en scroll rapide
    if (!isScrollingFast.value) {
      cleanHoverHighlights()
    }
    
    // Maintenir le hover pendant le scroll
    updateHoverOnScroll(scroller)
    
    // Calculer le mois visible
    updateCurrentVisibleMonth(scroller)
    
    // Recalcule la fenêtre virtualisée
    recomputeWindow(scroller)

    // Extension dynamique conditionnelle
    const hasFromOnly = !!dateFrom.value && !dateTo.value
    const hasToOnly = !!dateTo.value && !dateFrom.value
    const hasBothBounds = !!dateFrom.value && !!dateTo.value
    
    // EXTENSION IMMÉDIATE: Si on est très proche du bord
    const { scrollLeft, clientWidth } = scroller
    const totalCols = loadedDays.value.length
    const contentWidth = totalCols * dayWidth.value
    const rightEdgeDistance = contentWidth - (scrollLeft + clientWidth)
    
    // Si on est à moins de 3 écrans du bord droit et pas de borne de fin
    if (!hasBothBounds && !hasToOnly && rightEdgeDistance < clientWidth * 3 && !extending.value) {
      extending.value = true
      try {
        const lastDate = loadedDays.value[loadedDays.value.length - 1]?.date
        if (lastDate) {
          appendDays(30)
          const start = addDaysStr(lastDate, 1)
          const end = addDaysStr(lastDate, 30)
          _generateDisponibilitesForDateRange(start, end).catch(() => {})
        }
      } finally {
        extending.value = false
      }
    }
    
    // Même logique pour le bord gauche
    const leftEdgeDistance = scrollLeft
    if (!hasBothBounds && !hasFromOnly && leftEdgeDistance < clientWidth * 3 && !extending.value) {
      extending.value = true
      try {
        const firstDate = loadedDays.value[0]?.date
        if (firstDate) {
          const maxCanPrepend = Math.max(0, diffDays(minPastDate.value, firstDate))
          const needed = Math.min(30, maxCanPrepend)
          if (needed > 0) {
            const beforeWidth = loadedDays.value.length * dayWidth.value
            const newFirst = addDaysStr(firstDate, -needed)
            const dayBeforeFirst = addDaysStr(firstDate, -1)
            prependDays(needed)
            _generateDisponibilitesForDateRange(newFirst, dayBeforeFirst).catch(() => {})
            // Conserver la position
            const afterWidth = loadedDays.value.length * dayWidth.value
            scroller.scrollLeft += afterWidth - beforeWidth
          }
        }
      } finally {
        extending.value = false
      }
    }
    
    // Bloquer le scroll horizontal quand les deux dates sont définies
    if (hasBothBounds) {
      const firstVisibleDate = visibleDays.value[0]?.date
      const lastVisibleDate = visibleDays.value[visibleDays.value.length - 1]?.date
      
      if (firstVisibleDate && lastVisibleDate) {
        const firstLoadedIndex = loadedDays.value.findIndex(d => d.date === firstVisibleDate)
        const lastLoadedIndex = loadedDays.value.findIndex(d => d.date === lastVisibleDate)
        
        if (firstLoadedIndex !== -1 && lastLoadedIndex !== -1) {
          const minScrollLeft = firstLoadedIndex * dayWidth.value
          const maxScrollLeft = Math.max(minScrollLeft, (lastLoadedIndex + 1) * dayWidth.value - scroller.clientWidth)
          
          if (scroller.scrollLeft < minScrollLeft) {
            scroller.scrollLeft = minScrollLeft
          } else if (scroller.scrollLeft > maxScrollLeft) {
            scroller.scrollLeft = maxScrollLeft
          }
        }
      }
      return
    }

    // Debounce adaptatif selon la vitesse de scroll
    if (scrollDebounceTimer) {
      clearTimeout(scrollDebounceTimer)
    }

    const debounceDelay = isScrollingFast.value ? 32 : 64

    scrollDebounceTimer = window.setTimeout(async () => {
      const { scrollLeft, clientWidth } = scroller
      const totalCols = loadedDays.value.length
      const firstVisibleIdx = Math.floor(scrollLeft / dayWidth.value)
      const lastVisibleIdx = Math.min(totalCols - 1, Math.floor((scrollLeft + clientWidth) / dayWidth.value))

      // Réserves optimisées pour fluidité sans surcharger
      const baseLeftReserve = 60
      const baseRightReserve = 60
      const fastScrollMultiplier = isScrollingFast.value ? 1.5 : 1
      
      const targetLeftReserve = Math.floor(baseLeftReserve * fastScrollMultiplier)
      const minLeftReserve = Math.floor(30 * fastScrollMultiplier)
      const targetRightReserve = Math.floor(baseRightReserve * fastScrollMultiplier)
      const minRightReserve = Math.floor(30 * fastScrollMultiplier)

      // GAUCHE
      const leftReserve = firstVisibleIdx
      if (!hasFromOnly && leftReserve < minLeftReserve && !extending.value) {
        extending.value = true
        try {
          const beforeWidth = loadedDays.value.length * dayWidth.value
          const firstDate = loadedDays.value[0]?.date
          if (firstDate) {
            const maxCanPrepend = Math.max(0, diffDays(minPastDate.value, firstDate))
            const needed = Math.min(targetLeftReserve - leftReserve, maxCanPrepend)
            if (needed > 0) {
              const newFirst = addDaysStr(firstDate, -needed)
              const dayBeforeFirst = addDaysStr(firstDate, -1)
              prependDays(needed)
              _generateDisponibilitesForDateRange(newFirst, dayBeforeFirst)
              const afterWidth = loadedDays.value.length * dayWidth.value
              scroller.scrollLeft += afterWidth - beforeWidth
            }
          }
        } finally {
          extending.value = false
        }
      }

      // DROITE
      const rightReserve = (totalCols - 1) - lastVisibleIdx
      if (rightReserve < minRightReserve) {
        const lastDate = loadedDays.value[loadedDays.value.length - 1]?.date
        let toAdd = targetRightReserve - rightReserve
        if (toAdd > 0) {
          if (hasToOnly && dateTo.value && lastDate) {
            const remaining = Math.max(0, diffDays(lastDate, dateTo.value))
            toAdd = Math.min(toAdd, remaining)
          }
          if (toAdd > 0) {
            appendDays(toAdd)
            if (lastDate) {
              const start = addDaysStr(lastDate, 1)
              const end = addDaysStr(lastDate, toAdd)
            
              if (isScrollingFast.value) {
                _generateDisponibilitesForDateRange(start, end).catch(console.error)
              } else {
                _generateDisponibilitesForDateRange(start, end)
              }
            }
          }
        }
      }

      // Décharger visuellement
      prunePastIfFar(scroller)
      pruneFutureIfFar(scroller)
      
      // PREFETCH INTELLIGENT
      if (!isScrollingFast.value && !hasBothBounds) {
        const firstVisibleDate = loadedDays.value[firstVisibleIdx]?.date
        const lastVisibleDate = loadedDays.value[lastVisibleIdx]?.date
        if (firstVisibleDate && lastVisibleDate) {
          triggerPrefetch(firstVisibleDate, lastVisibleDate)
        }
      }
    }, debounceDelay)
    
    // Détecter la fin de scroll pour déclencher le hover sous le curseur
    if (scrollEndTimer) {
      clearTimeout(scrollEndTimer)
    }
    
    scrollEndTimer = window.setTimeout(() => {
      if (_lastPointerX && _lastPointerY) {
        triggerHoverAtCursor()
      }
    }, debounceDelay + 50)
  }

  // === CLEANUP ===
  function cleanup() {
    if (scrollDebounceTimer) {
      clearTimeout(scrollDebounceTimer)
      scrollDebounceTimer = null
    }
    if (scrollEndTimer) {
      clearTimeout(scrollEndTimer)
      scrollEndTimer = null
    }
    if (updateHoverRafId) {
      cancelAnimationFrame(updateHoverRafId)
      updateHoverRafId = null
    }
    if (triggerHoverDebounceTimer) {
      clearTimeout(triggerHoverDebounceTimer)
      triggerHoverDebounceTimer = null
    }
    stopAutoScroll()
  }

  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    // État
    isAutoScrolling,
    
    // Fonctions principales
    onScrollExtend,
    stopAutoScroll,
    handleAutoScroll,
    handleGlobalMouseMoveDuringDrag,
    
    // Gestion du hover pendant scroll
    updateHoverOnScroll,
    triggerHoverAtCursor,
    updateCurrentVisibleMonth,
    
    // Cache/position
    invalidateHoverCache,
    getLastPointerPosition,
    setLastPointerPosition,
    resetPointerPosition,
    
    // Late-binding
    setHandleCellMouseEnter,
    setGenerateDisponibilitesForDateRange,
    
    // Cleanup
    cleanup
  }
}