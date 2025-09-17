import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

describe('Test de sélection ultra-stricte', () => {
  let selectedCells: any
  let isDraggingSelection: any
  let dragStartCell: any
  
  beforeEach(() => {
    selectedCells = ref(new Set())
    isDraggingSelection = ref(false)
    dragStartCell = ref(null)
  })

  // Fonctions de validation copiées du composant
  function getCurrentSelectedCollaborateur(): string | null {
    if (selectedCells.value.size === 0) return null
    const firstCellId = Array.from(selectedCells.value)[0] as string
    return firstCellId.split('-')[0]
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

  function canAddCellToSelection(collaborateurId: string): boolean {
    if (selectedCells.value.size === 0) return true
    const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
    return currentSelectedCollaborateur === collaborateurId
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

  // Simulation de la logique de clic avec Cmd (version ultra-stricte)
  function simulateCtrlClick(collaborateurId: string, date: string): boolean {
    const cellId = `${collaborateurId}-${date}`
    
    // VALIDATION ULTRA-STRICTE: Interdire toute sélection sur un autre collaborateur
    if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
      console.log('❌ INTERDIT: Tentative de sélection sur un autre collaborateur')
      console.log('🔒 Sélection actuelle:', getCurrentSelectedCollaborateur(), '| Tentative:', collaborateurId)
      console.log('⚠️ Impossible de sélectionner des cellules sur différentes lignes de collaborateurs')
      
      // AUCUN changement autorisé - refus complet
      return false
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
      console.log('❌ VALIDATION ÉCHOUÉE: Nettoyage de la sélection')
      cleanSelectionToSingleCollaborator()
    }

    selectedCells.value = new Set(selectedCells.value)
    return true
  }

  // Simulation du drag avec Cmd (version ultra-stricte)
  function simulateDragStart(collaborateurId: string, date: string): boolean {
    // VALIDATION ULTRA-STRICTE: Aucune sélection multi-collaborateur autorisée
    if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
      console.log('❌ DRAG IMPOSSIBLE: Tentative de drag sur un autre collaborateur bloquée')
      console.log('🔒 Sélection actuelle:', getCurrentSelectedCollaborateur(), '| Tentative:', collaborateurId)
      console.log('⚠️ Le drag ne peut pas traverser différentes lignes de collaborateurs')
      return false
    }
    
    isDraggingSelection.value = true
    dragStartCell.value = `${collaborateurId}-${date}`
    
    const cellId = `${collaborateurId}-${date}`
    if (selectedCells.value.has(cellId)) {
      selectedCells.value.delete(cellId)
    } else {
      selectedCells.value.add(cellId)
    }
    
    if (!validateSingleCollaboratorSelection()) {
      cleanSelectionToSingleCollaborator()
    }
    
    selectedCells.value = new Set(selectedCells.value)
    return true
  }

  function simulateDragEnter(collaborateurId: string, date: string): boolean {
    if (!isDraggingSelection.value) return false
    
    const cellId = `${collaborateurId}-${date}`
    
    // VALIDATION ULTRA-STRICTE: Bloquer immédiatement toute tentative de changement de collaborateur
    const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
    if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
      console.log('❌ DRAG ENTER INTERDIT: Changement de collaborateur détecté')
      console.log('🔒 Sélection actuelle:', currentSelectedCollaborateur, '| Tentative:', collaborateurId)
      console.log('🛑 ARRÊT IMMÉDIAT du drag - sélection inter-collaborateur interdite')
      
      // Arrêt immédiat du drag
      isDraggingSelection.value = false
      dragStartCell.value = null
      return false
    }
    
    // Ajouter à la sélection seulement si même collaborateur
    if (!selectedCells.value.has(cellId)) {
      selectedCells.value.add(cellId)
      
      if (!validateSingleCollaboratorSelection()) {
        cleanSelectionToSingleCollaborator()
      }
      
      selectedCells.value = new Set(selectedCells.value)
    }
    return true
  }

  it('devrait complètement bloquer Cmd+clic sur différents collaborateurs', () => {
    // Première sélection sur collab1
    expect(simulateCtrlClick('collab1', '2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collab1-2024-01-01')).toBe(true)
    expect(selectedCells.value.size).toBe(1)

    // Tentative de Cmd+clic sur collab2 - doit être BLOQUÉE
    expect(simulateCtrlClick('collab2', '2024-01-01')).toBe(false)
    
    // La sélection doit rester inchangée
    expect(selectedCells.value.has('collab1-2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collab2-2024-01-01')).toBe(false)
    expect(selectedCells.value.size).toBe(1)
    expect(getCurrentSelectedCollaborateur()).toBe('collab1')
  })

  it('devrait bloquer le drag entre différents collaborateurs', () => {
    // Sélection initiale sur collab1
    expect(simulateCtrlClick('collab1', '2024-01-01')).toBe(true)
    expect(selectedCells.value.size).toBe(1)

    // Tentative de drag start sur collab2 - doit être BLOQUÉE
    expect(simulateDragStart('collab2', '2024-01-02')).toBe(false)
    
    // Aucun drag ne doit être initié
    expect(isDraggingSelection.value).toBe(false)
    expect(dragStartCell.value).toBeNull()
    
    // La sélection doit rester sur collab1 uniquement
    expect(selectedCells.value.size).toBe(1)
    expect(getCurrentSelectedCollaborateur()).toBe('collab1')
  })

  it('devrait arrêter immédiatement le drag qui change de collaborateur', () => {
    // Démarrer un drag sur collab1
    expect(simulateDragStart('collab1', '2024-01-01')).toBe(true)
    expect(isDraggingSelection.value).toBe(true)
    expect(selectedCells.value.size).toBe(1)

    // Tenter de faire enter sur collab2 - doit arrêter le drag
    expect(simulateDragEnter('collab2', '2024-01-02')).toBe(false)
    
    // Le drag doit être arrêté
    expect(isDraggingSelection.value).toBe(false)
    expect(dragStartCell.value).toBeNull()
    
    // Seule la cellule initiale doit rester sélectionnée
    expect(selectedCells.value.size).toBe(1)
    expect(selectedCells.value.has('collab1-2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collab2-2024-01-02')).toBe(false)
  })

  it('devrait permettre le drag sur le même collaborateur', () => {
    // Démarrer un drag sur collab1
    expect(simulateDragStart('collab1', '2024-01-01')).toBe(true)
    expect(isDraggingSelection.value).toBe(true)

    // Étendre le drag sur le même collaborateur - doit fonctionner
    expect(simulateDragEnter('collab1', '2024-01-02')).toBe(true)
    expect(simulateDragEnter('collab1', '2024-01-03')).toBe(true)
    
    // Le drag doit continuer
    expect(isDraggingSelection.value).toBe(true)
    
    // Toutes les cellules du même collaborateur doivent être sélectionnées
    expect(selectedCells.value.size).toBe(3)
    expect(selectedCells.value.has('collab1-2024-01-01')).toBe(true)
    expect(selectedCells.value.has('collab1-2024-01-02')).toBe(true)
    expect(selectedCells.value.has('collab1-2024-01-03')).toBe(true)
    expect(validateSingleCollaboratorSelection()).toBe(true)
  })

  it('devrait maintenir la restriction même avec sélection multiple existante', () => {
    // Créer une sélection multiple sur collab1
    selectedCells.value.add('collab1-2024-01-01')
    selectedCells.value.add('collab1-2024-01-02')
    selectedCells.value.add('collab1-2024-01-03')
    expect(selectedCells.value.size).toBe(3)

    // Toute tentative sur un autre collaborateur doit être bloquée
    expect(simulateCtrlClick('collab2', '2024-01-04')).toBe(false)
    expect(simulateDragStart('collab3', '2024-01-05')).toBe(false)
    
    // La sélection doit rester intacte
    expect(selectedCells.value.size).toBe(3)
    expect(getCurrentSelectedCollaborateur()).toBe('collab1')
    expect(validateSingleCollaboratorSelection()).toBe(true)
  })
})
