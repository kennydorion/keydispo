# 🗄️ Structure de Données Optimisée - KeyDispo

## 📊 Analyse des Données Actuelles

### Format Excel/CSV Original
```csv
Nom;Prénom;Métier;Téléphone;Email;Ville;Date;Lieu;Heure début;Heure fin
11;Allan;EDUC;0033.635.24.92.00;;;2025-04-04;SOUS BALME;08:00;19:00
ALIDJRA;Sandra;AS;+33.783.78.22.71;;;2025-04-08;Orion;08:00;16:30
```

### Problèmes Identifiés
1. **Répétition massive** : Chaque ligne répète nom, prénom, métier, téléphone, etc.
2. **Taille énorme** : 5528 lignes pour quelques dizaines de collaborateurs
3. **Redondance** : Un collaborateur = des centaines de lignes identiques
4. **Inefficacité** : Recherche et filtres lents sur Firebase
5. **Coût** : Facuration Firebase basée sur les lectures/écritures

## 🚀 Structure Proposée - Approach Hybride

### 1. Collection `collaborateurs` (Normalisée)
```typescript
// Collection: collaborateurs/{collaborateurId}
interface Collaborateur {
  id: string;                    // Auto-généré par Firebase
  tenantId: string;             // Multi-tenant
  
  // Informations personnelles
  nom: string;                  // "ALIDJRA"
  prenom: string;               // "Sandra"
  metier: string;               // "AS", "EDUC", "CT"
  phone?: string;               // "+33.783.78.22.71"
  email?: string;               // Auto-générée ou saisie
  ville?: string;               // Ville de rattachement
  
  // Métadonnées
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
  version: number;
  
  // Optimisations pour les requêtes
  searchTerms: string[];        // ["alidjra", "sandra", "as"] pour recherche
  isActive: boolean;            // Collaborateur actif ou archivé
}
```

### 2. Collection `disponibilites` (Optimisée par Collaborateur)
```typescript
// Collection: disponibilites/{collaborateurId}_{periode}
// Exemple: disponibilites/sandra_alidjra_2025_04
interface PeriodeDisponibilites {
  id: string;                   // "sandra_alidjra_2025_04"
  tenantId: string;
  collaborateurId: string;      // Référence vers collaborateurs
  
  // Période couverte
  annee: number;                // 2025
  mois: number;                 // 4 (avril)
  periode: string;              // "2025-04" pour indexation
  
  // Disponibilités compactées
  disponibilites: DisponibiliteDay[];
  
  // Statistiques pré-calculées (pour performance)
  stats: {
    totalJours: number;         // Nombre de jours avec disponibilité
    joursTravailles: number;    // Jours en mission/travail
    joursDisponibles: number;   // Jours disponibles
    joursIndisponibles: number; // Congés, etc.
    lieux: string[];           // Liste unique des lieux ce mois
  };
  
  // Métadonnées
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
}

interface DisponibiliteDay {
  date: string;                 // "2025-04-08"
  lieu: string;                 // "Orion", "SOUS BALME", "INDISPONIBLE"
  heureDebut?: string;          // "08:00" (optionnel si INDISPONIBLE)
  heureFin?: string;            // "16:30"
  type?: string;                // "MISSION", "DISPONIBLE", "CONGE", "FORMATION"
  notes?: string;               // Notes optionnelles
}
```

### 3. Collection `lieux` (Référentiel)
```typescript
// Collection: lieux/{lieuId}
interface Lieu {
  id: string;                   // Auto-généré
  tenantId: string;
  
  nom: string;                  // "Orion", "SOUS BALME"
  nomCourt: string;             // "ORI", "BAL" pour affichage compact
  type: string;                 // "SIEGE", "MISSION", "FORMATION"
  adresse?: string;
  ville?: string;
  
  // Configuration d'affichage
  couleur?: string;             // "#FF9800" pour le chip
  icone?: string;               // "🏢", "🚗", "📚"
  
  // Statistiques
  utilisationCount: number;     // Nombre d'utilisations
  isActive: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4. Collection `planning_cache` (Performance)
```typescript
// Collection: planning_cache/{semaine_id}
// Exemple: planning_cache/2025_W33
interface PlanningCache {
  id: string;                   // "2025_W33"
  tenantId: string;
  
  // Période
  annee: number;                // 2025
  semaine: number;              // 33
  dateDebut: string;            // "2025-08-11"
  dateFin: string;              // "2025-08-17"
  
