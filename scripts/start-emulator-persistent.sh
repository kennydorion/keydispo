#!/bin/bash

# Script pour démarrer l'émulateur Firebase avec persistance des données
echo "🚀 Démarrage de l'émulateur Firebase avec persistance des données..."

# Vérifier si des données de sauvegarde existent
if [ -d "./emulator-data" ] && [ "$(ls -A ./emulator-data)" ]; then
    echo "📦 Données de sauvegarde trouvées, import automatique activé"
    echo "📊 Contenu à importer :"
    ls -la ./emulator-data/
else
    echo "📂 Aucune donnée de sauvegarde trouvée, démarrage avec données vides"
fi

echo ""
echo "🔧 Démarrage des émulateurs Firebase..."
echo "   - Authentication (port 9199)"
echo "   - Firestore (port 8180)" 
echo "   - Realtime Database (port 9200)"
echo "   - UI des émulateurs (port 4101)"
echo "   - Hub API (port 4400)"
echo ""
echo "💡 Les données seront automatiquement sauvegardées à l'arrêt (Ctrl+C)"
echo ""

# Démarrer l'émulateur avec import automatique et export à l'arrêt
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
