/**
 * usePlanningLayout - Composable pour gérer le layout et les styles du planning
 * Encapsule les calculs de dimensions, classes CSS, filtrage des jours visibles
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { getDispoBarsLayoutClass as sharedGetDispoBarsLayoutClass } from '@/services/planningDisplayService'
import type { PlanningDay } from '@/utils/planningDaysUtils'

export interface UsePlanningLayoutOptions {
  // Dimensions
  dayWidth: ComputedRef<number>
  stickyLeftWidth: ComputedRef<number>
  rowHeight: ComputedRef<number>
  
  // Données
  loadedDays: Ref<PlanningDay[]>
  filteredCollaborateurs: ComputedRef<any[]>
  
  // Filtres de dates
  dateFrom: ComputedRef<string>
  dateTo: ComputedRef<string>
  minPastDate: ComputedRef<string>
  
  // Virtualisation (pour indices locaux)
  windowStartIndex: Ref<number>
  hoveredColumnIndex: Ref<number>
  hoveredRowIndex: Ref<number>
}

export function usePlanningLayout(options: UsePlanningLayoutOptions) {
  const {
    dayWidth,
    stickyLeftWidth,
    rowHeight,
    loadedDays,
    filteredCollaborateurs,
    dateFrom,
    dateTo,
    minPastDate,
    windowStartIndex,
    hoveredColumnIndex,
    hoveredRowIndex
  } = options
  
  // Fonction getCellDispos injectée après initialisation (pour éviter dépendance circulaire)
  let getCellDisposFunc: ((collaborateurId: string, date: string) => any[]) | null = null
  
  function setGetCellDispos(fn: (collaborateurId: string, date: string) => any[]) {
    getCellDisposFunc = fn
  }

  // === MOIS VISIBLE ===
  const currentVisibleMonth = ref('')

  // === JOURS VISIBLES (filtrés par dates) ===
  const visibleDays = computed(() => {
    const days = loadedDays.value
    const from = dateFrom.value
    const to = dateTo.value

    if (from && to) {
      const a = from <= to ? from : to
      const b = from <= to ? to : from
      return days.filter(d => d.date >= a && d.date <= b)
    }
    if (from && !to) {
      return days.filter(d => d.date >= from)
    }
    if (to && !from) {
      // Avec seulement une date de fin, on affiche de minPastDate jusqu'à la date de fin
      return days.filter(d => d.date <= to && d.date >= minPastDate.value)
    }
    return days
  })

  // === DIMENSIONS CALCULÉES ===
  
  // Utiliser loadedDays pour gridMinWidth pour éviter le rollback lors du scroll rapide
  const gridMinWidth = computed(() => (loadedDays.value.length * dayWidth.value) + 'px')

  // Hauteur totale de la grille des collaborateurs pour le scroll virtuel
  const gridTotalHeight = computed(() => (filteredCollaborateurs.value.length * rowHeight.value) + 'px')

  // Vérifier si aujourd'hui est visible dans la plage filtrée
  const isTodayVisible = computed(() => visibleDays.value.some(d => d.isToday))

  // === STYLES CSS VARIABLES ===
  const highlightStyles = computed(() => {
    return {
      '--day-width': dayWidth.value + 'px',
      '--sticky-left': stickyLeftWidth.value + 'px',
      '--day-pitch': (dayWidth.value + 1) + 'px'
    }
  })

  // === CACHE DES CLASSES DE CELLULES ===
  const cellClassesCache = new Map<string, string[]>()
  let lastHoveredColumn = -1
  let lastHoveredRow = -1

  /**
   * Calculer les classes CSS pour une cellule (haute performance avec cache)
   */
  function getCellClasses(dayIndex: number, rowIndex: number): string[] {
    const localDayIndex = dayIndex - windowStartIndex.value
    
    // Cache ultra-optimisé - ne recalculer que si les valeurs de hover ont changé
    const currentHoveredColumn = hoveredColumnIndex.value
    const currentHoveredRow = hoveredRowIndex.value
    
    if (lastHoveredColumn !== currentHoveredColumn || lastHoveredRow !== currentHoveredRow) {
      cellClassesCache.clear()
      lastHoveredColumn = currentHoveredColumn
      lastHoveredRow = currentHoveredRow
    }
    
    const cacheKey = `${localDayIndex}-${rowIndex}`
    if (cellClassesCache.has(cacheKey)) {
      return cellClassesCache.get(cacheKey)!
    }
    
    const classes: string[] = []
    
    if (currentHoveredColumn === localDayIndex) {
      classes.push('column-hovered')
    }
    
    if (currentHoveredRow === rowIndex) {
      classes.push('row-hovered')
    }
    
    cellClassesCache.set(cacheKey, classes)
    return classes
  }

  /**
   * Calculer les classes CSS pour un header de jour
   */
  function getDayHeaderClasses(dayIndex: number): string[] {
    const localDayIndex = dayIndex - windowStartIndex.value
    const classes: string[] = []
    
    if (hoveredColumnIndex.value === localDayIndex) {
      classes.push('column-hovered')
    }
    
    return classes
  }

  /**
   * Invalider le cache des classes (appelé lors d'un changement majeur)
   */
  function invalidateCellClassesCache() {
    cellClassesCache.clear()
    lastHoveredColumn = -1
    lastHoveredRow = -1
  }

  // === LAYOUT DES BARRES DE DISPO ===
  
  /**
   * Obtenir la classe de layout pour les barres de dispo dans une cellule
   * single => une barre occupe toute la hauteur
   * dual => 2 barres se partagent à 50%
   * multi => barres partagent la hauteur
   */
  function getDispoBarsLayoutClass(collaborateurId: string, date: string): string {
    if (!getCellDisposFunc) return ''
    const count = getCellDisposFunc(collaborateurId, date).length
    return sharedGetDispoBarsLayoutClass(count)
  }

  // === STYLES POUR LA GRILLE ===
  
  /**
   * Styles pour le conteneur des jours (header)
   */
  const daysContainerStyle = computed(() => ({
    minWidth: gridMinWidth.value
  }))

  /**
   * Styles pour le conteneur des lignes
   */
  const rowsContainerStyle = computed(() => ({
    '--row-height': rowHeight.value + 'px',
    '--row-pitch': (rowHeight.value + 1) + 'px',
    height: gridTotalHeight.value
  }))

  return {
    // État
    currentVisibleMonth,
    
    // Jours visibles
    visibleDays,
    isTodayVisible,
    
    // Dimensions
    gridMinWidth,
    gridTotalHeight,
    
    // Styles
    highlightStyles,
    daysContainerStyle,
    rowsContainerStyle,
    
    // Classes de cellules
    getCellClasses,
    getDayHeaderClasses,
    invalidateCellClassesCache,
    
    // Layout des barres
    getDispoBarsLayoutClass,
    
    // Setter pour injection tardive
    setGetCellDispos
  }
}
