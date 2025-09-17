import { describe, it, expect } from 'vitest'
import { usePlanningFilters } from '../src/composables/usePlanningFilters'

describe('usePlanningFilters - clear/reset behavior', () => {
  it('clearAllFilters resets all fields and hasActiveFilters becomes false', () => {
    const pf = usePlanningFilters()

    // Activer plusieurs filtres
    pf.updateFilters({
      search: 'alice',
      metier: 'AS',
      lieu: 'ADV',
      statut: 'mission',
      dateFrom: '2025-06-01',
      dateTo: '2025-06-07',
    })

    expect(pf.hasActiveFilters.value).toBe(true)

    // Réinitialiser
    pf.clearAllFilters()

    expect(pf.filterState.search).toBe('')
    expect(pf.filterState.metier).toBe('')
    expect(pf.filterState.lieu).toBe('')
    expect(pf.filterState.statut).toBe('')
    expect(pf.filterState.dateFrom).toBe('')
    expect(pf.filterState.dateTo).toBe('')
    expect(pf.hasActiveFilters.value).toBe(false)
  })

  it('clearing both dates also clears lieu and statut as designed', () => {
    const pf = usePlanningFilters()

    // Configurer une plage avec lieu/statut
    pf.updateFilters({
      dateFrom: '2025-06-10',
      dateTo: '2025-06-12',
      lieu: 'Client X',
      statut: 'mission',
    })

    expect(pf.filterState.lieu).toBe('Client X')
    expect(pf.filterState.statut).toBe('mission')

    // Effacer dateFrom -> encore dateTo présent, ne doit pas nettoyer tout de suite
    pf.updateFilter('dateFrom', '')
    expect(pf.filterState.dateFrom).toBe('')
    expect(pf.filterState.dateTo).toBe('2025-06-12')
    expect(pf.filterState.lieu).toBe('Client X')
    expect(pf.filterState.statut).toBe('mission')

    // Effacer maintenant dateTo -> plus aucune borne -> doit vider lieu/statut
    pf.updateFilter('dateTo', '')
    expect(pf.filterState.dateTo).toBe('')
    expect(pf.filterState.lieu).toBe('')
    expect(pf.filterState.statut).toBe('')
    expect(pf.hasActiveFilters.value).toBe(false)
  })
})
