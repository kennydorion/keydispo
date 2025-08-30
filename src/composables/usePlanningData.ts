/**
 * Composable pour la gestion des données du planning
 * Extrait de SemaineVirtualClean.vue pour améliorer la maintenabilité
 */
import { ref, computed, nextTick } from 'vue'
import { useToast } from 'vuestic-ui'
import { CollaborateursServiceV2 } from '../services/collaborateursV2'
import { AuthService } from '../services/auth'
import { db, auth } from '../services/firebase'
import { collection, query, where, orderBy, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { disponibilitesRTDBService } from '../services/disponibilitesRTDBService'
import type { Collaborateur } from '../types/planning'

// Interface locale pour compatibilité avec SemaineVirtualClean.vue
interface Disponibilite {
  id?: string
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  ville: string
  date: string
  lieu: string
  heure_debut: string
  heure_fin: string
  tenantId: string
  collaborateurId?: string
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  slots?: string[]
  isFullDay?: boolean
  version?: number
  updatedAt?: any
  updatedBy?: string
}

export function usePlanningData() {
  const toast = useToast()
  
  // État des données
  const allCollaborateurs = ref<Collaborateur[]>([])
  const loadingCollaborateurs = ref(true)
  const disponibilitesCache = ref<Map<string, Disponibilite[]>>(new Map())
  const loadedDateRanges = ref<Array<{start: string, end: string}>>([])
  
  // État du chargement
  const isInitialLoad = ref(true)
  const planningReady = ref(false)
  const loadingDisponibilites = ref(false)
  const fetchingRanges = ref(false)
  const saving = ref(false)
  
  // Gestion des listeners temps réel
  const activeListeners = ref<Map<string, string>>(new Map())
  const isRealtimeActive = ref(false)

  // Helpers de date
  function toDateStr(d: Date) {
    return d.toISOString().substring(0, 10)
  }

  function addDaysStr(dateStr: string, delta: number) {
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    return toDateStr(d)
  }

  function diffDays(a: string, b: string) {
    const dateA = new Date(a + 'T00:00:00')
    const dateB = new Date(b + 'T00:00:00')
    return Math.floor((dateB.getTime() - dateA.getTime()) / (24 * 60 * 60 * 1000))
  }

  // Génération d'ID collaborateur standardisé
  function generateCollaborateurId(nom: string, prenom: string, email: string): string {
    return `${nom}_${prenom}_${email}`.toLowerCase().replace(/[^a-z0-9_]/g, '_')
  }

  // Vérification si un jour est chargé
  function isDayLoaded(date: string): boolean {
    return loadedDateRanges.value.some(range => date >= range.start && date <= range.end)
  }

  // Ajout d'une plage chargée
  function addLoadedRange(start: string, end: string) {
    console.log(`📅 [usePlanningData] Ajout plage chargée: ${start} → ${end}`)
    
    // Éviter les doublons et fusionner les plages adjacentes
    const newRange = { start, end }
    const overlapping = loadedDateRanges.value.filter(range =>
      start <= range.end && end >= range.start
    )
    
    if (overlapping.length === 0) {
      loadedDateRanges.value.push(newRange)
    } else {
      // Fusionner les plages qui se chevauchent
      const mergedStart = [start, ...overlapping.map(r => r.start)].sort()[0]
      const mergedEnd = [end, ...overlapping.map(r => r.end)].sort().reverse()[0]
      
      // Supprimer les anciennes plages
      loadedDateRanges.value = loadedDateRanges.value.filter(range => !overlapping.includes(range))
      // Ajouter la plage fusionnée
      loadedDateRanges.value.push({ start: mergedStart, end: mergedEnd })
    }
  }

  // Chargement des collaborateurs
  async function loadCollaborateursFromFirebase() {
    try {
      loadingCollaborateurs.value = true
      console.log('🔄 [usePlanningData] Chargement des collaborateurs...')
      
      const tenantId = AuthService.currentTenantId || 'keydispo'
      const collaborateursData = await CollaborateursServiceV2.loadCollaborateursFromImport(tenantId)
      
      // Utiliser l'ID généré au lieu de l'ID Firestore
      allCollaborateurs.value = collaborateursData.map((collab: any) => ({
        ...collab,
        id: generateCollaborateurId(collab.nom, collab.prenom, collab.email)
      }))
      
      console.log(`✅ [usePlanningData] ${allCollaborateurs.value.length} collaborateurs chargés`)
      return allCollaborateurs.value
    } catch (error) {
      console.error('❌ [usePlanningData] Erreur chargement collaborateurs:', error)
      // toast.init({
      //   message: 'Erreur lors du chargement des collaborateurs',
      //   color: 'danger'
      // })
      return []
    } finally {
      loadingCollaborateurs.value = false
    }
  }

  // Récupération des disponibilités pour une cellule
  function getDisponibilites(collaborateurId: string, date: string): Disponibilite[] {
    const cacheKey = `${collaborateurId}_${date}`
    const cached = disponibilitesCache.value.get(cacheKey)
    
    if (cached) {
      console.log(`🎯 [usePlanningData] Cache hit pour ${collaborateurId} le ${date}: ${cached.length} dispos`)
      return cached
    }
    
    console.log(`🔍 [usePlanningData] Cache miss pour ${collaborateurId} le ${date}`)
    return []
  }

  // Mise à jour du cache pour une cellule spécifique
  function updateCacheForCell(collaborateurId: string, date: string, dispos: Disponibilite[]) {
    const cacheKey = `${collaborateurId}_${date}`
    disponibilitesCache.value.set(cacheKey, dispos)
    console.log(`💾 [usePlanningData] Cache mis à jour pour ${collaborateurId} le ${date}: ${dispos.length} dispos`)
  }

      // Génération des disponibilités pour une plage de dates
  async function generateDisponibilitesForDateRange(startDate: string, endDate: string): Promise<void> {
    if (fetchingRanges.value) {
      console.log('⏳ [usePlanningData] Fetch déjà en cours, ignoré')
      return
    }

    try {
      fetchingRanges.value = true
      console.log(`🔄 [usePlanningData] Génération dispos pour ${startDate} → ${endDate}`)

      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Utilisateur non connecté')
      }

      const tenantId = AuthService.currentTenantId || 'keydispo'
      if (!tenantId) {
        throw new Error('Tenant ID introuvable')
      }

      // Charger depuis RTDB si disponible, sinon Firestore
      let disponibilites: any[] = []
      
      try {
        // Tentative RTDB d'abord
        console.log('🔄 [usePlanningData] Tentative chargement RTDB...')
        const rtdbData = await disponibilitesRTDBService.getDisponibilitesByDateRange(startDate, endDate)
        
        if (rtdbData && Object.keys(rtdbData).length > 0) {
          console.log(`✅ [usePlanningData] Données RTDB trouvées: ${Object.keys(rtdbData).length} entrées`)
          
          // Convertir les données RTDB en format standard
          disponibilites = Object.values(rtdbData).flat().map((dispo: any) => ({
            id: dispo.id || `${dispo.collaborateurId}_${dispo.date}_${Date.now()}`,
            collaborateurId: dispo.collaborateurId,
            nom: dispo.nom,
            prenom: dispo.prenom,
            metier: dispo.metier,
            phone: dispo.phone,
            email: dispo.email,
            ville: dispo.ville,
            date: dispo.date,
            lieu: dispo.lieu,
            heure_debut: dispo.heure_debut,
            heure_fin: dispo.heure_fin,
            type: dispo.type || 'disponible',
            tenantId: dispo.tenantId,
            version: dispo.version || 1,
            updatedAt: dispo.updatedAt,
            updatedBy: dispo.updatedBy
          }))
        }
      } catch (rtdbError) {
        console.warn('⚠️ [usePlanningData] RTDB indisponible, fallback Firestore:', rtdbError)
      }

      // Fallback Firestore si RTDB vide
      if (disponibilites.length === 0) {
        console.log('🔄 [usePlanningData] Chargement Firestore...')
        
        const q = query(
          collection(db, 'dispos'),
          where('tenantId', '==', tenantId),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date'),
          orderBy('heure_debut')
        )

        const snapshot = await getDocs(q)
        disponibilites = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Disponibilite[]
        
        console.log(`✅ [usePlanningData] Firestore: ${disponibilites.length} disponibilités chargées`)
      }

      // Mise à jour du cache par cellule
      const cacheUpdates = new Map<string, Disponibilite[]>()
      
      disponibilites.forEach(dispo => {
        const collaborateurId = dispo.collaborateurId
        if (!collaborateurId) return // Skip si pas de collaborateurId
        
        const cacheKey = `${collaborateurId}_${dispo.date}`
        if (!cacheUpdates.has(cacheKey)) {
          cacheUpdates.set(cacheKey, [])
        }
        cacheUpdates.get(cacheKey)!.push(dispo)
      })

      // Appliquer les mises à jour du cache
      cacheUpdates.forEach((dispos, cacheKey) => {
        disponibilitesCache.value.set(cacheKey, dispos)
      })

      // Marquer la plage comme chargée
      addLoadedRange(startDate, endDate)
      
      console.log(`✅ [usePlanningData] Cache mis à jour: ${cacheUpdates.size} cellules`)

    } catch (error) {
      console.error('❌ [usePlanningData] Erreur lors du chargement des disponibilités:', error)
      // toast.init({
      //   message: 'Erreur lors du chargement des disponibilités',
      //   color: 'danger'
      // })
    } finally {
      fetchingRanges.value = false
    }
  }

  // Sauvegarde des disponibilités
  async function saveDispos(dispos: Disponibilite[]): Promise<boolean> {
    if (saving.value) return false

    try {
      saving.value = true
      console.log(`💾 [usePlanningData] Sauvegarde de ${dispos.length} disponibilités...`)

      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Utilisateur non connecté')
      }

      const tenantId = AuthService.currentTenantId || 'keydispo'
      if (!tenantId) {
        throw new Error('Tenant ID introuvable')
      }

      // Préparer les données pour la sauvegarde
      const batch = writeBatch(db)
      const updatedDispos: Disponibilite[] = []

      for (const dispo of dispos) {
        const dispoData = {
          ...dispo,
          tenantId,
          version: (dispo.version || 0) + 1,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        }

        const docRef = doc(db, 'dispos', dispo.id || `${dispo.collaborateurId || 'unknown'}_${dispo.date}_${Date.now()}`)
        batch.set(docRef, dispoData)
        updatedDispos.push({ ...dispoData, id: docRef.id })
      }

      // Exécuter la transaction
      await batch.commit()
      console.log('✅ [usePlanningData] Sauvegarde Firestore réussie')

      // Mettre à jour le cache immédiatement
      const cacheUpdates = new Map<string, Disponibilite[]>()
      
      updatedDispos.forEach(dispo => {
        const collaborateurId = dispo.collaborateurId
        if (!collaborateurId) return // Skip si pas de collaborateurId
        
        const cacheKey = `${collaborateurId}_${dispo.date}`
        if (!cacheUpdates.has(cacheKey)) {
          cacheUpdates.set(cacheKey, getDisponibilites(collaborateurId, dispo.date).slice())
        }
        
        // Remplacer ou ajouter la disponibilité mise à jour
        const cellDispos = cacheUpdates.get(cacheKey)!
        const existingIndex = cellDispos.findIndex(d => d.id === dispo.id)
        if (existingIndex >= 0) {
          cellDispos[existingIndex] = dispo
        } else {
          cellDispos.push(dispo)
        }
      })

      // Appliquer les mises à jour du cache
      cacheUpdates.forEach((dispos, cacheKey) => {
        disponibilitesCache.value.set(cacheKey, dispos)
      })

      console.log(`🎯 [usePlanningData] Cache mis à jour après sauvegarde: ${cacheUpdates.size} cellules`)

      // Forcer la réactivité
      await nextTick()

      // toast.init({
      //   message: `${dispos.length} disponibilité(s) sauvegardée(s)`,
      //   color: 'success'
      // })

      return true
    } catch (error) {
      console.error('❌ [usePlanningData] Erreur lors de la sauvegarde:', error)
      // toast.init({
      //   message: 'Erreur lors de la sauvegarde',
      //   color: 'danger'
      // })
      return false
    } finally {
      saving.value = false
    }
  }

  // Computed pour l'état global
  const isBusy = computed(() => 
    loadingCollaborateurs.value || loadingDisponibilites.value || fetchingRanges.value || saving.value
  )

  const isPlanningFullyReady = computed(() => {
    return !loadingCollaborateurs.value && 
           allCollaborateurs.value.length > 0 && 
           planningReady.value && 
           !isInitialLoad.value
  })

  // Initialisation
  async function initializePlanningData() {
    console.log('🚀 [usePlanningData] Initialisation des données du planning...')
    
    try {
      await loadCollaborateursFromFirebase()
      planningReady.value = true
      isInitialLoad.value = false
      
      console.log('✅ [usePlanningData] Initialisation terminée')
    } catch (error) {
      console.error('❌ [usePlanningData] Erreur lors de l\'initialisation:', error)
    }
  }

  // Gestion des listeners temps réel
  function startRealtimeListeners(startDate: string, endDate: string) {
    if (isRealtimeActive.value) {
      console.log('📡 [usePlanningData] Listeners déjà actifs')
      return
    }

    console.log(`📡 [usePlanningData] Activation des listeners temps réel pour ${startDate} → ${endDate}`)
    
    const listenerId = disponibilitesRTDBService.listenToDisponibilitesByDateRange(
      startDate,
      endDate,
      (disponibilites) => {
        console.log(`🔄 [usePlanningData] Mise à jour temps réel: ${disponibilites.length} disponibilités`)
        
        // Mettre à jour le cache avec les nouvelles données
        const cacheUpdates = new Map<string, Disponibilite[]>()
        
        disponibilites.forEach(dispo => {
          const collaborateurId = dispo.collaborateurId
          if (!collaborateurId) return
          
          const cacheKey = `${collaborateurId}_${dispo.date}`
          if (!cacheUpdates.has(cacheKey)) {
            cacheUpdates.set(cacheKey, [])
          }
          cacheUpdates.get(cacheKey)!.push({
            id: dispo.id,
            collaborateurId: dispo.collaborateurId,
            nom: dispo.nom,
            prenom: dispo.prenom,
            metier: dispo.metier,
            phone: dispo.phone,
            email: dispo.email,
            ville: dispo.ville,
            date: dispo.date,
            lieu: dispo.lieu,
            heure_debut: dispo.heure_debut,
            heure_fin: dispo.heure_fin,
            type: (dispo.type === 'standard' || dispo.type === 'formation' || dispo.type === 'urgence' || dispo.type === 'maintenance') ? 'mission' : 'disponible',
            tenantId: dispo.tenantId,
            version: dispo.version || 1,
            updatedAt: dispo.updatedAt,
            updatedBy: dispo.updatedBy
          })
        })

        // Appliquer les mises à jour du cache
        cacheUpdates.forEach((dispos, cacheKey) => {
          disponibilitesCache.value.set(cacheKey, dispos)
        })
        
        // Vider le cache des cellules qui n'ont plus de données
        for (const [cacheKey] of disponibilitesCache.value.entries()) {
          if (!cacheUpdates.has(cacheKey)) {
            const [, date] = cacheKey.split('_')
            if (date >= startDate && date <= endDate) {
              disponibilitesCache.value.set(cacheKey, [])
            }
          }
        }
      }
    )
    
    if (listenerId) {
      activeListeners.value.set(`${startDate}_${endDate}`, listenerId)
      isRealtimeActive.value = true
      console.log(`✅ [usePlanningData] Listener temps réel activé: ${listenerId}`)
    }
  }

  function stopRealtimeListeners() {
    if (!isRealtimeActive.value) {
      console.log('📡 [usePlanningData] Aucun listener actif')
      return
    }

    console.log('📡 [usePlanningData] Arrêt des listeners temps réel')
    
    activeListeners.value.forEach((listenerId) => {
      disponibilitesRTDBService.stopListener(listenerId)
    })
    
    activeListeners.value.clear()
    isRealtimeActive.value = false
    
    console.log('✅ [usePlanningData] Tous les listeners arrêtés')
  }

  function updateRealtimeListeners(startDate: string, endDate: string) {
    stopRealtimeListeners()
    startRealtimeListeners(startDate, endDate)
  }

  return {
    // État
    allCollaborateurs,
    loadingCollaborateurs,
    disponibilitesCache,
    loadedDateRanges,
    isInitialLoad,
    planningReady,
    loadingDisponibilites,
    fetchingRanges,
    saving,
    
    // État temps réel
    activeListeners,
    isRealtimeActive,
    
    // Computed
    isBusy,
    isPlanningFullyReady,
    
    // Méthodes
    generateCollaborateurId,
    isDayLoaded,
    addLoadedRange,
    getDisponibilites,
    updateCacheForCell,
    generateDisponibilitesForDateRange,
    saveDispos,
    loadCollaborateursFromFirebase,
    initializePlanningData,
    
    // Gestion temps réel
    startRealtimeListeners,
    stopRealtimeListeners,
    updateRealtimeListeners,
    
    // Helpers
    toDateStr,
    addDaysStr,
    diffDays
  }
}
