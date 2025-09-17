# Améliorations du design des pages d'inscription

## Problèmes identifiés
1. **Message incorrect dans l'inscription admin** : Indiquait "viewer par défaut" alors que l'inscription admin crée un compte admin
2. **Design du titre inconsistant** : Les pages d'inscription n'avaient pas la même hiérarchie visuelle que les autres pages

## Corrections apportées

### 1. Register.vue (Inscription Admin)
**Changements :**
- ✅ Titre : "Créer un compte" → "Créer un compte administrateur"
- ✅ Sous-titre : "Les comptes créés ont le rôle viewer par défaut" → "Création d'un compte avec privilèges d'administration"
- ✅ Ajout d'un titre principal "Gestion des disponibilités" dans la section brand
- ✅ Sous-titre dynamique selon le contexte (admin/collaborateur)
- ✅ Amélioration de la hiérarchie visuelle avec des styles cohérents

### 2. CollaborateurRegister.vue (Inscription Collaborateur)
**Changements :**
- ✅ Ajout d'un titre principal "Gestion des disponibilités" dans la section brand
- ✅ Hiérarchie améliorée : Titre principal → Sous-titre spécifique
- ✅ Styles CSS cohérents avec les autres pages d'authentification

### 3. Structure finale pour les deux pages
```
[Logo Key Placement]
Gestion des disponibilités        ← Titre principal (h1, blanc)
[Sous-titre contextuel]           ← Sous-titre (plus petit, gris clair)

[Carte d'inscription/connexion]
```

## Résultat
Les pages d'inscription ont maintenant :
- Un design cohérent avec les autres pages d'authentification
- Des messages précis selon le type de compte créé
- Une hiérarchie visuelle claire et professionnelle
- Une meilleure expérience utilisateur
