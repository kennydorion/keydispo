#!/usr/bin/env node

// Script simple pour analyser l'équilibre exact des balises
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const filePath = path.join(__dirname, 'src/views/SemaineVirtualClean.vue')
const content = fs.readFileSync(filePath, 'utf8')
const lines = content.split('\n')

console.log('🔍 Analyse séquentielle des balises div...\n')

const stack = []
let inTemplate = false

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const lineNum = i + 1
  
  // Détecter le début et la fin du template
  if (line.includes('<template>')) inTemplate = true
  if (line.trim() === '</template>') break
  
  if (!inTemplate) continue
  
  // Chercher les balises div ouvertes
  const openMatches = line.match(/<div[^>]*>/g)
  if (openMatches) {
    openMatches.forEach(match => {
      // Extraire les classes/id pour identifier la balise
      const classMatch = match.match(/class="([^"]*)"/)
      const idMatch = match.match(/id="([^"]*)"/)
      const identifier = classMatch ? classMatch[1] : (idMatch ? idMatch[1] : 'no-class')
      
      stack.push({ line: lineNum, type: 'open', identifier, content: line.trim() })
      console.log(`${lineNum.toString().padStart(4)} OPEN  [${stack.length}] ${identifier}`)
    })
  }
  
  // Chercher les balises div fermées
  const closeMatches = line.match(/<\/div>/g)
  if (closeMatches) {
    closeMatches.forEach(() => {
      if (stack.length > 0) {
        const opened = stack.pop()
        console.log(`${lineNum:4} CLOSE [${stack.length}] ${opened.identifier} (ouverte ligne ${opened.line})`)
      } else {
        console.log(`${lineNum:4} ❌ ERREUR: Fermeture sans ouverture correspondante`)
      }
    })
  }
}

console.log(`\n📊 RÉSULTAT:`)
if (stack.length === 0) {
  console.log('✅ Toutes les balises div sont équilibrées !')
} else {
  console.log(`❌ ${stack.length} balise(s) div non fermée(s):`)
  stack.forEach((item, index) => {
    console.log(`   ${index + 1}. Ligne ${item.line}: ${item.identifier}`)
  })
}

console.log('\n✅ Analyse terminée!')
