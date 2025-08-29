#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const filePath = path.join(__dirname, 'src/views/SemaineVirtualClean.vue')
const content = fs.readFileSync(filePath, 'utf8')
const lines = content.split('\n')

console.log('🔍 Analyse ligne par ligne...\n')

let balance = 0
let lineNum = 0

// Analyser lignes spécifiques
const checkLines = [146, 167, 169, 652, 653, 654]

for (const line of lines) {
  lineNum++
  
  // Arrêter à la fin du template
  if (line.trim() === '</template>') {
    console.log(`Fin du template à la ligne ${lineNum}`)
    break
  }
  
  const opens = (line.match(/<div[^>\/]*>/g) || []).length
  const closes = (line.match(/<\/div>/g) || []).length
  
  balance += opens - closes
  
  // Afficher les lignes importantes
  if (checkLines.includes(lineNum) || opens > 0 || closes > 0) {
    const status = opens > closes ? 'OUVRE' : closes > opens ? 'FERME' : 'NEUTRE'
    if (checkLines.includes(lineNum)) {
      console.log(`⭐ ${lineNum}: [${balance}] ${status} (${opens}+/${closes}-) - ${line.trim()}`)
    } else if (lineNum > 640 && lineNum < 660) {
      console.log(`   ${lineNum}: [${balance}] ${status} (${opens}+/${closes}-) - ${line.trim()}`)
    }
  }
}

console.log(`\n🎯 Balance finale: ${balance}`)
console.log('Balance = 0 signifie équilibré')
