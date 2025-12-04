import { computed, type Ref } from 'vue'
import { auth } from '@/services/firebase'

/**
 * Composable pour la gestion de la collaboration et du verrouillage des cellules
 * Gère les locks, sélections, et présence des autres utilisateurs
 */
export function usePlanningCollaboration(options: {
  collaborationService: any
  connectedUsers: Ref<any[]>
}) {
  const { collaborationService, connectedUsers } = options
  
  /**
   * Vérifier si une cellule est verrouillée par un autre utilisateur
   */
  function isCellLockedByOther(collaborateurId: string, date: string): boolean {
    try {
      if (!collaborationService) return false
      return collaborationService.isCellLocked(collaborateurId, date)
    } catch (error) {
      return false
    }
  }
  
  /**
   * Obtenir les informations de verrouillage d'une cellule
   */
  function getCellLock(collaborateurId: string, date: string) {
    if (!collaborationService) return null
    return collaborationService.getCellLock(collaborateurId, date)
  }
  
  /**
   * Vérifier si une cellule est survolée par d'autres utilisateurs
   */
  function isHoveredByOthers(collaborateurId: string, date: string): boolean {
    try {
      if (!collaborationService) return false
      
      const cellId = `${collaborateurId}_${date}`
      const activities = collaborationService.remoteActivities || []
      const currentUserId = auth.currentUser?.uid
      
      return activities.some((activity: any) => 
        activity.cellId === cellId && 
        activity.userId !== currentUserId &&
        activity.status === 'hovering'
      )
    } catch (error) {
      return false
    }
  }
  
  /**
   * Obtenir la couleur de l'utilisateur qui survole une cellule
   */
  function getHoveringUserColor(collaborateurId: string, date: string): string {
    try {
      if (!collaborationService) return 'transparent'
      
      const cellId = `${collaborateurId}_${date}`
      const activities = collaborationService.remoteActivities || []
      const currentUserId = auth.currentUser?.uid
      
      const hoveringActivity = activities.find((activity: any) => 
        activity.cellId === cellId && 
        activity.userId !== currentUserId &&
        activity.status === 'hovering'
      )
      
      if (hoveringActivity) {
        // Retourner une couleur basée sur l'userId
        // (Cette logique devrait être cohérente avec getUserColor)
        return hoveringActivity.userColor || 'rgba(33, 150, 243, 0.3)'
      }
      
      return 'transparent'
    } catch (error) {
      return 'transparent'
    }
  }
  
  /**
   * Vérifier si une cellule est sélectionnée par d'autres utilisateurs
   */
  function isCellSelectedByOthers(collaborateurId: string, date: string): boolean {
    try {
      if (!collaborationService) return false
      return collaborationService.isCellSelectedByOthers(collaborateurId, date)
    } catch (error) {
      return false
    }
  }
  
  /**
   * Obtenir les informations de sélection d'une cellule
   */
  function getCellSelection(collaborateurId: string, date: string) {
    if (!collaborationService) return null
    return collaborationService.getCellSelection(collaborateurId, date)
  }
  
  /**
   * Obtenir les classes CSS pour une cellule en fonction de son état de verrouillage/sélection
   */
  function getCellLockClasses(collaborateurId: string, date: string): string[] {
    const classes: string[] = []
    
    // Vérifier le verrouillage
    if (isCellLockedByOther(collaborateurId, date)) {
      classes.push('cell-locked-by-other')
      const lock = getCellLock(collaborateurId, date)
      if (lock) {
        classes.push(`locked-by-${lock.userId}`)
      }
    }
    
    // Vérifier la sélection
    if (isCellSelectedByOthers(collaborateurId, date)) {
      classes.push('cell-selected-by-other')
    }
    
    // Vérifier le survol
    if (isHoveredByOthers(collaborateurId, date)) {
      classes.push('cell-hovered-by-other')
    }
    
    return classes
  }
  
  /**
   * Obtenir les initiales de l'utilisateur qui a verrouillé/sélectionné une cellule
   */
  function getCellUserInitials(collaborateurId: string, date: string): string {
    // Priorité: lock > sélection
    const lock = getCellLock(collaborateurId, date)
    if (lock) {
      const userName = lock.userName || ''
      return userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    
    const selection = getCellSelection(collaborateurId, date)
    if (selection) {
      const userName = selection.userName || ''
      return userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    
    return ''
  }
  
  /**
   * Mettre à jour les indicateurs de hover dans le DOM
   */
  function updateDomHoverIndicators() {
    try {
      const root = document.querySelector('.excel-planning-container') as HTMLElement | null
      if (!root) return
      
      // Pour chaque cellule visible, toggler une classe si hovered par d'autres
      const cells = root.querySelectorAll('[data-cell-id]')
      cells.forEach((el) => {
        const cellId = (el as HTMLElement).getAttribute('data-cell-id') || ''
        const [collaborateurId, date] = cellId.split('_')
        if (!collaborateurId || !date) return
        const hovered = isHoveredByOthers(collaborateurId, date)
        ;(el as HTMLElement).classList.toggle('has-presence', hovered)
        ;(el as HTMLElement).classList.toggle('has-indicator', hovered)
        ;(el as HTMLElement).style.setProperty('--hovering-user-color', getHoveringUserColor(collaborateurId, date))
      })
    } catch {}
  }
  
  return {
    // Fonctions de vérification
    isCellLockedByOther,
    getCellLock,
    isHoveredByOthers,
    getHoveringUserColor,
    isCellSelectedByOthers,
    getCellSelection,
    
    // Helpers pour l'UI
    getCellLockClasses,
    getCellUserInitials,
    updateDomHoverIndicators
  }
}
