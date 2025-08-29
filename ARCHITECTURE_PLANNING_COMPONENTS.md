# Architecture des Composants de Planning - Documentation

## Vue d'ensemble

Cette documentation décrit l'architecture modulaire créée lors de la refactorisation du composant monolithique `SemaineVirtualClean.vue` (9,056 lignes) en composants réutilisables et maintenables.

## Structure des Composants

### 🏗️ Composant Principal

#### `PlanningOptimized.vue`
- **Rôle**: Point d'entrée et orchestrateur principal
- **Responsabilités**: 
  - Gestion d'état global du planning
  - Coordination des interactions entre composants
  - Gestion des données avec `usePlanningData`
  - Interface avec les modals et popups
- **Props**: Aucune (composant autonome)
- **Émissions**: Événements de navigation et d'action utilisateur

### 📊 Composants de Status et Indicateurs

#### `PlanningStatusPanel.vue`
- **Rôle**: Affichage du statut temps réel et des utilisateurs connectés
- **Props**: 
  - `isRealtimeActive`: État de la connexion temps réel
  - `activeUsers`: Liste des utilisateurs actifs
  - `connectedUsers`: Utilisateurs connectés avec détails
  - `isEmulatorMode`: Mode émulateur Firebase
- **Émissions**: `show-realtime-stats`, `cleanup-sessions`

#### `PlanningIndicators.vue`
- **Rôle**: Indicateurs de chargement et suggestions d'optimisation
- **Props**: 
  - `suggestions`: Suggestions d'optimisation
  - `extending`: État d'extension en cours
  - `isBusy`: Indicateur de traitement en cours
  - `isInitialLoad`: Premier chargement
  - `fetchingRanges`: Chargement de plages de dates
  - `isEmulator`: Mode émulateur

#### `PlanningLoadingModal.vue`
- **Rôle**: Modal de chargement avec indicateurs de progression
- **Props**: 
  - `showModal`: Visibilité du modal
  - `loadingCollaborateurs`: État de chargement des collaborateurs
  - `loadingDisponibilites`: État de chargement des disponibilités
  - `allCollaborateursCount`: Nombre total de collaborateurs
  - `visibleDaysCount`: Nombre de jours visibles

### 🎛️ Composants d'Interaction

#### `PlanningSelectionBar.vue`
- **Rôle**: Barre de sélection et actions en lot
- **Props**: 
  - `selectedCells`: Set des cellules sélectionnées
  - `isSelectionMode`: Mode sélection actif
  - `isDraggingSelection`: Sélection par glisser-déposer en cours
- **Émissions**: `clear-selection`, `open-batch-modal`

### 📅 Composants de Grille

#### `PlanningGrid.vue`
- **Rôle**: Grille principale avec virtualisation des données
- **Responsabilités**:
  - Virtualisation des lignes et colonnes
  - Gestion du scroll et de la performance
  - Coordination entre en-têtes et cellules
- **Props**: 
  - `collaborateurs`: Liste des collaborateurs
  - `disponibilites`: Données de disponibilité
  - `dates`: Plage de dates à afficher
  - `selectedCells`: Cellules sélectionnées
  - `cellLocks`: Verrous de cellules (multi-utilisateur)
  - Configuration (dimensions, couleurs, etc.)
- **Émissions**: Événements de clic, survol, sélection

#### `DateHeaderCell.vue`
- **Rôle**: En-tête de colonne pour chaque date
- **Props**: 
  - `date`: Date au format YYYY-MM-DD
  - `columnWidth`: Largeur de la colonne
  - `headerHeight`: Hauteur de l'en-tête
  - `availabilityCount`: Nombre de disponibilités pour cette date
  - `isSelected`: État de sélection de la date
- **Émissions**: `selectDate`

#### `CollaborateurColumn.vue`
- **Rôle**: Colonne sticky des informations collaborateur
- **Props**: 
  - `collaborateur`: Objet collaborateur complet
  - `stickyLeftWidth`: Largeur de la colonne sticky
  - `rowHeight`: Hauteur de la ligne
- **Émissions**: `openInfo`

#### `PlanningCell.vue`
- **Rôle**: Cellule individuelle du planning
- **Responsabilités**:
  - Affichage des disponibilités
  - Gestion des interactions utilisateur
  - Indicateurs multi-utilisateur
  - États visuels (sélection, verrouillage, etc.)
