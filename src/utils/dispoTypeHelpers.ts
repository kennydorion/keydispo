/**
 * dispoTypeHelpers.ts
 * Helpers pour les couleurs, icônes et textes des types de disponibilité
 */

import { slotOptions } from '@/services/dispoFormOptions'

export function getTypeColor(type: string): string {
  switch(type) {
    case 'mission': return 'primary'
    case 'disponible': return 'success'
    case 'indisponible': return 'danger'
    default: return 'secondary'
  }
}

export function getTypeIcon(type: string | undefined): string {
  switch(type) {
    case 'mission': return 'work'
    case 'disponible': return 'check_circle'
    case 'indisponible': return 'cancel'
    default: return 'help'
  }
}

export function getTimeKindIcon(timeKind: string): string {
  switch(timeKind) {
    case 'full-day': return 'today'
    case 'range': return 'schedule'
    case 'slot': return 'view_module'
    case 'overnight': return 'nights_stay'
    default: return 'help'
  }
}

export function getSlotText(slots: string[] = []): string {
  if (slots.length === 0) return 'Aucun créneau'
  const slotNames = slots.map(slot => {
    const slotOpt = slotOptions.find(opt => opt.value === slot)
    return slotOpt?.text || slot
  })
  return slotNames.join(', ')
}
