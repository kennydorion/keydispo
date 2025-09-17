import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

describe('Validation de sélection multi-collaborateur', () => {
  let selectedCells: any
  
  beforeEach(() => {
    selectedCells = ref(new Set())
  })

  // Fonctions de validation copiées du composant (simplifiées pour le test)
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

  it('devrait permettre la sélection d\'une seule cellule', () => {
    selectedCells.value.add('collab1-2024-01-01')
    
    expect(validateSingleCollaboratorSelection()).toBe(true)
    expect(getCurrentSelectedCollaborateur()).toBe('collab1')
    expect(canAddCellToSelection('collab1')).toBe(true)
    expect(canAddCellToSelection('collab2')).toBe(false)
  })

  it('devrait permettre plusieurs cellules du même collaborateur', () => {
    selectedCells.value.add('collab1-2024-01-01')
    selectedCells.value.add('collab1-2024-01-02')
    selectedCells.value.add('collab1-2024-01-03')
    
    expect(validateSingleCollaboratorSelection()).toBe(true)
    expect(getCurrentSelectedCollaborateur()).toBe('collab1')
    expect(canAddCellToSelection('collab1')).toBe(true)
    expect(canAddCellToSelection('collab2')).toBe(false)
  })

  it('devrait détecter les sélections multi-collaborateur comme invalides', () => {
    selectedCells.value.add('collab1-2024-01-01')
    selectedCells.value.add('collab2-2024-01-01')
    
    expect(validateSingleCollaboratorSelection()).toBe(false)
    expect(canAddCellToSelection('collab1')).toBe(true) // Car collab1 est le premier
    expect(canAddCellToSelection('collab3')).toBe(false)
  })

  it('devrait nettoyer les sélections multi-collaborateur', () => {
    selectedCells.value.add('collab1-2024-01-01')
    selectedCells.value.add('collab1-2024-01-02')
    selectedCells.value.add('collab2-2024-01-01')
    selectedCells.value.add('collab2-2024-01-02')
    
    expect(validateSingleCollaboratorSelection()).toBe(false)
    expect(selectedCells.value.size).toBe(4)
    
    cleanSelectionToSingleCollaborator()
    
    expect(validateSingleCollaboratorSelection()).toBe(true)
    expect(selectedCells.value.size).toBe(2)
    expect(getCurrentSelectedCollaborateur()).toBe('collab1')
    
    // Toutes les cellules restantes doivent être du même collaborateur
    for (const cellId of selectedCells.value) {
      expect((cellId as string).startsWith('collab1-')).toBe(true)
    }
  })

  it('devrait gérer les sélections vides', () => {
    expect(validateSingleCollaboratorSelection()).toBe(true)
    expect(getCurrentSelectedCollaborateur()).toBeNull()
    expect(canAddCellToSelection('collab1')).toBe(true)
    expect(canAddCellToSelection('collab2')).toBe(true)
  })

  it('devrait maintenir la cohérence après ajout de cellules', () => {
    // Première sélection
    selectedCells.value.add('collab1-2024-01-01')
    expect(canAddCellToSelection('collab1')).toBe(true)
    expect(canAddCellToSelection('collab2')).toBe(false)
    
    // Ajout d'une cellule du même collaborateur
    selectedCells.value.add('collab1-2024-01-02')
    expect(validateSingleCollaboratorSelection()).toBe(true)
    expect(canAddCellToSelection('collab1')).toBe(true)
    expect(canAddCellToSelection('collab2')).toBe(false)
    
    // Tentative d'ajout d'un autre collaborateur (simulation d'erreur)
    selectedCells.value.add('collab2-2024-01-01')
    expect(validateSingleCollaboratorSelection()).toBe(false)
    
    // Nettoyage
    cleanSelectionToSingleCollaborator()
    expect(validateSingleCollaboratorSelection()).toBe(true)
    expect(getCurrentSelectedCollaborateur()).toBe('collab1')
  })
})
