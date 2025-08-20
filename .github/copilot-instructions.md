# Copilot Instructions - Gestion des Disponibilités

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Contexte du projet

Cette application Vue 3 + TypeScript gère les disponibilités des collaborateurs avec les spécificités suivantes :

### Stack Technique
- **Frontend** : Vue 3 + TypeScript + Vite
- **UI Framework** : Vuestic Admin
- **Base de données** : Firebase Firestore (temps réel)
- **Authentification** : Firebase Auth (email/Google)
- **État** : Pinia
- **Router** : Vue Router 4
- **Hébergement** : Netlify

### Architecture
- **Multi-tenant** : Données cloisonnées par `tenantId`
- **Gestion de version** : Optimistic concurrency avec champ `version`
- **Temps réel** : Listeners Firestore pour synchronisation
- **Rôles** : admin, editor, viewer

### Modèle de données Firestore
```typescript
// Collection: dispos
interface Disponibilite {
  tenantId: string;
  nom: string;
  prenom: string;
  metier: string;
  phone: string;
  email: string;
  ville: string;
  date: string; // YYYY-MM-DD
  lieu: string;
  heure_debut: string; // HH:MM
  heure_fin: string; // HH:MM
  version: number;
  updatedAt: Timestamp;
  updatedBy: string;
}

// Collection: tenants/{tenantId}/users/{uid}
interface TenantUser {
  role: 'admin' | 'editor' | 'viewer';
}
```

### Fonctionnalités clés
1. **Import Excel** : Transformation format Excel → format long Firestore
2. **Édition temps réel** : Optimistic updates avec gestion de conflits
3. **Multi-utilisateurs** : Présence + soft-lock (2 min) sur édition
4. **Filtres avancés** : Date, collaborateur, lieu, statut
5. **Exports** : CSV/PDF des vues filtrées
6. **Calendrier** : Vues mois/semaine/jour

### Conventions de code
- Utiliser la composition API Vue 3
- TypeScript strict
- Nommage en français pour les variables métier
- Nommage en anglais pour les fonctions techniques
- Gestion d'erreur centralisée avec try/catch
- Transactions Firestore pour les updates critiques

### Sécurité
- Règles Firestore strictes par tenant et rôle
- Validation côté client ET serveur
- Rate limiting sur actions sensibles
- Audit trail optionnel

Toujours prioriser la cohérence des données et la gestion des conflits multi-utilisateurs.
