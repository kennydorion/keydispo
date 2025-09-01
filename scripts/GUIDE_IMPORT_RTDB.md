# 📋 Guide Complet - Import Excel vers RTDB

Ce guide détaille l'architecture complète d'import Excel vers Firebase Realtime Database (RTDB) qui remplace l'ancien système Firestore.

## 🏗️ Architecture

### Composants principaux:

1. **Interface Web** (`src/features/import/ImportDispos.vue`)
   - Interface utilisateur pour upload et import Excel
   - Utilise `importToRTDBDirect.ts` pour l'import

2. **Service d'import direct** (`src/utils/importToRTDBDirect.ts`)
   - Fonctions d'import vers RTDB
   - Validation et transformation des données
   - Gestion des transactions et chunks

3. **Service central** (`src/services/excelImportRTDBService.ts`)
   - API centralisée pour les imports RTDB
   - Compatible avec le système existant

4. **Script Node.js** (`scripts/import-excel-rtdb.js`)
   - Import par lot via ligne de commande
   - Traitement de gros fichiers Excel

5. **Tests automatisés** (`scripts/test-import-rtdb.js`)
   - Génération de données de test
   - Validation complète du processus

## 📊 Structure des Données RTDB

### Collections principales:

```
/dispos/{tenantId}/{dispoId}
/collaborateurs/{tenantId}/{userId}
/metadata/{tenantId}/lastImport
```

### Format des données:

#### Disponibilité
```json
{
  "tenantId": "string",
  "userId": "string", 
  "nom": "string",
  "prenom": "string",
  "metier": "string",
  "phone": "string",
  "email": "string",
  "ville": "string",
  "date": "YYYY-MM-DD",
  "lieu": "string",
  "heureDebut": "HH:MM",
  "heureFin": "HH:MM",
  "version": 1,
  "updatedAt": "timestamp",
  "updatedBy": "import"
}
```

#### Collaborateur
```json
{
  "nom": "string",
  "prenom": "string", 
  "metier": "string",
  "phone": "string",
  "email": "string",
  "ville": "string",
  "updatedAt": "timestamp",
  "updatedBy": "import"
}
```

## 🔄 Flux de Données

### 1. Parsing Excel
```
Fichier Excel → parseWorkbook() → NormalizedRow[]
```

### 2. Validation
```
NormalizedRow[] → validateImportDataRTDB() → {isValid, errors, warnings}
```

### 3. Transformation
```
NormalizedRow[] → transformToRTDBData() → {collaborateurs[], disponibilites[]}
```

### 4. Import RTDB
```
{collaborateurs[], disponibilites[]} → Firebase RTDB
```

## 🚀 Utilisation

### Interface Web

1. **Accès**: http://localhost:5173/import
2. **Upload**: Glisser-déposer le fichier Excel
3. **Validation**: Vérification automatique des données
4. **Import**: Clic sur "Importer vers RTDB"
5. **Vérification**: Validation des données importées

### Script Node.js

```bash
# Import basique
node scripts/import-excel-rtdb.js fichier.xlsx tenant123

# Import avec options
DEBUG=* node scripts/import-excel-rtdb.js fichier.xlsx tenant123
```

### Service programmatique

```typescript
import { importToRTDB } from '@/utils/importToRTDBDirect'

const result = await importToRTDB(
  normalizedData,
  'tenant123',
  (progress) => console.log(progress)
)
```

## 📋 Format Excel Attendu

### Colonnes obligatoires:
- **Nom**: Nom du collaborateur
- **Prénom**: Prénom du collaborateur  
- **Métier**: Fonction/métier
- **Téléphone**: Numéro de téléphone
- **Email**: Adresse email
- **Ville**: Ville de résidence

### Colonnes de disponibilité:
Format: `DD/MM/YYYY Lieu HH:MM-HH:MM`
Exemple: `15/12/2024 Paris 08:00-17:00`

### Exemple de tableau:

| Nom | Prénom | Métier | Téléphone | Email | Ville | 15/12/2024 Paris 08:00-17:00 | 16/12/2024 Lyon 09:00-18:00 |
|-----|--------|--------|-----------|-------|-------|-------------------------------|------------------------------|
| Martin | Pierre | Technicien | 0123456789 | p.martin@email.com | Paris | X | |
| Durand | Marie | Ingénieur | 0987654321 | m.durand@email.com | Lyon | | X |

## ⚙️ Configuration

