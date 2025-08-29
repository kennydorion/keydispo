#!/bin/bash

# 🚀 Démarrage Ultra-Rapide Firebase Emulators
# Ce script optimise le démarrage en évitant l'import des données

echo "⚡ Démarrage ultra-rapide des émulateurs Firebase..."

# 1. Nettoyer les logs
echo "🧹 Nettoyage des logs..."
./clean-logs.sh > /dev/null 2>&1

# 2. Variables d'optimisation maximale
echo "⚙️ Configuration optimisée..."
export FIRESTORE_EMULATOR_LOG_LEVEL=ERROR
export FIREBASE_EMULATOR_LOG_LEVEL=ERROR
export JAVA_OPTS="-Xms512m -Xmx1g -XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:+UseZGC"
export FIREBASE_DEBUG=false

# 3. Arrêter tous les émulateurs existants
echo "🛑 Arrêt des émulateurs existants..."
pkill -f "firebase" > /dev/null 2>&1
sleep 2

# 4. Démarrer sans import/export pour maximum vitesse
echo "🚀 Démarrage sans import de données..."
echo "   ⚡ Mode ultra-rapide activé"
echo "   📊 Logs minimaux (ERROR only)"
echo "   💾 Mémoire JVM optimisée (1GB max)"
echo "   🚫 Pas d'import de données existantes"
echo ""
echo "🌐 L'interface sera disponible sur:"
echo "   • Émulateur UI: http://localhost:4001"
echo "   • Application: http://localhost:3000"
echo ""

# Démarrer uniquement les services essentiels sans import
firebase emulators:start \
  --only firestore,auth,database,ui \
  --project keydispo-ec1ba \
  2>&1 | grep -E "(✅|🚀|⚡|Web Console|emulator)"
