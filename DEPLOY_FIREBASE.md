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
