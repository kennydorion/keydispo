#!/usr/bin/env node
/*
  Clean Project Script
  - Déplace les fichiers/tests inutilisés vers archive/YYYY-MM-DD/
  - Détecte les composants Vue non référencés dans src/** pour éviter de casser le build
  - Nettoie dist/ et exports émulateurs/logs

  Utilisation:
    node tools/cleanup/clean-project.js [--dry-run]
*/

import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'

const ROOT = path.resolve(process.cwd())
const DRY_RUN = process.argv.includes('--dry-run')
const PURGE_ARCHIVE = process.argv.includes('--purge-archive')
const ARCHIVE_DIR = path.join(ROOT, 'archive', new Date().toISOString().slice(0, 10))

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', '.vscode', '.github', 'archive'
])

// Helpers
async function ensureDir(p) { await fsp.mkdir(p, { recursive: true }) }
async function pathExists(p) { try { await fsp.access(p); return true } catch { return false } }
function isDirEntry(d) { return d.isDirectory() }

function walkDirSync(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(full + path.sep)
      walkDirSync(full, results)
    } else {
      results.push(full)
    }
  }
  return results
}

// --- Import graph (détection des fichiers réellement utilisés) ---
const SRC_EXTS = ['.ts', '.tsx', '.js', '.vue']
function tryResolveWithExt(basePath) {
  const candidates = []
  // direct file with ext
  if (fs.existsSync(basePath) && fs.lstatSync(basePath).isFile()) candidates.push(basePath)
  for (const ext of SRC_EXTS) {
    const p = basePath + ext
    if (fs.existsSync(p)) candidates.push(p)
  }
  // index resolution
  for (const ext of SRC_EXTS) {
    const p = path.join(basePath, 'index' + ext)
    if (fs.existsSync(p)) candidates.push(p)
  }
  // vue SFC style .vue direct
  return candidates[0] || null
}

function resolveImport(spec, fromFile) {
  if (!spec) return null
  // ignore packages
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null
  const fromDir = path.dirname(fromFile)
  let abs
  if (spec.startsWith('@/')) {
    abs = path.join(ROOT, 'src', spec.slice(2))
  } else {
    abs = path.resolve(fromDir, spec)
  }
  // strip query like ?raw etc.
  abs = abs.split('?')[0]
  const resolved = tryResolveWithExt(abs)
  return resolved
}

