# 🐛 Débogage : Remplacement des missions

## Comment tester le remplacement automatique

1. **Ouvrir la console du navigateur** (F12 -> Console)
2. **Aller sur** http://localhost:3001/
3. **Créer une disponibilité "disponible"** :
   - Cliquer sur une case vide
   - Sélectionner "Disponible" 
   - Sauvegarder
4. **Ajouter une mission sur la même case** :
   - Cliquer sur la case avec la disponibilité
   - Sélectionner "Mission"
   - Remplir le lieu
   - Sauvegarder
5. **Observer les logs dans la console**

## Logs à surveiller

- 🚀 `saveDispos CALLED` - La sauvegarde est déclenchée
- 🔧 `About to call handleAutoReplacementLogic` - Le remplacement va être testé  
- 🚀 `handleAutoReplacementLogic CALLED` - La logique de remplacement démarre
- 🔍 `Existing dispos` - Disponibilités existantes trouvées
- 🔍 `New missions` - Nouvelles missions détectées
- �� `Checking conflict` - Vérification de chaque conflit
- 🔍 `hasTimeConflict` - Test de conflit horaire
- ✅ `Conflicting dispos for mission` - Disponibilités à remplacer trouvées
- 🔄 `Remplacement automatique` - Suppression en cours

## Problèmes possibles

1. **saveDispos pas appelé** → Problème avec le bouton de sauvegarde
2. **handleAutoReplacementLogic pas appelé** → Problème dans saveDispos
3. **Aucune mission détectée** → Problème avec resolveDispoKind
4. **Pas de conflit détecté** → Problème avec hasTimeConflict
5. **Pas de suppression** → Problème avec la suppression RTDB
