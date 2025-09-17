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
      const elevatedRole = this.adminEmails.includes(email) ? 'admin' : defaultRole
      const tenantData: any = {
        uid: user.uid,
        role: elevatedRole,
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
}
