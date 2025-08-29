import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore'
import * as dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

const firebaseConfig = {
  apiKey: process.env.VITE_FB_API_KEY,
  authDomain: process.env.VITE_FB_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FB_DATABASE_URL,
  projectId: process.env.VITE_FB_PROJECT_ID,
  storageBucket: process.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FB_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function checkFirestoreData() {
  try {
    console.log('🔍 Vérification des données Firestore...')
    console.log('Project ID:', firebaseConfig.projectId)
    
    const tenantId = 'keydispo'
    console.log('Tenant ID recherché:', tenantId)
    
    // Compter toutes les disponibilités
    const disposRef = collection(db, 'dispos')
    const allQuery = query(disposRef, limit(10))
    const allSnapshot = await getDocs(allQuery)
    
    console.log(`📊 Total documents dans collection 'dispos': ${allSnapshot.size}`)
    
    // Compter pour le tenant keydispo
    const tenantQuery = query(
      disposRef,
      where('tenantId', '==', tenantId),
      limit(10)
    )
    const tenantSnapshot = await getDocs(tenantQuery)
    
    console.log(`📊 Documents pour tenant '${tenantId}': ${tenantSnapshot.size}`)
    
    // Afficher quelques exemples
    if (tenantSnapshot.size > 0) {
      console.log('📄 Exemples de documents:')
      let index = 0
      tenantSnapshot.forEach((doc) => {
        if (index < 3) {
          const data = doc.data()
          console.log(`  ${index + 1}. ${data.nom} ${data.prenom} - ${data.date} (${data.lieu})`)
          index++
        }
      })
    }
    
    // Vérifier les autres tenants
    if (allSnapshot.size > 0) {
      const tenantIds = new Set<string>()
      allSnapshot.forEach(doc => {
        const tenantId = doc.data().tenantId
        if (tenantId) tenantIds.add(tenantId)
      })
      console.log('🏢 Tenants trouvés:', Array.from(tenantIds))
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

checkFirestoreData()
  .then(() => {
    console.log('✅ Vérification terminée')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
