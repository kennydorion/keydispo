# 📊 Guide d'Import Excel vers RTDB

## Présentation

Ce guide explique comment utiliser la nouvelle fonctionnalité d'import Excel vers Firebase Realtime Database (RTDB) dans le cadre de la migration architecturale.

## 🎯 Objectifs de la Migration

- **Réduction des coûts** : RTDB plus économique que Firestore pour les lectures fréquentes
- **Performance** : Temps réel natif pour la collaboration multi-utilisateur  
- **Simplicité** : Structure de données plus simple et optimisée

## 🔧 Options d'Import Disponibles

### 1. Interface Web (Recommandé)

**URL** : `http://localhost:5173/import` ou `/import` en production

**Avantages** :
- Interface graphique intuitive
- Validation en temps réel
- Aperçu avant import
- Gestion d'erreurs visuelle
- Suivi de progression

**Utilisation** :
1. Sélectionner votre fichier Excel (.xlsx/.xls)
2. Analyser et valider les données
3. Importer vers RTDB
4. Vérifier les données importées

### 2. Script Node.js

**Fichier** : `scripts/import-excel-rtdb.js`

**Avantages** :
- Import en lot pour gros fichiers
- Intégration CI/CD possible
- Logs détaillés
- Gestion d'erreurs robuste

**Installation** :
```bash
cd scripts
npm install
```

**Configuration** :
```bash
# Variables d'environnement requises
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
export FIREBASE_PROJECT_ID='keydispo-dev'
export FIREBASE_DATABASE_URL='https://keydispo-dev-default-rtdb.firebaseio.com'
```

**Utilisation** :
```bash
# Import basique
node import-excel-rtdb.js ../data/planning.xlsx

# Avec tenant spécifique  
node import-excel-rtdb.js ../data/planning.xlsx keydispo-tenant-01
```

## 📁 Format Excel Attendu

### Colonnes Fixes (Obligatoires)
- **N° CT / Nom** : Nom de famille
- **Prénom** : Prénom du collaborateur
- **Métier** : Fonction/poste
- **Téléphone Mobile** : Numéro de téléphone
- **E-mail** : Adresse email
- **Ville** : Ville de résidence

### Colonnes Dynamiques (Par Date)
Pour chaque date (format DD/MM/YYYY) :
- **Lieu** : Lieu de mission/disponibilité
- **Heure DÉBUT** : Heure de début (format HH:MM)
- **Heure FIN** : Heure de fin (format HH:MM)

### Exemple de Structure
```
| Nom    | Prénom | Métier     | Téléphone  | E-mail        | Ville | 15/01/2024 | Lieu    | Heure DÉBUT | Heure FIN |
|--------|--------|------------|------------|---------------|-------|------------|---------|-------------|-----------|
| Dupont | Jean   | Développeur| 0123456789 | jean@test.com | Paris | ✓          | Défense | 09:00       | 17:00     |
```

## 🏗️ Structure RTDB Générée

```json
{
  "tenants": {
    "keydispo": {
      "collaborateurs": {
        "dupont_jean": {
          "id": "dupont_jean",
          "nom": "Dupont",
          "prenom": "Jean",
          "metier": "Développeur",
          "email": "jean@test.com",
          "phone": "0123456789",
          "ville": "Paris",
          "tenantId": "keydispo",
          "createdAt": { ".sv": "timestamp" },
          "updatedAt": { ".sv": "timestamp" }
        }
      },
      "disponibilites": {
        "2024-01-15": {
          "dupont_jean_2024-01-15_09:00": {
            "id": "dupont_jean_2024-01-15_09:00",
            "collaborateurId": "dupont_jean",
            "date": "2024-01-15",
            "lieu": "Défense",
            "heure_debut": "09:00",
            "heure_fin": "17:00",
            "version": 1,
            "tenantId": "keydispo",
            "createdAt": { ".sv": "timestamp" },
            "updatedAt": { ".sv": "timestamp" }
          }
        }
      },
      "metadata": {
        "lastImport": {
          "timestamp": { ".sv": "timestamp" },
          "source": "import-rtdb",
          "stats": {
            "collaborateurs": 1,
            "disponibilites": 1
          }
        }
      }
    }
  }
}
```

## ✨ Fonctionnalités Avancées

### Gestion des Conflits
- **Collaborateurs** : Merge automatique des données manquantes
- **Disponibilités** : Incrément de version pour les modifications
- **Transactions** : Cohérence garantie par les transactions RTDB

