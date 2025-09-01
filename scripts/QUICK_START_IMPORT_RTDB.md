# 🚀 Guide de Démarrage Rapide - Import Excel vers RTDB

## Test Rapide (1 minute)

### Option 1: Script automatique
```bash
cd /Users/kennydorion/Sites/keydispo/scripts
./test-import-rtdb-quick.sh
```

### Option 2: Test manuel
```bash
cd /Users/kennydorion/Sites/keydispo/scripts
node test-import-rtdb.js
```

### Option 3: Interface web
1. Ouvrez http://localhost:5173/import
2. Glissez-déposez un fichier Excel
3. Cliquez "Importer vers RTDB"

## Format Excel Attendu

| Nom | Prénom | Métier | Téléphone | Email | Ville | 01/12/2024 Lieu1 08:00-17:00 | 02/12/2024 Lieu2 09:00-18:00 |
|-----|--------|--------|-----------|-------|-------|-------------------------------|-------------------------------|
| Martin | Pierre | Technicien | 0123456789 | p.martin@email.com | Paris | X | |
| Durand | Marie | Ingénieur | 0987654321 | m.durand@email.com | Lyon | | X |

## Vérification des Données RTDB

### Via l'interface web:
- http://localhost:9200/ (Interface Admin RTDB)
- Navigation: `/dispos/{tenantId}/`

### Via l'application:
- http://localhost:5173/planning
- Vérifiez que les créneaux apparaissent dans le calendrier

## Structure RTDB Générée

```json
{
  "dispos": {
    "tenant123": {
      "user123_2024-12-01_lieu1": {
        "tenantId": "tenant123",
        "userId": "user123",
        "nom": "Martin",
        "prenom": "Pierre",
        "date": "2024-12-01",
        "lieu": "Lieu1",
        "heureDebut": "08:00",
        "heureFin": "17:00",
        "version": 1,
        "updatedAt": 1703097600000,
        "updatedBy": "import"
      }
    }
  },
  "collaborateurs": {
    "tenant123": {
      "user123": {
        "nom": "Martin",
        "prenom": "Pierre",
        "metier": "Technicien",
        "phone": "0123456789",
        "email": "p.martin@email.com",
        "ville": "Paris"
      }
    }
  }
}
```

## Dépannage Express

### ❌ "Émulateur RTDB non accessible"
```bash
firebase emulators:start --only database
```

### ❌ "Données non importées"
- Vérifiez le format du fichier Excel
- Contrôlez les logs dans la console
- Format dates: DD/MM/YYYY obligatoire

### ❌ "Erreur dans l'interface web"
- Ouvrez les DevTools (F12)
- Vérifiez l'onglet Console
- Rechargez la page (Ctrl+R)

### ❌ "Service Worker conflicts"
```bash
# Dans les DevTools > Application > Storage
# Clear Storage > Clear site data
```

## Performance

### Fichiers recommandés:
- ✅ < 1MB (excellent)
- ⚠️ 1-5MB (acceptable)
- ❌ > 5MB (à éviter)

### Optimisations automatiques:
- Import par chunks de 50 enregistrements
- Transactions RTDB pour la cohérence
- Validation des données avant import
- Nettoyage automatique des valeurs nulles

## Prochaines Étapes

1. **Testez avec vos données réelles**
   ```bash
   node import-excel-rtdb.js votre-fichier.xlsx tenant123
   ```

2. **Intégrez dans votre workflow**
   - L'interface web est prête à `/import`
   - Les scripts peuvent être automatisés
   - Les données sont synchronisées temps réel

3. **Migration complète**
   - Suivez le guide `GUIDE_IMPORT_RTDB.md`
   - Utilisez `migrationOrchestrator.ts` pour la migration

## Support

### Logs détaillés:
```bash
DEBUG=* node import-excel-rtdb.js fichier.xlsx tenant123
```

### Reset complet:
```bash
# Arrêtez les émulateurs
# Supprimez emulator-data/
# Redémarrez les émulateurs
```

---

🎯 **Objectif atteint**: L'import Excel pointe maintenant vers RTDB au lieu de Firestore !
