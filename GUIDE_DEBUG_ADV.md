# Guide de Debug pour le Problème ADV

## Contexte

Tu affirmes qu'il devrait y avoir une mission ADV le 15 septembre 2025, mais les filtres montrent 0/82 collaborateurs avec :
- **Lieu** : ADV
- **Statut** : En mission  
- **Date** : 15 sept. - 15 sept.

L'analyse du CSV statique ne montre aucune mission ADV à cette date, mais les données RTDB en temps réel peuvent être différentes.

## Outils de Debug Disponibles

### 1. Fonctions Console Rapides

Une fois l'application chargée, tu peux utiliser ces commandes dans la console du navigateur :

```javascript
// Voir toutes les disponibilités du 15 septembre
debug15()

// Tester spécifiquement les filtres ADV + En mission
debugADV()
```

### 2. Analyse Complète

```javascript
// Analyse détaillée de toutes les dispos du 15 septembre, groupées par lieu
voirToutLe15Septembre()

// Diagnostic complet avec application automatique des filtres
debugADVMission()
```

### 3. Panneau de Debug Visuel

Dans l'app, un panneau de debug est visible en mode développement. Il affiche :
- État des filtres en temps réel
- Statistiques de filtrage
- Options disponibles (lieux, statuts, métiers)
- Exemples de données

## Utilisation Pratique

### Étape 1 : Charger l'application
1. Va sur ton planning (PlanningOptimized)
2. Assure-toi que la page est bien chargée
3. Ouvre la console du navigateur (F12)

### Étape 2 : Analyser les données brutes
```javascript
// Voir TOUTES les données du 15 septembre
debug15()
```

Cela va te montrer :
- Toutes les disponibilités du 15 septembre
- Groupées par lieu
- Avec indication des types
- Correspondances potentielles avec "ADV"

### Étape 3 : Tester les filtres
```javascript
// Appliquer automatiquement tes filtres et voir le résultat
debugADV()
```

Cela va :
1. Appliquer lieu="ADV", statut="En mission", date="15/09/2025"
2. Exécuter la logique de filtrage
3. Montrer le résultat final
4. Diagnostiquer pourquoi ça ne marche pas si besoin

## Scenarios Possibles

### Scénario A : Données Manquantes
Si `debug15()` ne montre aucune dispo ADV le 15/09, alors :
- Les données RTDB correspondent au CSV statique
- Il n'y a vraiment pas de mission ADV ce jour-là
- **Action** : Vérifier la source de tes attentes (autre système ?)

### Scénario B : Données Présentes mais Filtre Incorrect
Si `debug15()` montre des dispos ADV mais `debugADV()` retourne 0 :
- Les données existent mais le filtrage les exclut
- **Causes possibles** :
  - Format du lieu différent ("ADV " vs "adv" vs "Adv")
  - Type de disponibilité incorrect (pas reconnu comme mission)
  - Problème de mapping collaborateur
- **Action** : Regarder les logs détaillés pour voir où ça casse

### Scénario C : Bug de Synchronisation
Si les données apparaissent et disparaissent :
- Problème de synchronisation temps réel
- **Action** : Recharger la page et refaire le test

## Debug Logs Détaillés

Les fonctions ajoutent des logs très détaillés qui te montrent :

```
🚨 [DEBUG ADV] Cas spécial détecté: lieu=ADV + date=15-09-2025
🚨 [DEBUG ADV] Toutes les dispos pour cette date:
🚨 [DEBUG ADV] Dispo 1: { nom: "DUPONT", prenom: "Jean", metier: "AS", lieu: "CLINIQUE", type: "standard" }
🚨 [DEBUG ADV] Dispos avec lieu contenant "ADV" (case insensitive):
🚨 [DEBUG LIEU ADV] Filtrage par lieu "adv" sur 5 dispos
🚨 [DEBUG LIEU ADV] 1. "CLINIQUE" -> "clinique" (match: false)
🚨 [DEBUG LIEU ADV] 2. "ADV" -> "adv" (match: true)
```

## Que Faire Maintenant

1. **Lance `debug15()`** pour voir toutes les données du 15 septembre
2. **Si tu vois des données ADV** → Lance `debugADV()` pour comprendre pourquoi le filtre ne marche pas
3. **Si tu ne vois AUCUNE donnée ADV** → Les données RTDB confirment l'analyse CSV (pas de mission ADV ce jour-là)

## Contact

Si tu trouves des incohérences ou si les outils ne fonctionnent pas, partage-moi :
1. La sortie complète de `debug15()`
2. La sortie complète de `debugADV()` 
3. Une capture d'écran du panneau de debug visuel

Cela me permettra de comprendre exactement ce qui se passe avec tes données en temps réel.
