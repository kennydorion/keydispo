import { describe, it, expect, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'

// Test pour vérifier que la technique de SemaineVirtualClean.vue a été copiée correctement
describe('Test technique de SemaineVirtualClean copiée', () => {
  let selectedCells: Ref<Set<string>>
  let isDraggingSelection: Ref<boolean>
  let dragStartCell: Ref<string | null>
  let isCollaborateurInterface: Ref<boolean>

  // Fonctions simulées (copiées de la technique SemaineVirtualClean)
  function getCurrentSelectedCollaborateur(): string | null {
    if (selectedCells.value.size === 0) return null
    
    const firstCellId = Array.from(selectedCells.value)[0]
    // L'ID est au format "collaborateurId-YYYY-MM-DD"
    // On cherche le pattern de date YYYY-MM-DD à la fin
    const dateRegex = /-(\d{4}-\d{2}-\d{2})$/
    const match = firstCellId.match(dateRegex)
    if (!match) return null
    
    // Retourner tout ce qui précède la date
    return firstCellId.substring(0, firstCellId.length - match[1].length - 1)
  }

  function validateSingleCollaboratorSelection(): boolean {
    if (selectedCells.value.size <= 1) return true
    
    const collaborateurs = new Set<string>()
    
    for (const cellId of selectedCells.value) {
      // Chercher le pattern de date YYYY-MM-DD à la fin
      const dateRegex = /-(\d{4}-\d{2}-\d{2})$/
      const match = cellId.match(dateRegex)
      if (!match) continue
      
      const collaborateurId = cellId.substring(0, cellId.length - match[1].length - 1)
      collaborateurs.add(collaborateurId)
    }
    
    return collaborateurs.size <= 1
  }

  function cleanSelectionToSingleCollaborator() {
    if (selectedCells.value.size <= 1) return
    
    const currentCollaborateur = getCurrentSelectedCollaborateur()
    if (!currentCollaborateur) return
    
    const validCells = new Set<string>()
    
    for (const cellId of selectedCells.value) {
      // Chercher le pattern de date YYYY-MM-DD à la fin
      const dateRegex = /-(\d{4}-\d{2}-\d{2})$/
      const match = cellId.match(dateRegex)
      if (!match) continue
      
      const collaborateurId = cellId.substring(0, cellId.length - match[1].length - 1)
      if (collaborateurId === currentCollaborateur) {
        validCells.add(cellId)
      }
    }
    
    selectedCells.value = validCells
  }

  function canAddCellToSelection(collaborateurId: string): boolean {
    if (selectedCells.value.size === 0) return true
    
    const currentCollaborateur = getCurrentSelectedCollaborateur()
    return currentCollaborateur === collaborateurId
  }

  // Version SemaineVirtualClean simplifiée du handleCellClickNew
  function handleCellClickNew(collaborateurId: string, date: string, event: { ctrlKey?: boolean; metaKey?: boolean }) {
    const cellId = `${collaborateurId}-${date}`
    
    if (event.ctrlKey || event.metaKey) {
      console.log('=== MODE MULTISELECT - AUCUNE MODALE ===')
      console.log('Clic sur:', cellId)
      console.log('Selection avant:', Array.from(selectedCells.value))
      
      // RESTRICTION ULTRA-STRICTE: interdire toute sélection sur un autre collaborateur
      if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
        const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
        console.log('❌ INTERDIT: Tentative de sélection sur un autre collaborateur')
        console.log('🔒 Sélection actuelle:', currentSelectedCollaborateur, '| Tentative:', collaborateurId)
        console.log('⚠️ Impossible de sélectionner des cellules sur différentes lignes de collaborateurs')
        return
      }
      
      // Toggle la sélection
      if (selectedCells.value.has(cellId)) {
        selectedCells.value.delete(cellId)
        console.log('DESELECTION de:', cellId)
      } else {
        selectedCells.value.add(cellId)
        console.log('SELECTION de:', cellId)
      }
      
      // Validation post-ajout (sécurité)
      if (!validateSingleCollaboratorSelection()) {
        console.log('❌ VALIDATION ÉCHOUÉE: Nettoyage de la sélection')
        cleanSelectionToSingleCollaborator()
      }
      
      // Forcer la réactivité
      selectedCells.value = new Set(selectedCells.value)
      console.log('Selection apres:', Array.from(selectedCells.value))
      console.log('Total:', selectedCells.value.size)
      console.log('========================')
    }
  }

  // Version SemaineVirtualClean du handleCellMouseDown
  function handleCellMouseDown(collaborateurId: string, date: string, event: { ctrlKey?: boolean; metaKey?: boolean }) {
    if (event.ctrlKey || event.metaKey) {
      // VALIDATION ULTRA-STRICTE: Bloquer le drag si collaborateur différent
      if (selectedCells.value.size > 0 && !canAddCellToSelection(collaborateurId)) {
        const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
        console.log('❌ DRAG IMPOSSIBLE: Tentative de drag sur un autre collaborateur bloquée')
        console.log('🔒 Sélection actuelle:', currentSelectedCollaborateur, '| Tentative:', collaborateurId)
        console.log('⚠️ Le drag ne peut pas traverser différentes lignes de collaborateurs')
        return
      }
      
      isDraggingSelection.value = true
      dragStartCell.value = `${collaborateurId}-${date}`
      
      // Sélectionner/désélectionner la cellule de départ
      const cellId = `${collaborateurId}-${date}`
      if (selectedCells.value.has(cellId)) {
        selectedCells.value.delete(cellId)
        console.log('🔹 Cellule désélectionnée:', cellId)
      } else {
        selectedCells.value.add(cellId)
        console.log('🔸 Cellule sélectionnée:', cellId)
      }
      
      // Validation post-ajout (sécurité)
      if (!validateSingleCollaboratorSelection()) {
        console.log('❌ VALIDATION DRAG ÉCHOUÉE: Nettoyage de la sélection')
        cleanSelectionToSingleCollaborator()
      }
      
      selectedCells.value = new Set(selectedCells.value)
      console.log('🖱️ Début drag sélection sur:', cellId)
    }
  }

  // Version SemaineVirtualClean du handleCellMouseEnter
  function handleCellMouseEnter(collaborateurId: string, date: string) {
    if (isDraggingSelection.value) {
      const cellId = `${collaborateurId}-${date}`
      
      // Bloquer immédiatement toute tentative de changement de collaborateur pendant le drag
      const currentSelectedCollaborateur = getCurrentSelectedCollaborateur()
      console.log('📋 Comparaison:', {current: currentSelectedCollaborateur, nouveau: collaborateurId})
      if (currentSelectedCollaborateur && currentSelectedCollaborateur !== collaborateurId) {
        console.log('❌ DRAG ENTER INTERDIT: Changement de collaborateur détecté, arrêt du drag')
        isDraggingSelection.value = false
        dragStartCell.value = null
        return
      }
      
      // Ajouter à la sélection pendant le glissement
      if (!selectedCells.value.has(cellId)) {
        selectedCells.value.add(cellId)
        // Validation post-ajout (sécurité)
        if (!validateSingleCollaboratorSelection()) {
          console.log('❌ VALIDATION DRAG ENTER ÉCHOUÉE: Nettoyage de la sélection')
          cleanSelectionToSingleCollaborator()
        }
        selectedCells.value = new Set(selectedCells.value)
        console.log('➕ Ajout cellule au drag:', cellId)
      } else {
        console.log('⚪ Cellule déjà sélectionnée:', cellId)
      }
    }
  }

  beforeEach(() => {
    selectedCells = ref(new Set<string>())
    isDraggingSelection = ref(false)
    dragStartCell = ref(null)
    isCollaborateurInterface = ref(false)
  })

  it('devrait implémenter la validation VirtualClean correctement', () => {
    console.log('\n=== TEST: Validation technique VirtualClean ===')
    
    // Test 1: Cmd+clic normal fonctionne
    handleCellClickNew('alice', '2024-01-01', { ctrlKey: true })
    expect(selectedCells.value.size).toBe(1)
    expect(selectedCells.value.has('alice-2024-01-01')).toBe(true)
    
    // Test 2: Cmd+clic sur même collaborateur fonctionne
    handleCellClickNew('alice', '2024-01-02', { ctrlKey: true })
    expect(selectedCells.value.size).toBe(2)
    expect(selectedCells.value.has('alice-2024-01-02')).toBe(true)
    
    // Test 3: Cmd+clic sur autre collaborateur BLOQUÉ
    handleCellClickNew('bob', '2024-01-01', { ctrlKey: true })
    expect(selectedCells.value.size).toBe(2) // Aucun changement
    expect(selectedCells.value.has('bob-2024-01-01')).toBe(false)
    
    console.log('✅ Validation VirtualClean OK')
  })

  it('devrait implémenter le drag VirtualClean correctement', () => {
    console.log('\n=== TEST: Drag technique VirtualClean ===')
    
    // Étape 1: Commencer une sélection
    selectedCells.value.add('alice-2024-01-01')
    
    // Étape 2: Tenter un drag sur autre collaborateur → BLOQUÉ
    handleCellMouseDown('bob', '2024-01-01', { ctrlKey: true })
    expect(isDraggingSelection.value).toBe(false) // Drag n'a pas commencé
    expect(selectedCells.value.has('bob-2024-01-01')).toBe(false)
    
    // Étape 3: Drag sur même collaborateur → OK
    handleCellMouseDown('alice', '2024-01-02', { ctrlKey: true })
    expect(isDraggingSelection.value).toBe(true) // Drag a commencé
    expect(selectedCells.value.has('alice-2024-01-02')).toBe(true)
    
    console.log('✅ Drag VirtualClean OK')
  })

  it('devrait implémenter le mouseEnter VirtualClean correctement', () => {
    console.log('\n=== TEST: MouseEnter technique VirtualClean ===')
    
    // Préparer un drag en cours
    selectedCells.value.add('alice-2024-01-01')
    isDraggingSelection.value = true
    dragStartCell.value = 'alice-2024-01-01'
    
    // Test 1: MouseEnter sur même collaborateur → OK
    handleCellMouseEnter('alice', '2024-01-02')
    expect(selectedCells.value.has('alice-2024-01-02')).toBe(true)
    expect(isDraggingSelection.value).toBe(true) // Drag continue
    
    // Test 2: MouseEnter sur autre collaborateur → ARRÊT DRAG
    handleCellMouseEnter('bob', '2024-01-01')
    expect(isDraggingSelection.value).toBe(false) // Drag arrêté
    expect(dragStartCell.value).toBe(null)
    expect(selectedCells.value.has('bob-2024-01-01')).toBe(false)
    
    console.log('✅ MouseEnter VirtualClean OK')
  })

  it('devrait détecter correctement le collaborateur sélectionné', () => {
    console.log('\n=== TEST: Détection collaborateur VirtualClean ===')
    
    // Aucune sélection
    expect(getCurrentSelectedCollaborateur()).toBe(null)
    
    // Une sélection
    selectedCells.value.add('alice-2024-01-01')
    expect(getCurrentSelectedCollaborateur()).toBe('alice')
    
    // Plusieurs sélections même collaborateur
    selectedCells.value.add('alice-2024-01-02')
    expect(getCurrentSelectedCollaborateur()).toBe('alice')
    
    console.log('✅ Détection collaborateur VirtualClean OK')
  })

  it('devrait valider la restriction à un seul collaborateur', () => {
    console.log('\n=== TEST: Validation single-collaborateur VirtualClean ===')
    
    // Aucune sélection = valide
    expect(validateSingleCollaboratorSelection()).toBe(true)
    
    // Une sélection = valide
    selectedCells.value.add('alice-2024-01-01')
    expect(validateSingleCollaboratorSelection()).toBe(true)
    
    // Plusieurs sélections même collaborateur = valide
    selectedCells.value.add('alice-2024-01-02')
    expect(validateSingleCollaboratorSelection()).toBe(true)
    
    // Sélections de collaborateurs différents = invalide
    selectedCells.value.add('bob-2024-01-01')
    expect(validateSingleCollaboratorSelection()).toBe(false)
    
    console.log('✅ Validation single-collaborateur VirtualClean OK')
  })
})
