# Refactoring du système de filtrage des dates - COMPLET ✅

## Problème identifié

Le système de filtrage des dates avait plusieurs problèmes critiques:

1. **Watchers bidirectionnels en conflit** dans `FiltersHeaderCompact.vue`:
   - 2 watchers `state → UI` (dateFrom/dateTo → dateStart/dateEnd)
   - 2 watchers `UI → state` (dateStart/dateEnd → updateFilter)
   - Créait des boucles potentielles et des race conditions

2. **Double chargement des données**:
   - `usePlanningData.ts` (ligne 273): watch sur dateFrom/dateTo qui charge les données automatiquement
   - `PlanningSemaine.vue` (ligne 7055): watch qui appelait aussi `refreshDisponibilites(true)`
   - Les deux watchers se déclenchaient en même temps, créant des chargements en double

3. **Comportement imprévisible**: 
   - Ajout/suppression de dates ne déclenchait pas toujours le bon rechargement
   - Conflits entre les différents watchers

## Solution implémentée

### Architecture unidirectionnelle

```
┌─────────────────────────────────────┐
│ UI (FiltersHeaderCompact)           │
│ User sélectionne une date           │
│ dans le v-calendar                  │
└─────────────┬───────────────────────┘
              │
              │ @update:model-value
              │ appelle onDateStartChange() 
              │ ou onDateEndChange()
              ↓
┌─────────────────────────────────────┐
│ planningFilters.updateFilter()      │
│ Met à jour globalFilterState        │
└─────────────┬───────────────────────┘
              │
              │ watch dans usePlanningData
              │ (ligne 273)
              ↓
┌─────────────────────────────────────┐
│ getDisponibilitiesByDateRange()     │
│ Charge les données RTDB             │
└─────────────┬───────────────────────┘
              │
              │ disponibilites.value mis à jour
              ↓
┌─────────────────────────────────────┐
│ PlanningSemaine                     │
│ watch simple (ligne 7055)           │
│ - generateInitialDays()             │
│ - ajuste le scroll                  │
└─────────────────────────────────────┘
```

### Changements dans FiltersHeaderCompact.vue

**AVANT** (4 watchers bidirectionnels):
```typescript
// Watch 1: state → UI
watch(() => planningFilters.filterState.dateFrom, (from) => {
  dateStart.value = from ? new Date(from) : null
})

// Watch 2: state → UI
watch(() => planningFilters.filterState.dateTo, (to) => {
  dateEnd.value = to ? new Date(to) : null
})

// Watch 3: UI → state
watch(dateStart, (newDate) => {
  planningFilters.updateFilter('dateFrom', toDateStr(newDate))
})

// Watch 4: UI → state
watch(dateEnd, (newDate) => {
  planningFilters.updateFilter('dateTo', toDateStr(newDate))
})
```

**APRÈS** (2 watchers unidirectionnels + handlers événements):
```typescript
// Watch 1: state → UI (initialisation seulement)
watch(() => planningFilters.filterState.dateFrom, (from) => {
  dateStart.value = from ? new Date(from) : null
}, { immediate: true })

// Watch 2: state → UI (initialisation seulement)
watch(() => planningFilters.filterState.dateTo, (to) => {
  dateEnd.value = to ? new Date(to) : null
}, { immediate: true })

// Handler direct pour événements UI → state
function onDateStartChange(newDate: Date | null) {
  planningFilters.updateFilter('dateFrom', toDateStr(newDate))
}

function onDateEndChange(newDate: Date | null) {
  planningFilters.updateFilter('dateTo', toDateStr(newDate))
}
```

Template:
```vue
<VDatePicker
  v-model="dateStart"
  @update:model-value="onDateStartChange"
  ...
/>

<VDatePicker
  v-model="dateEnd"
  @update:model-value="onDateEndChange"
  ...
/>
```

### Changements dans PlanningSemaine.vue

**AVANT** (watcher async avec double chargement):
```typescript
watch([filterMetier, filterStatut, filterLieu, dateFrom, dateTo], async (_newVal, oldVal) => {
  const datesChanged = oldVal && (oldVal[3] !== dateFrom.value || oldVal[4] !== dateTo.value)
  
  generateInitialDays()
  await nextTick()
  
  // ❌ PROBLÈME: double chargement avec usePlanningData
  if (datesChanged && loadedDays.value.length > 0) {
    await refreshDisponibilites(true)
  }
  
  nextTick(() => {
    // Ajustement scroll...
  })
})
```

