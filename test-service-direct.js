import { DisponibiliteService } from './src/services/disponibilite.js';

console.log('🧪 Test du service Disponibilite...');

try {
  // Test de chargement des données
  const disponibilites = await DisponibiliteService.getDisponibilites();
  console.log(`✅ ${disponibilites.length} disponibilités chargées`);
  
  if (disponibilites.length > 0) {
    console.log('📋 Première disponibilité:', disponibilites[0]);
  }
  
} catch (error) {
  console.error('❌ Erreur:', error);
}
