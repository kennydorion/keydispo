# Gestion des Disponibilités - KeyDispo

Application web Vue 3 pour la gestion des disponibilités des collaborateurs avec import Excel, gestion multi-utilisateurs et déploiement Netlify.

## 🔑 Codes d'inscription Collaborateurs (Nouveau)

- Les admins peuvent générer un code lié à un collaborateur depuis la page Détail Collaborateur (section "Code d'inscription collaborateur").
- Le collaborateur utilise ce code lors de l'inscription sur la page /register pour lier son compte à sa fiche.
- Les codes expirent par défaut au bout de 7 jours; ils peuvent être révoqués et régénérés.

## 🎯 État Actuel (13 août 2025)

### ✅ Fonctionnel et Testé
- **Build stable** : 0 erreur TypeScript, tests passants (5/5)
- **Firebase configuré** : Émulateurs Auth + Firestore actifs  
- **Vue Semaine MVP** : Grille de disponibilités fonctionnelle
- **Import Excel** : Script d'import tools/import_dispos.ts opérationnel
- **Données de test** : Script de seed automatique
- **Environnement dev** : Configuration complète avec script de démarrage

### 🔄 En cours / Commenté temporairement
- Composants d'édition (PlanningEquipe, EditModal) - en attente d'adaptation V2
- Interface d'import Excel dans l'app - import fonctionnel en CLI
- Services optimisés V2 - partiellement implémentés

### 🚀 Démarrage Ultra-Simple
```bash
yarn install
npm start    # 🆕 NOUVELLE COMMANDE : Lance Vite + Firebase + persistance !
```

### 🚀 Démarrage Alternatif
```bash
yarn start:dev  # ou ./start-dev.sh (méthode classique avec seeding)
```

**URLs importantes :**
- **Application** : http://localhost:5173
- **Admin Firebase** : http://localhost:4001
- **Vue Semaine** : http://localhost:5173/#/semaine

💾 **Persistance automatique** : Vos données (comptes, dispos) sont sauvegardées automatiquement !

## 🚀 Stack Technique

- **Frontend**: Vue 3 + TypeScript + Vite
- **UI Framework**: Vuestic UI
- **Base de données**: Firebase Firestore (temps réel)
- **Authentification**: Firebase Auth (email/Google)
- **État**: Pinia
- **Router**: Vue Router 4
- **Hébergement**: Netlify
- **Import**: Node.js script avec xlsx

## 🏗️ Architecture

### Multi-tenant
- Données cloisonnées par `tenantId`
- Utilisateurs organisés par tenant avec rôles

### Gestion de version
- Optimistic concurrency avec champ `version`
- Gestion des conflits multi-utilisateurs
- Transactions Firestore pour cohérence

### Temps réel
- Listeners Firestore pour synchronisation
- Présence utilisateur et soft-lock sur édition

## 📋 Fonctionnalités

### ✅ Implémentées
- Structure de base Vue 3 + Vuestic UI
- Services Firebase (Auth + Firestore)
- Store Pinia pour gestion d'état
- Système de routage avec guards
- Service d'import Excel
- Règles de sécurité Firestore
- Configuration déploiement Netlify

### 🚧 À développer
- Interface de gestion des disponibilités
- Vue calendrier interactive
- Filtres avancés et recherche
- Exports CSV/PDF
- Panel d'administration
- Système de présence utilisateur

## 🔧 Installation et Configuration

### 1. Cloner et installer les dépendances

```bash
cd keydispo
npm install
```

### 2. Configuration Firebase

1. Créer un projet Firebase
2. Activer Authentication (Email/Password + Google)
3. Créer une base Firestore
4. Copier `.env.example` vers `.env.local`
5. Remplir les variables Firebase dans `.env.local`

```bash
cp .env.example .env.local
# Éditer .env.local avec vos valeurs Firebase
```

Astuce réseau: si vous voyez des erreurs Firestore "Listen 400 (Bad Request)" dans certains navigateurs (ex: Safari) ou derrière un proxy/antivirus, activez le long-polling forcé:

```
VITE_FORCE_LONG_POLL=1
```

