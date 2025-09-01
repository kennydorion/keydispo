// Service de vérification des données RTDB
import { ref, get } from 'firebase/database'
import { rtdb } from '@/firebase'

export async function verifyRTDBData(tenantId: string) {
  console.log('🔍 Vérification des données RTDB pour tenant:', tenantId)
  
  try {
    // Vérifier les collaborateurs
    const collabRef = ref(rtdb, `tenants/${tenantId}/collaborateurs`)
    const collabSnapshot = await get(collabRef)
    
    const collaborateurs = collabSnapshot.exists() ? collabSnapshot.val() : {}
    const collabCount = Object.keys(collaborateurs).length
    
    console.log(`👥 Collaborateurs trouvés: ${collabCount}`)
    
    // Vérifier les disponibilités  
    const dispoRef = ref(rtdb, `tenants/${tenantId}/disponibilites`)
    const dispoSnapshot = await get(dispoRef)
    
    const disponibilites = dispoSnapshot.exists() ? dispoSnapshot.val() : {}
    const dispoCount = Object.keys(disponibilites).length
    
    console.log(`📅 Disponibilités trouvées: ${dispoCount}`)
    
    return {
      collaborateurs: collabCount,
      disponibilites: dispoCount,
      data: {
        collaborateurs,
        disponibilites
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur verification RTDB:', error)
    throw error
  }
}
