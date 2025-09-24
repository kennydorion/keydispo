<template>
  <div class="collaborateur-calendar" ref="containerRef">
    <FullCalendar 
      ref="fcRef" 
      :options="calendarOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import * as planningDisplayService from '@/services/planningDisplayService'
import { canonicalizeLieu as canonicalizeLieuShared } from '@/services/normalization'
import { toDateStr } from '@/utils/dateHelpers'

// Types
interface CollaborateurProfilLight {
  id: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  email: string | null
  phone: string | null
  ville?: string | null
  color?: string | null
  createdAt?: any
  updatedAt?: any
}

interface CollaborateurDisponibilite {
  id?: string
  date: string // YYYY-MM-DD
  lieu: string
  heure_debut: string
  heure_fin: string
  type?: 'disponible' | 'indisponible' | 'mission' // Types UI pour l'affichage
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight' // Types UI pour l'affichage
  slots?: string[]
  isFullDay?: boolean
  version?: number
  statut?: string // Peut-être encore utilisé dans certains cas
}

// Props et émissions
const props = defineProps<{
  disponibilites: CollaborateurDisponibilite[]
  collaborateur: CollaborateurProfilLight | null
  selectedCells?: Set<string>
  isSelectionMode?: boolean
  isDraggingSelection?: boolean
  shortcutActive?: boolean
  // Props pour fonctionnalités multi-utilisateurs
  isHoveredByOthers?: (collaborateurId: string, date: string) => boolean
  isLockedByOthers?: (collaborateurId: string, date: string) => boolean
  getHoveringUserColor?: (collaborateurId: string, date: string) => string
  getHoveringUserInitials?: (collaborateurId: string, date: string) => string
}>()

const emit = defineEmits<{
  add: [dateStr: string]
  edit: [id: string]
  cellClick: [dateStr: string, disponibilites: CollaborateurDisponibilite[]]
  cellMouseDown: [cellId: string, event: MouseEvent]
  cellMouseEnter: [cellId: string, event: MouseEvent]  
  cellMouseUp: [cellId: string, event: MouseEvent]
  // Mobile touch long press
  cellTouchStart: [cellId: string, dateStr: string, event: TouchEvent]
  cellTouchEnd: [cellId: string, dateStr: string, event: TouchEvent]
  // Événements pour les survols multi-utilisateurs
  cellHover: [collaborateurId: string, date: string]
  cellLeave: [collaborateurId: string, date: string]
  // Événement pour la plage de dates
  rangeChange: [range: { start: string; end: string }]
}>()

const fcRef = ref<any>(null)
const containerRef = ref<HTMLElement | null>(null)

// Protection contre les boucles de survol
let currentHoveredCell: string | null = null
let hoverDebounceTimer: number | null = null

// Exposer des méthodes pour le composant parent
defineExpose({
  refreshAllCells,
  forceCompleteRefresh,
  getApi: () => fcRef.value?.getApi()
})

// Méthode de refresh plus agressive en cas de problème
function forceCompleteRefresh() {
  if (!fcRef.value) {
    return
  }
  
  const calendarApi = fcRef.value.getApi()
  
  // Au lieu de destroy, forcer plusieurs re-renders
  calendarApi.render()
  
  nextTick(() => {
    refreshAllCells()
    
    // Forcer encore un re-render après mise à jour
    setTimeout(() => {
      calendarApi.render()
      refreshAllCells()
    }, 50)
  })
}

// Gestionnaire de visibilité pour forcer la mise à jour quand l'onglet redevient actif
let visibilityHandler: (() => void) | null = null

onMounted(() => {
  visibilityHandler = () => {
    if (!document.hidden && fcRef.value) {
      nextTick(() => {
        refreshAllCells()
      })
    }
  }
  
  document.addEventListener('visibilitychange', visibilityHandler)

  // Navigation par scroll: changer de mois avec la molette
  const wheelHandler = (e: WheelEvent) => onWheelNavigate(e)
  ;(onMounted as any)._wheelHandler = wheelHandler
  containerRef.value?.addEventListener('wheel', wheelHandler, { passive: false })
})

onUnmounted(() => {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
  }
  const wheelHandler = (onMounted as any)._wheelHandler as (e: WheelEvent) => void
  if (wheelHandler) {
    containerRef.value?.removeEventListener('wheel', wheelHandler as any)
  }
})

watch(() => props.disponibilites, (newDispos, oldDispos) => {
  // Éviter les logs en boucle - seulement si changement réel
  const oldCount = oldDispos?.length || 0
  const newCount = newDispos?.length || 0
  const oldIds = oldDispos?.map(d => d.id).join(',') || ''
  const newIds = newDispos?.map(d => d.id).join(',') || ''
  
  if (oldCount !== newCount || oldIds !== newIds) {
    console.log('🔄 [COLLAB-CALENDAR] Watcher disponibilites déclenché:', {
      nouvelles: newCount,
      anciennes: oldCount
    })
    
    if (fcRef.value) {
      nextTick(() => {
        // Force le re-render de toutes les cellules
        refreshAllCells()
        
        // Forcer aussi une actualisation complète du calendrier FullCalendar
        // pour s'assurer que tous les changements sont pris en compte
        const calendarApi = fcRef.value.getApi()
        calendarApi.render()
      })
    }
  }
}, { 
  deep: true, 
  immediate: false // Pas d'exécution immédiate pour éviter les doubles rendus
})

// Watcher supplémentaire pour détecter les changements d'ID de disponibilités
// (utile pour les mises à jour/suppressions temps réel)
watch(() => props.disponibilites?.map(d => d.id).join(','), (newIds, oldIds) => {
  if (newIds !== oldIds && fcRef.value) {
    nextTick(() => {
      refreshAllCells()
    })
  }
})

// Watcher pour les changements de collaborateur
watch(() => props.collaborateur?.id, (newId, oldId) => {
  if (newId !== oldId && fcRef.value) {
    nextTick(() => {
      refreshAllCells()
    })
  }
})

