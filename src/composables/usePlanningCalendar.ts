import { computed, type Ref } from 'vue'

/**
 * Composable pour les utilitaires de calendrier
 * Gère les semaines ISO, les segments de semaines, et les calculs de dates
 */
export function usePlanningCalendar(visibleDays: Ref<any[]>) {
  
  /**
   * Calculer le numéro de semaine ISO pour une date
   */
  function getISOWeek(dateStr: string): number {
    const d = new Date(dateStr + 'T12:00:00')
    const target = new Date(d)
    const dayNr = (d.getDay() + 6) % 7
    target.setDate(target.getDate() - dayNr + 3)
    const firstThursday = new Date(target.getFullYear(), 0, 4)
    const firstThursdayDayNr = (firstThursday.getDay() + 6) % 7
    firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNr + 3)
    const diff = target.getTime() - firstThursday.getTime()
    return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
  }
  
  /**
   * Calculer les segments de semaines pour l'affichage de l'en-tête
   */
  const weekSegments = computed(() => {
    const segs: Array<{ key: string; week: number; count: number; monthLabel: string }> = []
    let currentWeek: number | null = null
    let count = 0
    let currentMonthLabel = ''
    
    for (let i = 0; i < visibleDays.value.length; i++) {
      const dateStr = visibleDays.value[i].date
      const w = getISOWeek(dateStr)
      
      // Récupérer le label du mois pour cette date
      const date = new Date(dateStr + 'T12:00:00')
      const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long' })
      const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      
      if (currentWeek === null) {
        // Premier jour
        currentWeek = w
        count = 1
        currentMonthLabel = capitalizedMonth
      } else if (w === currentWeek && capitalizedMonth === currentMonthLabel) {
        // Même semaine, même mois
        count++
      } else if (w === currentWeek && capitalizedMonth !== currentMonthLabel) {
        // Même semaine mais changement de mois - créer un segment pour le mois précédent
        segs.push({ key: `w-${currentWeek}-${currentMonthLabel}-${i}`, week: currentWeek, count, monthLabel: currentMonthLabel })
        // Commencer un nouveau segment pour le nouveau mois dans la même semaine
        count = 1
        currentMonthLabel = capitalizedMonth
      } else {
        // Nouvelle semaine
        segs.push({ key: `w-${currentWeek}-${currentMonthLabel}-${i}`, week: currentWeek, count, monthLabel: currentMonthLabel })
        currentWeek = w
        count = 1
        currentMonthLabel = capitalizedMonth
      }
    }
    if (currentWeek != null && count > 0) {
      segs.push({ key: `w-${currentWeek}-${currentMonthLabel}-final`, week: currentWeek, count, monthLabel: currentMonthLabel })
    }
    return segs
  })
  
  /**
   * Déterminer si un segment de semaine marque une frontière de mois
   */
  function isMonthBoundary(segment: { monthLabel: string }, prevSegment: { monthLabel: string } | null): boolean {
    if (!prevSegment) return true // Premier segment
    return segment.monthLabel !== prevSegment.monthLabel
  }
  
  /**
   * Obtenir le label du mois pour un segment
   */
  function getMonthLabel(segment: { monthLabel: string }): string {
    return segment.monthLabel
  }
  
  return {
    // Computed
    weekSegments,
    
    // Fonctions
    getISOWeek,
    isMonthBoundary,
    getMonthLabel
  }
}
