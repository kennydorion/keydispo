#!/usr/bin/env node

// Script pour trouver la balise div manquante
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔍 Recherche de la balise div manquante...\n')

const filePath = path.join(__dirname, 'src/views/SemaineVirtualClean.vue')
const content = fs.readFileSync(filePath, 'utf8')
const lines = content.split('\n')

// Stack pour suivre les balises ouvertes
const stack = []
let divBalance = 0

// Analyser ligne par ligne
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const lineNum = i + 1
  
  // Chercher les balises div
  const openDivs = line.match(/<div[^>]*>/g)
  const closeDivs = line.match(/<\/div>/g)
  
  if (openDivs) {
    openDivs.forEach(() => {
      divBalance++
      stack.push({ line: lineNum, content: line.trim() })
    })
  }
  
  if (closeDivs) {
    closeDivs.forEach(() => {
      divBalance--
      if (stack.length > 0) {
        stack.pop()
      }
    })
  }
  
  // Afficher si le template se termine
  if (line.trim() === '</template>') {
    console.log(`📍 Fin du template à la ligne ${lineNum}`)
    console.log(`📊 Balance des div: ${divBalance}`)
    
    if (divBalance > 0) {
      console.log(`\n❌ Il manque ${divBalance} balise(s) </div>`)
      console.log('\n🔍 Balises div non fermées:')
      
      // Afficher les 5 dernières balises non fermées
      const lastUnclosed = stack.slice(-5)
      lastUnclosed.forEach((item, index) => {
        console.log(`   ${index + 1}. Ligne ${item.line}: ${item.content}`)
      })
    } else if (divBalance === 0) {
      console.log('\n✅ Toutes les balises div sont correctement fermées !')
    }
    break
  }
}

// Chercher les sections problématiques
console.log('\n🎯 ANALYSE DES SECTIONS:')

// Vérifier le main-content
const mainContentStart = content.indexOf('<div class="main-content">')
const mainContentEnd = content.indexOf('</div> <!-- Fin main-content -->')

if (mainContentStart === -1) {
  console.log('❌ main-content: Balise d\'ouverture non trouvée')
} else if (mainContentEnd === -1) {
  console.log('❌ main-content: Balise de fermeture non trouvée')
} else {
  console.log('✅ main-content: Balises trouvées')
}

// Vérifier le planning-app
const planningAppStart = content.indexOf('<div class="planning-app">')
const planningAppEnd = content.indexOf('</div> <!-- Fin planning-app -->')

if (planningAppStart === -1) {
  console.log('❌ planning-app: Balise d\'ouverture non trouvée')
} else if (planningAppEnd === -1) {
  console.log('❌ planning-app: Balise de fermeture non trouvée')
} else {
  console.log('✅ planning-app: Balises trouvées')
}

// Suggestions de correction
console.log('\n💡 SUGGESTIONS:')
console.log('1. Vérifier les balises autour des modales et indicateurs')
console.log('2. S\'assurer que chaque <div> a son </div> correspondant')
console.log('3. Vérifier les sections conditionnelles (v-if, v-for)')

console.log('\n✅ Analyse terminée!')
