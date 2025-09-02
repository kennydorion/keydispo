console.log('🧪 Test chargement collaborateurs...')

// Simuler l'appel au service
import { CollaborateursServiceV2 } from '../src/services/collaborateursV2.js'

async function testLoad() {
  try {
    const tenantId = 'keydispo'
    console.log('🔄 Test chargement RTDB pour:', tenantId)
    
    const data = await CollaborateursServiceV2.loadCollaborateursFromRTDB(tenantId)
    
    console.log(`✅ ${data.length} collaborateurs chargés`)
    
    if (data.length > 0) {
      console.log('Premiers collaborateurs:')
      data.slice(0, 3).forEach(c => {
        console.log(`  - ${c.nom} ${c.prenom} (${c.metier})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

testLoad()
