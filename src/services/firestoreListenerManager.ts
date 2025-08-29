import { 
  onSnapshot, 
  Query, 
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'

/**
 * Gestionnaire centralisé des listeners Firestore
 * pour éviter la prolifération de listeners et optimiser les performances
 */
class FirestoreListenerManager {
  private listeners: Map<string, {
    unsubscribe: Unsubscribe
    refCount: number
    lastAccess: number
    callbacks: Set<(snapshot: any) => void>
  }> = new Map()

  private readonly MAX_LISTENERS = 8  // Limite stricte
  private readonly CLEANUP_INTERVAL = 30000  // 30s
  private cleanupTimer?: ReturnType<typeof setInterval>

  constructor() {
    this.startCleanupTimer()
  }

  /**
   * Abonner à un document ou query avec déduplication automatique
   */
  subscribe(
    queryOrRef: Query | DocumentReference,
    callback: (snapshot: QuerySnapshot | DocumentSnapshot) => void,
    listenerId?: string
  ): string {
    // Générer un ID unique basé sur la requête
    const id = listenerId || this.generateListenerId(queryOrRef)
    
    // Si le listener existe déjà, ajouter le callback
    if (this.listeners.has(id)) {
      const listener = this.listeners.get(id)!
      listener.callbacks.add(callback)
      listener.refCount++
      listener.lastAccess = Date.now()
      console.log(`📡 Réutilisation listener existant: ${id} (refs: ${listener.refCount})`)
      return id
    }

    // Vérifier la limite de listeners
    if (this.listeners.size >= this.MAX_LISTENERS) {
      this.cleanupOldListeners()
      
      // Si toujours au maximum, forcer le nettoyage
      if (this.listeners.size >= this.MAX_LISTENERS) {
        console.warn('⚠️ Limite de listeners atteinte, nettoyage forcé')
        this.forceCleanup()
      }
    }

    // Créer un nouveau listener
    const callbacks = new Set([callback])
    
    const unsubscribe = onSnapshot(queryOrRef as any, (snapshot: QuerySnapshot | DocumentSnapshot) => {
      // Notifier tous les callbacks abonnés
      callbacks.forEach(cb => {
        try {
          cb(snapshot)
        } catch (error) {
          console.error('❌ Erreur dans callback listener:', error)
        }
      })
    }, (error: any) => {
      console.error('❌ Erreur Firestore listener:', error)
    })

    this.listeners.set(id, {
      unsubscribe,
      refCount: 1,
      lastAccess: Date.now(),
      callbacks
    })

    console.log(`📡 Nouveau listener créé: ${id} (total: ${this.listeners.size})`)
    return id
  }

  /**
   * Se désabonner d'un listener
   */
  unsubscribe(listenerId: string, callback?: (snapshot: any) => void): void {
    const listener = this.listeners.get(listenerId)
    if (!listener) return

    // Si un callback spécifique est fourni, le retirer
    if (callback) {
      listener.callbacks.delete(callback)
      listener.refCount--
    } else {
      // Sinon, retirer tous les callbacks
      listener.refCount = 0
      listener.callbacks.clear()
    }

    // Si plus de références, supprimer le listener
    if (listener.refCount <= 0) {
      listener.unsubscribe()
      this.listeners.delete(listenerId)
      console.log(`📡 Listener supprimé: ${listenerId} (total: ${this.listeners.size})`)
    } else {
      console.log(`📡 Listener conservé: ${listenerId} (refs: ${listener.refCount})`)
    }
  }

  /**
   * Nettoyer les listeners inutilisés
   */
  private cleanupOldListeners(): void {
    const now = Date.now()
    const TIMEOUT = 60000  // 1 minute d'inactivité

    for (const [id, listener] of this.listeners.entries()) {
      if (now - listener.lastAccess > TIMEOUT && listener.refCount === 0) {
        listener.unsubscribe()
        this.listeners.delete(id)
        console.log(`🧹 Nettoyage listener inactif: ${id}`)
      }
    }
  }

  /**
   * Forcer le nettoyage des listeners les moins utilisés
   */
  private forceCleanup(): void {
    const sorted = Array.from(this.listeners.entries())
      .sort(([,a], [,b]) => {
        // Trier par refCount puis par lastAccess
        if (a.refCount !== b.refCount) return a.refCount - b.refCount
        return a.lastAccess - b.lastAccess
      })

    // Supprimer les 2 listeners les moins utilisés
    for (let i = 0; i < Math.min(2, sorted.length); i++) {
      const [id, listener] = sorted[i]
      listener.unsubscribe()
      this.listeners.delete(id)
      console.log(`🧹 Nettoyage forcé listener: ${id}`)
    }
  }

  /**
   * Générer un ID unique pour une requête Firestore
   */
  private generateListenerId(queryOrRef: Query | DocumentReference): string {
    // Extraire le path de la requête/référence
    const path = this.extractPath(queryOrRef)
    return `listener_${path.replace(/[\/\s]/g, '_')}_${Date.now()}`
  }

  /**
   * Extraire le path d'une requête Firestore
   */
  private extractPath(queryOrRef: any): string {
    try {
      if (queryOrRef._delegate?.path) {
        return queryOrRef._delegate.path.toString()
      }
      if (queryOrRef._query?.path) {
        return queryOrRef._query.path.toString()
      }
      if (queryOrRef.path) {
        return queryOrRef.path.toString()
      }
      return 'unknown'
    } catch {
      return 'unknown'
    }
  }

  /**
   * Démarrer le timer de nettoyage périodique
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldListeners()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Obtenir les statistiques des listeners
   */
  getStats(): { 
    total: number
    active: number 
    listeners: Array<{ id: string, refCount: number, lastAccess: number }>
  } {
    return {
      total: this.listeners.size,
      active: Array.from(this.listeners.values()).filter(l => l.refCount > 0).length,
      listeners: Array.from(this.listeners.entries()).map(([id, listener]) => ({
        id,
        refCount: listener.refCount,
        lastAccess: listener.lastAccess
      }))
    }
  }

  /**
   * Nettoyer tous les listeners (à utiliser lors du unmount)
   */
  destroy(): void {
    for (const [, listener] of this.listeners.entries()) {
      listener.unsubscribe()
    }
    this.listeners.clear()
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    
    console.log('🧹 FirestoreListenerManager détruit')
  }
}

// Instance singleton
export const firestoreListenerManager = new FirestoreListenerManager()

// Hook Vue pour utiliser le gestionnaire de listeners
export function useFirestoreListener() {
  return {
    subscribe: firestoreListenerManager.subscribe.bind(firestoreListenerManager),
    unsubscribe: firestoreListenerManager.unsubscribe.bind(firestoreListenerManager),
    getStats: firestoreListenerManager.getStats.bind(firestoreListenerManager)
  }
}
