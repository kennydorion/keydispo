import { disponibilitesRTDBService } from './src/services/disponibilitesRTDBService.js';

console.log('🔍 Test de récupération des données RTDB...');

try {
  // Test simple pour voir si on peut récupérer les données
  const data = await disponibilitesRTDBService.getAllDisponibilites();
  console.log('✅ Données récupérées:', data.length, 'disponibilités');
  
  if (data.length > 0) {
    console.log('📊 Échantillon des données:');
    data.slice(0, 3).forEach((dispo, index) => {
      console.log(`   ${index + 1}. ${dispo.prenom} ${dispo.nom} - ${dispo.date}`);
    });
  }
} catch (error) {
  console.error('❌ Erreur:', error.message);
}
