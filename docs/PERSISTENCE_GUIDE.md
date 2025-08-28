# Guide de Persistance des Données Firebase

Ce guide explique comment maintenir vos données (comptes utilisateurs, données Firestore, etc.) lors des redémarrages de l'émulateur Firebase.

## 🎯 Résumé Rapide

- **Démarrage avec persistance** : `./start-dev.sh`
- **Gérer la persistance** : `./scripts/manage-persistence.sh`
- **Les données sont automatiquement sauvegardées** à l'arrêt de l'émulateur

## 📋 Configuration Automatique

La persistance est maintenant activée par défaut. Votre configuration `firebase.json` inclut :

```json
{
  "emulators": {
    "import": {
      "path": "./emulator-data"
    },
    "export": {
      "path": "./emulator-data"
    }
  }
}
```

## 🚀 Utilisation

### 1. Démarrage Normal (Recommandé)

```bash
./start-dev.sh
```

Ce script :
- ✅ Importe automatiquement les données existantes
- ✅ Démarre tous les services nécessaires
- ✅ Sauvegarde automatiquement à l'arrêt

### 2. Démarrage Manuel de l'Émulateur

```bash
./scripts/start-emulator-persistent.sh
```

### 3. Gestion Avancée

```bash
# Voir l'état des données
./scripts/manage-persistence.sh status

# Sauvegarder manuellement (émulateur en cours)
./scripts/manage-persistence.sh save

# Créer une sauvegarde horodatée
./scripts/manage-persistence.sh backup

# Lister les sauvegardes
./scripts/manage-persistence.sh list

# Nettoyer les données
./scripts/manage-persistence.sh clean
```

## 📁 Structure des Données

```
emulator-data/
├── auth_export/
│   ├── accounts.json      # Comptes utilisateurs
│   └── config.json        # Configuration Auth
├── firestore_export/
│   └── (données Firestore) # Documents et collections
├── database_export/
│   └── (données RTDB)     # Realtime Database
└── firebase-export-metadata.json
```

## 🔄 Workflow Typique

1. **Premier démarrage** :
   ```bash
   ./start-dev.sh
   ```
   → Émulateur démarre vide, vous créez vos données de test

2. **Arrêt** (Ctrl+C) :
   → Données automatiquement sauvegardées dans `./emulator-data`

3. **Redémarrage** :
   ```bash
   ./start-dev.sh
   ```
   → Données automatiquement restaurées ✨

## ⚡ Conseils et Astuces

### Sauvegardes Multiples
Créez des sauvegardes nommées pour différents scenarios :
```bash
./scripts/manage-persistence.sh backup
```

### Nettoyage Rapide
Pour repartir de zéro :
```bash
./scripts/manage-persistence.sh clean
./start-dev.sh
```

### Vérification
Vérifiez toujours l'état de vos données :
```bash
./scripts/manage-persistence.sh status
```

## 🐛 Dépannage

### Données Manquantes Après Redémarrage
1. Vérifiez que l'export s'est bien passé :
   ```bash
   ./scripts/manage-persistence.sh status
   ```

2. Vérifiez les logs de l'émulateur pour des erreurs d'import

### L'Émulateur Ne Démarre Pas
1. Nettoyez les processus existants :
   ```bash
   pkill -f firebase
   ```

2. Redémarrez :
   ```bash
   ./start-dev.sh
   ```

### Corruption de Données
En cas de problème, utilisez une sauvegarde :
```bash
./scripts/manage-persistence.sh list
# Copiez une sauvegarde vers ./emulator-data
cp -r ./backups/emulator-data-YYYYMMDD_HHMMSS/* ./emulator-data/
```

## 📋 Checklist de Vérification

- [ ] `firebase.json` contient les sections `import` et `export`
- [ ] Le dossier `./emulator-data` existe après le premier arrêt
- [ ] Les données sont restaurées au redémarrage
- [ ] Les comptes utilisateurs sont préservés
- [ ] Les collections Firestore sont intactes

## 🔗 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `./start-dev.sh` | Démarrage complet avec persistance |
| `./scripts/start-emulator-persistent.sh` | Émulateur seul avec persistance |
| `./scripts/manage-persistence.sh` | Gestionnaire avancé de persistance |
| `./scripts/save-emulator-data.sh` | Sauvegarde manuelle via API |

---

✅ **Vos données sont maintenant persistantes !** Vous pouvez redémarrer l'émulateur sans perdre vos comptes utilisateurs et données.
