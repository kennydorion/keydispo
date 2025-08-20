const { initializeApp } = require('firebase/app')
const { getFirestore, connectFirestoreEmulator, collection, getDocs, deleteDoc, doc } = require('firebase/firestore')

const app = initializeApp({ projectId: 'keydispo-local' })
const db = getFirestore(app)
connectFirestoreEmulator(db, 'localhost', 8081)

async function clearAll() {
  const collections = ['dispos', 'disponibilites', 'collaborateurs', 'tenants']
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col))
      for (const d of snap.docs) {
        await deleteDoc(doc(db, col, d.id))
      }
      console.log(`✅ Collection "${col}" vidée (${snap.size} docs)`)
    } catch (e) {
      console.log(`ℹ️ Collection "${col}" ignorée (absente)`)
    }
  }
  console.log('🎉 Firestore émulateur nettoyé')
}

clearAll()
