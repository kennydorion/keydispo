#!/bin/bash
# Script pour démarrer l'environnement de développement KeyDispo avec persistance

echo "🚀 Démarrage de l'environnement KeyDispo avec persistance des données..."

# Arrêter les processus existants
echo "🛑 Arrêt des processus existants..."
pkill -f "firebase" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Vérifier si des données de sauvegarde existent
if [ -d "./emulator-data" ] && [ "$(ls -A ./emulator-data)" ]; then
    echo "📦 Données de sauvegarde trouvées, import automatique activé"
    IMPORT_FLAG="--import=./emulator-data"
else
    echo "📂 Aucune donnée de sauvegarde trouvée, démarrage avec données vides"
    IMPORT_FLAG=""
fi

# Démarrer les émulateurs Firebase avec persistance
echo "🔥 Démarrage des émulateurs Firebase avec persistance..."
firebase emulators:start --only firestore,auth,database $IMPORT_FLAG --export-on-exit=./emulator-data &
FIREBASE_PID=$!

# Attendre que les émulateurs soient prêts
echo "⏳ Attente du démarrage des émulateurs..."
sleep 5

# Créer les données de test seulement si pas de données existantes
if [ -z "$IMPORT_FLAG" ]; then
    echo "🌱 Création des données de test..."
    npx tsx tools/seed-test-data.ts || echo "⚠️ Seeding optionnel échoué, continuons..."
else
    echo "✅ Données existantes importées, pas de seeding nécessaire"
fi

# Démarrer le serveur de développement
echo "💻 Démarrage du serveur de développement..."
npm run dev &
VITE_PID=$!

echo ""
echo "✅ Environnement prêt avec persistance activée !"
echo "📱 Application Web: http://localhost:3000"
echo "🔧 Interface Admin Firebase: http://127.0.0.1:4001"
echo "💾 Les données seront automatiquement sauvegardées à l'arrêt"
echo ""
echo "Pour arrêter l'environnement, utilisez Ctrl+C ou:"
echo "  pkill -f 'firebase|vite'"

# Attendre que l'utilisateur termine
wait
