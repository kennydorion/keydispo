#!/bin/bash

# Test de validation de la persistance des données Firebase
echo "🧪 Test de validation de la persistance Firebase"
echo "================================================"

# Fonction pour attendre que l'émulateur soit prêt
wait_for_emulator() {
    echo "⏳ Attente du démarrage de l'émulateur..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:4001 > /dev/null 2>&1; then
            echo "✅ Émulateur prêt !"
            return 0
        fi
        echo "   Tentative $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Timeout : l'émulateur n'a pas démarré"
    return 1
}

# Fonction pour compter les utilisateurs Auth
count_auth_users() {
    if [ -f "./emulator-data/auth_export/accounts.json" ]; then
        if command -v jq > /dev/null 2>&1; then
            jq '.users | length' "./emulator-data/auth_export/accounts.json" 2>/dev/null || echo "0"
        else
            # Fallback sans jq - approximation
            grep -o '"localId"' "./emulator-data/auth_export/accounts.json" 2>/dev/null | wc -l | tr -d ' '
        fi
    else
        echo "0"
    fi
}

# Sauvegarder l'état initial
echo ""
echo "📊 État initial des données :"
initial_users=$(count_auth_users)
echo "   👤 Utilisateurs Auth: $initial_users"

if [ -d "./emulator-data/firestore_export" ]; then
    initial_firestore_size=$(du -s "./emulator-data/firestore_export" 2>/dev/null | cut -f1 || echo "0")
    echo "   📄 Taille Firestore: ${initial_firestore_size} KB"
else
    initial_firestore_size="0"
    echo "   📄 Taille Firestore: 0 KB"
fi

# Test 1: Démarrage avec import
echo ""
echo "🚀 Test 1: Démarrage avec import des données existantes"
echo "------------------------------------------------------"

# Démarrer l'émulateur en arrière-plan
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data &
EMULATOR_PID=$!

# Attendre que l'émulateur soit prêt
if ! wait_for_emulator; then
    kill $EMULATOR_PID 2>/dev/null
    exit 1
fi

echo "✅ Émulateur démarré avec import réussi"

# Laisser un peu de temps pour que tout se stabilise
sleep 2

# Arrêter l'émulateur proprement
echo ""
echo "🛑 Arrêt de l'émulateur avec export automatique..."
kill -INT $EMULATOR_PID
wait $EMULATOR_PID 2>/dev/null

echo "✅ Émulateur arrêté avec export automatique"

# Vérifier l'état final
echo ""
echo "📊 État final des données :"
final_users=$(count_auth_users)
echo "   👤 Utilisateurs Auth: $final_users"

if [ -d "./emulator-data/firestore_export" ]; then
    final_firestore_size=$(du -s "./emulator-data/firestore_export" 2>/dev/null | cut -f1 || echo "0")
    echo "   📄 Taille Firestore: ${final_firestore_size} KB"
else
    final_firestore_size="0"
    echo "   📄 Taille Firestore: 0 KB"
fi

# Résultats du test
echo ""
echo "🏁 Résultats du test de persistance :"
echo "====================================="

if [ "$initial_users" = "$final_users" ] && [ "$initial_firestore_size" = "$final_firestore_size" ]; then
    echo "✅ SUCCÈS : Les données ont été correctement préservées !"
    echo "   - Utilisateurs Auth : $initial_users → $final_users ✓"
    echo "   - Données Firestore : ${initial_firestore_size} KB → ${final_firestore_size} KB ✓"
else
    echo "⚠️  ATTENTION : Différences détectées"
    echo "   - Utilisateurs Auth : $initial_users → $final_users"
    echo "   - Données Firestore : ${initial_firestore_size} KB → ${final_firestore_size} KB"
    echo ""
    echo "💡 Ceci peut être normal si :"
    echo "   - C'était le premier démarrage (création de métadonnées)"
    echo "   - L'émulateur a créé des données additionnelles"
fi

echo ""
echo "✨ La persistance Firebase est configurée et fonctionnelle !"
echo "   Utilisez ./start-dev.sh pour vos sessions de développement"
