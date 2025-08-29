#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const filePath = path.join(__dirname, 'src/views/SemaineVirtualClean.vue')
const content = fs.readFileSync(filePath, 'utf8')
const lines = content.split('\n')

console.log('🔍 Analyse complète du template...\n')

let balance = 0
let lineNum = 0
let templateDepth = 0

for (const line of lines) {
  lineNum++
  
  // Compter la profondeur des templates (pour éviter d'arrêter trop tôt)
  if (line.includes('<template')) templateDepth++
  if (line.trim() === '</template>') {
    templateDepth--
    if (templateDepth === 0) {
      console.log(`🏁 Vraie fin du template à la ligne ${lineNum}`)
      break
    }
  }
  
  const opens = (line.match(/<div[^>\/]*>/g) || []).length
  const closes = (line.match(/<\/div>/g) || []).length
  
  balance += opens - closes
  
  // Afficher les lignes importantes
  if ([146, 167, 169, 652, 653, 654].includes(lineNum)) {
    const status = opens > closes ? 'OUVRE' : closes > opens ? 'FERME' : 'NEUTRE'
    console.log(`⭐ ${lineNum}: [${balance}] ${status} (${opens}+/${closes}-) - ${line.trim()}`)
  }
  
  // Afficher zone critique autour des fermetures
  if (lineNum >= 650 && lineNum <= 656 && (opens > 0 || closes > 0)) {
    const status = opens > closes ? 'OUVRE' : closes > opens ? 'FERME' : 'NEUTRE'
    console.log(`   ${lineNum}: [${balance}] ${status} (${opens}+/${closes}-) - ${line.trim()}`)
  }
}

console.log(`\n🎯 Balance finale: ${balance}`)

if (balance === 0) {
  console.log('✅ Les balises div sont parfaitement équilibrées !')
} else {
  console.log(`❌ Déséquilibre de ${balance} balises`)
}