  // Données pré-calculées pour la semaine
  collaborateurs: CollaborateurSemaine[];
  
  // Statistiques globales
  stats: {
    totalCollaborateurs: number;
    collaborateursActifs: number;
    totalDisponibilites: number;
    repartitionLieux: { [lieu: string]: number };
  };
  
  // Gestion du cache
  generatedAt: Timestamp;
  expiresAt: Timestamp;         // TTL pour régénération
  version: number;
}

interface CollaborateurSemaine {
  collaborateurId: string;
  nom: string;
  prenom: string;
  metier: string;
  
  // Planning de la semaine (7 jours)
  jours: {
    [date: string]: {           // "2025-08-11"
      lieu?: string;
      heureDebut?: string;
      heureFin?: string;
      type?: string;
    }
  };
}
```

## 📈 Avantages de cette Structure

### Performance
- **Réduction drastique** : ~5500 documents → ~200 documents
- **Recherche optimisée** : Index sur searchTerms, periode, etc.
- **Cache intelligent** : Planning pré-calculé par semaine
- **Requêtes ciblées** : Une requête par collaborateur/période

### Flexibilité
- **Périodes modulaires** : Mensuelles pour équilibrer taille/performance
- **Référentiel lieux** : Normalisation et cohérence
- **Extensibilité** : Facile d'ajouter de nouveaux champs
- **Multi-tenant** : Isolation complète des données

### Coûts
- **Lectures réduites** : ~90% de réduction des lectures Firebase
- **Écritures optimisées** : Batch updates par période
- **Bande passante** : Documents plus petits
- **Index intelligents** : Requêtes plus rapides

## 🔄 Stratégie de Migration

### Script d'Import Optimisé
```typescript
class OptimizedImporter {
  async importFromCSV(csvData: CSVRow[]) {
    // 1. Extraire les collaborateurs uniques
    const collaborateurs = this.extractUniqueCollaborateurs(csvData)
    
    // 2. Grouper les disponibilités par collaborateur/mois
    const groupedDispos = this.groupDisponibilitiesByMonth(csvData)
    
    // 3. Importer en batch
    await this.batchImportCollaborateurs(collaborateurs)
    await this.batchImportDisponibilites(groupedDispos)
    
    // 4. Générer les caches de planning
    await this.generatePlanningCaches()
  }
}
```

### Comparaison des Approches

| Aspect | Structure Actuelle | Structure Proposée |
|--------|-------------------|-------------------|
| **Documents** | ~5,500 | ~200 |
| **Taille moy.** | 500 bytes | 2KB |
| **Lectures/semaine** | 5,500 | 50 |
| **Recherche** | Scan complet | Index optimisé |
| **Cache** | Aucun | Planning pré-calculé |
| **Extensibilité** | Limitée | Excellente |

## 🎯 Cas d'Usage Optimisés

### 1. Affichage Planning Semaine
```typescript
// Avant: 5500 lectures
const dispos = await db.collection('dispos')
  .where('date', '>=', '2025-08-11')
  .where('date', '<=', '2025-08-17')
  .get()

// Après: 1 lecture
const planning = await db.doc('planning_cache/2025_W33').get()
```

### 2. Recherche Collaborateur
```typescript
// Avant: Scan de tous les documents
const results = await db.collection('dispos')
  .where('nom', '==', 'ALIDJRA')
  .get()

// Après: Index optimisé
const results = await db.collection('collaborateurs')
  .where('searchTerms', 'array-contains', 'alidjra')
  .get()
```

### 3. Statistiques Métier
```typescript
// Avant: Calcul en temps réel sur 5500 docs
const stats = await calculateStats(allDispos)

// Après: Pré-calculé
const planning = await db.doc('planning_cache/2025_W33').get()
const stats = planning.data().stats
```

## 🚀 Plan d'Implémentation

### Phase 1: Préparation
1. **Script de nettoyage** ✅ (créé)
2. **Nouveau script d'import** (à créer)
3. **Tests sur données échantillon**

### Phase 2: Migration
1. **Import des collaborateurs**
2. **Import des disponibilités groupées**
3. **Génération des caches**

### Phase 3: Adaptation Frontend
1. **Nouveaux services Vue**
2. **Composants optimisés**
3. **Tests de performance**

Cette structure permettra de gérer **des milliers de collaborateurs** avec des **performances excellentes** et des **coûts maîtrisés**! 🎉
