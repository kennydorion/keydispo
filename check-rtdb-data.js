/**
 * Script de diagnostic pour vérifier les données RTDB
 */

import { rtdb } from './src/services/firebase.js'
import { ref as rtdbRef, get as rtdbGet } from 'firebase/database'

async function checkRTDBData() {
  try {
    console.log('📊 Vérification des données RTDB...')
    
    // Vérifier la structure des tenants
    const tenantsRef = rtdbRef(rtdb, 'tenants')
    const tenantsSnapshot = await rtdbGet(tenantsRef)
    
    if (tenantsSnapshot.exists()) {
      const tenants = tenantsSnapshot.val()
      console.log('✅ Tenants trouvés:', Object.keys(tenants))
      
      // Pour chaque tenant, vérifier les disponibilités
      for (const tenantId of Object.keys(tenants)) {
        const disposRef = rtdbRef(rtdb, `tenants/${tenantId}/disponibilites`)
        const disposSnapshot = await rtdbGet(disposRef)
        
        if (disposSnapshot.exists()) {
          const dispos = disposSnapshot.val()
          const disposCount = Object.keys(dispos).length
          console.log(`📅 Tenant ${tenantId}: ${disposCount} disponibilités`)
          
          // Afficher quelques exemples
          const exemples = Object.values(dispos).slice(0, 3)
          exemples.forEach((dispo, i) => {
            console.log(`   Exemple ${i + 1}:`, {
              id: dispo.id,
              collaborateurId: dispo.collaborateurId,
              date: dispo.date,
              lieu: dispo.lieu,
              heure_debut: dispo.heure_debut,
              heure_fin: dispo.heure_fin
            })
          })
        } else {
          console.log(`⚠️ Tenant ${tenantId}: Aucune disponibilité`)
        }
      }
    } else {
      console.log('❌ Aucun tenant trouvé en RTDB')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification RTDB:', error)
  }
}

checkRTDBData()
