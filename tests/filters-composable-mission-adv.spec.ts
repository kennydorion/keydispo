import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanningFilters } from '../src/composables/usePlanningFilters'

describe('usePlanningFilters - lieu ADV + mission + métiers réels', () => {
  let planningFilters: ReturnType<typeof usePlanningFilters>

  beforeEach(() => {
    planningFilters = usePlanningFilters()
    planningFilters.clearAllFilters()
  })

  const collaborateurs = [
    { id: 'c1', nom: 'DA COSTA LOBATO', prenom: 'Elbia', metier: 'AS', email: 'e@test.com', phone: '076.202.71.09', ville: 'Paris' },
    { id: 'c2', nom: 'OLIVEIRA', prenom: 'Inès', metier: 'AS', email: 'i@test.com', phone: '0668750348', ville: 'Lyon' },
    { id: 'c3', nom: 'MAUFROY', prenom: 'Marine', metier: 'EDUC', email: 'm@test.com', phone: '0603270766', ville: 'Marseille' },
  ]

  it('retourne les missions au lieu ADV pour métier AS le 2025-09-15', () => {
    // Test du scénario: métier AS + lieu ADV + statut mission + date 15 sept
    planningFilters.updateFilters({
      metier: 'AS',
      lieu: 'ADV',
      statut: 'En mission',
      dateFrom: '2025-09-15',
      dateTo: '2025-09-15',
    })

    const dispos = [
      // Mission ADV pour collaborateur AS (ce qui devrait matcher)
      {
        id: 'd1',
        collaborateurId: 'c1',
        date: '2025-09-15',
        lieu: 'ADV',
        heure_debut: '11:00',
        heure_fin: '21:00',
        type: 'standard', // -> lieu non vide donc mission
        timeKind: 'fixed',
        tenantId: 'keydispo',
        nom: 'DA COSTA LOBATO', prenom: 'Elbia', metier: 'AS'
      },
      // Mission ADV pour autre collaborateur AS (aussi matchant)
      {
        id: 'd2',
        collaborateurId: 'c2',
        date: '2025-09-15',
        lieu: 'ADV',
        heure_debut: '11:00',
        heure_fin: '21:00',
        type: 'standard',
        timeKind: 'fixed',
        tenantId: 'keydispo',
        nom: 'OLIVEIRA', prenom: 'Inès', metier: 'AS'
      },
      // Mission ADV mais métier différent (EDUC, pas AS)
      {
        id: 'd3',
        collaborateurId: 'c3',
        date: '2025-09-15',
        lieu: 'ADV',
        heure_debut: '14:00',
        heure_fin: '18:00',
        type: 'standard',
        timeKind: 'fixed',
        tenantId: 'keydispo',
        nom: 'MAUFROY', prenom: 'Marine', metier: 'EDUC'
      },
      // Mission autre lieu (non ADV)
      {
        id: 'd4',
        collaborateurId: 'c1',
        date: '2025-09-15',
        lieu: 'Client X',
        heure_debut: '09:00',
        heure_fin: '17:00',
        type: 'standard',
        timeKind: 'fixed',
        tenantId: 'keydispo',
        nom: 'DA COSTA LOBATO', prenom: 'Elbia', metier: 'AS'
      },
    ]

    const baseCollabs = planningFilters.filterCollaborateurs(collaborateurs)
    expect(baseCollabs.map(c => c.id)).toEqual(['c1', 'c2']) // Seulement les AS

    const filteredDispos = planningFilters.filterDisponibilites(dispos, baseCollabs)
    expect(filteredDispos.map(d => d.id)).toEqual(['d1', 'd2']) // Seulement lieu ADV pour AS
  })

  it('teste le cas réel: aucune mission ADV le 15 septembre 2025', () => {
    // Cas réel du dataset: aucune mission ADV le 15 septembre
    planningFilters.updateFilters({
      metier: 'AS', 
      lieu: 'ADV',
      statut: 'En mission',
      dateFrom: '2025-09-15',
      dateTo: '2025-09-15',
    })

    const dispos = [
      // Seule dispo réelle ce jour-là: indisponibilité Marine EDUC
      {
        id: 'd1',
        collaborateurId: 'c3',
        date: '2025-09-15',
        lieu: 'INDISPONIBLE',
        heure_debut: '',
        heure_fin: '',
        type: 'standard', // -> lieu INDISPONIBLE donc indisponible
        timeKind: 'full-day',
        tenantId: 'keydispo',
        nom: 'MAUFROY', prenom: 'Marine', metier: 'EDUC'
      },
    ]

    const baseCollabs = planningFilters.filterCollaborateurs(collaborateurs)
    expect(baseCollabs.map(c => c.id)).toEqual(['c1', 'c2']) // Métier AS

    const filteredDispos = planningFilters.filterDisponibilites(dispos, baseCollabs)
    expect(filteredDispos).toEqual([]) // Aucune mission ADV pour AS ce jour
  })

  it('fonctionne avec des missions ADV existantes (juin 2025)', () => {
    // Test avec des données réelles du CSV: juin 2025 a des missions ADV
    planningFilters.updateFilters({
      metier: 'AS',
      lieu: 'ADV', 
      statut: 'En mission',
      dateFrom: '2025-06-26',
      dateTo: '2025-06-26',
    })

    const dispos = [
      // Mission réelle du CSV: DA COSTA LOBATO;Elbia;AS;...;2025-06-26;ADV;16:00;21:00
      {
        id: 'd1',
        collaborateurId: 'c1',
        date: '2025-06-26',
        lieu: 'ADV',
        heure_debut: '16:00',
        heure_fin: '21:00',
        type: 'standard',
        timeKind: 'fixed',
        tenantId: 'keydispo',
        nom: 'DA COSTA LOBATO', prenom: 'Elbia', metier: 'AS'
      },
    ]

    const baseCollabs = planningFilters.filterCollaborateurs(collaborateurs)
    expect(baseCollabs.map(c => c.id)).toEqual(['c1', 'c2'])

    const filteredDispos = planningFilters.filterDisponibilites(dispos, baseCollabs)
    expect(filteredDispos.map(d => d.id)).toEqual(['d1'])
  })
})
