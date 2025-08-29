/**
 * Script simple pour ajouter une disponibilité de test en RTDB
 */

console.log('Ajout disponibilité test RTDB...')

// Simulation d'une disponibilité simple
const testDispo = {
  id: 'test-dispo-' + Date.now(),
  tenantId: 'keydispo',
  collaborateurId: 'test-collab-1',
  date: '2025-08-29',
  nom: 'Dupont',
  prenom: 'Jean',
  metier: 'Technicien',
  phone: '0123456789',
  email: 'jean@test.com',
  ville: 'Paris',
  lieu: 'Bureau',
  heure_debut: '09:00',
  heure_fin: '17:00',
  type: 'standard',
  timeKind: 'flexible',
  isFullDay: false,
  version: 1,
  updatedAt: Date.now(),
  updatedBy: 'test-script'
}

console.log('Disponibilité de test créée:', testDispo)
console.log('')
console.log('INSTRUCTIONS:')
console.log('1. Redémarrez votre application si nécessaire')
console.log('2. Vérifiez que l\'ID collaborateur "test-collab-1" existe dans votre liste')
console.log('3. Regardez la console du navigateur pour les logs de debug')
console.log('4. Créez manuellement cette disponibilité via l\'interface pour tester')
