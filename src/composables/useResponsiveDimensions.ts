/**
 * useResponsiveDimensions - Gestion simplifiée des dimensions responsive
 * Composable autonome sans dépendances externes
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useResponsiveDimensions() {
  const isMobileView = ref(false)
  const dayWidthRef = ref(100)
  const stickyLeftWidthRef = ref(190)
  const rowHeightRef = ref(65)
  
  // Computed accessors
  const dayWidth = computed(() => dayWidthRef.value)
  const stickyLeftWidth = computed(() => stickyLeftWidthRef.value)
  const rowHeight = computed(() => rowHeightRef.value)
  const rowPitch = computed(() => rowHeightRef.value + 1)
  
  /**
   * Calcule les dimensions selon la taille d'écran
   * Retourne les nouvelles valeurs sans les appliquer (pour callback)
   */
  function calculateDimensions() {
    const w = window.innerWidth
    const h = window.innerHeight
    
    // Mode mobile si largeur <= 900px OU mobile en paysage
    const mobile = w <= 900 || (h < w && h <= 500)
    
    let sticky = 240
    let day = 100
    let rowH = 65
    
    if (w <= 390) { // iPhone 12
      sticky = 100
      day = Math.max(54, Math.min(74, Math.floor((w - sticky - 8) / 5)))
      rowH = 60
    } else if (w <= 430) {
      sticky = 115
      day = Math.max(59, Math.min(79, Math.floor((w - sticky - 10) / 5)))
      rowH = 62
    } else if (w <= 520) {
      sticky = 130
      day = Math.max(69, Math.min(89, Math.floor((w - sticky - 12) / 5)))
      rowH = 64
    } else if (w <= 640) {
      sticky = 145
      day = Math.max(79, Math.min(99, Math.floor((w - sticky - 16) / 5)))
      rowH = 66
    } else if (w <= 900) {
      sticky = 160
      day = Math.max(89, Math.min(109, Math.floor((w - sticky - 20) / 5)))
      rowH = 68
    } else {
      // Desktop large
      sticky = Math.min(240, Math.max(200, Math.floor(w * 0.16)))
    }
    
    return { mobile, day, sticky, rowH }
  }
  
  /**
   * Applique les dimensions calculées
   * @param onAfterUpdate Callback appelé après mise à jour (pour recompute grid)
   */
  function applyDimensions(onAfterUpdate?: () => void) {
    const { mobile, day, sticky, rowH } = calculateDimensions()
    
    isMobileView.value = mobile
    dayWidthRef.value = day
    stickyLeftWidthRef.value = sticky
    rowHeightRef.value = rowH
    
    if (onAfterUpdate) {
      onAfterUpdate()
    }
  }
  
  // Lifecycle
  let resizeHandler: (() => void) | null = null
  
  function setupResize(onResize?: () => void) {
    resizeHandler = () => applyDimensions(onResize)
    applyDimensions(onResize) // Initial
    window.addEventListener('resize', resizeHandler)
  }
  
  function cleanupResize() {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }
  }
  
  return {
    // State
    isMobileView,
    dayWidth,
    stickyLeftWidth,
    rowHeight,
    rowPitch,
    
    // Refs mutables (pour modifications directes si nécessaire)
    dayWidthRef,
    stickyLeftWidthRef,
    rowHeightRef,
    
    // Methods
    calculateDimensions,
    applyDimensions,
    setupResize,
    cleanupResize
  }
}
