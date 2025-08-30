
import { 
  ref as rtdbRef, 
  set as rtdbSet,
  get as rtdbGet,
  remove as rtdbRemove,
  onValue as rtdbOnValue,
  off as rtdbOff,
  query as rtdbQuery,
  orderByChild,
  equalTo
} from 'firebase/database'
import { rtdb, auth } from './firebase'
import { AuthService } from './auth'

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
  ville: string
  
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

  constructor() {
    this.tenantId = AuthService.currentTenantId || 'keydispo'
  }

  static getInstance(): DisponibilitesRTDBService {
    if (!this.instance) {
      this.instance = new DisponibilitesRTDBService()
    }
    return this.instance
  }

  // =============================================
  // UTILITAIRES ET HELPERS
  // =============================================

  /**
   * Générer la référence RTDB pour les disponibilités d'un tenant
   */
  private getDisposRef() {
    return rtdbRef(rtdb, `tenants/${this.tenantId}/disponibilites`)
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
  private formatDispoForRTDB(dispo: Partial<DisponibiliteRTDB>): DisponibiliteRTDB {
    return {
      id: dispo.id || this.generateDispoId(),
      collaborateurId: dispo.collaborateurId || '',
      tenantId: this.tenantId,
      nom: dispo.nom || '',
      prenom: dispo.prenom || '',
      metier: dispo.metier || '',
      phone: dispo.phone || '',
      email: dispo.email || '',
      ville: dispo.ville || '',
      date: dispo.date || '',
      lieu: dispo.lieu || '',
      heure_debut: dispo.heure_debut || '',
      heure_fin: dispo.heure_fin || '',
      type: dispo.type,
      timeKind: dispo.timeKind,
      slots: dispo.slots,
      isFullDay: dispo.isFullDay,
      version: dispo.version || 1,
      updatedAt: Date.now(),
      updatedBy: dispo.updatedBy || auth.currentUser?.uid || 'system',
      tags: dispo.tags || [],
      isArchived: dispo.isArchived || false,
      hasConflict: dispo.hasConflict || false,
      _cont: dispo._cont
    }
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
   * Récupérer les disponibilités pour une plage de dates
   */
  async getDisponibilitesByDateRange(startDate: string, endDate: string): Promise<DisponibiliteRTDB[]> {
    try {
      console.log('🔍 RTDB: getDisponibilitesByDateRange', { startDate, endDate, tenantId: this.tenantId })
      
      const disposRef = this.getDisposRef()
      console.log('📍 RTDB: Chemin de données:', disposRef.toString())
      
      // TEMPORAIRE: Récupérer toutes les données et filtrer côté client pour éviter l'index
      const snapshot = await rtdbGet(disposRef)
      console.log('📊 RTDB: Snapshot exists:', snapshot.exists())
      
      const disponibilites: DisponibiliteRTDB[] = []
      
      if (snapshot.exists()) {
        let totalCount = 0
        let filteredCount = 0
        
        snapshot.forEach((child) => {
          totalCount++
          const dispo = child.val() as DisponibiliteRTDB
          
          // Filtrer par tenant ET par plage de dates côté client
          if (dispo.tenantId === this.tenantId && 
              dispo.date >= startDate && 
              dispo.date <= endDate) {
            disponibilites.push(dispo)
            filteredCount++
          }
        })
        
        console.log('📊 RTDB: Données trouvées:', { totalCount, filteredCount, tenantFilter: this.tenantId, dateRange: `${startDate}-${endDate}` })
      }
      
      console.log(`📅 RTDB: ${disponibilites.length} disponibilités trouvées pour ${startDate} → ${endDate}`)
      return disponibilites
    } catch (error) {
      console.error('❌ Erreur requête disponibilités RTDB:', error)
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
  async getAllDisponibilites(limit?: number): Promise<DisponibiliteRTDB[]> {
    try {
      const disposRef = this.getDisposRef()
      const snapshot = await rtdbGet(disposRef)
      const disponibilites: DisponibiliteRTDB[] = []
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const dispo = child.val() as DisponibiliteRTDB
          if (dispo.tenantId === this.tenantId) {
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
   * Écouter les changements de disponibilités pour une plage de dates
   */
  listenToDisponibilitesByDateRange(
    startDate: string, 
    endDate: string, 
    callback: (disponibilites: DisponibiliteRTDB[]) => void
  ): string {
    const listenerId = `dispos_${startDate}_${endDate}_${Date.now()}`
    
    try {
      const disposRef = this.getDisposRef()
      
      const handleSnapshot = (snapshot: any) => {
        const disponibilites: DisponibiliteRTDB[] = []
        
        if (snapshot.exists()) {
          snapshot.forEach((child: any) => {
            const dispo = child.val() as DisponibiliteRTDB
            // Filtrer par tenant et plage de dates
            if (dispo.tenantId === this.tenantId && 
                dispo.date >= startDate && 
                dispo.date <= endDate) {
              disponibilites.push(dispo)
            }
          })
        }
        
        // Trier par date puis par nom
        disponibilites.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date)
          return a.nom.localeCompare(b.nom)
        })
        
        console.log(`🔄 RTDB Listener: ${disponibilites.length} disponibilités mises à jour`)
        callback(disponibilites)
      }
      
      // Créer le listener RTDB
      rtdbOnValue(disposRef, handleSnapshot)
      
      // Stocker le listener pour pouvoir l'arrêter
      this.listeners.set(listenerId, () => {
        rtdbOff(disposRef, 'value', handleSnapshot)
      })
      
      console.log(`📡 Listener RTDB créé: ${listenerId}`)
      return listenerId
      
    } catch (error) {
      console.error('❌ Erreur création listener RTDB:', error)
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
