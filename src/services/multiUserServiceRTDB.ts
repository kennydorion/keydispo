/**
 * Service multi-utilisateur simplifié basé sur RTDB
 * 
 * Version simplifiée du multiUserService qui utilise uniquement RTDB
 * pour éviter les coûts Firestore
 */

import { 
  ref,
  push,
  set,
  update,
  remove,
  get,
  onValue,
  off,
  serverTimestamp
} from 'firebase/database'
import { rtdb } from './firebase'

// ==========================================
// TYPES ET INTERFACES
// ==========================================

export interface UserSession {
  sessionId: string
  userId: string
  userName: string
  userEmail: string
  tenantId: string
  
  // État de la session
  status: 'online' | 'idle' | 'background' | 'offline'
  lastActivity: number
  connectedAt: number
  expiresAt: number
  
  // Métadonnées
  userAgent?: string
  ipAddress?: string
  deviceInfo?: string
}

export interface CellActivity {
  userId: string
  userName: string
  cellId: string
  action: 'hover' | 'select' | 'edit' | 'lock'
  startedAt: number
  lastUpdate: number
  expiresAt: number
  
  // Données spécifiques à l'action
  data?: Record<string, any>
}

export interface CellLock {
  cellId: string
  userId: string
  userName: string
  startedAt: number
  lastUpdate: number
  expiresAt: number
  lockType: 'soft' | 'hard'
}

// ==========================================
// SERVICE PRINCIPAL
// ==========================================

class MultiUserServiceRTDB {
  private currentTenant: string = ''
  private currentSession: UserSession | null = null
  private sessionRef: any = null
  private listeners: Map<string, any> = new Map()
  private cleanupTimer: NodeJS.Timeout | null = null
  
  // Configuration
  private readonly SESSION_DURATION = 30 * 60 * 1000 // 30 minutes
  private readonly ACTIVITY_TIMEOUT = 2 * 60 * 1000 // 2 minutes
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 1 minute
  
  // ==========================================
  // GESTION DES SESSIONS
  // ==========================================
  
  async startSession(userId: string, userName: string, userEmail: string, tenantId: string): Promise<string> {
    try {
      this.currentTenant = tenantId
      
      // Créer une nouvelle session
      const sessionsRef = ref(rtdb, `tenants/${tenantId}/sessions`)
      const sessionRef = push(sessionsRef)
      const sessionId = sessionRef.key!
      
      const session: UserSession = {
        sessionId,
        userId,
        userName,
        userEmail,
        tenantId,
        status: 'online',
        lastActivity: Date.now(),
        connectedAt: Date.now(),
        expiresAt: Date.now() + this.SESSION_DURATION
      }
      
      await set(sessionRef, session)
      
      this.currentSession = session
      this.sessionRef = sessionRef
      
      // Démarrer le heartbeat
      this.startHeartbeat()
      
      // Démarrer le nettoyage automatique
      this.startCleanupTimer()
      
      console.log('✅ Session multi-utilisateur RTDB démarrée:', sessionId)
      return sessionId
      
    } catch (error) {
      console.error('❌ Erreur lors du démarrage de session RTDB:', error)
      throw error
    }
  }
  
  async updateActivity() {
    if (!this.currentSession || !this.sessionRef) return
    
    try {
      const now = Date.now()
      await update(this.sessionRef, {
        lastActivity: now,
        expiresAt: now + this.SESSION_DURATION,
        status: 'online'
      })
    } catch (error) {
      console.error('❌ Erreur mise à jour activité:', error)
    }
  }
  
  async endSession() {
    if (!this.sessionRef) return
    
    try {
      await remove(this.sessionRef)
      this.currentSession = null
      this.sessionRef = null
      
      // Arrêter les timers
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer)
        this.cleanupTimer = null
      }
      