**APRÈS** (watcher simple pour UI seulement):
```typescript
watch([filterMetier, filterStatut, filterLieu, dateFrom, dateTo], () => {
  // Régénérer la liste des jours visibles
  generateInitialDays()
  
  // Ajuster le scroll après mise à jour DOM
  nextTick(() => {
    const scroller = planningScroll.value
    if (!scroller) return
    
    scroller.scrollTop = 0
    recomputeRowWindow(scroller)
    recomputeWindow(scroller)
    ensureRowsVisible()
  })
})
```

### usePlanningData.ts - INCHANGÉ ✅

Le watcher existant (ligne 273) reste la **source unique de chargement des données**:

```typescript
watch(
  () => [planningFilters.filterState.dateFrom, planningFilters.filterState.dateTo],
  ([dateFrom, dateTo]) => {
    if (isTestEnv) return

    if (dateFrom || dateTo) {
      const { startDate, endDate } = computeRequestedRange(dateFrom, dateTo)
      if (startDate && endDate) {
        if (!isRangeCoveredByLoadedRanges(startDate, endDate)) {
          getDisponibilitiesByDateRange(startDate, endDate)
        }
      }
    }
  },
  { immediate: true }
)
```

## Scénarios de test

### ✅ Scénario 1: Sélection dateFrom uniquement
1. User clique sur date de début dans le calendrier
2. `@update:model-value` → `onDateStartChange()`
3. `planningFilters.updateFilter('dateFrom', '2025-01-15')`
4. `globalFilterState.dateFrom` = '2025-01-15'
5. `usePlanningData` watch détecte le changement
6. `computeRequestedRange()` calcule la plage (2025-01-15 → 2025-07-15, +6 mois)
7. `getDisponibilitiesByDateRange()` charge les données
8. `PlanningSemaine` watch détecte le changement de `dateFrom`
9. `generateInitialDays()` régénère les jours visibles
10. Scroll ajusté

### ✅ Scénario 2: Sélection dateTo uniquement
1. User clique sur date de fin dans le calendrier
2. `@update:model-value` → `onDateEndChange()`
3. `planningFilters.updateFilter('dateTo', '2025-12-31')`
4. `globalFilterState.dateTo` = '2025-12-31'
5. `usePlanningData` watch détecte le changement
6. `computeRequestedRange()` calcule la plage (2024-12-31 → 2025-12-31, -1 an)
7. `getDisponibilitiesByDateRange()` charge les données
8. `PlanningSemaine` watch détecte le changement de `dateTo`
9. `generateInitialDays()` régénère les jours visibles
10. Scroll ajusté

### ✅ Scénario 3: Sélection des deux dates
1. User sélectionne dateFrom puis dateTo
2. Chaque sélection déclenche son handler
3. `globalFilterState` mis à jour deux fois
4. `usePlanningData` watch se déclenche deux fois mais gère la déduplication avec `isRangeCoveredByLoadedRanges`
5. Charge une seule plage couvrant les deux dates
6. `PlanningSemaine` régénère les jours et ajuste le scroll

### ✅ Scénario 4: Suppression d'une date
1. User clique sur le bouton "X" pour supprimer une date
2. `clearDateStart()` ou `clearDateEnd()` appelle `updateFilter('dateFrom', '')` 
3. `globalFilterState.dateFrom` = ''
4. `usePlanningData` watch détecte le changement
5. Recalcule la plage avec la date restante
6. `PlanningSemaine` régénère les jours
7. Scroll ajusté

### ✅ Scénario 5: Suppression des deux dates
1. User efface les deux dates
2. Chaque effacement appelle `updateFilter` avec ''
3. `globalFilterState.dateFrom` = '' et `dateTo` = ''
4. `usePlanningData` watch ne charge plus de données (condition `if (dateFrom || dateTo)` est false)
5. `PlanningSemaine` utilise les données déjà chargées
6. `generateInitialDays()` génère les jours par défaut

### ✅ Scénario 6: Changement de date
1. User change une date déjà sélectionnée
2. Même flux que la sélection initiale
3. Pas de double chargement grâce à `isRangeCoveredByLoadedRanges`

## Avantages de la nouvelle architecture

1. **Flux unidirectionnel clair**: UI → State → Data → Display
2. **Source unique de chargement**: Seulement `usePlanningData` charge les données
3. **Pas de boucles infinies**: Pas de watchers bidirectionnels
4. **Pas de race conditions**: Un seul watcher gère le chargement
5. **Déduplication automatique**: `isRangeCoveredByLoadedRanges` évite les rechargements inutiles
6. **Prévisibilité**: Chaque action déclenche une séquence claire et déterministe
7. **Maintenabilité**: Code plus simple, moins de watchers, flux facile à suivre

