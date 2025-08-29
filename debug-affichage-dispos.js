/**
 * Script de debug pour diagnostiquer pourquoi les disponibilités 
 * ne s'affichent pas dans les cellules
 */

const debug = {
  /**
   * Vérifier le contenu du cache des disponibilités
   */
  checkCache() {
    if (typeof window !== 'undefined' && window.Vue) {
      console.log('=== DEBUG CACHE DISPONIBILITÉS ===')
      
      // Simuler l'accès au cache depuis la console du navigateur
      console.log('Pour debugger depuis la console du navigateur, utilisez:')
      console.log('1. Ouvrir les DevTools (F12)')
      console.log('2. Aller dans l\'onglet Console')
      console.log('3. Exécuter ces commandes:')
      console.log('')
      console.log('// Vérifier le cache')
      console.log('const app = document.querySelector("#app").__vueParentComponent')
      console.log('const cache = app.refs.semaine?.disponibilitesCache')
      console.log('console.log("Cache size:", cache?.size)')
      console.log('cache?.forEach((dispos, date) => {')
      console.log('  console.log(`${date}: ${dispos.length} disponibilités`)') 
      console.log('  if (dispos.length > 0) console.log("Exemple:", dispos[0])')
      console.log('})')
      console.log('')
      console.log('// Vérifier un collaborateur spécifique')
      console.log('const firstCollab = app.refs.semaine?.collaborateurs?.[0]')
      console.log('const today = new Date().toISOString().split("T")[0]')
      console.log('console.log("Collaborateur:", firstCollab)')
      console.log('const dispos = app.refs.semaine?.getDisponibilites?.(firstCollab.id, today)')
      console.log('console.log("Dispos pour ce collab aujourd\'hui:", dispos)')
      
    } else {
      console.log('Ce script doit être exécuté dans le navigateur avec Vue chargé')
    }
  },

  /**
   * Diagnostic complet
   */
  fullDiagnosis() {
    console.log('=== DIAGNOSTIC COMPLET ===')
    console.log('')
    console.log('1. VÉRIFICATIONS DANS LA CONSOLE:')
    this.checkCache()
    console.log('')
    console.log('2. VÉRIFICATIONS À FAIRE:')
    console.log('   - Les données RTDB sont-elles correctement formatées ?')
    console.log('   - Le cache est-il mis à jour après chargement ?')
    console.log('   - Les IDs collaborateurs correspondent-ils ?')
    console.log('   - Les dates sont-elles au bon format (YYYY-MM-DD) ?')
    console.log('')
    console.log('3. POINTS DE CONTRÔLE:')
    console.log('   a) Dans disponibilitesRTDBService.ts : format des données retournées')
    console.log('   b) Dans loadDisponibilitesFromRTDB : transformation des données')  
    console.log('   c) Dans la boucle de mise à jour du cache : stockage correct')
    console.log('   d) Dans getDisponibilites : récupération depuis le cache')
    console.log('   e) Dans getCellDisposSorted : affichage final')
  }
}

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = debug
}

// Pour navigateur  
if (typeof window !== 'undefined') {
  window.debugDispos = debug
}

// Lancer le diagnostic
debug.fullDiagnosis()
