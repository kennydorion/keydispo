# 💾 Persistance des Données Firebase - Guide Rapide

## ✨ Nouvelles Commandes Disponibles

### Démarrage Complet (Recommandé)
```bash
# 🚀 NOUVELLE COMMANDE : Vite + Firebase ensemble
npm start                    # Lance Vite + Émulateur + persistance
./scripts/start-full-dev.sh   # Script direct
./quick-start.sh             # Version ultra-rapide

# Ancienne méthode (toujours disponible)
npm run start:dev            # Démarrage avec seeding
```

### Via npm (Gestion)
```bash
# Émulateur seul avec persistance
npm run emulators:persist

# Gestion des données
npm run emu:status      # Voir l'état des données
npm run emu:save        # Sauvegarder manuellement
npm run emu:clean       # Nettoyer les données
npm run emu:test        # Tester la persistance
```

### Scripts Directs
```bash
# Démarrage développement complet
./start-dev.sh

# Gestion avancée
./scripts/manage-persistence.sh [commande]
```

## 🎯 Ce Qui a Changé

✅ **Import automatique** : Vos données sont restaurées au démarrage  
✅ **Export automatique** : Vos données sont sauvegardées à l'arrêt (Ctrl+C)  
✅ **Configuration firebase.json** : Import/export configurés  
✅ **Scripts utilitaires** : Gestion complète de la persistance  
✅ **Documentation** : Guide détaillé disponible  

## 🚀 Usage Immédiat

**NOUVELLE MÉTHODE (Ultra-simple) :**
```bash
npm start
```
→ Lance automatiquement Vite + Firebase + persistance ! 🎉

**Méthode classique :**
1. **Démarrez comme d'habitude** :
   ```bash
   ./start-dev.sh
   ```

2. **Travaillez normalement** avec vos données

3. **Arrêtez avec Ctrl+C** → Les données sont automatiquement sauvegardées

4. **Redémarrez** → Vos données sont automatiquement restaurées ! ✨

## 📋 Données Préservées

- 👤 **Comptes utilisateurs** (Auth)
- 📄 **Collections Firestore** (dispos, etc.)
- 🗃️ **Realtime Database** (sessions, présence)
- ⚙️ **Configuration Firebase**

---

✅ **C'est fait !** Vos données ne seront plus perdues lors des redémarrages.
