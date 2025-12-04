import { ref, computed } from 'vue'

/**
 * Composable pour la gestion du cache DOM et des highlights
 * Optimise les performances en cachant les références DOM des cellules
 */
export function usePlanningDOMCache() {
  
  // Cache DOM pour accès direct aux cellules
  const _domCache = {
    columnElements: new Map<number, Set<HTMLElement>>(),
    rowElements: new Map<number, Set<HTMLElement>>(),
    cacheValid: false,
    lastRebuild: 0
  }
  
  // Variables de tracking pour les highlights
  let _currentHighlightedColumn = -1
  let _currentHighlightedRow = -1
  
  /**
   * Invalider le cache DOM
   */
  function invalidateDOMCache(reason?: string) {
    _domCache.columnElements.clear()
    _domCache.rowElements.clear()
    _domCache.cacheValid = false
    if (reason) {
      // Cache invalidé: raison
    }
  }
  
  /**
   * Reconstruire le cache DOM à partir du DOM actuel
   */
  function rebuildDOMCache() {
    const now = Date.now()
    // Éviter les reconstructions trop fréquentes (debounce 100ms)
    if (_domCache.cacheValid && (now - _domCache.lastRebuild) < 100) {
      return false
    }
    
    _domCache.columnElements.clear()
    _domCache.rowElements.clear()
    
    const container = document.querySelector('.excel-planning-container')
    if (!container) {
      return false
    }
    
    // Récupérer toutes les cellules avec data-col-index et data-row-index
    const cells = container.querySelectorAll('[data-col-index][data-row-index]')
    
    cells.forEach(cell => {
      const element = cell as HTMLElement
      const colIndex = parseInt(element.getAttribute('data-col-index') || '-1')
      const rowIndex = parseInt(element.getAttribute('data-row-index') || '-1')
      
      if (colIndex >= 0) {
        if (!_domCache.columnElements.has(colIndex)) {
          _domCache.columnElements.set(colIndex, new Set())
        }
        _domCache.columnElements.get(colIndex)!.add(element)
      }
      
      if (rowIndex >= 0) {
        if (!_domCache.rowElements.has(rowIndex)) {
          _domCache.rowElements.set(rowIndex, new Set())
        }
        _domCache.rowElements.get(rowIndex)!.add(element)
      }
    })
    
    _domCache.cacheValid = true
    _domCache.lastRebuild = now
    return true
  }
  
  /**
   * Mettre à jour les highlights en utilisant le cache DOM
   */
  function updateHighlightWithDOMCache(columnIndex: number, rowIndex: number) {
    // Optimisation : ne rien faire si rien n'a changé
    if (_currentHighlightedColumn === columnIndex && _currentHighlightedRow === rowIndex) {
      return
    }
    
    // Nettoyer l'ancienne colonne (cache DOM)
    if (_currentHighlightedColumn !== columnIndex && _currentHighlightedColumn >= 0) {
      const oldColumnElements = _domCache.columnElements.get(_currentHighlightedColumn)
      if (oldColumnElements) {
        oldColumnElements.forEach(el => {
          el.classList.remove('dom-column-hovered')
          // Nettoyer le style inline pour weekend
          if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
            (el as HTMLElement).style.backgroundColor = ''
          }
        })
      }
    }
    
    // Nettoyer l'ancienne ligne (cache DOM)
    if (_currentHighlightedRow !== rowIndex && _currentHighlightedRow >= 0) {
      const oldRowElements = _domCache.rowElements.get(_currentHighlightedRow)
      if (oldRowElements) {
        oldRowElements.forEach(el => {
          el.classList.remove('dom-row-hovered')
          // Nettoyer le style inline pour weekend
          if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
            (el as HTMLElement).style.backgroundColor = ''
          }
        })
      }
    }
    
    // Ajouter la nouvelle colonne (cache DOM)
    if (columnIndex >= 0 && columnIndex !== _currentHighlightedColumn) {
      const newColumnElements = _domCache.columnElements.get(columnIndex)
      if (newColumnElements) {
        newColumnElements.forEach(el => {
          el.classList.add('dom-column-hovered')
          // FORCE inline style pour weekend - priorité absolue
          if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
            (el as HTMLElement).style.backgroundColor = 'rgba(76, 175, 80, 0.12)'
          }
        })
      }
    }
    
    // Ajouter la nouvelle ligne (cache DOM)
    if (rowIndex >= 0 && rowIndex !== _currentHighlightedRow) {
      const newRowElements = _domCache.rowElements.get(rowIndex)
      if (newRowElements) {
        newRowElements.forEach(el => {
          el.classList.add('dom-row-hovered')
          // FORCE inline style pour weekend - priorité absolue
          if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
            (el as HTMLElement).style.backgroundColor = 'rgba(76, 175, 80, 0.16)'
          }
        })
      }
    }
    
    // Mettre à jour les variables de tracking
    _currentHighlightedColumn = columnIndex
    _currentHighlightedRow = rowIndex
  }
  
  /**
   * Nettoyer tous les highlights
   */
  function clearAllDOMHighlights() {
    // Nettoyer la colonne actuelle
    if (_currentHighlightedColumn >= 0) {
      const columnElements = _domCache.columnElements.get(_currentHighlightedColumn)
      if (columnElements) {
        columnElements.forEach(el => {
          el.classList.remove('dom-column-hovered')
          if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
            (el as HTMLElement).style.backgroundColor = ''
          }
        })
      }
    }
    
    // Nettoyer la ligne actuelle
    if (_currentHighlightedRow >= 0) {
      const rowElements = _domCache.rowElements.get(_currentHighlightedRow)
      if (rowElements) {
        rowElements.forEach(el => {
          el.classList.remove('dom-row-hovered')
          if (el.classList.contains('day-6') || el.classList.contains('day-0')) {
            (el as HTMLElement).style.backgroundColor = ''
          }
        })
      }
    }
    
    _currentHighlightedColumn = -1
    _currentHighlightedRow = -1
  }
  
  /**
   * Statut du cache DOM pour monitoring
   */
  const domCacheStatus = computed(() => {
    return {
      isValid: _domCache.cacheValid,
      elements: _domCache.columnElements.size + _domCache.rowElements.size,
      columns: _domCache.columnElements.size,
      rows: _domCache.rowElements.size
    }
  })
  
  return {
    // État
    domCacheStatus,
    
    // Fonctions
    invalidateDOMCache,
    rebuildDOMCache,
    updateHighlightWithDOMCache,
    clearAllDOMHighlights,
    
    // Variables internes (pour compatibilité)
    _domCache,
    getCurrentHighlightedColumn: () => _currentHighlightedColumn,
    getCurrentHighlightedRow: () => _currentHighlightedRow
  }
}
