#!/bin/bash

# Test de validation de la nouvelle commande npm start
echo "🧪 Test de la nouvelle commande 'npm start'"
echo "==========================================="

echo ""
echo "📋 Vérifications préliminaires :"

# Vérifier que le script existe et est exécutable
if [ -x "./scripts/start-full-dev.sh" ]; then
    echo "✅ Script start-full-dev.sh prêt"
else
    echo "❌ Script start-full-dev.sh manquant ou non exécutable"
    exit 1
fi

# Vérifier package.json
if grep -q '"start":' package.json; then
    echo "✅ Commande 'start' définie dans package.json"
else
    echo "❌ Commande 'start' manquante dans package.json"
    exit 1
fi

# Vérifier les données existantes
if [ -d "./emulator-data" ] && [ "$(ls -A ./emulator-data)" ]; then
    echo "✅ Données de persistance disponibles"
else
    echo "⚠️  Aucune donnée de persistance (normal pour un premier démarrage)"
fi

echo ""
echo "📝 Commandes disponibles :"
echo "   npm start                    # 🆕 Ultra-simple (Vite + Firebase)"
echo "   ./scripts/start-full-dev.sh  # Version détaillée"
echo "   ./quick-start.sh             # Version rapide"
echo "   npm run start:dev            # Version classique avec seeding"

echo ""
echo "✅ Tout est prêt pour utiliser 'npm start' !"
echo ""
echo "💡 Pour tester maintenant :"
echo "   npm start"
echo ""
echo "🎯 L'application sera disponible sur :"
echo "   - App Vue    : http://localhost:5173"
echo "   - Firebase UI: http://localhost:4001"
