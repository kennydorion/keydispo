# Bug v-calendar - dayIndex undefined

## Problème

Erreur JavaScript lors de la sélection de certaines dates dans le DatePicker (v-calendar) :

```
TypeError: Cannot read properties of undefined (reading 'dayIndex')
at DateRangeContext.render (v-calendar.js:4779:35)
```

## Stack Trace Complet

L'erreur se produit dans :
- `DateRangeContext.render()` 
- Lors du clic sur un jour dans le calendrier
- Affecte les dates de 2020 à 2025 de manière aléatoire

## Cause

C'est un **bug connu de la bibliothèque v-calendar** (version actuellement utilisée).

Le problème vient d'un conflit interne entre :
- La gestion des transitions Vue
- Le calcul des index de jours
- La fermeture du popover après sélection

## Solutions Tentées

1. ✅ Ajout validations dates (try/catch)
2. ✅ Contraintes min/max dates (2023-2030)
3. ✅ Gestion timezone explicite
4. ✅ **SOLUTION APPLIQUÉE** : Force l'affichage initial sur l'année courante
5. ❌ Le bug persiste occasionnellement car il est dans le core de v-calendar

## Solution Finale Appliquée (mise à jour)

Depuis le 17/10/2025, nous avons remplacé la dépendance v-calendar par un fork corrigé qui adresse l’erreur `dayIndex` avec Vue 3.5.

Changement effectué dans `package.json` :

```
"v-calendar": "npm:@angelblanco/v-calendar@3.1.3"
```

Références communautaires:
- Issue 1498 (Vue 3.5 - dayIndex): https://github.com/nathanreyes/v-calendar/issues/1498
- Issue 1501 (days[0] undefined): https://github.com/nathanreyes/v-calendar/issues/1501
- Issue 1514 (dayIndex undefined): https://github.com/nathanreyes/v-calendar/issues/1514
- PR 1500 (fix proposé): https://github.com/nathanreyes/v-calendar/pull/1500
- Fork npm: https://www.npmjs.com/package/@angelblanco/v-calendar

Etat actuel:
- ✅ L’erreur ne se reproduit plus lors de la sélection de date avec Vue 3.5.x
- ✅ Aucune rupture d’API (imports inchangés: `import VCalendar from 'v-calendar'` et `import 'v-calendar/style.css'`)
- ✅ Build et typecheck OK

Mitigations conservées par sécurité:
- `:min-date="new Date(2023, 0, 1)"` et `:max-date="new Date(2030, 11, 31)"`
- `:initial-page="{ month: new Date().getMonth() + 1, year: new Date().getFullYear() }"`

## Impact Après Solution

### Option 1 : Mettre à jour v-calendar
```bash
npm update v-calendar@latest
```

### Option 2 : Passer à un autre DatePicker
- VueDatePicker
- Flatpickr
- Input HTML5 natif `<input type="date">`

### Option 3 : Wrapper personnalisé avec error boundary
Créer un composant qui catch l'erreur et recharge le DatePicker

## Impact Après Solution

- ✅ Erreur `dayIndex` corrigée via le fork → plus d’erreurs à la sélection
- ✅ Comportement identique pour l’utilisateur
- ✅ La plage 2023–2030 et l’ouverture sur l’année courante restent actives

## Solutions Additionnelles Possibles

- ⚠️ **Moyen** : L'erreur apparaît dans la console mais le calendrier continue de fonctionner
- La date est quand même sélectionnée correctement
- Pas de crash de l'application
- Juste des logs d'erreur dans la console

## Workaround Temporaire

L'utilisateur peut :
1. Ignorer l'erreur console (la sélection fonctionne)
2. Utiliser le clavier pour naviguer (flèches + Enter)
3. Saisir directement la date si le champ le permet

## Décision

- Nous conservons v-calendar via le fork `@angelblanco/v-calendar@3.1.3`.
- Si le repo officiel publie un correctif, on pourra revenir sur `v-calendar` officiel.
- Alternatives (si besoin): Vue3DatePicker, Flatpickr, composant custom.

## Références

- Issue GitHub v-calendar : https://github.com/nathanreyes/v-calendar/issues
- Alternative VueDatePicker : https://vue3datepicker.com/
- Alternative Flatpickr : https://flatpickr.js.org/

---
Date : 17 octobre 2025
Statut : **Corrigé (via fork)**
Solution : Remplacement par `@angelblanco/v-calendar@3.1.3` + garde-fous min/max + initial-page
