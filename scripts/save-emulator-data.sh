#!/bin/bash

# Script pour sauvegarder les données de l'émulateur Firebase
# Utilise l'API REST de l'émulateur pour exporter les données

echo "🔄 Sauvegarde des données de l'émulateur Firebase..."

# Vérifier si l'émulateur est en cours d'exécution
if ! curl -s http://localhost:4001 > /dev/null 2>&1; then
    echo "❌ L'émulateur Firebase ne semble pas être en cours d'exécution"
    echo "   Veuillez démarrer l'émulateur avant d'exporter les données"
    exit 1
fi

# Créer le dossier de sauvegarde s'il n'existe pas
mkdir -p ./emulator-data

# Exporter les données via l'API REST
echo "📤 Export des données Auth, Firestore et Realtime Database..."

curl -X POST "http://localhost:4001/emulator/v1/projects/demo-keydispo:export" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "./emulator-data",
    "initiatedBy": "script"
  }' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Données sauvegardées avec succès dans ./emulator-data"
    echo "📊 Contenu sauvegardé :"
    ls -la ./emulator-data/
else
    echo "❌ Erreur lors de la sauvegarde des données"
    exit 1
fi