      console.log('✅ Session RTDB terminée')
      
    } catch (error) {
      console.error('❌ Erreur fin de session:', error)
    }
  }
  
  // ==========================================
  // GESTION DES PRÉSENCES
  // ==========================================
  
  onActiveUsers(tenantId: string, callback: (users: UserSession[]) => void): () => void {
    const sessionsRef = ref(rtdb, `tenants/${tenantId}/sessions`)
    
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const sessions: UserSession[] = []
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        const now = Date.now()
        
        Object.values(data).forEach((session: any) => {
          // Filtrer les sessions expirées
          if (session.expiresAt > now) {
            sessions.push(session)
          }
        })
      }
      
      callback(sessions)
    })
    
    return () => off(sessionsRef, 'value', unsubscribe)
  }
  
  // ==========================================
  // GESTION DES VERROUS CELLULES
  // ==========================================
  
  async lockCell(collaborateurId: string, date: string, lockType: 'soft' | 'hard' = 'soft'): Promise<boolean> {
    if (!this.currentSession) return false
    
    try {
      const cellId = `${collaborateurId}-${date}`
      const lockRef = ref(rtdb, `tenants/${this.currentTenant}/locks/${cellId}`)
      
      // Vérifier si déjà verrouillé
      const existing = await get(lockRef)
      if (existing.exists() && existing.val().userId !== this.currentSession.userId) {
        return false // Déjà verrouillé par quelqu'un d'autre
      }
      
      const lock: CellLock = {
        cellId,
        userId: this.currentSession.userId,
        userName: this.currentSession.userName,
        startedAt: Date.now(),
        lastUpdate: Date.now(),
        expiresAt: Date.now() + this.ACTIVITY_TIMEOUT,
        lockType
      }
      
      await set(lockRef, lock)
      return true
      
    } catch (error) {
      console.error('❌ Erreur verrouillage cellule:', error)
      return false
    }
  }
  
  async unlockCell(collaborateurId: string, date: string): Promise<void> {
    if (!this.currentSession) return
    
    try {
      const cellId = `${collaborateurId}-${date}`
      const lockRef = ref(rtdb, `tenants/${this.currentTenant}/locks/${cellId}`)
      
      // Vérifier que c'est notre verrou
      const existing = await get(lockRef)
      if (existing.exists() && existing.val().userId === this.currentSession.userId) {
        await remove(lockRef)
      }
      
    } catch (error) {
      console.error('❌ Erreur déverrouillage cellule:', error)
    }
  }
  
  // ==========================================
  // UTILITAIRES PRIVÉS
  // ==========================================
  
  private startHeartbeat() {
    setInterval(() => {
      this.updateActivity()
    }, 30000) // Toutes les 30 secondes
  }
  
  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredData()
    }, this.CLEANUP_INTERVAL)
  }
  
  private async cleanupExpiredData() {
    if (!this.currentTenant) return
    
    try {
      const now = Date.now()
      
      // Nettoyer les sessions expirées
      const sessionsRef = ref(rtdb, `tenants/${this.currentTenant}/sessions`)
      const sessionsSnapshot = await get(sessionsRef)
      
      if (sessionsSnapshot.exists()) {
        const updates: Record<string, null> = {}
        const sessions = sessionsSnapshot.val()
        
        Object.entries(sessions).forEach(([sessionId, session]: [string, any]) => {
          if (session.expiresAt <= now) {
            updates[sessionId] = null
          }
        })
        
        if (Object.keys(updates).length > 0) {
          await update(sessionsRef, updates)
        }
      }
      
      // Nettoyer les verrous expirés
      const locksRef = ref(rtdb, `tenants/${this.currentTenant}/locks`)
      const locksSnapshot = await get(locksRef)
      
      if (locksSnapshot.exists()) {
        const updates: Record<string, null> = {}
        const locks = locksSnapshot.val()
        
        Object.entries(locks).forEach(([lockId, lock]: [string, any]) => {
          if (lock.expiresAt <= now) {
            updates[lockId] = null
          }
        })
        
        if (Object.keys(updates).length > 0) {
          await update(locksRef, updates)
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur nettoyage RTDB:', error)
    }
  }
  
  // ==========================================
  // MÉTHODES DE COMPATIBILITÉ
  // ==========================================
  
  setShutdownReason(reason: string) {
    console.log('🔄 Shutdown reason RTDB:', reason)
  }
  
  // Méthodes vides pour compatibilité avec l'ancien service
  async notifyUserInteraction() { /* Compatible mais vide */ }
  async updateUserStatus() { /* Compatible mais vide */ }
  onCellHover() { return () => {} }
  onCellLeave() { return () => {} }
  getCellPresence() { return [] }
}

// ==========================================
// EXPORT SINGLETON
// ==========================================

export const multiUserService = new MultiUserServiceRTDB()
