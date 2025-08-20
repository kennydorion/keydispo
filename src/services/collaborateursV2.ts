import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc,
  updateDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  runTransaction,
  writeBatch,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from './firebase'
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
 * Service optimisé V2 - Structure centrée sur les collaborateurs
 * Architecture Firestore :
 * /tenants/{tenantId}/collaborateurs/{collaborateurId}
 * /tenants/{tenantId}/collaborateurs/{collaborateurId}/disponibilites/{date}
 */
export class CollaborateursServiceV2 {
  
  /**
   * Charger tous les collaborateurs d'un tenant (nouvelle structure import)
   */
  static async loadCollaborateursFromImport(tenantId: string): Promise<CollaborateurV2[]> {
    try {
      console.log('🔄 Chargement des collaborateurs importés pour tenant:', tenantId)
      
      const collaborateursRef = collection(db, `tenants/${tenantId}/collaborateurs`)
      const q = query(collaborateursRef, orderBy('nom'), orderBy('prenom'))
      
      const snapshot = await getDocs(q)
      const collaborateurs: CollaborateurV2[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        // Convertir vers le format attendu
        collaborateurs.push({
          id: doc.id,
          nom: data.nom,
          prenom: data.prenom,
          metier: data.metier,
          ville: data.ville || '',
          email: data.email || '',
          phone: data.phone || '',
          tenantId: data.tenantId,
          actif: data.actif !== false, // true par défaut
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        } as CollaborateurV2)
      })
      
      console.log(`✅ ${collaborateurs.length} collaborateurs importés chargés`)
      return collaborateurs
      
    } catch (error) {
      console.error('❌ Erreur chargement collaborateurs importés:', error)
      throw error
    }
  }

  /**
   * Charger tous les collaborateurs d'un tenant
   */
  static async loadCollaborateurs(tenantId: string): Promise<CollaborateurV2[]> {
    try {
      console.log('🔄 Chargement des collaborateurs pour tenant:', tenantId)
      
      const collaborateursRef = collection(db, `tenants/${tenantId}/collaborateurs`)
      const q = query(collaborateursRef, where('actif', '==', true), orderBy('nom'), orderBy('prenom'))
      
      const snapshot = await getDocs(q)
      const collaborateurs: CollaborateurV2[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        collaborateurs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        } as CollaborateurV2)
      })
      
      console.log(`✅ ${collaborateurs.length} collaborateurs chargés`)
      return collaborateurs
      
    } catch (error) {
      console.error('❌ Erreur chargement collaborateurs:', error)
      throw error
    }
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
      const collaborateurRef = doc(collection(db, `tenants/${tenantId}/collaborateurs`))
      
      const collaborateurData: Omit<CollaborateurV2, 'id'> = {
        ...data,
        tenantId,
        actif: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
        version: 1
      }
      
      await setDoc(collaborateurRef, {
        ...collaborateurData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      console.log('✅ Collaborateur créé:', collaborateurRef.id)
      return collaborateurRef.id
      
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
      const collaborateurRef = doc(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
      
      await runTransaction(db, async (transaction) => {
        const collaborateurDoc = await transaction.get(collaborateurRef)
        
        if (!collaborateurDoc.exists()) {
          throw new Error('Collaborateur introuvable')
        }
        
        const currentData = collaborateurDoc.data() as CollaborateurV2
        const newVersion = currentData.version + 1
        
        transaction.update(collaborateurRef, {
          ...data,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
          version: newVersion
        })
      })
      
      console.log('✅ Collaborateur mis à jour:', collaborateurId)
      
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
      const collaborateurRef = doc(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
      
      await updateDoc(collaborateurRef, {
        actif: false,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
        version: (await getDoc(collaborateurRef)).data()?.version + 1 || 1
      })
      
      console.log('✅ Collaborateur supprimé (soft):', collaborateurId)
      
    } catch (error) {
      console.error('❌ Erreur suppression collaborateur:', error)
      throw error
    }
  }

  /**
   * Charger les disponibilités d'un collaborateur pour une période
   */
  static async loadDisponibilites(
    tenantId: string,
    collaborateurId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Map<string, DisponibiliteV2>> {
    try {
      console.log(`🔄 Chargement disponibilités ${collaborateurId} du ${dateDebut} au ${dateFin}`)
      
      const disposRef = collection(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}/disponibilites`)
      const q = query(
        disposRef, 
        where('__name__', '>=', dateDebut),
        where('__name__', '<=', dateFin),
        orderBy('__name__')
      )
      
      const snapshot = await getDocs(q)
      const disponibilites = new Map<string, DisponibiliteV2>()
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        disponibilites.set(doc.id, {
          date: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        } as DisponibiliteV2)
      })
      
      console.log(`✅ ${disponibilites.size} disponibilités chargées`)
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
      const dispoRef = doc(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}/disponibilites/${date}`)
      
      await runTransaction(db, async (transaction) => {
        const dispoDoc = await transaction.get(dispoRef)
        const currentVersion = dispoDoc.exists() ? dispoDoc.data()?.version || 0 : 0
        
        transaction.set(dispoRef, {
          date,
          ...data,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
          version: currentVersion + 1
        })
      })
      
      console.log(`✅ Disponibilité mise à jour: ${collaborateurId}/${date}`)
      
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
      console.log(`🔄 Mise à jour en lot de ${updates.length} collaborateurs`)
      
      const batch = writeBatch(db)
      let operationsCount = 0
      
      for (const update of updates) {
        for (const dispoUpdate of update.updates) {
          const dispoRef = doc(
            db, 
            `tenants/${tenantId}/collaborateurs/${update.collaborateurId}/disponibilites/${dispoUpdate.date}`
          )
          
          batch.set(dispoRef, {
            date: dispoUpdate.date,
            creneaux: dispoUpdate.creneaux,
            updatedAt: serverTimestamp(),
            updatedBy: userId,
            version: 1 // On pourrait récupérer la version actuelle, mais pour l'import c'est OK
          })
          
          operationsCount++
          
          // Firestore limite à 500 opérations par batch
          if (operationsCount >= 450) {
            await batch.commit()
            console.log(`✅ Batch de ${operationsCount} opérations exécuté`)
            operationsCount = 0
          }
        }
      }
      
      if (operationsCount > 0) {
        await batch.commit()
        console.log(`✅ Batch final de ${operationsCount} opérations exécuté`)
      }
      
      console.log('✅ Mise à jour en lot terminée')
      
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
      console.log(`🔄 Chargement planning complet du ${dateDebut} au ${dateFin}`)
      
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
      
      console.log(`✅ Planning chargé: ${collaborateurs.length} collaborateurs, ${totalDisponibilites} disponibilités`)
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
    const collaborateurRef = doc(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
    
    return onSnapshot(collaborateurRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        callback({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        } as CollaborateurV2)
      } else {
        callback(null)
      }
    })
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
    const disposRef = collection(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}/disponibilites`)
    const q = query(
      disposRef,
      where('__name__', '>=', dateDebut),
      where('__name__', '<=', dateFin),
      orderBy('__name__')
    )
    
    return onSnapshot(q, (snapshot) => {
      const disponibilites = new Map<string, DisponibiliteV2>()
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        disponibilites.set(doc.id, {
          date: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.() || new Date()
        } as DisponibiliteV2)
      })
      
      callback(disponibilites)
    })
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
      console.log(`🔄 Import Excel: ${data.length} entrées à traiter`)
      
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
      for (const [key, collabData] of collaborateursMap) {
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
            console.log(`ℹ️ Collaborateur existant: ${key}`)
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
      console.log(`✅ Import terminé en ${result.duree}ms:`, result)
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
      const collaborateur = await getDoc(doc(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}`))
      if (!collaborateur.exists()) {
        throw new Error('Collaborateur introuvable')
      }
      
      const collabData = collaborateur.data() as CollaborateurV2
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
        nom: collabData.nom,
        prenom: collabData.prenom,
        totalDisponibilites: disponibilites.size,
        joursDisponibles,
        joursIndisponibles,
        joursAffectes,
        tauxDisponibilite: totalJours > 0 ? (joursDisponibles / totalJours) * 100 : 0,
        derniereMiseAJour: collabData.updatedAt
      }
      
    } catch (error) {
      console.error('❌ Erreur stats collaborateur:', error)
      throw error
    }
  }

  /**
   * Vider toutes les données d'un tenant (collaborateurs et disponibilités)
   * Utilisé avant un import complet pour éviter les doublons
   */
  static async clearTenantData(tenantId: string): Promise<{ deletedCollaborateurs: number, deletedDisponibilites: number }> {
    try {
      console.log(`🗑️ Suppression de toutes les données du tenant: ${tenantId}`)
      
      const collaborateursRef = collection(db, `tenants/${tenantId}/collaborateurs`)
      const collaborateursQuery = query(collaborateursRef)
      const collaborateursSnapshot = await getDocs(collaborateursQuery)
      
      let deletedCollaborateurs = 0
      let deletedDisponibilites = 0
      
      // Supprimer tous les collaborateurs et leurs sous-collections
      const batch = writeBatch(db)
      
      for (const collabDoc of collaborateursSnapshot.docs) {
        const collaborateurId = collabDoc.id
        
        // Supprimer toutes les disponibilités de ce collaborateur
        const disponibilitesRef = collection(db, `tenants/${tenantId}/collaborateurs/${collaborateurId}/disponibilites`)
        const disponibilitesSnapshot = await getDocs(disponibilitesRef)
        
        for (const dispoDoc of disponibilitesSnapshot.docs) {
          batch.delete(dispoDoc.ref)
          deletedDisponibilites++
        }
        
        // Supprimer le collaborateur
        batch.delete(collabDoc.ref)
        deletedCollaborateurs++
      }
      
      await batch.commit()
      
      console.log(`✅ Suppression terminée: ${deletedCollaborateurs} collaborateurs, ${deletedDisponibilites} disponibilités`)
      return { deletedCollaborateurs, deletedDisponibilites }
      
    } catch (error) {
      console.error('❌ Erreur suppression données tenant:', error)
      throw error
    }
  }
}

// Instance singleton du service
export const collaborateursServiceV2 = new CollaborateursServiceV2()
