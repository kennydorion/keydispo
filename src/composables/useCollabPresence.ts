import { ref, type ComputedRef } from 'vue'

export interface PresenceService {
  getHoveringUsers: (collaborateurId: string, date: string) => any[] | undefined
  isCellLocked: (collaborateurId: string, date: string) => boolean
  getCellLock?: (collaborateurId: string, date: string) => any
  getCellSelection?: (collaborateurId: string, date: string) => any
  isCellSelectedByOthers?: (collaborateurId: string, date: string) => boolean
}

export function useCollabPresence(
  collaborationService: PresenceService,
  visibleDays: ComputedRef<Array<{ date: string }>>,
  rows: ComputedRef<Array<{ id: string }>>,
  getUserInitials: (u: any) => string,
  getUserColor: (uid: string) => string,
) {
  const hoveredCells = ref(new Set<string>())
  const lockedCells = ref(new Set<string>())

  function isHoveredByOthers(collaborateurId: string, date: string): boolean {
    if (!collaborationService) return false
    const hoveringUsers = collaborationService.getHoveringUsers(collaborateurId, date)
    return !!(hoveringUsers && hoveringUsers.length > 0)
  }

  function isLockedByOthers(collaborateurId: string, date: string): boolean {
    const cellId = `${collaborateurId}_${date}`
    
    // Vérifier les verrous explicites
    if (lockedCells.value.has(cellId)) {
      return true
    }
    
    // Vérifier aussi les sélections multiples d'autres utilisateurs (considérées comme des verrous)
    if (collaborationService.isCellSelectedByOthers?.(collaborateurId, date)) {
      return true
    }
    
    return false
  }

  function getHoveringUser(collaborateurId: string, date: string): any | null {
    if (!collaborationService) return null
    const hoveringUsers = collaborationService.getHoveringUsers(collaborateurId, date)
    if (!hoveringUsers || hoveringUsers.length === 0) return null
    const user = hoveringUsers[0]
    return {
      uid: user.userId,
      displayName: user.userName,
      userName: user.userName,
      email: user.userEmail || '',
      sessionId: user.sessionId,
    }
  }

  function getHoveringUserColor(collaborateurId: string, date: string): string {
    const u = getHoveringUser(collaborateurId, date)
    return u ? getUserColor(u.uid) : 'var(--va-primary)'
  }

  function getHoveringUserInitials(collaborateurId: string, date: string): string {
    const u = getHoveringUser(collaborateurId, date)
    return u ? getUserInitials(u) : ''
  }

  function updatePresenceSets() {
    if (!collaborationService) return
    const newHovered = new Set<string>()
    const newLocked = new Set<string>()
    const days = Array.isArray(visibleDays.value) ? visibleDays.value : []
    const rws = Array.isArray(rows.value) ? rows.value : []
    
    // Optimisation: limiter à 100 cellules maximum pour éviter les surcharges
    const maxCells = 100
    let cellCount = 0
    
    for (const day of days) {
      for (const row of rws) {
        if (cellCount >= maxCells) break
        
        const cellId = `${row.id}_${day.date}`
        if (collaborationService.getHoveringUsers(row.id, day.date)?.length) newHovered.add(cellId)
        
        // Ajouter aux verrous si cellule explicitement verrouillée OU sélectionnée par d'autres
        if (collaborationService.isCellLocked(row.id, day.date) || 
            collaborationService.isCellSelectedByOthers?.(row.id, day.date)) {
          newLocked.add(cellId)
        }
        cellCount++
      }
      if (cellCount >= maxCells) break
    }
    
    hoveredCells.value = newHovered
    lockedCells.value = newLocked
  }

  let debounceTimer: number | null = null
  function debouncedUpdatePresenceSets(delay = 100) { // Augmenté de 50ms à 100ms
    if (debounceTimer) clearTimeout(debounceTimer)
    // @ts-ignore browser env
    debounceTimer = setTimeout(updatePresenceSets, delay)
  }

  return {
    hoveredCells,
    lockedCells,
    isHoveredByOthers,
    isLockedByOthers,
    getHoveringUser,
    getHoveringUserColor,
    getHoveringUserInitials,
    updatePresenceSets,
    debouncedUpdatePresenceSets,
  }
}
