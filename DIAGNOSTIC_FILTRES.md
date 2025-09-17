# Solutions pour le problème "0 / 82 collaborateurs" avec filtres

## Diagnostic du problème

Lorsque vous filtrez par **Métier + Lieu + Statut + Date** et obtenez "0 / 82", voici les causes possibles :

### 1. Données manquantes pour la date
**Symptôme** : Aucune disponibilité n'existe pour la date sélectionnée
**Solution** : Vérifiez qu'il y a des données dans la plage de dates

### 2. Lieu inexistant à cette date
**Symptôme** : Le lieu filtré n'a aucune mission cette date-là
**Solution** : Vérifiez les lieux disponibles dans les données

### 3. Métier incorrect
**Symptôme** : Le métier filtré n'existe pas ou est mal orthographié
**Solution** : Vérifiez la liste des métiers disponibles

### 4. Mauvaise détection de statut
**Symptôme** : Les missions ne sont pas reconnues comme telles
**Solution** : Vérifiez que `resolveDispoKind` fonctionne correctement

## Outils de diagnostic

### 1. Panel de debug
En mode développement, un bouton "🔍 Debug" apparaît en bas à droite.

### 2. Fonctions console
```javascript
// Diagnostic complet
diagnoseFiltreADV()

// Test du scénario exact
testScenarioADV()

// Examiner les données brutes
window.__planningData.filteredDisponibilites.value
window.__planningFilters.lieuxOptions.value
```

### 3. Logs automatiques
Ouvrez la console et regardez les logs `🔍 [DEBUG]` lors du filtrage.

## Exemple concret du problème

Pour le cas **"ADV + En mission + 15 septembre 2025"** :

1. **Fait** : Il n'y a aucune mission ADV le 15 septembre 2025 dans le dataset
2. **Données réelles** : Seule une indisponibilité existe ce jour-là (Marine MAUFROY)
3. **Missions ADV** : Existent en juin/juillet 2025 pour d'autres dates

## Solutions

### Test avec des données existantes
```javascript
// Test avec une date qui a des missions ADV
testScenarioADV('AS', 'ADV', '2025-06-26')
```

### Vérification des données
```javascript
// Voir toutes les missions ADV disponibles
window.__planningData.disponibilites.value
  .filter(d => d.lieu?.toLowerCase() === 'adv')
  .map(d => ({ date: d.date, nom: d.nom, metier: d.metier }))
```
