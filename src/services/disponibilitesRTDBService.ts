
import { 
  ref as rtdbRef, 
  set as rtdbSet,
  get as rtdbGet,
  remove as rtdbRemove,
  onValue as rtdbOnValue,
  off as rtdbOff
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
  timeKind?: 'fixed' | 'flexible' | 'oncall' | 'overnight'
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

  /**
   * Définir dynamiquement le tenantId (utile pour l'interface collaborateur)
   */
  public setTenantId(tenantId: string) {
    if (!tenantId || tenantId === this.tenantId) return
    this.tenantId = tenantId
    // Invalider le cache lié aux dispos car le tenant change
    this.cache.invalidate('dispos_')
  }

  // =============================================
  // UTILITAIRES ET HELPERS OPTIMISÉS
  // =============================================

  /**
   * Générer la référence RTDB pour les disponibilités d'un tenant (structure hiérarchique)
   */
  private getDisposRef(yearMonth?: string) {
    if (yearMonth) {
  // Structure optimisée ou par date :
  //  - /tenants/{tenant}/disponibilites/{YYYY-MM}/{id}
  //  - /tenants/{tenant}/disponibilites/{YYYY-MM-DD}/{id}
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
   * Obtenir tous les jours dans une plage de dates (YYYY-MM-DD)
   */
  private getDaysInRange(startDate: string, endDate: string): string[] {
    const days: string[] = []
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0]
      days.push(iso)
    }
    return days
  }

  private isYYYYMM(key: string): boolean {
    return /^\d{4}-\d{2}$/.test(key)
  }

  private isYYYYMMDD(key: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(key)
  }

  /**
   * Clé de tri robuste: d'abord date (hors de cette fonction), puis un nom affichable.
   * Fallback sur collaborateurId si nom/prénom manquants (cas import RTDB).
   */
  private getDisplayName(dispo: Partial<DisponibiliteRTDB>): string {
    const first = (dispo.prenom || '').toString().trim()
    const last = (dispo.nom || '').toString().trim()
    const full = `${first} ${last}`.trim()
    if (full) return full.toLowerCase()
    return (dispo.collaborateurId || '').toString().toLowerCase()
  }

  private compareDispos(a: DisponibiliteRTDB, b: DisponibiliteRTDB): number {
    if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '')
    return this.getDisplayName(a).localeCompare(this.getDisplayName(b))
  }

  /**
   * Aplatit une structure potentielle depuis la racine:
   *  - racine -> {id} -> dispo
   *  - racine -> {YYYY-MM} -> {id}|{YYYY-MM-DD}->{id}
   *  - racine -> {YYYY-MM-DD} -> {id}
   */
  private flattenDisponibilitesFromRootSnapshot(
    snapshot: any,
    startDate?: string,
    endDate?: string
  ): DisponibiliteRTDB[] {
    const out: DisponibiliteRTDB[] = []
    if (!snapshot.exists()) return out

    const within = (d: string) => {
      if (!startDate || !endDate) return true
      return d >= startDate && d <= endDate
    }

    snapshot.forEach((child1: any) => {
      const key1: string = child1.key
      const val1 = child1.val()

      if (this.isYYYYMMDD(key1)) {
        // Niveau date directe
        const dateKey = key1
        if (!within(dateKey)) return
        if (val1 && typeof val1 === 'object') {
          Object.values(val1).forEach((rec: any) => {
            if (rec && rec.tenantId === this.tenantId && rec.date && within(rec.date)) {
              // Garantir un ID unique
              if (!rec.id) {
                rec.id = `${rec.collaborateurId || 'unknown'}_${rec.date || 'nodate'}_${rec.heure_debut || '0000'}_${rec.heure_fin || '2359'}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
              }
              out.push(rec as DisponibiliteRTDB)
            }
          })
        }
      } else if (this.isYYYYMM(key1)) {
        // Niveau mois potentiel: peut contenir des ids ou des dates
        child1.forEach((child2: any) => {
          const key2: string = child2.key
          const val2 = child2.val()
          if (this.isYYYYMMDD(key2)) {
            const dateKey = key2
            if (!within(dateKey)) return
            if (val2 && typeof val2 === 'object') {
              Object.values(val2).forEach((rec: any) => {
                if (rec && rec.tenantId === this.tenantId && rec.date && within(rec.date)) {
                  // Garantir un ID unique
                  if (!rec.id) {
                    rec.id = `${rec.collaborateurId || 'unknown'}_${rec.date || 'nodate'}_${rec.heure_debut || '0000'}_${rec.heure_fin || '2359'}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
                  }
                  out.push(rec as DisponibiliteRTDB)
                }
              })
            }
          } else {
            // id -> dispo
            const rec = val2
            if (rec && rec.tenantId === this.tenantId && rec.date && within(rec.date)) {
              // Garantir un ID unique
              if (!rec.id) {
                rec.id = `${rec.collaborateurId || 'unknown'}_${rec.date || 'nodate'}_${rec.heure_debut || '0000'}_${rec.heure_fin || '2359'}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
              }
              out.push(rec as DisponibiliteRTDB)
            }
          }
        })
      } else {
        // id à la racine
        const rec = val1
        if (rec && rec.tenantId === this.tenantId && rec.date && within(rec.date)) {
          // Garantir un ID unique
          if (!rec.id) {
            rec.id = `${rec.collaborateurId || 'unknown'}_${rec.date || 'nodate'}_${rec.heure_debut || '0000'}_${rec.heure_fin || '2359'}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
          }
          out.push(rec as DisponibiliteRTDB)
        }
      }
    })

    return out
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
      
      // Écrire sous la date si présente (structure par date), sinon fallback racine
      const basePath = `tenants/${this.tenantId}/disponibilites`
      const dispoPath = formattedDispo.date && this.isYYYYMMDD(formattedDispo.date)
        ? `${basePath}/${formattedDispo.date}/${formattedDispo.id}`
        : `${basePath}/${formattedDispo.id}`
      const dispoRef = rtdbRef(rtdb, dispoPath)
      
      await rtdbSet(dispoRef, formattedDispo)

      return formattedDispo.id
    } catch (error) {
      console.error('❌ Erreur création disponibilité RTDB:', error)
      throw error
    }
  }

  /**
   * Trouve le chemin exact d'une disponibilité par son id, quelle que soit la structure de stockage.
   */
  private async findDispoPathById(id: string): Promise<string | null> {
    const rootRef = this.getDisposRef()
    const snapshot = await rtdbGet(rootRef)
    if (!snapshot.exists()) return null

    const base = `tenants/${this.tenantId}/disponibilites`

    // 1) id directement à la racine
    if (snapshot.hasChild(id)) {
      return `${base}/${id}`
    }

    // 2) Parcours des niveaux 1 -> (YYYY-MM | YYYY-MM-DD | ids)
    let foundPath: string | null = null
    snapshot.forEach((child1: any) => {
      if (foundPath) return true // break
      const key1: string = child1.key

      // 2a) niveau date direct YYYY-MM-DD
      if (this.isYYYYMMDD(key1)) {
        if (child1.hasChild(id)) {
          foundPath = `${base}/${key1}/${id}`
          return true
        }
        return false
      }

      // 2b) niveau mois YYYY-MM (peut contenir ids ou sous-niveaux dates)
      if (this.isYYYYMM(key1)) {
        child1.forEach((child2: any) => {
          if (foundPath) return true
          const key2: string = child2.key
          if (this.isYYYYMMDD(key2)) {
            if (child2.hasChild(id)) {
              foundPath = `${base}/${key1}/${key2}/${id}`
              return true
            }
          } else {
            if (key2 === id) {
              foundPath = `${base}/${key1}/${id}`
              return true
            }
          }
          return false
        })
        return false
      }

      // 2c) autre clé: traiter comme id (sécurité déjà couverte par 1))
      return false
    })

    return foundPath
  }

  /**
   * Mettre à jour une disponibilité existante
   */
  async updateDisponibilite(id: string, updates: Partial<DisponibiliteRTDB>): Promise<void> {
    try {
      // Trouver la dispo existante et son chemin
      const existing = await this.getDisponibilite(id)
      if (!existing) throw new Error(`Disponibilité ${id} non trouvée`)

      const currentPath = await this.findDispoPathById(id)
      if (!currentPath) throw new Error(`Chemin RTDB introuvable pour la dispo ${id}`)

      const updatedDispo = this.formatDispoForRTDB({
        ...existing,
        ...updates,
        id,
        version: (existing.version || 0) + 1
      })

      const basePath = `tenants/${this.tenantId}/disponibilites`
      const newPath = updatedDispo.date && this.isYYYYMMDD(updatedDispo.date)
        ? `${basePath}/${updatedDispo.date}/${id}`
        : `${basePath}/${id}`

      if (currentPath !== newPath) {
        // Déplacement: écrire au nouveau chemin puis supprimer l'ancien
        await rtdbSet(rtdbRef(rtdb, newPath), updatedDispo)
        await rtdbRemove(rtdbRef(rtdb, currentPath))
      } else {
        await rtdbSet(rtdbRef(rtdb, currentPath), updatedDispo)
      }

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
      const path = await this.findDispoPathById(id)
      if (!path) {
        console.warn(`⚠️ Chemin indisponible pour suppression dispo ${id} (déjà supprimée ?)`)
        return
      }
      await rtdbRemove(rtdbRef(rtdb, path))

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
  // Essayer racine directe
  const directRef = rtdbRef(rtdb, `tenants/${this.tenantId}/disponibilites/${id}`)
  const directSnap = await rtdbGet(directRef)
  if (directSnap.exists()) return directSnap.val() as DisponibiliteRTDB

  // Sinon, chercher le chemin
  const path = await this.findDispoPathById(id)
  if (!path) return null
  const snap = await rtdbGet(rtdbRef(rtdb, path))
  return snap.exists() ? (snap.val() as DisponibiliteRTDB) : null
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
      // Vérifier le cache d'abord
      const cacheKey = this.getCacheKey(startDate, endDate)
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached.filter(d => d.date >= startDate && d.date <= endDate)
      }

      // Obtenir les mois concernés pour des requêtes ciblées
      const months = this.getMonthsInRange(startDate, endDate)

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
          
          return monthDispos
        } catch (monthError) {
          return []
        }
      })

      // Attendre toutes les requêtes mensuelles
      const monthResults = await Promise.all(monthPromises)
      monthResults.forEach(monthDispos => {
        allDisponibilites.push(...monthDispos)
      })

      // Si aucune donnée trouvée dans la structure mois, essayer structure par jour
      if (allDisponibilites.length === 0) {
        const days = this.getDaysInRange(startDate, endDate)
        const dayPromises = days.map(async (day) => {
          try {
            const dayRef = this.getDisposRef(day)
            const snap = await rtdbGet(dayRef)
            const arr: DisponibiliteRTDB[] = []
            if (snap.exists()) {
              const val = snap.val()
              if (val && typeof val === 'object') {
                Object.values(val).forEach((rec: any) => {
                  if (rec && rec.tenantId === this.tenantId && rec.date >= startDate && rec.date <= endDate) {
                    arr.push(rec as DisponibiliteRTDB)
                  }
                })
              }
            }
            return arr
          } catch {
            return []
          }
        })
        const dayResults = await Promise.all(dayPromises)
        dayResults.forEach(arr => allDisponibilites.push(...arr))

        if (allDisponibilites.length === 0) {
          return this.getDisponibilitesByDateRangeFallback(startDate, endDate)
        }
      }

  // Trier par date puis par nom (robuste)
  allDisponibilites.sort((a, b) => this.compareDispos(a, b))

      // Mettre en cache le résultat
      this.cache.set(cacheKey, allDisponibilites)

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
      const disposRef = this.getDisposRef()
      const snapshot = await rtdbGet(disposRef)
      const disponibilites = this.flattenDisponibilitesFromRootSnapshot(snapshot, startDate, endDate)
        .sort((a, b) => this.compareDispos(a, b))

      // Mettre en cache même le fallback
      const cacheKey = this.getCacheKey(startDate, endDate)
      this.cache.set(cacheKey, disponibilites)

      return disponibilites
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
      const snapshot = await rtdbGet(disposRef)
      // Aplatis pour supporter racine -> dates -> ids
      const disponibilites = this.flattenDisponibilitesFromRootSnapshot(snapshot)
        .filter(d => d.tenantId === this.tenantId && d.collaborateurId === collaborateurId)
        .sort((a, b) => this.compareDispos(a, b))
      
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
      // Aplatis pour supporter racine -> dates -> ids
      const disponibilites = this.flattenDisponibilitesFromRootSnapshot(snapshot)
        .filter(d => d.tenantId === targetTenantId)
        .sort((a, b) => this.compareDispos(a, b))
      const result = limit ? disponibilites.slice(0, limit) : disponibilites
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
      
      // Si plage courte (≤ 3 mois), écouter par jours pour coller à la structure d'import
      if (months.length <= 3) {
        const days = this.getDaysInRange(startDate, endDate)
        const dayListeners: Array<() => void> = []
        const dayData = new Map<string, DisponibiliteRTDB[]>()

        const aggregateAndCallback = () => {
          const allDispos: DisponibiliteRTDB[] = []
          dayData.forEach(dispos => allDispos.push(...dispos))
          const filtered = allDispos
            .filter(d => d.tenantId === this.tenantId && d.date >= startDate && d.date <= endDate)
            .sort((a, b) => this.compareDispos(a, b))
          this.cache.set(cacheKey, filtered, listenerId)
          callback(filtered)
        }

        days.forEach(day => {
          const dayRef = this.getDisposRef(day)
          const handleDaySnapshot = (snapshot: any) => {
            const arr: DisponibiliteRTDB[] = []
            if (snapshot.exists()) {
              const val = snapshot.val()
              if (val && typeof val === 'object') {
                Object.values(val).forEach((rec: any) => {
                  if (rec && rec.tenantId === this.tenantId) {
                    arr.push(rec as DisponibiliteRTDB)
                  }
                })
              }
            }
            dayData.set(day, arr)
            aggregateAndCallback()
          }
          rtdbOnValue(dayRef, handleDaySnapshot)
          dayListeners.push(() => {
            rtdbOff(dayRef, 'value', handleDaySnapshot)
          })
        })

        this.listeners.set(listenerId, () => {
          dayListeners.forEach(cleanup => cleanup())
          this.cache.removeListener(listenerId)
        })

      } else {
        // Fallback vers l'ancienne méthode pour les plages trop larges
        const disposRef = this.getDisposRef()
        
        const handleSnapshot = (snapshot: any) => {
          const disponibilites = this.flattenDisponibilitesFromRootSnapshot(snapshot, startDate, endDate)
            .sort((a, b) => this.compareDispos(a, b))
          this.cache.set(cacheKey, disponibilites, listenerId)
          callback(disponibilites)
        }
        
        rtdbOnValue(disposRef, handleSnapshot)
        
        this.listeners.set(listenerId, () => {
          rtdbOff(disposRef, 'value', handleSnapshot)
          this.cache.removeListener(listenerId)
        })
      }
      
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
    }
  }

  /**
   * Arrêter tous les listeners
   */
  stopAllListeners(): void {
    this.listeners.forEach((stopFunction, _listenerId) => {
      stopFunction()
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
