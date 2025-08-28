#!/bin/bash

# Script pour lancer Vite + Émulateur Firebase ensemble avec persistance
echo "🚀 Démarrage de l'environnement de développement complet"
echo "======================================================="

# Variables pour les PIDs
FIREBASE_PID=""
VITE_PID=""

# Fonction de nettoyage à l'arrêt
cleanup() {
    echo ""
    echo "🛑 Arrêt en cours..."
    
    if [ ! -z "$VITE_PID" ]; then
        echo "   Arrêt de Vite (PID: $VITE_PID)"
        kill $VITE_PID 2>/dev/null
    fi
    
    if [ ! -z "$FIREBASE_PID" ]; then
        echo "   Arrêt de Firebase avec sauvegarde automatique (PID: $FIREBASE_PID)"
        kill -INT $FIREBASE_PID 2>/dev/null
        wait $FIREBASE_PID 2>/dev/null
    fi
    
    echo "✅ Arrêt terminé"
    exit 0
}

# Intercepter Ctrl+C
trap cleanup SIGINT SIGTERM

# Vérifier si des données de sauvegarde existent
echo "📦 Vérification des données de persistance..."
if [ -d "./emulator-data" ] && [ "$(ls -A ./emulator-data)" ]; then
    echo "✅ Données de sauvegarde trouvées - import automatique activé"
    echo "📊 Contenu à importer :"
    ls -1 ./emulator-data/ | sed 's/^/   - /'
    IMPORT_FLAG="--import=./emulator-data"
else
    echo "📂 Aucune donnée de sauvegarde - démarrage avec données vides"
    IMPORT_FLAG=""
fi

echo ""
echo "🔥 Démarrage de l'émulateur Firebase..."
echo "   - Authentication (port 9099)"
echo "   - Firestore (port 8080)"
echo "   - Realtime Database (port 9000)"
echo "   - UI Interface (port 4001)"

# Démarrer Firebase en arrière-plan
firebase emulators:start $IMPORT_FLAG --export-on-exit=./emulator-data &
FIREBASE_PID=$!

echo "   ⚡ Firebase PID: $FIREBASE_PID"

# Attendre que Firebase soit prêt
echo ""
echo "⏳ Attente du démarrage de Firebase..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:4001 > /dev/null 2>&1; then
        echo "✅ Firebase émulateur prêt !"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Timeout : Firebase n'a pas démarré dans les temps"
        cleanup
        exit 1
    fi
    
    echo "   Tentative $attempt/$max_attempts..."
    sleep 2
    attempt=$((attempt + 1))
done

echo ""
echo "💻 Démarrage du serveur Vite..."

# Démarrer Vite en arrière-plan
npm run dev &
VITE_PID=$!

echo "   ⚡ Vite PID: $VITE_PID"

# Attendre que Vite soit prêt
echo ""
echo "⏳ Attente du démarrage de Vite..."
sleep 3

# Vérifier que Vite fonctionne
if ps -p $VITE_PID > /dev/null 2>&1; then
    echo "✅ Vite serveur prêt !"
else
    echo "❌ Erreur : Vite n'a pas démarré correctement"
    cleanup
    exit 1
fi

echo ""
echo "🎉 Environnement de développement prêt !"
echo "========================================"
echo "📱 Application Web    : http://localhost:5173"
echo "🔧 Interface Firebase : http://localhost:4001"
echo "🔑 Auth Emulator      : http://localhost:9099"
echo "📄 Firestore Emulator : http://localhost:8080"
echo "🗃️  Database Emulator  : http://localhost:9000"
echo ""
echo "💾 Persistance activée : vos données seront sauvegardées automatiquement"
echo ""
echo "Pour arrêter l'environnement, utilisez Ctrl+C"
echo "Les processus en cours :"
echo "   - Firebase Emulator (PID: $FIREBASE_PID)"
echo "   - Vite Dev Server   (PID: $VITE_PID)"
echo ""

# Attendre que l'utilisateur termine (ou que les processus se terminent)
while ps -p $FIREBASE_PID > /dev/null 2>&1 && ps -p $VITE_PID > /dev/null 2>&1; do
    sleep 1
done

# Si on arrive ici, c'est qu'un processus s'est arrêté
echo ""
echo "⚠️  Un des processus s'est arrêté, nettoyage..."
cleanup
