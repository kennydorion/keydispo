import { formatPhone, normalizePhone, validatePhone } from './src/utils/phoneFormatter.ts';

// Tests des formats de téléphone (Suisse et France avec conversion 00)
const testCases = [
  // Numéros français
  '0123456789',           // Format national français
  '+33123456789',         // Format international français
  '0033123456789',        // Format 00 -> +33 (à convertir)
  '01 23 45 67 89',       // Avec espaces
  '+33 1 23 45 67 89',    // International avec espaces
  '00.33.1.23.45.67.89',  // Avec points (à convertir)
  
  // Numéros suisses  
  '0791234567',           // Format national suisse
  '+41791234567',         // Format international suisse
  '791234567',            // Sans préfixe
  '079 123 45 67',        // Avec espaces
  '+41 79 123 45 67',     // International avec espaces
  
  // Cas spéciaux
  '00417912345',          // 00 + code suisse (à convertir)
  '123456',               // Trop court
  '',                     // Vide
];

console.log('� Test du formatage des téléphones avec conversion 00 -> +33\n');

testCases.forEach((phone, index) => {
  console.log(`${index + 1}. Input: "${phone}"`);
  console.log(`   Formaté: "${formatPhone(phone || '')}"`);
  console.log(`   Normalisé: "${normalizePhone(phone || '')}"`);
  console.log(`   Valide: ${validatePhone(phone || '')}`);
  console.log('');
});

// Tests de conversion spécifique 00 -> +33
console.log('� Tests de conversion 00 -> +33:');
console.log('');

const conversionTests = [
  { input: '0033123456789', expectedNormalized: '+33123456789' },
  { input: '00 33 1 23 45 67 89', expectedNormalized: '+33123456789' },
  { input: '00.33.1.23.45.67.89', expectedNormalized: '+33123456789' },
  { input: '0041791234567', expectedNormalized: '+41791234567' },
  { input: '0012345678901', expectedNormalized: '+12345678901' },
];

conversionTests.forEach((test, index) => {
  const result = normalizePhone(test.input);
  const status = result === test.expectedNormalized ? '✅' : '❌';
  console.log(`${status} Test ${index + 1}: "${test.input}"`);
  console.log(`   Résultat: "${result}"`);
  console.log(`   Attendu:  "${test.expectedNormalized}"`);
  console.log('');
});

console.log('📞 Tests de formatage d\'affichage:');
console.log('');

const displayTests = [
  { input: '0033123456789', expected: '+33 1 23 45 67 89' },
  { input: '0123456789', expected: '01 23 45 67 89' },
  { input: '+33123456789', expected: '+33 1 23 45 67 89' },
  { input: '0041791234567', expected: '+41 79 123 45 67' },
  { input: '0791234567', expected: '079 123 45 67' },
];

displayTests.forEach((test, index) => {
  const result = formatPhone(test.input);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} Test ${index + 1}: "${test.input}"`);
  console.log(`   Résultat: "${result}"`);
  console.log(`   Attendu:  "${test.expected}"`);
  console.log('');
});
