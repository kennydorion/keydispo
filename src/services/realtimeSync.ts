import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit,
  type Unsubscribe,
  type QuerySnapshot,
  type DocumentChange
} from 'firebase/firestore'
import { db } from './firebase'
import { AuthService } from './auth'

interface DisponibiliteChangeEvent {
  type: 'added' | 'modified' | 'removed'
  date: string
  disponibilite: any
  oldData?: any
}

type ChangeCallback = (changes: DisponibiliteChangeEvent[]) => void

class RealtimeSyncService {
  private activeListeners = new Map<string, Unsubscribe>()
  private changeCallbacks = new Set<ChangeCallback>()
  
  /**
   * Démarrer la synchronisation temps réel pour une plage de dates
   */
  startSyncForDateRange(dateDebut: string, dateFin: string): string {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const listenerId = `${dateDebut}_${dateFin}`
    
    // Éviter les doublons
    if (this.activeListeners.has(listenerId)) {
      console.log(`📡 Listener déjà actif pour ${dateDebut} → ${dateFin}`)
      return listenerId
    }
    
    console.log(`📡 Démarrage sync temps réel ${dateDebut} → ${dateFin}`)
    
    const disposRef = collection(db, 'dispos')
    const q = query(
      disposRef,
      where('tenantId', '==', tenantId),
      where('date', '>=', dateDebut),
      where('date', '<=', dateFin),
      orderBy('date'),
      orderBy('collaborateurId'),
      limit(150) // LIMITATION D'URGENCE: max 150 docs par listener
    )
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      this.handleSnapshotChanges(snapshot)
    }, (error) => {
      console.error('❌ Erreur listener temps réel:', error)
    })
    
    this.activeListeners.set(listenerId, unsubscribe)
    
    // Optimiser les listeners après chaque ajout
    this.optimizeListeners()
    
    return listenerId
  }
  
  /**
   * Arrêter un listener spécifique
   */
  stopSync(listenerId: string) {
    const unsubscribe = this.activeListeners.get(listenerId)
    if (unsubscribe) {
      console.log(`📡 Arrêt sync temps réel ${listenerId}`)
      unsubscribe()
      this.activeListeners.delete(listenerId)
    }
  }
  
  /**
   * Arrêter tous les listeners
   */
  stopAllSync() {
    console.log(`📡 Arrêt de tous les listeners (${this.activeListeners.size})`)
    this.activeListeners.forEach((unsubscribe) => {
      unsubscribe()
    })
    this.activeListeners.clear()
  }
  
  /**
   * S'abonner aux changements
   */
  onChanges(callback: ChangeCallback) {
    this.changeCallbacks.add(callback)
    
    // Retourner une fonction de désabonnement
    return () => {
      this.changeCallbacks.delete(callback)
    }
  }
  
  /**
   * Traiter les changements de snapshot
   */
  private handleSnapshotChanges(snapshot: QuerySnapshot) {
    const changes: DisponibiliteChangeEvent[] = []
    
    snapshot.docChanges().forEach((change: DocumentChange) => {
      const data = change.doc.data()
      const disponibilite = {
        id: change.doc.id,
        collaborateurId: data.collaborateurId,
        date: data.date,
        lieu: data.lieu || '',
        heure_debut: data.heure_debut || '',
        heure_fin: data.heure_fin || '',
        type: data.type || undefined,
        timeKind: data.timeKind || undefined,
        slots: Array.isArray(data.slots) ? data.slots : undefined,
        isFullDay: data.isFullDay ?? undefined,
        nom: data.nom || '',
        prenom: data.prenom || '',
        metier: data.metier || '',
        phone: data.phone || '',
        email: data.email || '',
        ville: data.ville || '',
        tenantId: data.tenantId,
        version: data.version || 1,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy || 'unknown'
      }
      
      changes.push({
        type: change.type,
        date: data.date,
        disponibilite,
        oldData: change.type === 'modified' ? change.doc.data() : undefined
      })
    })
    
    if (changes.length > 0) {
      console.log(`📡 ${changes.length} changement(s) détecté(s):`, changes.map(c => `${c.type}:${c.date}`))
      
      // Notifier tous les callbacks
      this.changeCallbacks.forEach(callback => {
        try {
          callback(changes)
        } catch (error) {
          console.error('❌ Erreur dans callback de changement:', error)
        }
      })
    }
  }
  
  /**
   * Optimiser les listeners : fusionner les plages qui se chevauchent
   */
  optimizeListeners() {
    const activeRanges = Array.from(this.activeListeners.keys())
    console.log(`🔧 Optimisation des listeners actifs: ${activeRanges}`)
    
    // TODO: Implémenter la fusion des plages qui se chevauchent
    // pour éviter d'avoir trop de listeners simultanés
    
    // Pour l'instant, on limite à 3 listeners maximum
    if (this.activeListeners.size > 3) {
      console.log(`⚠️ Trop de listeners (${this.activeListeners.size}), nettoyage des plus anciens`)
      const oldestListeners = Array.from(this.activeListeners.keys()).slice(0, this.activeListeners.size - 2)
      oldestListeners.forEach(listenerId => this.stopSync(listenerId))
    }
  }
  
  /**
   * Statistiques des listeners actifs
   */
  getStats() {
    return {
      activeListeners: this.activeListeners.size,
      callbacks: this.changeCallbacks.size,
      listenerIds: Array.from(this.activeListeners.keys())
    }
  }
}

// Instance singleton
export const realtimeSync = new RealtimeSyncService()
