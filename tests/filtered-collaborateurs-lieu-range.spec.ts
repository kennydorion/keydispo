import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanningData } from '@/composables/usePlanningData'
import { usePlanningFilters } from '@/composables/usePlanningFilters'

describe('usePlanningData.filteredCollaborateurs - filtre Lieu + Dates (sans statut)', () => {
  let planningData: ReturnType<typeof usePlanningData>
  let planningFilters: ReturnType<typeof usePlanningFilters>

  beforeEach(() => {
    planningData = usePlanningData()
    planningFilters = usePlanningFilters()
    planningFilters.clearAllFilters()
  })

  it('restreint la liste quand Lieu est défini avec une plage de dates', () => {
    // Données de base
    const collaborateurs = [
      { id: 'c1', nom: 'Dupont', prenom: 'Alice', metier: 'AS', email: 'a@t.com', phone: '', ville: '' },
      { id: 'c2', nom: 'Martin', prenom: 'Bob', metier: 'AS', email: 'b@t.com', phone: '', ville: '' },
      { id: 'c3', nom: 'Durand', prenom: 'Chloé', metier: 'EDUC', email: 'c@t.com', phone: '', ville: '' },
    ]
    const disponibilites = [
      { id: 'd1', collaborateurId: 'c1', tenantId: 'keydispo', date: '2025-06-26', lieu: 'ADV', heure_debut: '09:00', heure_fin: '17:00', type: 'standard', timeKind: 'fixed', nom: 'Dupont', prenom: 'Alice', metier: 'AS' },
      { id: 'd2', collaborateurId: 'c2', tenantId: 'keydispo', date: '2025-06-26', lieu: 'Autre', heure_debut: '09:00', heure_fin: '17:00', type: 'standard', timeKind: 'fixed', nom: 'Martin', prenom: 'Bob', metier: 'AS' },
    ]

    // Injecter les données dans le composable (en accédant aux refs internes via cast)
    ;(planningData as any).collaborateurs.value = collaborateurs
    ;(planningData as any).disponibilites.value = disponibilites

    // Activer filtre Dates + Lieu (sans statut)
    planningFilters.updateFilters({ dateFrom: '2025-06-26', dateTo: '2025-06-26', lieu: 'ADV' })

    const baseCount = (planningData as any).filteredDisponibilites.value.length
    expect(baseCount).toBe(1)

    const collabs = (planningData as any).filteredCollaborateurs.value
    expect(collabs.map((c: any) => c.id)).toEqual(['c1'])
  })

  it('ne restreint pas pendant le chargement', () => {
    const collaborateurs = [
      { id: 'c1', nom: 'Dupont', prenom: 'Alice', metier: 'AS', email: 'a@t.com', phone: '', ville: '' },
      { id: 'c2', nom: 'Martin', prenom: 'Bob', metier: 'AS', email: 'b@t.com', phone: '', ville: '' },
    ]
    const disponibilites = [
      { id: 'd1', collaborateurId: 'c1', tenantId: 'keydispo', date: '2025-06-26', lieu: 'ADV', heure_debut: '09:00', heure_fin: '17:00', type: 'standard', timeKind: 'fixed', nom: 'Dupont', prenom: 'Alice', metier: 'AS' },
    ]

    ;(planningData as any).collaborateurs.value = collaborateurs
    ;(planningData as any).disponibilites.value = disponibilites

    planningFilters.updateFilters({ dateFrom: '2025-06-26', dateTo: '2025-06-26', lieu: 'ADV' })

    // Simuler état de chargement
    ;(planningData as any).loadingDisponibilites.value = true
    const collabsWhileLoading = (planningData as any).filteredCollaborateurs.value
    expect(collabsWhileLoading.map((c: any) => c.id)).toEqual(['c1', 'c2'])

    // Fin de chargement -> restriction appliquée
    ;(planningData as any).loadingDisponibilites.value = false
    const collabsAfter = (planningData as any).filteredCollaborateurs.value
    expect(collabsAfter.map((c: any) => c.id)).toEqual(['c1'])
  })
})
