// Script de validation pour la cohérence admin/collaborateur
// À exécuter dans la console du planning collaborateur

console.log('🔍 === VALIDATION COHÉRENCE ADMIN/COLLABORATEUR ===');

// Fonction pour tester la normalisation comme côté admin
function testDispoConsistency() {
    const testCases = [
        { lieu: 'INDISPONIBLE', heure_debut: '', heure_fin: '', expected: 'indisponible' },
        { lieu: 'DISPONIBLE', heure_debut: '', heure_fin: '', expected: 'disponible' },
        { lieu: 'DISPO JOURNEE', heure_debut: '', heure_fin: '', expected: 'disponible' },
        { lieu: 'SOUS BALME', heure_debut: '09:00', heure_fin: '17:00', expected: 'mission' },
        { lieu: 'FORMATION', heure_debut: '10:00', heure_fin: '16:00', expected: 'mission' }
    ];
    
    console.log('📋 Test de cohérence des types de disponibilités :');
    
    testCases.forEach((test, index) => {
        console.log(`\n${index + 1}. Test: ${test.lieu}`);
        console.log(`   Input: { lieu: "${test.lieu}", heure_debut: "${test.heure_debut}", heure_fin: "${test.heure_fin}" }`);
        console.log(`   Expected type: ${test.expected}`);
        
        // Simuler la logique planningDisplayService si disponible
        if (window.planningDisplayService) {
            const resolved = window.planningDisplayService.resolveDispoKind({
                date: '2025-01-15',
                lieu: test.lieu,
                heure_debut: test.heure_debut,
                heure_fin: test.heure_fin
            });
            console.log(`   Resolved type: ${resolved.type}`);
            console.log(`   Status: ${resolved.type === test.expected ? '✅ CORRECT' : '❌ INCORRECT'}`);
        } else {
            console.log('   ⚠️ planningDisplayService non disponible');
        }
    });
}

// Fonction pour vérifier les classes CSS appliquées
function checkCSSClasses() {
    console.log('\n🎨 Vérification des classes CSS appliquées :');
    
    const dispoCards = document.querySelectorAll('.dispo-card');
    if (dispoCards.length === 0) {
        console.log('⚠️ Aucune carte de disponibilité trouvée sur cette page');
        return;
    }
    
    dispoCards.forEach((card, index) => {
        const classes = card.className;
        console.log(`${index + 1}. Carte: ${classes}`);
        
        if (classes.includes('dispo-card-indisponible')) {
            console.log('   └ ✅ Type: Indisponible (classe correcte)');
        } else if (classes.includes('dispo-card-disponible')) {
            console.log('   └ ✅ Type: Disponible (classe correcte)');
        } else if (classes.includes('dispo-card-mission')) {
            console.log('   └ ✅ Type: Mission (classe correcte)');
        } else {
            console.log('   └ ❌ Type: Classe non reconnue');
        }
    });
}

// Fonction pour vérifier la structure HTML
function checkHTMLStructure() {
    console.log('\n🏗️ Vérification de la structure HTML :');
    
    const expectedStructure = [
        '.dispo-unified-content',
        '.dispo-main-info', 
        '.dispo-type-icon',
        '.dispo-temporal'
    ];
    
    const firstCard = document.querySelector('.dispo-card');
    if (!firstCard) {
        console.log('⚠️ Aucune carte trouvée pour vérifier la structure');
        return;
    }
    
    expectedStructure.forEach(selector => {
        const element = firstCard.querySelector(selector);
        if (element) {
            console.log(`✅ ${selector} : trouvé`);
        } else {
            console.log(`❌ ${selector} : manquant`);
        }
    });
}

// Exécuter les tests
testDispoConsistency();
checkCSSClasses();
checkHTMLStructure();

console.log('\n📝 Instructions de comparaison :');
console.log('1. Ouvrez le planning admin dans un autre onglet');
console.log('2. Comparez visuellement les cartes de disponibilités');
console.log('3. Vérifiez que les couleurs, icônes et styles sont identiques');
console.log('4. Testez les interactions (hover, clic)');

console.log('\n🧪 === FIN VALIDATION COHÉRENCE ===');
