/**
 * usePlanningMeasure - Mesures DOM et dimensions du planning
 * Extrait de PlanningSemaine.vue pour réduire la dette technique
 */
import { ref, type Ref } from 'vue'

export function usePlanningMeasure(planningScroll: Ref<HTMLElement | null>) {
  
  /**
   * Mesure et définit la hauteur du header
   */
  function measureAndSetHeaderHeight() {
    const scroller = planningScroll.value
    if (!scroller) return
    
    const header = scroller.querySelector('.sticky-header-row') as HTMLElement | null
    const headerH = header ? header.getBoundingClientRect().height : 0
    scroller.style.setProperty('--header-h', `${headerH}px`)
    
    // Mesure fine: hauteur de la rangée des mois
    const monthsH = 0 // Plus besoin de calculer la hauteur des mois puisqu'on les a supprimés
    scroller.style.setProperty('--months-h', `${monthsH}px`)
  }

  /**
   * Callback pour le resize
   */
  const onResize = () => measureAndSetHeaderHeight()

  return {
    measureAndSetHeaderHeight,
    onResize
  }
}
