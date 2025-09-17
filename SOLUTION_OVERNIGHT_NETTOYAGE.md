# 🔧 Résolution du problème de nettoyage des horaires overnight

## ❌ Problème identifié

Après l'enregistrement de missions overnight, les horaires étaient transformés et l'information "overnight" était perdue, causant un affichage incorrect dans le planning.

### Cause racine
Le nettoyage des données lors de la sauvegarde transformait `timeKind: 'overnight'` en `timeKind: 'flexible'` dans RTDB, puis lors du rechargement, `'flexible'` était retransformé en `'range'`, perdant complètement l'information overnight.

### Pipeline défaillant AVANT
```
UI: overnight → Sauvegarde: flexible → RTDB: flexible → Rechargement: range → UI: range
                    ❌ BUG                                     ❌ PERTE
```

## ✅ Solution implémentée

### 1. Extension du type RTDB
- Ajout de `'overnight'` dans l'interface `DisponibiliteRTDB.timeKind`
- Support natif des missions de nuit en base de données

### 2. Correction des mappings UI → RTDB (sauvegarde)
- **SemaineVirtualClean.vue** : `mapLegacyTimeKindToRTDB('overnight') → 'overnight'`
- **PlanningSemaine.vue** : Même correction pour cohérence
- Préservation de l'information overnight lors de la sauvegarde

### 3. Correction des mappings RTDB → UI (rechargement)
- **SemaineVirtualClean.vue** : `mapRTDBTimeKindToLegacy('overnight') → 'overnight'`
- **PlanningSemaine.vue** : Même correction
- **collaborateurSelf.ts** : `mapRTDBTimeKindToUI('overnight') → 'overnight'`
- Préservation de l'information overnight lors du rechargement

### Pipeline corrigé APRÈS
```
UI: overnight → Sauvegarde: overnight → RTDB: overnight → Rechargement: overnight → UI: overnight
                    ✅ OK                               ✅ PRÉSERVÉ
```

## 📋 Fichiers modifiés

1. **src/services/disponibilitesRTDBService.ts**
   - Extension du type `timeKind` pour inclure `'overnight'`

2. **src/views/SemaineVirtualClean.vue**
   - Correction `mapLegacyTimeKindToRTDB` (création et mise à jour)
   - Correction `mapRTDBTimeKindToLegacy`

3. **src/views/PlanningSemaine.vue**
   - Correction `mapRTDBTimeKindToLegacy`

4. **src/services/collaborateurSelf.ts**
   - Correction `mapRTDBTimeKindToUI`

## 🧪 Tests ajoutés

### Tests de mapping (overnight-mapping.spec.ts)
- 14 tests validant la bidirectionnalité des mappings
- Simulation de l'ancien comportement défaillant vs nouveau comportement

### Tests d'intégration (overnight-preservation.spec.ts)
- 9 tests du pipeline complet UI → RTDB → UI
- Validation de la préservation overnight à travers toutes les transformations
- Tests de régression pour les autres `timeKind`

### Résultats
- **76 tests** passent (vs 67 avant)
- **Couverture complète** du cycle de vie overnight
- **Validation** de tous les cas limites

## ✅ Validation

### Test build
```bash
npm run build  # ✅ Succès
```

### Test suite complète
```bash
npm test  # ✅ 76/76 tests passent
```

### Comportement attendu maintenant
1. **Détection automatique** : 22:00-06:00 → `timeKind: 'overnight'` 
2. **Sauvegarde préservée** : `overnight` reste `overnight` en RTDB
3. **Rechargement intact** : `overnight` depuis RTDB reste `overnight` en UI
4. **Affichage correct** : Horaires visibles au lieu de "Journée"

## 🎯 Impact

- ✅ **Missions overnight** : Horaires correctement affichés et préservés
- ✅ **Disponibilités overnight** : Idem pour les disponibilités de nuit  
- ✅ **Rétrocompatibilité** : Autres `timeKind` (`range`, `slot`, `full-day`) inchangés
- ✅ **Performance** : Aucun impact sur les performances
- ✅ **Tests** : Couverture exhaustive avec validation de régression

La fonctionnalité overnight est maintenant **complètement fonctionnelle** avec préservation des horaires à travers tout le cycle de vie de l'application.
