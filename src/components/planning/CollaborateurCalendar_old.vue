<template>
  <div class="collaborateur-calendar">
    <FullCalendar 
      ref="fcRef" 
      :options="calendarOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import normalizeDispo from '@/services/normalization'
import * as planningDisplayService from '@/services/planningDisplayService'

// Note: depuis FullCalendar v6, les styles sont inclus via les bundles JS des plugins.
// Aucun import CSS séparé n’est nécessaire avec Vite/Vue 3.

// Props et émissions
const props = defineProps<{
  disponibilites: CollaborateurDisponibilite[]
  collaborateur: CollaborateurProfilLight | null
  // Props pour la sélection multi-cellules
  selectedCells?: Set<string>
  isSelectionMode?: boolean
  isDraggingSelection?: boolean
}>()

const emit = defineEmits<{
  add: [dateStr: string]
  edit: [id: string]
  cellMouseDown: [cellId: string, event: MouseEvent]
  cellMouseEnter: [cellId: string, event: MouseEvent]  
  cellMouseUp: [cellId: string, event: MouseEvent]
}>()

const fcRef = ref<any>(null)

// Utilitaires
function getDisponibilitesForDate(dateStr: string): CollaborateurDisponibilite[] {
  return (props.disponibilites || []).filter(d => d.date === dateStr)
}

function getDispoType(dispo: CollaborateurDisponibilite): string {
  const normalized = normalizeDispo({
    date: dispo.date,
    lieu: dispo.lieu,
    heure_debut: dispo.heure_debut,
    heure_fin: dispo.heure_fin,
  })
  return normalized.type || 'disponible'
}

function handleSelect(arg: any) {
  const dateStr = (arg.startStr || '').slice(0, 10)
  if (dateStr) {
    emit('add', dateStr)
  }
}

function handleDatesSet(arg: any) {
  // Émission optionnelle pour synchroniser les plages de dates
  const start = arg.start?.toISOString()?.split('T')[0]
  const end = arg.end?.toISOString()?.split('T')[0]
  if (start && end) {
    // emit('rangeChange', { start, end })
  }
}

const emit = defineEmits<{
  add: [dateStr: string, event?: MouseEvent]
  edit: [id: string]
  rangeChange: [{ start: string; end: string }]
  hover: [dateStr: string | null]
  // Événements pour la sélection
  cellMouseDown: [dateStr: string, event: MouseEvent]
  cellMouseEnter: [dateStr: string, event: MouseEvent]  
  cellMouseUp: [dateStr: string, event: MouseEvent]
}>()

const fcRef = ref<any>(null)

function isAllDay(dispo: CollaborateurDisponibilite): boolean {
  const d = (dispo.heure_debut || '').slice(0,5)
  const f = (dispo.heure_fin || '').slice(0,5)
  return (d === '00:00') && (f === '23:59' || f === '24:00' || f === '00:00')
}

function toEvent(dispo: CollaborateurDisponibilite) {
  const allDay = isAllDay(dispo)
  const start = allDay ? dispo.date : `${dispo.date}T${(dispo.heure_debut || '00:00').slice(0,5)}`
  // FullCalendar attend un end exclusif pour allDay; on ajoute 1 jour si allDay
  let end: string
  if (allDay) {
    const d = new Date(dispo.date)
    d.setDate(d.getDate() + 1)
    end = d.toISOString().split('T')[0]
  } else {
    end = `${dispo.date}T${(dispo.heure_fin || '23:59').slice(0,5)}`
  }
  const kind = normalizeDispo({
    date: dispo.date,
    lieu: dispo.lieu,
    heure_debut: dispo.heure_debut,
    heure_fin: dispo.heure_fin,
  }).type
  const classNames = [`dispo-${kind}`]
  return {
    id: dispo.id || `${dispo.date}-${dispo.lieu}`,
    title: dispo.lieu || 'Disponibilité',
    start,
    end,
    allDay,
    editable: false, // édition via nos modals uniquement
    classNames,
    extendedProps: {
      dispoId: dispo.id || null,
      kind,
      lieu: dispo.lieu,
      heure_debut: dispo.heure_debut,
      heure_fin: dispo.heure_fin,
      date: dispo.date
    }
  }
}

