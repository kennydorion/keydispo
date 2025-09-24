import { 
  ref as rtdbRef, 
  get, 
  set,
  update,
  push,
  remove,
  onValue,
  off,
  type Unsubscribe
} from 'firebase/database'
import { rtdb } from './firebase'
import type { 
  CollaborateurV2, 
  DisponibiliteV2, 
  PlanningDataV2,
  BatchUpdateV2,
  ImportDataV2,
  MigrationResult,
  StatsCollaborateurV2
} from '../types/optimized-v2'

/**
 * Service optimisé V2 - Structure centrée sur les collaborateurs avec RTDB
 * Architecture RTDB :
 * /tenants/{tenantId}/collaborateurs/{collaborateurId}
 * /tenants/{tenantId}/disponibilites/{date}/{collaborateurId}
 */
export class CollaborateursServiceV2 {
  
  /**
   * Charger tous les collaborateurs d'un tenant depuis RTDB
   */
  static async loadCollaborateurs(tenantId: string, includeInactifs = false): Promise<CollaborateurV2[]> {
    try {
      const collaborateursRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs`)
      const snapshot = await get(collaborateursRef)
      
      if (!snapshot.exists()) {
        return []
      }
      
      const data = snapshot.val()
      const collaborateurs: CollaborateurV2[] = []
      
      Object.entries(data).forEach(([id, collabData]: [string, any]) => {
        // Filtrer les collaborateurs inactifs si demandé
        if (!includeInactifs && collabData.actif === false) {
          return
        }
        
        collaborateurs.push({
          id,
          nom: collabData.nom,
          prenom: collabData.prenom,
          metier: collabData.metier,
          note: collabData.note || '',
          email: collabData.email || '',
          phone: collabData.phone || '',
          color: collabData.color || null,
          tenantId: collabData.tenantId,
          actif: collabData.actif !== false,
          createdAt: new Date(collabData.createdAt || Date.now()),
          updatedAt: new Date(collabData.updatedAt || Date.now()),
          version: collabData.version || 1,
          updatedBy: collabData.updatedBy || '',
          // Champs optionnels rapports à l'inscription
          ...(collabData.registrationCode ? { registrationCode: collabData.registrationCode } : {}),
          ...(collabData.registrationStatus ? { registrationStatus: collabData.registrationStatus } : {}),
          ...(collabData.registrationExpiresAt ? { registrationExpiresAt: collabData.registrationExpiresAt } : {}),
          ...(collabData.userId ? { userId: collabData.userId } : {})
        } as CollaborateurV2)
      })
      
      // Trier par nom puis prénom
      collaborateurs.sort((a, b) => {
        if (a.nom !== b.nom) return a.nom.localeCompare(b.nom)
        return a.prenom.localeCompare(b.prenom)
      })
      
      return collaborateurs
      
    } catch (error) {
      console.error('❌ Erreur chargement collaborateurs RTDB:', error)
      throw error
    }
  }

  /**
   * Alias pour compatibilité avec l'ancien code
   */
  static async loadCollaborateursFromRTDB(tenantId: string): Promise<CollaborateurV2[]> {
    return this.loadCollaborateurs(tenantId, true) // Inclure les inactifs pour l'import
  }

  /**
   * Alias pour compatibilité avec l'ancien code
   */
  static async loadCollaborateursFromImport(tenantId: string): Promise<CollaborateurV2[]> {
    return this.loadCollaborateurs(tenantId, true) // Inclure les inactifs pour l'import
  }

  /**
   * Récupérer un collaborateur par ID depuis RTDB
   */
  static async getCollaborateur(tenantId: string, collaborateurId: string): Promise<CollaborateurV2 | null> {
    try {
      
      const collaborateurRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
      const snapshot = await get(collaborateurRef)
      
      if (!snapshot.exists()) {
        return null
      }
      
      const data = snapshot.val()
      
      return {
        id: collaborateurId,
        nom: data.nom,
        prenom: data.prenom,
        metier: data.metier,
        note: data.note || '',
        email: data.email || '',
        phone: data.phone || '',
        color: data.color || null,
        tenantId: data.tenantId,
        actif: data.actif !== false,
        createdAt: new Date(data.createdAt || Date.now()),
        updatedAt: new Date(data.updatedAt || Date.now()),
        version: data.version || 1,
        updatedBy: data.updatedBy || '',
        ...(data.registrationCode ? { registrationCode: data.registrationCode } : {}),
        ...(data.registrationStatus ? { registrationStatus: data.registrationStatus } : {}),
        ...(data.registrationExpiresAt ? { registrationExpiresAt: data.registrationExpiresAt } : {}),
        ...(data.userId ? { userId: data.userId } : {})
      } as CollaborateurV2
      
    } catch (error) {
      console.error('❌ Erreur récupération collaborateur RTDB:', error)
      throw error
    }
  }

  /**
   * Alias pour compatibilité
   */
  static async getCollaborateurFromRTDB(tenantId: string, collaborateurId: string): Promise<CollaborateurV2 | null> {
    return this.getCollaborateur(tenantId, collaborateurId)
  }

  /**
   * Créer un nouveau collaborateur
   */
  static async createCollaborateur(
    tenantId: string, 
    data: Omit<CollaborateurV2, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'updatedBy'>,
    userId: string
  ): Promise<string> {
    try {
      // Générer un nouvel ID
      const collaborateursRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs`)
      const newCollaborateurRef = push(collaborateursRef)
      const collaborateurId = newCollaborateurRef.key!
      
      const collaborateurData = {
        ...data,
        tenantId,
        actif: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: userId,
        version: 1
      }
      
      await set(newCollaborateurRef, collaborateurData)
      return collaborateurId
      
    } catch (error) {
      console.error('❌ Erreur création collaborateur:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un collaborateur
   */
  static async updateCollaborateur(
    tenantId: string,
    collaborateurId: string,
    data: Partial<CollaborateurV2>,
    userId: string
  ): Promise<void> {
    try {
      
      const collaborateurRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
      
      // Vérifier que le collaborateur existe
      const snapshot = await get(collaborateurRef)
      if (!snapshot.exists()) {
        throw new Error(`Collaborateur ${collaborateurId} introuvable`)
      }
      
      const currentData = snapshot.val()
      const updateData = {
        ...data,
        updatedAt: Date.now(),
        updatedBy: userId,
        version: (currentData.version || 0) + 1
      }
      await update(collaborateurRef, updateData)
      
    } catch (error) {
      console.error('❌ Erreur mise à jour collaborateur:', error)
      throw error
    }
  }

  /**
   * Supprimer un collaborateur (soft delete)
   */
  static async deleteCollaborateur(
    tenantId: string,
    collaborateurId: string,
    userId: string
  ): Promise<void> {
    try {
      
      const collaborateurRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
      
      // Vérifier que le collaborateur existe
      const snapshot = await get(collaborateurRef)
      if (!snapshot.exists()) {
        throw new Error(`Collaborateur ${collaborateurId} introuvable`)
      }
      
      const currentData = snapshot.val()
      
      // Soft delete dans RTDB
      await update(collaborateurRef, {
        actif: false,
        updatedAt: Date.now(),
        updatedBy: userId,
        version: (currentData.version || 0) + 1
      })
      
      
    } catch (error) {
      console.error('❌ Erreur suppression collaborateur:', error)
      throw error
    }
  }

  /**
   * Charger les disponibilités d'un collaborateur pour une période
   * Structure RTDB : /tenants/{tenantId}/disponibilites/{date}/{collaborateurId}
   */
  static async loadDisponibilites(
    tenantId: string,
    collaborateurId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Map<string, DisponibiliteV2>> {
    try {
      
      const disponibilites = new Map<string, DisponibiliteV2>()
      
      // Parcourir chaque date de la période
      const dates = this.generateDateRange(dateDebut, dateFin)
      const promises = dates.map(async (date) => {
        const dispoRef = rtdbRef(rtdb, `tenants/${tenantId}/disponibilites/${date}/${collaborateurId}`)
        const snapshot = await get(dispoRef)
        
        if (snapshot.exists()) {
          const data = snapshot.val()
          disponibilites.set(date, {
            date,
            creneaux: data.creneaux || [],
            updatedAt: new Date(data.updatedAt || Date.now()),
            updatedBy: data.updatedBy || '',
            version: data.version || 1
          } as DisponibiliteV2)
        }
      })
      
      await Promise.all(promises)
      
      return disponibilites
      
    } catch (error) {
      console.error('❌ Erreur chargement disponibilités:', error)
      throw error
    }
  }

  /**
   * Mettre à jour une disponibilité
   */
  static async updateDisponibilite(
    tenantId: string,
    collaborateurId: string,
    date: string,
    data: Omit<DisponibiliteV2, 'date'>,
    userId: string
  ): Promise<void> {
    try {
      const dispoRef = rtdbRef(rtdb, `tenants/${tenantId}/disponibilites/${date}/${collaborateurId}`)
      
      // Récupérer la version actuelle
      const snapshot = await get(dispoRef)
      const currentVersion = snapshot.exists() ? snapshot.val()?.version || 0 : 0
      
      await set(dispoRef, {
        date,
        creneaux: data.creneaux,
        updatedAt: Date.now(),
        updatedBy: userId,
        version: currentVersion + 1
      })
      
      
      
    } catch (error) {
      console.error('❌ Erreur mise à jour disponibilité:', error)
      throw error
    }
  }

  /**
   * Mise à jour en lot de disponibilités
   */
  static async batchUpdateDisponibilites(
    tenantId: string,
    updates: BatchUpdateV2[],
    userId: string
  ): Promise<void> {
    try {
      
      const updatePromises: Promise<void>[] = []
      
      for (const update of updates) {
        for (const dispoUpdate of update.updates) {
          const promise = this.updateDisponibilite(
            tenantId,
            update.collaborateurId,
            dispoUpdate.date,
            { 
              creneaux: dispoUpdate.creneaux,
              updatedAt: new Date(),
              version: 1,
              updatedBy: userId
            },
            userId
          )
          updatePromises.push(promise)
        }
      }
      
      await Promise.all(updatePromises)
      
    } catch (error) {
      console.error('❌ Erreur mise à jour en lot:', error)
      throw error
    }
  }

  /**
   * Charger le planning complet pour une période
   */
  static async loadPlanning(
    tenantId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<PlanningDataV2> {
    try {
      
      // 1. Charger tous les collaborateurs
      const collaborateurs = await this.loadCollaborateurs(tenantId)
      
      // 2. Charger les disponibilités en parallèle
      const disponibilitesPromises = collaborateurs.map(async (collaborateur) => {
        const dispos = await this.loadDisponibilites(tenantId, collaborateur.id!, dateDebut, dateFin)
        return { collaborateurId: collaborateur.id!, disponibilites: dispos }
      })
      
      const disponibilitesResults = await Promise.all(disponibilitesPromises)
      
      // 3. Organiser les données
      const disponibilitesMap = new Map<string, Map<string, DisponibiliteV2>>()
      let totalDisponibilites = 0
      
      disponibilitesResults.forEach(({ collaborateurId, disponibilites }) => {
        disponibilitesMap.set(collaborateurId, disponibilites)
        totalDisponibilites += disponibilites.size
      })
      
      const planningData: PlanningDataV2 = {
        collaborateurs,
        disponibilitesByCollaborateur: disponibilitesMap,
        dateRange: { debut: dateDebut, fin: dateFin },
        totalCollaborateurs: collaborateurs.length,
        totalDisponibilites
      }
      
      return planningData
      
    } catch (error) {
      console.error('❌ Erreur chargement planning:', error)
      throw error
    }
  }

  /**
   * S'abonner aux changements temps réel d'un collaborateur
   */
  static subscribeToCollaborateurChanges(
    tenantId: string,
    collaborateurId: string,
    callback: (collaborateur: CollaborateurV2 | null) => void
  ): Unsubscribe {
    const collaborateurRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
    
    const unsubscribe = onValue(collaborateurRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        callback({
          id: collaborateurId,
          nom: data.nom,
          prenom: data.prenom,
          metier: data.metier,
          note: data.note || '',
          email: data.email || '',
          phone: data.phone || '',
          color: data.color || null,
          tenantId: data.tenantId,
          actif: data.actif !== false,
          createdAt: new Date(data.createdAt || Date.now()),
          updatedAt: new Date(data.updatedAt || Date.now()),
          version: data.version || 1,
          updatedBy: data.updatedBy || ''
        } as CollaborateurV2)
      } else {
        callback(null)
      }
    })
    
    return () => off(collaborateurRef, 'value', unsubscribe)
  }

  /**
   * S'abonner aux changements temps réel des disponibilités
   */
  static subscribeToDisponibilitesChanges(
    tenantId: string,
    collaborateurId: string,
    dateDebut: string,
    dateFin: string,
    callback: (disponibilites: Map<string, DisponibiliteV2>) => void
  ): Unsubscribe {
    const dates = this.generateDateRange(dateDebut, dateFin)
    const unsubscribes: Array<() => void> = []
    
    const disponibilites = new Map<string, DisponibiliteV2>()
    
    dates.forEach((date) => {
      const dispoRef = rtdbRef(rtdb, `tenants/${tenantId}/disponibilites/${date}/${collaborateurId}`)
      
      const unsubscribe = onValue(dispoRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          disponibilites.set(date, {
            date,
            creneaux: data.creneaux || [],
            updatedAt: new Date(data.updatedAt || Date.now()),
            updatedBy: data.updatedBy || '',
            version: data.version || 1
          } as DisponibiliteV2)
        } else {
          disponibilites.delete(date)
        }
        
        callback(new Map(disponibilites))
      })
      
      unsubscribes.push(() => off(dispoRef, 'value', unsubscribe))
    })
    
    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }

