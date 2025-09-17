import { describe, it, expect, beforeEach } from 'vitest'
import { deriveTimeKindFromData } from '../src/utils/timeKindDerivation'

// Test pour reproduire exactement le scénario utilisateur
describe('Test scénario utilisateur - horaires personnalisées affichent "Journée"', () => {
  it('devrait simuler le problème exact rapporté par l\'utilisateur', () => {
    console.log('🎯 SIMULATION DU PROBLÈME UTILISATEUR')
    
    // Simulation 1: Données comme stockées en RTDB (après sauvegarde)
    const dispoStockeeEnRTDB = {
      heure_debut: '09:00',
      heure_fin: '17:00',
      timeKind: 'flexible', // Stocké comme flexible en RTDB
      isFullDay: false,
      slots: [],
      type: 'mission'
    }

    // Simulation 2: Ce que l'ancienne resolveDispoKind retournait
    function ancienneResolveDispoKind(dispo: any) {
      const timeKind = dispo.timeKind // ❌ PROBLÈME: utilise directement dispo.timeKind
      return {
        type: dispo.type,
        timeKind: timeKind || 'full-day',
        slots: dispo.slots || []
      }
    }

    // Simulation 3: Ce que la nouvelle resolveDispoKind retourne
    function nouvelleResolveDispoKind(dispo: any) {
      const timeKind = deriveTimeKindFromData(dispo) // ✅ SOLUTION: utilise la dérivation
      return {
        type: dispo.type,
        timeKind,
        slots: dispo.slots || []
      }
    }

    // Simulation 4: Condition du template d'affichage
    function simulerConditionTemplate(dispo: any, resolveDispoKindFunc: Function) {
      const resolved = resolveDispoKindFunc(dispo)
      const conditionOK = (resolved.timeKind === 'range' || resolved.timeKind === 'overnight') && 
                          !!dispo.heure_debut && !!dispo.heure_fin
      
      return {
        resolved,
        afficherHoraires: conditionOK,
        affichage: conditionOK ? `${dispo.heure_debut}-${dispo.heure_fin}` : 'Journée'
      }
    }

    // ❌ PROBLÈME: Ancien comportement
    const ancienResultat = simulerConditionTemplate(dispoStockeeEnRTDB, ancienneResolveDispoKind)
    console.log('❌ ANCIEN:', {
      timeKind: ancienResultat.resolved.timeKind,
      afficherHoraires: ancienResultat.afficherHoraires,
      affichage: ancienResultat.affichage
    })
    
    expect(ancienResultat.resolved.timeKind).toBe('flexible')
    expect(ancienResultat.afficherHoraires).toBe(false) // ❌ Condition échoue car 'flexible' ≠ 'range'|'overnight'
    expect(ancienResultat.affichage).toBe('Journée') // ❌ Affiche "Journée"

    // ✅ SOLUTION: Nouveau comportement
    const nouveauResultat = simulerConditionTemplate(dispoStockeeEnRTDB, nouvelleResolveDispoKind)
    console.log('✅ NOUVEAU:', {
      timeKind: nouveauResultat.resolved.timeKind,
      afficherHoraires: nouveauResultat.afficherHoraires,
      affichage: nouveauResultat.affichage
    })
    
    expect(nouveauResultat.resolved.timeKind).toBe('range') // ✅ Dérivé correctement
    expect(nouveauResultat.afficherHoraires).toBe(true) // ✅ Condition passe car 'range' match
    expect(nouveauResultat.affichage).toBe('09:00-17:00') // ✅ Affiche les horaires !

    console.log('🎉 PROBLÈME RÉSOLU: Les horaires s\'affichent maintenant au lieu de "Journée"')
  })

  it('devrait aussi corriger le cas overnight', () => {
    console.log('🌙 TEST OVERNIGHT')
    
    const dispoOvernightStockee = {
      heure_debut: '22:00',
      heure_fin: '06:00',
      timeKind: 'flexible', // Stocké comme flexible en RTDB
      isFullDay: false,
      slots: [],
      type: 'mission'
    }

    function nouvelleResolveDispoKind(dispo: any) {
      return {
        type: dispo.type,
        timeKind: deriveTimeKindFromData(dispo),
        slots: dispo.slots || []
      }
    }

    function simulerConditionTemplate(dispo: any, resolveDispoKindFunc: Function) {
      const resolved = resolveDispoKindFunc(dispo)
      const conditionOK = (resolved.timeKind === 'range' || resolved.timeKind === 'overnight') && 
                          dispo.heure_debut && dispo.heure_fin
      return {
        resolved,
        affichage: conditionOK ? `${dispo.heure_debut}-${dispo.heure_fin}` : 'Journée'
      }
    }

    const resultat = simulerConditionTemplate(dispoOvernightStockee, nouvelleResolveDispoKind)
    console.log('🌙 OVERNIGHT:', {
      timeKind: resultat.resolved.timeKind,
      affichage: resultat.affichage
    })
    
    expect(resultat.resolved.timeKind).toBe('overnight') // ✅ Dérivé comme overnight
    expect(resultat.affichage).toBe('22:00-06:00') // ✅ Affiche les horaires overnight

    console.log('🎉 OVERNIGHT AUSSI RÉSOLU')
  })
})
