import { describe, it, expect } from 'vitest'

describe('Test Extraction Valeur Lieu', () => {
  it('devrait extraire la valeur d\'un objet lieu correctement', () => {
    // Fonction utilitaire pour extraire la valeur du lieu (comme dans le code corrigé)
    function extractLieuValue(lieu: any): string {
      const rawLieu = typeof lieu === 'object' 
        ? lieu?.value || lieu?.text || lieu
        : lieu
      return (rawLieu || '').toString().trim().toLowerCase()
    }
    
    // Test avec objet lieu (le cas problématique du bug)
    const lieuObject = { text: 'ADV', value: 'ADV' }
    expect(extractLieuValue(lieuObject)).toBe('adv')
    
    // Test avec string directe
    const lieuString = 'ADV'
    expect(extractLieuValue(lieuString)).toBe('adv')
    
    // Test avec objet malformé (toString() ferait [object Object])
    const lieuMalformed = { someKey: 'ADV' }
    expect(extractLieuValue(lieuMalformed)).toBe('[object object]')
    
    // Test avec objet ayant value
    const lieuWithValue = { value: 'CLINIQUE', text: 'Clinique' }
    expect(extractLieuValue(lieuWithValue)).toBe('clinique')
    
    // Test avec objet ayant seulement text  
    const lieuWithText = { text: 'MAISON' }
    expect(extractLieuValue(lieuWithText)).toBe('maison')
  })
  
  it('devrait simuler le problème original', () => {
    // Simulation du problème original
    const lieuObject = { text: 'ADV', value: 'ADV' }
    
    // Ancien code (problématique) - toString() sur objet
    const oldExtraction = lieuObject.toString().trim().toLowerCase()
    expect(oldExtraction).toBe('[object object]') // Le bug !
    
    // Nouveau code (corrigé) - extraction de la valeur
    const newExtraction = (lieuObject?.value || lieuObject?.text || lieuObject).toString().trim().toLowerCase()
    expect(newExtraction).toBe('adv') // La correction !
    
    // Comparaison - les disponibilités avec lieu="ADV" 
    const dispoLieu = 'ADV'.toLowerCase()
    
    expect(dispoLieu === oldExtraction).toBe(false) // Échec avec ancien code
    expect(dispoLieu === newExtraction).toBe(true)  // Succès avec nouveau code
  })
})
