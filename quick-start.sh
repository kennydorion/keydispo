#!/bin/bash

# Script ultra-simple pour lancer Vite + Firebase ensemble
# Version rapide sans verbose

echo "🚀 Démarrage Vite + Firebase..."

# Fonction de nettoyage
cleanup() {
    pkill -f "firebase" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Import automatique si données existent
IMPORT_FLAG=""
if [ -d "./emulator-data" ] && [ "$(ls -A ./emulator-data)" ]; then
    IMPORT_FLAG="--import=./emulator-data"
fi

# Lancer Firebase en arrière-plan
firebase emulators:start $IMPORT_FLAG --export-on-exit=./emulator-data &

# Attendre Firebase
sleep 5

# Lancer Vite
npm run dev &

echo "✅ Prêt ! App: http://localhost:5173 | Firebase: http://localhost:4001"
echo "Ctrl+C pour arrêter"

# Attendre
wait
