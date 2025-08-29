/**
 * Composable pour la gestion de la virtualisation du planning
 * Extrait de SemaineVirtualClean.vue pour améliorer la modularité
 */

import { ref, computed, nextTick, watch, type Ref } from 'vue'

interface VirtualizationConfig {
  itemHeight: number
  containerHeight: number
  overscan?: number
  estimatedItemCount?: number
}

interface VirtualizationState {
  scrollTop: number
  scrollLeft: number
  startIndex: number
  endIndex: number
  visibleItems: any[]
  offsetY: number
  totalHeight: number
}

export function useVirtualization<T>(
  items: Ref<T[]>,
  config: Ref<VirtualizationConfig>
) {
  // État de défilement
  const scrollTop = ref(0)
  const scrollLeft = ref(0)
  
  // Configuration avec valeurs par défaut
  const overscan = computed(() => config.value.overscan ?? 5)
  
  // Calculs de virtualisation
  const startIndex = computed(() => {
    if (config.value.itemHeight <= 0) return 0
    return Math.max(0, Math.floor(scrollTop.value / config.value.itemHeight) - overscan.value)
  })
  
  const visibleCount = computed(() => {
    if (config.value.itemHeight <= 0 || config.value.containerHeight <= 0) {
      return Math.min(items.value.length, 50) // Fallback sécurisé
    }
    return Math.ceil(config.value.containerHeight / config.value.itemHeight) + (overscan.value * 2)
  })
  
  const endIndex = computed(() => {
    return Math.min(startIndex.value + visibleCount.value, items.value.length)
  })
  
  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value)
  })
  
  const offsetY = computed(() => {
    return startIndex.value * config.value.itemHeight
  })
  
  const totalHeight = computed(() => {
    return items.value.length * config.value.itemHeight
  })
  
  // Méthodes utilitaires
  function scrollToItem(index: number, behavior: ScrollBehavior = 'smooth') {
    const targetScrollTop = index * config.value.itemHeight
    scrollTop.value = targetScrollTop
    
    // Émettre l'événement de défilement si nécessaire
    nextTick(() => {
      const container = getCurrentContainer()
      if (container) {
        container.scrollTo({
          top: targetScrollTop,
          behavior
        })
      }
    })
  }
  
  function scrollToTop() {
    scrollToItem(0)
  }
  
  function scrollToBottom() {
    scrollToItem(items.value.length - 1)
  }
  
  function getCurrentContainer(): HTMLElement | null {
    // Cette fonction devrait être fournie par le composant parent
    // ou nous pourrions utiliser un ref passé en paramètre
    return document.querySelector('.planning-grid-container') as HTMLElement
  }
  
  // Gestion du défilement
  function handleScroll(event: Event) {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
    scrollLeft.value = target.scrollLeft
  }
  
  // État pour l'export
  const state = computed<VirtualizationState>(() => ({
    scrollTop: scrollTop.value,
    scrollLeft: scrollLeft.value,
    startIndex: startIndex.value,
    endIndex: endIndex.value,
    visibleItems: visibleItems.value,
    offsetY: offsetY.value,
    totalHeight: totalHeight.value
  }))
  
  return {
    // État réactif
    scrollTop,
    scrollLeft,
    startIndex,
    endIndex,
    visibleItems,
    offsetY,
    totalHeight,
    state,
    
    // Méthodes
    handleScroll,
    scrollToItem,
    scrollToTop,
    scrollToBottom
  }
}

/**
 * Composable pour la virtualisation horizontale (colonnes)
 */
