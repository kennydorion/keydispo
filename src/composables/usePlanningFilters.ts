import { ref, computed, reactive } from 'vue'
import { useRealtimeSync } from './useRealtimeSync'
import { resolveDispoKind } from '@/services/planningDisplayService'

/**
 * Composable centralisé pour la gestion des filtres du planning admin
 * Gère tous les états de filtrage avec réactivité temps réel
 */

export interface FilterState {
  search: string
  metier: string
  lieu: string
  statut: string
  dateFrom: string
  dateTo: string
  [key: string]: string
}

export interface FilterOptions {
  text: string
  value: string
}

export interface FilterSuggestion {
  value: string
  text: string
  type: string
  icon: string
}

// État global des filtres (singleton)
const globalFilterState = reactive<FilterState>({
  search: '',
  metier: '',
  lieu: '',
  statut: '',
  dateFrom: '',
  dateTo: ''
})

// Cache des options de filtres
const metiersCache = ref<FilterOptions[]>([])
const lieuxCache = ref<FilterOptions[]>([])
const statutsCache = ref<FilterOptions[]>([])
// Index léger de collaborateurs pour suggestions (nom/prénom/email/phone)
const collaborateursIndex = ref<Array<{ id?: string; nom: string; prenom: string; email?: string; phone?: string }>>([])

// État des suggestions
const showSuggestions = ref(false)
const searchFocused = ref(false)

// Performance tracking
const filteringDuration = ref(0)
const isFiltering = ref(false)

