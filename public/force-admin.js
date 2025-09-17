// Script pour forcer l'interface admin et diagnostiquer les problèmes
console.log('🚀 Script de force admin démarré')

// Attendre que la page soit chargée
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 Page chargée, initialisation...')
  
  // Forcer le sessionStorage pour l'interface admin
  sessionStorage.setItem('loginOrigin', 'admin')
  sessionStorage.setItem('tenantId', 'keydispo')
  
  console.log('💾 SessionStorage forcé:', {
    loginOrigin: sessionStorage.getItem('loginOrigin'),
    tenantId: sessionStorage.getItem('tenantId')
  })
  
  // Fonction pour forcer l'interface admin après connexion
  setTimeout(() => {
    if (window.debugInterfaceManager) {
      console.log('🔧 Forçage interface admin via debugInterfaceManager...')
      window.debugInterfaceManager.forceAdminInterface()
    } else {
      console.log('❌ debugInterfaceManager non disponible')
    }
    
    // Forcer le rechargement de la navigation
    if (window.location.hash || window.location.pathname !== '/') {
      console.log('🔄 Rechargement pour forcer la navigation...')
      window.location.reload()
    }
  }, 3000)
})

// Fonction pour débugger la navigation
window.debugNavigation = () => {
  console.log('🔍 Debug Navigation:')
  
  // Vérifier l'état de l'InterfaceManager
  if (window.debugInterfaceManager) {
    const state = {
      currentInterface: window.debugInterfaceManager.currentInterface?.value,
      userRole: window.debugInterfaceManager.userRole?.value,
      isAuthorized: window.debugInterfaceManager.isAuthorized?.value,
      navigationItems: window.debugInterfaceManager.navigationItems?.value
    }
    console.log('📊 État InterfaceManager:', state)
    
    // Vérifier spécifiquement les navigationItems
    if (state.navigationItems) {
      console.log('📋 Éléments de navigation:', state.navigationItems.map(item => item.label))
      
      const hasImport = state.navigationItems.some(item => item.label === 'Import')
      console.log('📁 Bouton Import présent:', hasImport)
    }
  }
  
  // Vérifier le DOM de la navigation
  const navLinks = document.querySelectorAll('.navbar-link')
  console.log('🖱️ Liens de navigation dans le DOM:', Array.from(navLinks).map(link => link.textContent?.trim()))
}

console.log('✅ Script chargé. Fonctions disponibles:')
console.log('- debugNavigation() - Diagnostique la navigation')

// Auto-debug après 5 secondes
setTimeout(() => {
  console.log('⏰ Auto-diagnostic après 5 secondes...')
  window.debugNavigation()
}, 5000)
