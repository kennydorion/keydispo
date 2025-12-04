/**
 * usePlanningDays - Composable pour gérer les jours chargés dans le planning
 * Encapsule la logique réactive de génération, extension et pruning des jours
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { toDateStr, addDaysStr } from '@/utils/dateHelpers'
import {
  generateDays,
  generateAppendDays,
  generatePrependDays,
  mergeDateRanges,
  isDateInRanges,
  calculatePrunePast,
  calculatePruneFuture,
  calculateScrollOffset,
  type PlanningDay,
  type DateRange
} from '@/utils/planningDaysUtils'

export interface UsePlanningDaysOptions {
  dateFrom: ComputedRef<string>
  dateTo: ComputedRef<string>
  minPastDate: ComputedRef<string>
  dayWidth: ComputedRef<number>
  stickyLeftWidth: ComputedRef<number>
  planningScrollRef: Ref<HTMLElement | undefined>
  onDaysExtended?: (start: string, end: string) => void
  onMeasure?: () => void
}

export function usePlanningDays(options: UsePlanningDaysOptions) {
  const {
    dateFrom,
    dateTo,
    minPastDate,
    dayWidth,
    stickyLeftWidth,
    planningScrollRef,
    onDaysExtended,
    onMeasure
  } = options
  
  // Checker externe pour isScrollingFast (injecté après initialisation)
  let isScrollingFastChecker: (() => boolean) | null = null
  
  function setScrollingFastChecker(checker: () => boolean) {
    isScrollingFastChecker = checker
  }

  // === ÉTAT RÉACTIF ===
  const loadedDays = ref<PlanningDay[]>([])
  const loadedDateRanges = ref<DateRange[]>([])
  const extending = ref(false)

  // === CACHE isDayLoaded ===
  const isDayLoadedCache = new Map<string, boolean>()
  let isDayLoadedCacheVersion = 0

  function isDayLoaded(date: string): boolean {
    const cached = isDayLoadedCache.get(date)
    if (cached !== undefined) return cached
    
    const result = isDateInRanges(date, loadedDateRanges.value)
    isDayLoadedCache.set(date, result)
    
    // Limiter la taille du cache
    if (isDayLoadedCache.size > 500) {
      const firstKey = isDayLoadedCache.keys().next().value
      if (firstKey) isDayLoadedCache.delete(firstKey)
    }
    
    return result
  }

  function invalidateIsDayLoadedCache() {
    isDayLoadedCache.clear()
    isDayLoadedCacheVersion++
  }

  function addLoadedRange(start: string, end: string) {
    loadedDateRanges.value.push({ start, end })
    loadedDateRanges.value = mergeDateRanges(loadedDateRanges.value)
    invalidateIsDayLoadedCache()
  }

  // === GÉNÉRATION DES JOURS ===
  function initializeDays(): PlanningDay[] {
    const days = generateDays({
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      minPastDate: minPastDate.value,
      daysAhead: 90
    })
    loadedDays.value = days
    return days
  }

  function positionScrollAfterGenerate() {
    setTimeout(() => {
      const scroller = planningScrollRef.value
      if (!scroller) return
      
      const offset = calculateScrollOffset({
        days: loadedDays.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        dayWidth: dayWidth.value,
        clientWidth: scroller.clientWidth,
        stickyWidth: stickyLeftWidth.value
      })
      
      scroller.scrollLeft = offset
    }, 100)
  }

  // === EXTENSION DES JOURS ===
  async function appendDays(count: number) {
    if (loadedDays.value.length === 0) {
      console.warn('⚠️ Impossible d\'ajouter des jours: loadedDays vide')
      return null
    }
    
    const lastDay = loadedDays.value[loadedDays.value.length - 1]
    if (!lastDay) {
      console.warn('⚠️ Impossible d\'ajouter des jours: dernier jour non défini')
      return null
    }
    
    const newDays = generateAppendDays(lastDay.date, count)
    loadedDays.value.push(...newDays)
    
    // Callback pour recalibrer les mesures
    onMeasure?.()
    
    // Retourner les dates pour le chargement
    const startDate = addDaysStr(lastDay.date, 1)
    const endDate = newDays[newDays.length - 1]?.date
    
    if (onDaysExtended && endDate) {
      onDaysExtended(startDate, endDate)
    }
    
    return { start: startDate, end: endDate }
  }

  async function prependDays(count: number) {
    if (loadedDays.value.length === 0) return null
    
    const firstDateStr = loadedDays.value[0].date
    const newDays = generatePrependDays(firstDateStr, count)
    loadedDays.value = [...newDays, ...loadedDays.value]
    
    const startDate = newDays[0]?.date
    const endDate = addDaysStr(firstDateStr, -1)
    
    if (onDaysExtended && startDate) {
      onDaysExtended(startDate, endDate)
    }
    
    return { start: startDate, end: endDate }
  }

  // === PRUNING DES JOURS ===
  function prunePastIfFar(scroller: HTMLElement) {
    if (isScrollingFastChecker?.()) return
    
    const pruneResult = calculatePrunePast(scroller.scrollLeft, dayWidth.value)
    if (!pruneResult) return

    loadedDays.value.splice(0, pruneResult.removeCount)
    scroller.scrollLeft = pruneResult.newScrollLeft
  }

  function pruneFutureIfFar(scroller: HTMLElement) {
    if (isScrollingFastChecker?.()) return
    
    const pruneResult = calculatePruneFuture(
      scroller.scrollLeft,
      scroller.clientWidth,
      dayWidth.value,
      loadedDays.value.length
    )
    if (!pruneResult) return
    
    loadedDays.value.splice(pruneResult.removeFrom, pruneResult.removeCount)
  }

  // === NAVIGATION ===
  function goToToday() {
    const scroller = planningScrollRef.value
    if (!scroller) return
    
    const todayStr = toDateStr(new Date())
    const todayIndex = loadedDays.value.findIndex(d => d.date === todayStr)
    
    if (todayIndex >= 0) {
      const centerOffset = Math.max(0, todayIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
      scroller.scrollTo({ left: centerOffset, behavior: 'smooth' })
    }
  }

  function goToDate(date: string) {
    const scroller = planningScrollRef.value
    if (!scroller) return
    
    const dateIndex = loadedDays.value.findIndex(d => d.date === date)
    
    if (dateIndex >= 0) {
      const centerOffset = Math.max(0, dateIndex * dayWidth.value - (scroller.clientWidth - stickyLeftWidth.value) / 2)
      scroller.scrollTo({ left: centerOffset, behavior: 'smooth' })
    }
  }

  // === COMPUTED ===
  const firstLoadedDate = computed(() => loadedDays.value[0]?.date || null)
  const lastLoadedDate = computed(() => loadedDays.value[loadedDays.value.length - 1]?.date || null)
  const loadedDaysCount = computed(() => loadedDays.value.length)

  return {
    // État
    loadedDays,
    loadedDateRanges,
    extending,
    
    // Computed
    firstLoadedDate,
    lastLoadedDate,
    loadedDaysCount,
    
    // Configuration
    setScrollingFastChecker,
    
    // Méthodes d'initialisation
    initializeDays,
    positionScrollAfterGenerate,
    
    // Méthodes d'extension
    appendDays,
    prependDays,
    
    // Méthodes de pruning
    prunePastIfFar,
    pruneFutureIfFar,
    
    // Navigation
    goToToday,
    goToDate,
    
    // Gestion des plages chargées
    isDayLoaded,
    addLoadedRange,
    invalidateIsDayLoadedCache
  }
}

export type { PlanningDay, DateRange }