const IMPORT_RE = /import\s+(?:[^'"()]+?from\s*)?["']([^"']+)["']/g
const DYN_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g

function extractImports(filePath, content) {
  const specs = new Set()
  let m
  while ((m = IMPORT_RE.exec(content))) specs.add(m[1])
  while ((m = DYN_IMPORT_RE.exec(content))) specs.add(m[1])
  return Array.from(specs)
}

async function buildUsedFilesGraph() {
  const srcRoot = path.join(ROOT, 'src')
  const allSrc = walkDirSync(srcRoot).filter((p) => SRC_EXTS.some((e) => p.endsWith(e)))
  const textCache = new Map()
  async function readText(p) {
    if (textCache.has(p)) return textCache.get(p)
    const t = await fsp.readFile(p, 'utf8').catch(() => '')
    textCache.set(p, t)
    return t
  }
  const used = new Set()
  const queue = []
  function enqueue(p) {
    if (p && !used.has(p)) { used.add(p); queue.push(p) }
  }
  // Entrées
  const entryCandidates = [
    path.join(srcRoot, 'main.ts'),
    path.join(srcRoot, 'App.vue'),
    path.join(srcRoot, 'router', 'routes.ts'),
  ]
  entryCandidates.forEach((p) => { if (fs.existsSync(p)) enqueue(p) })
  // Parcours BFS
  while (queue.length) {
    const cur = queue.shift()
    const content = await readText(cur)
    const specs = extractImports(cur, content)
    for (const spec of specs) {
      const resolved = resolveImport(spec, cur)
      if (resolved) enqueue(resolved)
    }
  }
  return used
}

// Candidats globaux (racine)
const ROOT_FILE_PATTERNS = [
  /^test-.*\.(js|mjs|cjs|sh|html|md|xlsx)$/i,
  /^debug-.*\.(js|ts|cjs|sh)$/i,
  /^check-.*\.(js|ts|cjs|mjs)$/i,
  /^(diagnostic|diagnose)(-|_)?[\w-]*\.(js|ts|sh|mjs|cjs)$/i,
  /^validation-.*\.(sh|js|cjs)$/i,
  /^verifier?-.*\.(js|ts|cjs)$/i,
  /^import-test-.*\.(js|ts|cjs|mjs)$/i,
  /^create-test-.*\.(js|ts|cjs|mjs)$/i,
  /^migrate-.*\.(js|ts|cjs|mjs)$/i,
  /^emulator.*\.log$/i,
  /^rtdb-emulator\.log$/i,
  /^emulator-fresh\.log$/i,
  /^emulator\.log$/i,
  /^database-debug\.log$/i,
  /^firestore-debug\.log$/i,
  /^firebase-export-[\w-]+$/i,
  /^dist$/i,
]

// Extensions à nettoyer spécifiquement à la racine si non référencés
const ROOT_CLEAN_EXTS = new Set(['.md', '.js', '.cjs', '.sh'])
const ROOT_MD_WHITELIST = new Set(['README.md'])

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i) : ''
}

async function getPackageScriptRefs() {
  const pkgPath = path.join(ROOT, 'package.json')
  if (!(await pathExists(pkgPath))) return new Set()
  const raw = await fsp.readFile(pkgPath, 'utf8')
  /** @type {{ scripts?: Record<string,string> }} */
  const pkg = JSON.parse(raw)
  const refs = new Set()
  const rx = /(\.?\.\/)?([\w\/-]+\.(?:sh|js|cjs))/g
  for (const cmd of Object.values(pkg.scripts || {})) {
    let m
    while ((m = rx.exec(cmd))) {
      const relPath = m[2]
      const abs = path.resolve(ROOT, relPath)
      refs.add(abs)
    }
  }
  return refs
}

// Candidats dans src (fichiers probablement obsolètes)
const SRC_FILE_PATTERNS = [
  /\.backup\.vue$/i,           // foo.backup.vue
  /\.vue\.backup$/i,           // foo.vue.backup
  /-backup\.vue$/i,             // Foo-backup.vue
  /-clean\.vue$/i,              // Foo-clean.vue
  /_clean\.vue$/i,              // Foo_clean.vue
  /-new\.vue$/i,                // Foo-new.vue
  // Intentionally avoid generic Clean/New names to not catch active files like SemaineVirtualClean.vue
  /\.backup\.(ts|js)$/i,
]

// Candidats dans public (assets de debug/tests)
const PUBLIC_FILE_PATTERNS = [
  /^debug-.*\.(js|html)$/i,
  /^test-.*\.(js|html)$/i,
  /diagnostic-.*\.(js|html)$/i,
  /^quick-test\.(js|html)$/i,
]

function matchAny(name, regexList) {
  return regexList.some((re) => re.test(name))
}

async function readAllSourceText() {
  const srcDir = path.join(ROOT, 'src')
  const all = walkDirSync(srcDir)
  const textFiles = all.filter((p) => p.endsWith('.ts') || p.endsWith('.vue') || p.endsWith('.tsx') || p.endsWith('.js'))
  const buffers = await Promise.all(textFiles.map((p) => fsp.readFile(p, 'utf8').catch(() => '')))
  return buffers.join('\n')
}

function rel(p) { return path.relative(ROOT, p) }

async function archivePathFor(p) {
  const relative = path.relative(ROOT, p)
  const dest = path.join(ARCHIVE_DIR, relative)
  await ensureDir(path.dirname(dest))
  return dest
}

async function moveToArchive(p) {
  const dest = await archivePathFor(p)
  if (DRY_RUN) { console.log(`[DRY] MOVE ${rel(p)} -> ${rel(dest)}`); return }
  // Create parent
  await ensureDir(path.dirname(dest))
  // If directory: move recursively
  const stat = await fsp.lstat(p)
  if (stat.isDirectory()) {
    // For directories, simple rename is fine
    await fsp.rename(p, dest)
  } else {
    await fsp.rename(p, dest)
  }
  console.log(`🗃️  Moved ${rel(p)} -> ${rel(dest)}`)
}

async function removePath(p) {
  if (DRY_RUN) { console.log(`[DRY] REMOVE ${rel(p)}`); return }
  await fsp.rm(p, { recursive: true, force: true })
  console.log(`🧹 Removed ${rel(p)}`)
}

async function main() {
  console.log('🧼 Clean Project — démarrage\n')
  await ensureDir(ARCHIVE_DIR)

  const all = walkDirSync(ROOT)
  const usedFiles = await buildUsedFilesGraph().catch(() => new Set())

  // 1) Nettoyage racine (tests/logs/exports/dist)
  const rootCandidates = all.filter((p) => {
    const name = path.basename(p)
    const parent = path.dirname(p)
    const isRootChild = parent === ROOT
    if (!isRootChild) return false
    return matchAny(name, ROOT_FILE_PATTERNS)
  })

  // 1.b) Fichiers à la racine avec extensions ciblées (.md/.js/.cjs/.sh) — à archiver si non référencés
  const packageScriptRefs = await getPackageScriptRefs()
  const rootLooseCandidates = all.filter((p) => {
    const name = path.basename(p)
    const parent = path.dirname(p)
    if (parent !== ROOT) return false
    const ext = getExt(name).toLowerCase()
    if (!ROOT_CLEAN_EXTS.has(ext)) return false
    if (ext === '.md' && ROOT_MD_WHITELIST.has(name)) return false
    return true
  })
  // Exclure ceux référencés par package.json
  const rootLooseUnused = rootLooseCandidates.filter((p) => !packageScriptRefs.has(p))

  // 2) Nettoyage src — candidates par pattern + vérification de non-usage
  const srcCandidates = all.filter((p) => p.startsWith(path.join(ROOT, 'src') + path.sep) && matchAny(p, SRC_FILE_PATTERNS))

  // public candidates
  const publicDir = path.join(ROOT, 'public')
  const publicCandidates = all.filter((p) => p.startsWith(publicDir + path.sep) && matchAny(path.basename(p), PUBLIC_FILE_PATTERNS))

  // Construire index d'usage
  const sourceText = await readAllSourceText()
  function isUsedBySource(candidatePath) {
    const base = path.basename(candidatePath).replace(/\.(vue|ts|js|tsx)$/i, '')
    // Cherche le nom exact (simple heuristique)
    const pattern = new RegExp(`\b${base}\b`, 'i')
    return pattern.test(sourceText)
  }

  const unusedSrcCandidates = srcCandidates.filter((p) => !isUsedBySource(p))

  // 3) Dossiers spéciaux: dist et firebase-export-*
  const specialDirs = all.filter((p) => {
    const name = path.basename(p)
    const parent = path.dirname(p)
    const isRootChild = parent === ROOT
    if (!isRootChild) return false
    return /^dist$/i.test(name) || /^firebase-export-[\w-]+$/i.test(name)
  })

  // 3.b) Fichiers de règles à la racine: garder seulement ceux référencés par firebase.json
  async function getFirebaseUsedRuleFiles() {
    const fbPath = path.join(ROOT, 'firebase.json')
    const used = new Set()
    if (await pathExists(fbPath)) {
      const raw = await fsp.readFile(fbPath, 'utf8')
      const cfg = JSON.parse(raw)
      const addIf = (p) => { if (p) used.add(path.resolve(ROOT, p)) }
      addIf(cfg?.firestore?.rules)
      addIf(cfg?.firestore?.indexes)
      addIf(cfg?.emulators?.firestore?.rules)
      addIf(cfg?.emulators?.database?.rules)
      addIf(cfg?.database?.rules)
    }
    return used
  }

  const usedRuleFiles = await getFirebaseUsedRuleFiles()
  const rootRuleCandidates = all.filter((p) => {
    const parent = path.dirname(p)
    if (parent !== ROOT) return false
    const name = path.basename(p)
    // cibles: firestore.*.rules, firestore.rules*, database*.rules.json, *.indexes.json duplicats
    const isFirestoreRule = /^firestore[\w.-]*\.rules(\..*)?$/i.test(name) || /^firestore\.rules([\w.-]*)?$/i.test(name)
    const isDatabaseRule = /^database[\w.-]*\.rules\.json$/i.test(name)
    const isIndexesDup = /^firestore\.[\w.-]*indexes\.(json|bak|backup)$/i.test(name) && name !== 'firestore.indexes.json'
    return isFirestoreRule || isDatabaseRule || isIndexesDup
  })
  const unusedRootRuleFiles = rootRuleCandidates.filter((p) => !usedRuleFiles.has(path.resolve(p)))

  // 3.c) Fichiers .env à la racine — ne garder que ceux supportés par Vite
  const ENV_KEEP = new Set([
    '.env',
    '.env.local',
    '.env.example',
    '.env.development',
    '.env.development.local',
    '.env.production',
    '.env.production.local'
  ])
  const rootEnvCandidates = all.filter((p) => path.dirname(p) === ROOT && /^\.env(\..*)?$/i.test(path.basename(p)))
  const unusedEnvFiles = rootEnvCandidates.filter((p) => !ENV_KEEP.has(path.basename(p)))

  // 3.d) Dossier docs/ à la racine — archiver entièrement
  const docsDir = path.join(ROOT, 'docs')
  const hasDocsDir = await pathExists(docsDir)

  // 3.e) scripts non référencés (conserver ceux appelés depuis package.json)
  const scriptsDir = path.join(ROOT, 'scripts')
  const hasScriptsDir = await pathExists(scriptsDir)
  const scriptCandidates = hasScriptsDir
    ? all.filter((p) => p.startsWith(scriptsDir + path.sep) && !p.includes(path.sep + 'node_modules' + path.sep))
        .filter((p) => {
          const st = fs.existsSync(p) ? fs.lstatSync(p) : null
          if (!st || !st.isFile()) return false
          const ext = getExt(p).toLowerCase()
          return ['.sh', '.js', '.cjs'].includes(ext)
        })
    : []
  const mdInScripts = hasScriptsDir
    ? all.filter((p) => p.startsWith(scriptsDir + path.sep) && getExt(p).toLowerCase() === '.md')
    : []
  const unusedScriptFiles = scriptCandidates.filter((p) => !packageScriptRefs.has(p))

  // 4) Rapport
  console.log(`📦 Candidats racine (patterns): ${rootCandidates.length}`)
  console.log(`� Candidats racine (ext ciblées, non référencés): ${rootLooseUnused.length}`)
  console.log(`� Dossiers spéciaux: ${specialDirs.length}`)
  console.log(`🛡️  Règles utilisées (firebase.json): ${usedRuleFiles.size}`)
  console.log(`🗂️  Règles racine non référencées: ${unusedRootRuleFiles.length}`)
  console.log(`🧩 Candidats src obsolètes (non référencés): ${unusedSrcCandidates.length}`)
  console.log(`🪪 Candidats public (debug/tests): ${publicCandidates.length}`)
  console.log(`🔑 .env non standards à archiver: ${unusedEnvFiles.length}`)
  console.log(`📚 Dossier docs/ présent: ${hasDocsDir ? 'oui' : 'non'}`)
  console.log(`🛠️  Scripts non référencés (scripts/): ${unusedScriptFiles.length}`)
  console.log(`📝 Fichiers .md dans scripts/: ${mdInScripts.length}`)

  // 4) Détection des fichiers inutilisés dans src/*
  function collectUnusedIn(folderRel, fileExts) {
    const folderAbs = path.join(ROOT, 'src', folderRel)
    if (!fs.existsSync(folderAbs)) return []
    const files = walkDirSync(folderAbs).filter((p) => fs.existsSync(p) && fs.lstatSync(p).isFile())
    const filtered = files.filter((p) => fileExts.includes(getExt(p).toLowerCase()) && !usedFiles.has(p))
    return filtered
  }
  const unusedViews = collectUnusedIn('views', ['.vue'])
  const unusedComposables = collectUnusedIn('composables', ['.ts', '.js'])
  const unusedServices = collectUnusedIn('services', ['.ts', '.js'])
  const unusedStores = collectUnusedIn('stores', ['.ts', '.js'])
  const unusedTypes = collectUnusedIn('types', ['.ts', '.d.ts', '.js'])
  const unusedUtils = collectUnusedIn('utils', ['.ts', '.js'])

  console.log(`🗺️  Fichiers inutilisés détectés:`)
  console.log(`    • views: ${unusedViews.length}`)
  console.log(`    • composables: ${unusedComposables.length}`)
  console.log(`    • services: ${unusedServices.length}`)
  console.log(`    • stores: ${unusedStores.length}`)
  console.log(`    • types: ${unusedTypes.length}`)
  console.log(`    • utils: ${unusedUtils.length}`)

  // 5) Actions
  for (const p of rootCandidates) {
    // Si dossier (dist ou firebase-export-*) → supprimer direct
    const base = path.basename(p)
    const stat = await fsp.lstat(p).catch(() => null)
    if (!stat) continue
    if (stat.isDirectory() || /^firebase-export-[\w-]+$/i.test(base) || /^dist$/i.test(base)) {
      await removePath(p)
    } else {
      await moveToArchive(p)
    }
  }

  // 5.b) Déplacer les fichiers racine non référencés (.md/.js/.cjs/.sh), sauf whitelist
  for (const p of rootLooseUnused) {
    await moveToArchive(p)
  }

  for (const p of specialDirs) {
    await removePath(p)
  }

  for (const p of unusedSrcCandidates) {
    await moveToArchive(p)
  }

  for (const p of publicCandidates) {
    await moveToArchive(p)
  }

  // 6) Déplacer les fichiers de règles non utilisés
  for (const p of unusedRootRuleFiles) {
    await moveToArchive(p)
  }

  // 7) Déplacer les .env non standards (backups, suffixes inattendus)
  for (const p of unusedEnvFiles) {
    await moveToArchive(p)
  }

  // 8) Déplacer docs/
  if (hasDocsDir) {
    await moveToArchive(docsDir)
  }

  // 9) Déplacer les scripts non référencés et la doc située dans scripts/
  for (const p of unusedScriptFiles) {
    await moveToArchive(p)
  }
  for (const p of mdInScripts) {
    await moveToArchive(p)
  }

  // 10) Déplacer/archiver les fichiers inutilisés en src
  for (const p of [...unusedViews, ...unusedComposables, ...unusedServices, ...unusedStores, ...unusedTypes, ...unusedUtils]) {
    await moveToArchive(p)
  }

  // 11) Supprimer dossiers de tests et archive si demandé
  const testsRoot = path.join(ROOT, 'tests')
  const testsSrc = path.join(ROOT, 'src', 'tests')
  if (await pathExists(testsRoot)) await removePath(testsRoot)
  if (await pathExists(testsSrc)) await removePath(testsSrc)

  // Supprimer le dossier archive seulement si demandé explicitement
  if (PURGE_ARCHIVE) {
    const archiveRoot = path.join(ROOT, 'archive')
    if (await pathExists(archiveRoot)) {
      if (DRY_RUN) {
        console.log(`[DRY] REMOVE ${path.relative(ROOT, archiveRoot)}`)
      } else {
        await fsp.rm(archiveRoot, { recursive: true, force: true })
        console.log(`🗑️  Removed ${path.relative(ROOT, archiveRoot)}`)
      }
    }
  }

  console.log(`\n✅ Nettoyage terminé. Les fichiers/dossiers déplacés sont sous: ${rel(ARCHIVE_DIR)}`)
  if (DRY_RUN) console.log('ℹ️  Aucun changement effectué (dry-run). Relancez sans --dry-run pour appliquer.')
}

main().catch((err) => { console.error('❌ Erreur clean-project:', err); process.exit(1) })
