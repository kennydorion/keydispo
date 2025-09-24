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
  const windowPaddingCols = ref(6)
  const fastScrollBufferCols = ref(12)
  const isScrollingFast = ref(false)
  const lastScrollTime = ref(0)
  const scrollVelocity = ref(0)

  const windowOffsetPx = computed(() => windowStartIndex.value * dayWidth.value)
  const adaptiveWindowPadding = computed(() => (isScrollingFast.value ? fastScrollBufferCols.value : windowPaddingCols.value))
  const windowedDays = computed(() => {
    const result = visibleDays.value.slice(windowStartIndex.value, Math.min(windowEndIndex.value + 1, visibleDays.value.length))
    return result
  })

  // Vertical window (rows)
  const rowWindowStartIndex = ref(0)
  const rowWindowEndIndex = ref(0)
  const windowPaddingRows = ref(6)
  const fastScrollBufferRows = ref(10)
  const rowWindowOffsetPx = computed(() => rowWindowStartIndex.value * rowHeight.value)
  const adaptiveRowPadding = computed(() => (isScrollingFast.value ? fastScrollBufferRows.value : windowPaddingRows.value))
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
      // Sans scroller, exposer au moins la première ligne pour éviter un état vide
      rowWindowStartIndex.value = 0
      rowWindowEndIndex.value = Math.max(0, Math.min(0, total - 1))
      return
    }

    const { scrollTop, clientHeight } = el
    const rh = Math.max(1, rowHeight.value)
    const padding = adaptiveRowPadding.value
    const firstRowIdx = Math.max(0, Math.floor(scrollTop / rh) - padding)
    const lastRowIdx = Math.min(total - 1, Math.ceil((scrollTop + clientHeight) / rh) + padding)
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

    // Fast scroll detection
    const now = performance.now()
    const deltaTime = now - lastScrollTime.value
    lastScrollTime.value = now
    if (deltaTime > 0) {
      const deltaScroll = Math.abs(el.scrollLeft - windowStartIndex.value * dayWidth.value)
      scrollVelocity.value = deltaScroll / deltaTime
      isScrollingFast.value = scrollVelocity.value > 2
    }
    setTimeout(() => {
      if (performance.now() - lastScrollTime.value > 150) isScrollingFast.value = false
    }, 200)

  // Horizontal window
    const { scrollLeft, clientWidth } = el
    const dw = dayWidth.value
    const padding = adaptiveWindowPadding.value
    const totalDays = Math.max(0, visibleDays.value.length)

    if (totalDays === 0 || dw <= 0) {
      // Rien à afficher pour l'instant
      windowStartIndex.value = 0
      windowEndIndex.value = -1
    } else {
      // Clamp le scroll dans la largeur de contenu
      const contentWidth = totalDays * dw
      const clampedScrollLeft = Math.max(0, Math.min(scrollLeft, Math.max(0, contentWidth - clientWidth)))
      const firstIdx = Math.max(0, Math.floor(clampedScrollLeft / dw) - padding)
      const lastIdx = Math.min(totalDays - 1, Math.ceil((clampedScrollLeft + clientWidth) / dw) + padding)
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
    recomputeWindow,
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
