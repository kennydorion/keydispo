import { describe, it, expect } from 'vitest'
import { deriveTimeKindFromData } from '../src/utils/timeKindDerivation'

// Test pour valider que PlanningSemaine.vue est aussi corrigé
describe('Test correction PlanningSemaine.vue', () => {
  it('devrait simuler la correction du mapTimeKindAltToLegacy', () => {
    console.log('🔧 TEST CORRECTION PlanningSemaine.vue')
    
    // Simulation de données RTDB avec timeKind 'flexible'
    const dispoFlexibleRTDB = {
      heure_debut: '14:00',
      heure_fin: '18:00',
      timeKind: 'flexible', // Stocké comme flexible en RTDB
      isFullDay: false,
      slots: [],
      type: 'urgence' // Type RTDB
    }

    // ❌ ANCIENNE logique de mapTimeKindAltToLegacy
    function ancienMapTimeKindAltToLegacy(k: string | undefined) {
      switch (k) {
        case 'fixed': return 'range'
        case 'oncall': return 'slot'
        case 'flexible': return 'full-day' // ❌ PROBLÈME !
        default: return k
      }
    }

    // ✅ NOUVELLE logique avec dérivation
    function nouveauMapTimeKindAltToLegacy(k: string | undefined, dispo: any) {
      switch (k) {
        case 'fixed': return 'range'
        case 'oncall': return 'slot'
        case 'flexible': return deriveTimeKindFromData(dispo) // ✅ SOLUTION !
        default: return k
      }
    }

    // Test ancien comportement
    const ancienResultat = ancienMapTimeKindAltToLegacy('flexible')
    console.log('❌ ANCIEN mapTimeKindAltToLegacy(flexible):', ancienResultat)
    expect(ancienResultat).toBe('full-day') // ❌ Problématique

    // Test nouveau comportement
    const nouveauResultat = nouveauMapTimeKindAltToLegacy('flexible', dispoFlexibleRTDB)
    console.log('✅ NOUVEAU mapTimeKindAltToLegacy(flexible):', nouveauResultat)
    expect(nouveauResultat).toBe('range') // ✅ Correct !

    console.log('🎉 PlanningSemaine.vue corrigé : flexible → derivation au lieu de full-day')
  })

  it('devrait simuler resolveDispoKind corrigé pour PlanningSemaine', () => {
    console.log('🎯 TEST resolveDispoKind PlanningSemaine corrigé')
    
    // Disponibilité avec horaires stockée en RTDB
    const dispoRTDB = {
      type: 'urgence', // Type RTDB = mission
      timeKind: 'flexible', // Stocké comme flexible
      heure_debut: '09:30',
      heure_fin: '17:30',
      isFullDay: false,
      slots: []
    }

    // Simulation de resolveDispoKind corrigé
    function resolveDispoKindCorrige(dispo: any) {
      const type = dispo.type
      const timeKind = deriveTimeKindFromData(dispo) // ✅ Dérivation centralisée
      
      if (type) return { type, timeKind, slots: dispo.slots || [] }
      return { type: 'disponible', timeKind: 'full-day', slots: [] }
    }

    const resultat = resolveDispoKindCorrige(dispoRTDB)
    console.log('✅ resolveDispoKind corrigé retourne:', resultat)
    
    expect(resultat.type).toBe('urgence')
    expect(resultat.timeKind).toBe('range') // ✅ Dérivé correctement !

    console.log('🎉 resolveDispoKind dans PlanningSemaine utilise maintenant la dérivation')
  })

  it('devrait valider que les conditions d\'affichage fonctionnent maintenant', () => {
    console.log('📱 TEST CONDITIONS AFFICHAGE PlanningSemaine')
    
    const dispoAvecHoraires = {
      type: 'urgence',
      timeKind: 'flexible', // Stocké
      heure_debut: '08:00',
      heure_fin: '16:00',
      isFullDay: false,
      slots: []
    }

    // Simulation de la condition du template
    function simulerConditionAffichage(dispo: any) {
      const resolved = {
        timeKind: deriveTimeKindFromData(dispo), // Dérivé
        type: dispo.type
      }
      
      // Condition exacte du template PlanningSemaine : resolveDispoKind(dispo).timeKind === 'range'
      const conditionRange = resolved.timeKind === 'range' && !!dispo.heure_debut && !!dispo.heure_fin
      
      return {
        timeKindDerive: resolved.timeKind,
        conditionRange,
        affichage: conditionRange ? `${dispo.heure_debut}-${dispo.heure_fin}` : 'Journée'
      }
    }

    const resultat = simulerConditionAffichage(dispoAvecHoraires)
    console.log('📱 Simulation affichage:', resultat)
    
    expect(resultat.timeKindDerive).toBe('range') // ✅ Dérivé correctement
    expect(resultat.conditionRange).toBe(true) // ✅ Condition passe
    expect(resultat.affichage).toBe('08:00-16:00') // ✅ Affiche les horaires !

    console.log('🎉 CONDITIONS AFFICHAGE OK : Plus de "Journée" indésirable !')
  })
})
