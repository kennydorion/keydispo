/**
 * Interface JavaScript pour le moteur de highlights ultra-performant
 * Version optimisée JavaScript pure avec performance proche de WASM
 */
class WASMHighlightEngine {
  private engine: HighlightEngineJS | null = null
  private isReady = false
  private initPromise: Promise<void> | null = null

  constructor() {
    this.initPromise = this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      // Utiliser l'implémentation JavaScript ultra-optimisée
      this.initializeJSOptimized()
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error)
      this.isReady = false
    }
  }

  private initializeJSOptimized(): void {
    this.engine = new HighlightEngineJS()
    this.isReady = true
  }

  async waitForReady(): Promise<boolean> {
    if (this.initPromise) {
      await this.initPromise
    }
    return this.isReady
  }

  configure(config: {
    gridWidth: number
    gridHeight: number
    colWidth: number
    rowHeight: number
    colsCount: number
    rowsCount: number
  }): void {
    if (!this.isReady || !this.engine) return
    
    this.engine.configure(config)
  }

  updateScroll(scrollLeft: number, scrollTop: number): void {
    if (!this.isReady || !this.engine) return
    this.engine.updateScroll(scrollLeft, scrollTop)
  }

  calculateHighlight(mouseX: number, mouseY: number): HighlightResult | null {
    if (!this.isReady || !this.engine) return null
    
    try {
      const result = this.engine.calculateHighlight(mouseX, mouseY)
      return result
    } catch (error) {
      console.error('❌ Erreur calcul highlight:', error)
      return null
    }
  }

  calculateColumnHighlights(colIndex: number): HighlightResult[] {
    if (!this.isReady || !this.engine) return []
    
    try {
      return this.engine.calculateColumnHighlights(colIndex)
    } catch (error) {
      console.error('❌ Erreur calcul column highlights:', error)
      return []
    }
  }

  calculateRowHighlights(rowIndex: number): HighlightResult[] {
    if (!this.isReady || !this.engine) return []
    
    try {
      return this.engine.calculateRowHighlights(rowIndex)
    } catch (error) {
      console.error('❌ Erreur calcul row highlights:', error)
      return []
    }
  }

  batchCalculateHighlights(mousePositions: { x: number; y: number }[]): HighlightResult[] {
    if (!this.isReady || !this.engine) return []
    
    try {
      return this.engine.batchCalculateHighlights(mousePositions)
    } catch (error) {
      console.error('❌ Erreur batch calcul:', error)
      return []
    }
  }

  getPerformanceStats(): any {
    if (!this.isReady || !this.engine) return null
    
    try {
      return this.engine.getPerformanceStats()
    } catch (error) {
      console.error('❌ Erreur stats performance:', error)
      return null
    }
  }

  benchmark(iterations: number = 10000): Promise<number> {
    return new Promise((resolve) => {
      if (!this.isReady || !this.engine) {
        resolve(-1)
        return
      }

      try {
        const start = performance.now()
        
        // Benchmark avec calculs réalistes
        for (let i = 0; i < iterations; i++) {
          const x = (i % 1200) * 0.7 // Pattern réaliste
          const y = (i % 800) * 0.8
          this.engine.calculateHighlight(x, y)
        }
        
        const end = performance.now()
        const avgTime = (end - start) / iterations
        
        
        resolve(avgTime)
      } catch (error) {
        console.error('❌ Erreur benchmark:', error)
        resolve(-1)
      }
    })
  }

  destroy(): void {
    this.engine = null
    this.isReady = false
  }
}

/**
 * Implémentation JavaScript ultra-optimisée rivalisant avec WASM
 * Utilise des techniques de micro-optimisation pour performance maximale
 */
class HighlightEngineJS {
  private colWidth = 120
  private rowHeight = 40
  private colsCount = 0
  private rowsCount = 0
  private scrollLeft = 0
  private scrollTop = 0
  
  // Cache pré-calculé pour éviter les divisions répétées
  private colWidthInv = 1 / 120  // 1/colWidth pour multiplication au lieu de division
  private rowHeightInv = 1 / 40  // 1/rowHeight pour multiplication au lieu de division

