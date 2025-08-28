/**
 * Script de diagnostic pour l'erreur "message channel closed before a response was received"
 * À ajouter temporairement dans votre application pour identifier la source
 */

// Intercepter toutes les erreurs de promesse non gérées
window.addEventListener('unhandledrejection', (event) => {
  console.group('🚨 Promesse rejetée non gérée')
  console.error('Reason:', event.reason)
  console.error('Promise:', event.promise)
  console.trace('Stack trace:')
  console.groupEnd()
  
  // Ne pas empêcher l'erreur par défaut pour le moment
  // event.preventDefault()
})

// Intercepter les erreurs générales
window.addEventListener('error', (event) => {
  if (event.message?.includes('message channel closed')) {
    console.group('🔍 Erreur Message Channel détectée')
    console.error('Message:', event.message)
    console.error('Filename:', event.filename)
    console.error('Line:', event.lineno)
    console.error('Column:', event.colno)
    console.error('Error object:', event.error)
    console.trace('Stack trace:')
    console.groupEnd()
  }
})

// Diagnostiquer les extensions Chrome
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.warn('🔧 Extensions Chrome détectées - Possible source d\'erreur')
  
  // Tenter de lister les extensions (ne fonctionnera pas pour toutes)
  try {
    chrome.management?.getAll?.((extensions) => {
      console.log('📋 Extensions installées:', extensions)
    })
  } catch (e) {
    console.log('❌ Impossible de lister les extensions')
  }
}

// Surveilleur des listeners Firebase
if (window.firebase) {
  console.log('🔥 Firebase détecté - Surveillance des listeners')
  
  // Wrapper pour database().ref().on()
  const originalOn = firebase.database?.().ref?.().on
  if (originalOn) {
    firebase.database.Reference.prototype.on = function(...args) {
      console.log('📡 Firebase listener ajouté:', args[0], this.toString())
      return originalOn.apply(this, args)
    }
  }
}

// Diagnostic des listeners DOM
const originalAddEventListener = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function(type, listener, options) {
  if (typeof listener === 'function') {
    // Wrapper pour les fonctions async
    if (listener.constructor.name === 'AsyncFunction') {
      console.warn(`⚠️ Listener async détecté pour '${type}' - Possible source d'erreur`)
      
      const wrappedListener = function(...args) {
        Promise.resolve(listener.apply(this, args)).catch(error => {
          console.error(`❌ Erreur dans listener async '${type}':`, error)
        })
      }
      
      return originalAddEventListener.call(this, type, wrappedListener, options)
    }
  }
  
  return originalAddEventListener.call(this, type, listener, options)
}

// Diagnostic spécifique pour visibilitychange
document.addEventListener('visibilitychange', () => {
  console.log('👁️ Changement de visibilité:', document.hidden ? 'hidden' : 'visible')
})

// Diagnostic pour beforeunload
window.addEventListener('beforeunload', () => {
  console.log('🚪 Page en cours de fermeture/rechargement')
})

console.log('🔍 Script de diagnostic chargé - Surveillez la console pour identifier l\'erreur')

export { }