### 3. Déployer les règles Firestore

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser le projet
firebase init firestore

# Déployer les règles et index
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Lancement en développement

```bash
npm run dev
```

## 📊 Import Excel

### Script Node.js

Le script `scripts/import-excel.js` permet d'importer des fichiers Excel vers Firestore.

```bash
cd scripts
npm install

# Configuration
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
export FIREBASE_PROJECT_ID='your-project-id'

# Import
node import-excel.js ../data/disponibilites.xlsx default
```

### Format Excel attendu

- **Colonnes fixes**: N° CT, Nom, Prénom, Métier, Téléphone Mobile, E-mail, Ville
- **Colonnes dynamiques**: Pour chaque date → Lieu, Heure DÉBUT, Heure FIN

## 🚀 Déploiement Netlify

### 1. Configuration du site

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18+

### 2. Variables d'environnement

Dans Netlify > Site settings > Environment variables :

```
VITE_FB_API_KEY=your_api_key
VITE_FB_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FB_PROJECT_ID=your_project_id
VITE_FB_STORAGE_BUCKET=your_project.appspot.com
VITE_FB_MESSAGING_SENDER_ID=your_sender_id
VITE_FB_APP_ID=your_app_id
VITE_TENANT_ID=default
VITE_FB_DATABASE_URL=https://your_project_id-default-rtdb.europe-west1.firebasedatabase.app
VITE_ADMIN_EMAILS=admin@example.com
# Optionnel si besoin face aux proxys/Safari
VITE_FORCE_LONG_POLL=0
```

### 3. Redirections SPA

Le fichier `public/_redirects` est configuré pour gérer le routage SPA.

## 👥 Gestion des Utilisateurs

### Rôles
- **Admin**: Gestion complète + utilisateurs
- **Editor**: Création/modification des disponibilités
- **Viewer**: Lecture seule

### Premier utilisateur admin

```javascript
// Dans la console Firebase, créer manuellement le premier admin
// Collection: tenants/default/users/{uid}
{
  uid: "user-uid-from-auth",
  role: "admin",
  email: "admin@example.com",
  createdAt: new Date(),
  lastAccess: new Date()
}
```

## 🛡️ Sécurité

### Règles Firestore
- Vérification d'authentification
- Contrôle d'accès par tenant et rôle
- Validation des données côté serveur
- Gestion des versions pour éviter les conflits

### Rate Limiting
- Prévu dans les fonctionnalités avancées
- À implémenter côté client et/ou Firebase Functions

## 📱 Modèle de Données

### Collection `dispos`
```typescript
{
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
```

### Collection `tenants/{tenantId}/users/{uid}`
```typescript
{
  uid: string;
  role: 'admin' | 'editor' | 'viewer';
  email: string;
  displayName?: string;
  createdAt: Timestamp;
  lastAccess: Timestamp;
}
```

## 🔄 Workflow de Développement

1. **Développement local** avec émulateurs Firebase
2. **Tests** avec données de test
3. **Deploy preview** automatique sur Netlify (branches)
4. **Production** déployée depuis la branche `main`

## 📝 Todo / Roadmap

### Phase 1 - MVP
- [ ] Interface liste des disponibilités avec édition inline
- [ ] Vue calendrier basique (mois/semaine/jour)
- [ ] Import Excel via interface web
- [ ] Filtres de base (date, collaborateur, lieu)

### Phase 2 - Fonctionnalités avancées
- [ ] Exports CSV/PDF
- [ ] Panel d'administration complet
- [ ] Présence utilisateur temps réel
- [ ] Soft-lock sur édition
- [ ] Historique des modifications

### Phase 3 - Optimisations
- [ ] Rate limiting
- [ ] Audit trail complet
- [ ] Netlify Functions pour exports lourds
- [ ] Optimisations performance

## 🆘 Support

Pour toute question sur l'installation ou l'utilisation :

1. Vérifier la configuration Firebase
2. Consulter les logs de la console navigateur
3. Tester avec les émulateurs Firebase en local
4. Vérifier les règles Firestore et les permissions

## 📄 Licence

MIT - Voir le fichier LICENSE pour plus de détails.
