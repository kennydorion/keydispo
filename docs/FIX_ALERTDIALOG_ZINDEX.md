# Fix AlertDialog Z-Index - Toasts Cachés

## 🐛 Problème

Les alertdialogs/toasts (notifications) générés par `useToast` de Vuestic UI étaient cachés derrière d'autres éléments de l'interface.

## 🔍 Cause Identifiée

1. **Conflit z-index** : Plusieurs éléments avaient des z-index élevés (10000) qui masquaient les toasts
2. **Éléments concernés** :
   - `.lieu-combobox .cbx-list` : z-index 10000
   - `.va-select-dropdown__content` : z-index 10000
   - Autres dropdowns et modals avec z-index variables

## ✅ Solution Implémentée

### 1. Z-Index Hiérarchie Réorganisée

```css
/* Hiérarchie des z-index */
- Toasts/Notifications : 2147483648-2147483649 (niveau le plus haut)
- Modals principales : 2147483647
- Dropdowns/Combobox : 2000 (abaissé de 10000)
- Navigation/UI : 1000-1600
- Contenu planning : 100-400
```

### 2. Règles CSS Ajoutées

#### Toasts et Notifications (Priorité Absolue)
```css
.va-toast,
.va-toast__content,
.va-toast__group,
.va-toast__container,
.va-toasts-container,
.va-notification,
[class*="va-toast"],
[role="alertdialog"],
[role="alert"] {
  z-index: 2147483648 !important;
  position: fixed !important;
  pointer-events: auto !important;
  visibility: visible !important;
  opacity: 1 !important;
}
```

#### Toasts Attachés au Body (Maximum)
```css
body > .va-toast,
body > .va-toasts-container,
body > [class*="va-toast"] {
  z-index: 2147483649 !important;
}
```

### 3. Z-Index Réduits pour Éviter Conflits

#### Dropdowns et Combobox
```css
/* AVANT */
.va-select-dropdown__content { z-index: 10000 !important; }
.lieu-combobox .cbx-list { z-index: 10000 !important; }

/* APRÈS */
.va-select-dropdown__content { z-index: 2000 !important; }
.lieu-combobox .cbx-list { z-index: 2000 !important; }
```

## 🎯 Éléments Ciblés

### Toasts Vuestic UI
- ✅ `.va-toast` - Conteneur principal des toasts
- ✅ `.va-toasts-container` - Conteneur global
- ✅ `[class*="va-toast"]` - Toutes classes contenant "va-toast"
- ✅ `[data-va-toast]` - Attributs de données Vuestic

### Alertdialogs Génériques
- ✅ `[role="alertdialog"]` - ARIA alertdialog standard
- ✅ `[role="alert"]` - ARIA alert standard
- ✅ `.va-alert-dialog` - Alertdialogs Vuestic spécifiques

### Notifications Multi-Utilisateur
- ✅ Service `multiUserNotificationService.ts` utilisant `useToast`
- ✅ Notifications de connexion/déconnexion utilisateurs
- ✅ Alertes d'activité collaborative

## 🔧 Code Modifié

### Fichier : `src/style.css`

**Ajouts :**
- Section complète pour toasts/notifications z-index
- Règles de fallback pour différents types d'alertdialogs
- Force position fixed et visibilité

**Modifications :**
- Réduction z-index dropdowns : 10000 → 2000
- Réduction z-index combobox : 10000 → 2000

## 🧪 Test de Validation

### Actions à Tester
1. **Déclencher une notification** :
   - Connexion/déconnexion d'un utilisateur
   - Action collaborative (hover cellule, lock/unlock)
   - Notification système

2. **Vérifier position** :
   - Toast visible en top-right
   - Au-dessus de tous les autres éléments
   - Pas masqué par dropdowns ou modals

3. **Interactions** :
   - Cliquable/dismissible
   - Animation d'apparition fluide
   - Durée d'affichage respectée (3000ms par défaut)

### Code de Test

```javascript
// Dans la console navigateur pour tester
import { useToast } from 'vuestic-ui'
const toast = useToast()

toast.notify({
  message: 'Test z-index fix',
  color: 'success',
  duration: 5000,
  position: 'top-right'
})
```

## 📊 Hiérarchie Z-Index Finale

```
2147483649 - Toasts attachés au body (maximum absolu)
2147483648 - Toasts/Notifications/AlertDialogs (très haut)
2147483647 - Modals principales et dropdowns dans modals
2147483646 - Modal overlays (désactivés mais référencés)
     2000 - Dropdowns standards et combobox
     1600 - User menu TopNav
     1000 - Navigation principale
      400 - Éléments planning en survol
      150 - Headers sticky planning
      100 - AppRouter de base
```

## ✅ Résultat Attendu

- ✅ **Toasts toujours visibles** au-dessus de tous les éléments
- ✅ **Pas de conflit** avec dropdowns ou modals
- ✅ **UX améliorée** pour notifications collaboratives
- ✅ **Cohérence visuelle** maintenue

## 🔮 Prévention Future

### Bonnes Pratiques Z-Index
1. **Utiliser des variables CSS** pour z-index centralisés
2. **Documenter la hiérarchie** dans commentaires
3. **Tester systématiquement** les nouveaux composants avec overlays
4. **Éviter z-index > 10000** sauf cas extrêmes (toasts/notifications)

### Points de Vigilance
- Nouveaux composants dropdown/modal
- Composants tiers avec z-index élevés
- Toasts custom ou bibliothèques alternatives
- Tests sur différents navigateurs/tailles d'écran

---

**Statut :** ✅ **Implémenté et Prêt à Tester**  
**Impact :** 🔧 Amélioration UX - Notifications visibles  
**Fichiers Modifiés :** `src/style.css`  
**Tests Requis :** ✋ Validation manuelle des toasts