  /**
   * Import en lot depuis Excel avec la nouvelle structure
   */
  static async importFromExcel(
    tenantId: string,
    data: ImportDataV2[],
    userId: string
  ): Promise<MigrationResult> {
    const startTime = Date.now()
    const result: MigrationResult = {
      collaborateursCreated: 0,
      disponibilitesCreated: 0,
      erreurs: [],
      duree: 0
    }
    
    try {
      
      
      // Grouper par collaborateur
      const collaborateursMap = new Map<string, {
        info: Omit<CollaborateurV2, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'updatedBy'>
        disponibilites: Array<{
          date: string
          lieu: string | null
          heure_debut: string | null
          heure_fin: string | null
          statut: 'disponible' | 'indisponible' | 'affecte'
        }>
      }>()
      
      for (const item of data) {
        const key = `${item.collaborateur.nom}-${item.collaborateur.prenom}`
        
        if (!collaborateursMap.has(key)) {
          collaborateursMap.set(key, {
            info: item.collaborateur,
            disponibilites: []
          })
        }
        
        // Convertir les disponibilités avec statut par défaut
        const disponibilitesAvecStatut = item.disponibilites.map(dispo => ({
          ...dispo,
          statut: dispo.statut || 'disponible' as const
        }))
        
        collaborateursMap.get(key)!.disponibilites.push(...disponibilitesAvecStatut)
      }
      
      // Traiter chaque collaborateur
  for (const [_key, collabData] of collaborateursMap) {
        try {
          // Vérifier si le collaborateur existe déjà
          const existingCollabs = await this.loadCollaborateurs(tenantId)
          let collaborateur = existingCollabs.find(c => 
            c.nom === collabData.info.nom && c.prenom === collabData.info.prenom
          )
          
          if (!collaborateur) {
            // Créer nouveau collaborateur
            const collaborateurId = await this.createCollaborateur(tenantId, collabData.info, userId)
            result.collaborateursCreated++
            
            // Préparer les disponibilités
            const updates: BatchUpdateV2 = {
              collaborateurId,
              updates: []
            }
            
            // Grouper les disponibilités par date
            const disposParDate = new Map<string, DisponibiliteV2['creneaux']>()
            
            for (const dispo of collabData.disponibilites) {
              if (!disposParDate.has(dispo.date)) {
                disposParDate.set(dispo.date, [])
              }
              
              disposParDate.get(dispo.date)!.push({
                lieu: dispo.lieu,
                heure_debut: dispo.heure_debut,
                heure_fin: dispo.heure_fin,
                statut: dispo.statut || 'disponible'
              })
            }
            
            // Convertir en format BatchUpdate
            for (const [date, creneaux] of disposParDate) {
              updates.updates.push({ date, creneaux })
            }
            
            await this.batchUpdateDisponibilites(tenantId, [updates], userId)
            result.disponibilitesCreated += updates.updates.length
            
          } else {
            
            // Ici on pourrait mettre à jour les disponibilités existantes
          }
          
        } catch (error) {
          result.erreurs.push({
            type: 'collaborateur',
            data: collabData,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
      
      result.duree = Date.now() - startTime
      return result
      
    } catch (error) {
      console.error('❌ Erreur import Excel:', error)
      result.duree = Date.now() - startTime
      throw error
    }
  }

  /**
   * Générer des statistiques pour un collaborateur
   */
  static async getStatsCollaborateur(
    tenantId: string,
    collaborateurId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<StatsCollaborateurV2> {
    try {
      const collaborateur = await this.getCollaborateur(tenantId, collaborateurId)
      if (!collaborateur) {
        throw new Error('Collaborateur introuvable')
      }
      
      const disponibilites = await this.loadDisponibilites(tenantId, collaborateurId, dateDebut, dateFin)
      
      let joursDisponibles = 0
      let joursIndisponibles = 0
      let joursAffectes = 0
      
      disponibilites.forEach((dispo) => {
        dispo.creneaux.forEach((creneau) => {
          switch (creneau.statut) {
            case 'disponible': joursDisponibles++; break
            case 'indisponible': joursIndisponibles++; break
            case 'affecte': joursAffectes++; break
          }
        })
      })
      
      const totalJours = joursDisponibles + joursIndisponibles + joursAffectes
      
      return {
        collaborateurId,
        nom: collaborateur.nom,
        prenom: collaborateur.prenom,
        totalDisponibilites: disponibilites.size,
        joursDisponibles,
        joursIndisponibles,
        joursAffectes,
        tauxDisponibilite: totalJours > 0 ? (joursDisponibles / totalJours) * 100 : 0,
        derniereMiseAJour: collaborateur.updatedAt
      }
      
    } catch (error) {
      console.error('❌ Erreur stats collaborateur:', error)
      throw error
    }
  }

  /**
   * Vider toutes les données d'un tenant (collaborateurs et disponibilités)
   */
  static async clearTenantData(tenantId: string): Promise<{ deletedCollaborateurs: number, deletedDisponibilites: number }> {
    try {
      
      // Supprimer tous les collaborateurs
      const collaborateursRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs`)
      await remove(collaborateursRef)
      
      // Supprimer toutes les disponibilités
      const disponibilitesRef = rtdbRef(rtdb, `tenants/${tenantId}/disponibilites`)
      await remove(disponibilitesRef)
      return { deletedCollaborateurs: 0, deletedDisponibilites: 0 } // Valeurs symboliques car on ne peut pas compter avant suppression
      
    } catch (error) {
      console.error('❌ Erreur suppression données tenant:', error)
      throw error
    }
  }

  /**
   * Utilitaire pour générer une plage de dates
   */
  private static generateDateRange(dateDebut: string, dateFin: string): string[] {
    const dates: string[] = []
    const start = new Date(dateDebut)
    const end = new Date(dateFin)
    
    const current = new Date(start)
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }
}

// Instance singleton du service
export const collaborateursServiceV2 = new CollaborateursServiceV2()
