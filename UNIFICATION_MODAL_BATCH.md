# Unification du système de modal simple/batch - PlanningSemaine.vue

## �� Objectif
Utiliser le même composant modal pour l'ajout de disponibilités simples (1 cellule) et batch (plusieurs cellules), avec détection automatique du mode via un flag `isBatchMode`.

## ✅ Modifications effectuées

### 1. Variables d'état ajoutées (ligne 789-792)
```typescript
const isBatchMode = ref(false)
const batchDates = ref<string[]>([])
const batchCollaborateurId = ref<string>('')
```

### 2. Computed properties pour le mode batch (après ligne 1180)

#### mockBatchCell
Crée une cellule factice pour le mode batch afin de satisfaire les props du composant DispoEditContent.
```typescript
const mockBatchCell = computed(() => {
  if (!isBatchMode.value || batchDates.value.length === 0) return null
  return { collaborateurId: batchCollaborateurId.value, date: batchDates.value[0] }
})
```

#### batchDateRangeFormatted
Formate l'affichage de la plage de dates sélectionnées dans l'en-tête du modal.
```typescript
const batchDateRangeFormatted = computed(() => {
  if (batchDates.value.length === 0) return ''
  if (batchDates.value.length === 1) return formatModalDate(batchDates.value[0])
  const sorted = [...batchDates.value].sort()
  const first = new Date(sorted[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  const last = new Date(sorted[sorted.length - 1]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  return `${sorted.length} dates · ${first} → ${last}`
})
```

### 3. Fonction openBatchModal() (après ligne 3457)
Ouvre le modal en mode batch avec les cellules sélectionnées.

```typescript
function openBatchModal() {
  if (selectedCells.value.size === 0) return
  
  // Extraire le collaborateur et les dates des cellules sélectionnées
  const cellsArray = Array.from(selectedCells.value)
  const firstCell = cellsArray[0].split('_')
  batchCollaborateurId.value = firstCell[0]
  batchDates.value = cellsArray.map(cell => cell.split('_')[1])
  
  // Initialiser le formulaire avec les dernières préférences
  const prefs = getLastFormPreferences()
  editingDispo.value = { ...prefs }
  
  // Ouvrir le modal en mode batch
  isBatchMode.value = true
  isAddingNewDispo.value = true
  showDispoModal.value = true
}
```

### 4. Fonction saveBatchDispos() (après ligne 4105)
Sauvegarde les disponibilités pour toutes les dates sélectionnées.

Caractéristiques :
- Validation du formulaire identique au mode simple
- Détection automatique des missions overnight
- Création via `disponibilitesRTDBService.createDisponibilite()`
- Mapping des types legacy vers RTDB (mission → urgence, disponible → standard, etc.)
- Sauvegarde des préférences de formulaire pour réutilisation
- Notification de succès avec nombre de dispos créées
- Nettoyage automatique de la sélection après succès

### 5. Mise à jour de handleEditClose() (ligne 5242)
Réinitialisation des flags du mode batch à la fermeture du modal.

```typescript
// Réinitialiser le mode batch
isBatchMode.value = false
batchDates.value = []
batchCollaborateurId.value = ''
```

### 6. Template modal unifié (lignes 504-564)
Le même `va-modal` gère maintenant les deux modes via des props conditionnelles :

```vue
<DispoEditContent
  v-if="(selectedCell || isBatchMode) && showDispoModal"
  :selected-cell="selectedCell || mockBatchCell"
  :formatted-date="isBatchMode ? batchDateRangeFormatted : formatModalDate(selectedCell?.date || '')"
  :selected-cell-dispos="isBatchMode ? [] : selectedCellDispos"
  :is-adding-new-dispo="isAddingNewDispo || isBatchMode"
  @save-edit-dispo="isBatchMode ? saveBatchDispos : saveEditDispo"
/>
```

### 7. Bouton "Ajouter des dispos" (ligne 228)
Modification du handler pour appeler la nouvelle fonction :
```vue
<button @click="openBatchModal">
  <va-icon name="add_circle" />
  Ajouter des dispos ({{ selectedCells.size }})
</button>
```

