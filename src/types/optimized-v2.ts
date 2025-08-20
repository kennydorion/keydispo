// Structure optimisée V2 - Centrée sur les collaborateurs
// Élimine la redondance et améliore les performances

import type { Ref } from 'vue'

export interface CollaborateurV2 {
  id?: string // Auto-généré par Firestore
  tenantId: string
  
  // Informations personnelles (dénormalisées pour éviter les JOINs)
  nom: string
  prenom: string
  metier: string
  phone: string | null
  email: string | null
  ville: string | null
  
  // Métadonnées
  actif: boolean
  createdAt: Date
  updatedAt: Date
  updatedBy: string
  version: number
}

export interface DisponibiliteV2 {
  // Pas d'ID car ce sera une sous-collection
  date: string // YYYY-MM-DD (clé du document)
  
  // Créneaux de disponibilité pour cette date
  creneaux: Array<{
    lieu: string | null
    heure_debut: string | null // HH:MM
    heure_fin: string | null // HH:MM
    statut: 'disponible' | 'indisponible' | 'affecte'
    commentaire?: string
  }>
  
  // Métadonnées simplifiées
  updatedAt: Date
  updatedBy: string
  version: number
}

// Structure Firestore optimisée :
// /tenants/{tenantId}/collaborateurs/{collaborateurId}
// /tenants/{tenantId}/collaborateurs/{collaborateurId}/disponibilites/{date}

export interface TenantV2 {
  id?: string
  name: string
  description?: string
  settings: {
    timeZone: string
    defaultView: 'planning' | 'calendar' | 'table'
    workingHours: {
      debut: string // HH:MM
      fin: string // HH:MM
    }
    workingDays: number[] // 0=dimanche, 1=lundi, etc.
  }
  createdAt: Date
  ownerId: string
}

export interface TenantUserV2 {
  uid: string
  email: string
  displayName: string
  role: 'admin' | 'editor' | 'viewer'
  permissions: {
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    canImport: boolean
    canExport: boolean
    canManageUsers: boolean
  }
  createdAt: Date
  lastAccess: Date
  invitedBy?: string
}

// Interfaces pour les requêtes optimisées
export interface CollaborateurWithDisposV2 {
  collaborateur: CollaborateurV2
  disponibilites: Map<string, DisponibiliteV2> // date -> disponibilite
}

export interface PlanningDataV2 {
  collaborateurs: CollaborateurV2[]
  disponibilitesByCollaborateur: Map<string, Map<string, DisponibiliteV2>>
  // collaborateurId -> (date -> disponibilite)
  dateRange: {
    debut: string
    fin: string
  }
  totalCollaborateurs: number
  totalDisponibilites: number
}

// Interfaces pour les opérations en lot
export interface BatchUpdateV2 {
  collaborateurId: string
  updates: Array<{
    date: string
    creneaux: DisponibiliteV2['creneaux']
  }>
}

export interface ImportDataV2 {
  collaborateur: Omit<CollaborateurV2, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>
  disponibilites: Array<{
    date: string
    lieu: string | null
    heure_debut: string | null
    heure_fin: string | null
    statut?: 'disponible' | 'indisponible' | 'affecte'
  }>
}

// Interfaces pour les statistiques et analytics
export interface StatsCollaborateurV2 {
  collaborateurId: string
  nom: string
  prenom: string
  totalDisponibilites: number
  joursDisponibles: number
  joursIndisponibles: number
  joursAffectes: number
  tauxDisponibilite: number // pourcentage
  derniereMiseAJour: Date
}

export interface StatsPeriodeV2 {
  periode: string // YYYY-MM ou YYYY-MM-DD
  totalCollaborateurs: number
  totalDisponibilites: number
  repartitionStatuts: {
    disponible: number
    indisponible: number
    affecte: number
  }
  collaborateursActifs: number
  moyenneCreneauxParJour: number
}

// Types pour les hooks et composants
export interface UseCollaborateursV2 {
  collaborateurs: Ref<CollaborateurV2[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadCollaborateurs: (tenantId: string) => Promise<void>
  createCollaborateur: (data: Omit<CollaborateurV2, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>) => Promise<string>
  updateCollaborateur: (id: string, data: Partial<CollaborateurV2>) => Promise<void>
  deleteCollaborateur: (id: string) => Promise<void>
}

export interface UseDisponibilitesV2 {
  disponibilites: Ref<Map<string, DisponibiliteV2>>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadDisponibilites: (collaborateurId: string, dateDebut: string, dateFin: string) => Promise<void>
  updateDisponibilite: (collaborateurId: string, date: string, data: DisponibiliteV2) => Promise<void>
  batchUpdate: (updates: BatchUpdateV2[]) => Promise<void>
}

export interface UsePlanningV2 {
  planningData: Ref<PlanningDataV2>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadPlanning: (tenantId: string, dateDebut: string, dateFin: string) => Promise<void>
  refreshPlanning: () => Promise<void>
  subscribeToChanges: (callback: (data: PlanningDataV2) => void) => () => void
}

// Validators et helpers
export interface ValidationRulesV2 {
  collaborateur: {
    nom: (value: string) => string | null
    prenom: (value: string) => string | null
    metier: (value: string) => string | null
    email: (value: string) => string | null
    phone: (value: string) => string | null
  }
  disponibilite: {
    date: (value: string) => string | null
    heure_debut: (value: string) => string | null
    heure_fin: (value: string) => string | null
    creneauxChevauchement: (creneaux: DisponibiliteV2['creneaux']) => string | null
  }
}

// Utilitaires pour la migration
export interface MigrationResult {
  collaborateursCreated: number
  disponibilitesCreated: number
  erreurs: Array<{
    type: 'collaborateur' | 'disponibilite'
    data: any
    error: string
  }>
  duree: number // en ms
}

export interface MigrationOptions {
  dryRun: boolean // Pour tester sans créer
  batchSize: number // Nombre d'opérations par lot
  deleteOldData: boolean // Supprimer les anciennes données après migration
  tenantId: string
}
