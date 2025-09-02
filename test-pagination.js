// Test de la logique de pagination
console.log('🧪 Test pagination logic...')

// Simuler les données
const collaborateurs = Array.from({ length: 85 }, (_, i) => ({
  id: `collab-${i}`,
  nom: `Nom${i}`,
  prenom: `Prenom${i}`,
  metier: i % 3 === 0 ? 'EDUC' : i % 3 === 1 ? 'AS' : 'IDE',
  actif: true
}))

// Simuler les refs Vue
let currentPage = 1
let perPage = 20
let searchQuery = ''
let selectedMetier = ''

// Simuler les computed
function filteredCollaborateurs() {
  let filtered = collaborateurs.filter(c => c.actif)
  
  if (searchQuery) {
    const search = searchQuery.toLowerCase()
    filtered = filtered.filter(c => 
      c.nom.toLowerCase().includes(search) ||
      c.prenom.toLowerCase().includes(search) ||
      c.metier.toLowerCase().includes(search)
    )
  }
  
  if (selectedMetier) {
    filtered = filtered.filter(c => c.metier === selectedMetier)
  }
  
  return filtered
}

function totalPages() {
  return Math.max(1, Math.ceil(filteredCollaborateurs().length / perPage))
}

function startIndex() {
  const validPage = Math.max(1, Math.min(currentPage, totalPages()))
  return (validPage - 1) * perPage
}

function endIndex() {
  return Math.min(startIndex() + perPage, filteredCollaborateurs().length)
}

function paginatedCollaborateurs() {
  const filtered = filteredCollaborateurs()
  if (filtered.length === 0) return []
  
  const start = startIndex()
  const end = endIndex()
  
  if (start >= filtered.length) return []
  
  return filtered.slice(start, end)
}

// Tests
console.log('=== Test 1: Tous les collaborateurs ===')
console.log(`Total: ${collaborateurs.length}`)
console.log(`Filtrés: ${filteredCollaborateurs().length}`)
console.log(`Pages totales: ${totalPages()}`)
console.log(`Page actuelle: ${currentPage}`)
console.log(`Éléments page 1: ${paginatedCollaborateurs().length}`)

console.log('\\n=== Test 2: Page 2 ===')
currentPage = 2
console.log(`Page actuelle: ${currentPage}`)
console.log(`Start index: ${startIndex()}`)
console.log(`End index: ${endIndex()}`)
console.log(`Éléments page 2: ${paginatedCollaborateurs().length}`)

console.log('\\n=== Test 3: Filtre par métier ===')
selectedMetier = 'EDUC'
currentPage = 1 // Reset page
console.log(`Métier sélectionné: ${selectedMetier}`)
console.log(`Filtrés: ${filteredCollaborateurs().length}`)
console.log(`Pages totales: ${totalPages()}`)
console.log(`Éléments page 1: ${paginatedCollaborateurs().length}`)

console.log('\\n=== Test 4: Page trop élevée ===')
currentPage = 10 // Page qui n'existe pas
console.log(`Page demandée: ${currentPage}`)
console.log(`Pages totales: ${totalPages()}`)
console.log(`Start index: ${startIndex()}`)
console.log(`Éléments: ${paginatedCollaborateurs().length}`)

console.log('\\n✅ Tests pagination terminés')
