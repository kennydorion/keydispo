# Test Multi-Utilisateur Réel - Keydispo

## 🎯 Objectif

Tester le système multi-utilisateur avec de vraies sessions utilisateur (plusieurs onglets) au lieu des sessions de test.

## 🔧 Procédure de Test

### Étape 1: Préparer l'environnement
```bash
# S'assurer que le dev server est en cours
npm run dev
```

### Étape 2: Ouvrir plusieurs sessions
1. **Onglet 1** : http://localhost:3001/semaine (utilisateur principal)
2. **Onglet 2** : http://localhost:3001/semaine (session secondaire)
3. **Onglet 3** : http://localhost:3001/semaine (session tertiaire)

### Étape 3: Tester les interactions

#### Test 1: Hover Multi-Utilisateur
1. Dans l'**Onglet 1**, survoler une cellule (ex: amanton-elise, date d'aujourd'hui)
2. Dans l'**Onglet 2**, vérifier que la cellule montre un indicateur de survol
3. Changer de cellule dans l'**Onglet 1**, vérifier la mise à jour dans l'**Onglet 2**

#### Test 2: Verrouillage Multi-Utilisateur
1. Dans l'**Onglet 1**, cliquer sur une cellule pour ouvrir le modal d'édition
2. Dans l'**Onglet 2**, vérifier que la cellule est marquée comme verrouillée (🔒)
3. Dans l'**Onglet 2**, essayer de cliquer sur la même cellule → doit afficher un message de verrouillage
4. Fermer le modal dans l'**Onglet 1**, vérifier que le verrou disparaît dans l'**Onglet 2**

#### Test 3: Indicateurs d'Activité
1. Vérifier que la barre de statut montre le nombre d'utilisateurs connectés
2. Vérifier que les avatars des utilisateurs connectés s'affichent
3. Fermer un onglet, vérifier que le compte d'utilisateurs diminue

### Étape 4: Debug Console

Ouvrir la console F12 dans chaque onglet et vérifier les logs :

```javascript
// Messages attendus
multiUserService.ts:218 📡 Sessions reçues: X session(s)
hybridMultiUserService.ts:492 👥 X sessions actives
hybridMultiUserService.ts:502 📱 X activités actives
SemaineVirtualClean.vue:3377 ⚡ Debounce rapide: Mise à jour survol [nom] [date]
```

### Étape 5: Forcer la Désactivation des Sessions de Test

Si les sessions de test interfèrent encore, les désactiver temporairement :

```javascript
// Dans la console de chaque onglet
window.multiUserMigrationService.debugState()

// Vérifier que les vraies sessions remplacent les sessions de test
```

## ✅ Résultats Attendus

### Interface Visuelle
- [ ] Indicateurs de survol bleus sur les cellules hovérées par d'autres utilisateurs
- [ ] Overlays rouges avec 🔒 sur les cellules verrouillées par d'autres utilisateurs
- [ ] Compteur d'utilisateurs connectés mis à jour en temps réel
- [ ] Avatars des utilisateurs connectés dans la barre de statut

### Logs Console
- [ ] Sessions détectées et comptées correctement
- [ ] Activités de hover trackées en temps réel
- [ ] Verrouillages/déverrouillages loggués
- [ ] Pas d'erreurs Firebase

### Comportement Fonctionnel
- [ ] Impossible d'éditer une cellule verrouillée par un autre utilisateur
- [ ] Message informatif lors de tentative d'édition d'une cellule verrouillée
- [ ] Libération automatique des verrous à la fermeture des modaux
- [ ] Synchronisation en temps réel entre tous les onglets

## 🐛 Problèmes Potentiels

### Problème: Pas d'indicateurs visuels
**Solution**: Vérifier que les styles CSS multi-utilisateur sont bien chargés

### Problème: Sessions de test persistent
**Solution**: Désactiver temporairement `createMultiUserStateFromHybrid()` 

### Problème: Pas de synchronisation
**Solution**: Vérifier les connexions Firebase Realtime Database

## 🔄 Itération

Si les tests échouent :
1. Revenir aux sessions de test avec des collaborateurs réels
2. Debugger les services un par un
3. Ajouter plus de logs pour tracer le problème
4. Tester avec de vraies connexions utilisateur ultérieurement

## 📊 Métriques de Succès

- ✅ **Multi-onglet fonctionnel** : Plusieurs onglets se synchronisent
- ✅ **Hover temps réel** : Les survols s'affichent instantanément
- ✅ **Verrouillage robuste** : Impossible d'éditer les cellules verrouillées
- ✅ **UI responsive** : Les indicateurs apparaissent/disparaissent fluidement
- ✅ **Performance** : Pas de lag notable, mémoire stable
