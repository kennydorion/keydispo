# Uniformisation des numéros 00 en +33 (et autres formats internationaux)

## ✅ Implémentation terminée

### Améliorations du service : `src/utils/phoneFormatter.ts`

#### Nouvelles fonctionnalités :

1. **Conversion automatique 00 → +**
   - `0033123456789` → `+33123456789`
   - `0041791234567` → `+41791234567`
   - `0012345678901` → `+12345678901`

2. **Détection intelligente France vs Suisse**
   - **Français** : `01-06, 08-09` → Format `+33`
   - **Suisses** : `07X` → Format `+41`

3. **Formatage d'affichage uniforme**
   - **France** : `01 23 45 67 89` ou `+33 1 23 45 67 89`
   - **Suisse** : `079 123 45 67` ou `+41 79 123 45 67`

4. **Normalisation pour stockage**
   - Tous les numéros stockés au format international : `+33XXXXXXXXX` ou `+41XXXXXXXXX`

### Fonctions mises à jour :

#### ✅ `formatPhone(phone: string)`
- Remplace `formatSwissPhone`
- Support France + Suisse + conversion automatique
- Exemples :
  - `"0033123456789"` → `"+33 1 23 45 67 89"`
  - `"0123456789"` → `"01 23 45 67 89"`
  - `"0791234567"` → `"079 123 45 67"`

#### ✅ `normalizePhone(phone: string)`
- Remplace `normalizeSwissPhone`
- Conversion systématique vers format international
- Exemples :
  - `"0033123456789"` → `"+33123456789"`
  - `"0123456789"` → `"+33123456789"`
  - `"0791234567"` → `"+41791234567"`

#### ✅ `validatePhone(phone: string)`
- Remplace `validateSwissPhone`
- Validation des formats français ET suisses

### Fichiers mis à jour :

#### ✅ `src/views/ModifierCollaborateur.vue`
- Import des nouvelles fonctions
- Validation étendue aux formats français
- Normalisation automatique lors de la sauvegarde

#### ✅ `src/views/ListeCollaborateurs.vue`
- Affichage formaté avec nouvelles règles
- Support des numéros français et suisses

#### ✅ `src/views/SemaineVirtualClean.vue`
- Formatage mis à jour dans le planning

#### ✅ `src/components/planning/CollaborateurColumn.vue`
- Formatage uniforme dans les composants

### Rétrocompatibilité :
- ✅ Alias `formatSwissPhone`, `normalizeSwissPhone`, `validateSwissPhone` maintenus
- ✅ Aucune rupture de l'API existante

### Migration des données :

#### Script `migrate-phone-numbers.js`
```bash
# Aperçu des changements (lecture seule)
node migrate-phone-numbers.js

# Migration effective
node migrate-phone-numbers.js --migrate
```

#### Types de conversions effectuées :
- `0033123456789` → `+33123456789`
- `00.33.1.23.45.67.89` → `+33123456789`
- `0041791234567` → `+41791234567`
- Conservation des numéros déjà normalisés

### Tests réalisés :
- ✅ Conversion 00 → + pour tous les pays
- ✅ Différenciation correcte France/Suisse
- ✅ Formatage d'affichage approprié
- ✅ Validation des formats étendus
- ✅ Normalisation pour stockage uniforme

## 🎯 Résultat

- **Uniformisation complète** : Tous les numéros commençant par "00" sont automatiquement convertis au format international "+XX"
- **Support multi-pays** : France (+33) et Suisse (+41) avec formatage adapté
- **Stockage normalisé** : Format international systématique dans la base de données
- **Affichage cohérent** : Formatage local adapté selon le pays d'origine du numéro

L'application gère maintenant de manière transparente les numéros français et suisses avec conversion automatique des anciens formats "00" ! 🌍📞
