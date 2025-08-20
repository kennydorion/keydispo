# Déploiement Firebase Hosting

Ce projet est prêt pour être déployé sur Firebase Hosting (SPA Vite).

## Prérequis
- Node 20.x
- Firebase CLI (installée via devDependencies)
- Un projet Firebase existant (Project ID)

## Config locale
1) Définir le projet par défaut dans `.firebaserc`:

```
{
  "projects": { "default": "<your-project-id>" }
}
```

2) Variables d’environnement Vite (prod):
- VITE_FB_API_KEY
- VITE_FB_AUTH_DOMAIN
- VITE_FB_PROJECT_ID
- VITE_FB_STORAGE_BUCKET
- VITE_FB_MESSAGING_SENDER_ID
- VITE_FB_APP_ID

En dev, vous pouvez utiliser les émulateurs avec `VITE_USE_EMULATOR=1`.

## Build & Déploiement
1) Build de l’app:

```
yarn build
```

2) Déploiement Hosting:

```
npx firebase deploy --only hosting
```

Le site sert le dossier `dist` avec rewrite SPA vers `/index.html`.

## Notes
- Les règles Firestore et indexes sont versionnés et peuvent être déployés via:

```
npx firebase deploy --only firestore:rules,firestore:indexes
```

- Pour utiliser l’émulateur local:

```
yarn emulators
```

- Netlify reste possible; ce guide couvre uniquement Firebase Hosting.

---

## CI/CD GitHub Actions et erreurs 403 sur les règles

Si le déploiement des règles Firestore échoue avec `HTTP Error: 403, The caller does not have permission`, voici la marche à suivre.

### 1) Compte de service et secret GitHub
- Générez une clé JSON pour le compte de service (Console GCP > IAM & Admin > Comptes de service > firebase-adminsdk-...)
- Stockez le contenu JSON complet dans le secret GitHub `FIREBASE_SERVICE_ACCOUNT`
- Ne jamais committer la clé; rotate immédiatement toute clé exposée

### 2) Rôles IAM requis
Attribuez au compte de service l’un de ces ensembles de rôles:
- Option simple: `Firebase Admin (roles/firebase.admin)`
- Option granulaire:
  - `Firebase Rules Admin (roles/firebaserules.admin)`
  - `Cloud Datastore Admin (roles/datastore.admin)`
  - `Viewer (roles/viewer)`

### 3) APIs à activer
- Cloud Firestore API
- Firebase Rules API
- Firebase Hosting API

### 4) Workflow CI
Le workflow `.github/workflows/firebase-hosting.yml`:
- Authentifie via `google-github-actions/auth@v2` avec `FIREBASE_SERVICE_ACCOUNT`
- Installe `firebase-tools`
- Déploie les règles Firestore (avec `continue-on-error` pour ne pas bloquer Hosting)
- Déploie Hosting (channel `live`)

Alternative d’auth pour les règles (si IAM verrouillé)
- Générez un token CLI: `firebase login:ci` (depuis un compte ayant accès au projet)
- Ajoutez le secret GitHub `FIREBASE_CI_TOKEN` avec ce token
- Le workflow utilisera ce token pour `firebase deploy --only firestore:rules`

### 5) Fallback manuel
Dans la console Firebase > Firestore > Rules, collez le contenu du fichier `firestore.rules` de ce repo puis `Publish`.

### 6) Variables d’env et rôles applicatifs
- `VITE_USE_EMULATOR=0` en prod (géré dans la CI)
- `VITE_FB_*` et `VITE_TENANT_ID` définis en secrets
- Optionnel: `VITE_ADMIN_EMAILS` (emails séparés par des virgules) pour auto-attribuer le rôle admin à la première connexion

### 7) Dépannage
- 403 sur règles: rôles IAM ou APIs manquants
- `auth/invalid-api-key`: secrets `VITE_FB_*` absents/incorrects
- Emulateurs en prod: rebuild avec `VITE_USE_EMULATOR=0` et vider le cache