- **Props**: 
  - `collaborateurId`: ID du collaborateur
  - `date`: Date de la cellule
  - `cellDispos`: Disponibilités pour cette cellule
  - `isToday`, `isWeekend`: États temporels
  - `isSelected`, `isLocked`: États d'interaction
  - `lockedBy`: Utilisateur ayant verrouillé la cellule
  - Dimensions et configuration mobile
- **Émissions**: `click`, `hover`, `leave`

## 🛠️ Composables

### `usePlanningData.ts`
- **Rôle**: Gestion centralisée des données de planning
- **Fonctionnalités**:
  - Cache des collaborateurs et disponibilités
  - Chargement intelligent par plages de dates
  - Interface avec Firebase (Firestore + RTDB)
  - Gestion d'état de chargement
- **Exports principaux**:
  - `allCollaborateurs`: Liste réactive des collaborateurs
  - `disponibilitesCache`: Cache des disponibilités par plage
  - `loadCollaborateursFromFirebase()`: Chargement des collaborateurs
  - `getDisponibilites()`: Récupération des disponibilités

### `useVirtualization.ts`
- **Rôle**: Logique de virtualisation pour performances
- **Fonctionnalités**:
  - Virtualisation 1D et 2D
  - Gestion du scroll et des buffers
  - Calculs de visibilité optimisés
  - Adaptabilité responsive
- **Exports principaux**:
  - `useVirtualization()`: Virtualisation simple
  - `useColumnVirtualization()`: Virtualisation horizontale
  - `use2DVirtualization()`: Virtualisation bidimensionnelle

## 🔄 Flux de Données

```
PlanningOptimized (orchestrateur)
├── usePlanningData (données)
├── PlanningStatusPanel (status)
├── PlanningSelectionBar (sélection)
├── PlanningIndicators (feedback)
├── PlanningGrid (grille principale)
│   ├── DateHeaderCell (en-têtes dates)
│   ├── CollaborateurColumn (colonnes collabs)
│   └── PlanningCell (cellules individuelles)
└── PlanningLoadingModal (chargement)
```

## 🎯 Avantages de l'Architecture

### Maintenabilité
- **Séparation des responsabilités**: Chaque composant a un rôle défini
- **Testabilité**: Composants isolés plus faciles à tester
- **Réutilisabilité**: Composants modulaires réutilisables

### Performance
- **Virtualisation optimisée**: Rendu uniquement des éléments visibles
- **Cache intelligent**: Données mises en cache avec invalidation
- **Lazy loading**: Chargement à la demande des plages de dates

### Collaboration
- **Développement parallèle**: Équipes peuvent travailler sur différents composants
- **Review de code facilitée**: Changements isolés plus faciles à reviewer
- **Debugging ciblé**: Erreurs localisées dans des composants spécifiques

### Évolutivité
- **Ajout de fonctionnalités**: Nouveaux composants ou extensions faciles
- **Modification d'UI**: Interface modulaire adaptable
- **Migration progressive**: Remplacement possible composant par composant

## 📝 Migration depuis SemaineVirtualClean.vue

### Avant (Monolithique)
- 9,056 lignes dans un seul fichier
- Logique mélangée (UI, données, état)
- Difficile à maintenir et déboguer
- Tests complexes et fragiles

### Après (Modulaire)
- ~1,000 lignes réparties en 9 composants
- Responsabilités clairement séparées
- Code lisible et maintenable
- Tests unitaires possibles

### Guide de Migration
1. **Analyser les dépendances**: Identifier les composants utilisant SemaineVirtualClean.vue
2. **Remplacer les imports**: Pointer vers PlanningOptimized.vue
3. **Vérifier les props**: S'assurer de la compatibilité des interfaces
4. **Tester les fonctionnalités**: Valider que toutes les features fonctionnent
5. **Archiver l'ancien**: Garder SemaineVirtualClean.vue en backup temporaire

## 🚀 Utilisation

```vue
<template>
  <PlanningOptimized />
</template>

<script setup>
import PlanningOptimized from '@/components/planning/PlanningOptimized.vue'
</script>
```

Le composant est entièrement autonome et gère ses propres données via les composables intégrés.