const events = computed(() => {
  return (props.disponibilites || []).map(toEvent)
})

function handleDateClick(arg: any) {
  // Création rapide d’une dispo à la date cliquée (avec garde lock)
  const dateStr = arg.dateStr as string
  handleDateClickGuarded(dateStr)
}

function handleSelect(arg: any) {
  // Sélection de plage → prendre la date de début pour créer (avec garde lock)
  const dateStr = (arg.startStr || '').slice(0, 10)
  if (!dateStr) return
  handleDateClickGuarded(dateStr)
}

function handleEventClick(info: any) {
  const startDate: Date | undefined = info?.event?.start
  const dateStr = startDate instanceof Date ? toYMD(startDate) : ''
  if (dateStr && isDateLocked(dateStr)) return
  const id = info?.event?.extendedProps?.dispoId || info?.event?.id
  if (id) emit('edit', id)
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: frLocale,
  height: 'auto',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,dayGridWeek'
  },
  firstDay: 1,
  weekends: true,
  dayMaxEvents: false,
  events: [], // Pas d'événements FullCalendar, on utilise dayCellDidMount
  selectable: props.selection,
  select: handleSelect,
  dayCellContent: (arg) => {
    return { html: arg.dayNumberText };
  },
  dayCellDidMount: (info) => {
    // Vider le contenu par défaut et ajouter nos barres personnalisées
    const dayEl = info.el;
    const dateStr = info.date.toISOString().split('T')[0];
    
    // Supprimer les événements FullCalendar par défaut
    const eventsArea = dayEl.querySelector('.fc-daygrid-day-events');
    if (eventsArea) {
      eventsArea.innerHTML = '';
    }
    
    // Ajouter notre conteneur de barres personnalisé
    const dispoBars = document.createElement('div');
    dispoBars.className = 'custom-dispo-bars';
    
    // Récupérer les disponibilités pour cette date
    const dayDispos = getDisponibilitesForDate(dateStr);
    
    if (dayDispos.length === 0) {
      // Cellule vide - bouton d'ajout
      dispoBars.innerHTML = `
        <div class='dispo-add-card' data-date='${dateStr}'>
          <i class='va-icon va-icon-add' style='font-size: 16px; opacity: 0.6;'></i>
          <span style='font-size: 8px; opacity: 0.7;'>Ajouter</span>
        </div>
      `;
    } else {
      // Déterminer la classe de layout selon le nombre de dispos
      const layoutClass = dayDispos.length === 1 ? 'single' : 
                         dayDispos.length === 2 ? 'dual' : 'multi';
      dispoBars.className += ` ${layoutClass}`;
      
      // Créer les cartes de disponibilité
      dayDispos.forEach(dispo => {
        const temporal = planningDisplayService.getTemporalDisplay(dispo, dateStr);
        const icon = planningDisplayService.getDispoTypeIcon(dispo);
        const cardClass = `dispo-card dispo-card-${getDispoType(dispo)}`;
        
        const dispoCard = document.createElement('div');
        dispoCard.className = cardClass;
        dispoCard.dataset.dispoId = dispo.id;
        dispoCard.innerHTML = `
          <div class='dispo-unified-content'>
            <div class='dispo-main-info'>
              <i class='va-icon va-icon-${icon} dispo-type-icon' style='font-size: 10px;'></i>
              <span class='dispo-temporal'>${temporal}</span>
            </div>
          </div>
          ${dispo.lieu && dispo.lieu.length <= 12 ? `
            <div class='dispo-footer'>
              <span class='dispo-lieu'>${dispo.lieu}</span>
            </div>
          ` : ''}
        `;
        
        // Ajouter l'événement de clic
        dispoCard.addEventListener('click', (e) => {
          e.stopPropagation();
          emit('edit', dispo.id || '');
        });
        
        dispoBars.appendChild(dispoCard);
      });
    }
    
    // Ajouter les événements pour le bouton d'ajout
    const addButton = dispoBars.querySelector('.dispo-add-card');
    if (addButton) {
      addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        emit('add', dateStr);
      });
    }
    
    // Gestion de la sélection multi-cellules
    if (props.selectedCells && props.collaborateur?.id) {
      const cellId = `${props.collaborateur.id}-${dateStr}`;
      if (props.selectedCells.has(cellId)) {
        dayEl.classList.add('selected-cell');
      }
      
      // Événements de sélection
      dayEl.addEventListener('mousedown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          emit('cellMouseDown', cellId, e);
        }
      });
      
      dayEl.addEventListener('mouseenter', (e) => {
        if (props.isDraggingSelection) {
          emit('cellMouseEnter', cellId, e);
        }
      });
      
      dayEl.addEventListener('mouseup', (e) => {
        if (props.isDraggingSelection) {
          emit('cellMouseUp', cellId, e);
        }
      });
    }
    
    // Insérer les barres dans la cellule
    if (eventsArea) {
      eventsArea.appendChild(dispoBars);
    } else {
      dayEl.appendChild(dispoBars);
    }
  },
  datesSet: handleDatesSet
}))
  dayCellClassNames: (arg: any) => {
    const dateStr = arg.dateStr || arg.date?.toISOString()?.split('T')[0]
    if (!dateStr || !props.collaborateur?.id) return []
    
    const cellId = `${props.collaborateur.id}-${dateStr}`
    const classes = []
    
    if (props.selectedCells?.has(cellId)) {
      classes.push('selected')
    }
    
    if (props.isDraggingSelection) {
      classes.push('dragging-mode')
    }
    
    return classes
  },
  eventMouseEnter: (arg: any) => {
    try {
      const d = arg?.event?.start
      // Surligner la case jour parente et émettre le survol
      const el = (arg as any)?.el as HTMLElement | undefined
      const dayCell = el?.closest?.('.fc-daygrid-day') as HTMLElement | null
      if (dayCell) dayCell.classList.add('is-hovered')
      if (d instanceof Date) emit('hover', toYMD(d))
    } catch {}
  },
  eventMouseLeave: (_arg: any) => {
    try {
      const el = (_arg as any)?.el as HTMLElement | undefined
      const dayCell = el?.closest?.('.fc-daygrid-day') as HTMLElement | null
      if (dayCell) dayCell.classList.remove('is-hovered')
    } catch {}
    emit('hover', null)
  },
  dayCellDidMount: (arg: any) => {
    try {
      const el = arg?.el
      const dateObj = arg?.date
      if (!el || !(dateObj instanceof Date)) return
      const dateStr = toYMD(dateObj)
      // Surbrillance locale + propagation hover
      const onEnter = () => {
        try { (el as HTMLElement).classList.add('is-hovered') } catch {}
        emit('hover', dateStr)
      }
      const onLeave = () => {
        try { (el as HTMLElement).classList.remove('is-hovered') } catch {}
        emit('hover', null)
      }
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
  // Marquer état verrous/hover init
  try { updatePresenceVisualForCell(el as HTMLElement, dateStr) } catch {}
    } catch {}
  },
  datesSet: (arg: any) => {
    try {
      const start = toYMD(arg.start)
      // FullCalendar fournit end exclusif: soustraire 1 jour pour borne inclusive
      const endDate = new Date(arg.end)
      endDate.setDate(endDate.getDate() - 1)
      const end = toYMD(endDate)
      emit('rangeChange', { start, end })
    } catch {}
  },
}))

