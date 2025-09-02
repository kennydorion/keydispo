/**
 * CACHE D'URGENCE FIRESTORE
 * Cache local temporaire pour réduire les lectures répétées
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  key: string
}

export class EmergencyFirestoreCache {
  private static instance: EmergencyFirestoreCache
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 30 * 1000 // OPTIMISATION: 30 secondes au lieu de 5 minutes
  private readonly MAX_CACHE_SIZE = 20 // OPTIMISATION: Limite le nombre d'entrées

  static getInstance(): EmergencyFirestoreCache {
    if (!this.instance) {
      this.instance = new EmergencyFirestoreCache()
    }
    return this.instance
  }

  /**
   * Générer une clé de cache pour une requête Firestore
   */
  private generateCacheKey(collection: string, filters: any): string {
    const filtersStr = JSON.stringify(filters)
    return `${collection}_${btoa(filtersStr).slice(0, 20)}`
  }

  /**
   * Vérifier si une entrée de cache est valide
   */
  private isValid(entry: CacheEntry<any>, ttl?: number): boolean {
    const maxAge = ttl || this.DEFAULT_TTL
    return (Date.now() - entry.timestamp) < maxAge
  }

  /**
   * Mettre en cache des données Firestore
   */
  set<T>(collection: string, filters: any, data: T, ttl?: number): void {
    const key = this.generateCacheKey(collection, filters)
    
    // OPTIMISATION: Limiter la taille du cache
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Supprimer l'entrée la plus ancienne
      const oldestKey = Array.from(this.cache.keys())[0]
      if (oldestKey) {
        this.cache.delete(oldestKey)
        console.log(`🗑️ Cache plein, suppression: ${oldestKey}`)
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    })
    
    console.log(`💾 Cache Firestore: ${key} (${Array.isArray(data) ? data.length : 1} items)`)
    
    // Auto-nettoyage après TTL (réduit à 30s)
    setTimeout(() => {
      this.cache.delete(key)
    }, ttl || this.DEFAULT_TTL)
  }

  /**
   * Récupérer depuis le cache
   */
  get<T>(collection: string, filters: any, ttl?: number): T | null {
    const key = this.generateCacheKey(collection, filters)
    const entry = this.cache.get(key)
    
    if (entry && this.isValid(entry, ttl)) {
      console.log(`🎯 Cache HIT: ${key}`)
      return entry.data as T
    }
    
    if (entry) {
      console.log(`⏰ Cache EXPIRED: ${key}`)
      this.cache.delete(key)
    }
    
    return null
  }

  /**
   * Vérifier si une requête est en cache
   */
  has(collection: string, filters: any, ttl?: number): boolean {
    return this.get(collection, filters, ttl) !== null
  }

  /**
   * Invalider le cache pour une collection
   */
  invalidateCollection(collection: string): void {
    const keysToDelete: string[] = []
    
    this.cache.forEach((entry, key) => {
      if (key.startsWith(collection)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => {
      this.cache.delete(key)
      console.log(`🗑️ Cache invalidé: ${key}`)
    })
  }

  /**
   * Wrapper pour getDocs avec cache automatique
   */
  async cachedGetDocs<T>(
    collection: string,
    filters: any,
    executeQuery: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Vérifier le cache d'abord
    const cached = this.get<T>(collection, filters, ttl)
    if (cached) {
      return cached
    }
    
    // Exécuter la requête et mettre en cache
    console.log(`🔥 Requête Firestore: ${collection}`)
    const result = await executeQuery()
    this.set(collection, filters, result, ttl)
    
    return result
  }

  /**
   * Nettoyer le cache manuellement
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`🧹 Cache nettoyé: ${size} entrées supprimées`)
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    
    this.cache.forEach(entry => {
      if (this.isValid(entry)) {
        validEntries++
      } else {
        expiredEntries++
      }
    })
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: this.calculateHitRate()
    }
  }

  private hitRate = 0
  private hits = 0
  private misses = 0

  private calculateHitRate(): string {
    const total = this.hits + this.misses
    if (total === 0) return '0%'
    return `${Math.round((this.hits / total) * 100)}%`
  }

  /**
   * Précharger des données fréquemment utilisées
   */
  async preloadCommonData(loadFunction: () => Promise<void>): Promise<void> {
    try {
      console.log('🚀 Préchargement cache Firestore...')
      await loadFunction()
      console.log('✅ Préchargement terminé')
    } catch (error) {
      console.error('❌ Erreur préchargement cache:', error)
    }
  }
}

// Instance globale
export const firestoreCache = EmergencyFirestoreCache.getInstance()

// Helper pour debug
;(window as any).checkFirestoreCache = () => firestoreCache.getStats()
;(window as any).clearFirestoreCache = () => firestoreCache.clear()
