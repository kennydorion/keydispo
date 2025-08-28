import { cellStateService } from './cellStateService'

/**
 * Service de collaboration nouveau - wrapper pour compatibilité avec l'ancienne interface
 */
class NewCollaborationService {
  private isInitialized = false

  /**
   * Initialiser le service
   */
  async init(tenantId: string, user: { uid: string; displayName?: string; email?: string }) {
    await cellStateService.init(tenantId, user)
    this.isInitialized = true
    console.log('🚀 Nouveau service collaboration initialisé')
  }

  /**
   * Méthodes de compatibilité avec l'ancienne interface
   */

  // Hover (survol)
  async setHoveredCell(collaborateurId: string, date: string) {
    if (!this.isInitialized) return
    return await cellStateService.setCellState(collaborateurId, date, 'hovered')
  }

  async clearHoveredCell() {
    // Pour le clear, on pourrait nettoyer tous nos hovers actifs
    // Pour le moment, on laisse le timeout faire son travail
    console.log('🧹 Clear hover (géré par timeouts)')
  }

  // Locks (verrous)
  async lockCellForEditing(collaborateurId: string, date: string, lockType: string = 'editing'): Promise<boolean> {
    if (!this.isInitialized) return false
    return await cellStateService.setCellState(collaborateurId, date, 'locked', { lockType })
  }

  async unlockCellFromEditing(collaborateurId: string, date: string): Promise<boolean> {
    if (!this.isInitialized) return false
    return await cellStateService.clearCellState(collaborateurId, date)
  }

  // Vérifications
  isCellLocked(collaborateurId: string, date: string): boolean {
    const state = cellStateService.getCellState(collaborateurId, date)
    return state !== null && 
           (state.status === 'locked' || state.status === 'editing') &&
           state.userId !== cellStateService.getCurrentUserId()
  }

  isCellHovered(collaborateurId: string, date: string): boolean {
    const state = cellStateService.getCellState(collaborateurId, date)
    return state !== null && 
           state.status === 'hovered' &&
           state.userId !== cellStateService.getCurrentUserId()
  }

  getCellLock(collaborateurId: string, date: string): any {
    const state = cellStateService.getCellState(collaborateurId, date)
    if (!state || state.userId === cellStateService.getCurrentUserId()) {
      return null
    }
    
    if (state.status === 'locked' || state.status === 'editing') {
      return {
        userId: state.userId,
        userName: state.userName,
        sessionId: state.sessionId,
        lockType: state.metadata?.lockType || 'editing'
      }
    }
    
    return null
  }

  getCellHover(collaborateurId: string, date: string): any {
    const state = cellStateService.getCellState(collaborateurId, date)
    if (!state || state.userId === cellStateService.getCurrentUserId()) {
      return null
    }
    
    if (state.status === 'hovered') {
      return {
        userId: state.userId,
        userName: state.userName,
        sessionId: state.sessionId,
        lockType: 'hover'
      }
    }
    
    return null
  }

  // Listeners
  onPresenceChange(callback: (users: any[]) => void): () => void {
    // Adapter le callback pour compatibilité
    return cellStateService.onStateChange((states) => {
      // Simuler une liste d'utilisateurs à partir des états
      const userMap = new Map<string, any>()
      
      states.forEach((state) => {
        if (state.userId !== cellStateService.getCurrentUserId()) {
          const existingUser = userMap.get(state.userId) || {
            uid: state.userId,
            displayName: state.userName,
            sessionId: state.sessionId,
            presenceState: 'active',
            status: 'online',
            hoveredCell: null,
            currentView: { 
              lockedCell: null,
              hoveredCell: null 
            }
          }
          
          if (state.status === 'hovered') {
            existingUser.hoveredCell = {
              collaborateurId: state.collaborateurId,
              date: state.date
            }
            existingUser.currentView.hoveredCell = {
              collaborateurId: state.collaborateurId,
              date: state.date
            }
          } else if (state.status === 'locked' || state.status === 'editing') {
            existingUser.currentView.lockedCell = {
              collaborateurId: state.collaborateurId,
              date: state.date,
              lockType: state.metadata?.lockType || 'editing'
            }
          }
          
          userMap.set(state.userId, existingUser)
        }
      })
      
      callback(Array.from(userMap.values()))
    })
  }

  onLockChange(callback: () => void): () => void {
    return cellStateService.onStateChange(() => {
      callback()
    })
  }

  // Activité
  markActivity() {
    // Dans le nouveau système, l'activité est gérée automatiquement
    console.log('📱 Activité marquée (auto-géré)')
  }

  // Gestion souris (pour compatibilité)
  onMouseLeavePlanning() {
    // Les timeouts gèrent automatiquement
  }

  onMouseLeaveWindow() {
    // Les timeouts gèrent automatiquement
  }

  // Getters
  getCurrentUser() {
    return {
      uid: cellStateService.getCurrentUserId(),
      sessionId: cellStateService.getSessionId()
    }
  }

  getOtherUsers(): any[] {
    const states = cellStateService.getAllStates()
    const userMap = new Map<string, any>()
    
    states.forEach((state) => {
      if (state.userId !== cellStateService.getCurrentUserId()) {
        const existingUser = userMap.get(state.userId) || {
          uid: state.userId,
          displayName: state.userName,
          sessionId: state.sessionId,
          presenceState: 'active'
        }
        userMap.set(state.userId, existingUser)
      }
    })
    
    return Array.from(userMap.values())
  }

  getSessionId(): string {
    return cellStateService.getSessionId()
  }

  // Alias pour compatibilité
  async lockCell(collaborateurId: string, date: string, lockType: string = 'editing'): Promise<boolean> {
    return this.lockCellForEditing(collaborateurId, date, lockType)
  }

  async unlockCell(collaborateurId: string, date: string): Promise<boolean> {
    return this.unlockCellFromEditing(collaborateurId, date)
  }

  async updateHoveredCell(collaborateurId: string, date: string) {
    return this.setHoveredCell(collaborateurId, date)
  }

  async clearHover() {
    return this.clearHoveredCell()
  }

  // Méthodes nouvelles
  async updateCellActivity(collaborateurId: string, date: string) {
    return await cellStateService.updateCellActivity(collaborateurId, date)
  }

  isCellBusy(collaborateurId: string, date: string): boolean {
    return cellStateService.isCellBusy(collaborateurId, date)
  }

  isCellLockedByOther(collaborateurId: string, date: string): boolean {
    return cellStateService.isCellLockedByOther(collaborateurId, date)
  }

  // Stats et debug
  getStats() {
    return cellStateService.getStats()
  }

  debugState() {
    cellStateService.debugState()
  }

  // Nettoyage
  async destroy() {
    await cellStateService.destroy()
    this.isInitialized = false
  }
}

// Export singleton
export const newCollaborationService = new NewCollaborationService()

// Ajout de méthodes statiques pour accès direct au service sous-jacent
export { cellStateService }
