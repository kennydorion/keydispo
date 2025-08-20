#!/bin/bash
# Script pour démarrer l'environnement de développement KeyDispo

echo "🚀 Démarrage de l'environnement KeyDispo..."

# Arrêter les processus existants
echo "🛑 Arrêt des processus existants..."
pkill -f "firebase" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Démarrer les émulateurs Firebase
echo "🔥 Démarrage des émulateurs Firebase..."
firebase emulators:start --only firestore,auth &
FIREBASE_PID=$!

# Attendre que les émulateurs soient prêts
echo "⏳ Attente du démarrage des émulateurs..."
sleep 5

# Créer les données de test
echo "🌱 Création des données de test..."
npx tsx tools/seed-test-data.ts

# Démarrer le serveur de développement
echo "💻 Démarrage du serveur de développement..."
npm run dev &
VITE_PID=$!

echo ""
echo "✅ Environnement prêt !"
echo "📱 Application Web: http://localhost:3000"
echo "🔧 Interface Admin Firebase: http://127.0.0.1:4001"
echo ""
echo "Pour arrêter l'environnement, utilisez Ctrl+C ou:"
echo "  pkill -f 'firebase|vite'"

# Attendre que l'utilisateur termine
wait