// Mettre à jour le calendrier quand les events changent
watch(events, () => {
  const api = fcRef.value?.getApi?.()
  if (!api) return
  api.removeAllEvents()
  api.addEventSource(events.value)
}, { deep: true })

// Fonction pour mettre à jour l'affichage des survols d'autres utilisateurs
function updateHoveringDisplay() {
  const calendarRoot = (fcRef.value?.$el as HTMLElement | undefined) || undefined
  const collaborateurId = props.collaborateur?.id
  if (!calendarRoot || !collaborateurId) return

  const dayCells = calendarRoot.querySelectorAll('.fc-daygrid-day')
  dayCells.forEach((cell: Element) => {
    const el = cell as HTMLElement
    const dateStr = el.getAttribute('data-date')
    if (!dateStr) return
    if (props.isHoveredByOthers && props.isHoveredByOthers(collaborateurId, dateStr)) {
      const color = props.getHoveringUserColor?.(collaborateurId, dateStr) || '#2196F3'
      const initials = props.getHoveringUserInitials?.(collaborateurId, dateStr) || ''
      el.classList.add('hovered-by-others')
      el.style.setProperty('--hovering-user-color', color)
      el.style.setProperty('--hover-border-color', color)
      el.setAttribute('data-hovering-initials', initials)
    } else {
      el.classList.remove('hovered-by-others')
      el.style.removeProperty('--hovering-user-color')
      el.style.removeProperty('--hover-border-color')
      el.removeAttribute('data-hovering-initials')
    }
  })
}

