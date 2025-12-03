import { ref, shallowRef, computed, watch } from 'vue'
import { usePlanningFilters } from './usePlanningFilters'
import { CollaborateursServiceV2 } from '@/services/collaborateursV2'
import { DisponibilitesRTDBService } from '@/services/disponibilitesRTDBService'
import { AuthService } from '@/services/auth'

/**
 * Composable pour la gestion des données du planning avec filtrage
 * Centralise la logique de récupération et filtrage des données
 */

export function usePlanningData() {
  // Composable des filtres
  const planningFilters = usePlanningFilters()
  // Détection environnement de test (Vitest)
  // Rendez-la robuste: compatible vi (global), import.meta.vitest, VITEST et NODE_ENV === 'test'
  const isTestEnv = (
    typeof (globalThis as any).vi !== 'undefined' ||
    // @ts-ignore - vitest injecte import.meta.vitest
    (typeof import.meta !== 'undefined' && (import.meta as any).vitest) ||
    (((globalThis as any).process && (globalThis as any).process.env) && (
      (globalThis as any).process.env.VITEST || (globalThis as any).process.env.NODE_ENV === 'test' || (globalThis as any).process.env.MODE === 'test'
    )) ||
    // @ts-ignore - Vite
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.MODE === 'test')
  )
  
  // États de chargement
  const isLoading = ref(false)
  const loadingDisponibilites = ref(false)
  const isInitialLoad = ref(true)
  const fetchingRanges = ref<string[]>([])
  // Plages déjà chargées (fusionnées)
  const loadedRanges = ref<Array<{ start: string; end: string }>>([])
  
  // Données brutes - shallowRef pour éviter le deep tracking sur les grands tableaux
  const collaborateurs = shallowRef<any[]>([])
  const disponibilites = shallowRef<any[]>([])
  
  // Données filtrées calculées automatiquement
  // 1) Filtrage de base côté collaborateurs (recherche, métier, etc.)
  const baseCollaborateurs = computed(() => {
    return planningFilters.filterCollaborateurs(collaborateurs.value)
  })

  // 2) Filtrage des disponibilités selon dates/lieu/statut en s'appuyant sur la base des collaborateurs
  const filteredDisponibilites = computed(() => {
    const filtered = planningFilters.filterDisponibilites(disponibilites.value, baseCollaborateurs.value)
    // Mettre à jour les options de filtres basées sur les données filtrées
    planningFilters.updateLieuxOptions(filtered)
    return filtered
  })

  // 3) Restreindre la liste finale des collaborateurs selon la logique de filtrage
  const filteredCollaborateurs = computed(() => {
    // Si aucune plage de dates n'est active, ne pas restreindre par dispo
    if (!planningFilters.hasDateRange.value) {
      return baseCollaborateurs.value
    }

    // Si ni statut ni lieu ne sont appliqués, montrer les collaborateurs de base
    // sans restriction par disponibilités (mais en gardant les filtres de recherche/métier)
    const hasStatut = !!planningFilters.filterState.statut
    const hasLieu = !!planningFilters.filterState.lieu
    
    // NOUVEAU: Si on a seulement des filtres de base (recherche/métier) sans filtres de dispo,
    // retourner baseCollaborateurs (qui contient déjà le filtrage recherche/métier)
    if (!hasStatut && !hasLieu) {
      return baseCollaborateurs.value
    }

    // IMPORTANT: Pendant le chargement des disponibilités, ne pas restreindre la liste
    // Attendu par les tests et l'UX: on affiche la base (recherche/métier) tant que les dispos n'ont pas fini de charger
    if (loadingDisponibilites.value) {
      return baseCollaborateurs.value
    }

    // Procéder directement au filtrage des collaborateurs basé sur les disponibilités

  // Restreindre aux collaborateurs qui ont des disponibilités correspondant aux filtres actifs
    const normalize = (s: string) => (s || '')
      .toString()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase()
    const makeNameKey = (nom: string, prenom: string) => `${normalize(nom)}|${normalize(prenom)}`

    // Collecte de tous les identifiants des disponibilités filtrées
    const idsWithMatchingDispo = new Set<string>(
      filteredDisponibilites.value
        .map(d => d.collaborateurId)
        .filter((id: string | undefined): id is string => !!id)
    )
    const emailsWithMatchingDispo = new Set<string>(
      filteredDisponibilites.value.map(d => (d.email || '').toString().trim().toLowerCase()).filter(Boolean)
    )
    const namesWithMatchingDispo = new Set<string>(
      filteredDisponibilites.value.map(d => makeNameKey(d.nom, d.prenom))
    )

    // Matching amélioré avec plus de tolérance
    const result = baseCollaborateurs.value.filter(c => {
      // Match par ID
      const byId = c.id ? idsWithMatchingDispo.has(c.id) : false
      
      // Match par email (normalisé)
      const collabEmail = (c.email || '').toString().trim().toLowerCase()
      const byEmail = collabEmail ? emailsWithMatchingDispo.has(collabEmail) : false
      
      // Match par nom/prénom (normalisé)
      const byName = namesWithMatchingDispo.has(makeNameKey(c.nom, c.prenom))
      
      // Match par nom/prénom inversé (au cas où)
      const byNameReversed = namesWithMatchingDispo.has(makeNameKey(c.prenom, c.nom))
      
      // Match partiel par nom OU prénom seul si les sets de noms ne sont pas trop grands
      let byPartialName = false
      if (namesWithMatchingDispo.size < 50) { // Éviter les faux positifs sur de gros volumes
        const collabNom = normalize(c.nom)
        const collabPrenom = normalize(c.prenom)
        for (const nameKey of namesWithMatchingDispo) {
          if (nameKey.includes(collabNom) || nameKey.includes(collabPrenom)) {
            byPartialName = true
            break
          }
        }
      }
      
      return byId || byEmail || byName || byNameReversed || byPartialName
    })

  // Debug: Log pour tracer le filtrage
  /*console.log('🔍 [FILTRAGE COLLABORATEURS FINAL]', {
    baseCollaborateurs: baseCollaborateurs.value.length,
    filteredDisponibilites: filteredDisponibilites.value.length,
    idsWithMatchingDispo: idsWithMatchingDispo.size,
    namesWithMatchingDispo: namesWithMatchingDispo.size,
    finalResult: result.length,
    hasDateRange: planningFilters.hasDateRange.value,
    hasStatut,
    hasLieu,
    filterState: planningFilters.filterState,
    sampleBaseCollaborateurs: baseCollaborateurs.value.slice(0, 3).map(c => ({ id: c.id, nom: c.nom, prenom: c.prenom })),
    sampleFilteredDispos: filteredDisponibilites.value.slice(0, 3).map(d => ({ collaborateurId: d.collaborateurId, nom: d.nom, prenom: d.prenom, email: d.email }))
  })*/

  // Debug supplémentaire: lister quelques exemples de filtrage
  if (planningFilters.filterState.metier && result.length === 0) {
  // console.debug('[AUCUN RÉSULTAT] Métier demandé:', planningFilters.filterState.metier)
  // console.debug('[MÉTIERS DISPONIBLES] Base collaborateurs:', baseCollaborateurs.value.map(c => c.metier).filter((m, i, arr) => arr.indexOf(m) === i))
  // if (filteredDisponibilites.value.length === 0) {
  //   console.debug('[AUCUNE DISPO] Aucune disponibilité trouvée pour cette période/statut')
  // }
  }    return result
  })
  
  // Statistiques de filtrage
  const filterStats = computed(() => ({
    totalCollaborateurs: collaborateurs.value.length,
  filteredCollaborateurs: filteredCollaborateurs.value.length,
    totalDisponibilites: disponibilites.value.length,
    filteredDisponibilites: filteredDisponibilites.value.length,
    hasActiveFilters: planningFilters.hasActiveFilters.value
  }))
  
  // Watch pour mettre à jour les options des filtres quand les données changent
  watch(
    () => collaborateurs.value,
    (newCollaborateurs) => {
  planningFilters.updateMetiersOptions(newCollaborateurs)
  // Index pour suggestions de recherche (collaborateur)
  planningFilters.updateCollaborateursIndex(newCollaborateurs as any)
    },
    { immediate: true }
  )
  
  watch(
    () => disponibilites.value,
    (newDisponibilites) => {
      planningFilters.updateLieuxOptions(newDisponibilites)
      planningFilters.updateStatutsOptions()
    },
    { immediate: true }
  )
  
  // Fonctions de chargement
  async function loadCollaborateurs() {
    if (!AuthService.currentTenantId) {
      console.error('Pas de tenant ID disponible')
      return
    }
    
    isLoading.value = true
    try {
      // 1) Tentative via structure d'import (essaie RTDB puis RTDB import)
      let loadedCollaborateurs = await CollaborateursServiceV2.loadCollaborateursFromImport(AuthService.currentTenantId)

      // 2) Fallback: si vide, tenter la méthode RTDB standard (actif == true UNIQUEMENT)
      if (!loadedCollaborateurs || loadedCollaborateurs.length === 0) {
        console.warn('⚠️ Aucun collaborateur via Import/RTDB. Fallback vers RTDB standard (actif==true)')
        try {
          // CORRECTION: passer includeInactifs=false pour ne PAS charger les collaborateurs supprimés
          const rtdbActive = await CollaborateursServiceV2.loadCollaborateurs(AuthService.currentTenantId, false)
          if (rtdbActive && rtdbActive.length > 0) {
            loadedCollaborateurs = rtdbActive
          }
        } catch (e) {
          console.warn('⚠️ Fallback RTDB standard a échoué:', e)
        }
      }
      
      // CORRECTION: Filtrer côté client pour s'assurer qu'on n'affiche JAMAIS les inactifs
      if (loadedCollaborateurs && loadedCollaborateurs.length > 0) {
        loadedCollaborateurs = loadedCollaborateurs.filter((c: any) => c.actif !== false)
      }

      // 3) Tri de sécurité côté client (nom, prénom) si nécessaire
      if (loadedCollaborateurs && loadedCollaborateurs.length > 0) {
        loadedCollaborateurs.sort((a: any, b: any) => {
          const na = (a.nom || '').localeCompare(b.nom || '')
          if (na !== 0) return na
          return (a.prenom || '').localeCompare(b.prenom || '')
        })
      }

      collaborateurs.value = loadedCollaborateurs || []
    } catch (error) {
      console.error('Erreur lors du chargement des collaborateurs:', error)
      throw error
    } finally {
      isLoading.value = false
      isInitialLoad.value = false
    }
  }
  
  async function getDisponibilitiesByDateRange(startDate: string, endDate: string) {
    if (!AuthService.currentTenantId) {
      console.error('Pas de tenant ID disponible')
      return
    }
    
    loadingDisponibilites.value = true
    const rangeKey = `${startDate}-${endDate}`
    fetchingRanges.value.push(rangeKey)
    
    try {
      // Utiliser le service RTDB pour récupérer les disponibilités par plage de dates
      const service = DisponibilitesRTDBService.getInstance()
      const loadedDisponibilites = await service.getDisponibilitesByDateRange(
        startDate, 
        endDate
      )
      
      // Mettre à jour les disponibilités (fusionner avec les existantes)
      const existingDispos = disponibilites.value.filter(d => 
        d.date < startDate || d.date > endDate
      )
      disponibilites.value = [...existingDispos, ...loadedDisponibilites]
  // Marquer la plage comme chargée
  addLoadedRange(startDate, endDate)
      
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error)
      throw error
    } finally {
      loadingDisponibilites.value = false
      fetchingRanges.value = fetchingRanges.value.filter(r => r !== rangeKey)
    }
  }
  
  // Auto-chargement des disponibilités quand les dates des filtres changent
  watch(
    () => [planningFilters.filterState.dateFrom, planningFilters.filterState.dateTo],
    ([dateFrom, dateTo]) => {
      
      // En environnement de test, on ne déclenche pas de chargements réseau automatiques
      if (isTestEnv) return

      // Charger les données dès qu'une date est sélectionnée
      if (dateFrom || dateTo) {
        const { startDate, endDate } = computeRequestedRange(dateFrom, dateTo)
        // Charger les disponibilités pour la période calculée si non couverte
        if (startDate && endDate) {
          if (!isRangeCoveredByLoadedRanges(startDate, endDate)) {
            getDisponibilitiesByDateRange(startDate, endDate)
          }
        }
      }
    },
  { immediate: true } // AJOUT: déclencher immédiatement si des dates sont déjà définies
  )

  // Utils internes
  function computeRequestedRange(dateFrom?: string, dateTo?: string) {
    let startDate = dateFrom || ''
    let endDate = dateTo || ''
    // Si seulement dateFrom: charger jusqu'à +6 mois (au lieu de 30 jours)
    if (dateFrom && !dateTo) {
      const start = new Date(dateFrom)
      const end = new Date(start)
      // Charger 6 mois de données pour éviter de recharger trop souvent
      end.setMonth(start.getMonth() + 6)
      endDate = end.toISOString().split('T')[0]
    }
    // Si seulement dateTo: charger depuis 1 an dans le passé (au lieu de 6 mois)
    // pour permettre à l'utilisateur de voir l'historique complet
    if (dateTo && !dateFrom) {
      const end = new Date(dateTo)
      const start = new Date(end)
      // Charger 12 mois dans le passé pour avoir un historique complet
      start.setFullYear(end.getFullYear() - 1)
      startDate = start.toISOString().split('T')[0]
    }
    return { startDate, endDate }
  }

  function addLoadedRange(start: string, end: string) {
    if (!start || !end) return
    loadedRanges.value.push({ start, end })
    // Fusionner les plages qui se chevauchent ou adjacentes
    loadedRanges.value.sort((a, b) => a.start.localeCompare(b.start))
    const merged: Array<{ start: string; end: string }> = []
    for (const r of loadedRanges.value) {
      if (merged.length === 0) {
        merged.push({ ...r })
        continue
      }
      const last = merged[merged.length - 1]
      if (r.start <= incrementDate(last.end)) {
        // chevauchement/adjacent -> étendre
        if (r.end > last.end) last.end = r.end
      } else {
        merged.push({ ...r })
      }
    }
    loadedRanges.value = merged
  }

  function isRangeCoveredByLoadedRanges(start: string, end: string): boolean {
    if (!start || !end) return false
    return loadedRanges.value.some(r => r.start <= start && r.end >= end)
  }

  function incrementDate(dateStr: string): string {
    // Retourne la date + 1 jour (YYYY-MM-DD)
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  // =============================================
  // PREFETCH INTELLIGENT
  // =============================================
  
  // État du prefetch
  const prefetchingRanges = ref<Set<string>>(new Set())
  let prefetchDebounceTimer: ReturnType<typeof setTimeout> | null = null
  const PREFETCH_DAYS = 14 // Prefetch 2 semaines de chaque côté
  const PREFETCH_DEBOUNCE = 500 // Délai avant de lancer le prefetch (ms)
  
  /**
   * Calcule les plages à prefetcher basées sur la position de scroll actuelle
   * @param currentStartDate - Date de début de la fenêtre visible
   * @param currentEndDate - Date de fin de la fenêtre visible
   */
  function computePrefetchRanges(currentStartDate: string, currentEndDate: string): Array<{ start: string; end: string }> {
    const ranges: Array<{ start: string; end: string }> = []
    
    // Plage précédente (avant la fenêtre actuelle)
    const prevEnd = new Date(currentStartDate + 'T00:00:00')
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - PREFETCH_DAYS)
    
    const prevStartStr = prevStart.toISOString().split('T')[0]
    const prevEndStr = prevEnd.toISOString().split('T')[0]
    
    if (!isRangeCoveredByLoadedRanges(prevStartStr, prevEndStr)) {
      ranges.push({ start: prevStartStr, end: prevEndStr })
    }
    
    // Plage suivante (après la fenêtre actuelle)
    const nextStart = new Date(currentEndDate + 'T00:00:00')
    nextStart.setDate(nextStart.getDate() + 1)
    const nextEnd = new Date(nextStart)
    nextEnd.setDate(nextEnd.getDate() + PREFETCH_DAYS)
    
    const nextStartStr = nextStart.toISOString().split('T')[0]
    const nextEndStr = nextEnd.toISOString().split('T')[0]
    
    if (!isRangeCoveredByLoadedRanges(nextStartStr, nextEndStr)) {
      ranges.push({ start: nextStartStr, end: nextEndStr })
    }
    
    return ranges
  }
  
  /**
   * Prefetch les données pour une plage donnée (silencieux, sans bloquer l'UI)
   */
  async function prefetchRange(startDate: string, endDate: string): Promise<void> {
    const rangeKey = `${startDate}-${endDate}`
    
    // Éviter les prefetch en double
    if (prefetchingRanges.value.has(rangeKey)) return
    if (isRangeCoveredByLoadedRanges(startDate, endDate)) return
    
    prefetchingRanges.value.add(rangeKey)
    
    try {
      const service = DisponibilitesRTDBService.getInstance()
      const loadedDisponibilites = await service.getDisponibilitesByDateRange(startDate, endDate)
      
      // Fusionner avec les données existantes (sans doublon)
      const existingIds = new Set(disponibilites.value.map(d => d.id))
      const newDispos = loadedDisponibilites.filter(d => !existingIds.has(d.id))
      
      if (newDispos.length > 0) {
        disponibilites.value = [...disponibilites.value, ...newDispos]
      }
      
      addLoadedRange(startDate, endDate)
    } catch (error) {
      // Silencieux - le prefetch ne doit pas faire échouer l'app
      console.debug('[Prefetch] Erreur silencieuse:', error)
    } finally {
      prefetchingRanges.value.delete(rangeKey)
    }
  }
  
  /**
   * Déclenche le prefetch intelligent basé sur la fenêtre visible actuelle
   * Appelé lors du scroll ou changement de vue
   */
  function triggerPrefetch(visibleStartDate: string, visibleEndDate: string): void {
    // Annuler le prefetch précédent en attente
    if (prefetchDebounceTimer) {
      clearTimeout(prefetchDebounceTimer)
    }
    
    // Debounce pour éviter de prefetcher pendant un scroll rapide
    prefetchDebounceTimer = setTimeout(() => {
      const ranges = computePrefetchRanges(visibleStartDate, visibleEndDate)
      
      // Lancer les prefetch en parallèle avec une priorité basse
      // Utiliser requestIdleCallback si disponible, sinon setTimeout
      const scheduleTask = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 100))
      
      ranges.forEach(range => {
        scheduleTask(() => {
          prefetchRange(range.start, range.end)
        })
      })
    }, PREFETCH_DEBOUNCE)
  }
  
  return {
    // Données filtrées
    filteredCollaborateurs,
    filteredDisponibilites,
    filterStats,
  // Exposition des refs internes (utile pour tests/unités)
  collaborateurs,
  disponibilites,
    
    // États de chargement
    isLoading,
    loadingDisponibilites,
    isInitialLoad: computed(() => isInitialLoad.value),
    fetchingRanges: computed(() => fetchingRanges.value),
  loadedRanges: computed(() => loadedRanges.value),
    
    // Fonctions de chargement
    loadCollaborateurs,
    getDisponibilitiesByDateRange,
    
    // Prefetch intelligent
    triggerPrefetch,
    prefetchingRanges: computed(() => prefetchingRanges.value.size > 0)
  }
}