import { 
  doc, 
  collection, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  query,
  where,
  deleteDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'

  // Types simplifiés selon nouvelle méthodologie
export interface UserPresence {
  uid: string
  displayName: string
  email: string
  sessionId: string
  lastSeen: any // Timestamp ou FieldValue
  status: 'online' | 'offline'
  presenceState: 'active' | 'idle' | 'background' // États internes sans création/suppression
  hoveredCell?: {
    collaborateurId: string
    date: string
  } | null
}

export type PresenceCallback = (users: UserPresence[]) => void

/**
 * Service de présence selon méthodologie "Session Heartbeat avec États"
 * - Une session unique par onglet avec heartbeat constant
 * - Changements d'état internes seulement (pas de création/suppression)
 * - États: active (utilisation), idle (inactif), background (onglet caché)
 */
class PresenceService {
  private tenantId: string | null = null
  private currentUser: UserPresence | null = null
  private sessionId: string = this.generateSessionId()
  private presenceRef: any = null
  private presenceListener: Unsubscribe | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private presenceCallbacks = new Set<PresenceCallback>()
  private otherUsers: UserPresence[] = []
  
  // Configuration stable selon recherche
  private readonly HEARTBEAT_INTERVAL = 5000 // 5s heartbeat constant
  private readonly SESSION_TIMEOUT = 30000 // 30s timeout pour tolérer réseau
  private readonly IDLE_THRESHOLD = 15000 // 15s sans activité = état idle
  private readonly HOVER_THROTTLE = 100 // 100ms throttle pour hover
  
  // État local simple
  private lastActivityTime = Date.now()
  private lastHoverUpdate = 0
  private lastHoveredCell: { collaborateurId: string; date: string } | null = null
  private isDestroyed = false
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async init(tenantId: string, user: { uid: string; email?: string; displayName?: string }) {
    if (this.tenantId) {
      console.warn('⚠️ Service déjà initialisé')
      return
    }

    this.tenantId = tenantId
    
    // Créer la session utilisateur avec état initial 'active'
    this.currentUser = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
      email: user.email || '',
      sessionId: this.sessionId,
      lastSeen: serverTimestamp(),
      status: 'online',
      presenceState: 'active'
    }

    // Référence Firestore unique pour cette session
    this.presenceRef = doc(db, `tenants/${this.tenantId}/presence/${this.sessionId}`)
    
    console.log(`🟢 Session initialisée: ${this.sessionId} pour ${this.currentUser?.displayName}`)

    // Créer la session en base
    await this.presenceRef.set(this.currentUser)
    
    // Démarrer heartbeat et listeners
    this.startHeartbeat()
    this.setupPresenceListener()
    this.setupVisibilityHandlers()
    
    console.log(`✅ Service de présence actif (méthodologie Session Heartbeat)`)
  }

  /**
   * Heartbeat constant - méthodologie recommandée
   * Maintient la session en vie avec updates réguliers
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isDestroyed && this.presenceRef && this.currentUser) {
        // Update simple avec timestamp
        await this.presenceRef.update({
          lastSeen: serverTimestamp(),
          status: 'online'
        })
        
        // Vérifier si passage en idle
        const timeSinceActivity = Date.now() - this.lastActivityTime
        if (timeSinceActivity > this.IDLE_THRESHOLD && this.currentUser.presenceState === 'active') {
          await this.setPresenceState('idle')
        }
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  /**
   * Changer l'état de présence interne (sans création/suppression)
   */
  private async setPresenceState(state: 'active' | 'idle' | 'background') {
    if (!this.presenceRef || !this.currentUser) return
    
    this.currentUser.presenceState = state
    await this.presenceRef.update({
      presenceState: state,
      lastSeen: serverTimestamp()
    })
    
    console.log(`🔄 État de présence: ${state}`)
  }

  /**
   * Gestion des changements de visibilité d'onglet
   */
  private setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      // Utiliser une fonction async IIFE pour éviter l'erreur de listener
      (async () => {
        try {
          if (document.hidden) {
            await this.setPresenceState('background')
          } else {
            await this.setPresenceState('active')
            this.markActivity()
          }
        } catch (error) {
          console.warn('Erreur lors du changement de visibilité:', error)
        }
      })()
    })
  }

  /**
   * Marquer une activité utilisateur
   */
  markActivity() {
    this.lastActivityTime = Date.now()
    
    // Si on était idle, repasser en actif
    if (this.currentUser?.presenceState === 'idle') {
      this.setPresenceState('active')
    }
  }

  /**
   * Hover sur une cellule avec throttling
   */
  async setHoveredCell(collaborateurId: string, date: string) {
    const now = Date.now()
    if (now - this.lastHoverUpdate < this.HOVER_THROTTLE) {
      return // Throttling
    }
    this.lastHoverUpdate = now
    
    this.lastHoveredCell = { collaborateurId, date }
    this.markActivity()
    
    if (this.presenceRef) {
      await this.presenceRef.update({
        hoveredCell: { collaborateurId, date },
        lastSeen: serverTimestamp()
      })
    }
  }

  /**
   * Nettoyer le hover
   */
  async clearHoveredCell() {
    this.lastHoveredCell = null
    
    if (this.presenceRef) {
      await this.presenceRef.update({
        hoveredCell: null,
        lastSeen: serverTimestamp()
      })
    }
  }

  /**
   * Écouter les autres utilisateurs présents
   */
  private setupPresenceListener() {
    if (!this.tenantId) return

    const presenceQuery = query(
      collection(db, `tenants/${this.tenantId}/presence`),
      where('status', '==', 'online')
    )

    this.presenceListener = onSnapshot(presenceQuery, (snapshot) => {
      const users: UserPresence[] = []
      const now = Date.now()

      snapshot.forEach((doc) => {
        const data = doc.data() as UserPresence
        
        // Filtrer notre propre session
        if (data.sessionId === this.sessionId) return
        
        // Filtrer les sessions expirées
        const lastSeen = data.lastSeen?.toDate?.()?.getTime() || 0
        if (now - lastSeen < this.SESSION_TIMEOUT && data.presenceState !== 'background') {
          users.push(data)
        }
      })

      this.otherUsers = users
      this.notifyPresenceCallbacks(users)
    })
  }

  /**
   * S'abonner aux changements de présence
   */
  onPresenceChange(callback: PresenceCallback): () => void {
    this.presenceCallbacks.add(callback)
    
    // Appel initial
    callback(this.otherUsers)
    
    // Retourner fonction de nettoyage
    return () => {
      this.presenceCallbacks.delete(callback)
    }
  }

  private notifyPresenceCallbacks(users: UserPresence[]) {
    this.presenceCallbacks.forEach(callback => {
      try {
        callback(users)
      } catch (error) {
        console.error('❌ Erreur dans callback de présence:', error)
      }
    })
  }

  /**
   * Nettoyage propre lors de la fermeture
   */
  async destroy() {
    this.isDestroyed = true
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    if (this.presenceListener) {
      this.presenceListener()
      this.presenceListener = null
    }
    
    // Supprimer la session de la base
    if (this.presenceRef) {
      try {
        await deleteDoc(this.presenceRef)
        console.log(`🗑️ Session supprimée: ${this.sessionId}`)
      } catch (error) {
        console.error('❌ Erreur suppression session:', error)
      }
    }
    
    this.presenceCallbacks.clear()
    this.currentUser = null
    this.tenantId = null
    
    console.log(`🔴 Service de présence arrêté`)
  }

  /**
   * Nettoyage des sessions expirées (maintenance)
   */
  async cleanupExpiredSessions() {
    if (!this.tenantId) return

    const expiredThreshold = Date.now() - this.SESSION_TIMEOUT
    const presenceQuery = query(collection(db, `tenants/${this.tenantId}/presence`))
    
    try {
      const snapshot = await getDocs(presenceQuery)
      const batch = writeBatch(db)
      let deletedCount = 0

      snapshot.forEach((doc) => {
        const data = doc.data()
        const lastSeen = data.lastSeen?.toDate?.()?.getTime() || 0
        
        if (lastSeen < expiredThreshold) {
          batch.delete(doc.ref)
          deletedCount++
        }
      })

      if (deletedCount > 0) {
        await batch.commit()
        console.log(`🧹 ${deletedCount} sessions expirées nettoyées`)
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage sessions:', error)
    }
  }

  // Getters pour compatibilité
  getCurrentUser(): UserPresence | null {
    return this.currentUser
  }

  getOtherUsers(): UserPresence[] {
    return this.otherUsers
  }

  getSessionId(): string {
    return this.sessionId
  }
}

// Export singleton
export const presenceService = new PresenceService()

// Auto-nettoyage périodique
if (typeof window !== 'undefined') {
  // Nettoyage toutes les 5 minutes
  setInterval(() => {
    presenceService.cleanupExpiredSessions()
  }, 5 * 60 * 1000)
  
  // Nettoyage à la fermeture
  window.addEventListener('beforeunload', () => {
    presenceService.destroy()
  })
}