function updateLocksDisplay() {
  if (!props.isLockedByOthers) return
  const calendarRoot = (fcRef.value?.$el as HTMLElement | undefined) || undefined
  const collaborateurId = props.collaborateur?.id
  if (!calendarRoot || !collaborateurId) return

  const dayCells = calendarRoot.querySelectorAll('.fc-daygrid-day')
  dayCells.forEach((cell: Element) => {
    const el = cell as HTMLElement
    const dateStr = el.getAttribute('data-date')
    if (!dateStr) return
    const locked = props.isLockedByOthers!(collaborateurId, dateStr)
    el.classList.toggle('locked-by-others', !!locked)
  })
}

function updatePresenceVisualForCell(el: HTMLElement, dateStr: string) {
  const collaborateurId = props.collaborateur?.id
  if (!collaborateurId) return
  if (props.isHoveredByOthers && props.isHoveredByOthers(collaborateurId, dateStr)) {
    const color = props.getHoveringUserColor?.(collaborateurId, dateStr) || '#2196F3'
    const initials = props.getHoveringUserInitials?.(collaborateurId, dateStr) || ''
    el.classList.add('hovered-by-others')
    el.style.setProperty('--hovering-user-color', color)
    el.setAttribute('data-hovering-initials', initials)
  } else {
    el.classList.remove('hovered-by-others')
    el.style.removeProperty('--hovering-user-color')
    el.removeAttribute('data-hovering-initials')
  }
  if (props.isLockedByOthers && props.isLockedByOthers(collaborateurId, dateStr)) {
    el.classList.add('locked-by-others')
  } else {
    el.classList.remove('locked-by-others')
  }
}

// Watcher pour mettre à jour l'affichage des survols toutes les 500ms
let hoveringUpdateTimer: ReturnType<typeof setInterval> | null = null
let locksUpdateTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Mettre à jour les survols périodiquement
  hoveringUpdateTimer = setInterval(updateHoveringDisplay, 500)
  locksUpdateTimer = setInterval(updateLocksDisplay, 800)
})

onBeforeUnmount(() => {
  if (hoveringUpdateTimer) {
    clearInterval(hoveringUpdateTimer)
  }
  if (locksUpdateTimer) {
    clearInterval(locksUpdateTimer)
  }
})

onMounted(() => {
  // Rien de spécial, les options initialisent déjà les events
})

// Méthodes pour l'affichage unifié avec le planning admin
function getEventClass(extendedProps: any) {
  return getDispoTypeClass(extendedProps?.kind || 'disponible')
}

