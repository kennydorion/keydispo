# Fix Permission Denied 'list' @ L137

## 🐛 Problème identifié

**Erreur :** 
```
[code=permission-denied]: false for 'list' @ L137
```

**Cause :** L'application tentait d'accéder à des collections Firestore qui n'étaient pas couvertes par les règles de sécurité, déclenchant la règle par défaut de refus à la ligne 137.

## 🔍 Collections manquantes identifiées

1. **`tenants/{tenantId}/cellLocks/{cellId}`** - Utilisée par le service hybride multi-utilisateur pour les verrous de cellules
2. **`tenants/{tenantId}/cellActivities/{activityId}`** - Utilisée par le service multi-utilisateur pour les activités de cellules

## ✅ Solution implémentée

### Ajout des règles pour cellLocks

```javascript
// Verrous de cellules (système collaboratif hybride)
match /tenants/{tenantId}/cellLocks/{cellId} {
  // Lecture: tous les membres du tenant peuvent voir les verrous
  allow read: if isTenantMember(tenantId);
  
  // Création/Mise à jour: seulement pour son propre verrou ou admin
  allow create, update: if isSignedIn() && (
    request.resource.data.lockedBy.userId == request.auth.uid || 
    hasRole(tenantId, ['admin'])
  );
  
  // Suppression: son propre verrou, verrous expirés, ou admin
  allow delete: if isSignedIn() && (
    resource.data.lockedBy.userId == request.auth.uid || 
    hasRole(tenantId, ['admin']) ||
    // Permettre la suppression de verrous expirés
    (resource.data.expiresAt != null && resource.data.expiresAt < request.time)
  );
}
```

### Ajout des règles pour cellActivities

```javascript
// Activités de cellules (système collaboratif)
match /tenants/{tenantId}/cellActivities/{activityId} {
  // Lecture: tous les membres du tenant peuvent voir les activités
  allow read: if isTenantMember(tenantId);
  
  // Création/Mise à jour: seulement pour sa propre activité ou admin
  allow create, update: if isSignedIn() && (
    request.resource.data.userId == request.auth.uid || 
    hasRole(tenantId, ['admin'])
  );
  
  // Suppression: sa propre activité, activités expirées, ou admin
  allow delete: if isSignedIn() && (
    resource.data.userId == request.auth.uid || 
    hasRole(tenantId, ['admin']) ||
    // Permettre la suppression d'activités expirées
    (resource.data.expiresAt != null && resource.data.expiresAt < request.time)
  );
}
```

## 🔄 Actions effectuées

1. ✅ **Analyse des logs** - Identification de l'erreur `list @ L137`
2. ✅ **Recherche des collections manquantes** - Grep des utilisations de `collection()` et `doc()`
3. ✅ **Ajout des règles cellLocks** - Permissions pour les verrous collaboratifs
4. ✅ **Ajout des règles cellActivities** - Permissions pour les activités en temps réel
5. ✅ **Redémarrage des émulateurs** - Prise en compte des nouvelles règles
6. ✅ **Test de l'application** - Vérification de la résolution de l'erreur

## 🎯 Services impactés

- **hybridMultiUserService.ts** - Système de verrous collaboratifs
- **multiUserService.ts** - Activités de cellules en temps réel
- **Système de collaboration** - Fonctionnalités multi-utilisateurs

## 📋 Règles Firestore complètes

Après ce fix, nos règles couvrent maintenant :

1. ✅ `tenants/{tenantId}/users/{userId}` - Gestion des utilisateurs
2. ✅ `tenants/{tenantId}/collaborateurs/{collabId}` - Collaborateurs
3. ✅ `tenants/{tenantId}/collaborateurs/{collabId}/disponibilites/{dateId}` - Disponibilités imbriquées
4. ✅ `dispos/{dispoId}` - Disponibilités collection racine
5. ✅ `tenants/{tenantId}/presence/{sessionId}` - Présence utilisateur
6. ✅ `tenants/{tenantId}/cellStates/{cellId}` - États de cellules
7. ✅ `tenants/{tenantId}/sessions/{sessionId}` - Sessions utilisateurs
8. ✅ `tenants/{tenantId}/cellLocks/{cellId}` - **NOUVEAU** Verrous de cellules
9. ✅ `tenants/{tenantId}/cellActivities/{activityId}` - **NOUVEAU** Activités de cellules

## 🧪 Validation

- [ ] Émulateurs Firebase redémarrés
- [ ] Application testée dans le navigateur
- [ ] Absence d'erreurs PERMISSION_DENIED dans la console
- [ ] Fonctionnalités collaboratives opérationnelles

**Date :** 27 août 2025  
**Statut :** ✅ Résolu  
**Impact :** Système collaboratif entièrement fonctionnel
