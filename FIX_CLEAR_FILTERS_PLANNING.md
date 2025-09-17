# Fix: Problème de remise à zéro des filtres du planning

## 🐛 Problème identifié
Quand on utilisait la fonction "Remettre à zéro" dans le planning admin, tous les collaborateurs n'étaient pas visibles comme ils auraient dû l'être.

## 🔍 Cause racine
La fonction `filteredCollaborateurs` dans `PlanningSemaine.vue` avait une logique de filtrage défaillante pour les filtres avancés (lieu et statut) :

### Problème 1: Condition de filtre lieu incorrecte
```typescript
// AVANT (problématique)
const lieuMatch = !planningFilters.filterState.lieu || !effectiveStart || 
  hasLieuInRange(collab.id, planningFilters.filterState.lieu, effectiveStart, effectiveEnd || undefined)
```

Cette condition était confuse car :
- Si `effectiveStart` était vide, `lieuMatch` était automatiquement `true`
- Mais si `effectiveStart` existait et qu'il n'y avait pas de filtre lieu, la condition était plus complexe que nécessaire

### Problème 2: Filtres avancés toujours appliqués
Même quand tous les filtres étaient remis à zéro, la logique des filtres avancés (lieu et statut) continuait d'être exécutée, ce qui pouvait filtrer les collaborateurs de manière inattendue.

## ✅ Solution appliquée

### 1. Court-circuit pour les filtres vides
Ajout d'une vérification early-return si aucun filtre avancé n'est actif :

```typescript
// Si aucun filtre avancé n'est actif, retourner directement les résultats
if (!planningFilters.filterState.lieu && !planningFilters.filterState.statut) {
  return results
}
```

### 2. Logique de filtrage simplifiée
Clarification de la logique des filtres lieu et statut :

```typescript
// APRÈS (corrigé)
let lieuMatch = true
if (planningFilters.filterState.lieu && effectiveStart) {
  lieuMatch = hasLieuInRange(collab.id, planningFilters.filterState.lieu, effectiveStart, effectiveEnd || undefined)
}
```

### 3. Debug ajouté temporairement
Console.log ajoutés pour diagnostiquer le comportement :
- État des filtres avant/après clearAllFilters
- Nombre de collaborateurs à chaque étape de filtrage
- Détection des filtres avancés actifs

## 🎯 Résultat attendu

Maintenant quand on clique sur "Remettre à zéro" :
1. Tous les filtres sont effacés (search, metier, lieu, statut, dates)
2. La fonction `filteredCollaborateurs` détecte qu'aucun filtre avancé n'est actif
3. Elle retourne directement tous les collaborateurs de base (sans filtrage supplémentaire)
4. Tous les collaborateurs doivent être visibles dans le planning

## 🔧 Test de la correction

Pour tester :
1. Appliquer des filtres (recherche, métier, lieu, statut)
2. Vérifier que le nombre de collaborateurs diminue
3. Cliquer sur "Remettre à zéro" 
4. Vérifier que le nombre de collaborateurs revient au total complet
5. Contrôler les console.log pour confirmer le comportement

Les logs devraient montrer :
- Filtres actifs avant clearAllFilters
- Filtres vides après clearAllFilters
- Retour direct sans filtres avancés
- Nombre total de collaborateurs restauré

## 📝 Fichiers modifiés
- `/src/views/PlanningSemaine.vue` : Correction de la logique de filtrage et ajout de debug