// Guards contre les actions sur des jours verrouillés
function isDateLocked(dateStr: string): boolean {
  const collaborateurId = props.collaborateur?.id
  if (!collaborateurId || !props.isLockedByOthers) return false
  return !!props.isLockedByOthers(collaborateurId, dateStr)
}

function handleDateClickGuarded(dateStr: string) {
  if (isDateLocked(dateStr)) return
  emit('add', dateStr)
}
</script>

<style scoped>
.collaborateur-calendar {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

/* Ajustements légers pour FullCalendar */
:deep(.fc) {
  --fc-border-color: #e5e7eb;
  --fc-page-bg-color: #ffffff;
  --fc-neutral-bg-color: #f9fafb;
  --fc-list-event-hover-bg-color: #f3f4f6;
}

:deep(.fc-toolbar-title) {
  font-weight: 600;
}

:deep(.fc-day-today) {
  background: #eef2ff;
}

/* Hauteur des cellules de jour optimisée */
:deep(.fc-daygrid-day-frame) {
  min-height: 80px;
  padding: 2px;
}

:deep(.fc-daygrid-day-top) {
  flex-direction: row;
  justify-content: flex-end;
}

:deep(.fc .fc-daygrid-day-number) {
  padding: 4px 8px;
  font-weight: 500;
  font-size: 13px;
}

/* Zone des événements optimisée */
:deep(.fc-daygrid-day-events) {
  margin-top: 4px;
  margin-bottom: 2px;
  padding: 0 2px;
}

/* Design unifié des événements */
:deep(.fc-event) {
  border: 1px solid transparent;
  border-left-width: 4px;
  border-radius: 8px;
  padding: 3px 8px;
  margin: 1px 2px;
  min-height: 28px;
  height: auto;
}

/* Optimisation pour événements all-day - prendre toute la hauteur */
:deep(.fc-daygrid-event) {
  margin: 2px 4px;
  padding: 4px 8px;
  min-height: 32px;
  height: auto;
  max-height: none;
}

/* Container des événements dans une cellule jour */
:deep(.fc-daygrid-day-events) {
  margin-top: 2px;
  margin-bottom: 2px;
}

/* Événements multiples dans une cellule */
:deep(.fc-daygrid-event-harness) {
  margin-bottom: 2px;
}

:deep(.fc-daygrid-event-harness:last-child) {
  margin-bottom: 0;
}

/* Adaptation dynamique selon le nombre d'événements */
:deep(.fc-daygrid-day-events .fc-daygrid-event-harness:only-child .fc-event) {
  min-height: 40px;
  padding: 6px 8px;
}

:deep(.fc-daygrid-day-events .fc-daygrid-event-harness:only-child .fc-event .event-inner) {
  gap: 4px;
  font-size: 13px;
}

:deep(.fc-daygrid-day-events .fc-daygrid-event-harness:only-child .fc-event .dispo-temporal) {
  font-size: 12px;
}

/* Quand il y a 2 événements */
:deep(.fc-daygrid-day-events:has(.fc-daygrid-event-harness:nth-child(2):last-child) .fc-event) {
  min-height: 28px;
  padding: 4px 6px;
}

/* Quand il y a 3+ événements */
:deep(.fc-daygrid-day-events:has(.fc-daygrid-event-harness:nth-child(3)) .fc-event) {
  min-height: 22px;
  padding: 2px 6px;
  font-size: 11px;
}

:deep(.fc-daygrid-day-events:has(.fc-daygrid-event-harness:nth-child(3)) .fc-event .dispo-footer) {
  display: none;
}

/* Indicateur de survol par d'autres utilisateurs (case jour) */
:deep(.fc-daygrid-day.hovered-by-others) {
  outline: 2px dashed var(--hover-border-color, #f59e0b);
  outline-offset: -2px;
  position: relative;
}
:deep(.fc-daygrid-day.hovered-by-others)::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--hover-border-color, #f59e0b);
}

:deep(.fc-event .event-inner) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  font-size: 12px;
  padding: 4px 6px;
  height: 100%;
  min-height: 24px;
  line-height: 1.3;
}

