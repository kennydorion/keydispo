export type { CollaborateurV2, DisponibiliteV2, PlanningDataV2, BatchUpdateV2, ImportDataV2, MigrationResult, StatsCollaborateurV2 } from './optimized-v2'

// Types existants
export interface Disponibilite {
  id?: string;
  tenantId: string;
  nom: string;
  prenom: string;
  metier: string;
  phone: string;
  email: string;
  note: string;
  date: string; // YYYY-MM-DD
  lieu: string;
  heure_debut: string; // HH:MM
  heure_fin: string; // HH:MM
  version: number;
  updatedAt: Date;
  updatedBy: string;
}

export interface Collaborateur {
  id?: string;
  tenantId: string;
  nom: string;
  prenom: string;
  metier: string;
  phone: string;
  email: string;
  note: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUser {
  uid: string;
  role: 'admin' | 'editor' | 'viewer';
  email: string;
  displayName?: string;
  createdAt: Date;
  lastAccess: Date;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: Date;
  ownerId: string;
  settings?: {
    defaultView: 'calendar' | 'table';
    timeZone: string;
  };
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface ConflictInfo {
  entityId: string;
  conflictedBy: string;
  conflictedAt: Date;
  currentVersion: number;
  expectedVersion: number;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  currentView?: string;
  editingEntity?: string;
  lastSeen: Date;
}

export interface ExcelImportConfig {
  fixedColumns: {
    numeroct: string;
    nom: string;
    prenom: string;
    metier: string;
    phone: string;
    email: string;
    note: string;
  };
  dateColumns: Array<{
    date: string;
    lieu: string;
    heureDebut: string;
    heureFin: string;
  }>;
}

export interface FilterOptions {
  dateDebut?: string;
  dateFin?: string;
  collaborateurs?: string[];
  lieux?: string[];
  metiers?: string[];
  notes?: string[];
}

export interface ViewOptions {
  view: 'calendar' | 'table';
  period?: 'day' | 'week' | 'month';
  date?: string;
}