export function useColumnVirtualization(
  dates: Ref<string[]>,
  containerWidth: Ref<number>,
  columnWidth: Ref<number>,
  stickyLeftWidth: Ref<number> = ref(0)
) {
  const scrollLeft = ref(0)
  
  const availableWidth = computed(() => {
    return Math.max(0, containerWidth.value - stickyLeftWidth.value)
  })
  
  const visibleColumnsCount = computed(() => {
    if (columnWidth.value <= 0 || availableWidth.value <= 0) {
      return dates.value.length
    }
    return Math.min(
      Math.ceil(availableWidth.value / columnWidth.value) + 2, // Buffer
      dates.value.length
    )
  })
  
  const startColumnIndex = computed(() => {
    if (columnWidth.value <= 0) return 0
    return Math.max(0, Math.floor(scrollLeft.value / columnWidth.value))
  })
  
  const endColumnIndex = computed(() => {
    return Math.min(startColumnIndex.value + visibleColumnsCount.value, dates.value.length)
  })
  
  const visibleDates = computed(() => {
    return dates.value.slice(startColumnIndex.value, endColumnIndex.value)
  })
  
  const offsetX = computed(() => {
    return startColumnIndex.value * columnWidth.value
  })
  
  const totalWidth = computed(() => {
    return dates.value.length * columnWidth.value
  })
  
  function scrollToColumn(index: number, behavior: ScrollBehavior = 'smooth') {
    const targetScrollLeft = index * columnWidth.value
    scrollLeft.value = targetScrollLeft
    
    nextTick(() => {
      const container = document.querySelector('.planning-grid-container') as HTMLElement
      if (container) {
        container.scrollTo({
          left: targetScrollLeft,
          behavior
        })
      }
    })
  }
  
  return {
    scrollLeft,
    startColumnIndex,
    endColumnIndex,
    visibleDates,
    visibleColumnsCount,
    offsetX,
    totalWidth,
    scrollToColumn
  }
}

/**
 * Utilitaires pour observer les dimensions des éléments
 */
function useElementSize(elementRef: Ref<HTMLElement | undefined>) {
  const width = ref(0)
  const height = ref(0)
  
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      width.value = entry.contentRect.width
      height.value = entry.contentRect.height
    }
  })
  
  const cleanup = () => {
    if (elementRef.value) {
      observer.unobserve(elementRef.value)
    }
  }
  
  const observe = () => {
    cleanup()
    if (elementRef.value) {
      observer.observe(elementRef.value)
      const rect = elementRef.value.getBoundingClientRect()
      width.value = rect.width
      height.value = rect.height
    }
  }
  
  // Observer immédiatement si l'élément est déjà disponible
  if (elementRef.value) {
    observe()
  }
  
  // Surveiller les changements de ref
  watch(elementRef, observe, { immediate: true, flush: 'post' })
  
  return { width, height, cleanup }
}

function useWindowSize() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)
  
  const updateSize = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }
  
  window.addEventListener('resize', updateSize)
  
  return { 
    width, 
    height,
    cleanup: () => window.removeEventListener('resize', updateSize)
  }
}

/**
 * Composable combiné pour la virtualisation 2D
 */
export function use2DVirtualization<T>(
  items: Ref<T[]>,
  dates: Ref<string[]>,
  containerRef: Ref<HTMLElement | undefined>,
  options: {
    itemHeight: number
    columnWidth: number
    headerHeight?: number
    stickyLeftWidth?: number
    overscan?: number
  }
) {
  const { width: containerWidth, height: containerHeight } = useElementSize(containerRef)
  const { width: windowWidth } = useWindowSize()
  
  // Configuration réactive
  const virtualizationConfig = computed(() => ({
    itemHeight: options.itemHeight,
    containerHeight: containerHeight.value - (options.headerHeight || 0),
    overscan: options.overscan
  }))
  
  const columnConfig = {
    containerWidth,
    columnWidth: ref(options.columnWidth),
    stickyLeftWidth: ref(options.stickyLeftWidth || 0)
  }
  
  // Virtualisation des lignes
  const rowVirtualization = useVirtualization(items, virtualizationConfig)
  
  // Virtualisation des colonnes
  const columnVirtualization = useColumnVirtualization(
    dates,
    columnConfig.containerWidth,
    columnConfig.columnWidth,
    columnConfig.stickyLeftWidth
  )
  
  // Mode mobile
  const isMobile = computed(() => windowWidth.value < 768)
  
  // Gestion combinée du défilement
  function handleScroll(event: Event) {
    rowVirtualization.handleScroll(event)
    const target = event.target as HTMLElement
    columnVirtualization.scrollLeft.value = target.scrollLeft
  }
  
  // Navigation utilitaire
  function scrollToCell(rowIndex: number, columnIndex: number) {
    rowVirtualization.scrollToItem(rowIndex, 'smooth')
    columnVirtualization.scrollToColumn(columnIndex, 'smooth')
  }
  
  return {
    // État des lignes
    ...rowVirtualization,
    
    // État des colonnes
    visibleDates: columnVirtualization.visibleDates,
    startColumnIndex: columnVirtualization.startColumnIndex,
    endColumnIndex: columnVirtualization.endColumnIndex,
    
    // Configuration
    isMobile,
    containerWidth,
    containerHeight,
    
    // Méthodes
    handleScroll,
    scrollToCell,
    scrollToColumn: columnVirtualization.scrollToColumn
  }
}
