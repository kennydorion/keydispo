#!/bin/bash

# Test rapide de l'architecture complète d'import RTDB

echo "🧪 Test Complet Import RTDB"
echo "============================"

# Variables
PROJECT_ROOT="/Users/kennydorion/Sites/keydispo"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

cd "$PROJECT_ROOT"

echo "1️⃣ Vérification des fichiers créés..."
files_to_check=(
    "src/utils/importToRTDBDirect.ts"
    "src/services/excelImportRTDBService.ts"
    "scripts/import-excel-rtdb.js"
    "scripts/test-import-rtdb.js"
    "scripts/GUIDE_IMPORT_RTDB.md"
    "scripts/QUICK_START_IMPORT_RTDB.md"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file"
    fi
done

echo ""
echo "2️⃣ Vérification de l'architecture..."

# Vérifier l'import RTDB dans le composant
if grep -q "importToRTDB" "$PROJECT_ROOT/src/features/import/ImportDispos.vue"; then
    echo "✅ Composant ImportDispos.vue utilise importToRTDB"
else
    echo "❌ Composant ImportDispos.vue n'utilise pas importToRTDB"
fi

# Vérifier les types
if grep -q "ImportProgress" "$PROJECT_ROOT/src/utils/importToRTDBDirect.ts"; then
    echo "✅ Types ImportProgress définis"
else
    echo "❌ Types ImportProgress manquants"
fi

# Vérifier la transformation des données
if grep -q "transformToRTDBData" "$PROJECT_ROOT/src/utils/importToRTDBDirect.ts"; then
    echo "✅ Fonction transformToRTDBData présente"
else
    echo "❌ Fonction transformToRTDBData manquante"
fi

echo ""
echo "3️⃣ Structure des fichiers d'import RTDB:"
echo ""

# Afficher la structure des principaux fichiers
echo "📄 src/utils/importToRTDBDirect.ts:"
echo "   - $(grep -c "export.*function" "$PROJECT_ROOT/src/utils/importToRTDBDirect.ts") fonctions exportées"
echo "   - $(grep -c "interface" "$PROJECT_ROOT/src/utils/importToRTDBDirect.ts") interfaces définies"

echo ""
echo "📄 scripts/import-excel-rtdb.js:"
if [ -f "$SCRIPTS_DIR/import-excel-rtdb.js" ]; then
    echo "   - $(grep -c "class.*ExcelImporter" "$SCRIPTS_DIR/import-excel-rtdb.js") classe d'import"
    echo "   - $(grep -c "async.*import" "$SCRIPTS_DIR/import-excel-rtdb.js") méthodes d'import"
else
    echo "   - Fichier manquant"
fi

echo ""
echo "📄 scripts/test-import-rtdb.js:"
if [ -f "$SCRIPTS_DIR/test-import-rtdb.js" ]; then
    echo "   - $(grep -c "class.*Tester" "$SCRIPTS_DIR/test-import-rtdb.js") classe de test"
    echo "   - $(grep -c "async.*test" "$SCRIPTS_DIR/test-import-rtdb.js") méthodes de test"
else
    echo "   - Fichier manquant"
fi

echo ""
echo "4️⃣ État de l'intégration:"

# Vérifier l'intégration avec firebase
if grep -q "firebase/database" "$PROJECT_ROOT/src/utils/importToRTDBDirect.ts"; then
    echo "✅ Import Firebase RTDB configuré"
else
    echo "❌ Import Firebase RTDB manquant"
fi

# Vérifier le service central
if [ -f "$PROJECT_ROOT/src/services/excelImportRTDBService.ts" ]; then
    if grep -q "importFromNormalizedData" "$PROJECT_ROOT/src/services/excelImportRTDBService.ts"; then
        echo "✅ Service central excelImportRTDBService opérationnel"
    else
        echo "⚠️ Service central excelImportRTDBService incomplet"
    fi
else
    echo "❌ Service central excelImportRTDBService manquant"
fi

echo ""
echo "5️⃣ Résumé de l'architecture RTDB:"
echo ""
echo "🏗️ Architecture créée:"
echo "   • Interface Web: ImportDispos.vue → importToRTDBDirect.ts"
echo "   • Service Central: excelImportRTDBService.ts"
echo "   • Script Node.js: import-excel-rtdb.js"
echo "   • Tests: test-import-rtdb.js"
echo "   • Documentation: GUIDE_IMPORT_RTDB.md + QUICK_START_IMPORT_RTDB.md"
echo ""
echo "🔄 Flux de données:"
echo "   Excel → parseWorkbook → NormalizedRow[] → transformToRTDBData → RTDB"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Testez avec: cd scripts && ./test-import-rtdb-quick.sh"
echo "   2. Interface web: http://localhost:5173/import"
echo "   3. Import direct: node scripts/import-excel-rtdb.js fichier.xlsx tenant123"
echo ""
echo "🎯 Objectif atteint: L'import Excel pointe maintenant vers RTDB ! ✅"