### Variables d'environnement:
```env
FIREBASE_PROJECT_ID=keydispo-dev
FIREBASE_DATABASE_URL=http://127.0.0.1:9200?ns=keydispo-dev-default-rtdb
VITE_TENANT_ID=tenant123
```

### Firebase Emulator:
```bash
firebase emulators:start --only database
```

## 🧪 Tests

### Test automatique complet:
```bash
cd scripts
./test-import-rtdb-quick.sh
```

### Test manuel:
```bash
cd scripts
node test-import-rtdb.js
```

### Vérification architecture:
```bash
cd scripts
./verify-rtdb-import-architecture.sh
```

## 📈 Performance

### Optimisations implémentées:

1. **Import par chunks**: 50 enregistrements par transaction
2. **Transactions atomiques**: Consistance des données
3. **Validation préalable**: Évite les erreurs d'import
4. **Nettoyage automatique**: Suppression des valeurs null pour RTDB
5. **Progress tracking**: Suivi en temps réel

### Limites recommandées:
- **Fichiers < 1MB**: Performance optimale
- **Fichiers 1-5MB**: Performance acceptable  
- **Fichiers > 5MB**: À éviter, découper le fichier

## 🔧 Dépannage

### Erreurs communes:

#### "Émulateur RTDB non accessible"
```bash
firebase emulators:start --only database
```

#### "Données non importées"
- Vérifier le format Excel
- Contrôler les logs dans la console
- Valider le format des dates (DD/MM/YYYY)

#### "Erreur de validation"
- Vérifier les colonnes obligatoires
- Contrôler le format des heures (HH:MM)
- Valider les noms de lieux

#### "Service Worker conflicts"
```javascript
// Dans DevTools > Application > Storage
// Clear Storage > Clear site data
```

### Logs de débogage:
```bash
# Mode debug complet
DEBUG=* node scripts/import-excel-rtdb.js fichier.xlsx tenant123

# Logs spécifiques Firebase
DEBUG=firebase:* node scripts/import-excel-rtdb.js fichier.xlsx tenant123
```

### Reset complet:
```bash
# Arrêter les émulateurs
# Supprimer emulator-data/
rm -rf emulator-data/
# Redémarrer les émulateurs
firebase emulators:start --only database
```

## 🔄 Migration depuis Firestore

### Étapes de migration:

1. **Backup des données Firestore**
2. **Configuration RTDB**
3. **Test d'import sur émulateur**
4. **Migration progressive**
5. **Validation complète**

### Script de migration:
```bash
node scripts/migrate-firestore-to-rtdb.js
```

## 📚 API Reference

### `importToRTDB(data, tenantId, onProgress)`

**Paramètres:**
- `data`: NormalizedRow[] - Données Excel parsées
- `tenantId`: string - ID du tenant
- `onProgress`: (progress: ImportProgress) => void - Callback de progression

**Retour:**
```typescript
{
  success: boolean,
  stats: ImportStats,
  message: string
}
```

### `validateImportDataRTDB(data)`

**Paramètres:**
- `data`: NormalizedRow[] - Données à valider

**Retour:**
```typescript
{
  isValid: boolean,
  errors: string[],
  warnings: string[]
}
```

### `transformToRTDBData(data, tenantId)`

**Paramètres:**
- `data`: NormalizedRow[] - Données normalisées
- `tenantId`: string - ID du tenant

**Retour:**
```typescript
{
  collaborateurs: Array<CollaborateurData>,
  disponibilites: Array<DisponibiliteData>
}
```

## 🎯 Roadmap

### Améliorations futures:
- [ ] Import incrémental
- [ ] Gestion des conflits de données
- [ ] Export depuis RTDB vers Excel
- [ ] Interface d'administration avancée
- [ ] Notifications en temps réel
- [ ] Audit trail complet

## 🆘 Support

### En cas de problème:

1. **Vérifiez les logs**: Console DevTools + Terminal
2. **Testez l'émulateur**: http://127.0.0.1:9200/
3. **Consultez la documentation**: Ce guide + README.md
4. **Utilisez les scripts de test**: test-import-rtdb.js

### Fichiers de log:
- Frontend: Console DevTools
- Backend: Terminal Node.js
- Émulateur: firebase-debug.log

---

✅ **Import Excel vers RTDB opérationnel !**

L'architecture complète est en place et testée. L'import Excel pointe maintenant vers RTDB au lieu de Firestore, avec toutes les fonctionnalités avancées (validation, chunks, transactions, progress tracking).
