# WASM Highlight Engine

Module WASM ultra-performant pour les calculs de highlights en temps réel.

## Performance Targets
- Calculs de highlights < 0.01ms
- Traitement batch jusqu'à 10 000 éléments
- Optimisations micro-niveau avec évitement de divisions

## Build

```bash
chmod +x build-wasm.sh
./build-wasm.sh
```

## Usage dans Vue/TypeScript

```typescript
import { WASMHighlightEngine } from '../services/wasmHighlightEngine'

const engine = new WASMHighlightEngine()
await engine.initialize()

const result = engine.calculateHighlight(
  mouseX, mouseY, rectLeft, rectTop, 
  cellWidth, cellHeight, cols, rows
)
```

## Architecture

- **highlight-engine.rs**: Module Rust optimisé avec calculs natifs
- **wasmHighlightEngine.ts**: Interface JavaScript avec fallback
- **build-wasm.sh**: Script de build automatisé

## Optimisations

1. Calculs entiers pour éviter la virgule flottante
2. Pré-calcul des valeurs inverses pour éviter les divisions
3. Allocation mémoire minimale
4. Traitement par lot pour les gros volumes
