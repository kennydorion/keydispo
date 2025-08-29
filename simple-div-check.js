#!/usr/bin/env node

// Script simple pour trouver les balises déséquilibrées
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const filePath = path.join(__dirname, 'src/views/SemaineVirtualClean.vue')
const content = fs.readFileSync(filePath, 'utf8')
const lines = content.split('\n')

console.log('🔍 Recherche des balises div déséquilibrées...\n')

let balance = 0
const problematicLines = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const lineNum = i + 1
  
  // Arrêter à la fin du template
  if (line.trim() === '</template>') break
  
  // Compter les ouvertures et fermetures
  const opens = (line.match(/<div[^>]*>/g) || []).length
  const closes = (line.match(/<\/div>/g) || []).length
  
  balance += opens - closes
  
  // Enregistrer les lignes où le déséquilibre change
  if (opens > 0 || closes > 0) {
    problematicLines.push({
      line: lineNum,
      content: line.trim(),
      opens,
      closes,
      balance
    })
  }
}

console.log('📊 LIGNES AVEC DES BALISES DIV:')
problematicLines.slice(-20).forEach(item => {
  const direction = item.opens > item.closes ? 'OUVRE' : 'FERME'
  console.log(`${item.line}: [${item.balance}] ${direction} - ${item.content.substring(0, 80)}...`)
})

console.log(`\n🎯 Balance finale: ${balance}`)

if (balance > 0) {
  console.log(`❌ Il manque ${balance} balise(s) fermante(s)`)
} else if (balance < 0) {
  console.log(`❌ Il y a ${Math.abs(balance)} balise(s) fermante(s) en trop`)
} else {
  console.log('✅ Les balises sont équilibrées !')
}

console.log('\n✅ Analyse terminée!')
