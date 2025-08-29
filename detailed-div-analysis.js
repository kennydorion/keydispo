#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const filePath = path.join(__dirname, 'src/views/SemaineVirtualClean.vue')
const content = fs.readFileSync(filePath, 'utf8')
const lines = content.split('\n')

console.log('🔍 Analyse détaillée des balises div...\n')

const stack = []
let lineNum = 0

for (const line of lines) {
  lineNum++
  
  // Arrêter à la fin du template
  if (line.trim() === '</template>') break
  
  // Chercher les ouvertures de div
  const openMatches = line.match(/<div[^>]*>/g) || []
  for (const match of openMatches) {
    // Ignorer les divs auto-fermantes
    if (!match.includes('/>')) {
      stack.push({ line: lineNum, tag: match.substring(0, 50) + '...' })
    }
  }
  
  // Chercher les fermetures
  const closeMatches = line.match(/<\/div>/g) || []
  for (let i = 0; i < closeMatches.length; i++) {
    if (stack.length > 0) {
      stack.pop()
    } else {
      console.log(`❌ FERMETURE ORPHELINE ligne ${lineNum}: ${line.trim()}`)
    }
  }
}

console.log('\n🎯 BALISES NON FERMÉES:')
stack.forEach((item, index) => {
  console.log(`${index + 1}. Ligne ${item.line}: ${item.tag}`)
})

console.log(`\n📊 Total de balises non fermées: ${stack.length}`)
