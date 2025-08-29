/**
 * Test simple de génération de clés RTDB compatibles
 */

// Fonction de test pour vérifier les clés Firebase RTDB
function testRTDBKeyCompatibility() {
  function slugify(nom, prenom) {
    const clean = (str) => str
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
    
    const result = `${clean(nom)}_${clean(prenom)}`
    
    // Firebase RTDB n'aime pas les clés qui commencent par un chiffre
    // On préfixe avec 'u_' (user) si c'est le cas
    if (/^\d/.test(result)) {
      return `u_${result}`
    }
    
    return result
  }

  // Test cases
  const testCases = [
    { nom: '11', prenom: 'Allan', expected: 'u_11_allan' }, // Cas problématique
    { nom: 'Allan', prenom: 'John', expected: 'allan_john' },
    { nom: 'Dupont', prenom: 'Jean-Marie', expected: 'dupont_jean_marie' },
    { nom: 'Smith', prenom: 'O\'Connor', expected: 'smith_o_connor' },
    { nom: 'Müller', prenom: 'François', expected: 'muller_francois' },
    { nom: 'van der Berg', prenom: 'Anna-Lisa', expected: 'van_der_berg_anna_lisa' },
    { nom: '2024', prenom: 'Test', expected: 'u_2024_test' } // Autre cas avec chiffre
  ]

  console.log('🧪 Test de compatibilité des clés Firebase RTDB (v2)')
  console.log('====================================================')
  
  let allPassed = true
  
  testCases.forEach((test, index) => {
    const result = slugify(test.nom, test.prenom)
    const passed = result === test.expected
    
    console.log(`Test ${index + 1}: ${test.nom} ${test.prenom}`)
    console.log(`  Résultat: "${result}"`)
    console.log(`  Attendu:  "${test.expected}"`)
    console.log(`  Status:   ${passed ? '✅ PASS' : '❌ FAIL'}`)
    console.log('')
    
    if (!passed) allPassed = false
  })
  
  console.log(`🎯 Résultat global: ${allPassed ? '✅ TOUS LES TESTS PASSENT' : '❌ CERTAINS TESTS ÉCHOUENT'}`)
  
  // Test spécifique du cas qui posait problème
  const problematicResult = slugify('11', 'Allan')
  console.log(`\n🔍 Test spécifique du cas problématique:`)
  console.log(`   11 Allan → "${problematicResult}"`)
  console.log(`   Compatible Firebase RTDB: ${!/[.#$[\]/-]/.test(problematicResult) && !/^\d/.test(problematicResult) ? '✅ OUI' : '❌ NON'}`)
}

// Lancer le test
testRTDBKeyCompatibility()
