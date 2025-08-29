#!/bin/bash

# Script de test de l'optimisation Firestore

echo "🔥 TEST D'OPTIMISATION FIRESTORE"
echo "=================================="

# Fonction pour tester une URL
test_firestore_usage() {
    local url=$1
    local description=$2
    
    echo ""
    echo "📊 Test: $description"
    echo "URL: $url"
    echo "⏳ Ouverture de $url..."
    
    # Ouvrir l'URL dans le navigateur
    if command -v open &> /dev/null; then
        open "$url"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$url"
    else
        echo "⚠️  Veuillez ouvrir manuellement : $url"
    fi
    
    echo "👀 Surveillez le tableau de bord Firestore en haut à droite"
    echo "📈 Compteurs attendus:"
    echo "   - Lectures < 200 par chargement (vs 13k avant)"
    echo "   - Cache hit rate > 50% après 2ème chargement"
    echo "   - Alertes si > 500 lectures"
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
}

# Tests d'optimisation
echo "🚀 Démarrage des tests d'optimisation..."

# Test 1: Chargement initial
test_firestore_usage "http://localhost:5173" "Chargement initial (cache vide)"

# Test 2: Rechargement (test cache)
test_firestore_usage "http://localhost:5173" "Rechargement (test cache)"

# Test 3: Navigation planning
test_firestore_usage "http://localhost:5173" "Navigation dans le planning"

echo ""
echo "🎯 VÉRIFICATIONS À EFFECTUER"
echo "============================"
echo ""
echo "1. 📊 Tableau de bord visible en haut à droite"
echo "2. 🔢 Total lectures < 1000 pour tous les tests"
echo "3. 💾 Cache hit rate augmente avec les rechargements"
echo "4. 🚨 Alertes si seuils dépassés"
echo "5. ⚡ Chargement plus rapide grâce au cache"
echo ""
echo "📝 CONSOLE HELPERS DISPONIBLES:"
echo "   - checkFirestoreUsage()    : Voir stats détaillées"
echo "   - resetFirestoreCounter()  : Remettre compteur à zéro"
echo "   - checkFirestoreCache()    : Stats du cache"
echo "   - clearFirestoreCache()    : Vider le cache"
echo ""

# Vérifications additionnelles
echo "🔍 VÉRIFICATIONS AVANCÉES"
echo "========================="
echo ""
echo "Dans la console développeur, exécutez:"
echo ""
echo "// 1. Voir la consommation détaillée"
echo "checkFirestoreUsage()"
echo ""
echo "// 2. Tester le cache"
echo "checkFirestoreCache()"
echo ""
echo "// 3. Vérifier les économies"
echo "// Avant optimisation: ~13k lectures/chargement"
echo "// Après optimisation: <500 lectures/chargement"
echo "// Économie attendue: >95%"
echo ""

echo "✅ Test d'optimisation Firestore terminé!"
echo ""
echo "📈 RÉSULTATS ATTENDUS:"
echo "   ✅ Lectures réduites de 95%"
echo "   ✅ Cache efficace (hit rate >50%)"
echo "   ✅ Alertes fonctionnelles"
echo "   ✅ Performance améliorée"
echo ""
echo "🚨 Si problèmes detectés:"
echo "   - Vérifier les seuils dans emergencyConfig.ts"
echo "   - Ajuster les limites de requêtes"
echo "   - Activer le mode d'urgence via le dashboard"