// Fonction pour rafraîchir toutes les cellules avec les nouvelles données
function refreshAllCells() {
  if (!fcRef.value) {
    return
  }
  
  const calendarApi = fcRef.value.getApi()
  
  // Forcer un re-render complet de FullCalendar d'abord
  calendarApi.render()
  
  const allDayCells = calendarApi.el.querySelectorAll('.fc-daygrid-day')
  
  allDayCells.forEach((dayEl: HTMLElement) => {
    const dateAttr = dayEl.getAttribute('data-date')
    if (dateAttr) {
      updateCellContent(dayEl, dateAttr)
    }
  })
  
  // Forcer un deuxième re-render après la mise à jour du contenu
  setTimeout(() => {
    calendarApi.render()
  }, 10)
}

// Fonction pour mettre à jour le contenu d'une cellule
function updateCellContent(dayEl: HTMLElement, dateStr: string) {
  const eventsArea = dayEl.querySelector('.fc-daygrid-day-events')
  if (!eventsArea) {
    return
  }
  
  // Supprimer complètement l'ancien contenu et tous les event listeners
  const oldContent = eventsArea.querySelector('.dispo-bars')
  if (oldContent) {
    // Nettoyer les event listeners pour éviter les fuites mémoire
    oldContent.remove()
  }
  eventsArea.innerHTML = ''
  
  // Créer le nouveau contenu
  const dispoBars = document.createElement('div')
  dispoBars.className = 'dispo-bars'
  
  // Récupérer les disponibilités pour la date, incluant les continuations overnight
  const dayDispos = getCellDisposForDate(dateStr)
  
  if (dayDispos.length === 0) {
    // Cellule vide - bouton d'ajout
    dispoBars.innerHTML = `
      <div class='dispo-add-card' data-date='${dateStr}'>
        <span class='material-icons add-icon' aria-hidden='true'>add</span>
        <span class='add-text'>Ajouter</span>
      </div>
    `
  } else {
    // Ordonner: continuations overnight d'abord (heure de fin; slot night traité comme 06:00),
    // puis slots (ordre logique), puis ranges (début), full-day en dernier
    const slotOrder: Record<string, number> = { morning: 1, midday: 2, afternoon: 3, evening: 4, night: 5 }
    const toMin = (t?: string) => {
      if (!t) return 10_000
      const [h, m] = (t || '').split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    const contEndKey = (d: CollaborateurDisponibilite) => {
      if (d.timeKind === 'slot' && Array.isArray(d.slots) && d.slots.includes('night')) return 6 * 60
      return toMin(d.heure_fin)
    }
    const slotKey = (d: CollaborateurDisponibilite) => {
      if (!(d.timeKind === 'slot' && Array.isArray(d.slots) && d.slots.length)) return 10_000
      const sorted = [...d.slots].sort((a, b) => (slotOrder[a] || 99) - (slotOrder[b] || 99))
      return slotOrder[sorted[0]] || 99
    }
    const rangeStartKey = (d: CollaborateurDisponibilite) => toMin(d.heure_debut)
    dayDispos.sort((a, b) => {
      const aFD = a.timeKind === 'full-day'
      const bFD = b.timeKind === 'full-day'
      if (aFD && !bFD) return 1
      if (bFD && !aFD) return -1
      const aCont = (a as any)._cont === 'end'
      const bCont = (b as any)._cont === 'end'
      if (aCont && bCont) return contEndKey(a) - contEndKey(b)
      if (aCont && !bCont) return -1
      if (bCont && !aCont) return 1
      const aSlot = a.timeKind === 'slot'
      const bSlot = b.timeKind === 'slot'
      if (aSlot && bSlot) return slotKey(a) - slotKey(b)
      if (aSlot && !bSlot) return -1
      if (bSlot && !aSlot) return 1
      return rangeStartKey(a) - rangeStartKey(b)
    })

    // Cellule avec disponibilités - ajouter un gestionnaire de clic général
    dispoBars.addEventListener('click', (e: Event) => {
      // Si on clique en dehors d'une carte spécifique, émettre cellClick (ouverture modale côté parent ou sélection si en mode sélection)
      if ((e.target as HTMLElement).closest('.dispo-card') === null && 
          (e.target as HTMLElement).closest('.dispo-add-more') === null &&
          (e.target as HTMLElement).closest('.dispo-add-card') === null) {
        e.stopPropagation()
        // Vérifier si la cellule est verrouillée avant d'autoriser le clic
        if (props.collaborateur?.id && props.isLockedByOthers?.(props.collaborateur.id, dateStr)) {
          return // Empêcher le clic si cellule verrouillée
        }
        emit('cellClick', dateStr, dayDispos)
      }
    })
    
    // Déterminer la classe de layout selon le nombre de dispos
    const layoutClass = dayDispos.length === 1 ? 'single' : 
                       dayDispos.length === 2 ? 'dual' : 'multi'
    dispoBars.className += ` ${layoutClass}`
    
    // Ajouter un attribut data-count pour le CSS spécifique au nombre
    dispoBars.setAttribute('data-count', dayDispos.length.toString())
    
    // Créer les cartes de disponibilité avec la logique exacte du planning admin
    dayDispos.forEach((dispo: CollaborateurDisponibilite & { _cont?: 'start' | 'end' }) => {
      const temporal = getTemporalDisplay(dispo)
      const iconName = getDispoTypeIcon(dispo)
      const continuationClass = getDispoContinuationClass(dispo, dateStr)
      const cardClass = `dispo-card ${getDispoCardClass(dispo)} ${continuationClass}`
      const tooltipTitle = getDispoBarTitle(dispo as any, dateStr)
      const kind = planningDisplayService.resolveDispoKind(dispo as any)
      const showLieu = (kind.type === 'mission') && !!(dispo.lieu && dispo.lieu.trim())
      
      // Conversion des icônes en Material Icons pour l'affichage
      let iconText = 'schedule' // Par défaut
      switch (iconName) {
        case 'work': iconText = 'work'; break
        case 'block': iconText = 'block'; break
        case 'check_circle': iconText = 'check_circle'; break
        default: iconText = 'schedule'; break
      }
      
      const dispoCard = document.createElement('div')
      dispoCard.className = cardClass
      if (dispo.id) {
        dispoCard.dataset.dispoId = dispo.id
      }
      if (tooltipTitle) {
        dispoCard.title = tooltipTitle
        dispoCard.setAttribute('aria-label', 'Détail disponibilité')
      }
      
      // Structure HTML identique au planning admin
  const overnightStart = isOvernightStart(dispo, dateStr)
  const overnightCont = isOvernightContinuation(dispo, dateStr)

  const locationHtml = showLieu ? `
        <div class="dispo-footer">
          <span class="dispo-lieu" title="${(dispo.lieu || '').replace(/"/g, '&quot;')}">${dispo.lieu}</span>
        </div>
      ` : ''

  dispoCard.innerHTML = `
        <div class="dispo-unified-content">
          <div class="dispo-main-info">
            <span class="material-icons dispo-type-icon" style="font-size: 10px;">${iconText}</span>
    <span class="dispo-temporal">${temporal}</span>
    ${overnightCont ? '<span class="overnight-symbol" title="Suite">⤺</span>' : ''}
    ${overnightStart ? '<span class="overnight-symbol" title="Continue">⤻</span>' : ''}
          </div>
        </div>
        ${locationHtml}
      `
      
      // Ajouter l'événement de clic
      dispoCard.addEventListener('click', (e: Event) => {
        const me = e as MouseEvent
        if (props.shortcutActive || me.ctrlKey || me.metaKey || props.isSelectionMode) {
          // Toggle sélection pour cette cellule
          me.preventDefault()
          e.stopPropagation()
          emit('cellClick', dateStr, dayDispos)
          return
        }
        e.stopPropagation()
        // Vérifier si la cellule est verrouillée avant d'autoriser l'édition
        if (props.collaborateur?.id && props.isLockedByOthers?.(props.collaborateur.id, dateStr)) {
          return // Empêcher l'édition si cellule verrouillée
        }
        if (dispo.id) {
          emit('edit', dispo.id)
        }
      })
      
      dispoBars.appendChild(dispoCard)
    })
    
    // Ajouter un petit bouton + pour ajouter une nouvelle disponibilité
  const addMoreButton = document.createElement('div')
  addMoreButton.className = 'dispo-add-more'
  addMoreButton.innerHTML = `<span class='material-icons' aria-hidden='true' style='font-size: 14px; line-height: 20px;'>add</span>`
    addMoreButton.addEventListener('click', (e: Event) => {
      const me = e as MouseEvent
      if (props.shortcutActive || me.ctrlKey || me.metaKey || props.isSelectionMode) {
        // Toggle sélection via cellClick dans la même cellule
        me.preventDefault()
        e.stopPropagation()
        emit('cellClick', dateStr, dayDispos)
        return
      }
      e.stopPropagation()
      // Vérifier si la cellule est verrouillée avant d'autoriser l'ajout
      if (props.collaborateur?.id && props.isLockedByOthers?.(props.collaborateur.id, dateStr)) {
        return // Empêcher l'ajout si cellule verrouillée
      }
      emit('add', dateStr)
    })
    dispoBars.appendChild(addMoreButton)
  }
  
  // Ajouter les événements pour le bouton d'ajout
  const addButton = dispoBars.querySelector('.dispo-add-card')
  if (addButton) {
    addButton.addEventListener('click', (e: Event) => {
      const me = e as MouseEvent
      if (props.shortcutActive || me.ctrlKey || me.metaKey || props.isSelectionMode) {
        // Toggle sélection via cellClick
        me.preventDefault()
        e.stopPropagation()
        emit('cellClick', dateStr, dayDispos)
        return
      }
      e.stopPropagation()
      // Vérifier si la cellule est verrouillée avant d'autoriser l'ajout
      if (props.collaborateur?.id && props.isLockedByOthers?.(props.collaborateur.id, dateStr)) {
        return // Empêcher l'ajout si cellule verrouillée
      }
      emit('add', dateStr)
    })
  }
  
  // Gestion de la sélection multi-cellules et survols multi-utilisateurs
  if (props.selectedCells && props.collaborateur?.id) {
    const cellId = `${props.collaborateur.id}-${dateStr}`
    
    // Nettoyer toutes les classes d'état d'abord
    dayEl.classList.remove('selected-cell', 'has-presence', 'locked-by-others')
    dayEl.style.removeProperty('--hovering-user-color')
    dayEl.removeAttribute('data-initials')
    
    // Ajouter la classe de sélection si nécessaire
    if (props.selectedCells.has(cellId)) {
      dayEl.classList.add('selected-cell')
    }
    
    // Vérifier si la cellule est verrouillée par d'autres utilisateurs
    if (props.isLockedByOthers?.(props.collaborateur.id, dateStr)) {
      dayEl.classList.add('locked-by-others')
    }
    
    // Vérifier si la cellule est survolée par d'autres utilisateurs
    if (props.isHoveredByOthers?.(props.collaborateur.id, dateStr)) {
      dayEl.classList.add('has-presence')
      const hoverColor = props.getHoveringUserColor?.(props.collaborateur.id, dateStr)
      const hoverInitials = props.getHoveringUserInitials?.(props.collaborateur.id, dateStr)
      
      if (hoverColor) {
        dayEl.style.setProperty('--hovering-user-color', hoverColor)
      }
      if (hoverInitials) {
        dayEl.setAttribute('data-initials', hoverInitials)
      }
    }
    
    // Événements de sélection
    dayEl.addEventListener('mousedown', (e: MouseEvent) => {
      const t = e.target as HTMLElement
      // Si Cmd/Ctrl (prop ou event) ou mode sélection actif, on priorise la sélection et on bloque toute autre interaction
      if (props.shortcutActive || e.ctrlKey || e.metaKey || props.isSelectionMode) {
        e.preventDefault()
        e.stopPropagation()
        emit('cellMouseDown', cellId, e)
        return
      }
      // Sinon, ne pas intercepter les clics sur les éléments interactifs internes
      if (t.closest('.dispo-add-card, .dispo-add-more, .dispo-card')) {
        return
      }
      // Empêcher la sélection si cellule verrouillée
      if (props.collaborateur?.id && props.isLockedByOthers?.(props.collaborateur.id, dateStr)) {
        e.preventDefault()
        return
      }
      // Déclencher la sélection si Ctrl/Cmd ou si le mode sélection est actif côté parent
      // (déjà géré plus haut)
    })
    
    dayEl.addEventListener('mouseenter', (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('.dispo-add-card, .dispo-add-more, .dispo-card')) {
        // Laisser l'élément interne gérer son propre hover/clic
        return
      }
      if (props.isDraggingSelection) {
        emit('cellMouseEnter', cellId, e)
      }
      // Protection contre les boucles de survol multi-utilisateur
      const fullCellId = `${props.collaborateur?.id}-${dateStr}`
      if (currentHoveredCell !== fullCellId) {
        if (hoverDebounceTimer) {
          clearTimeout(hoverDebounceTimer)
          hoverDebounceTimer = null
        }
        currentHoveredCell = fullCellId
        hoverDebounceTimer = setTimeout(() => {
          if (currentHoveredCell === fullCellId && props.collaborateur?.id) {
            emit('cellHover', props.collaborateur.id, dateStr)
          }
        }, 100) as any
      }
    })
    
  dayEl.addEventListener('mouseleave', () => {
      // Protection contre les boucles de survol multi-utilisateur
      const fullCellId = `${props.collaborateur?.id}-${dateStr}`
      if (currentHoveredCell === fullCellId) {
        if (hoverDebounceTimer) {
          clearTimeout(hoverDebounceTimer)
          hoverDebounceTimer = null
        }
        currentHoveredCell = null
    // Délai court (grâce) pour le leave afin d'éviter le flicker si on revient vite
    setTimeout(() => {
          if (props.collaborateur?.id) {
            emit('cellLeave', props.collaborateur.id, dateStr)
          }
    }, 250)
      }
    })
    
    dayEl.addEventListener('mouseup', (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('.dispo-add-card, .dispo-add-more, .dispo-card')) {
        return
      }
      if (props.isDraggingSelection) {
        emit('cellMouseUp', cellId, e)
      }
    })

    // Gestion tactile mobile: long press pour activer la sélection
    dayEl.addEventListener('touchstart', (e: TouchEvent) => {
      // Ignorer les interactions internes
      const t = (e.target as HTMLElement)
      if (t.closest('.dispo-add-card, .dispo-add-more, .dispo-card')) return
      emit('cellTouchStart', cellId, dateStr, e)
    }, { passive: true })

    dayEl.addEventListener('touchend', (e: TouchEvent) => {
      const t = (e.target as HTMLElement)
      if (t.closest('.dispo-add-card, .dispo-add-more, .dispo-card')) return
      emit('cellTouchEnd', cellId, dateStr, e)
    }, { passive: true })
  }
  
  // Insérer les barres dans la cellule
  eventsArea.appendChild(dispoBars)
}

