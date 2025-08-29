// Test complet de la correction des doublons de batch
console.log('🧪 Test complet des doublons de batch\n')

// Données de test
const collaborateur = {
  id: 'collab1',
  nom: 'Dupont',
  prenom: 'Jean'
}

const dates = ['2024-01-15', '2024-01-16']
const dispoData = {
  lieu: 'Paris',
  heureDebut: '09:00',
  heureFin: '17:00',
  type: 'disponible',
  timeKind: 'range'
}

// Simule la fonction handleBatchCreate
function simulateHandleBatchCreate(collaborateur, dates, dispoData) {
  console.log('📝 Simulation handleBatchCreate...')
  const cache = new Map()
  
  // Ajouter des données temporaires au cache (comme dans le vrai code)
  for (const date of dates) {
    const existingDispos = cache.get(date) || []
    
    const newDispo = {
      id: `temp-${Date.now()}-${Math.random()}`,
      collaborateurId: collaborateur.id,
      nom: collaborateur.nom,
      prenom: collaborateur.prenom,
      date: date,
      lieu: dispoData.lieu,
      heure_debut: dispoData.heureDebut,
      heure_fin: dispoData.heureFin,
      type: dispoData.type,
      timeKind: dispoData.timeKind
    }
    
    cache.set(date, [...existingDispos, newDispo])
    console.log(`   ➕ Ajout temporaire: ${date} (ID: ${newDispo.id})`)
  }
  
  return cache
}

// Simule les données Firestore qui arrivent
function simulateFirestoreData(collaborateur, dates, dispoData) {
  console.log('📡 Simulation données Firestore...')
  const firestoreDispos = []
  
  for (const date of dates) {
    const realDispo = {
      id: `firestore_${Math.random().toString(36).substring(7)}`,
      collaborateurId: collaborateur.id,
      nom: collaborateur.nom,
      prenom: collaborateur.prenom,
      date: date,
      lieu: dispoData.lieu,
      heure_debut: dispoData.heureDebut,
      heure_fin: dispoData.heureFin,
      type: dispoData.type,
      timeKind: dispoData.timeKind
    }
    
    firestoreDispos.push({ type: 'added', date, disponibilite: realDispo })
    console.log(`   🔥 Donnée Firestore: ${date} (ID: ${realDispo.id})`)
  }
  
  return firestoreDispos
}

// Simule la fonction handleRealtimeChanges avec la nouvelle logique
function simulateHandleRealtimeChanges(cache, changes) {
  console.log('🔄 Simulation handleRealtimeChanges avec nouvelle logique...')
  
  changes.forEach(change => {
    const { type, date, disponibilite } = change
    const existingDispos = cache.get(date) || []
    
    if (type === 'added') {
      // Nouvelle logique de déduplication
      const isDuplicate = existingDispos.find(d => {
        // Vérification par ID exact
        if (d.id === disponibilite.id) return true
        
        // Vérification par données métier (pour éliminer les temporaires)
        return d.collaborateurId === disponibilite.collaborateurId &&
               d.date === disponibilite.date &&
               d.heure_debut === disponibilite.heure_debut &&
               d.heure_fin === disponibilite.heure_fin &&
               d.lieu === disponibilite.lieu &&
               d.type === disponibilite.type
      })
      
      if (!isDuplicate) {
        existingDispos.push(disponibilite)
        console.log(`   ➕ Ajout normal: ${date}`)
      } else {
        // Remplacer les données temporaires par les vraies
        const duplicateIndex = existingDispos.findIndex(d => 
          d.collaborateurId === disponibilite.collaborateurId &&
          d.date === disponibilite.date &&
          d.heure_debut === disponibilite.heure_debut &&
          d.heure_fin === disponibilite.heure_fin &&
          d.lieu === disponibilite.lieu &&
          d.type === disponibilite.type &&
          d.id?.startsWith('temp-')
        )
        
        if (duplicateIndex !== -1) {
          console.log(`   🔄 Remplacement temporaire→Firestore: ${date}`)
          existingDispos[duplicateIndex] = disponibilite
        } else {
          console.log(`   ⚠️ Doublon ignoré: ${date}`)
        }
      }
      
      cache.set(date, [...existingDispos])
    }
  })
}

// Fonction de nettoyage
function simulateCleanupTemporaryData(cache, dates) {
  console.log('🧹 Simulation nettoyage données temporaires...')
  let cleanedCount = 0
  
  dates.forEach(date => {
    const existingDispos = cache.get(date) || []
    const cleanedDispos = existingDispos.filter(d => {
      const isTemp = d.id?.startsWith('temp-')
      if (isTemp) {
        cleanedCount++
        console.log(`   🧹 Suppression: ${date} (ID: ${d.id})`)
      }
      return !isTemp
    })
    
    if (cleanedDispos.length !== existingDispos.length) {
      cache.set(date, cleanedDispos)
    }
  })
  
  console.log(`   ✅ ${cleanedCount} donnée(s) temporaire(s) nettoyée(s)`)
}

// Exécution du test complet
console.log('🚀 Début du test complet\n')

// 1. Création batch (données temporaires)
const cache = simulateHandleBatchCreate(collaborateur, dates, dispoData)
console.log(`\n📊 État après batch: ${Array.from(cache.values()).flat().length} dispo(s) total`)

// 2. Arrivée des données Firestore
const firestoreChanges = simulateFirestoreData(collaborateur, dates, dispoData)

// 3. Traitement avec nouvelle logique (devrait éviter les doublons)
simulateHandleRealtimeChanges(cache, firestoreChanges)
console.log(`\n📊 État après Firestore: ${Array.from(cache.values()).flat().length} dispo(s) total`)

// 4. Vérification qu'il n'y a pas de doublons
dates.forEach(date => {
  const dispos = cache.get(date) || []
  console.log(`   ${date}: ${dispos.length} dispo(s)`)
  
  if (dispos.length > 1) {
    console.log(`   ❌ PROBLÈME: ${dispos.length} doublons détectés!`)
  } else {
    console.log(`   ✅ Pas de doublon`)
  }
})

// 5. Nettoyage final (optionnel)
simulateCleanupTemporaryData(cache, dates)
console.log(`\n📊 État final après nettoyage: ${Array.from(cache.values()).flat().length} dispo(s) total`)

console.log('\n🎉 Test terminé avec succès!')
