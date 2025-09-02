
import { 
  ref as rtdbRef, 
  set as rtdbSet,
  get as rtdbGet,
  remove as rtdbRemove,
  onValue as rtdbOnValue,
  off as rtdbOff,
  query as rtdbQuery,
  orderByChild,
  equalTo,
  startAt,
  endAt,
  limitToFirst
} from 'firebase/database'
import { rtdb, auth } from './firebase'
import { AuthService } from './auth'

// Cache intelligent pour réduire les téléchargements
interface CacheEntry {
  data: DisponibiliteRTDB[]
  timestamp: number
  listeners: Set<string>
}

class RTDBCache {
  private static instance: RTDBCache
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 30000 // 30 secondes
  private readonly MAX_CACHE_SIZE = 50

  static getInstance(): RTDBCache {
    if (!this.instance) {
      this.instance = new RTDBCache()
    }
    return this.instance
  }

  get(key: string): DisponibiliteRTDB[] | null {
    const entry = this.cache.get(key)
    if (entry && Date.now() - entry.timestamp < this.CACHE_DURATION) {
      return entry.data
    }
    if (entry) {
      this.cache.delete(key) // Nettoyer le cache expiré
    }
    return null
  }

  set(key: string, data: DisponibiliteRTDB[], listenerId?: string): void {
    // Limiter la taille du cache
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.keys())[0]
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const existing = this.cache.get(key)
    const listeners = existing?.listeners || new Set<string>()
    if (listenerId) {
      listeners.add(listenerId)
    }

    this.cache.set(key, {
      data: [...data], // Clone pour éviter les mutations
      timestamp: Date.now(),
      listeners
    })
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      // Invalider les clés qui matchent le pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  removeListener(listenerId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      entry.listeners.delete(listenerId)
      if (entry.listeners.size === 0) {
        this.cache.delete(key) // Supprimer si plus d'listeners
      }
    }
  }
}

/**
 * Service de gestion des disponibilités via Realtime Database
 * Migration complète depuis Firestore pour éliminer les coûts de lecture
 */

export interface DisponibiliteRTDB {
  // Identifiants
  id: string
  collaborateurId: string
  tenantId: string
  
  // Données principales
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  note: string
  
  // Planning
  date: string // YYYY-MM-DD
  lieu: string
  heure_debut: string // HH:MM
  heure_fin: string // HH:MM
  
  // Nouvelles fonctionnalités
  type?: 'standard' | 'formation' | 'urgence' | 'maintenance'
  timeKind?: 'fixed' | 'flexible' | 'oncall'
  slots?: string[]
  isFullDay?: boolean
  
  // Métadonnées
  version: number
  updatedAt: number
  updatedBy: string
  tags?: string[]
  isArchived?: boolean
  hasConflict?: boolean
  _cont?: 'start' | 'end'
}

export class DisponibilitesRTDBService {
  private static instance: DisponibilitesRTDBService
  private tenantId: string
  private listeners: Map<string, () => void> = new Map()
  private cache: RTDBCache

  constructor() {
    this.tenantId = AuthService.currentTenantId || 'keydispo'
    this.cache = RTDBCache.getInstance()
  }

  static getInstance(): DisponibilitesRTDBService {
    if (!this.instance) {
      this.instance = new DisponibilitesRTDBService()
    }
    return this.instance
  }

  // =============================================
  // UTILITAIRES ET HELPERS OPTIMISÉS
  // =============================================

  /**
   * Générer la référence RTDB pour les disponibilités d'un tenant (structure hiérarchique)
   */
  private getDisposRef(yearMonth?: string) {
    if (yearMonth) {
      // Structure optimisée : /tenants/{tenant}/disponibilites/{YYYY-MM}/{id}
      return rtdbRef(rtdb, `tenants/${this.tenantId}/disponibilites/${yearMonth}`)
    }
    // Fallback vers l'ancienne structure pour la compatibilité
    return rtdbRef(rtdb, `tenants/${this.tenantId}/disponibilites`)
  }

  /**
   * Extraire l'année-mois d'une date (YYYY-MM)
   */
  private getYearMonth(date: string): string {
    return date.substring(0, 7) // "2025-09-15" -> "2025-09"
  }

  /**
   * Générer une clé de cache pour une plage de dates
   */
  private getCacheKey(startDate: string, endDate: string): string {
    return `dispos_${this.tenantId}_${startDate}_${endDate}`
  }

