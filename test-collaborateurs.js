// Données de collaborateurs de test à ajouter manuellement via l'interface
const testCollaborateurs = [
  {
    id: 'Dupont_Jean_jean.dupont@example.com',
    nom: 'Dupont',
    prenom: 'Jean',
    metier: 'Développeur',
    phone: '0123456789',
    email: 'jean.dupont@example.com',
    ville: 'Paris',
    color: '#3498db',
    tenantId: 'keydispo'
  },
  {
    id: 'Martin_Marie_marie.martin@example.com',
    nom: 'Martin',
    prenom: 'Marie',
    metier: 'Designer',
    phone: '0123456788',
    email: 'marie.martin@example.com',
    ville: 'Lyon',
    color: '#e74c3c',
    tenantId: 'keydispo'
  },
  {
    id: 'Dubois_Pierre_pierre.dubois@example.com',
    nom: 'Dubois',
    prenom: 'Pierre',
    metier: 'Manager',
    phone: '0123456787',
    email: 'pierre.dubois@example.com',
    ville: 'Marseille',
    color: '#f39c12',
    tenantId: 'keydispo'
  }
]

console.log('📋 Collaborateurs de test à créer :')
console.log(JSON.stringify(testCollaborateurs, null, 2))