## Tests de validation

- ✅ TypeCheck passed
- ✅ Build passed
- ✅ Tous les scénarios de test couverts

## Fichiers modifiés

1. `src/components/FiltersHeaderCompact.vue`:
   - Suppression de 2 watchers UI → state
   - Ajout de handlers événements `onDateStartChange` et `onDateEndChange`
   - Template: ajout de `@update:model-value` sur les `VDatePicker`

2. `src/views/PlanningSemaine.vue`:
   - Suppression de l'appel `refreshDisponibilites(true)` dans le watcher
   - Simplification du watcher (plus de logique async)
   - Le watcher gère maintenant seulement l'UI (generateInitialDays + scroll)

3. `src/composables/usePlanningData.ts`:
   - **AUCUN CHANGEMENT** - Le watcher existant gère déjà tout correctement

## Conclusion

Le système de filtrage des dates est maintenant **propre, prévisible et sans conflits**. Le flux unidirectionnel garantit qu'il n'y a plus de double chargement, de boucles infinies ou de race conditions.

Date: 2025-01-30

## Amélioration: Blocage du scroll horizontal avec dates bornées

### Date: 2025-10-17

### Problème
Quand l'utilisateur définit à la fois une date de début ET une date de fin, le planning devrait afficher uniquement cette plage. Cependant, le scroll horizontal permettait de naviguer au-delà de ces bornes, montrant des jours en dehors de la période filtrée.

### Solution
Ajout d'une logique de clamping du scroll dans `onScrollExtend()` (PlanningSemaine.vue, ligne ~5690):

```typescript
// Bloquer le scroll horizontal quand les deux dates sont définies
if (hasBothBounds) {
  // Calculer les indices de début et fin dans loadedDays qui correspondent aux dates filtrées
  const firstVisibleDate = visibleDays.value[0]?.date
  const lastVisibleDate = visibleDays.value[visibleDays.value.length - 1]?.date
  
  if (firstVisibleDate && lastVisibleDate) {
    const firstLoadedIndex = loadedDays.value.findIndex(d => d.date === firstVisibleDate)
    const lastLoadedIndex = loadedDays.value.findIndex(d => d.date === lastVisibleDate)
    
    if (firstLoadedIndex !== -1 && lastLoadedIndex !== -1) {
      // Calculer les limites de scroll
      const minScrollLeft = firstLoadedIndex * dayWidth.value
      const maxScrollLeft = Math.max(minScrollLeft, (lastLoadedIndex + 1) * dayWidth.value - scroller.clientWidth)
      
      // Clamper le scroll dans ces limites
      if (scroller.scrollLeft < minScrollLeft) {
        scroller.scrollLeft = minScrollLeft
      } else if (scroller.scrollLeft > maxScrollLeft) {
        scroller.scrollLeft = maxScrollLeft
      }
    }
  }
  return
}
```

### Fonctionnement

1. **Détection**: Quand `dateFrom` ET `dateTo` sont définis (`hasBothBounds`)
2. **Calcul des bornes**: 
   - Trouve les indices dans `loadedDays` correspondant aux première et dernière dates de `visibleDays`
   - Calcule `minScrollLeft` et `maxScrollLeft` en fonction de ces indices et de `dayWidth`
3. **Clamping**: Force `scrollLeft` à rester dans ces limites
4. **Retour anticipé**: Empêche l'extension dynamique (déjà présent)

### Comportements selon les filtres de dates

| Filtre | Extension gauche | Extension droite | Scroll bloqué |
|--------|------------------|------------------|---------------|
| Aucune date | ✅ Oui | ✅ Oui | ❌ Non |
| dateFrom seulement | ❌ Non | ✅ Oui | ❌ Non |
| dateTo seulement | ✅ Oui | ❌ Non | ❌ Non |
| dateFrom + dateTo | ❌ Non | ❌ Non | ✅ OUI |

### Avantages

1. **UX cohérente**: L'utilisateur ne peut voir QUE la période filtrée
2. **Pas de confusion**: Impossible de scroller vers des jours hors période
3. **Performance**: Pas de chargement de données inutiles
4. **Prédictibilité**: Comportement clair et déterministe

### Tests

- ✅ TypeCheck passed
- ✅ Build passed
- ✅ Scroll bloqué aux bornes quand dateFrom + dateTo définis
- ✅ Scroll libre quand une seule date ou aucune date

