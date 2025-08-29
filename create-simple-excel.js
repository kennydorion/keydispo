import XLSX from 'xlsx';

// Créer des données de test simples
const testData = [
  {
    'Nom': 'Dupont',
    'Prénom': 'Marie',
    'Métier': 'Infirmière',
    'Téléphone': '0123456789',
    'Email': 'marie.dupont@test.com',
    'Ville': 'Paris',
    'Date': '2024-01-15',
    'Lieu': 'Hôpital Saint-Louis',
    'Heure début': '08:00',
    'Heure fin': '16:00'
  },
  {
    'Nom': 'Martin',
    'Prénom': 'Pierre',
    'Métier': 'Médecin',
    'Téléphone': '0123456790',
    'Email': 'pierre.martin@test.com',
    'Ville': 'Lyon',
    'Date': '2024-01-15',
    'Lieu': 'Clinique du Rhône',
    'Heure début': '09:00',
    'Heure fin': '17:00'
  },
  {
    'Nom': 'Dubois',
    'Prénom': 'Sophie',
    'Métier': 'Aide-soignante',
    'Téléphone': '0123456791',
    'Email': 'sophie.dubois@test.com',
    'Ville': 'Marseille',
    'Date': '2024-01-16',
    'Lieu': 'Centre de soins',
    'Heure début': '07:30',
    'Heure fin': '15:30'
  }
];

// Créer le workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(testData);

// Ajouter la feuille au workbook
XLSX.utils.book_append_sheet(wb, ws, 'Planning');

// Sauvegarder le fichier
XLSX.writeFile(wb, 'test-import-verification.xlsx');

console.log('✅ Fichier test-import-verification.xlsx créé avec 3 disponibilités');
console.log('📊 Données:');
testData.forEach((row, index) => {
  console.log(`   ${index + 1}. ${row.Prénom} ${row.Nom} - ${row.Date} (${row.Lieu})`);
});