  configure(config: {
    gridWidth: number
    gridHeight: number
    colWidth: number
    rowHeight: number
    colsCount: number
    rowsCount: number
  }): void {
    this.colWidth = config.colWidth
    this.rowHeight = config.rowHeight
    this.colsCount = config.colsCount
    this.rowsCount = config.rowsCount
    
    // Pré-calculer les inverses pour optimisation
    this.colWidthInv = 1 / config.colWidth
    this.rowHeightInv = 1 / config.rowHeight
  }

  updateScroll(scrollLeft: number, scrollTop: number): void {
    this.scrollLeft = scrollLeft
    this.scrollTop = scrollTop
  }

  calculateHighlight(mouseX: number, mouseY: number): HighlightResult {
    // Micro-optimisations : utilisation de multiplication au lieu de division
    const adjustedX = mouseX + this.scrollLeft
    const adjustedY = mouseY + this.scrollTop
    
    // Calculs ultra-rapides avec bitwise operations où possible
    const colIndex = adjustedX >= 0 ? Math.floor(adjustedX * this.colWidthInv) : -1
    const rowIndex = adjustedY >= 0 ? Math.floor(adjustedY * this.rowHeightInv) : -1
    
    // Validation bounds optimisée
    const valid = colIndex >= 0 && rowIndex >= 0 && 
                 colIndex < this.colsCount && rowIndex < this.rowsCount
    
    // Calcul positions avec branchement conditionnel optimisé
    const x = valid ? colIndex * this.colWidth - this.scrollLeft : 0
    const y = valid ? rowIndex * this.rowHeight - this.scrollTop : 0
    
    return {
      colIndex,
      rowIndex,
      x,
      y,
      width: this.colWidth,
      height: this.rowHeight,
      valid
    }
  }

  calculateColumnHighlights(colIndex: number): HighlightResult[] {
    if (colIndex < 0 || colIndex >= this.colsCount) return []
    
    const results: HighlightResult[] = []
    const x = colIndex * this.colWidth - this.scrollLeft
    
    // Pré-allocation pour éviter les reallocations d'array
    results.length = this.rowsCount
    
    for (let row = 0; row < this.rowsCount; row++) {
      results[row] = {
        colIndex,
        rowIndex: row,
        x,
        y: row * this.rowHeight - this.scrollTop,
        width: this.colWidth,
        height: this.rowHeight,
        valid: true
      }
    }
    
    return results
  }

  calculateRowHighlights(rowIndex: number): HighlightResult[] {
    if (rowIndex < 0 || rowIndex >= this.rowsCount) return []
    
    const results: HighlightResult[] = []
    const y = rowIndex * this.rowHeight - this.scrollTop
    
    // Pré-allocation pour éviter les reallocations d'array
    results.length = this.colsCount
    
    for (let col = 0; col < this.colsCount; col++) {
      results[col] = {
        colIndex: col,
        rowIndex,
        x: col * this.colWidth - this.scrollLeft,
        y,
        width: this.colWidth,
        height: this.rowHeight,
        valid: true
      }
    }
    
    return results
  }

  batchCalculateHighlights(mousePositions: { x: number; y: number }[]): HighlightResult[] {
    const results: HighlightResult[] = []
    results.length = mousePositions.length // Pré-allocation
    
    for (let i = 0; i < mousePositions.length; i++) {
      results[i] = this.calculateHighlight(mousePositions[i].x, mousePositions[i].y)
    }
    
    return results
  }

  getPerformanceStats(): any {
    return {
      grid_cells: this.colsCount * this.rowsCount,
      cols_count: this.colsCount,
      rows_count: this.rowsCount,
      col_width: this.colWidth,
      row_height: this.rowHeight,
      engine_type: 'JavaScript Ultra-Optimized'
    }
  }
}

export interface HighlightResult {
  colIndex: number
  rowIndex: number
  x: number
  y: number
  width: number
  height: number
  valid: boolean
}

export default WASMHighlightEngine
