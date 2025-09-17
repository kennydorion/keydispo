export interface Collaborateur {
  id: string
  nom: string
  prenom: string
  email?: string
  phone?: string
  metier?: string
  ville?: string
  note?: string
  notes?: string
  color: string
  tenantId: string
  createdAt: any
  updatedAt: any
}

export interface DisponibiliteExtended {
  id: string
  nom: string
  prenom: string
  metier: string
  phone: string
  email: string
  note: string
  date: string
  lieu: string
  heure_debut: string
  heure_fin: string
  type: 'disponible' | 'indisponible' | 'mission'
  color?: string
  version: number
  updatedAt: any
  updatedBy: string
  tenantId: string
  lockedBy?: string
  lockedAt?: any
}

export interface CreneauHoraire {
  debut: string // Format HH:MM
  fin: string   // Format HH:MM
  label: string
}

export interface DateRange {
  debut: Date
  fin: Date
}

export interface BatchSelection {
  dates: string[] // Array of YYYY-MM-DD
  collaborateurId: string
  type: 'disponible' | 'indisponible' | 'mission'
  heureDebut: string
  heureFin: string
  lieu?: string
}

export interface PresenceInfo {
  userId: string
  userName: string
  lastSeen: any
  isActive: boolean
  currentView?: string
}

export interface CellLock {
  collaborateurId: string
  date: string
  lockedBy: string
  lockedAt: any
  expiresAt: any
}

export const COULEURS_COLLABORATEUR = {
  default: '#6B7280',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
  yellow: '#EAB308'
} as const

export type CouleurCollaborateur = keyof typeof COULEURS_COLLABORATEUR

// Créneaux par quart d'heure (6h-22h)
export const CRENEAUX_QUART_HEURE: CreneauHoraire[] = []

// Génération automatique des créneaux de 15 minutes
for (let heure = 6; heure <= 21; heure++) {
  for (let minute = 0; minute < 60; minute += 15) {
    const heureStr = heure.toString().padStart(2, '0')
    const minuteStr = minute.toString().padStart(2, '0')
    const finMinute = minute + 15
    const finHeure = finMinute >= 60 ? heure + 1 : heure
    const finMin = finMinute >= 60 ? 0 : finMinute
    
    const finHeureStr = finHeure.toString().padStart(2, '0')
    const finMinuteStr = finMin.toString().padStart(2, '0')
    
    CRENEAUX_QUART_HEURE.push({
      debut: `${heureStr}:${minuteStr}`,
      fin: `${finHeureStr}:${finMinuteStr}`,
      label: `${heureStr}:${minuteStr} - ${finHeureStr}:${finMinuteStr}`
    })
  }
}

export const LOCK_DURATION_MS = 2 * 60 * 1000 // 2 minutes
export const PRESENCE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
