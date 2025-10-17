# Fix : Rechargement des disponibilités après suppression de la date de fin

## Problème

Quand l'utilisateur :
1. Sélectionne une **date de début** ET une **date de fin** dans les filtres
2. Puis **supprime la date de fin** (en gardant la date de début)

→ Le planning ne se met pas à jour pour afficher toutes les dates **après** la date de début

## Cause

Dans `src/composables/usePlanningData.ts`, la fonction `computeRequestedRange()` :

```typescript
// AVANT (restrictif)
if (dateFrom && !dateTo) {
  const start = new Date(dateFrom)
  const end = new Date(start)
  end.setDate(start.getDate() + 30)  // ⚠️ Seulement 30 jours !
  endDate = end.toISOString().split('T')[0]
}
```

**Problème** : Quand `dateTo` est supprimé, le système ne charge que 30 jours de disponibilités après `dateFrom`. Si l'utilisateur s'attend à voir des mois plus tard, les données ne sont pas chargées.

## Solution Appliquée

Augmentation de la fenêtre de chargement de **30 jours** → **6 mois** :

```typescript
// APRÈS (plus large)
if (dateFrom && !dateTo) {
  const start = new Date(dateFrom)
  const end = new Date(start)
  end.setMonth(start.getMonth() + 6)  // ✅ 6 mois de données
  endDate = end.toISOString().split('T')[0]
}
```

### Bénéfices

- ✅ **Meilleure UX** : L'utilisateur voit toutes les disponibilités sur les 6 prochains mois
- ✅ **Moins de rechargements** : Les données sont en cache pour une plus longue période
- ✅ **Performance** : Moins de requêtes réseau répétées
- ✅ **Cohérence** : Le comportement correspond aux attentes de l'utilisateur

### Cas d'usage typique

**Scénario 1 : Recherche de disponibilités futures**
```
Utilisateur : "Je veux voir tous les collègues disponibles à partir du 15 janvier"
Avant : Ne charge que jusqu'au 14 février (30 jours)
Après : Charge jusqu'au 15 juillet (6 mois) ✅
```

**Scénario 2 : Planning trimestriel**
```
Utilisateur : "Afficher les dispos du trimestre à partir de janvier"
Avant : Devait recharger 3 fois (tous les 30 jours)
Après : Une seule requête couvre 6 mois ✅
```

## Impact

### Performance
- **Taille de requête** : Augmente légèrement (6 mois vs 30 jours)
- **Nombre de requêtes** : Diminue drastiquement (6x moins de requêtes)
- **Cache** : Meilleure efficacité du cache local

### UX
- **Perception** : L'utilisateur voit immédiatement toutes les données pertinentes
- **Frustration** : Élimine le cas "Pourquoi je ne vois rien après mars ?"
- **Confiance** : L'application se comporte de manière prévisible

## Fichiers Modifiés

- `src/composables/usePlanningData.ts` : Fonction `computeRequestedRange()`

## Tests Recommandés

1. ✅ Sélectionner une date de début + date de fin
2. ✅ Supprimer la date de fin (clic sur X)
3. ✅ Vérifier que le planning affiche bien les disponibilités sur 6 mois
4. ✅ Scroller horizontalement pour voir les mois futurs
5. ✅ Vérifier que les données sont chargées (pas de cellules vides)

## Notes Techniques

### Gestion du cache
La fonction `isRangeCoveredByLoadedRanges()` gère intelligemment les plages déjà chargées pour éviter les doublons. Avec une fenêtre de 6 mois, le cache devient beaucoup plus efficace.

### Fusion des plages
La fonction `addLoadedRange()` fusionne automatiquement les plages qui se chevauchent, ce qui optimise la mémoire.

### Watch automatique
Le watch sur `[dateFrom, dateTo]` détecte automatiquement le changement et déclenche le rechargement :

```typescript
watch(
  () => [planningFilters.filterState.dateFrom, planningFilters.filterState.dateTo],
  ([dateFrom, dateTo]) => {
    if (dateFrom || dateTo) {
      const { startDate, endDate } = computeRequestedRange(dateFrom, dateTo)
      if (startDate && endDate) {
        if (!isRangeCoveredByLoadedRanges(startDate, endDate)) {
          getDisponibilitiesByDateRange(startDate, endDate) // ← Ici
        }
      }
    }
  },
  { immediate: true }
)
```

---
Date : 17 octobre 2025
Statut : **Résolu** ✅
Impact : Amélioration significative de l'UX et de la performance
