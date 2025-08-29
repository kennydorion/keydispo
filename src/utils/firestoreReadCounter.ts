import { getDocs, onSnapshot } from 'firebase/firestore'

// AUDIT FIRESTORE - Version simple pour mesurer la consommation
export class FirestoreReadCounter {
  private static instance: FirestoreReadCounter
  private readCount = 0
  private operations: Array<{
    timestamp: number
    operation: string
    collection: string
    size: number
  }> = []

  private constructor() {
    console.log('🔍 FirestoreReadCounter initialisé')
  }

  static getInstance(): FirestoreReadCounter {
    if (!FirestoreReadCounter.instance) {
      FirestoreReadCounter.instance = new FirestoreReadCounter()
    }
    return FirestoreReadCounter.instance
  }

  trackSnapshot(collection: string, snapshotSize: number) {
    this.readCount += snapshotSize
    this.operations.push({
      timestamp: Date.now(),
      operation: 'onSnapshot',
      collection,
      size: snapshotSize
    })
    
    console.log(`📊 [onSnapshot] ${collection}: +${snapshotSize} lectures (Total: ${this.readCount})`)
    
    if (this.readCount > 1000) {
      console.warn(`🚨 ALERTE: ${this.readCount} lectures Firestore!`)
    }
  }

  trackGetDocs(collection: string, snapshotSize: number) {
    this.readCount += snapshotSize
    this.operations.push({
      timestamp: Date.now(),
      operation: 'getDocs',
      collection,
      size: snapshotSize
    })
    
    console.log(`📊 [getDocs] ${collection}: +${snapshotSize} lectures (Total: ${this.readCount})`)
    
    if (this.readCount > 1000) {
      console.warn(`🚨 ALERTE: ${this.readCount} lectures Firestore!`)
    }
  }

  getStats() {
    const stats = {
      totalReads: this.readCount,
      operationsByCollection: {} as Record<string, number>,
      operationsByType: {} as Record<string, number>,
      recentOperations: this.operations.slice(-20)
    }
    
    this.operations.forEach(op => {
      stats.operationsByCollection[op.collection] = (stats.operationsByCollection[op.collection] || 0) + op.size
      stats.operationsByType[op.operation] = (stats.operationsByType[op.operation] || 0) + op.size
    })
    
    console.group('📊 STATISTIQUES FIRESTORE')
    console.log('Total lectures:', this.readCount)
    console.table(stats.operationsByCollection)
    console.table(stats.operationsByType)
    console.groupEnd()
    
    return stats
  }

  reset() {
    this.readCount = 0
    this.operations = []
    console.log('🔄 Compteur Firestore réinitialisé')
  }
}

// Instance globale accessible
export const firestoreCounter = FirestoreReadCounter.getInstance()

// Helper pour debug en console
;(window as any).checkFirestoreUsage = () => firestoreCounter.getStats()
;(window as any).resetFirestoreCounter = () => firestoreCounter.reset()
