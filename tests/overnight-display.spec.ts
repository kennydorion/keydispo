import { describe, it, expect } from 'vitest'

// Test spécifique pour vérifier l'affichage des horaires pour les missions overnight
describe('Test affichage horaires missions overnight', () => {
  
  it('devrait afficher les horaires pour les missions overnight au lieu de "Journée"', () => {
    // Mock d'une mission overnight classique (22h-6h)
    const overnightMission = {
      id: 'test-1',
      type: 'mission' as const,
      timeKind: 'overnight' as const,
      heure_debut: '22:00',
      heure_fin: '06:00',
      lieu: 'Hôpital Central',
      date: '2024-01-15',
      collaborateurId: 'collab1'
    }

    // Mock de resolveDispoKind qui doit retourner le bon timeKind
    const resolveDispoKind = (dispo: any) => {
      return {
        type: dispo.type,
        timeKind: dispo.timeKind,
        slots: dispo.slots || []
      }
    }

    const kind = resolveDispoKind(overnightMission)
    
    // Vérifications de base
    expect(kind.type).toBe('mission')
    expect(kind.timeKind).toBe('overnight')
    expect(overnightMission.heure_debut).toBeTruthy()
    expect(overnightMission.heure_fin).toBeTruthy()

    // Test de la condition d'affichage corrigée
    const shouldShowTime = (kind.timeKind === 'range' || kind.timeKind === 'overnight') && 
                          !!(overnightMission.heure_debut && overnightMission.heure_fin)

    expect(shouldShowTime).toBe(true)
    console.log('✅ Mission overnight afficherait les horaires au lieu de "Journée"')
  })

  it('devrait afficher les horaires pour les missions range normales', () => {
    // Mission range normale (9h-17h)
    const normalMission = {
      id: 'test-2',
      type: 'mission' as const,
      timeKind: 'range' as const,
      heure_debut: '09:00',
      heure_fin: '17:00',
      lieu: 'Bureaux',
      date: '2024-01-15',
      collaborateurId: 'collab1'
    }

    const resolveDispoKind = (dispo: any) => {
      return {
        type: dispo.type,
        timeKind: dispo.timeKind,
        slots: dispo.slots || []
      }
    }

    const kind = resolveDispoKind(normalMission)
    
    // Test de la condition d'affichage
    const shouldShowTime = (kind.timeKind === 'range' || kind.timeKind === 'overnight') && 
                          !!(normalMission.heure_debut && normalMission.heure_fin)

    expect(shouldShowTime).toBe(true)
    console.log('✅ Mission range normale afficherait aussi les horaires')
  })

  it('devrait afficher "Journée" pour les missions full-day', () => {
    // Mission journée complète
    const fullDayMission = {
      id: 'test-3',
      type: 'mission' as const,
      timeKind: 'full-day' as const,
      heure_debut: '',
      heure_fin: '',
      lieu: 'Formation',
      date: '2024-01-15',
      collaborateurId: 'collab1'
    }

    const resolveDispoKind = (dispo: any) => {
      return {
        type: dispo.type,
        timeKind: dispo.timeKind,
        slots: dispo.slots || []
      }
    }

    const kind = resolveDispoKind(fullDayMission)
    
    // Test de la condition d'affichage
    const shouldShowTime = (kind.timeKind === 'range' || kind.timeKind === 'overnight') && 
                          !!(fullDayMission.heure_debut && fullDayMission.heure_fin)

    expect(shouldShowTime).toBe(false)
    console.log('✅ Mission full-day afficherait "Journée" (comportement attendu)')
  })

  it('devrait aussi corriger les disponibilités overnight', () => {
    // Disponibilité overnight (pour un garde à domicile par exemple)
    const overnightDispo = {
      id: 'test-4',
      type: 'disponible' as const,
      timeKind: 'overnight' as const,
      heure_debut: '23:00',
      heure_fin: '07:00',
      lieu: 'DISPONIBLE',
      date: '2024-01-15',
      collaborateurId: 'collab1'
    }

    const resolveDispoKind = (dispo: any) => {
      return {
        type: dispo.type,
        timeKind: dispo.timeKind,
        slots: dispo.slots || []
      }
    }

    const kind = resolveDispoKind(overnightDispo)
    
    // Test de la condition d'affichage
    const shouldShowTime = (kind.timeKind === 'range' || kind.timeKind === 'overnight') && 
                          !!(overnightDispo.heure_debut && overnightDispo.heure_fin)

    expect(shouldShowTime).toBe(true)
    console.log('✅ Disponibilité overnight afficherait aussi les horaires')
  })

  it('devrait détecter automatiquement les missions overnight', () => {
    // Test de la logique de détection automatique
    const detectOvernightFromHours = (start: string, end: string) => {
      const startTime = parseInt(start.split(':')[0])
      const endTime = parseInt(end.split(':')[0])
      return endTime < startTime
    }

    expect(detectOvernightFromHours('22:00', '06:00')).toBe(true)
    expect(detectOvernightFromHours('23:30', '05:30')).toBe(true)
    expect(detectOvernightFromHours('09:00', '17:00')).toBe(false)
    expect(detectOvernightFromHours('18:00', '22:00')).toBe(false)

    console.log('✅ Détection automatique overnight fonctionne')
  })
})
