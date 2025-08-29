#!/bin/bash

# 🧹 Script de Nettoyage des Logs Firebase
# Ce script nettoie tous les logs volumineux qui ralentissent l'émulateur

echo "🧹 Nettoyage des logs Firebase..."

# Supprimer les logs principaux
rm -f firebase-debug.log
rm -f firestore-debug.log
rm -f database-debug.log
rm -f emulator.log
rm -f .vite.log
rm -f .emulators.log
rm -f .emulators.local.log

# Nettoyer les logs dans les répertoires cachés
find . -name "*.log" -type f -size +1M -delete

# Créer des fichiers .gitkeep pour les répertoires importants si nécessaire
touch emulator-data/.gitkeep 2>/dev/null || true

echo "✅ Logs nettoyés:"
echo "   - firebase-debug.log supprimé"
echo "   - firestore-debug.log supprimé"  
echo "   - database-debug.log supprimé"
echo "   - emulator.log supprimé"
echo "   - .vite.log supprimé"
echo "   - Autres logs volumineux (>1MB) supprimés"

# Afficher l'espace libéré
echo ""
echo "📊 Espace libéré dans le répertoire:"
du -sh . 2>/dev/null || echo "Calcul impossible"
