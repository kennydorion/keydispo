/**
 * Script à exécuter dans la console du navigateur pour vérifier les permissions
 */

// Code à exécuter dans la console du navigateur
(async function checkUserPermissions() {
  console.log('🔍 Vérification des permissions utilisateur...')
  
  try {
    // Récupérer les services Firebase
    const auth = window.auth || (await import('./src/services/firebase.js')).auth
    const db = window.db || (await import('./src/services/firebase.js')).db
    
    if (!auth.currentUser) {
      console.log('❌ Aucun utilisateur connecté')
      console.log('👉 Vous devez d\'abord vous connecter pour tester la sauvegarde')
      return
    }
    
    console.log('✅ Utilisateur connecté:', {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email
    })
    
    // Vérifier les permissions dans le tenant
    const { getDoc, doc } = await import('firebase/firestore')
    const tenantId = 'keydispo'
    const userRef = doc(db, `tenants/${tenantId}/users/${auth.currentUser.uid}`)
    
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      console.log('❌ Utilisateur non trouvé dans le tenant')
      console.log('👉 L\'utilisateur doit être ajouté au tenant par un administrateur')
      
      // Vérifier si l'email est dans la liste des admins auto-promus
      const adminEmails = 'kdorion@thecompagnie.eu'.split(',')
      if (adminEmails.includes(auth.currentUser.email)) {
        console.log('👑 Email dans la liste des admins auto-promus')
        console.log('👉 L\'utilisateur devrait être promu automatiquement au premier login')
      }
      
      return
    }
    
    const userData = userDoc.data()
    console.log('✅ Permissions utilisateur:', userData)
    
    if (userData.role === 'admin' || userData.role === 'editor') {
      console.log('✅ L\'utilisateur a les permissions pour créer/modifier des collaborateurs')
    } else {
      console.log('❌ L\'utilisateur n\'a pas les permissions suffisantes')
      console.log('👉 Rôle requis: admin ou editor')
      console.log('👉 Rôle actuel:', userData.role)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
  }
})()

console.log('🔧 Script de vérification des permissions exécuté')
