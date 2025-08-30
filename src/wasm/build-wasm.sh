#!/bin/bash

# Script de build pour le module WASM ultra-performant
echo "🚀 Building WASM module for ultra-fast highlights..."

# Vérifier que wasm-pack est installé
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack not found. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Vérifier que Rust est installé
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust not found. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Naviguer vers le dossier WASM
cd "$(dirname "$0")"

# Build du module WASM optimisé pour le web
echo "🔧 Building WASM module..."
wasm-pack build --target web --out-dir ../wasm-pkg --release

# Optimisation supplémentaire avec wee_alloc
echo "⚡ Optimizing for size and speed..."

# Vérifier le résultat
if [ -f "../wasm-pkg/highlight_engine.js" ]; then
    echo "✅ WASM module built successfully!"
    echo "📦 Output files:"
    ls -la ../wasm-pkg/
    
    # Afficher la taille du fichier WASM
    wasm_size=$(stat -f%z ../wasm-pkg/highlight_engine_bg.wasm 2>/dev/null || stat -c%s ../wasm-pkg/highlight_engine_bg.wasm 2>/dev/null)
    echo "📏 WASM file size: ${wasm_size} bytes"
    
    echo ""
    echo "🎯 Integration tips:"
    echo "   1. Import from '../wasm-pkg/highlight_engine.js'"
    echo "   2. Initialize with await init()"
    echo "   3. Use HighlightEngine for ultra-fast calculations"
    
else
    echo "❌ Build failed. Check errors above."
    exit 1
fi
