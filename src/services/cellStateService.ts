import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp, 
  writeBatch,
  getDocs
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Timestamp } from 'firebase/firestore'

// Types pour l'état des cellules
export interface CellState {
  cellId: string // collaborateurId_date
  collaborateurId: string
  date: string // YYYY-MM-DD
  status: 'hovered' | 'locked' | 'editing'
  userId: string
  userName: string
  sessionId: string
  tenantId: string
  startedAt: Timestamp
  lastActivity: Timestamp
  expiresAt: Timestamp // Auto-expiration après 3 min
  metadata?: {
    lockType?: 'editing' | 'modal'
    userAgent?: string
    currentUrl?: string
  }
}

export interface CellStateUpdate {
  status?: 'hovered' | 'locked' | 'editing'
  lastActivity?: Timestamp
  expiresAt?: Timestamp
  metadata?: any
}

type CellStateCallback = (states: Map<string, CellState>) => void

class CellStateService {
  private tenantId: string | null = null
  private userId: string | null = null
  private userName: string = ''
  private sessionId: string = this.generateSessionId()
  
  // Cache local des états
  private cellStates = new Map<string, CellState>()
  private listeners = new Set<CellStateCallback>()
  private stateListener: (() => void) | null = null
  
  // Timeouts et timers
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private localTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
  
  // Configuration
  private readonly CELL_TIMEOUT = 3 * 60 * 1000 // 3 minutes
  private readonly HOVER_TIMEOUT = 30 * 1000 // 30 secondes pour hover
  private readonly CLEANUP_INTERVAL = 60 * 1000 // Nettoyage chaque minute
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Initialiser le service
   */
  async init(tenantId: string, user: { uid: string; displayName?: string; email?: string }) {
    this.tenantId = tenantId
    this.userId = user.uid
    this.userName = user.displayName || user.email || 'Utilisateur'
    
    console.log(`🎯 CellStateService initialisé pour ${this.userName} (${this.sessionId})`)
    
    // Écouter les changements d'état des cellules
    this.setupStateListener()
    
    // Démarrer le nettoyage automatique
    this.startCleanupTimer()
    
    // Gérer la fermeture de page
    this.setupPageHandlers()
  }

  /**
   * Générer l'ID unique d'une cellule
   */
  private getCellId(collaborateurId: string, date: string): string {
    return `${collaborateurId}_${date}`
  }

