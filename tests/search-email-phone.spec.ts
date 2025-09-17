import { describe, it, expect } from 'vitest'
import { usePlanningFilters } from '../src/composables/usePlanningFilters'

describe('usePlanningFilters - recherche email/téléphone', () => {
  it('filtre les collaborateurs par email (fragment, insensible à la casse)', () => {
    const pf = usePlanningFilters()
    const collaborateurs = [
      { id: 'c1', nom: 'Dupont', prenom: 'Alice', email: 'alice@example.com', phone: '06 11 22 33 44', metier: 'AS' },
      { id: 'c2', nom: 'Martin', prenom: 'Bob', email: 'bob@company.fr', phone: '+33 7 55 66 77 88', metier: 'EDUC' },
    ]

    // Saisie d'un fragment d'email
    pf.updateFilters({ search: 'example' })
    const res1 = pf.filterCollaborateurs(collaborateurs)
    expect(res1.map(c => c.id)).toEqual(['c1'])

    pf.updateFilters({ search: 'BOB@COMP' })
    const res2 = pf.filterCollaborateurs(collaborateurs)
    expect(res2.map(c => c.id)).toEqual(['c2'])
  })

  it('filtre les collaborateurs par téléphone (match digits, seuil >= 3)', () => {
    const pf = usePlanningFilters()
    const collaborateurs = [
      { id: 'c1', nom: 'Dupont', prenom: 'Alice', email: 'alice@example.com', phone: '06 11 22 33 44', metier: 'AS' },
      { id: 'c2', nom: 'Martin', prenom: 'Bob', email: 'bob@company.fr', phone: '+33 7 55 66 77 88', metier: 'EDUC' },
    ]

    // Seuil 2 -> ne doit pas matcher
    pf.updateFilters({ search: '11' })
    const res0 = pf.filterCollaborateurs(collaborateurs)
    expect(res0.length).toBe(2) // pas de filtre appliqué (seulement digits < 3)

    // Seuil 3 -> doit matcher c1
    pf.updateFilters({ search: '122' })
    const res1 = pf.filterCollaborateurs(collaborateurs)
    expect(res1.map(c => c.id)).toEqual(['c1'])

    // Autre fragment qui cible c2
    pf.updateFilters({ search: '566' })
    const res2 = pf.filterCollaborateurs(collaborateurs)
    expect(res2.map(c => c.id)).toEqual(['c2'])
  })

  it('propose des suggestions Collaborateur, Email et Téléphone', () => {
    const pf = usePlanningFilters()
    // Prépare l’index collaborateur via updateCollaborateursIndex
    const collaborateurs = [
      { id: 'c1', nom: 'Dupont', prenom: 'Alice', email: 'alice@example.com', phone: '06 11 22 33 44' },
      { id: 'c2', nom: 'Martin', prenom: 'Bob', email: 'bob@company.fr', phone: '+33 7 55 66 77 88' },
    ]
    pf.updateCollaborateursIndex(collaborateurs as any)

    // 1) Collaborateur par nom
    pf.updateFilters({ search: 'Ali' })
    const s1 = pf.searchSuggestions.value
    expect(s1.some(s => s.type === 'Collaborateur' && /Alice Dupont/.test(s.text))).toBe(true)

    // 2) Email fragment
    pf.updateFilters({ search: 'company' })
    const s2 = pf.searchSuggestions.value
    expect(s2.some(s => s.type === 'Email' && /bob@company\.fr/.test(s.text))).toBe(true)

    // 3) Téléphone par digits (seuil >= 3)
    pf.updateFilters({ search: '122' })
    const s3 = pf.searchSuggestions.value
    expect(s3.some(s => s.type === 'Téléphone' && /06 11 22 33 44/.test(s.text))).toBe(true)
  })
})
