import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { ref, get, set, update } from 'firebase/database'
import { auth, rtdb } from './firebase'
import { multiUserService } from './multiUserService'
import type { TenantUser } from '../types'

const googleProvider = new GoogleAuthProvider()

export class AuthService {
  // Par défaut, utiliser le tenant "keydispo" (jeu de données principal)
  // Évite de tomber sur un tenant "default" vide si la variable d'env est absente
  static currentTenantId = import.meta.env.VITE_TENANT_ID || 'keydispo'
  static adminEmails: string[] = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter((e: string) => !!e)

  static async signInWithEmail(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await this.ensureUserInTenant(result.user)
      return result.user
    } catch (error) {
      console.error('Error signing in with email:', error)
      throw error
    }
  }

  static async signUpWithEmail(email: string, password: string, displayName?: string) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await this.ensureUserInTenant(result.user, 'viewer', displayName)
      return result.user
    } catch (error) {
      console.error('Error signing up with email:', error)
      throw error
    }
  }

  /**
   * Créer un compte administrateur avec le rôle 'admin' directement attribué
   */
  static async signUpAdminWithEmail(email: string, password: string, displayName?: string) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await this.ensureUserInTenant(result.user, 'admin', displayName)
      return result.user
    } catch (error) {
      console.error('Error signing up admin with email:', error)
      throw error
    }
  }

  static async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await this.ensureUserInTenant(result.user)
      return result.user
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  static async signOut() {
    try {
  try { multiUserService.setShutdownReason('signout') } catch {}
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback)
  }

  /**
   * Assure qu'un utilisateur existe dans le tenant (création automatique si nécessaire)
   */
  private static async ensureUserInTenant(
    user: User, 
    defaultRole: 'admin' | 'editor' | 'viewer' | 'collaborateur' = 'viewer',
    displayName?: string
  ) {
    const userRef = ref(rtdb, `tenants/${this.currentTenantId}/users/${user.uid}`)
    const userSnapshot = await get(userRef)

    if (!userSnapshot.exists()) {
      // Construire les données utilisateur sans displayName si undefined
      const email = (user.email || '').toLowerCase()
      
      // Priorité 1: Utiliser le rôle par défaut explicitement fourni (pour les créations admin)
      // Priorité 2: Vérifier si l'email est dans la liste des admins (fallback)
      let finalRole = defaultRole
      if (defaultRole === 'viewer' && this.adminEmails.includes(email)) {
        finalRole = 'admin'
      }
      
      const tenantData: any = {
        uid: user.uid,
        role: finalRole,
        email: user.email!,
        createdAt: Date.now(),
        lastAccess: Date.now()
      }
      // Ajouter displayName uniquement si défini
      const name = displayName || user.displayName
      if (name) {
        tenantData.displayName = name
      }
      await set(userRef, tenantData)
      
      console.log(`✅ Utilisateur créé avec rôle: ${finalRole} (email: ${email})`)
    } else {
      // Update last access
      await update(userRef, { lastAccess: Date.now() })
    }
  }

  static async getUserRole(userId: string): Promise<TenantUser | null> {
    try {
      const userRef = ref(rtdb, `tenants/${this.currentTenantId}/users/${userId}`)
      const userSnapshot = await get(userRef)
      return userSnapshot.exists() ? userSnapshot.val() as TenantUser : null
    } catch (error) {
      console.error('Error getting user role:', error)
      return null
    }
  }

  static async updateUserRole(userId: string, role: 'admin' | 'editor' | 'viewer' | 'collaborateur') {
    try {
      const userRef = ref(rtdb, `tenants/${this.currentTenantId}/users/${userId}`)
      await update(userRef, { role })
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }

  /**
   * Récupère tous les utilisateurs avec le rôle admin pour le tenant actuel
   * Accessible uniquement par kdorion@thecompagnie.eu
   */
  static async getAllAdmins(requestingUserEmail: string): Promise<TenantUser[]> {
    // Restriction : seul kdorion@thecompagnie.eu peut accéder à cette fonction
    if (requestingUserEmail.toLowerCase() !== 'kdorion@thecompagnie.eu') {
      throw new Error('Accès non autorisé - Cette fonctionnalité est réservée au super administrateur')
    }

    try {
      const tenantUsersRef = ref(rtdb, `tenants/${this.currentTenantId}/users`)
      const snapshot = await get(tenantUsersRef)
      
      if (!snapshot.exists()) {
        return []
      }

      const allUsers = snapshot.val()
      const adminUsers: TenantUser[] = []

      // Filtrer uniquement les admins
      Object.keys(allUsers).forEach(userId => {
        const userData = allUsers[userId]
        if (userData.role === 'admin') {
          adminUsers.push({
            uid: userId,
            role: userData.role,
            email: userData.email,
            displayName: userData.displayName,
            createdAt: new Date(userData.createdAt),
            lastAccess: new Date(userData.lastAccess)
          })
        }
      })

      // Trier par date de création (plus récent en premier)
      return adminUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      console.error('Error fetching admin users:', error)
      throw error
    }
  }
}
