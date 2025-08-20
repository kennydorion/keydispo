// Nouvelles structures de données optimisées pour l'affichage Planning Équipe

export interface CollaborateurOptimized {
  id?: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  phone: string | null
  email: string | null
  ville: string | null
  actif: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DisponibilitesCollaborateur {
  id?: string // collaborateurId
  tenantId: string
  collaborateurId: string
  nom: string // dénormalisé pour les requêtes
  prenom: string // dénormalisé pour les requêtes
  metier: string // dénormalisé pour les requêtes
  
  // Disponibilités par mois (format YYYY-MM)
  disponibilites: {
    [monthKey: string]: {
      [dateKey: string]: { // format YYYY-MM-DD
        lieu: string | null
        heure_debut: string | null // HH:MM
        heure_fin: string | null // HH:MM
        statut: 'disponible' | 'indisponible' | 'affecte'
      }[]
    }
  }
  
  version: number
  updatedAt: Date
  updatedBy: string
}

// Structure pour le cache local optimisé
export interface CollaborateurWithDispos {
  collaborateur: CollaborateurOptimized
  disponibilites: Map<string, {
    lieu: string | null
    heure_debut: string | null
    heure_fin: string | null
    statut: 'disponible' | 'indisponible' | 'affecte'
  }[]> // Map avec clé = date (YYYY-MM-DD)
}

// Interface pour l'affichage planning
export interface PlanningData {
  collaborateurs: CollaborateurOptimized[]
  disponibilitesByCollaborateur: Map<string, Map<string, any[]>> // collaborateurId -> date -> dispos[]
  loadedMonths: Set<string>
  totalCollaborateurs: number
}

// Interface pour les opérations en batch
export interface BatchDisponibiliteUpdate {
  collaborateurId: string
  date: string
  nouvelleDispo: {
    lieu: string | null
    heure_debut: string | null
    heure_fin: string | null
    statut: 'disponible' | 'indisponible' | 'affecte'
  }
}
