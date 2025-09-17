<template>
  <div class="collaborateur-calendar">
    <FullCalendar 
      ref="fcRef" 
      :options="calendarOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import normalizeDispo from '@/services/normalization'
import * as planningDisplayService from '@/services/planningDisplayService'

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
}

interface CollaborateurDisponibilite {
  id?: string
  date: string // YYYY-MM-DD
  lieu: string
  heure_debut: string
  heure_fin: string
  version?: number
  statut?: string
}

// Props et émissions
const props = defineProps<{
  disponibilites: CollaborateurDisponibilite[]
  collaborateur: CollaborateurProfilLight | null
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
  if (dispo.statut) {
    return dispo.statut.toLowerCase()
  }
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

// Configuration du calendrier avec barres personnalisées
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
  selectable: true,
  select: handleSelect,
  dayCellContent: (arg: any) => {
    return { html: arg.dayNumberText };
  },
  dayCellDidMount: (info: any) => {
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
      dayDispos.forEach((dispo: CollaborateurDisponibilite) => {
        const temporal = planningDisplayService.getTemporalDisplay(dispo);
        const icon = planningDisplayService.getDispoTypeIcon(dispo);
        const cardClass = `dispo-card dispo-card-${getDispoType(dispo)}`;
        
        const dispoCard = document.createElement('div');
        dispoCard.className = cardClass;
        if (dispo.id) {
          dispoCard.dataset.dispoId = dispo.id;
        }
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
        dispoCard.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          if (dispo.id) {
            emit('edit', dispo.id);
          }
        });
        
        dispoBars.appendChild(dispoCard);
      });
    }
    
    // Ajouter les événements pour le bouton d'ajout
    const addButton = dispoBars.querySelector('.dispo-add-card');
    if (addButton) {
      addButton.addEventListener('click', (e: Event) => {
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
      dayEl.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          emit('cellMouseDown', cellId, e);
        }
      });
      
      dayEl.addEventListener('mouseenter', (e: MouseEvent) => {
        if (props.isDraggingSelection) {
          emit('cellMouseEnter', cellId, e);
        }
      });
      
      dayEl.addEventListener('mouseup', (e: MouseEvent) => {
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
</script>

<style scoped>
.collaborateur-calendar {
  width: 100%;
  height: 100%;
}

/* ============ DESIGN DES BARRES PERSONNALISÉES ============ */
:deep(.fc-daygrid-day-events) {
  margin: 0 !important;
  padding: 2px !important;
  min-height: 60px;
}

:deep(.custom-dispo-bars) {
  width: 100%;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: stretch;
  height: 100%;
  min-height: 60px;
  pointer-events: auto;
  position: relative;
}

/* Cartes de disponibilité - Style du planning admin */
:deep(.dispo-card) {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.15s ease;
  height: 100%;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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

/* Contenu unifié */
:deep(.dispo-unified-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

:deep(.dispo-main-info) {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-start;
}

:deep(.dispo-type-icon) {
  opacity: 0.9;
  flex-shrink: 0;
}

:deep(.dispo-temporal) {
  font-weight: 600;
  font-size: 10px;
  flex: 1;
}

:deep(.dispo-footer) {
  margin-top: 2px;
  font-size: 8px;
  opacity: 0.8;
}

:deep(.dispo-lieu) {
  font-weight: 500;
}

/* Layouts selon le nombre de disponibilités */
:deep(.custom-dispo-bars.single .dispo-card) {
  height: 100%;
  font-size: 11px;
  justify-content: space-between;
}

:deep(.custom-dispo-bars.single .dispo-temporal) {
  font-size: 12px;
  font-weight: 600;
}

:deep(.custom-dispo-bars.dual .dispo-card) {
  height: calc(50% - 1px);
  min-height: 25px;
  font-size: 10px;
  justify-content: space-between;
}

:deep(.custom-dispo-bars.multi .dispo-card) {
  min-height: 20px;
  max-height: 24px;
  font-size: 9px;
}

:deep(.custom-dispo-bars.multi .dispo-temporal) {
  font-size: 9px;
}

/* Bouton d'ajout */
:deep(.dispo-add-card) {
  width: 100%;
  height: 100%;
  min-height: 40px;
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

:deep(.dispo-add-card:hover) {
  border-color: #9ca3af;
  background: rgba(243, 244, 246, 0.6);
}

/* États des cartes */
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
:deep(.fc-daygrid-day-frame) {
  min-height: 80px !important;
}
</style>