:deep(.fc-event .dispo-main-info) {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-height: 16px;
}

:deep(.fc-event .dispo-type-icon) {
  flex-shrink: 0;
  color: currentColor;
  font-size: 12px;
}

:deep(.fc-event .dispo-temporal) {
  font-weight: 600;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 1.2;
}

:deep(.fc-event .dispo-footer) {
  font-size: 10px;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
  line-height: 1.1;
}

:deep(.fc-event .lieu-text) {
  font-style: italic;
}

/* Gestion spéciale pour les cellules avec beaucoup d'événements (plus de 3) */
:deep(.fc-daygrid-day:has(.fc-daygrid-event-harness:nth-child(4))) .fc-daygrid-event-harness {
  margin-bottom: 1px !important;
}

:deep(.fc-daygrid-day:has(.fc-daygrid-event-harness:nth-child(4))) .fc-event {
  font-size: 10px;
  padding: 1px 4px;
  min-height: 18px;
}

:deep(.fc-daygrid-day:has(.fc-daygrid-event-harness:nth-child(4))) .event-footer {
  display: none;
}

:deep(.fc-daygrid-day:has(.fc-daygrid-event-harness:nth-child(4))) .event-inner {
  gap: 1px;
  font-size: 10px;
}

/* Indicateur de débordement quand il y a plus de 5 événements */
:deep(.fc-daygrid-day:has(.fc-daygrid-event-harness:nth-child(6))) .fc-daygrid-day-events {
  position: relative;
}

:deep(.fc-daygrid-day:has(.fc-daygrid-event-harness:nth-child(6))) .fc-daygrid-day-events::after {
  content: '+' attr(data-overflow-count);
  position: absolute;
  bottom: 2px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 8px;
  z-index: 5;
}

/* Mode ultra-compact pour plus de 6 événements */
:deep(.fc-daygrid-day:has(.fc-daygrid-event-harness:nth-child(7))) .fc-event {
  font-size: 9px !important;
  padding: 0 3px !important;
  min-height: 16px !important;
  line-height: 1.1 !important;
}
</style>
<style scoped>
/* Surlignage visuel des jours au survol (propagé aux events également) */
:deep(.fc-daygrid-day.is-hovered) {
  outline: 2px solid #6366f1;
  outline-offset: -2px;
  background: rgba(99, 102, 241, 0.06);
}

:deep(.fc-daygrid-day.is-hovered .fc-event) {
  filter: saturate(1.1) brightness(1.02);
}

/* Styles pour les survols d'autres utilisateurs */
:deep(.fc-daygrid-day.hovered-by-others) {
  position: relative;
  outline: 2px dashed #6366f1;
  outline-offset: -2px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%);
  animation: gentle-pulse 3s ease-in-out infinite;
}

:deep(.fc-daygrid-day.hovered-by-others::after) {
  content: "KP";
  position: absolute;
  top: 3px;
  right: 3px;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  z-index: 15;
  box-shadow: 0 3px 8px rgba(99, 102, 241, 0.4);
  border: 2px solid white;
  animation: badge-float 2s ease-in-out infinite;
}

/* Styles pour les cellules verrouillées */
:deep(.fc-daygrid-day.locked-by-others) {
  position: relative;
  outline: 2px solid #ef4444;
  outline-offset: -2px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.06) 100%);
  cursor: not-allowed;
}

:deep(.fc-daygrid-day.locked-by-others::before) {
  content: "🔒";
  position: absolute;
  top: 3px;
  left: 3px;
  font-size: 14px;
  z-index: 15;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

:deep(.fc-daygrid-day.locked-by-others .fc-event) {
  opacity: 0.6;
  pointer-events: none;
}

@keyframes gentle-pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.2);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.05);
    transform: scale(1.01);
  }
}

@keyframes badge-float {
  0%, 100% { 
    transform: translateY(0px);
  }
  50% { 
    transform: translateY(-2px);
  }
}
</style>
