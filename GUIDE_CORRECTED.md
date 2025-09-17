# Corrections apportées au Guide Utilisateur

## Problème identifié
Le guide utilisateur contenait des informations inexactes qui ne correspondaient pas aux vraies fonctionnalités de l'application.

## Analyse effectuée
Recherche approfondie dans le code source pour identifier les vraies fonctionnalités :

1. **Système de filtres** - `usePlanningFilters.ts`
2. **Sélection multiple** - `PlanningCollaborateur.vue`, `PlanningSelectionBar.vue`
3. **Raccourcis clavier** - Events listeners dans les composants
4. **Import/Export** - `ImportDispos.vue`, tools
5. **Rôles et permissions** - `firestore.rules`, `auth.ts`

## Corrections principales apportées

### 1. Section Filtres
**Avant :** Descriptions génériques non spécifiques
**Après :** 
- Recherche globale (nom/prénom/email/téléphone)
- Filtre par métier (dropdown dynamique)
- Filtre par lieu (conditionnel, seulement en mode Missions)
- Filtres de dates (dateFrom/dateTo)
- Modes d'affichage (Planning/Collaborateur)

### 2. Nouvelle section : Sélection multiple et édition en lot
**Ajouté :**
- Sélection Ctrl/Cmd + clic
- Drag selection
- Mode sélection mobile avec FAB
- Barre de statut de sélection
- Modal batch pour modification en lot
- Système de verrous sur sélections
- Limitation : un seul collaborateur à la fois

### 3. Section Raccourcis clavier
**Avant :** Raccourcis inventés (navigation, Ctrl+F, etc.)
**Après :** Raccourcis réels uniquement
- Escape: effacer sélection
- Ctrl/Cmd + clic: mode sélection
- Ctrl/Cmd + glisser: sélection par drag
- Navigation limitée

### 4. Section Import/Export
**Avant :** Mentionnait des exports CSV/PDF inexistants
**Après :** 
- Import Excel uniquement (via ImportDispos.vue)
- Format spécifique requis (colonnes fixes + triplets)
- Process détaillé : Analyse → Prévisualisation → Import RTDB
- Note claire : pas d'export interface (en roadmap)

### 5. Section Multi-tenant et rôles
**Enrichie avec :**
- Description précise des 4 rôles (admin/editor/viewer/collaborateur)
- Sécurité Firestore stricte
- Protection des routes

### 6. FAQ enrichie
**Ajouté :**
- Problèmes de sélection multiple
- Filtre par lieu invisible (mode Missions)
- Amélioration des réponses existantes

## Résultat
Le guide reflète maintenant fidèlement les fonctionnalités réelles de l'application et sera utile aux administrateurs.
