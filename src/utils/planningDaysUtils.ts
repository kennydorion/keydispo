/**
 * planningDaysUtils - Fonctions utilitaires pour la génération de jours
 * Fonctions pures sans dépendances réactives
 */

import { toDateStr, addDaysStr } from '@/utils/dateHelpers'

export interface PlanningDay {
  date: string
  name: string
  dayNumber: number
  isToday: boolean
  isWeekend: boolean
  dayOfWeek: number
}

export interface DateRange {
  start: string
  end: string
}

export interface GenerateDaysOptions {
  dateFrom?: string
  dateTo?: string
  minPastDate: string
  daysAhead?: number
}

/**
 * Génère une liste de jours entre deux dates
 */
export function generateDays(options: GenerateDaysOptions): PlanningDay[] {
  const { dateFrom, dateTo, minPastDate, daysAhead = 90 } = options
  
  const days: PlanningDay[] = []
  const today = new Date()
  const todayStr = toDateStr(today)
  
  let startStr: string
  let endStr: string
  
  if (dateFrom) {
    startStr = dateFrom
  } else if (dateTo) {
    const endDate = new Date(dateTo)
    const startDate = new Date(endDate)
    startDate.setFullYear(endDate.getFullYear() - 1)
    startStr = toDateStr(startDate)
  } else {
    startStr = minPastDate
  }
  
  if (dateTo) {
    endStr = dateTo
  } else {
    endStr = addDaysStr(todayStr, daysAhead)
  }
  
  let cursor = new Date(startStr)
  const end = new Date(endStr)
  
  while (cursor <= end) {
    const dateStr = toDateStr(cursor)
    days.push({
      date: dateStr,
      name: cursor.toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 3),
      dayNumber: cursor.getDate(),
      isToday: dateStr === todayStr,
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
      dayOfWeek: cursor.getDay()
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  
  return days
}

/**
 * Génère des jours à ajouter à la fin d'une liste existante
 */
export function generateAppendDays(lastDate: string, count: number): PlanningDay[] {
  const days: PlanningDay[] = []
  const last = new Date(lastDate)
  const todayStr = toDateStr(new Date())
  
  for (let i = 1; i <= count; i++) {
    const date = new Date(last)
    date.setDate(last.getDate() + i)
    const dateStr = toDateStr(date)
    days.push({
      date: dateStr,
      name: date.toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 3),
      dayNumber: date.getDate(),
      isToday: dateStr === todayStr,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      dayOfWeek: date.getDay()
    })
  }
  
  return days
}

/**
 * Génère des jours à ajouter au début d'une liste existante
 */
export function generatePrependDays(firstDate: string, count: number): PlanningDay[] {
  const days: PlanningDay[] = []
  const first = new Date(firstDate)
  const todayStr = toDateStr(new Date())
  
  for (let i = count; i >= 1; i--) {
    const date = new Date(first)
    date.setDate(first.getDate() - i)
    const dateStr = toDateStr(date)
    days.push({
      date: dateStr,
      name: date.toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 3),
      dayNumber: date.getDate(),
      isToday: dateStr === todayStr,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      dayOfWeek: date.getDay()
    })
  }
  
  return days
}

/**
 * Fusionne des plages de dates qui se chevauchent
 */
export function mergeDateRanges(ranges: DateRange[]): DateRange[] {
  if (ranges.length === 0) return []
  
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start))
  const merged: DateRange[] = []
  
  for (const range of sorted) {
    if (merged.length === 0 || merged[merged.length - 1].end < range.start) {
      merged.push({ ...range })
    } else {
      merged[merged.length - 1].end = range.end > merged[merged.length - 1].end 
        ? range.end 
        : merged[merged.length - 1].end
    }
  }
  
  return merged
}

/**
 * Vérifie si une date est dans une liste de plages
 */
export function isDateInRanges(date: string, ranges: DateRange[]): boolean {
  return ranges.some(range => date >= range.start && date <= range.end)
}

export interface PrunePastResult {
  removeCount: number
  newScrollLeft: number
}

/**
 * Calcule les valeurs pour supprimer des jours du passé
 */
export function calculatePrunePast(
  scrollLeft: number,
  dayWidth: number,
  bufferDays: number = 150
): PrunePastResult | null {
  const firstVisibleIdx = Math.floor(scrollLeft / dayWidth)
  if (firstVisibleIdx <= bufferDays) return null
  const removeCount = firstVisibleIdx - bufferDays
  if (removeCount <= 0) return null
  return {
    removeCount,
    newScrollLeft: scrollLeft - removeCount * dayWidth
  }
}

export interface PruneFutureResult {
  removeFrom: number
  removeCount: number
}

/**
 * Calcule les valeurs pour supprimer des jours du futur
 */
export function calculatePruneFuture(
  scrollLeft: number,
  clientWidth: number,
  dayWidth: number,
  totalDays: number,
  bufferDays: number = 150
): PruneFutureResult | null {
  const lastVisibleIdx = Math.min(totalDays - 1, Math.floor((scrollLeft + clientWidth) / dayWidth))
  const targetMaxIdx = lastVisibleIdx + bufferDays
  
  if (totalDays - 1 <= targetMaxIdx) return null
  const removeFrom = targetMaxIdx + 1
  const removeCount = totalDays - removeFrom
  if (removeCount <= 0) return null
  
  return { removeFrom, removeCount }
}

export interface ScrollOffsetParams {
  days: PlanningDay[]
  dateFrom: string | null
  dateTo: string | null
  dayWidth: number
  clientWidth: number
  stickyWidth: number
}

/**
 * Calcule l'offset de scroll pour centrer sur la bonne date
 */
export function calculateScrollOffset(params: ScrollOffsetParams): number {
  const { days, dateFrom, dateTo, dayWidth, clientWidth, stickyWidth } = params
  
  // Si on a une date de fin mais pas de date de début, centrer sur la fin
  if (dateTo && !dateFrom) {
    const endIndex = days.findIndex(d => d.date === dateTo)
    if (endIndex >= 0) {
      return Math.max(0, endIndex * dayWidth - (clientWidth - stickyWidth) / 2)
    }
  }
  
  // Sinon, centrer sur aujourd'hui
  const todayIndex = days.findIndex(d => d.isToday)
  if (todayIndex >= 0) {
    return Math.max(0, todayIndex * dayWidth - (clientWidth - stickyWidth) / 2)
  }
  
  return 0
}
