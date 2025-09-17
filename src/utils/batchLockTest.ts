/**
 * Test utilitaire pour vérifier le système de lock du modal batch
 */

export interface BatchLockTestResult {
  success: boolean
  message: string
  lockDetails?: {
    cellsToLock: number
    successfulLocks: number
    failedLocks: number
  }
}

/**
 * Teste le verrouillage des cellules sélectionnées pour un modal batch
 */
export async function testBatchLock(
  selectedCells: Set<string>,
  collaborationService: any
): Promise<BatchLockTestResult> {
  if (!collaborationService || !collaborationService.isActive) {
    return {
      success: false,
      message: 'Service de collaboration non actif'
    }
  }

  if (selectedCells.size === 0) {
    return {
      success: false,
      message: 'Aucune cellule sélectionnée'
    }
  }

  const lockPromises: Promise<boolean>[] = []
  const cellKeys: string[] = []

  // Préparation des verrous
  selectedCells.forEach(cellKey => {
    const [collaborateurId, date] = cellKey.split('-')
    if (collaborateurId && date) {
      cellKeys.push(cellKey)
      const promise = collaborationService.lockCell(collaborateurId, date, 'modal')
      lockPromises.push(promise)
    }
  })

  try {
    // Exécution des verrous
    const results = await Promise.all(lockPromises)
    
    const successfulLocks = results.filter(success => success).length
    const failedLocks = results.length - successfulLocks

    const result: BatchLockTestResult = {
      success: successfulLocks > 0,
      message: `${successfulLocks}/${results.length} cellules verrouillées avec succès`,
      lockDetails: {
        cellsToLock: selectedCells.size,
        successfulLocks,
        failedLocks
      }
    }

    console.log('🔒 Test batch lock:', result)
    return result

  } catch (error) {
    return {
      success: false,
      message: `Erreur lors du verrouillage: ${error}`
    }
  }
}

/**
 * Teste la libération des verrous après fermeture du modal batch
 */
export async function testBatchUnlock(
  selectedCells: Set<string>,
  collaborationService: any
): Promise<BatchLockTestResult> {
  if (!collaborationService || !collaborationService.isActive) {
    return {
      success: false,
      message: 'Service de collaboration non actif'
    }
  }

  const unlockPromises: Promise<void>[] = []
  let unlockCount = 0

  selectedCells.forEach(cellKey => {
    const [collaborateurId, date] = cellKey.split('-')
    if (collaborateurId && date) {
      unlockCount++
      const promise = collaborationService.unlockCell(collaborateurId, date)
      unlockPromises.push(promise)
    }
  })

  try {
    await Promise.all(unlockPromises)
    
    const result: BatchLockTestResult = {
      success: true,
      message: `${unlockCount} verrous libérés avec succès`
    }

    console.log('🔓 Test batch unlock:', result)
    return result

  } catch (error) {
    return {
      success: false,
      message: `Erreur lors de la libération des verrous: ${error}`
    }
  }
}

/**
 * Vérifie que les cellules apparaissent comme lockées pour d'autres utilisateurs
 */
export function testBatchLockVisibility(
  selectedCells: Set<string>,
  collaborationService: any
): BatchLockTestResult {
  if (!collaborationService || !collaborationService.isActive) {
    return {
      success: false,
      message: 'Service de collaboration non actif'
    }
  }

  let lockedCount = 0
  let totalChecked = 0

  selectedCells.forEach(cellKey => {
    const [collaborateurId, date] = cellKey.split('-')
    if (collaborateurId && date) {
      totalChecked++
      
      // Vérifier si la cellule apparaît comme lockée
      const isLocked = collaborationService.isCellLocked(collaborateurId, date)
      const isSelectedByOthers = collaborationService.isCellSelectedByOthers(collaborateurId, date)
      
      if (isLocked || isSelectedByOthers) {
        lockedCount++
      }
    }
  })

  const result: BatchLockTestResult = {
    success: lockedCount === totalChecked,
    message: `${lockedCount}/${totalChecked} cellules apparaissent comme lockées`,
    lockDetails: {
      cellsToLock: selectedCells.size,
      successfulLocks: lockedCount,
      failedLocks: totalChecked - lockedCount
    }
  }

  console.log('👀 Test batch lock visibility:', result)
  return result
}

// Export pour utilisation dans la console
if (typeof window !== 'undefined') {
  (window as any).testBatchLock = testBatchLock
  (window as any).testBatchUnlock = testBatchUnlock
  (window as any).testBatchLockVisibility = testBatchLockVisibility
}
