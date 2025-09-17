import { describe, it, expect } from 'vitest'

// Test pour vérifier que le mapping des types fonctionne correctement
describe('Test mapping des types UI <-> RTDB', () => {
  // Fonction de mapping UI vers RTDB (copiée du code réel)
  const mapUITypeToRTDB = (uiType: string): 'standard' | 'formation' | 'urgence' | 'maintenance' => {
    switch (uiType) {
      case 'mission': return 'urgence'  // Mission = urgence pour distinction
      case 'disponible': return 'standard'  // Disponible = standard
      case 'indisponible': return 'maintenance'  // Indisponible = maintenance
      default: return 'standard'
    }
  }

  // Fonction de mapping RTDB vers UI (copiée du code réel)
  const mapRTDBTypeToUI = (rtdbType?: string): 'disponible' | 'indisponible' | 'mission' => {
    switch (rtdbType) {
      case 'urgence': return 'mission'        // urgence = mission pour l'UI
      case 'standard': return 'disponible'    // standard = disponible pour l'UI  
      case 'maintenance': return 'indisponible' // maintenance = indisponible pour l'UI
      case 'formation': return 'disponible'   // formation = disponible pour l'UI
      default: return 'disponible'
    }
  }

  it('devrait mapper correctement UI vers RTDB', () => {
    console.log('\n=== TEST: Mapping UI → RTDB ===')
    
    expect(mapUITypeToRTDB('disponible')).toBe('standard')
    expect(mapUITypeToRTDB('indisponible')).toBe('maintenance')
    expect(mapUITypeToRTDB('mission')).toBe('urgence')
    expect(mapUITypeToRTDB('inconnu')).toBe('standard')
    
    console.log('✅ Mapping UI → RTDB correct')
  })

  it('devrait mapper correctement RTDB vers UI', () => {
    console.log('\n=== TEST: Mapping RTDB → UI ===')
    
    expect(mapRTDBTypeToUI('standard')).toBe('disponible')
    expect(mapRTDBTypeToUI('maintenance')).toBe('indisponible')
    expect(mapRTDBTypeToUI('urgence')).toBe('mission')
    expect(mapRTDBTypeToUI('formation')).toBe('disponible')
    expect(mapRTDBTypeToUI('inconnu')).toBe('disponible')
    expect(mapRTDBTypeToUI(undefined)).toBe('disponible')
    
    console.log('✅ Mapping RTDB → UI correct')
  })

  it('devrait être bidirectionnel (UI → RTDB → UI)', () => {
    console.log('\n=== TEST: Bidirectionnalité ===')
    
    const typesUI = ['disponible', 'indisponible', 'mission']
    
    for (const typeUI of typesUI) {
      const typeRTDB = mapUITypeToRTDB(typeUI)
      const typeUIBack = mapRTDBTypeToUI(typeRTDB)
      
      expect(typeUIBack).toBe(typeUI)
      console.log(`${typeUI} → ${typeRTDB} → ${typeUIBack} ✅`)
    }
    
    console.log('✅ Bidirectionnalité préservée')
  })

  it('devrait gérer les scénarios de sauvegarde/affichage', () => {
    console.log('\n=== TEST: Scénarios réels ===')
    
    // Scénario 1: Utilisateur sélectionne "Indisponible" 
    const userSelection1 = 'indisponible'
    const savedInDB1 = mapUITypeToRTDB(userSelection1)
    const displayedToUser1 = mapRTDBTypeToUI(savedInDB1)
    
    expect(savedInDB1).toBe('maintenance')
    expect(displayedToUser1).toBe('indisponible')
    console.log(`Scénario indispo: ${userSelection1} → DB:${savedInDB1} → Affichage:${displayedToUser1} ✅`)
    
    // Scénario 2: Utilisateur sélectionne "Disponible"
    const userSelection2 = 'disponible'
    const savedInDB2 = mapUITypeToRTDB(userSelection2)
    const displayedToUser2 = mapRTDBTypeToUI(savedInDB2)
    
    expect(savedInDB2).toBe('standard')
    expect(displayedToUser2).toBe('disponible')
    console.log(`Scénario dispo: ${userSelection2} → DB:${savedInDB2} → Affichage:${displayedToUser2} ✅`)
    
    console.log('✅ Scénarios réels fonctionnent')
  })
})
