import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDNX4AgOQBXa1x0JhQHGkwUDz0gYxm1hno",
  authDomain: "keydispo-firebase.firebaseapp.com",
  projectId: "keydispo-firebase",
  storageBucket: "keydispo-firebase.firebasestorage.app",
  messagingSenderId: "671462843923",
  appId: "1:671462843923:web:4b9598b8e7b3ec8bc58e7c"
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function cleanupExpiredSessions() {
  try {
    console.log('🔍 Recherche des sessions expirées...')
    
    const presenceSnapshot = await getDocs(collection(db, 'tenants/test/presence'))
    
    let totalSessions = 0
    let expiredSessions = 0
    const now = new Date()
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)
    
    console.log('📊 Sessions trouvées:')
    
    for (const docSnap of presenceSnapshot.docs) {
      totalSessions++
      const data = docSnap.data()
      const lastSeen = data.lastSeen?.toDate()
      const sessionId = docSnap.id
      
      console.log(`- ${data.displayName} (${sessionId.slice(-6)}): ${lastSeen ? lastSeen.toLocaleString() : 'jamais'}`)
      
      if (!lastSeen || lastSeen < twoMinutesAgo) {
        console.log(`  ❌ Expirée - suppression...`)
        await deleteDoc(doc(db, 'tenants/test/presence', sessionId))
        expiredSessions++
      } else {
        console.log(`  ✅ Active`)
      }
    }
    
    console.log(`\n🧹 Résultats:`)
    console.log(`- Total sessions: ${totalSessions}`)
    console.log(`- Sessions expirées supprimées: ${expiredSessions}`)
    console.log(`- Sessions actives restantes: ${totalSessions - expiredSessions}`)
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

cleanupExpiredSessions()