export function usePlanningFilters() {
  const { registerRefreshCallback } = useRealtimeSync()

  // ==========================================
  // ÉTAT ET RÉACTIVITÉ
  // ==========================================

  // Computed pour vérifier si des filtres sont actifs
  const hasActiveFilters = computed(() => {
    return !!(
      globalFilterState.search ||
      globalFilterState.metier ||
      globalFilterState.lieu ||
      globalFilterState.statut ||
      globalFilterState.dateFrom ||
      globalFilterState.dateTo
    )
  })

  // Computed pour vérifier si une plage de dates est définie
  const hasDateRange = computed(() => {
    return !!(globalFilterState.dateFrom || globalFilterState.dateTo)
  })

  // Computed pour vérifier si les filtres lieu/statut sont disponibles
  const canFilterByLieuStatut = computed(() => {
    return hasDateRange.value
  })

  // Suggestions de recherche intelligentes
  const searchSuggestions = computed((): FilterSuggestion[] => {
    // Abaisser le seuil à 1 caractère pour afficher plus tôt les résultats
    if (!globalFilterState.search || globalFilterState.search.length < 1) return []
    
    const suggestions: FilterSuggestion[] = []
    const searchLower = globalFilterState.search.toLowerCase()
    const digitsOnly = (s: string) => s.replace(/[^0-9]/g, '')
    const searchDigits = digitsOnly(globalFilterState.search)
    const addedValues = new Set<string>() // Éviter les doublons
    const pushUnique = (s: FilterSuggestion) => {
      const key = `${s.type}:${s.value}`
      if (!addedValues.has(key)) {
        suggestions.push(s)
        addedValues.add(key)
      }
    }

    // 0) Suggestions de collaborateurs (prioritaires)
    const norm = (s: string) => s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    const needle = norm(searchLower)
    collaborateursIndex.value
      .filter(c => norm(`${c.prenom} ${c.nom}`).includes(needle) || norm(`${c.nom} ${c.prenom}`).includes(needle))
      .slice(0, 5)
      .forEach(c => {
        const label = `${c.prenom} ${c.nom}`.trim()
        pushUnique({ value: label, text: label, type: 'Collaborateur', icon: 'person_search' })
      })
    
    // 1) Suggestions Email (si la saisie ressemble à un email ou un fragment)
    collaborateursIndex.value
      .filter(c => (c.email || '').toLowerCase().includes(searchLower))
      .slice(0, 5)
      .forEach(c => {
        const email = (c.email || '').trim()
        if (email) pushUnique({ value: email, text: email, type: 'Email', icon: 'alternate_email' })
      })
    
    // 2) Suggestions Téléphone (match sur digits seulement, seuil minimal 3)
    if (searchDigits.length >= 3) {
      collaborateursIndex.value
        .filter(c => digitsOnly(c.phone || '').includes(searchDigits))
        .slice(0, 5)
        .forEach(c => {
          const phone = (c.phone || '').trim()
          if (phone) pushUnique({ value: phone, text: phone, type: 'Téléphone', icon: 'call' })
        })
    }
    
    // Suggestions basées sur les métiers
    metiersCache.value.forEach(metier => {
      if (metier.text.toLowerCase().includes(searchLower)) {
        pushUnique({ value: metier.value, text: metier.text, type: 'Métier', icon: 'work' })
      }
    })
    
    // Suggestions basées sur les lieux
    lieuxCache.value.forEach(lieu => {
      if (lieu.text.toLowerCase().includes(searchLower)) {
        pushUnique({ value: lieu.value, text: lieu.text, type: 'Lieu', icon: 'location_on' })
      }
    })
    
    return suggestions.slice(0, 5)
  })

  // ==========================================
  // GESTION DES OPTIONS DE FILTRES
  // ==========================================

  /**
   * Met à jour les options de métiers disponibles
   */
  function updateMetiersOptions(collaborateurs: any[]) {
    const uniq = new Map<string, string>() // key: lower-trim, value: display text (trim)
    
    collaborateurs.forEach(collab => {
      const raw = (collab.metier || '').toString()
      const trimmed = raw.trim()
      if (!trimmed) return
      const key = trimmed.toLowerCase()
      if (!uniq.has(key)) uniq.set(key, trimmed)
    })
    
    metiersCache.value = Array.from(uniq.values())
      .sort()
      .map(metier => ({ text: metier, value: metier }))
  }

  /**
   * Met à jour l'index des collaborateurs pour les suggestions de recherche
   */
  function updateCollaborateursIndex(collaborateurs: Array<{ id?: string; nom: string; prenom: string }>) {
    try {
      // Conserver uniquement les champs nécessaires
      const mapped = collaborateurs.map(c => ({ 
        id: (c as any).id, 
        nom: c.nom || '', 
        prenom: c.prenom || '', 
        email: (c as any).email || '',
        phone: (c as any).phone || ''
      }))
      collaborateursIndex.value = mapped
    } catch (e) {
      // best-effort
      collaborateursIndex.value = []
    }
  }

  /**
   * Met à jour les options de lieux disponibles
   */
  function updateLieuxOptions(disponibilites: any[]) {
    const lieux = new Set<string>()
    
    disponibilites.forEach(dispo => {
      const raw = (dispo.lieu || '').toString()
      const trimmed = raw.trim()
      const upper = trimmed.toUpperCase()
      if (
        trimmed &&
        upper !== 'DISPONIBLE' &&
        upper !== 'DISPO' &&
        upper !== 'INDISPONIBLE'
      ) {
        lieux.add(trimmed)
      }
    })
    
    lieuxCache.value = Array.from(lieux)
      .sort()
      .map(lieu => ({ text: lieu, value: lieu }))
  }

  /**
   * Met à jour les options de statuts disponibles
   */
  function updateStatutsOptions() {
    statutsCache.value = [
      { text: 'Disponible', value: 'disponible' },
      { text: 'En mission', value: 'mission' },
      { text: 'Indisponible', value: 'indisponible' }
    ]
  }

  // ==========================================
  // LOGIQUE DE FILTRAGE
  // ==========================================

  /**
   * Filtre les collaborateurs selon les critères actifs
   */
  function filterCollaborateurs(collaborateurs: any[]): any[] {
    const start = performance.now()
    isFiltering.value = true
    
    try {
      let results = [...collaborateurs]
      
      // Filtre par recherche textuelle (restreinte à nom/prénom, accent-insensible)
      if (globalFilterState.search) {
        const normalize = (s: string) => s
          ?.toString()
          .normalize('NFKD')
          .replace(/\p{Diacritic}/gu, '')
          .trim()
          .toLowerCase()
        const digitsOnly = (s: string) => s.replace(/[^0-9]/g, '')

        const searchLower = normalize(globalFilterState.search)
        const searchDigits = digitsOnly(globalFilterState.search)
          // Cas particulier: si la recherche est uniquement numérique et < 3 chiffres,
          // ne pas appliquer de filtre (pour éviter de masquer toute la liste pendant la saisie du téléphone)
          const hasAlpha = /[a-z]/.test(searchLower)
          const hasDigit = /[0-9]/.test(searchLower)
          const isNumericOnly = hasDigit && !hasAlpha && searchLower.replace(/[^0-9]/g, '').length === searchLower.length
          if (isNumericOnly && searchDigits.length > 0 && searchDigits.length < 3) {
            // Ignorer le filtre pour ce cas
            return results
          }
        results = results.filter(collab => {
          const fullName = normalize(`${collab.prenom || ''} ${collab.nom || ''}`)
          const email = normalize(collab.email || '')
          const phoneDigits = digitsOnly(collab.phone || '')
          const nameMatch = fullName.includes(searchLower)
          const emailMatch = !!email && email.includes(searchLower)
          const phoneMatch = searchDigits.length >= 3 && phoneDigits.includes(searchDigits)
          return nameMatch || emailMatch || phoneMatch
        })
      }
      
      // Filtre par métier (normalisé) - supporte string OU objet { text, value }
      if (globalFilterState.metier) {
        const rawMetier = typeof globalFilterState.metier === 'object'
          ? (globalFilterState.metier as any)?.value || (globalFilterState.metier as any)?.text || globalFilterState.metier
          : globalFilterState.metier

        const normalize = (s: string) => s
          ?.toString()
          .normalize('NFKD')
          .replace(/\p{Diacritic}/gu, '')
          .trim()
          .toLowerCase()

        const requested = normalize(rawMetier as string)

        results = results.filter(collab => {
          const m = normalize((collab.metier || '') as string)
          return m === requested
        })
      }
      
      // Filtre par statut (nécessite les disponibilités)
      // Cette logique sera complétée dans filterDisponibilites
      
      return results
    } finally {
      const duration = performance.now() - start
      filteringDuration.value = duration
      isFiltering.value = false
      
      if (duration > 10) {
        console.warn(`🐌 Filtrage collaborateurs lent: ${duration.toFixed(2)}ms`)
      }
    }
  }

  /**
   * Filtre les disponibilités selon les critères actifs
   */
  function filterDisponibilites(disponibilites: any[], filteredCollaborateurs: any[]): any[] {
    const start = performance.now()
    isFiltering.value = true
    
    console.log(`🔍 [DEBUG] DÉBUT filterDisponibilites - Total dispos: ${disponibilites.length}, Total collabs: ${filteredCollaborateurs.length}`)
    console.log(`🔍 [DEBUG] Filtres actifs:`, {
      dateFrom: globalFilterState.dateFrom,
      dateTo: globalFilterState.dateTo,
      lieu: globalFilterState.lieu,
      statut: globalFilterState.statut
    })
    
    // ⚠️ DEBUG SPÉCIAL POUR LE CAS ADV
    if (globalFilterState.lieu === 'ADV' && globalFilterState.dateFrom === '2025-09-15') {
      console.log(`🚨 [DEBUG ADV] Cas spécial détecté: lieu=ADV + date=15-09-2025`)
      console.log(`🚨 [DEBUG ADV] Toutes les dispos pour cette date:`)
      const disposDuJour = disponibilites.filter(d => d.date === '2025-09-15')
      disposDuJour.forEach((d, i) => {
        console.log(`🚨 [DEBUG ADV] Dispo ${i+1}:`, {
          nom: d.nom,
          prenom: d.prenom,
          metier: d.metier,
          lieu: d.lieu,
          type: d.type,
          collaborateurId: d.collaborateurId,
          date: d.date
        })
      })
      
      console.log(`🚨 [DEBUG ADV] Dispos avec lieu contenant "ADV" (case insensitive):`)
      const advDispos = disponibilites.filter(d => 
        d.date === '2025-09-15' && 
        d.lieu && 
        d.lieu.toString().toLowerCase().includes('adv')
      )
      advDispos.forEach((d, i) => {
        console.log(`🚨 [DEBUG ADV] Match ${i+1}:`, {
          nom: d.nom,
          prenom: d.prenom,
          lieu: d.lieu,
          exact: d.lieu.toString().trim().toLowerCase() === 'adv'
        })
      })
    }
    
    try {
      let results = [...disponibilites]
      
      // Debug: examiner quelques disponibilités initiales
      if (results.length > 0) {
        console.log(`🔍 [DEBUG] Exemples de dispos initiales:`, results.slice(0, 3))
      }
      
      // Filtre par collaborateurs filtrés (priorité à l'ID, fallback email, puis nom/prénom normalisés)
      const normalize = (s: string) => (s || '')
        .toString()
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLowerCase()
      const makeNameKey = (nom: string, prenom: string) => `${normalize(nom)}|${normalize(prenom)}`

      const collabIds = new Set(
        filteredCollaborateurs.map(c => c.id).filter(Boolean)
      )
      const collabEmails = new Set(
        filteredCollaborateurs.map(c => (c.email || '').toString().trim().toLowerCase()).filter(Boolean)
      )
      const collabNames = new Set(
        filteredCollaborateurs.map(c => makeNameKey(c.nom, c.prenom))
      )
      
      results = results.filter(dispo => {
        const byId = dispo.collaborateurId ? collabIds.has(dispo.collaborateurId) : false
        const emailLc = (dispo.email || '').toString().trim().toLowerCase()
        const byEmail = emailLc ? collabEmails.has(emailLc) : false
        const byName = collabNames.has(makeNameKey(dispo.nom, dispo.prenom))
        if (!byId && !byEmail && !byName) {
          // Debug ciblé pour comprendre les exclusions
          // console.debug('⛔ Dispo exclue (mismatch collab):', {
          //   dispo: { id: dispo.collaborateurId, nom: dispo.nom, prenom: dispo.prenom },
          //   expectedIds: collabIds.size, expectedNames: collabNames.size
          // })
        }
        return byId || byEmail || byName
      })
      
      console.log(`🔍 [DEBUG] Après filtre collaborateurs: ${results.length} dispos`)
      
      // Filtre par plage de dates
      if (globalFilterState.dateFrom) {
        results = results.filter(dispo => 
          dispo.date >= globalFilterState.dateFrom
        )
        console.log(`🔍 [DEBUG] Après filtre dateFrom (${globalFilterState.dateFrom}): ${results.length} dispos`)
      }
      
      if (globalFilterState.dateTo) {
        results = results.filter(dispo => 
          dispo.date <= globalFilterState.dateTo
        )
        console.log(`🔍 [DEBUG] Après filtre dateTo (${globalFilterState.dateTo}): ${results.length} dispos`)
      }
      
      // Filtre par lieu (seulement si une plage de dates est définie)
      if (globalFilterState.lieu && hasDateRange.value) {
        // Extraire la valeur du lieu (peut être un objet avec .value/.text ou une string)
        const rawLieu = typeof globalFilterState.lieu === 'object'
          ? (globalFilterState.lieu as any)?.value || (globalFilterState.lieu as any)?.text || globalFilterState.lieu
          : globalFilterState.lieu
        const requestedLieu = (rawLieu || '').toString().trim().toLowerCase()

        console.log(`🔍 [DEBUG] Filtre lieu - objet:`, globalFilterState.lieu, `-> valeur extraite: "${requestedLieu}"`)

        // Normalisation simple pour matcher des lieux composés (ex: "ADV - Paris")
        const normalize = (s: string) => s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
        const req = normalize(requestedLieu)

        results = results.filter(dispo => {
          const dLieuRaw = (dispo.lieu || '').toString()
          const dLieu = normalize(dLieuRaw)
          // Match strict OU sous-chaîne pour plus de tolérance
          const match = dLieu === req || (req.length >= 2 && dLieu.includes(req))
          return match
        })

        console.log(`🔍 [DEBUG] Après filtre lieu ("${requestedLieu}"): ${results.length} dispos`)
      }
      
      // Filtre par statut (seulement si une plage de dates est définie)
      if (globalFilterState.statut && hasDateRange.value) {
        // Extraire et normaliser la valeur du statut (peut être un objet avec .value ou une string)
        const rawStatut = typeof globalFilterState.statut === 'object' 
          ? (globalFilterState.statut as any)?.value || (globalFilterState.statut as any)?.text || globalFilterState.statut
          : globalFilterState.statut
        const normalizeStatut = (s: string): string => {
          const v = (s || '').toString().trim().toLowerCase()
          if (v === 'mission' || v === 'en mission') return 'mission'
          if (v === 'disponible') return 'disponible'
          if (v === 'indisponible') return 'indisponible'
          return v
        }
        const statutValue = normalizeStatut(rawStatut as string)
        
        console.log(`🔍 [DEBUG] Filtrage par statut: "${statutValue}" (type: ${typeof globalFilterState.statut})`)
        console.log(`🔍 [DEBUG] Nombre de dispos avant filtre statut: ${results.length}`)
        
        // Debug: examiner quelques disponibilités
        if (results.length > 0) {
          console.log(`🔍 [DEBUG] Exemple de disponibilités à analyser:`, results.slice(0, 3))
        }
        
        results = results.filter(dispo => {
          try {
            // Utiliser resolveDispoKind pour une logique cohérente avec PlanningSemaine
            const kind = resolveDispoKind(dispo)
            let type = kind.type
            
            // Mapper les types alternatifs vers les types UI attendus
            const typeMapping: Record<string, string> = {
              'standard': 'disponible',
              'formation': 'mission', 
              'urgence': 'mission',
              'maintenance': 'indisponible'
            }
            
            // Appliquer le mapping si nécessaire
            const mappedType = typeMapping[type] || type
            
            const match = mappedType === statutValue
            
            // ⚠️ DEBUG SPÉCIAL POUR LES MISSIONS ADV
            if (globalFilterState.lieu === 'ADV' && statutValue === 'mission') {
              console.log(`🚨 [DEBUG MISSION ADV] ${dispo.nom} ${dispo.prenom}:`, {
                lieu: dispo.lieu,
                typeOriginal: dispo.type,
                kindResolved: kind.type,
                mappedType: mappedType,
                isMatch: match,
                resolveKindResult: kind
              })
            }
            
            if (!match) {
              console.log(`🔍 [DEBUG] Dispo rejetée: ${dispo.nom} ${dispo.prenom} - ${dispo.date} - lieu: "${dispo.lieu}" - type résolu: "${kind.type}" -> "${mappedType}" != "${statutValue}"`)
            } else {
              console.log(`🔍 [DEBUG] Dispo acceptée: ${dispo.nom} ${dispo.prenom} - ${dispo.date} - lieu: "${dispo.lieu}" - type résolu: "${kind.type}" -> "${mappedType}"`)
            }
            
            return match
          } catch (error) {
            console.error(`🔍 [ERROR] Erreur dans resolveDispoKind pour dispo:`, dispo, error)
            return false
          }
        })
        
        console.log(`🔍 [DEBUG] Nombre de dispos après filtre statut: ${results.length}`)
        if (!globalFilterState.lieu) {
          console.log('🔍 [DEBUG] Aucun filtre lieu actif; toutes missions matchées sont gardées')
        }
      }
      
      return results
    } finally {
      const duration = performance.now() - start
      filteringDuration.value = duration
      isFiltering.value = false
      
      if (duration > 10) {
        console.warn(`🐌 Filtrage disponibilités lent: ${duration.toFixed(2)}ms`)
      }
    }
  }

  /**
   * Dérive le type d'une disponibilité depuis son lieu (legacy - DEPRECATED)
   * Remplacé par resolveDispoKind pour une logique cohérente
   */
  // function deriveTypeFromLieu(lieu: string): string {
  //   if (!lieu) return 'disponible'
  //   
  //   const lieuCanon = lieu.toUpperCase().trim()
  //   
  //   if (lieuCanon === 'INDISPONIBLE') return 'indisponible'
  //   if (lieuCanon === 'DISPONIBLE' || lieuCanon === 'DISPO' || lieuCanon === 'DISPO JOURNEE') {
  //     return 'disponible'
  //   }
  //   
  //   return 'mission' // Lieu spécifique = mission
  // }

  // ==========================================
  // ACTIONS DE FILTRAGE
  // ==========================================

  /**
   * Met à jour un filtre spécifique
   */
  function updateFilter(key: keyof FilterState, value: string) {
    const oldValue = globalFilterState[key]
    globalFilterState[key] = value
    
    // Log pour debug
    if (key === 'dateFrom' || key === 'dateTo') {
      console.log(`🗓️ [FILTERS] ${key} mis à jour: ${oldValue} → ${value}`)
    }
    
    // Log pour debug des filtres lieu/statut
    if (key === 'lieu' || key === 'statut') {
      console.log(`🎯 [FILTERS] ${key} mis à jour: ${oldValue} → ${value}`)
    }
    
    // Si on efface les dates, effacer aussi lieu et statut
    if ((key === 'dateFrom' || key === 'dateTo') && !value) {
      const hasAnyDate = globalFilterState.dateFrom || globalFilterState.dateTo
      if (!hasAnyDate) {
        globalFilterState.lieu = ''
        globalFilterState.statut = ''
        console.log('🧹 [FILTERS] Lieu et statut effacés (pas de dates)')
      }
    }
  }

  /**
   * Met à jour tous les filtres depuis un objet
   */
  function updateFilters(filters: Partial<FilterState>) {
    Object.keys(filters).forEach(key => {
      if (key in globalFilterState) {
        globalFilterState[key as keyof FilterState] = filters[key as keyof FilterState] || ''
      }
    })
  }

  /**
   * Efface tous les filtres
   */
  function clearAllFilters() {
    globalFilterState.search = ''
    globalFilterState.metier = ''
    globalFilterState.lieu = ''
    globalFilterState.statut = ''
    globalFilterState.dateFrom = ''
    globalFilterState.dateTo = ''
  }

  /**
   * Efface un filtre spécifique
   */
  function clearFilter(key: keyof FilterState) {
    globalFilterState[key] = ''
  }

  // ==========================================
  // GESTION DES SUGGESTIONS
  // ==========================================

  /**
   * Sélectionne une suggestion et met à jour les filtres correspondants
   */
  function selectSuggestion(suggestion: FilterSuggestion) {
    const safeValue = (suggestion.value || '').toString()
  if (suggestion.type === 'Collaborateur' || suggestion.type === 'Email' || suggestion.type === 'Téléphone') {
      // Pour un collaborateur, on alimente la recherche texte (nom/prénom)
      globalFilterState.search = safeValue
      // Ne PAS effacer la recherche ici: l'utilisateur souhaite voir/filtrer ce nom
      showSuggestions.value = false
      searchFocused.value = false
      return
    }
    if (suggestion.type === 'Métier') {
      globalFilterState.metier = safeValue
    } else if (suggestion.type === 'Lieu') {
      globalFilterState.lieu = safeValue
    }
    // Pour les autres types, on peut effacer la recherche pour clarifier l'UI
    globalFilterState.search = ''
    showSuggestions.value = false
    searchFocused.value = false
  }

  /**
   * Gère l'affichage des suggestions
   */
  function handleSearchFocus() {
    searchFocused.value = true
    showSuggestions.value = true
  }

  function handleSearchBlur() {
    // Délai pour permettre le clic sur une suggestion
    setTimeout(() => {
      showSuggestions.value = false
      searchFocused.value = false
    }, 200)
  }

  // ==========================================
  // FORMAT ET UTILITAIRES
  // ==========================================

  /**
   * Formate la plage de dates pour l'affichage
   */
  const formatFilterDateRange = computed(() => {
    if (globalFilterState.dateFrom && globalFilterState.dateTo) {
      return `${formatDate(globalFilterState.dateFrom)} - ${formatDate(globalFilterState.dateTo)}`
    } else if (globalFilterState.dateFrom) {
      return `À partir du ${formatDate(globalFilterState.dateFrom)}`
    } else if (globalFilterState.dateTo) {
      return `Jusqu'au ${formatDate(globalFilterState.dateTo)}`
    }
    return ''
  })

  function formatDate(dateStr: string): string {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      })
    } catch {
      return dateStr
    }
  }

  // ==========================================
  // SYNCHRONISATION TEMPS RÉEL
  // ==========================================

  /**
   * Fonction de refresh pour la synchronisation temps réel
   */
  function refreshFilters() {
    // Force la réactivité des computed
    // Les filtres se mettront à jour automatiquement grâce à la réactivité Vue
    console.log('🔄 [FILTERS] Refresh des filtres')
  }

  // Enregistrement pour les mises à jour temps réel
  const unregister = registerRefreshCallback(refreshFilters)

  // ==========================================
  // RETOUR DU COMPOSABLE
  // ==========================================

  return {
    // État des filtres
    filterState: globalFilterState,
    hasActiveFilters,
    hasDateRange,
    canFilterByLieuStatut,
    isFiltering,
    filteringDuration,
    
    // Options des filtres
    metiersOptions: metiersCache,
    lieuxOptions: lieuxCache,
    statutsOptions: statutsCache,
    
    // Suggestions
    searchSuggestions,
    showSuggestions,
    searchFocused,
    
    // Actions de mise à jour des options
    updateMetiersOptions,
    updateLieuxOptions,
    updateStatutsOptions,
  updateCollaborateursIndex,
    
    // Actions de filtrage
    filterCollaborateurs,
    filterDisponibilites,
    
    // Actions de gestion des filtres
    updateFilter,
    updateFilters,
    clearAllFilters,
    clearFilter,
    
    // Gestion des suggestions
    selectSuggestion,
    handleSearchFocus,
    handleSearchBlur,
    
    // Utilitaires
    formatFilterDateRange,
    formatDate,
    
    // Nettoyage
    unregister
  }
}
