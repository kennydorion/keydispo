import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { TenantUser } from '../types'

const googleProvider = new GoogleAuthProvider()

export class AuthService {
  static currentTenantId = import.meta.env.VITE_TENANT_ID || 'default'

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
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback)
  }

  private static async ensureUserInTenant(
    user: User, 
    defaultRole: 'admin' | 'editor' | 'viewer' = 'viewer',
    displayName?: string
  ) {
    const userRef = doc(db, `tenants/${this.currentTenantId}/users/${user.uid}`)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      // Construire les données utilisateur sans displayName si undefined
      const tenantData: any = {
        uid: user.uid,
        role: defaultRole,
        email: user.email!,
        createdAt: new Date(),
        lastAccess: new Date()
      }
      // Ajouter displayName uniquement si défini
      const name = displayName || user.displayName
      if (name) {
        tenantData.displayName = name
      }
      await setDoc(userRef, tenantData)
    } else {
      // Update last access
      await setDoc(userRef, { lastAccess: new Date() }, { merge: true })
    }
  }

  static async getUserRole(userId: string): Promise<TenantUser | null> {
    try {
      const userRef = doc(db, `tenants/${this.currentTenantId}/users/${userId}`)
      const userDoc = await getDoc(userRef)
      return userDoc.exists() ? userDoc.data() as TenantUser : null
    } catch (error) {
      console.error('Error getting user role:', error)
      return null
    }
  }

  static async updateUserRole(userId: string, role: 'admin' | 'editor' | 'viewer') {
    try {
      const userRef = doc(db, `tenants/${this.currentTenantId}/users/${userId}`)
      await setDoc(userRef, { role }, { merge: true })
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }
}