// Utilitaires
function getDisponibilitesForDate(dateStr: string): CollaborateurDisponibilite[] {
  return (props.disponibilites || []).filter(d => d.date === dateStr)
}

// === LOGIQUE DE CONTINUATION (overnight) — alignée sur le planning admin ===
function toMinutes(t?: string): number {
  if (!t) return -1
  const [hh, mm] = t.split(':').map((v) => parseInt(v, 10))
  if (Number.isNaN(hh) || Number.isNaN(mm)) return -1
  return hh * 60 + mm
}

function addDaysStr(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map((v) => parseInt(v, 10))
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + delta)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function partForDay(d: CollaborateurDisponibilite, day: string): 'start' | 'end' | null {
  // Déterminer si la dispo est overnight
  const isOvernight = (d.timeKind === 'overnight') || (toMinutes(d.heure_fin) >= 0 && toMinutes(d.heure_debut) >= 0 && toMinutes(d.heure_fin) < toMinutes(d.heure_debut))
  if (d.date === day) {
    return 'start'
  }
  const next = addDaysStr(d.date, 1)
  if (next === day && isOvernight) return 'end'
  return null
}

function getCellDisposForDate(dateStr: string): Array<CollaborateurDisponibilite & { _cont?: 'start' | 'end' }> {
  const list = getDisponibilitesForDate(dateStr)
  const out: Array<CollaborateurDisponibilite & { _cont?: 'start' | 'end' }> = []
  for (const d of list) {
    // Marquer la partie pour ce jour (start)
    const part = partForDay(d, dateStr)
    if (part) out.push({ ...d, _cont: part })
    else out.push(d)
  }
  // NOTE: Les continuations overnight ont été désactivées à la demande des utilisateurs  
  // Les disponibilités de nuit n'apparaissent maintenant que sur le jour de début
  // pour simplifier l'affichage et éviter la confusion
  return out
}