  /**
   * Mettre à jour l'état d'une cellule
   */
  async setCellState(
    collaborateurId: string, 
    date: string, 
    status: 'hovered' | 'locked' | 'editing',
    metadata?: any
  ): Promise<boolean> {
    if (!this.tenantId || !this.userId) {
      console.warn('❌ Service non initialisé')
      return false
    }

    const cellId = this.getCellId(collaborateurId, date)
    const docRef = doc(db, `tenants/${this.tenantId}/cellStates`, cellId)
    
    // Calculer les timeouts selon le type
    const timeout = status === 'hovered' ? this.HOVER_TIMEOUT : this.CELL_TIMEOUT
    const expiresAt = new Date(Date.now() + timeout)
    
    try {
      const cellData: CellState = {
        cellId,
        collaborateurId,
        date,
        status,
        userId: this.userId,
        userName: this.userName,
        sessionId: this.sessionId,
        tenantId: this.tenantId,
        startedAt: serverTimestamp() as Timestamp,
        lastActivity: serverTimestamp() as Timestamp,
        expiresAt: expiresAt as any,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          currentUrl: window.location.href
        }
      }

      await setDoc(docRef, cellData)
      
      // Programmer le timeout local pour cette cellule
      this.scheduleLocalTimeout(cellId, timeout)
      
      console.log(`🎯 État cellule mis à jour: ${cellId} → ${status} (expire dans ${timeout/1000}s)`)
      return true
      
    } catch (error) {
      console.error('❌ Erreur mise à jour état cellule:', error)
      return false
    }
  }

  /**
   * Mettre à jour l'activité d'une cellule (extend timeout)
   */
  async updateCellActivity(collaborateurId: string, date: string): Promise<boolean> {
    if (!this.tenantId || !this.userId) return false

    const cellId = this.getCellId(collaborateurId, date)
    const docRef = doc(db, `tenants/${this.tenantId}/cellStates`, cellId)
    
    // Vérifier que c'est notre cellule
    const currentState = this.cellStates.get(cellId)
    if (!currentState || currentState.userId !== this.userId) {
      return false
    }
    
    try {
      const timeout = currentState.status === 'hovered' ? this.HOVER_TIMEOUT : this.CELL_TIMEOUT
      const expiresAt = new Date(Date.now() + timeout)
      
      await setDoc(docRef, {
        lastActivity: serverTimestamp(),
        expiresAt: expiresAt
      }, { merge: true })
      
      // Reprogrammer le timeout local
      this.scheduleLocalTimeout(cellId, timeout)
      
      console.log(`⏰ Activité mise à jour: ${cellId}`)
      return true
      
    } catch (error) {
      console.error('❌ Erreur update activité:', error)
      return false
    }
  }

  /**
   * Supprimer l'état d'une cellule
   */
  async clearCellState(collaborateurId: string, date: string): Promise<boolean> {
    if (!this.tenantId) return false

    const cellId = this.getCellId(collaborateurId, date)
    const docRef = doc(db, `tenants/${this.tenantId}/cellStates`, cellId)
    
    // Vérifier que c'est notre cellule ou qu'elle est expirée
    const currentState = this.cellStates.get(cellId)
    if (currentState && currentState.userId !== this.userId) {
      const isExpired = currentState.expiresAt && 
        currentState.expiresAt.toDate().getTime() < Date.now()
      
      if (!isExpired) {
        console.warn(`❌ Tentative de suppression d'une cellule d'un autre utilisateur: ${cellId}`)
        return false
      }
    }
    
    try {
      await deleteDoc(docRef)
      
      // Nettoyer le timeout local
      this.clearLocalTimeout(cellId)
      
      console.log(`🧹 État cellule supprimé: ${cellId}`)
      return true
      
    } catch (error) {
      console.error('❌ Erreur suppression état cellule:', error)
      return false
    }
  }

  /**
   * Programmer un timeout local pour auto-nettoyage
   */
  private scheduleLocalTimeout(cellId: string, timeout: number) {
    // Nettoyer l'ancien timeout si existe
    this.clearLocalTimeout(cellId)
    
    // Programmer le nouveau timeout
    const timeoutId = setTimeout(async () => {
      console.log(`⏰ Timeout local atteint pour ${cellId}`)
      await this.clearCellState(cellId.split('_')[0], cellId.split('_')[1])
    }, timeout + 1000) // +1s de marge pour éviter les conflits avec le serveur
    
    this.localTimeouts.set(cellId, timeoutId)
  }

  /**
   * Nettoyer un timeout local
   */
  private clearLocalTimeout(cellId: string) {
    const timeoutId = this.localTimeouts.get(cellId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.localTimeouts.delete(cellId)
    }
  }

  /**
   * Écouter les changements d'état des cellules
   */
  private setupStateListener() {
    if (!this.tenantId) return

    const statesQuery = query(
      collection(db, `tenants/${this.tenantId}/cellStates`)
    )

    this.stateListener = onSnapshot(statesQuery, (snapshot: any) => {
      console.log(`📡 Snapshot états cellules reçu: ${snapshot.size} état(s)`)
      
      const newStates = new Map<string, CellState>()
      const now = Date.now()
      
      snapshot.forEach((doc: any) => {
        const data = doc.data() as CellState
        
        // Vérifier si l'état n'est pas expiré
        const expiresAt = data.expiresAt?.toDate?.()?.getTime() || 0
        
        if (now < expiresAt) {
          newStates.set(data.cellId, data)
        } else {
          // État expiré - le supprimer si c'est le nôtre
          if (data.userId === this.userId) {
            console.log(`⏰ État expiré détecté: ${data.cellId}`)
            deleteDoc(doc.ref).catch((e: any) => console.warn('Erreur suppression état expiré:', e))
          }
        }
      })
      
      // Mettre à jour le cache local
      this.cellStates = newStates
      
      // Notifier les listeners
      this.notifyListeners()
      
      console.log(`📊 Total états actifs: ${newStates.size}`)
    })
  }

  /**
   * S'abonner aux changements d'état
   */
  onStateChange(callback: CellStateCallback): () => void {
    this.listeners.add(callback)
    
    // Appel initial
    callback(this.cellStates)
    
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Notifier tous les listeners
   */
  private notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.cellStates)
      } catch (error) {
        console.error('❌ Erreur dans callback état cellule:', error)
      }
    })
  }

  /**
   * Vérifier si une cellule est utilisée
   */
  isCellBusy(collaborateurId: string, date: string): boolean {
    const cellId = this.getCellId(collaborateurId, date)
    const state = this.cellStates.get(cellId)
    
    if (!state) return false
    
    // Vérifier si pas expiré
    const isExpired = state.expiresAt && 
      state.expiresAt.toDate().getTime() < Date.now()
    
    return !isExpired
  }

  /**
   * Obtenir l'état d'une cellule
   */
  getCellState(collaborateurId: string, date: string): CellState | null {
    const cellId = this.getCellId(collaborateurId, date)
    const state = this.cellStates.get(cellId)
    
    if (!state) return null
    
    // Vérifier si pas expiré
    const isExpired = state.expiresAt && 
      state.expiresAt.toDate().getTime() < Date.now()
    
    return isExpired ? null : state
  }

  /**
   * Vérifier si une cellule est verrouillée par un autre utilisateur
   */
  isCellLockedByOther(collaborateurId: string, date: string): boolean {
    const state = this.getCellState(collaborateurId, date)
    return state !== null && 
           state.userId !== this.userId && 
           (state.status === 'locked' || state.status === 'editing')
  }

  /**
   * Obtenir tous les états actifs
   */
  getAllStates(): Map<string, CellState> {
    return new Map(this.cellStates)
  }

  /**
   * Nettoyage automatique des états expirés
   */
  private startCleanupTimer() {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredStates()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Nettoyer les états expirés
   */
  private async cleanupExpiredStates() {
    if (!this.tenantId) return

    try {
      const statesQuery = query(collection(db, `tenants/${this.tenantId}/cellStates`))
      const snapshot = await getDocs(statesQuery)
      const batch = writeBatch(db)
      const now = Date.now()
      let deletedCount = 0

      snapshot.forEach((doc: any) => {
        const data = doc.data() as CellState
        const expiresAt = data.expiresAt?.toDate?.()?.getTime() || 0
        
        if (now >= expiresAt) {
          batch.delete(doc.ref)
          deletedCount++
        }
      })

      if (deletedCount > 0) {
        await batch.commit()
        console.log(`🧹 ${deletedCount} état(s) expiré(s) nettoyé(s)`)
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage états expirés:', error)
    }
  }

  /**
   * Nettoyer tous les états de cette session
   */
  private async cleanupSessionStates() {
    if (!this.tenantId || !this.sessionId) return

    try {
      const statesQuery = query(
        collection(db, `tenants/${this.tenantId}/cellStates`),
        where('sessionId', '==', this.sessionId)
      )
      
      const snapshot = await getDocs(statesQuery)
      const batch = writeBatch(db)
      let deletedCount = 0

      snapshot.forEach((doc: any) => {
        batch.delete(doc.ref)
        deletedCount++
      })

      if (deletedCount > 0) {
        await batch.commit()
        console.log(`🧹 ${deletedCount} état(s) de session supprimé(s)`)
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage états session:', error)
    }
  }

  /**
   * Gérer les événements de fermeture/changement de page
   */
  private setupPageHandlers() {
    // Nettoyage à la fermeture
    window.addEventListener('beforeunload', () => {
      this.destroy()
    })

    // Nettoyage lors du changement de visibilité
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Ne pas nettoyer immédiatement, mais marquer comme inactif
        console.log('📱 Page cachée - états maintenus')
      } else {
        console.log('📱 Page visible - reprise activité')
      }
    })

    // Nettoyage lors du changement de hash/URL
    window.addEventListener('hashchange', () => {
      console.log('🔄 Changement URL détecté')
      // Optionnel: nettoyer selon la logique métier
    })
  }

  /**
   * Détruire le service
   */
  async destroy() {
    console.log(`🔴 Destruction CellStateService session ${this.sessionId}`)
    
    // Arrêter les timers
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Nettoyer tous les timeouts locaux
    this.localTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.localTimeouts.clear()

    // Arrêter le listener
    if (this.stateListener) {
      this.stateListener()
      this.stateListener = null
    }

    // Nettoyer tous les états de cette session
    await this.cleanupSessionStates()

    // Vider les caches
    this.cellStates.clear()
    this.listeners.clear()
    
    this.tenantId = null
    this.userId = null
  }

  getSessionId(): string {
    return this.sessionId
  }

  getCurrentUserId(): string | null {
    return this.userId
  }

  /**
   * Méthodes de debug et statistiques
   */
  getStats() {
    const states = Array.from(this.cellStates.values())
    
    return {
      totalStates: states.length,
      myStates: states.filter(s => s.userId === this.userId).length,
      othersStates: states.filter(s => s.userId !== this.userId).length,
      byStatus: {
        hovered: states.filter(s => s.status === 'hovered').length,
        locked: states.filter(s => s.status === 'locked').length,
        editing: states.filter(s => s.status === 'editing').length
      },
      localTimeouts: this.localTimeouts.size,
      sessionId: this.sessionId,
      userId: this.userId
    }
  }

  debugState() {
    console.log('🔍 État CellStateService:', this.getStats())
    console.log('📋 États détaillés:', Array.from(this.cellStates.entries()))
  }
}

// Export singleton
export const cellStateService = new CellStateService()
