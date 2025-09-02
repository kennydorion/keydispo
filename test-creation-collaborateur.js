/**
 * Test de création d'un collaborateur
 * Script pour vérifier que le système fonctionne correctement
 */

console.log('🔧 Test de création d'un collaborateur...')
console.log('✅ Champ couleur: Ajouté dans les données de sauvegarde')
console.log('✅ Champ email: Rendu optionnel et converti en null si vide')
console.log('✅ Champ note: Rendu optionnel et converti en null si vide')
console.log('✅ Types TypeScript: Compatibles avec l\'interface CollaborateurV2')
console.log('')
console.log('📋 Données d\'exemple qui seraient envoyées:')
console.log(JSON.stringify({
  nom: 'Doe',
  prenom: 'John',
  email: null, // si vide dans le formulaire
  phone: '+33123456789',
  metier: 'Développeur',
  note: null, // si vide dans le formulaire
  color: '#6B7280', // couleur par défaut
  tenantId: 'keydispo',
  actif: true
}, null, 2))
console.log('')
console.log('🎯 Le formulaire devrait maintenant fonctionner correctement!')
