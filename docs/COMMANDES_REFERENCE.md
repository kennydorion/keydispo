# 📚 Référence Complète des Commandes

## 🚀 Démarrage de l'Environnement

### Nouvelles Commandes (Recommandées)

```bash
# 🏆 COMMANDE PRINCIPALE - Ultra-simple
npm start
# Lance automatiquement : Vite + Firebase + persistance

# Alternatives directes
./scripts/start-full-dev.sh    # Version complète avec logs détaillés
./quick-start.sh               # Version minimaliste ultra-rapide
```

### Commandes Classiques

```bash
npm run start:dev              # Méthode originale avec seeding
./start-dev.sh                 # Script original
```

## 🔧 Gestion des Émulateurs

```bash
# Émulateur seul
npm run emulators              # Avec persistance automatique
npm run emulators:persist      # Script dédié avec logs

# Émulateurs sans Vite
firebase emulators:start --import=./emulator-data --export-on-exit
```

## 💾 Gestion de la Persistance

```bash
# État et informations
npm run emu:status             # Voir l'état des données sauvegardées
./scripts/manage-persistence.sh status

# Sauvegarde manuelle
npm run emu:save               # Sauvegarder les données actuelles
./scripts/manage-persistence.sh save

# Nettoyage
npm run emu:clean              # Supprimer toutes les données
./scripts/manage-persistence.sh clean

# Sauvegardes avancées
./scripts/manage-persistence.sh backup    # Créer une sauvegarde horodatée
./scripts/manage-persistence.sh list      # Lister les sauvegardes
```

## 🧪 Tests et Validation

```bash
# Tests de persistance
npm run emu:test               # Tester le système de persistance
./scripts/test-persistence.sh

# Validation de configuration
./scripts/test-npm-start.sh    # Vérifier que tout est configuré
```

## 📊 Développement et Build

```bash
# Développement
npm run dev                    # Vite seul (sans Firebase)
npm run build                  # Build de production
npm run preview                # Prévisualiser le build

# Qualité du code
npm run lint                   # ESLint
npm run test                   # Tests unitaires
```

## 🗃️ Données et Import

```bash
# Seeding et données de test
npm run emu:seed               # Créer des données de test
npx tsx tools/seed-test-data.ts

# Import Excel
npm run import:dry             # Aperçu de l'import CSV
npm run import:run             # Import réel vers émulateur
```

## 🌐 URLs de Développement

| Service | URL | Description |
|---------|-----|-------------|
| **Application Vue** | http://localhost:5173 | Interface utilisateur principale |
| **Firebase UI** | http://localhost:4001 | Interface d'administration Firebase |
| **Auth Emulator** | http://localhost:9099 | Émulateur d'authentification |
| **Firestore Emulator** | http://localhost:8080 | Émulateur de base de données |
| **Database Emulator** | http://localhost:9000 | Émulateur Realtime Database |

## 🔄 Workflow Recommandé

### Démarrage quotidien
```bash
npm start                      # Une seule commande !
```

### Arrêt
```
Ctrl+C                         # Arrêt propre avec sauvegarde auto
```

### Gestion des données
```bash
npm run emu:status             # Vérifier l'état
npm run emu:clean              # Nettoyer si besoin
```

### Dépannage
```bash
pkill -f firebase              # Tuer les processus Firebase
pkill -f vite                  # Tuer les processus Vite
npm start                      # Redémarrer
```

## 💡 Conseils d'Usage

1. **Utilisez `npm start`** pour 99% de vos besoins
2. **Vos données persistent automatiquement** entre les sessions
3. **Ctrl+C arrête tout proprement** avec sauvegarde
4. **`npm run emu:status`** pour vérifier vos données
5. **Les ports sont fixes** - bookmarkez les URLs !

---

✨ **Avec `npm start`, le développement devient ultra-simple !**
