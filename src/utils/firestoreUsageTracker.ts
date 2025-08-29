// AUDIT FIRESTORE - COMPTEUR DE LECTURES
// Injecter ce code pour tracker la consommation en temps réel

class FirestoreUsageTracker {
  private readCount = 0
  private operations: Array<{timestamp: number, operation: string, collection: string, size?: number}> = []
  
  constructor() {
    this.interceptFirestoreOperations()
    console.log('🔍 FirestoreUsageTracker activé')
  }
  
  private interceptFirestoreOperations() {
    // Intercepter getDocs
    const originalGetDocs = window.firebase?.firestore?.getDocs
    if (originalGetDocs) {
      window.firebase.firestore.getDocs = async (...args: any[]) => {
        const result = await originalGetDocs.apply(window.firebase.firestore, args)
        this.trackRead('getDocs', this.extractCollectionName(args[0]), result.size)
        return result
      }
    }
    
    // Intercepter onSnapshot
    const originalOnSnapshot = window.firebase?.firestore?.onSnapshot
    if (originalOnSnapshot) {
      window.firebase.firestore.onSnapshot = (...args: any[]) => {
        const callback = args[1]
        const wrappedCallback = (snapshot: any) => {
          this.trackRead('onSnapshot', this.extractCollectionName(args[0]), snapshot.size)
          return callback(snapshot)
        }
        args[1] = wrappedCallback
        return originalOnSnapshot.apply(window.firebase.firestore, args)
      }
    }
  }
  
  private extractCollectionName(query: any): string {
    // Extraire le nom de collection de la requête
    if (query?.path) return query.path
    if (query?._query?.path?.segments) {
      return query._query.path.segments[0] || 'unknown'
    }
    return 'unknown'
  }
  
  private trackRead(operation: string, collection: string, size?: number) {
    this.readCount += size || 1
    this.operations.push({
      timestamp: Date.now(),
      operation,
      collection,
      size
    })
    
    console.log(`📊 [${operation}] ${collection}: +${size || 1} lectures (Total: ${this.readCount})`)
    
    // Alerte si on dépasse 1000 lectures
    if (this.readCount > 1000) {
      console.warn(`🚨 ALERTE: ${this.readCount} lectures Firestore!`)
    }
  }
  
  public getStats() {
    const stats = {
      totalReads: this.readCount,
      operationsByCollection: {} as Record<string, number>,
      operationsByType: {} as Record<string, number>,
      recentOperations: this.operations.slice(-10)
    }
    
    this.operations.forEach(op => {
      stats.operationsByCollection[op.collection] = (stats.operationsByCollection[op.collection] || 0) + (op.size || 1)
      stats.operationsByType[op.operation] = (stats.operationsByType[op.operation] || 0) + (op.size || 1)
    })
    
    return stats
  }
  
  public reset() {
    this.readCount = 0
    this.operations = []
    console.log('🔄 Compteur Firestore réinitialisé')
  }
}

// Activer le tracker
window.firestoreTracker = new FirestoreUsageTracker()

// Fonction helper pour les développeurs
window.checkFirestoreUsage = () => {
  const stats = window.firestoreTracker.getStats()
  console.table(stats.operationsByCollection)
  console.table(stats.operationsByType)
  console.log('📊 Statistiques complètes:', stats)
  return stats
}
