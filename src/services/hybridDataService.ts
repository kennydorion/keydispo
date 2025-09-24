import { 
  ref as rtdbRef, 
  set as rtdbSet, 
  onValue as rtdbOnValue, 
  remove as rtdbRemove,
  serverTimestamp as rtdbServerTimestamp
} from 'firebase/database'
import { rtdb } from './firebase'
import { AuthService } from './auth'

/**
 * Service de migration pour réduire la consommation Firestore
 * Migre les données temps réel vers Realtime Database
 */
export class HybridDataService {
  private static instance: HybridDataService
  private tenantId: string
  private rtdbListeners: Map<string, () => void> = new Map()

  constructor() {
    this.tenantId = AuthService.currentTenantId || 'keydispo'
  }

  static getInstance(): HybridDataService {
    if (!this.instance) {
      this.instance = new HybridDataService()
    }
    return this.instance
  }

  // =============================================
  // SESSIONS UTILISATEURS → RTDB
  // =============================================

  /**
   * Créer/mettre à jour une session utilisateur dans RTDB
   */
  async setUserSession(userId: string, sessionData: {
    sessionId: string
    displayName: string
    status: 'online' | 'idle' | 'background'
    lastActivity: number
    currentPage?: string
    userAgent?: string
  }) {
    try {
      const sessionRef = rtdbRef(rtdb, `tenants/${this.tenantId}/sessions/${sessionData.sessionId}`)
      await rtdbSet(sessionRef, {
        ...sessionData,
        userId,
        tenantId: this.tenantId,
        timestamp: rtdbServerTimestamp(),
        lastUpdate: Date.now()
      })
      
    } catch (error) {
      console.error('❌ Erreur session RTDB:', error)
    }
  }

  /**
   * Supprimer une session utilisateur de RTDB
   */
  async removeUserSession(sessionId: string) {
    try {
      const sessionRef = rtdbRef(rtdb, `tenants/${this.tenantId}/sessions/${sessionId}`)
      await rtdbRemove(sessionRef)
      
    } catch (error) {
      console.error('❌ Erreur suppression session RTDB:', error)
    }
  }

  /**
   * Écouter les sessions en temps réel via RTDB
   */
  listenToSessions(callback: (sessions: any[]) => void): string {
    const listenerId = `sessions_${Date.now()}`
    const sessionsRef = rtdbRef(rtdb, `tenants/${this.tenantId}/sessions`)
    
    const unsubscribe = rtdbOnValue(sessionsRef, (snapshot) => {
      const sessions: any[] = []
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          sessions.push({
            sessionId: child.key,
            ...child.val()
          })
        })
      }
      
      callback(sessions)
    })

    this.rtdbListeners.set(listenerId, unsubscribe)
    return listenerId
  }

  // =============================================
  // ACTIVITÉS CELLULES → RTDB
  // =============================================

  /**
   * Enregistrer une activité cellule dans RTDB
   */
  async setCellActivity(cellId: string, activityData: {
    userId: string
    userName: string
    activityType: 'hover' | 'edit' | 'lock'
    timestamp: number
    collaborateurId: string
    date: string
  }) {
    try {
      const activityRef = rtdbRef(rtdb, `tenants/${this.tenantId}/cellActivities/${cellId}`)
      await rtdbSet(activityRef, {
        ...activityData,
        tenantId: this.tenantId,
        lastUpdate: rtdbServerTimestamp(),
        expiresAt: Date.now() + (5 * 60 * 1000) // Expire après 5 minutes
      })
      
    } catch (error) {
      console.error('❌ Erreur activité cellule RTDB:', error)
    }
  }

  /**
   * Écouter les activités cellules via RTDB
   */
  listenToCellActivities(callback: (activities: any[]) => void): string {
    const listenerId = `activities_${Date.now()}`
    const activitiesRef = rtdbRef(rtdb, `tenants/${this.tenantId}/cellActivities`)
    
    const unsubscribe = rtdbOnValue(activitiesRef, (snapshot) => {
      const activities: any[] = []
      const now = Date.now()
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const activity = child.val()
          // Filtrer les activités expirées
          if (!activity.expiresAt || activity.expiresAt > now) {
            activities.push({
              cellId: child.key,
              ...activity
            })
          }
        })
      }
      
      
      callback(activities)
    })

    this.rtdbListeners.set(listenerId, unsubscribe)
    return listenerId
  }

  // =============================================
  // PRÉSENCE UTILISATEURS → RTDB  
  // =============================================

  /**
   * Mettre à jour la présence utilisateur dans RTDB
   */
  async setUserPresence(userId: string, presenceData: {
    status: 'online' | 'idle' | 'offline'
    lastSeen: number
    currentPage?: string
    sessionCount?: number
  }) {
    try {
      const presenceRef = rtdbRef(rtdb, `tenants/${this.tenantId}/presence/${userId}`)
      await rtdbSet(presenceRef, {
        ...presenceData,
        tenantId: this.tenantId,
        lastUpdate: rtdbServerTimestamp()
      })
      
    } catch (error) {
      console.error('❌ Erreur présence RTDB:', error)
    }
  }

  /**
   * Écouter la présence utilisateurs via RTDB
   */
  listenToPresence(callback: (presence: any[]) => void): string {
    const listenerId = `presence_${Date.now()}`
    const presenceRef = rtdbRef(rtdb, `tenants/${this.tenantId}/presence`)
    
    const unsubscribe = rtdbOnValue(presenceRef, (snapshot) => {
      const presence: any[] = []
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          presence.push({
            userId: child.key,
            ...child.val()
          })
        })
      }
      
      callback(presence)
    })

    this.rtdbListeners.set(listenerId, unsubscribe)
    return listenerId
  }

  // =============================================
  // GESTION DES LISTENERS
  // =============================================

  /**
   * Arrêter un listener RTDB spécifique
   */
  stopListener(listenerId: string) {
    const unsubscribe = this.rtdbListeners.get(listenerId)
    if (unsubscribe) {
      unsubscribe()
      this.rtdbListeners.delete(listenerId)
      
    }
  }

  /**
   * Arrêter tous les listeners RTDB
   */
  stopAllListeners() {
    this.rtdbListeners.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.rtdbListeners.clear()
  }

  /**
   * Nettoyer les données expirées de RTDB
   */
  async cleanupExpiredData() {
    try {
  // placeholder pour future logique de nettoyage
      
      // Cette fonction devrait être appelée périodiquement
      // pour nettoyer les données expirées
      
    } catch (error) {
      console.error('❌ Erreur nettoyage RTDB:', error)
    }
  }
}

// Instance globale
export const hybridDataService = HybridDataService.getInstance()