function isOvernightContinuation(dispo: CollaborateurDisponibilite & { _cont?: 'start' | 'end' }, _cellDate: string) {
  return dispo._cont === 'end'
}

function isOvernightStart(dispo: CollaborateurDisponibilite & { _cont?: 'start' | 'end' }, _cellDate: string) {
  if (dispo._cont === 'end') return false
  if (dispo.timeKind === 'slot' && Array.isArray(dispo.slots) && dispo.slots.includes('night')) return true
  const s = toMinutes(dispo.heure_debut)
  const e = toMinutes(dispo.heure_fin)
  return (dispo.timeKind === 'overnight') || (s >= 0 && e >= 0 && e < s)
}

function getDispoContinuationClass(dispo: CollaborateurDisponibilite & { _cont?: 'start' | 'end' }, cellDate: string) {
  if (isOvernightContinuation(dispo, cellDate)) return 'dispo-continuation cont-from-prev'
  if (isOvernightStart(dispo, cellDate)) return 'dispo-continuation cont-to-next'
  return ''
}

// ====== TOOLTIP/TITLE comme dans le planning admin ======
function fullTimeLabel(d: CollaborateurDisponibilite): string {
  const s = (d.heure_debut || '').substring(0, 5)
  const e = (d.heure_fin || '').substring(0, 5)
  if (!s || !e) return ''
  const sFr = s.replace(':', 'h')
  const eFr = e.replace(':', 'h')
  return `de ${sFr} à ${eFr}`
}