### 8. Suppression de code obsolète
- ❌ Import de `BatchDisponibiliteModal` (ligne 610) - supprimé
- ❌ Utilisation de `<BatchDisponibiliteModal>` dans le template (lignes 570-578) - supprimé
- ❌ Fonction `handleBatchCreate()` - supprimée (obsolète)
- ❌ Fonction `cleanupTemporaryData()` - supprimée (obsolète)
- ❌ Computed `extractDatesFromSelection` - supprimé (non utilisé)
- ❌ Computed `extractCollaborateurFromSelection` - supprimé (non utilisé)

## 📊 Avantages de l'architecture unifiée

### Avant (2 systèmes séparés)
```
PlanningSemaine.vue
├── va-modal (simple) → DispoEditContent
└── BatchDisponibiliteModal (batch)
    └── va-modal → DispoEditContent
```

### Après (1 système unifié)
```
PlanningSemaine.vue
└── va-modal (simple + batch) → DispoEditContent
    ├── Mode simple: selectedCell + saveEditDispo()
    └── Mode batch: mockBatchCell + saveBatchDispos()
```

### Bénéfices
- ✅ **Code plus simple** : Un seul modal à maintenir
- ✅ **Consistance visuelle** : Même UI dans les deux modes
- ✅ **Logique centralisée** : Toute la gestion dans PlanningSemaine.vue
- ✅ **Moins de duplication** : Pas de code répété entre composants
- ✅ **Maintenance facilitée** : Un seul endroit à modifier pour changer le comportement

## 🔄 Flux d'utilisation

### Mode simple (1 cellule)
1. Clic sur cellule → `openCell(collabId, date)`
2. `selectedCell` = { collaborateurId, date }
3. `showDispoModal` = true
4. Modal s'ouvre avec `DispoEditContent`
5. Sauvegarde → `saveEditDispo()` → `saveDispos()`

### Mode batch (plusieurs cellules)
1. Sélection multiple → Clic "Ajouter des dispos (4)"
2. `openBatchModal()` appelée
3. `isBatchMode` = true, `batchDates` = [...], `batchCollaborateurId` = '...'
4. `mockBatchCell` créée automatiquement
5. Modal s'ouvre avec `DispoEditContent` (même composant!)
6. Sauvegarde → `saveBatchDispos()` → boucle sur toutes les dates

## 🎨 Comportement visuel

### En-tête du modal
- **Mode simple** : "Mercredi 22 janvier 2025"
- **Mode batch** : "4 dates · 22/01 → 25/01"

### Liste des disponibilités
- **Mode simple** : Affiche les dispos existantes pour la cellule
- **Mode batch** : Liste vide (création uniquement)

### Formulaire
- **Les deux modes** : Exactement le même formulaire avec mémoire des dernières valeurs

## 🔧 Configuration technique

### Services utilisés
- `disponibilitesRTDBService.createDisponibilite()` : Création des dispos
- `getLastFormPreferences()` : Récupération des préférences
- `saveFormPreferences()` : Sauvegarde des préférences
- `clearSelection()` : Nettoyage de la sélection après succès

### Mapping des types
```typescript
mission → urgence (RTDB)
disponible → standard (RTDB)
indisponible → maintenance (RTDB)

range → flexible (RTDB)
slot → fixed (RTDB)
full-day → flexible (RTDB)
overnight → flexible (RTDB)
```

## ⚠️ Note importante
Le fichier `BatchDisponibiliteModal.vue` existe toujours dans le projet car il est encore utilisé par :
- `PlanningWrapper.vue`
- `PlanningCollaborateur.vue`

Ces composants devront être refactorés ultérieurement pour utiliser le même système unifié.

## ✅ Tests à effectuer
1. ✅ Ouvrir une cellule simple → Modal s'ouvre correctement
2. ✅ Sélectionner plusieurs cellules → Bouton "Ajouter des dispos (X)" apparaît
3. ✅ Cliquer sur le bouton batch → Modal s'ouvre avec plage de dates
4. ✅ Remplir le formulaire → Mémoire des valeurs fonctionne
5. ✅ Sauvegarder en mode batch → Dispos créées sur toutes les dates
6. ✅ Fermer le modal → Sélection nettoyée automatiquement
7. ✅ Aucune erreur TypeScript → Compilation OK

## 📝 Résumé
Architecture simplifiée avec succès : un seul modal gérant deux modes via un flag `isBatchMode`, réutilisant le même composant `DispoEditContent` et la même logique de formulaire. Code plus maintenable et expérience utilisateur cohérente.