### Optimisations Performances
- **Chunking** : Import par petits lots (50 collaborateurs, 30 disponibilités)
- **Groupement par date** : Optimisation des transactions RTDB
- **Délais adaptés** : Respect des limites Firebase

### Validation Avancée
- **Format dates** : Détection automatique DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
- **Heures** : Support HH:MM et format décimal (9.5 = 9h30)
- **IDs sécurisés** : Génération d'IDs compatibles RTDB (a-zA-Z0-9_-)

## 🧪 Test et Debug

### Mode Émulateur
```bash
# Démarrer les émulateurs Firebase
firebase emulators:start --only database,auth

# Variables pour émulateur
export FIREBASE_DATABASE_URL="http://127.0.0.1:9200?ns=keydispo-dev-default-rtdb"
export FIREBASE_PROJECT_ID="keydispo-dev"
```

### Validation des Données
```bash
# Vérifier les données importées
firebase database:get / --project keydispo-dev

# Statistiques d'import
firebase database:get /tenants/keydispo/metadata/lastImport --project keydispo-dev
```

### Logs Détaillés
Les scripts affichent des logs détaillés :
- 📊 Statistiques de parsing
- 📅 Progression par date
- ✅ Confirmations d'import
- ❌ Erreurs avec contexte

## 🚨 Résolution de Problèmes

### Erreurs Communes

**1. Index not defined**
- **Cause** : Règles RTDB manquantes
- **Solution** : Redémarrer les émulateurs ou vérifier `database.rules.json`

**2. Permission denied**
- **Cause** : Configuration Firebase Auth incorrecte
- **Solution** : Vérifier les clés de service et permissions

**3. Données manquantes**
- **Cause** : Format Excel non reconnu
- **Solution** : Vérifier les en-têtes de colonnes et formats de dates

### Debug Avancé

**Interface Web** :
```javascript
// Console navigateur
console.log(window.excelImportRTDBService.getStats())
```

**Script Node.js** :
```bash
# Logs détaillés
DEBUG=* node import-excel-rtdb.js fichier.xlsx

# Test sans import réel
DRY_RUN=1 node import-excel-rtdb.js fichier.xlsx
```

## 🔄 Migration depuis Firestore

### Comparaison des Services

| Fonctionnalité | Firestore | RTDB |
|----------------|-----------|------|
| Structure | Collections/Documents | Arbre JSON |
| Requêtes | Queries complexes | Paths + Filters |
| Prix | Par lecture/écriture | Par bande passante |
| Temps réel | Snapshots | Listeners natifs |
| Offline | Support avancé | Support basique |

### Avantages RTDB pour l'Import

1. **Coût** : Plus économique pour les imports fréquents
2. **Structure simple** : Pas de collections imbriquées
3. **Transactions** : Plus rapides sur une seule base
4. **Réplication** : Synchronisation temps réel optimisée

## 📈 Performances et Limites

### Limites RTDB
- **Taille max** : 1GB par base
- **Connexions simultanées** : 200,000
- **Opérations/seconde** : 1000 par chemin

### Optimisations Appliquées
- **Chunking intelligent** : Évite les timeouts
- **Transactions groupées** : Cohérence par date
- **Index optimisés** : Requêtes rapides par collaborateur/date

### Métriques Typiques
- **Collaborateurs** : ~50/batch, ~200ms par batch
- **Disponibilités** : ~30/batch par date, ~150ms par batch
- **Import complet 1000 lignes** : ~30-60 secondes

## 🎯 Bonnes Pratiques

### Préparation des Données
1. **Vérifier le format Excel** avant import
2. **Nettoyer les données** (espaces, caractères spéciaux)
3. **Tester sur petit échantillon** d'abord

### Monitoring
1. **Surveiller les logs** d'import en temps réel
2. **Vérifier les métriques** dans Firebase Console
3. **Tester l'affichage** dans l'interface après import

### Sécurité
1. **Variables d'environnement** pour les clés sensibles
2. **Validation côté client** avant envoi
3. **Sauvegarde** des données avant gros imports

---

## 🚀 Prochaines Évolutions

- **Import incrémental** : Mise à jour seulement des changements
- **Import multi-formats** : Support CSV, ODS
- **Validation avancée** : Règles métier personnalisées
- **API REST** : Import programmatique via API
- **Synchronisation bidirectionnelle** : RTDB ↔ Excel

---

*Ce guide est maintenu à jour avec les dernières évolutions de l'architecture RTDB.*
