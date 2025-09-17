import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

describe('Test reproduction problème sélection multi-lignes', () => {
  let selectedCells: any
  let isDraggingSelection: any
  let dragStartCell: any
  
  beforeEach(() => {
    selectedCells = ref(new Set())
    isDraggingSelection = ref(false)
    dragStartCell = ref(null)
  })

  // Fonction exacte de getCurrentSelectedCollaborateur du code
  function getCurrentSelectedCollaborateur(): string | null {
    if (selectedCells.value.size === 0) return null
    const firstCellId = Array.from(selectedCells.value)[0] as string
    return firstCellId.split('-')[0]
  }

  // Fonction CORRIGÉE de canAddCellToSelection (nouvelle version stricte)
  function canAddCellToSelection(collaborateurId: string): boolean {
    if (selectedCells.value.size === 0) return true
    const currentCollaborateur = getCurrentSelectedCollaborateur()
    return currentCollaborateur === collaborateurId
  }

  function validateSingleCollaboratorSelection(): boolean {
    if (selectedCells.value.size <= 1) return true
    const collaborateurs = new Set()
    for (const cellId of selectedCells.value) {
      const collaborateurId = (cellId as string).split('-')[0]
      collaborateurs.add(collaborateurId)
    }
    return collaborateurs.size === 1
  }

  function cleanSelectionToSingleCollaborator(): void {
    if (selectedCells.value.size <= 1) return
    const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
    if (!currentSelectedCollaborateur) return
    
    const validCells = new Set()
    for (const cellId of selectedCells.value) {
      const collaborateurId = (cellId as string).split('-')[0]
      if (collaborateurId === currentSelectedCollaborateur) {
        validCells.add(cellId)
      }
    }
    selectedCells.value = validCells
  }

  // Simulation exacte de handleCellClickNew avec les nouvelles validations
  function simulateCmd_Click(collaborateurId: string, date: string): boolean {
    const cellId = `${collaborateurId}-${date}`
    
    console.log('🖱️ Simulation Cmd+Clic:', { cellId, sélectionAvant: Array.from(selectedCells.value) })
    
    // RESTRICTION ULTRA-STRICTE: Interdire toute sélection sur un autre collaborateur
    if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
      console.log('❌ INTERDIT: Tentative de sélection sur un autre collaborateur')
      console.log('🔒 Sélection actuelle:', getCurrentSelectedCollaborateur(), '| Tentative:', collaborateurId)
      console.log('⚠️ Impossible de sélectionner des cellules sur différentes lignes de collaborateurs')
      return false // Refus complet
    }

    // Toggle la sélection
    if (selectedCells.value.has(cellId)) {
      selectedCells.value.delete(cellId)
      console.log('DESELECTION de:', cellId)
    } else {
      selectedCells.value.add(cellId)
      console.log('SELECTION de:', cellId)
    }

    // VALIDATION STRICTE
    if (!validateSingleCollaboratorSelection()) {
      console.log('❌ VALIDATION ÉCHOUÉE: Sélection multi-collaborateur détectée!')
      cleanSelectionToSingleCollaborator()
    }

    selectedCells.value = new Set(selectedCells.value)
    console.log('Sélection après:', Array.from(selectedCells.value))
    return true
  }

  it('devrait reproduire le problème: impossible de sélectionner sur 2 lignes différentes', () => {
    // Étape 1: Cmd+clic sur collaborateur A
    console.log('=== ÉTAPE 1: Cmd+clic sur collabA ===')
    expect(simulateCmd_Click('collabA', '2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collabA-2024-01-01')).toBe(true)
    expect(selectedCells.value.size).toBe(1)
    expect(getCurrentSelectedCollaborateur()).toBe('collabA')

    // Étape 2: Tentative de Cmd+clic sur collaborateur B - DOIT ÊTRE REFUSÉE
    console.log('=== ÉTAPE 2: Cmd+clic sur collabB (DOIT ÊTRE REFUSÉ) ===')
    expect(simulateCmd_Click('collabB', '2024-01-01')).toBe(false)
    
    // La sélection ne doit PAS avoir changé
    expect(selectedCells.value.has('collabA-2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collabB-2024-01-01')).toBe(false)
    expect(selectedCells.value.size).toBe(1)
    expect(getCurrentSelectedCollaborateur()).toBe('collabA')

    // Étape 3: Nouveau Cmd+clic sur collabA - doit marcher
    console.log('=== ÉTAPE 3: Nouveau Cmd+clic sur collabA ===')
    expect(simulateCmd_Click('collabA', '2024-01-02')).toBe(true)
    expect(selectedCells.value.has('collabA-2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collabA-2024-01-02')).toBe(true)
    expect(selectedCells.value.size).toBe(2)
    expect(getCurrentSelectedCollaborateur()).toBe('collabA')

    // Étape 4: Nouvelle tentative sur collabB - DOIT TOUJOURS ÊTRE REFUSÉE
    console.log('=== ÉTAPE 4: Nouveau Cmd+clic sur collabB (DOIT TOUJOURS ÊTRE REFUSÉ) ===')
    expect(simulateCmd_Click('collabB', '2024-01-02')).toBe(false)
    
    // La sélection ne doit toujours PAS avoir changé
    expect(selectedCells.value.has('collabA-2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collabA-2024-01-02')).toBe(true)
    expect(selectedCells.value.has('collabB-2024-01-02')).toBe(false)
    expect(selectedCells.value.size).toBe(2)
    expect(getCurrentSelectedCollaborateur()).toBe('collabA')

    console.log('✅ TEST VALIDÉ: Impossible de sélectionner sur plusieurs lignes')
  })

  it('devrait permettre de recommencer une nouvelle sélection après vidage', () => {
    // Sélection initiale
    simulateCmd_Click('collabA', '2024-01-01')
    simulateCmd_Click('collabA', '2024-01-02')
    expect(selectedCells.value.size).toBe(2)

    // Vider la sélection
    selectedCells.value.clear()
    expect(selectedCells.value.size).toBe(0)

    // Maintenant on peut sélectionner un autre collaborateur
    expect(simulateCmd_Click('collabB', '2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collabB-2024-01-01')).toBe(true)
    expect(getCurrentSelectedCollaborateur()).toBe('collabB')
  })
})
