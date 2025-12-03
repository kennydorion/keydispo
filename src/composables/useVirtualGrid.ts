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
  // OPTIMISÉ: Buffers augmentés pour éviter le blanc pendant le scroll
  const windowPaddingCols = ref(5)  // Buffer normal: 5 colonnes de chaque côté
  const fastScrollBufferCols = ref(10)  // Buffer scroll rapide: 10 colonnes
  const isScrollingFast = ref(false)
  const lastScrollTime = ref(0)
  const scrollVelocity = ref(0)
  // Direction du scroll pour prefetch prédictif
  const scrollDirection = ref<'left' | 'right' | 'none'>('none')
  const lastScrollLeft = ref(0)

  const windowOffsetPx = computed(() => windowStartIndex.value * dayWidth.value)
  // Buffer asymétrique: plus de colonnes dans la direction du scroll
  const adaptiveWindowPadding = computed(() => {
    const base = isScrollingFast.value ? fastScrollBufferCols.value : windowPaddingCols.value
    return base
  })
  // Padding additionnel dans la direction du scroll (prefetch prédictif)
  const directionalPadding = computed(() => {
    if (scrollDirection.value === 'none') return { left: 0, right: 0 }
    const extra = isScrollingFast.value ? 8 : 4  // Plus de prefetch dans la direction du mouvement
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
  // OPTIMISÉ: Buffers augmentés pour les lignes
  const windowPaddingRows = ref(8)  // Buffer normal: 8 lignes (augmenté de 5)
  const fastScrollBufferRows = ref(15)  // Buffer scroll rapide: 15 lignes (augmenté de 10)
  // Direction scroll vertical
  const scrollDirectionY = ref<'up' | 'down' | 'none'>('none')
  const lastScrollTop = ref(0)
  
  const rowWindowOffsetPx = computed(() => rowWindowStartIndex.value * rowHeight.value)
  const adaptiveRowPadding = computed(() => (isScrollingFast.value ? fastScrollBufferRows.value : windowPaddingRows.value))
  // Padding directionnel vertical - AUGMENTÉ pour prefetch plus agressif
  const directionalPaddingY = computed(() => {
    if (scrollDirectionY.value === 'none') return { top: 0, bottom: 0 }
    const extra = isScrollingFast.value ? 10 : 5  // Augmenté: +5/+10 lignes dans la direction du scroll
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
    rowWindowStartIndex.value = Math.min(firstRowIdx, lastRowIdx)
    rowWindowEndIndex.value = Math.max(firstRowIdx, lastRowIdx)
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

  // Throttle pour recomputeWindow : max 60fps
  let recomputeThrottleTimer: number | null = null
  let pendingRecomputeScroller: HTMLElement | null | undefined = null
  
  function recomputeWindowThrottled(scroller?: HTMLElement | null) {
    pendingRecomputeScroller = scroller
    
    if (recomputeThrottleTimer !== null) {
      return // Déjà planifié
    }
    
    recomputeThrottleTimer = window.setTimeout(() => {
      recomputeWindow(pendingRecomputeScroller)
      recomputeThrottleTimer = null
      pendingRecomputeScroller = null
    }, 16) // 16ms = ~60fps max
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
    
    // Reset direction après inactivité
    setTimeout(() => {
      if (performance.now() - lastScrollTime.value > 150) {
        isScrollingFast.value = false
        scrollDirection.value = 'none'
        scrollDirectionY.value = 'none'
      }
    }, 200)

    // Horizontal window avec prefetch prédictif
    const dw = dayWidth.value
    const padding = adaptiveWindowPadding.value
    const dirPad = directionalPadding.value
    const totalDays = Math.max(0, visibleDays.value.length)

    if (totalDays === 0 || dw <= 0) {
      windowStartIndex.value = 0
      windowEndIndex.value = -1
    } else {
      // Clamp le scroll dans la largeur de contenu
      const contentWidth = totalDays * dw
      const clampedScrollLeft = Math.max(0, Math.min(scrollLeft, Math.max(0, contentWidth - clientWidth)))
      // Appliquer le padding + le padding directionnel (prefetch dans la direction du scroll)
      const firstIdx = Math.max(0, Math.floor(clampedScrollLeft / dw) - padding - dirPad.left)
      const lastIdx = Math.min(totalDays - 1, Math.ceil((clampedScrollLeft + clientWidth) / dw) + padding + dirPad.right)
      windowStartIndex.value = Math.min(firstIdx, lastIdx)
      windowEndIndex.value = Math.max(firstIdx, lastIdx)
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
