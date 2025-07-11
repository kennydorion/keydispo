# Keydispo Planning

Application interne de gestion de disponibilités et planning de placement.

## Démarrage

```bash
# installer les dépendances
yarn install

# lancer le développement
yarn dev
```

L'application est accessible ensuite sur `http://localhost:5173` par défaut.

## Configuration Firebase

Copiez le fichier `.env.example` en `.env` à la racine puis complétez les variables suivantes :

```bash
cp .env.example .env
```

```bash
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Ces valeurs sont disponibles dans la console Firebase pour votre projet. Le fichier `.env` est déjà listé dans `.gitignore`.

## Déploiement

Le projet est conçu pour être déployé sur **Netlify**. Le build s'effectue via `yarn build`.

## Fonctionnement

La page principale affiche le planning multi-jours avec une liste de collaborateurs à gauche et les jours en colonnes avec scroll horizontal. Les modifications sont synchronisées en temps réel via **Firestore**.

Une vue "Par jour" permet de ne voir qu'une seule journée. Le changement de vue se fait via les onglets en haut de page, les filtres restant disponibles.

Aucune authentification n'est requise : l'accès à l'URL suffit.
