import { describe, it, expect } from 'vitest'

describe('Logique d\'Affichage du Filtre Lieu', () => {
  it('devrait afficher le lieu seulement si statut = "En mission"', () => {
    // Fonction utilitaire pour reproduire la logique du composant
    function shouldShowLieuFilter(statut: any): boolean {
      // Extraire la valeur du statut (peut être un objet ou une string)
      const statutValue = typeof statut === 'object' && statut
        ? statut?.value || statut?.text || ''
        : statut || ''
      
      // Normaliser la valeur
      const normalizedStatut = statutValue.toString().toLowerCase()
      
      return normalizedStatut === 'mission' || normalizedStatut === 'en mission'
    }
    
    // Test avec objet statut "En mission"
    expect(shouldShowLieuFilter({ text: 'En mission', value: 'mission' })).toBe(true)
    
    // Test avec string "mission"
    expect(shouldShowLieuFilter('mission')).toBe(true)
    
    // Test avec string "En mission"
    expect(shouldShowLieuFilter('En mission')).toBe(true)
    
    // Test avec autres statuts - ne devrait PAS afficher le lieu
    expect(shouldShowLieuFilter('disponible')).toBe(false)
    expect(shouldShowLieuFilter('indisponible')).toBe(false)
    expect(shouldShowLieuFilter({ text: 'Disponible', value: 'disponible' })).toBe(false)
    expect(shouldShowLieuFilter('')).toBe(false)
    expect(shouldShowLieuFilter(null)).toBe(false)
    expect(shouldShowLieuFilter(undefined)).toBe(false)
  })
  
  it('devrait être insensible à la casse', () => {
    function shouldShowLieuFilter(statut: any): boolean {
      const statutValue = typeof statut === 'object' && statut
        ? statut?.value || statut?.text || ''
        : statut || ''
      
      const normalizedStatut = statutValue.toString().toLowerCase()
      
      return normalizedStatut === 'mission' || normalizedStatut === 'en mission'
    }
    
    // Différentes variations de casse
    expect(shouldShowLieuFilter('MISSION')).toBe(true)
    expect(shouldShowLieuFilter('Mission')).toBe(true)
    expect(shouldShowLieuFilter('EN MISSION')).toBe(true)
    expect(shouldShowLieuFilter('En Mission')).toBe(true)
    expect(shouldShowLieuFilter('en mission')).toBe(true)
    expect(shouldShowLieuFilter('mission')).toBe(true)
  })
})
