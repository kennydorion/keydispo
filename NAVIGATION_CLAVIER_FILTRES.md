# Navigation au Clavier dans les Filtres

## Fonctionnalité Ajoutée

La liste déroulante de recherche des collaborateurs supporte maintenant la navigation complète au clavier pour une meilleure accessibilité et expérience utilisateur.

## Touches de Navigation

### Flèche Bas (↓)
- Descend dans la liste des suggestions
- La première pression sélectionne la première suggestion
- Les pressions suivantes descendent d'une suggestion à la fois
- S'arrête à la dernière suggestion

### Flèche Haut (↑)
- Remonte dans la liste des suggestions
- La première pression depuis le bas remonte d'une suggestion
- Remonter au-dessus de la première suggestion désélectionne tout (-1)

### Entrée (Enter)
- Sélectionne la suggestion actuellement mise en surbrillance
- Applique le filtre et ferme la liste déroulante
- Si aucune suggestion n'est sélectionnée, ne fait rien

### Échap (Escape)
- Ferme la liste déroulante des suggestions
- Réinitialise l'index de sélection
- Conserve le texte saisi dans le champ de recherche

## Indications Visuelles

### Suggestion Sélectionnée au Clavier
- **Fond bleu clair** : `background: #eef2ff`
- **Bordure gauche bleue** : `border-left: 3px solid #667eea`
- Différent du simple survol (fond gris très clair)

### Suggestion Survolée à la Souris
- **Fond gris clair** : `background: #f8fafc`

## Comportement

1. **Lors de la saisie** : L'index de sélection est réinitialisé à -1
2. **Lors du focus** : L'index est réinitialisé à -1
3. **Lors du blur** : Délai de 200ms avant fermeture pour permettre le clic
4. **Navigation mixte** : La souris et le clavier peuvent être utilisés ensemble

## Accessibilité (ARIA)

- `role="listbox"` sur le conteneur de suggestions
- `role="option"` sur chaque suggestion
- `aria-selected="true/false"` selon l'index sélectionné
- `aria-label` descriptifs pour les assistants vocaux
- `tabindex="0"` sur chaque suggestion pour la navigation au clavier

## Compatibilité

- ✅ Desktop (navigation au clavier complète)
- ✅ Mobile (tactile + clavier externe si disponible)
- ✅ Lecteurs d'écran (annotations ARIA complètes)

## Fichiers Modifiés

- `src/components/FiltersHeaderCompact.vue`
  - Ajout de `selectedSuggestionIndex` (état réactif)
  - Ajout de `handleSearchKeydown()` (gestionnaire de touches)
  - Mise à jour des gestionnaires blur/focus/input
  - Ajout de la classe `suggestion-selected` dynamique
  - Styles CSS pour l'état sélectionné

## Tests Suggérés

1. Taper du texte → les suggestions apparaissent
2. Appuyer sur ↓ → la première suggestion est surlignée en bleu
3. Appuyer sur ↓ plusieurs fois → descendre dans la liste
4. Appuyer sur ↑ → remonter dans la liste
5. Appuyer sur Enter → la suggestion est appliquée
6. Appuyer sur Escape → la liste se ferme
7. Utiliser la souris ET le clavier → les deux fonctionnent ensemble

## Notes de Développement

- L'index `-1` signifie "aucune suggestion sélectionnée"
- Le délai de 200ms au blur évite de fermer avant un clic
- La classe CSS `.suggestion-selected` a priorité sur `:hover`
- Tous les événements clavier utilisent `e.preventDefault()` pour éviter les comportements par défaut
