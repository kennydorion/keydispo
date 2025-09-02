# Uniformisation de l'affichage des téléphones suisses

## ✅ Implémentation terminée

### Nouveau service : `src/utils/phoneFormatter.ts`

#### Fonctions disponibles :

1. **`formatSwissPhone(phone: string)`**
   - Formate pour l'affichage selon les standards suisses
   - Exemples :
     - `"0791234567"` → `"079 123 45 67"`
     - `"+41791234567"` → `"+41 79 123 45 67"`
     - `"791234567"` → `"+41 79 123 45 67"`

2. **`normalizeSwissPhone(phone: string)`**
   - Normalise pour le stockage (format international)
   - Exemples :
     - `"0791234567"` → `"+41791234567"`
     - `"079 123 45 67"` → `"+41791234567"`

3. **`validateSwissPhone(phone: string)`**
   - Valide les formats suisses acceptés
   - Accepte : +41XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX (9 chiffres)

4. **`phoneToHref(phone: string)`**
   - Convertit pour les liens `tel:`

### Fichiers modifiés :

#### ✅ `src/views/SemaineVirtualClean.vue`
- Import du service de formatage
- Fonction `formatPhone` mise à jour

#### ✅ `src/components/planning/CollaborateurColumn.vue`
- Import du service de formatage  
- Fonction `formatPhone` mise à jour

#### ✅ `src/views/ListeCollaborateurs.vue`
- Import du service de formatage
- Template personnalisé pour la colonne téléphone
- Styles CSS pour l'affichage (police monospace)

#### ✅ `src/views/ModifierCollaborateur.vue`
- Import des fonctions de validation et normalisation
- Règle de validation `phoneRule` pour le champ téléphone
- Normalisation automatique lors de la sauvegarde

### Formats supportés en entrée :
- `0791234567` (national)
- `+41791234567` (international)
- `791234567` (sans préfixe)
- `079 123 45 67` (avec espaces)
- `+41 79 123 45 67` (international avec espaces)
- `079.123.45.67` (avec points)
- `+41-79-123-45-67` (avec tirets)

### Format de sortie standardisé :
- **Affichage** : `079 123 45 67` ou `+41 79 123 45 67`
- **Stockage** : `+41791234567` (format international normalisé)

### Tests effectués :
- ✅ Formatage correct de tous les formats d'entrée
- ✅ Validation des numéros suisses uniquement
- ✅ Normalisation pour stockage uniforme
- ✅ Gestion des champs vides (optionnels)

## 🎯 Résultat

L'affichage des numéros de téléphone est maintenant uniforme dans toute l'application avec le format suisse standard, tout en permettant une saisie flexible et une validation appropriée.
