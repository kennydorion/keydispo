#!/bin/bash

# Script de test pour le scroll virtuel des collaborateurs
# Ce script vérifie que l'implémentation fonctionne correctement

echo "🚀 Test du scroll virtuel des collaborateurs"
echo "=============================================="
echo ""

# Vérifier que le serveur de dev fonctionne
echo "📡 Vérification du serveur de développement..."
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Serveur de dev actif sur http://localhost:3001"
else
    echo "❌ Serveur de dev non accessible"
    echo "💡 Lancer: npm run dev"
    exit 1
fi

echo ""
echo "🔍 Points de vérification pour le scroll virtuel :"
echo ""
echo "1. 📊 Performance et rendu :"
echo "   - Ouvrir DevTools > Performance"
echo "   - Seules ~16-20 lignes collaborateurs dans le DOM"
echo "   - Scroll fluide sans saccades"
echo ""
echo "2. 🎯 Fonctionnalités :"
echo "   - Hover sur les cellules fonctionne"
echo "   - Clics pour ouvrir les modales fonctionnent"
echo "   - Couleurs des collaborateurs s'affichent"
echo ""
echo "3. 📏 Mesures techniques :"
echo "   - windowedCollaborateurs.length <= 20 (au lieu de 100+)"
echo "   - rowWindowOffsetPx change avec le scroll"
echo "   - gridTotalHeight = nombre_total * hauteur_ligne"
echo ""
echo "4. 🧪 Tests avancés :"
echo "   - Scroll rapide ne casse pas l'affichage"
echo "   - Redimensionnement de fenêtre recalcule correctement"
echo "   - Données temps réel synchronisées"
echo ""

# Instructions pour les tests manuels
echo "📖 Instructions de test :"
echo ""
echo "1. Ouvrir http://localhost:3001"
echo "2. Se connecter (tenant par défaut)"
echo "3. Aller dans Planning > Semaine"
echo "4. Vérifier qu'il y a plusieurs collaborateurs"
echo "5. Ouvrir DevTools > Console pour voir les logs"
echo "6. Scroller verticalement et observer :"
echo "   - Console logs de recomputeRowWindow()"
echo "   - Nombre d'éléments .excel-row dans le DOM"
echo "   - Fluidité du scroll"
echo ""

echo "💻 Commandes utiles :"
echo "   - Logs de scroll: Console > filtrer 'window'"
echo "   - Éléments DOM: \$\$('.excel-row').length"
echo "   - Offset actuel: getComputedStyle(\$('.rows-window')).transform"
echo ""

echo "🎉 Test du scroll virtuel prêt !"
echo "   Ouvrir maintenant: http://localhost:3001"
