import { formatPhone, phoneToHref, normalizePhone } from './src/utils/phoneFormatter.ts';

// Tests spécifiques pour utilisateurs suisses
const swissTestCases = [
  // Numéros mobiles suisses typiques
  '0791234567',           // Mobile Swisscom
  '0761234567',           // Mobile Salt
  '0771234567',           // Mobile Sunrise
  '0781234567',           // Mobile divers
  
  // Formats avec espaces (comme saisis par utilisateurs)
  '079 123 45 67',
  '076 123 45 67',
  
  // Formats internationaux
  '+41791234567',
  '+41 79 123 45 67',
  
  // Anciens formats avec 00
  '0041791234567',
  '00 41 79 123 45 67',
  
  // Fixes suisses
  '0443334455',           // Zurich
  '0213334455',           // Lausanne
  '0223334455',           // Genève
  '0313334455',           // Berne
];

console.log('🇨🇭 Test des liens téléphones pour utilisateurs suisses\n');

swissTestCases.forEach((phone, index) => {
  const formatted = formatPhone(phone);
  const href = phoneToHref(phone);
  const normalized = normalizePhone(phone);
  
  console.log(`${index + 1}. Numéro saisi: "${phone}"`);
  console.log(`   Affiché: "${formatted}"`);
  console.log(`   Lien tel: "${href}"`);
  console.log(`   Stocké: "${normalized}"`);
  console.log('');
});

console.log('📱 Simulation de clics depuis iPhone/Android en Suisse:');
console.log('');

const clickTests = [
  { original: '079 123 45 67', expected: '+41791234567' },
  { original: '0033123456789', expected: '+33123456789' },
  { original: '0041791234567', expected: '+41791234567' },
];

clickTests.forEach((test, index) => {
  const href = phoneToHref(test.original);
  const status = href === test.expected ? '✅' : '❌';
  
  console.log(`${status} Test ${index + 1}: "${test.original}"`);
  console.log(`   Lien généré: tel:${href}`);
  console.log(`   Attendu: tel:${test.expected}`);
  console.log(`   → ${status === '✅' ? 'Clic fonctionnel' : 'Problème de format'}`);
  console.log('');
});

console.log('💡 Note: Les liens tel: avec format international (+XX) sont');
console.log('   reconnus par tous les smartphones suisses et permettent');
console.log('   l\'appel direct sans saisie manuelle du numéro.');
