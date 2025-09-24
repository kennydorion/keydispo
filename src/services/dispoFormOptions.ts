// Options et helpers partagés pour DispoEditContent (admin & collaborateur)
// Centralise: options de type/slots/timeKind, helpers d’icônes/couleurs/labels,
// validation minimale et mapping UI -> RTDB pour éviter les divergences.

export type UIType = 'mission' | 'disponible' | 'indisponible'
export type UITimeKind = 'range' | 'slot' | 'full-day' | 'overnight'

export interface DispoDraft {
  type: UIType
  timeKind: UITimeKind
  heure_debut?: string
  heure_fin?: string
  lieu?: string
  slots?: string[]
}

export const slotOptions = [
  { value: 'journee', text: 'Journée' },
  { value: 'morning', text: 'Matin' },
  { value: 'afternoon', text: 'Après-midi' },
  { value: 'night', text: 'Nuit' },
]

export const timeKindOptions = [
  { value: 'full-day', text: 'Journée complète' },
  { value: 'slot', text: 'Créneaux standards' },
  { value: 'range', text: 'Horaires personnalisées' },
]

export function typeOptionsFor(isCollaboratorView: boolean) {
  return isCollaboratorView
    ? [
        { value: 'disponible', text: 'Disponible' },
        { value: 'indisponible', text: 'Indisponible' },
      ]
    : [
        { value: 'disponible', text: 'Disponible' },
        { value: 'indisponible', text: 'Indisponible' },
        { value: 'mission', text: 'Mission' },
      ]
}

export function timeKindOptionsFilteredFor(type: UIType) {
  if (type === 'indisponible') {
    return [{ value: 'full-day', text: 'Journée complète' }]
  }
  return timeKindOptions
}

export function isFormValid(d: DispoDraft): boolean {
  if (!d?.type) return false
  if (d.type === 'indisponible') return true
  if (d.timeKind === 'full-day') return true
  if (d.timeKind === 'range') return !!(d.heure_debut && d.heure_fin)
  if (d.timeKind === 'slot') return !!(d.slots && d.slots.length > 0)
  return false
}

export function detectOvernight(d: DispoDraft): boolean {
  if (d.timeKind !== 'range' || !d.heure_debut || !d.heure_fin) return false
  const [hDebut] = d.heure_debut.split(':').map(Number)
  const [hFin] = d.heure_fin.split(':').map(Number)
  if (Number.isNaN(hDebut) || Number.isNaN(hFin)) return false
  return hFin < hDebut || (hFin === hDebut && d.heure_fin < d.heure_debut)
}

export function getTypeIcon(type: UIType): string {
  switch (type) {
    case 'disponible': return 'check_circle'
    case 'indisponible': return 'cancel'
    case 'mission': return 'work'
    default: return 'help'
  }
}

export function getTimeKindIcon(kind: UITimeKind): string {
  switch (kind) {
    case 'full-day': return 'today'
    case 'slot': return 'view_module'
    case 'range': return 'schedule'
    case 'overnight': return 'nights_stay'
    default: return 'help'
  }
}

export function getTypeColor(type: UIType): string {
  switch (type) {
    case 'disponible': return 'success'
    case 'indisponible': return 'danger'
    case 'mission': return 'primary'
    default: return 'secondary'
  }
}

export function getSlotText(slots?: string[]): string {
  if (!slots || slots.length === 0) return ''
  const labels = slots.map((s) => slotOptions.find((o) => o.value === s)?.text || s)
  return labels.join(', ')
}

// Mapping UI -> RTDB (conserver sémantique actuelle du projet)
export type RTDBType = 'standard' | 'formation' | 'urgence' | 'maintenance'
export type RTDBTimeKind = 'fixed' | 'flexible'

export function mapUITypeToRTDB(ui: UIType): RTDBType {
  switch (ui) {
    case 'mission': return 'urgence'
    case 'disponible': return 'standard'
    case 'indisponible': return 'maintenance'
    default: return 'standard'
  }
}

export function mapUITimeKindToRTDB(kind: UITimeKind): RTDBTimeKind {
  switch (kind) {
    case 'slot': return 'fixed'
    case 'range':
    case 'full-day':
    case 'overnight':
    default:
      return 'flexible'
  }
}

export function addOneDay(ymd: string): string {
  const dt = new Date(ymd + 'T00:00:00')
  dt.setDate(dt.getDate() + 1)
  return dt.toISOString().split('T')[0]
}
