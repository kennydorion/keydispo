#!/bin/bash

# Script de test rapide pour l'import Excel vers RTDB

echo "🧪 Test Import Excel → RTDB"
echo "============================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "import-excel-rtdb.js" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier scripts/"
    exit 1
fi

# Vérifier les émulateurs
echo "🔍 Vérification des émulateurs..."
if ! curl -s http://127.0.0.1:9200/.json > /dev/null 2>&1; then
    echo "❌ Erreur: L'émulateur RTDB n'est pas accessible sur le port 9200"
    echo "   Démarrez les émulateurs avec: firebase emulators:start --only database"
    exit 1
fi
echo "✅ Émulateur RTDB détecté sur port 9200"

# Vérifier les dépendances
echo "📦 Vérification des dépendances..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installation des dépendances..."
    npm install
fi
echo "✅ Dépendances OK"

# Variables d'environnement pour émulateur
export FIREBASE_PROJECT_ID="keydispo-dev"
export FIREBASE_DATABASE_URL="http://127.0.0.1:9200?ns=keydispo-dev-default-rtdb"
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"keydispo-dev","private_key_id":"fake","private_key":"-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n","client_email":"fake@keydispo-dev.iam.gserviceaccount.com","client_id":"fake","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}'

echo "🔧 Configuration émulateur:"
echo "   Project ID: $FIREBASE_PROJECT_ID"
echo "   Database URL: $FIREBASE_DATABASE_URL"

# Test complet automatique
echo ""
echo "🚀 Lancement du test complet..."
echo ""

node test-import-rtdb.js

# Vérifier le résultat
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 TEST RÉUSSI!"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Testez l'interface web sur http://localhost:5173/import"
    echo "   2. Vérifiez les données dans l'interface planning"
    echo "   3. Testez l'import avec vos vrais fichiers Excel"
    echo ""
    echo "💡 Conseils:"
    echo "   - Utilisez des fichiers Excel < 1MB pour de meilleures performances"
    echo "   - Vérifiez le format des dates (DD/MM/YYYY recommandé)"
    echo "   - Testez d'abord avec un petit échantillon"
    echo ""
else
    echo ""
    echo "❌ ÉCHEC DU TEST"
    echo ""
    echo "🔍 Vérifications à faire:"
    echo "   1. Les émulateurs Firebase sont-ils démarrés ?"
    echo "   2. Le port 9200 est-il libre ?"
    echo "   3. Les dépendances Node.js sont-elles installées ?"
    echo ""
    echo "🚨 Pour débugger:"
    echo "   - Consultez les logs ci-dessus"
    echo "   - Vérifiez firebase.json et database.rules.json"
    echo "   - Redémarrez les émulateurs : firebase emulators:start --only database"
    echo ""
fi
