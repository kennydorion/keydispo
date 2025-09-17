import { describe, it, expect } from 'vitest'
import { usePlanningFilters } from '../src/composables/usePlanningFilters'
import { usePlanningData } from '../src/composables/usePlanningData'

describe('Liaison collab↔dispo par nom normalisé et email', () => {
  it('relie par nom/prénom accent-insensible', () => {
    const pf = usePlanningFilters()
    const pd = usePlanningData()

    // Collaborateurs avec accents
    pd.collaborateurs.value = [
      { id: 'c1', nom: 'Dùpont', prenom: 'Élodie', email: 'elodie@ex.com', metier: 'AS' },
    ] as any

    // Dispos sans ID mais nom/prénom équivalents sans accents
    const dispos = [
      { collaborateurId: '', nom: 'Dupont', prenom: 'Elodie', email: '', date: '2025-06-26', lieu: 'ADV', type: 'standard' },
    ] as any

    // Pas de restreintes par dates/lieu/statut -> filteredDisponibilites passe par filterDisponibilites mais on vérifie surtout filteredCollaborateurs
    pf.updateFilters({ search: 'Elodie' })
    pd.disponibilites.value = dispos

    const collabs = pd.filteredCollaborateurs.value
    expect(collabs.length).toBeGreaterThan(0)
    expect(collabs[0].id).toBe('c1')
  })

  it('relie par email si id absent et noms divergents', () => {
    const pf = usePlanningFilters()
    const pd = usePlanningData()

  // Nettoyer toute recherche précédente
  pf.updateFilters({ search: '' })

    pd.collaborateurs.value = [
      { id: 'c2', nom: 'Martin', prenom: 'Bob', email: 'bob@company.fr', metier: 'EDUC' },
    ] as any

    pd.disponibilites.value = [
      { collaborateurId: '', nom: 'X', prenom: 'Y', email: 'bob@company.fr', date: '2025-06-26', lieu: 'ADV', type: 'standard' },
    ] as any

    const collabs = pd.filteredCollaborateurs.value
    expect(collabs.some(c => c.id === 'c2')).toBe(true)
  })
})