function canonicalizeLieu(lieu: string): string {
  return canonicalizeLieuShared(lieu)
}

function getDispoBarTitle(dispo: CollaborateurDisponibilite, _cellDate: string): string {
  const k = planningDisplayService.resolveDispoKind(dispo as any)

  const slotRange = (s: string) => {
    const map: Record<string, [string, string]> = {
      morning: ['06:00', '12:00'],
      midday: ['12:00', '14:00'],
      lunch: ['12:00', '14:00'],
      afternoon: ['14:00', '18:00'],
      evening: ['18:00', '22:00'],
      night: ['22:00', '06:00']
    }
    const r = map[s]
    if (!r) return ''
    const fmt = (t: string) => t.replace(':', 'h')
    return `${fmt(r[0])}–${fmt(r[1])}`
  }
  const slotsTooltip = (slots?: string[]) => {
    const arr = (slots || []).filter(Boolean)
    if (!arr.length) return ''
    // Afficher la liste complète avec horaires
    const parts = arr.map(s => `${planningDisplayService.slotLabel(s)} (${slotRange(s)})`)
    return parts.join(' · ')
  }

  if (k.type === 'mission') {
    if (k.timeKind === 'slot' && k.slots?.length) {
      const lieu = dispo.lieu ? canonicalizeLieu(dispo.lieu) : ''
      const st = slotsTooltip(k.slots)
      return lieu ? `${lieu} — ${st}` : st
    }
    if ((k.timeKind === 'range' || k.timeKind === 'overnight') && dispo.heure_debut && dispo.heure_fin) {
      const lieu = dispo.lieu ? canonicalizeLieu(dispo.lieu) : ''
      return lieu ? `${lieu} ${fullTimeLabel(dispo)}` : fullTimeLabel(dispo)
    }
    return dispo.lieu ? canonicalizeLieu(dispo.lieu) : 'Mission'
  }

  if (k.type === 'disponible') {
    if (k.timeKind === 'slot' && k.slots?.length) {
      return slotsTooltip(k.slots)
    }
    if ((k.timeKind === 'range' || k.timeKind === 'overnight') && dispo.heure_debut && dispo.heure_fin) {
      return fullTimeLabel(dispo)
    }
    return 'Disponible'
  }

  if (k.type === 'indisponible') {
    return 'Indisponible'
  }

  return dispo.heure_debut && dispo.heure_fin ? fullTimeLabel(dispo) : ''
}

// Copie exacte de la fonction du planning admin
function getDispoCardClass(dispo: CollaborateurDisponibilite): string {
  const dispoData = {
    date: dispo.date,
    lieu: dispo.lieu,
    heure_debut: dispo.heure_debut,
    heure_fin: dispo.heure_fin,
    type: dispo.type // Utiliser le champ type au lieu de statut
  }
  
  const k = planningDisplayService.resolveDispoKind(dispoData)
  
  // Fallback: vérification directe du lieu pour les indisponibilités
  if (!dispo.type && dispo.lieu) {
    const lieuUpper = dispo.lieu.toUpperCase().trim()
    if (lieuUpper === 'INDISPONIBLE' || lieuUpper === 'INDISPO') {
      k.type = 'indisponible'
    }
  }
  
  return `dispo-card-${k.type}`
}

// Copie exacte de la fonction du planning admin
function getTemporalDisplay(dispo: CollaborateurDisponibilite): string {
  const result = planningDisplayService.getTemporalDisplay({
    date: dispo.date,
    lieu: dispo.lieu,
    heure_debut: dispo.heure_debut,
    heure_fin: dispo.heure_fin,
    type: dispo.type, // Utiliser le champ type au lieu de statut
    timeKind: dispo.timeKind, // ⚠️ IMPORTANT: Passer timeKind pour les créneaux
    slots: dispo.slots, // ⚠️ IMPORTANT: Passer slots pour afficher "midday", "afternoon", etc.
    isFullDay: dispo.isFullDay
  })
  
  return result
}

// Copie exacte de la fonction du planning admin
function getDispoTypeIcon(dispo: CollaborateurDisponibilite): string {
  return planningDisplayService.getDispoTypeIcon({
    date: dispo.date,
    lieu: dispo.lieu,
    heure_debut: dispo.heure_debut,
    heure_fin: dispo.heure_fin,
    type: dispo.type, // Utiliser le champ type au lieu de statut
    timeKind: dispo.timeKind, // ⚠️ IMPORTANT: Cohérence avec getTemporalDisplay
    slots: dispo.slots,
    isFullDay: dispo.isFullDay
  })
}

function handleSelect(arg: any) {
  const dateStr = (arg.startStr || '').slice(0, 10)
  if (dateStr) {
    // Vérifier si la cellule est verrouillée avant d'autoriser la sélection
    if (props.collaborateur?.id && props.isLockedByOthers?.(props.collaborateur.id, dateStr)) {
      return // Empêcher la sélection si cellule verrouillée
    }
    emit('add', dateStr)
  }
}

function handleDatesSet(arg: any) {
  // Émission pour synchroniser les plages de dates
  const start = arg.start ? toDateStr(arg.start) : null
  const end = arg.end ? toDateStr(arg.end) : null
  if (start && end) {
    emit('rangeChange', { start, end })
  }
}

// Configuration du calendrier avec barres personnalisées
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: frLocale,
  height: '100%',
  expandRows: true,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
  right: ''
  },
  firstDay: 1,
  weekends: true,
  dayMaxEvents: false,
  events: [], // Pas d'événements FullCalendar, on utilise dayCellDidMount
  selectable: true,
  select: handleSelect,
  dayCellContent: (arg: any) => {
    return { html: arg.dayNumberText };
  },
  dayCellDidMount: (info: any) => {
    // Utiliser la fonction centralisée pour mettre à jour le contenu
    const dateStr = toDateStr(info.date)
    updateCellContent(info.el, dateStr)
  },
  datesSet: handleDatesSet
}))

