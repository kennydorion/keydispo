# Guide d'Usage - Gestion des Disponibilités

## 📋 Démarrage Rapide

### Configuration Initiale Firebase

1. **Créer un projet Firebase**
   - Aller sur [console.firebase.google.com](https://console.firebase.google.com)
   - Créer un nouveau projet
   - Activer Google Analytics (optionnel)

2. **Configurer Authentication**
   - Dans Authentication > Sign-in method
   - Activer "Email/Password"
   - Activer "Google" (optionnel)
   - Ajouter vos domaines autorisés (localhost + domaine Netlify)

3. **Configurer Firestore**
   - Créer une base de données Firestore
   - Commencer en mode test (règles mises à jour après)
   - Choisir une région proche

4. **Obtenir la configuration**
   - Project Settings > General > Web apps
   - Copier la configuration Firebase

### Configuration Locale

1. **Variables d'environnement**
```bash
cp .env.example .env.local
```

Modifier `.env.local` avec vos valeurs Firebase :
```bash
VITE_FB_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FB_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FB_PROJECT_ID=your-project-id
VITE_FB_STORAGE_BUCKET=your-project.appspot.com
VITE_FB_MESSAGING_SENDER_ID=123456789012
VITE_FB_APP_ID=1:123456789012:web:xxxxxxxxxxxxxxxxxx
VITE_TENANT_ID=default
```

2. **Déployer les règles Firestore**
```bash
# Installer Firebase CLI globalement
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser le projet (choisir Firestore)
firebase init firestore

# Remplacer les fichiers générés par ceux du projet
cp firestore.rules firestore.rules.backup
cp firestore.indexes.json firestore.indexes.json.backup

# Déployer
firebase deploy --only firestore:rules,firestore:indexes
```

## 👤 Gestion des Utilisateurs

### Créer le Premier Administrateur

Une fois la configuration terminée, créer manuellement le premier utilisateur admin :

1. **S'inscrire via l'interface**
   - Lancer `npm run dev`
   - Créer un compte utilisateur

2. **Promouvoir en admin via Console Firebase**
   - Aller dans Firestore
   - Créer la collection : `tenants/default/users/{uid}`
   - Ajouter le document :
   ```json
   {
     "uid": "l'UID de l'utilisateur depuis Auth",
     "role": "admin",
     "email": "admin@example.com",
     "displayName": "Administrateur",
     "createdAt": "timestamp actuel",
     "lastAccess": "timestamp actuel"
   }
   ```

### Gestion des Rôles

- **Admin** : Peut tout faire + gérer les utilisateurs
- **Editor** : Peut créer/modifier les disponibilités
- **Viewer** : Lecture seule

## 📊 Import de Données Excel

### Format Excel Attendu

Votre fichier Excel doit contenir :

**Colonnes fixes (obligatoires)** :
- N° CT
- Nom
- Prénom
- Métier
- Téléphone Mobile
- E-mail
- Ville

**Colonnes dynamiques par date** :
- Date (format DD/MM/YYYY)
- Lieu
- Heure DÉBUT
- Heure FIN

### Exemple de Structure
```
| N° CT | Nom    | Prénom | Métier | ... | 15/01/2025 | Lieu_15 | Début_15 | Fin_15 | 16/01/2025 | Lieu_16 | ...
|-------|--------|--------|--------|-----|------------|---------|----------|--------|------------|---------|
| 001   | Dupont | Jean   | Tech   | ... | Paris      | 09:00   | 17:00    | Lyon   | 08:00      | ...
```

### Import via Script Node.js

1. **Configuration du script**
```bash
cd scripts
npm install

# Variables d'environnement pour le script
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
export FIREBASE_PROJECT_ID='your-project-id'
```

2. **Obtenir la clé de service account**
   - Firebase Console > Project Settings > Service Accounts
   - Generate new private key
   - Copier tout le contenu JSON

3. **Exécuter l'import**
```bash
node import-excel.js chemin/vers/fichier.xlsx tenant-id
```

### Import via Interface Web (à développer)

L'interface web d'import permettra :
- Upload de fichier Excel
- Prévisualisation des données
- Validation avant import
- Rapport d'import avec erreurs

## 🖥️ Utilisation de l'Interface

### Connexion
- Email/password ou Google
- Redirection automatique selon les permissions

### Navigation
- **Tableau de bord** : Vue d'ensemble et statistiques
- **Liste** : Disponibilités avec filtres et édition
- **Calendrier** : Vue temporelle des disponibilités
- **Import** : Interface d'import Excel (admin/editor)
- **Admin** : Gestion utilisateurs (admin seulement)

### Gestion des Conflits

Quand plusieurs utilisateurs modifient simultanément :
1. Le premier sauvegarde avec succès
2. Le second reçoit un avertissement de conflit
3. Options : Recharger ou fusionner manuellement

### Édition des Disponibilités

1. **Édition inline** dans les tableaux
2. **Sauvegarde automatique** après 2 secondes
3. **Soft-lock** pendant édition (icône "en cours")
4. **Gestion optimiste** des conflits

## 📱 Fonctionnalités Avancées

### Filtres de Recherche
- **Date** : Plage de dates
- **Collaborateur** : Nom/prénom
- **Lieu** : Filtrage par lieu
- **Métier** : Par type de métier
- **Ville** : Par ville

### Exports
- **CSV** : Données filtrées
- **PDF** : Rapport formaté
- **Excel** : Format complet

### Présence Temps Réel
- Voir qui consulte quoi
- Indicateurs d'édition en cours
- Synchronisation automatique

## 🚀 Déploiement Netlify

### Configuration Netlify

1. **Connecter le repository Git**
   - Push du code vers GitHub/GitLab
   - Connecter à Netlify

2. **Paramètres de build**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18+

3. **Variables d'environnement**
   - Copier toutes les variables `VITE_*` depuis `.env.local`
   - Ajouter dans Site settings > Environment variables

4. **Déploiement**
   - Push vers `main` = déploiement auto
   - Branches = preview deployments

### Domaine Personnalisé

1. Acheter un domaine
2. Netlify > Domain management
3. Configurer DNS
4. SSL automatique

## 🔧 Maintenance

### Monitoring
- Logs Netlify pour erreurs build
- Firebase Console pour usage base
- Analytics Firebase (si activé)

### Sauvegardes
- Export régulier des données Firestore
- Versioning du code via Git

### Mises à Jour
- Dépendances : `npm update`
- Firebase : Suivre les breaking changes
- Vuestic UI : Changelog

## ❓ Dépannage

### Erreurs Courantes

**"Permission denied"**
- Vérifier les règles Firestore
- Vérifier le rôle utilisateur
- Vérifier l'authentification

**"Failed to import modules"**
- Vérifier les variables d'environnement
- Rebuild complet : `rm -rf node_modules && npm install`

**"Firebase configuration error"**
- Vérifier `.env.local`
- Vérifier que le projet Firebase existe
- Vérifier la configuration web app

### Logs et Debugging

**En développement** :
```bash
# Logs détaillés
npm run dev -- --debug

# Émulateurs Firebase
firebase emulators:start
```

**En production** :
- Console navigateur F12
- Netlify Function logs
- Firebase Console > Usage

## 📞 Support

En cas de problème :
1. Consulter cette documentation
2. Vérifier les logs de la console
3. Tester en local avec émulateurs
4. Vérifier la configuration Firebase
