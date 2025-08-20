/**
 * Types pour le système d'import Excel
 */

export interface ImportProgress {
  phase: 'processing' | 'collaborateurs' | 'disponibilites' | 'completed'
  current: number
  total: number
  message: string
}

export interface ImportStats {
  collaborateursCreated: number
  collaborateursMerged: number
  disposCreated: number
  disposMerged: number
  errors: string[]
  duration: number
}

export interface ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
}

export interface ParseStats {
  totalRows: number
  validRows: number
  collaborateursUniques: number
  warnings: string[]
}

export interface ParseResult {
  data: NormalizedRow[]
  stats: ParseStats
}

export interface NormalizedRow {
  nom: string
  prenom: string
  metier: string
  date: string // YYYY-MM-DD
  lieu?: string
  heure_debut?: string // HH:MM
  heure_fin?: string // HH:MM
  phone?: string
  email?: string
  ville?: string
}

export interface CollaborateurData {
  id: string
  nom: string
  prenom: string
  metier: string
  phone?: string
  email?: string
  ville?: string
  tenantId: string
  actif?: boolean
  createdAt: any // Timestamp
  updatedAt: any // Timestamp
}

export interface DisponibiliteData {
  id: string
  collaborateurId: string
  date: string // YYYY-MM-DD
  lieu?: string
  heure_debut?: string // HH:MM
  heure_fin?: string // HH:MM
  tenantId: string
  createdAt: any // Timestamp
  updatedAt: any // Timestamp
}

export interface ExcelHeader {
  name: string
  type: 'collaborateur' | 'date' | 'unknown'
  columnIndex: number
  dateValue?: Date
}

export interface DateBlock {
  date: string // YYYY-MM-DD
  columns: ExcelHeader[]
  dateStr: string // Format original Excel
}
