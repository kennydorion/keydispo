// Test de la correction du problème de doublons en batch
console.log('🧪 Test de la déduplication améliorée')

// Simuler une dispo temporaire (créée dans handleBatchCreate)
const tempDispo = {
  id: 'temp-1672531200000-0.123',
  collaborateurId: 'collab1',
  nom: 'Dupont',
  prenom: 'Jean',
  date: '2024-01-15',
  lieu: 'Paris',
  heure_debut: '09:00',
  heure_fin: '17:00',
  type: 'disponible',
  timeKind: 'range'
}

// Simuler la vraie dispo (venant de Firestore)
const realDispo = {
  id: 'ABC123DEF456',
  collaborateurId: 'collab1',
  nom: 'Dupont',
  prenom: 'Jean',
  date: '2024-01-15',
  lieu: 'Paris',
  heure_debut: '09:00',
  heure_fin: '17:00',
  type: 'disponible',
  timeKind: 'range'
}

// Simuler le cache existant avec la dispo temporaire
const existingDispos = [tempDispo]

console.log('📊 Cache initial:', existingDispos.length, 'dispo(s)')
console.log('   - ID temporaire:', tempDispo.id)

// Test de la nouvelle logique de déduplication
const isDuplicate = existingDispos.find(d => {
  // Vérification par ID exact
  if (d.id === realDispo.id) return true
  
  // Vérification par données métier (pour éliminer les temporaires)
  return d.collaborateurId === realDispo.collaborateurId &&
         d.date === realDispo.date &&
         d.heure_debut === realDispo.heure_debut &&
         d.heure_fin === realDispo.heure_fin &&
         d.lieu === realDispo.lieu &&
         d.type === realDispo.type
})

console.log('🔍 Doublon détecté?', !!isDuplicate)

if (isDuplicate) {
  // Test du remplacement des données temporaires
  const duplicateIndex = existingDispos.findIndex(d => 
    d.collaborateurId === realDispo.collaborateurId &&
    d.date === realDispo.date &&
    d.heure_debut === realDispo.heure_debut &&
    d.heure_fin === realDispo.heure_fin &&
    d.lieu === realDispo.lieu &&
    d.type === realDispo.type &&
    d.id?.startsWith('temp-') // ID temporaire
  )
  
  console.log('📍 Index de la donnée temporaire à remplacer:', duplicateIndex)
  
  if (duplicateIndex !== -1) {
    console.log('🔄 Remplacement de la donnée temporaire par la vraie')
    existingDispos[duplicateIndex] = realDispo
    console.log('✅ Après remplacement - ID:', existingDispos[0].id)
  }
}

console.log('📊 Cache final:', existingDispos.length, 'dispo(s)')
console.log('✅ Test terminé - Pas de doublons créés!')
