import { describe, it, expect } from 'vitest'
import { deriveTimeKindFromData } from '../src/utils/timeKindDerivation'

// Test pour vérifier que la correction du problème "Journée" fonctionne
describe('Test résolution problème affichage "Journée"', () => {
  it('devrait dériver correctement les horaires personnalisées depuis des données stockées comme flexible', () => {
    // Mock d'une dispo avec horaires personnalisées stockée comme 'flexible' (nouvelle logique)
    const dispoAvecHorairesPersonnalises = {
      heure_debut: '09:00',
      heure_fin: '17:00',
      timeKind: 'flexible', // Stocké comme flexible
      isFullDay: false,
      slots: []
    }

    // ✅ La dérivation doit retourner 'range' pour 09:00-17:00
    const derived1 = deriveTimeKindFromData(dispoAvecHorairesPersonnalises)
    console.log('✅ Dispo avec horaires 09:00-17:00 dérivée comme:', derived1)
    expect(derived1).toBe('range')

    // Mock d'une dispo overnight stockée comme 'flexible' (nouvelle logique)
    const dispoOvernightPersonnalisee = {
      heure_debut: '22:00',
      heure_fin: '06:00',
      timeKind: 'flexible', // Stocké comme flexible
      isFullDay: false,
      slots: []
    }

    // ✅ La dérivation doit retourner 'overnight' pour 22:00-06:00
    const derived2 = deriveTimeKindFromData(dispoOvernightPersonnalisee)
    console.log('✅ Dispo overnight 22:00-06:00 dérivée comme:', derived2)
    expect(derived2).toBe('overnight')

    console.log('✅ deriveTimeKindFromData fonctionne correctement')
    console.log('✅ Les horaires personnalisées ne devraient plus afficher "Journée"')
  })

  it('devrait correctement gérer les cas edge dans la dérivation', () => {
    // Test avec slots prioritaires
    const dispoAvecSlots = {
      heure_debut: '14:00',
      heure_fin: '18:00',
      timeKind: 'flexible',
      isFullDay: false,
      slots: ['M', 'AM'] // Slots prioritaires
    }

    const derivedSlots = deriveTimeKindFromData(dispoAvecSlots)
    console.log('✅ Dispo avec slots dérivée comme:', derivedSlots)
    expect(derivedSlots).toBe('slot') // Slots ont priorité

    // Test avec isFullDay prioritaire
    const dispoFullDay = {
      heure_debut: '09:00',
      heure_fin: '17:00',
      timeKind: 'flexible',
      isFullDay: true, // Full-day a priorité sur les heures
      slots: []
    }

    const derivedFullDay = deriveTimeKindFromData(dispoFullDay)
    console.log('✅ Dispo full-day dérivée comme:', derivedFullDay)
    expect(derivedFullDay).toBe('full-day')

    console.log('✅ Toutes les priorités de dérivation fonctionnent correctement')
  })

  it('devrait simuler le problème résolu dans resolveDispoKind', () => {
    // Simulation de ce que faisait l'ancienne resolveDispoKind
    function oldResolveDispoKind(dispo: any) {
      // ❌ ANCIEN: utilisation directe de dispo.timeKind
      return {
        type: dispo.type,
        timeKind: dispo.timeKind || 'full-day',
        slots: dispo.slots || []
      }
    }

    // Simulation de ce que fait la nouvelle resolveDispoKind
    function newResolveDispoKind(dispo: any) {
      // ✅ NOUVEAU: utilisation de la dérivation centralisée
      return {
        type: dispo.type,
        timeKind: deriveTimeKindFromData(dispo),
        slots: dispo.slots || []
      }
    }

    const dispoProblematique = {
      type: 'mission',
      heure_debut: '14:00',
      heure_fin: '18:00',
      timeKind: 'flexible', // Stocké comme flexible
      isFullDay: false,
      slots: []
    }

    // ❌ Ancien comportement : retourne 'flexible'
    const oldResult = oldResolveDispoKind(dispoProblematique)
    console.log('❌ Ancien resolveDispoKind retournait:', oldResult.timeKind)
    expect(oldResult.timeKind).toBe('flexible')

    // ✅ Nouveau comportement : retourne 'range' (correct)
    const newResult = newResolveDispoKind(dispoProblematique)
    console.log('✅ Nouveau resolveDispoKind retourne:', newResult.timeKind)
    expect(newResult.timeKind).toBe('range')

    console.log('✅ Fix résolu : resolveDispoKind utilise maintenant deriveTimeKindFromData')
    console.log('✅ Template affichera les horaires au lieu de "Journée"')
  })
})
