import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

export interface UseVirtualGridArgs<TDay, TRow> {
  dayWidth: Ref<number>
  rowHeight: Ref<number>
  visibleDays: ComputedRef<TDay[]>
  rows: ComputedRef<TRow[]>
}

export function useVirtualGrid<TDay = any, TRow = any>({ dayWidth, rowHeight, visibleDays, rows }: UseVirtualGridArgs<TDay, TRow>) {
  // Horizontal window (days)
  const windowStartIndex = ref(0)
  const windowEndIndex = ref(0)
  // Buffers optimisés pour fluidité (plus de colonnes = moins de flash blanc)
  const windowPaddingCols = ref(5)  // Buffer normal: 5 colonnes de chaque côté
  const fastScrollBufferCols = ref(10)  // Buffer scroll rapide: 10 colonnes
  const isScrollingFast = ref(false)
  const lastScrollTime = ref(0)
  const scrollVelocity = ref(0)
  // Direction du scroll pour prefetch prédictif
  const scrollDirection = ref<'left' | 'right' | 'none'>('none')
  const lastScrollLeft = ref(0)
  // Cache pour éviter les recalculs inutiles
  let cachedWindowStart = -1
  let cachedWindowEnd = -1
  let cachedRowStart = -1
  let cachedRowEnd = -1
  // Debounce timer pour reset direction
  let directionResetTimer: number | null = null

  const windowOffsetPx = computed(() => windowStartIndex.value * dayWidth.value)
  // Buffer asymétrique: plus de colonnes dans la direction du scroll
  const adaptiveWindowPadding = computed(() => {
    const base = isScrollingFast.value ? fastScrollBufferCols.value : windowPaddingCols.value
    return base
  })
  // Padding additionnel dans la direction du scroll (prefetch prédictif)
  const directionalPadding = computed(() => {
    if (scrollDirection.value === 'none') return { left: 0, right: 0 }
    const extra = isScrollingFast.value ? 3 : 2  // +2/+3 colonnes dans la direction
    return scrollDirection.value === 'right' 
      ? { left: 0, right: extra }
      : { left: extra, right: 0 }
  })
  const windowedDays = computed(() => {
    const result = visibleDays.value.slice(windowStartIndex.value, Math.min(windowEndIndex.value + 1, visibleDays.value.length))
    return result
  })

  // Vertical window (rows)
  const rowWindowStartIndex = ref(0)
  const rowWindowEndIndex = ref(0)
  // Buffers optimisés pour les lignes (plus de lignes = scroll vertical plus fluide)
  const windowPaddingRows = ref(8)  // Buffer normal: 8 lignes
  const fastScrollBufferRows = ref(15)  // Buffer scroll rapide: 15 lignes
  // Direction scroll vertical
  const scrollDirectionY = ref<'up' | 'down' | 'none'>('none')
  const lastScrollTop = ref(0)
  
  const rowWindowOffsetPx = computed(() => rowWindowStartIndex.value * rowHeight.value)
  const adaptiveRowPadding = computed(() => (isScrollingFast.value ? fastScrollBufferRows.value : windowPaddingRows.value))
  // Padding directionnel vertical
  const directionalPaddingY = computed(() => {
    if (scrollDirectionY.value === 'none') return { top: 0, bottom: 0 }
    const extra = isScrollingFast.value ? 3 : 2  // +2/+3 lignes dans la direction du scroll
    return scrollDirectionY.value === 'down'
      ? { top: 0, bottom: extra }
      : { top: extra, bottom: 0 }
  })
  const windowedRows = computed(() => {
    const total = rows.value.length
    if (total === 0) return []
    // Clamp des indices pour éviter l'état vide quand total augmente brusquement
    const start = Math.max(0, Math.min(rowWindowStartIndex.value, total - 1))
    const endRaw = Math.min(rowWindowEndIndex.value, total - 1)
    const end = Math.max(start, endRaw)
    return rows.value.slice(start, end + 1)
  })

  // Stats (optional)
  const virtualizationStats = ref({
    totalCells: 0,
    visibleCells: 0,
    loadedCells: 0,
    fastScrollEvents: 0,
    bufferHits: 0,
  })

  function updateVirtualizationStats(loadedDateRangesCount = 0) {
    const totalDays = visibleDays.value.length
    const totalRows = rows.value.length
    const visibleDaysCount = windowedDays.value.length
    const visibleRows = windowedRows.value.length
    virtualizationStats.value = {
      totalCells: totalDays * totalRows,
      visibleCells: visibleDaysCount * visibleRows,
      loadedCells: loadedDateRangesCount * totalRows,
      fastScrollEvents: virtualizationStats.value.fastScrollEvents + (isScrollingFast.value ? 1 : 0),
      bufferHits: virtualizationStats.value.bufferHits,
    }
  }

  function recomputeRowWindow(scroller?: HTMLElement | null) {
    const total = rows.value.length
    if (total === 0) {
      rowWindowStartIndex.value = 0
      rowWindowEndIndex.value = -1
      return
    }

    const el = scroller
    if (!el) {
      // Sans scroller, exposer au moins les 10 premières lignes pour éviter un état vide
      rowWindowStartIndex.value = 0
      rowWindowEndIndex.value = Math.max(0, Math.min(9, total - 1))
      return
    }

    const { scrollTop, clientHeight } = el
    const rh = Math.max(1, rowHeight.value)
    const padding = adaptiveRowPadding.value
    const dirPadY = directionalPaddingY.value
    // Appliquer padding + padding directionnel pour prefetch dans la direction du scroll
    const firstRowIdx = Math.max(0, Math.floor(scrollTop / rh) - padding - dirPadY.top)
    const lastRowIdx = Math.min(total - 1, Math.ceil((scrollTop + clientHeight) / rh) + padding + dirPadY.bottom)
    
    // OPTIMISATION: Ne mettre à jour que si les indices ont vraiment changé
    const newRowStart = Math.min(firstRowIdx, lastRowIdx)
    const newRowEnd = Math.max(firstRowIdx, lastRowIdx)
    if (newRowStart !== cachedRowStart || newRowEnd !== cachedRowEnd) {
      rowWindowStartIndex.value = newRowStart
      rowWindowEndIndex.value = newRowEnd
      cachedRowStart = newRowStart
      cachedRowEnd = newRowEnd
    }
  }

  // Réagir aux changements de longueur des lignes pour maintenir des indices valides
  let prevTotal = rows.value.length
  watch(() => rows.value.length, (total) => {
    const hadNone = prevTotal === 0 && total > 0
    prevTotal = total
    if (total === 0) {
      rowWindowStartIndex.value = 0
      rowWindowEndIndex.value = -1
      return
    }
    // Si on vient d'avoir des données ou si les indices sont hors bornes, re-clamper
    const start = Math.max(0, Math.min(rowWindowStartIndex.value, total - 1))
    const end = Math.max(start, Math.min(rowWindowEndIndex.value, total - 1))
    const needReset = hadNone || end < start || rowWindowEndIndex.value < 0
    if (needReset) {
      rowWindowStartIndex.value = 0
      // Afficher un petit buffer par défaut (10 lignes)
      rowWindowEndIndex.value = Math.min(total - 1, 9)
    } else if (start !== rowWindowStartIndex.value || end !== rowWindowEndIndex.value) {
      rowWindowStartIndex.value = start
      rowWindowEndIndex.value = end
    }
  })

  // RAF-based throttle pour recomputeWindow : sync avec le refresh rate
  let recomputeRafId: number | null = null
  let pendingRecomputeScroller: HTMLElement | null | undefined = null
  
  function recomputeWindowThrottled(scroller?: HTMLElement | null) {
    pendingRecomputeScroller = scroller
    
    if (recomputeRafId !== null) {
      return // Déjà planifié pour le prochain frame
    }
    
    recomputeRafId = requestAnimationFrame(() => {
      recomputeWindow(pendingRecomputeScroller)
      recomputeRafId = null
      pendingRecomputeScroller = null
    })
  }

  function recomputeWindow(scroller?: HTMLElement | null) {
    const el = scroller
    // Si le scroller n'est pas encore disponible (ex: premier tick après mount),
    // exposer une fenêtre minimale pour éviter un écran vide.
    if (!el) {
      const totalDays = Math.max(0, visibleDays.value.length)
      const dw = dayWidth.value
      if (totalDays === 0 || dw <= 0) {
        windowStartIndex.value = 0
        windowEndIndex.value = -1
      } else {
        const padding = adaptiveWindowPadding.value
        windowStartIndex.value = 0
        // Par défaut, afficher ~1 semaine + padding si aucune info de largeur
        const approxVisible = 7 + padding
        windowEndIndex.value = Math.min(totalDays - 1, approxVisible)
      }
      // Toujours recalculer la fenêtre verticale avec le même scroller (null)
      recomputeRowWindow(null as any)
      return
    }

    // Fast scroll detection + direction
    const now = performance.now()
    const deltaTime = now - lastScrollTime.value
    lastScrollTime.value = now
    
    const { scrollLeft, scrollTop, clientWidth } = el
    
    // Détection direction horizontale
    if (scrollLeft > lastScrollLeft.value + 5) {
      scrollDirection.value = 'right'
    } else if (scrollLeft < lastScrollLeft.value - 5) {
      scrollDirection.value = 'left'
    }
    lastScrollLeft.value = scrollLeft
    
    // Détection direction verticale
    if (scrollTop > lastScrollTop.value + 5) {
      scrollDirectionY.value = 'down'
    } else if (scrollTop < lastScrollTop.value - 5) {
      scrollDirectionY.value = 'up'
    }
    lastScrollTop.value = scrollTop
    
    if (deltaTime > 0) {
      const deltaScroll = Math.abs(scrollLeft - windowStartIndex.value * dayWidth.value)
      scrollVelocity.value = deltaScroll / deltaTime
      isScrollingFast.value = scrollVelocity.value > 2
    }
    
    // Reset direction après inactivité - DEBOUNCED pour éviter les resets multiples
    if (directionResetTimer !== null) {
      clearTimeout(directionResetTimer)
    }
    directionResetTimer = window.setTimeout(() => {
      if (performance.now() - lastScrollTime.value > 150) {
        isScrollingFast.value = false
        scrollDirection.value = 'none'
        scrollDirectionY.value = 'none'
      }
      directionResetTimer = null
    }, 200)

    // Horizontal window avec prefetch prédictif
    const dw = dayWidth.value
    const padding = adaptiveWindowPadding.value
    const dirPad = directionalPadding.value
    const totalDays = Math.max(0, visibleDays.value.length)

    if (totalDays === 0 || dw <= 0) {
      windowStartIndex.value = 0
      windowEndIndex.value = -1
      cachedWindowStart = 0
      cachedWindowEnd = -1
    } else {
      // NE PAS clamper le scroll - sinon on cause un "rollback" quand les nouvelles cellules
      // ne sont pas encore chargées. Le scroll natif gère déjà les limites.
      // Appliquer le padding + le padding directionnel (prefetch dans la direction du scroll)
      const firstIdx = Math.max(0, Math.floor(scrollLeft / dw) - padding - dirPad.left)
      const lastIdx = Math.min(totalDays - 1, Math.ceil((scrollLeft + clientWidth) / dw) + padding + dirPad.right)
      
      // OPTIMISATION: Ne mettre à jour que si les indices ont vraiment changé
      const newStart = Math.min(firstIdx, lastIdx)
      const newEnd = Math.max(firstIdx, lastIdx)
      if (newStart !== cachedWindowStart || newEnd !== cachedWindowEnd) {
        windowStartIndex.value = newStart
        windowEndIndex.value = newEnd
        cachedWindowStart = newStart
        cachedWindowEnd = newEnd
      }
    }

    // Vertical window
    recomputeRowWindow(el)
  }

  return {
    // days
    windowStartIndex,
    windowEndIndex,
    windowOffsetPx,
    windowedDays,
    recomputeWindow: recomputeWindowThrottled, // Version throttlée par défaut
    isScrollingFast,
    // rows
    rowWindowStartIndex,
    rowWindowEndIndex,
    rowWindowOffsetPx,
    windowedRows,
    recomputeRowWindow,
    // stats
    virtualizationStats,
    updateVirtualizationStats,
  }
}