  /**
   * Obtenir tous les mois dans une plage de dates
   */
  private getMonthsInRange(startDate: string, endDate: string): string[] {
    const months: string[] = []
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    
    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    while (current <= end) {
      months.push(this.getYearMonth(current.toISOString().split('T')[0]))
      current.setMonth(current.getMonth() + 1)
    }
    
    return months
  }

  /**
   * Générer un ID unique pour une disponibilité
   */
  private generateDispoId(): string {
    return `dispo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Formater une disponibilité pour RTDB (structure plate)
   */
  private formatDispoForRTDB(dispo: Partial<DisponibiliteRTDB>): any {
    const formatted: any = {
      id: dispo.id || this.generateDispoId(),
      collaborateurId: dispo.collaborateurId || '',
      tenantId: this.tenantId,
      nom: dispo.nom || '',
      prenom: dispo.prenom || '',
      metier: dispo.metier || '',
      phone: dispo.phone || '',
      email: dispo.email || '',
      note: dispo.note || '',
      date: dispo.date || '',
      lieu: dispo.lieu || '',
      heure_debut: dispo.heure_debut || '',
      heure_fin: dispo.heure_fin || '',
      version: dispo.version || 1,
      updatedAt: Date.now(),
      updatedBy: dispo.updatedBy || auth.currentUser?.uid || 'system',
      tags: dispo.tags || [],
      isArchived: dispo.isArchived || false,
      hasConflict: dispo.hasConflict || false
    }

    // Ajouter les propriétés optionnelles seulement si elles ne sont pas undefined
    if (dispo.type !== undefined) {
      formatted.type = dispo.type
    }
    if (dispo.timeKind !== undefined) {
      formatted.timeKind = dispo.timeKind
    }
    if (dispo.slots !== undefined) {
      formatted.slots = dispo.slots
    }
    if (dispo.isFullDay !== undefined) {
      formatted.isFullDay = dispo.isFullDay
    }
    if (dispo._cont !== undefined) {
      formatted._cont = dispo._cont
    }

    return formatted
  }

  // =============================================
  // OPÉRATIONS CRUD
  // =============================================

  /**
   * Créer une nouvelle disponibilité
   */
  async createDisponibilite(dispo: Partial<DisponibiliteRTDB>): Promise<string> {
    try {
      const formattedDispo = this.formatDispoForRTDB(dispo)
      const dispoRef = rtdbRef(rtdb, `tenants/${this.tenantId}/disponibilites/${formattedDispo.id}`)
      
      await rtdbSet(dispoRef, formattedDispo)
      
      console.log(`✅ Disponibilité créée en RTDB: ${formattedDispo.id}`)
      return formattedDispo.id
    } catch (error) {
      console.error('❌ Erreur création disponibilité RTDB:', error)
      throw error
    }
  }

  /**
   * Mettre à jour une disponibilité existante
   */
  async updateDisponibilite(id: string, updates: Partial<DisponibiliteRTDB>): Promise<void> {
    try {
      // Récupérer la disponibilité existante pour incrémenter la version
      const existing = await this.getDisponibilite(id)
      if (!existing) {
        throw new Error(`Disponibilité ${id} non trouvée`)
      }

      const updatedDispo = this.formatDispoForRTDB({
        ...existing,
        ...updates,
        id,
        version: existing.version + 1
      })

      const dispoRef = rtdbRef(rtdb, `tenants/${this.tenantId}/disponibilites/${id}`)
      await rtdbSet(dispoRef, updatedDispo)
      
      console.log(`✅ Disponibilité mise à jour en RTDB: ${id}`)
    } catch (error) {
      console.error('❌ Erreur mise à jour disponibilité RTDB:', error)
      throw error
    }
  }

  /**
   * Supprimer une disponibilité
   */
  async deleteDisponibilite(id: string): Promise<void> {
    try {
      const dispoRef = rtdbRef(rtdb, `tenants/${this.tenantId}/disponibilites/${id}`)
      await rtdbRemove(dispoRef)
      
      console.log(`✅ Disponibilité supprimée de RTDB: ${id}`)
    } catch (error) {
      console.error('❌ Erreur suppression disponibilité RTDB:', error)
      throw error
    }
  }

  /**
   * Récupérer une disponibilité par ID
   */
  async getDisponibilite(id: string): Promise<DisponibiliteRTDB | null> {
    try {
      const dispoRef = rtdbRef(rtdb, `tenants/${this.tenantId}/disponibilites/${id}`)
      const snapshot = await rtdbGet(dispoRef)
      
      if (snapshot.exists()) {
        return snapshot.val() as DisponibiliteRTDB
      }
      return null
    } catch (error) {
      console.error('❌ Erreur récupération disponibilité RTDB:', error)
      return null
    }
  }

  // =============================================
  // REQUÊTES ET FILTRES
  // =============================================

  /**
   * Récupérer les disponibilités pour une plage de dates (OPTIMISÉ avec cache)
   */
  async getDisponibilitesByDateRange(startDate: string, endDate: string): Promise<DisponibiliteRTDB[]> {
    try {
      console.log('🔍 RTDB: getDisponibilitesByDateRange (OPTIMISÉ)', { startDate, endDate, tenantId: this.tenantId })
      
      // Vérifier le cache d'abord
      const cacheKey = this.getCacheKey(startDate, endDate)
      const cached = this.cache.get(cacheKey)
      if (cached) {
        console.log('⚡ Cache hit - pas de téléchargement RTDB')
        return cached.filter(d => d.date >= startDate && d.date <= endDate)
      }

      // Obtenir les mois concernés pour des requêtes ciblées
      const months = this.getMonthsInRange(startDate, endDate)
      console.log(`� Requête sur ${months.length} mois:`, months)

      const allDisponibilites: DisponibiliteRTDB[] = []

      // Requêtes parallèles par mois (plus efficace)
      const monthPromises = months.map(async (yearMonth) => {
        try {
          const monthRef = this.getDisposRef(yearMonth)
          const snapshot = await rtdbGet(monthRef)
          const monthDispos: DisponibiliteRTDB[] = []
          
          if (snapshot.exists()) {
            snapshot.forEach((child) => {
              const dispo = child.val() as DisponibiliteRTDB
              if (dispo.tenantId === this.tenantId && 
                  dispo.date >= startDate && 
                  dispo.date <= endDate) {
                monthDispos.push(dispo)
              }
            })
          }
          
          console.log(`📊 Mois ${yearMonth}: ${monthDispos.length} disponibilités`)
          return monthDispos
        } catch (monthError) {
          console.log(`⚠️ Mois ${yearMonth} non trouvé (structure optimisée pas encore utilisée)`)
          return []
        }
      })

      // Attendre toutes les requêtes mensuelles
      const monthResults = await Promise.all(monthPromises)
      monthResults.forEach(monthDispos => {
        allDisponibilites.push(...monthDispos)
      })

      // Si aucune donnée trouvée dans la nouvelle structure, utiliser l'ancienne
      if (allDisponibilites.length === 0) {
        console.log('🔄 Fallback vers structure classique')
        return this.getDisponibilitesByDateRangeFallback(startDate, endDate)
      }

      // Trier par date puis par nom
      allDisponibilites.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.nom.localeCompare(b.nom)
      })

      // Mettre en cache le résultat
      this.cache.set(cacheKey, allDisponibilites)

      console.log(`✅ RTDB optimisé: ${allDisponibilites.length} disponibilités (${months.length} mois)`)
      return allDisponibilites
      
    } catch (error) {
      console.error('❌ Erreur récupération RTDB optimisée:', error)
      return this.getDisponibilitesByDateRangeFallback(startDate, endDate)
    }
  }

  /**
   * Méthode fallback (ancienne méthode) pour compatibilité
   */
  private async getDisponibilitesByDateRangeFallback(startDate: string, endDate: string): Promise<DisponibiliteRTDB[]> {
    try {
      console.log('🔄 RTDB: Fallback vers ancienne structure')
      const disposRef = this.getDisposRef()
      const snapshot = await rtdbGet(disposRef)
      const disponibilites: DisponibiliteRTDB[] = []

      if (snapshot.exists()) {
        let totalCount = 0
        let filteredCount = 0
        
        snapshot.forEach((child) => {
          totalCount++
          const dispo = child.val() as DisponibiliteRTDB
          
          if (dispo.tenantId === this.tenantId && 
              dispo.date >= startDate && 
              dispo.date <= endDate) {
            disponibilites.push(dispo)
            filteredCount++
          }
        })

        console.log(`📊 Fallback RTDB: ${filteredCount}/${totalCount} disponibilités filtrées`)
      }

      // Mettre en cache même le fallback
      const cacheKey = this.getCacheKey(startDate, endDate)
      this.cache.set(cacheKey, disponibilites)

      return disponibilites.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.nom.localeCompare(b.nom)
      })
    } catch (error) {
      console.error('❌ Erreur fallback RTDB:', error)
      return []
    }
  }

  /**
   * Récupérer les disponibilités d'un collaborateur
   */
  async getDisponibilitesByCollaborateur(collaborateurId: string): Promise<DisponibiliteRTDB[]> {
    try {
      const disposRef = this.getDisposRef()
      const collabQuery = rtdbQuery(
        disposRef,
        orderByChild('collaborateurId'),
        equalTo(collaborateurId)
      )
      
      const snapshot = await rtdbGet(collabQuery)
      const disponibilites: DisponibiliteRTDB[] = []
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const dispo = child.val() as DisponibiliteRTDB
          if (dispo.tenantId === this.tenantId) {
            disponibilites.push(dispo)
          }
        })
      }
      
      console.log(`👤 RTDB: ${disponibilites.length} disponibilités trouvées pour collaborateur ${collaborateurId}`)
      return disponibilites
    } catch (error) {
      console.error('❌ Erreur requête collaborateur RTDB:', error)
      return []
    }
  }

  /**
   * Récupérer toutes les disponibilités (avec pagination)
   */
  async getAllDisponibilites(tenantIdParam?: string, limit?: number): Promise<DisponibiliteRTDB[]> {
    try {
      const targetTenantId = tenantIdParam || this.tenantId
      const disposRef = this.getDisposRef()
      const snapshot = await rtdbGet(disposRef)
      const disponibilites: DisponibiliteRTDB[] = []
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const dispo = child.val() as DisponibiliteRTDB
          if (dispo.tenantId === targetTenantId) {
            disponibilites.push(dispo)
          }
        })
      }
      
      // Trier par date puis par nom
      disponibilites.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.nom.localeCompare(b.nom)
      })
      
      // Appliquer la limite si spécifiée
      const result = limit ? disponibilites.slice(0, limit) : disponibilites
      
      console.log(`📊 RTDB: ${result.length} disponibilités totales (limit: ${limit || 'aucune'})`)
      return result
    } catch (error) {
      console.error('❌ Erreur récupération toutes disponibilités RTDB:', error)
      return []
    }
  }

  // =============================================
  // LISTENERS TEMPS RÉEL
  // =============================================

  /**
   * Écouter les changements de disponibilités pour une plage de dates (OPTIMISÉ)
   */
  listenToDisponibilitesByDateRange(
    startDate: string, 
    endDate: string, 
    callback: (disponibilites: DisponibiliteRTDB[]) => void
  ): string {
    const listenerId = `dispos_opt_${startDate}_${endDate}_${Date.now()}`
    
    try {
      // Vérifier si on peut utiliser la structure optimisée par mois
      const months = this.getMonthsInRange(startDate, endDate)
      const cacheKey = this.getCacheKey(startDate, endDate)
      
      // Si peu de mois (≤ 3), utiliser des listeners ciblés par mois
      if (months.length <= 3) {
        console.log(`📡 Listener RTDB optimisé par mois: ${months.length} mois`)
        
        const monthListeners: Array<() => void> = []
        const monthData = new Map<string, DisponibiliteRTDB[]>()
        
        const aggregateAndCallback = () => {
          const allDispos: DisponibiliteRTDB[] = []
          monthData.forEach(dispos => allDispos.push(...dispos))
          
          // Filtrer et trier
          const filtered = allDispos
            .filter(d => d.tenantId === this.tenantId && d.date >= startDate && d.date <= endDate)
            .sort((a, b) => {
              if (a.date !== b.date) return a.date.localeCompare(b.date)
              return a.nom.localeCompare(b.nom)
            })
          
          // Mettre en cache
          this.cache.set(cacheKey, filtered, listenerId)
          
          console.log(`🔄 Listener optimisé: ${filtered.length} disponibilités (${months.length} mois)`)
          callback(filtered)
        }
        
        // Créer un listener par mois
        months.forEach(yearMonth => {
          const monthRef = this.getDisposRef(yearMonth)
          
          const handleMonthSnapshot = (snapshot: any) => {
            const monthDispos: DisponibiliteRTDB[] = []
            
            if (snapshot.exists()) {
              snapshot.forEach((child: any) => {
                const dispo = child.val() as DisponibiliteRTDB
                if (dispo.tenantId === this.tenantId) {
                  monthDispos.push(dispo)
                }
              })
            }
            
            monthData.set(yearMonth, monthDispos)
            aggregateAndCallback()
          }
          
          rtdbOnValue(monthRef, handleMonthSnapshot)
          
          monthListeners.push(() => {
            rtdbOff(monthRef, 'value', handleMonthSnapshot)
          })
        })
        
        // Stocker le cleanup global
        this.listeners.set(listenerId, () => {
          monthListeners.forEach(cleanup => cleanup())
          this.cache.removeListener(listenerId)
        })
        
      } else {
        // Fallback vers l'ancienne méthode pour les plages trop larges
        console.log(`📡 Listener RTDB classique (${months.length} mois, trop large pour optimisation)`)
        
        const disposRef = this.getDisposRef()
        
        const handleSnapshot = (snapshot: any) => {
          const disponibilites: DisponibiliteRTDB[] = []
          
          if (snapshot.exists()) {
            snapshot.forEach((child: any) => {
              const dispo = child.val() as DisponibiliteRTDB
              if (dispo.tenantId === this.tenantId && 
                  dispo.date >= startDate && 
                  dispo.date <= endDate) {
                disponibilites.push(dispo)
              }
            })
          }
          
          disponibilites.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return a.nom.localeCompare(b.nom)
          })
          
          this.cache.set(cacheKey, disponibilites, listenerId)
          
          console.log(`🔄 Listener fallback: ${disponibilites.length} disponibilités`)
          callback(disponibilites)
        }
        
        rtdbOnValue(disposRef, handleSnapshot)
        
        this.listeners.set(listenerId, () => {
          rtdbOff(disposRef, 'value', handleSnapshot)
          this.cache.removeListener(listenerId)
        })
      }
      
      console.log(`📡 Listener RTDB optimisé créé: ${listenerId}`)
      return listenerId
      
    } catch (error) {
      console.error('❌ Erreur création listener RTDB optimisé:', error)
      return ''
    }
  }

  /**
   * Arrêter un listener spécifique
   */
  stopListener(listenerId: string): void {
    const stopFunction = this.listeners.get(listenerId)
    if (stopFunction) {
      stopFunction()
      this.listeners.delete(listenerId)
      console.log(`📡 Listener RTDB arrêté: ${listenerId}`)
    }
  }

  /**
   * Arrêter tous les listeners
   */
  stopAllListeners(): void {
    this.listeners.forEach((stopFunction, listenerId) => {
      stopFunction()
      console.log(`📡 Listener RTDB arrêté: ${listenerId}`)
    })
    this.listeners.clear()
  }

  // =============================================
  // OPÉRATIONS BATCH
  // =============================================

  /**
   * Créer plusieurs disponibilités en une fois
   */
  async createMultipleDisponibilites(disponibilites: Partial<DisponibiliteRTDB>[]): Promise<string[]> {
    try {
      const promises = disponibilites.map(dispo => this.createDisponibilite(dispo))
      const ids = await Promise.all(promises)
      
      console.log(`✅ ${ids.length} disponibilités créées en batch RTDB`)
      return ids
    } catch (error) {
      console.error('❌ Erreur création batch disponibilités RTDB:', error)
      throw error
    }
  }

  /**
   * Supprimer plusieurs disponibilités
   */
  async deleteMultipleDisponibilites(ids: string[]): Promise<void> {
    try {
      const promises = ids.map(id => this.deleteDisponibilite(id))
      await Promise.all(promises)
      
      console.log(`✅ ${ids.length} disponibilités supprimées en batch RTDB`)
    } catch (error) {
      console.error('❌ Erreur suppression batch disponibilités RTDB:', error)
      throw error
    }
  }

  // =============================================
  // STATISTIQUES ET UTILS
  // =============================================

  /**
   * Compter les disponibilités pour une plage de dates
   */
  async countDisponibilitesByDateRange(startDate: string, endDate: string): Promise<number> {
    const disponibilites = await this.getDisponibilitesByDateRange(startDate, endDate)
    return disponibilites.length
  }

  /**
   * Obtenir les statistiques du service
   */
  getStats() {
    return {
      activeListeners: this.listeners.size,
      tenantId: this.tenantId
    }
  }
}

// Instance globale
export const disponibilitesRTDBService = DisponibilitesRTDBService.getInstance()
