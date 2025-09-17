// Script de debug pour les indisponibilités
// À exécuter dans la console du navigateur sur la page du planning collaborateur

console.log('🧪 === DÉBUT DEBUG INDISPONIBILITÉS ===');

// Test de la fonction de normalisation
const testDispos = [
  { date: '2025-01-15', lieu: 'INDISPONIBLE', heure_debut: '', heure_fin: '' },
  { date: '2025-01-16', lieu: 'DISPONIBLE', heure_debut: '', heure_fin: '' },
  { date: '2025-01-17', lieu: 'SOUS BALME', heure_debut: '09:00', heure_fin: '17:00' },
  { date: '2025-01-18', lieu: 'DISPO JOURNEE', heure_debut: '', heure_fin: '' }
];

// Test planningDisplayService si disponible
if (typeof window !== 'undefined' && window.planningDisplayService) {
  console.log('📋 Test des services d\'affichage :');
  
  testDispos.forEach(dispo => {
    const kind = window.planningDisplayService.resolveDispoKind(dispo);
    const temporal = window.planningDisplayService.getTemporalDisplay(dispo);
    const icon = window.planningDisplayService.getDispoTypeIcon(dispo);
    
    console.log(`📅 ${dispo.date} - ${dispo.lieu}:`);
    console.log(`  └ Type: ${kind.type}`);
    console.log(`  └ Temporal: "${temporal}"`);
    console.log(`  └ Icon: ${icon}`);
    console.log('');
  });
} else {
  console.log('⚠️ planningDisplayService non disponible dans window');
}

// Vérifier les disponibilités du composant
if (window.Vue && window.Vue.getCurrentInstance) {
  console.log('🔍 Recherche de l\'instance Vue du planning...');
  // Code pour inspecter l'instance Vue si nécessaire
}

// Instructions pour l'utilisateur
console.log('📋 Instructions de test :');
console.log('1. Créez une indisponibilité via l\'interface');
console.log('2. Vérifiez dans la console les logs commençant par "🔍 Recherche dispos"');
console.log('3. L\'indisponibilité doit avoir :');
console.log('   - Fond rouge dégradé');
console.log('   - Icône "block" ⊗');
console.log('   - Pas de texte temporal si journée complète');
console.log('   - Classe CSS .dispo-card-indisponible');

console.log('🧪 === FIN DEBUG INDISPONIBILITÉS ===');