// Navigation par molette: prev/next mois avec throttling
// Navigation molette moins sensible: accumulation + cooldown
let _lastWheelNav = 0
let _wheelAccum = 0
let _wheelTimer: number | null = null
function onWheelNavigate(e: WheelEvent) {
  // Ignorer modificateurs ou scroll horizontal dominant
  if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  const now = Date.now()

  // Petite fenêtre de cooldown pour éviter doublons
  if (now - _lastWheelNav < 600) {
    e.preventDefault()
    return
  }

  // Accumuler le geste sur une courte fenêtre temps
  _wheelAccum += e.deltaY
  if (_wheelTimer) {
    clearTimeout(_wheelTimer)
  }
  _wheelTimer = setTimeout(() => {
    const threshold = 300 // geste net nécessaire (trackpad/roulette)
    const api = fcRef.value?.getApi?.()
    if (!api) return
    if (Math.abs(_wheelAccum) >= threshold) {
      e.preventDefault()
      _lastWheelNav = Date.now()
      if (_wheelAccum > 0) api.next()
      else api.prev()
    }
    _wheelAccum = 0
    _wheelTimer = null
  }, 120) as any
}
</script>

<style scoped>
.collaborateur-calendar {
  width: 100%;
  height: 100%;
}

/* Forcer FullCalendar à occuper toute la hauteur du conteneur */
:deep(.fc) {
  height: 100% !important;
}
:deep(.fc-view-harness),
:deep(.fc-view-harness-active) {
  height: 100% !important;
}

/* S'assurer que la grille occupe l'espace disponible */
:deep(.fc-scroller-harness),
:deep(.fc-scroller) {
  height: 100% !important;
}

/* ============ DESIGN DES BARRES PERSONNALISÉES - Style Admin ============ */
:deep(.fc-daygrid-day-events) {
  margin: 0 !important;
  padding: 1px !important;
  min-height: 44px; /* réduit pour compacité */
}

:deep(.dispo-bars) {
  width: 100%;
  padding: 1px; /* Réduction du padding pour maximiser l'espace */
  display: flex;
  flex-direction: column;
  gap: 1px; /* Espacement minimal entre les cartes */
  align-items: stretch;
  height: 100%;
  min-height: 44px; /* aligné sur la cellule */
  pointer-events: auto;
  position: relative;
  justify-content: stretch; /* Étirer pour remplir la cellule */
}

/* ============ CARTES DE DISPONIBILITÉ (EXACT ADMIN) ============ */

:deep(.dispo-card) {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 2px 5px;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.15s ease;
  height: 100%;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

/* Types de cartes avec couleurs distinctes */
:deep(.dispo-card-mission) {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-color: #2563eb;
  color: white;
}

:deep(.dispo-card-disponible) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #047857;
  color: white;
}

:deep(.dispo-card-indisponible) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: #b91c1c;
  color: white;
}

/* Header avec indicateur de type et overnight */
:deep(.dispo-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 14px;
  margin-bottom: 2px;
}

:deep(.dispo-type-icon) {
  opacity: 0.9;
  flex-shrink: 0;
}

/* ============ AFFICHAGE UNIFORME DES CELLULES (EXACT ADMIN) ============ */

/* Contenu unifié des cartes de disponibilité */
:deep(.dispo-unified-content) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center; /* Alignement vertical strict */
  justify-content: center;
  padding: 2px 4px;
}

:deep(.dispo-main-info) {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px; /* Taille uniforme */
  font-weight: 500;
  line-height: 1; /* Alignement vertical net */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.dispo-type-icon) {
  flex-shrink: 0;
  opacity: 0.9;
  display: inline-flex;
  align-items: center;
  line-height: 1;
  font-size: 1em !important; /* Annule les tailles inline et reste sync avec le texte */
}

:deep(.dispo-temporal) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.overnight-indicator) {
  font-size: 10px;
  opacity: 0.8;
  font-weight: bold;
}

/* Contenu principal de la carte */
:deep(.dispo-content) {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}

:deep(.dispo-time-range) {
  font-weight: 600;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.dispo-time-full) {
  font-weight: 500;
  font-size: 9px;
  opacity: 0.9;
}

:deep(.dispo-slots) {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

:deep(.slot-tag) {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 0 3px;
  font-size: 8px;
  line-height: 12px;
  font-weight: 500;
  white-space: nowrap;
}

:deep(.slot-more) {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 0 2px;
  font-size: 7px;
  line-height: 10px;
  font-weight: bold;
  opacity: 0.8;
}

/* Footer avec lieu */
:deep(.dispo-footer) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 10px;
  margin-top: 1px;
}

