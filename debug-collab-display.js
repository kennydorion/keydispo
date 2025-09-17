#!/usr/bin/env node

/**
 * Script de debug pour analyser les différences d'affichage 
 * entre admin et collaborateur pour les noms de créneaux
 */

console.log('🔍 ANALYSE DEBUG - Différences affichage admin vs collaborateur')
console.log('================================================================')

// Simulations de données
const mockDispoAdmin = {
  date: '2024-01-15',
  lieu: 'DISPONIBLE',
  heure_debut: '',
  heure_fin: '',
  type: 'disponible',
  timeKind: 'slot',
  slots: ['midday']
}

const mockDispoCollaborateur = {
  id: 'dispo-123',
  date: '2024-01-15', 
  lieu: 'DISPONIBLE',
  heure_debut: '',
  heure_fin: '', 
  type: 'disponible',
  timeKind: 'slot',
  slots: ['midday'],
  isFullDay: false,
  version: 1
}

console.log('\n📋 DONNÉES DE TEST:')
console.log('Admin:', JSON.stringify(mockDispoAdmin, null, 2))
console.log('Collaborateur:', JSON.stringify(mockDispoCollaborateur, null, 2))

console.log('\n🔧 SIMULATION planningDisplayService.getTemporalDisplay():')

// Simulation de la fonction getTemporalDisplay
function simulateGetTemporalDisplay(dispo) {
  console.log('  Input:', { 
    timeKind: dispo.timeKind, 
    slots: dispo.slots, 
    isFullDay: dispo.isFullDay 
  })
  
  if (dispo.timeKind === 'slot' && dispo.slots && dispo.slots.length > 0) {
    const slotText = dispo.slots.map(slot => {
      // Simulation de slotLabel()
      const slotLabels = {
        'morning': 'Matin',
        'midday': 'Midi',
        'afternoon': 'Après-midi',
        'evening': 'Soir',
        'night': 'Nuit'
      }
      return slotLabels[slot] || slot
    }).join(', ')
    console.log('  -> Résultat:', slotText)
    return slotText
  } else if (dispo.timeKind === 'full-day' || dispo.isFullDay) {
    console.log('  -> Résultat: Journée')
    return 'Journée'
  } else if (dispo.heure_debut && dispo.heure_fin) {
    const result = `${dispo.heure_debut} - ${dispo.heure_fin}`
    console.log('  -> Résultat:', result)
    return result
  } else {
    console.log('  -> Résultat: Journée (fallback)')
    return 'Journée'
  }
}

console.log('\n✅ TEST ADMIN:')
simulateGetTemporalDisplay(mockDispoAdmin)

console.log('\n✅ TEST COLLABORATEUR:')
simulateGetTemporalDisplay(mockDispoCollaborateur)

console.log('\n🔍 PROBLÈMES POSSIBLES:')
console.log('1. Les données RTDB ne contiennent pas timeKind/slots')
console.log('2. Le mapping RTDB -> UI ne fonctionne pas correctement')
console.log('3. Les données importées n\'ont pas ces champs')
console.log('4. Différence dans les services utilisés (RTDB vs Firestore)')

console.log('\n🚀 SOLUTIONS À TESTER:')
console.log('1. Vérifier les données brutes RTDB avec les outils de debug')
console.log('2. Ajouter des logs dans mapRTDBToSelf()')
console.log('3. Forcer des valeurs de test pour timeKind et slots')
console.log('4. Comparer avec les données admin (Firestore)')

console.log('\n✅ Test terminé.')