:deep(.dispo-lieu) {
  font-size: 7px;
  opacity: 0.8;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

/* ============ LAYOUTS RESPONSIFS AMÉLIORÉS ============ */

/* Cas 1 dispo: remplit toute la cellule */
:deep(.dispo-bars.single .dispo-card) {
  height: 100%; /* Prendre toute la hauteur de la cellule */
  min-height: 44px;
  font-size: 11px;
  justify-content: space-between; /* Distribuer le contenu sur toute la hauteur */
  padding: 3px 5px;
}

:deep(.dispo-bars.single .dispo-content) {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Styles pour une seule disponibilité - plus grand (EXACT ADMIN) */
:deep(.dispo-bars.single .dispo-main-info) {
  font-size: 10px; /* Uniforme */
  gap: 5px;
}

:deep(.dispo-bars.single .dispo-type-icon) {
  font-size: 12px !important;
}

:deep(.dispo-bars.single .dispo-temporal) {
  font-size: 10px; /* Uniforme */
  font-weight: 600;
}

/* Styles pour les cellules multiples - empilage vertical (EXACT ADMIN) */
:deep(.dispo-bars.multi) {
  gap: 1px !important;
  flex-direction: column !important;
}

:deep(.dispo-bars.multi .dispo-card) {
  min-height: 18px !important; /* plus compact */
  max-height: 22px !important;
  border-radius: 3px !important;
}


:deep(.dispo-bars.multi .dispo-main-info) {
  font-size: 10px !important; /* Uniforme */
  gap: 2px !important;
}

:deep(.dispo-bars.multi .dispo-type-icon) {
  font-size: 1em !important; /* Suivre le texte */
}

/* Cas 2 dispos: divisent équitablement la cellule */
:deep(.dispo-bars.dual .dispo-card) {
  height: calc(50% - 1px); /* 50% de la hauteur moins l'espacement */
  min-height: 22px;
  font-size: 10px;
  justify-content: space-between;
  padding: 2px 4px;
}

:deep(.dispo-bars.dual .dispo-main-info) {
  font-size: 10px; /* Uniforme */
  gap: 3px;
}

:deep(.dispo-bars.multi .dispo-main-info) {
  font-size: 10px !important; /* Uniforme */
  gap: 1px;
}

/* Bouton d'ajout */
:deep(.dispo-add-card) {
  width: 100%;
  height: 100%;
  min-height: 34px; /* plus compacte */
  border: 2px dashed #d1d5db;
  background: rgba(250, 251, 252, 0.4);
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
:deep(.dispo-add-card .add-icon) {
  font-size: 16px;
  opacity: 0.6;
}

:deep(.dispo-add-card .add-text) {
  font-size: 8px;
  opacity: 0.75;
}


:deep(.dispo-add-card:hover) {
  border-color: #9ca3af;
  background: rgba(243, 244, 246, 0.6);
}

/* Bouton d'ajout supplémentaire dans les cellules avec des disponibilités */
:deep(.dispo-add-more) {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 10;
}

:deep(.dispo-bars:hover .dispo-add-more) {
  opacity: 1;
}

:deep(.dispo-add-more:hover) {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
  transform: scale(1.1);
}

/* États des cartes - Styles hover exactes du planning admin */
:deep(.dispo-card:hover) {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

:deep(.dispo-card-mission:hover) {
  box-shadow: 0 3px 8px rgba(59, 130, 246, 0.3);
}

:deep(.dispo-card-disponible:hover) {
  box-shadow: 0 3px 8px rgba(16, 185, 129, 0.3);
}

:deep(.dispo-card-indisponible:hover) {
  box-shadow: 0 3px 8px rgba(239, 68, 68, 0.3);
}

/* Cellules sélectionnées */
:deep(.fc-daygrid-day.selected-cell) {
  background: rgba(59, 130, 246, 0.1) !important;
  border: 2px solid #3b82f6 !important;
}

/* Hauteur minimum des cellules */
/* Laisser FullCalendar gérer la hauteur en mode full-height */
:deep(.fc-daygrid-day-frame) {
  min-height: 0 !important;
}

/* S'assurer que les cellules ont un espacement correct pour éviter les débordements */
:deep(.fc-daygrid-day) {
  box-sizing: border-box;
  margin: 0; /* éviter les pertes d'espace latéral/vertical */
  overflow: hidden;
}

:deep(.fc-daygrid-day-events) {
  box-sizing: border-box;
}

/* ============ INDICATEURS MULTI-UTILISATEURS ============ */
/* Cellules avec présence d'autres utilisateurs */
:deep(.fc-daygrid-day.has-presence) {
  position: relative;
  box-sizing: border-box;
  box-shadow: inset 0 0 0 2px var(--hovering-user-color, #007bff),
              0 0 8px color-mix(in srgb, var(--hovering-user-color, #007bff) 20%, transparent) !important;
  background: color-mix(in srgb, var(--hovering-user-color, #007bff) 10%, white) !important;
  animation: presencePulse 1.2s ease-in-out 1;
}

/* Indicateur centré pour les utilisateurs qui survolent */
:deep(.fc-daygrid-day.has-presence::after) {
  content: attr(data-initials);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  background: var(--hovering-user-color, #007bff);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 2px solid white;
}

/* Indicateur pour les cellules verrouillées/utilisées */
:deep(.fc-daygrid-day.locked-by-others) {
  position: relative;
  box-sizing: border-box;
  box-shadow: inset 0 0 0 2px #ef4444,
              0 0 8px rgba(239, 68, 68, 0.25) !important;
  background: rgba(239, 68, 68, 0.15) !important;
  cursor: not-allowed !important;
  opacity: 0.5 !important; /* Rendre toute la cellule opaque */
}

/* Désactiver le curseur pointer sur les éléments à l'intérieur des cellules verrouillées */
:deep(.fc-daygrid-day.locked-by-others .dispo-card),
:deep(.fc-daygrid-day.locked-by-others .dispo-add-card),
:deep(.fc-daygrid-day.locked-by-others .dispo-add-more) {
  cursor: not-allowed !important;
}

:deep(.fc-daygrid-day.locked-by-others::before) {
  content: "block"; /* Icône Material Icons */
  font-family: 'Material Icons';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  border: 2px solid white;
}

/* Gestion de la superposition avec la sélection multiple */
:deep(.fc-daygrid-day.selected-cell.has-presence) {
  box-shadow: inset 0 0 0 3px var(--hovering-user-color, #007bff),
              0 0 12px color-mix(in srgb, var(--hovering-user-color, #007bff) 30%, transparent) !important;
  background: linear-gradient(
    45deg,
    rgba(59, 130, 246, 0.2) 50%,
    color-mix(in srgb, var(--hovering-user-color, #007bff) 15%, white) 50%
  ) !important;
}

:deep(.fc-daygrid-day.selected-cell.locked-by-others) {
  box-shadow: inset 0 0 0 3px #ef4444,
              0 0 12px rgba(239, 68, 68, 0.4) !important;
  background: linear-gradient(
    45deg,
    rgba(59, 130, 246, 0.2) 50%,
    rgba(239, 68, 68, 0.2) 50%
  ) !important;
}

/* Amélioration de l'indicateur de sélection pour qu'il ne masque pas les indicateurs de présence */
:deep(.fc-daygrid-day.selected-cell) {
  background: rgba(59, 130, 246, 0.15) !important;
  box-sizing: border-box;
  box-shadow: inset 0 0 0 2px #3b82f6 !important;
  position: relative;
}

/* Indicateur de sélection repositionné quand il y a présence */
:deep(.fc-daygrid-day.selected-cell::before) {
  content: "✓";
  position: absolute;
  top: 6px;
  right: 6px;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  z-index: 950;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

/* Quand il y a présence ET sélection, ajuster l'indicateur de sélection */
:deep(.fc-daygrid-day.selected-cell.has-presence::before) {
  top: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  font-size: 8px;
  z-index: 1100; /* Au-dessus de l'indicateur de présence */
}

/* S'assurer que l'indicateur de présence reste au centre même avec la sélection */
:deep(.fc-daygrid-day.selected-cell.has-presence::after) {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

@keyframes presencePulse {
  0%, 100% {
    box-shadow: inset 0 0 0 2px var(--hovering-user-color, #007bff),
                0 0 8px color-mix(in srgb, var(--hovering-user-color, #007bff) 20%, transparent);
    transform: scale(1);
  }
  50% {
    box-shadow: inset 0 0 0 2px var(--hovering-user-color, #007bff),
                0 0 16px color-mix(in srgb, var(--hovering-user-color, #007bff) 40%, transparent);
    transform: scale(1.01);
  }
}

/* Animation pour l'indicateur centré */
:deep(.fc-daygrid-day.has-presence::after) {
  animation: presenceIndicator 1.2s ease-in-out 1;
}

@keyframes presenceIndicator {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
}
</style>
<style scoped>
/* Indicateurs de continuation nuit (alignés sur planning admin) */
:deep(.dispo-continuation.cont-from-prev) {
  position: relative;
}
:deep(.dispo-continuation.cont-from-prev::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(to right, rgba(0,0,0,0.25), transparent);
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  opacity: 0.25;
}
:deep(.dispo-continuation.cont-to-next) {
  position: relative;
}
:deep(.dispo-continuation.cont-to-next::after) {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(to left, rgba(0,0,0,0.25), transparent);
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  opacity: 0.25;
}

/* Icônes de symbole overnight dans la ligne principale */
:deep(.overnight-symbol) {
  font-size: 1em; /* Suivre la typo principale */
  line-height: 1;
  opacity: 0.9;
  margin-left: 4px;
  display: inline-flex;
  align-items: center;
}

/* Couleur du titre du mois en noir (FullCalendar toolbar) */
:deep(.fc .fc-toolbar-title) {
  color: #000 !important;
}

/* ============ RESPONSIVE DESIGN AMÉLIORÉ ============ */

/* Mobile moyen (768px et moins) */
@media (max-width: 768px) {
  /* Adapter la taille des barres de disponibilité */
  :deep(.dispo-card) {
    min-height: 22px; /* Plus compact sur mobile */
    font-size: 9px;
  }
  
  :deep(.dispo-bars.single .dispo-card) {
    min-height: 36px; /* Single légèrement plus grand */
    font-size: 10px;
  }
  
  :deep(.dispo-bars.double .dispo-card) {
    min-height: 18px;
    font-size: 8px;
  }
  
  :deep(.dispo-bars.many .dispo-card) {
    min-height: 14px;
    font-size: 7px;
  }
  
  /* Adapter les éléments textuels */
  :deep(.dispo-type-icon) {
    font-size: 0.9em !important;
  }
  
  :deep(.dispo-time-range) {
    font-size: 8px;
  }
  
  :deep(.dispo-lieu) {
    font-size: 6px;
  }
  
  :deep(.slot-tag) {
    font-size: 6px;
    padding: 0 2px;
  }
  
  /* Adapter les indicateurs de présence */
  :deep(.user-presence-indicator) {
    width: 6px;
    height: 6px;
    border-width: 1px;
  }
  
  :deep(.locked-indicator) {
    padding: 2px 4px;
    font-size: 8px;
  }
  
  /* Adapter les cellules sélectionnées */
  :deep(.fc-daygrid-day.selected::after) {
    width: 16px;
    height: 16px;
    font-size: 9px;
    top: 2px;
    right: 2px;
  }
}

/* Mobile petit (480px et moins) */
@media (max-width: 480px) {
  /* Barres encore plus compactes */
  :deep(.dispo-card) {
    min-height: 20px;
    font-size: 8px;
    border-radius: 3px;
  }
  
  :deep(.dispo-bars.single .dispo-card) {
    min-height: 32px;
    font-size: 9px;
  }
  
  :deep(.dispo-bars.double .dispo-card) {
    min-height: 16px;
    font-size: 7px;
  }
  
  :deep(.dispo-bars.many .dispo-card) {
    min-height: 12px;
    font-size: 6px;
  }
  
  /* Texte ultra compact */
  :deep(.dispo-type-icon) {
    font-size: 0.8em !important;
  }
  
  :deep(.dispo-time-range) {
    font-size: 7px;
  }
  
  :deep(.dispo-lieu) {
    font-size: 5px;
  }
  
  :deep(.slot-tag) {
    font-size: 5px;
    padding: 0 1px;
  }
  
  /* Indicateurs de présence plus petits */
  :deep(.user-presence-indicator) {
    width: 5px;
    height: 5px;
    border-width: 0.5px;
  }
  
  :deep(.locked-indicator) {
    padding: 1px 3px;
    font-size: 7px;
  }
  
  /* Cellules sélectionnées plus petites */
  :deep(.fc-daygrid-day.selected::after) {
    width: 14px;
    height: 14px;
    font-size: 8px;
    top: 1px;
    right: 1px;
  }
  
  /* Simplifier les indicateurs de continuation */
  :deep(.dispo-continuation.cont-from-prev::before),
  :deep(.dispo-continuation.cont-to-next::after) {
    width: 3px; /* Plus fin sur mobile */
  }
}

/* Mode paysage mobile */
@media (max-width: 768px) and (orientation: landscape) {
  :deep(.dispo-card) {
    min-height: 18px; /* Plus compact en paysage */
    font-size: 8px;
  }
  
  :deep(.dispo-bars.single .dispo-card) {
    min-height: 28px;
    font-size: 9px;
  }
}
</style>
