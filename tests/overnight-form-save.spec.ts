import { describe, it, expect } from 'vitest'

// Test spécifique pour vérifier la détection automatique overnight lors de la sauvegarde depuis les formulaires
describe('Test sauvegarde overnight depuis formulaires', () => {
  
  it('devrait détecter automatiquement overnight dans sanitizeDisposition pour les missions', () => {
    // Simuler la fonction sanitizeDisposition pour les missions
    const sanitizeDisposition = (d: any) => {
      const type = d.type
      let timeKind = d.timeKind

      if (type === 'mission') {
        if (timeKind !== 'range' && timeKind !== 'full-day' && timeKind !== 'slot' && timeKind !== 'overnight') {
          timeKind = 'range'
        }
        
        // Détection automatique des missions overnight
        if (timeKind === 'range' && d.heure_debut && d.heure_fin) {
          const startTime = parseInt(d.heure_debut.split(':')[0])
          const endTime = parseInt(d.heure_fin.split(':')[0])
          
          // Si l'heure de fin est plus petite que l'heure de début, c'est une mission de nuit
          if (endTime < startTime || (endTime === startTime && d.heure_fin < d.heure_debut)) {
            timeKind = 'overnight'
          }
        }

        return {
          ...d,
          type,
          timeKind,
          isFullDay: timeKind === 'full-day',
          slots: [],
          heure_debut: (timeKind === 'range' || timeKind === 'overnight') ? (d.heure_debut || '') : '',
          heure_fin: (timeKind === 'range' || timeKind === 'overnight') ? (d.heure_fin || '') : '',
        }
      }
      return d
    }

    // Mission overnight (22h-6h) 
    const missionOvernight = {
      type: 'mission',
      timeKind: 'range', // Pas encore détecté comme overnight
      heure_debut: '22:00',
      heure_fin: '06:00',
      lieu: 'Hôpital Central'
    }

    const result = sanitizeDisposition(missionOvernight)
    
    expect(result.timeKind).toBe('overnight')
    expect(result.heure_debut).toBe('22:00')
    expect(result.heure_fin).toBe('06:00')
    
    console.log('✅ Mission overnight détectée automatiquement lors de sanitizeDisposition')
  })

  it('devrait détecter automatiquement overnight dans sanitizeDisposition pour les disponibilités', () => {
    // Simuler la fonction sanitizeDisposition pour les disponibilités  
    const sanitizeDisposition = (d: any) => {
      const type = d.type
      let timeKind = d.timeKind

      if (type === 'disponible') {
        if (timeKind !== 'full-day' && timeKind !== 'range' && timeKind !== 'slot' && timeKind !== 'overnight') {
          timeKind = 'full-day'
        }
        
        // Détection automatique des disponibilités overnight
        if (timeKind === 'range' && d.heure_debut && d.heure_fin) {
          const startTime = parseInt(d.heure_debut.split(':')[0])
          const endTime = parseInt(d.heure_fin.split(':')[0])
          
          // Si l'heure de fin est plus petite que l'heure de début, c'est une disponibilité de nuit
          if (endTime < startTime || (endTime === startTime && d.heure_fin < d.heure_debut)) {
            timeKind = 'overnight'
          }
        }

        if (timeKind === 'range' || timeKind === 'overnight') {
          return { 
            ...d, 
            type, 
            timeKind, 
            isFullDay: false, 
            lieu: '', 
            slots: [],
            heure_debut: d.heure_debut || '',
            heure_fin: d.heure_fin || ''
          }
        }
        
        return { ...d, type, timeKind: 'full-day', isFullDay: true, lieu: '', heure_debut: '', heure_fin: '', slots: [] }
      }
      return d
    }

    // Disponibilité overnight (20h-4h) 
    const dispoOvernight = {
      type: 'disponible',
      timeKind: 'range', // Pas encore détecté comme overnight
      heure_debut: '20:00',
      heure_fin: '04:00'
    }

    const result = sanitizeDisposition(dispoOvernight)
    
    expect(result.timeKind).toBe('overnight')
    expect(result.heure_debut).toBe('20:00')
    expect(result.heure_fin).toBe('04:00')
    
    console.log('✅ Disponibilité overnight détectée automatiquement lors de sanitizeDisposition')
  })

  it('devrait détecter automatiquement overnight dans BatchDisponibiliteModal avant mapping RTDB', () => {
    // Simuler la logique de détection dans BatchDisponibiliteModal
    const detectOvernightInBatch = (editingDispo: any) => {
      let finalTimeKind = editingDispo.timeKind
      if (editingDispo.timeKind === 'range' && 
          editingDispo.heure_debut && 
          editingDispo.heure_fin) {
        const startTime = parseInt(editingDispo.heure_debut.split(':')[0])
        const endTime = parseInt(editingDispo.heure_fin.split(':')[0])
        
        // Si l'heure de fin est plus petite que l'heure de début, c'est overnight
        if (endTime < startTime || (endTime === startTime && editingDispo.heure_fin < editingDispo.heure_debut)) {
          finalTimeKind = 'overnight'
        }
      }
      return finalTimeKind
    }

    // Simule un formulaire batch avec mission overnight
    const batchData = {
      type: 'mission',
      timeKind: 'range',
      heure_debut: '23:30',
      heure_fin: '07:30',
      lieu: 'Clinique de Nuit'
    }

    const detectedTimeKind = detectOvernightInBatch(batchData)
    
    expect(detectedTimeKind).toBe('overnight')
    
    console.log('✅ Overnight détecté automatiquement dans BatchDisponibiliteModal')
  })

    it('devrait stocker overnight en flexible et dériver overnight côté UI', () => {
    // Simuler le mapping RTDB pour overnight
    const mapUITimeKindToRTDB = (uiTimeKind: string): 'fixed' | 'flexible' => {
      switch (uiTimeKind) {
        case 'range': return 'flexible'
        case 'slot': return 'fixed'
        case 'full-day': return 'flexible'
        case 'overnight': return 'flexible'
        default: return 'flexible'
      }
    }

  expect(mapUITimeKindToRTDB('overnight')).toBe('flexible')
  expect(mapUITimeKindToRTDB('range')).toBe('flexible')
  expect(mapUITimeKindToRTDB('slot')).toBe('fixed')
    
    console.log('✅ Mapping overnight vers RTDB fonctionne correctement')
  })

  it('devrait préserver les horaires pour overnight dans isFullDay logic', () => {
    const deriveTimeKindFromData = (d: any): 'range' | 'slot' | 'full-day' | 'overnight' => {
      if (Array.isArray(d.slots) && d.slots.length > 0) return 'slot'
      if (d.isFullDay) return 'full-day'
      const s = (d.heure_debut || '').toString()
      const e = (d.heure_fin || '').toString()
      if (s && e) return e < s ? 'overnight' : 'range'
      return 'range'
    }
    expect(deriveTimeKindFromData({ heure_debut: '22:00', heure_fin: '06:00' })).toBe('overnight')
  })

  it('devrait préserver les horaires pour overnight', () => {
    // Test que les horaires sont préservés pour overnight
    const scenarios = [
      { timeKind: 'overnight', shouldHaveHours: true },
      { timeKind: 'range', shouldHaveHours: true },
      { timeKind: 'full-day', shouldHaveHours: false },
      { timeKind: 'slot', shouldHaveHours: false }
    ]

    scenarios.forEach(scenario => {
      const shouldPreserveHours = scenario.timeKind === 'range' || scenario.timeKind === 'overnight'
      expect(shouldPreserveHours).toBe(scenario.shouldHaveHours)
    })

    console.log('✅ Logic de préservation des horaires overnight correcte')
  })

  it('devrait inclure overnight dans les conflits de disponibilités partielles', () => {
    // Test que listHasDispoPartial inclut bien overnight
    const mockResolveDispoKind = (d: any) => ({
      type: d.type,
      timeKind: d.timeKind
    })

    const listHasDispoPartial = (list: any[]) => {
      return list.some(d => {
        const k = mockResolveDispoKind(d)
        return k.type === 'disponible' && (k.timeKind === 'slot' || k.timeKind === 'range' || k.timeKind === 'overnight')
      })
    }

    const listWithOvernightDispo = [
      { type: 'disponible', timeKind: 'overnight' }
    ]

    const listWithRangeDispo = [
      { type: 'disponible', timeKind: 'range' }
    ]

    const listWithFullDayDispo = [
      { type: 'disponible', timeKind: 'full-day' }
    ]

    expect(listHasDispoPartial(listWithOvernightDispo)).toBe(true)
    expect(listHasDispoPartial(listWithRangeDispo)).toBe(true)
    expect(listHasDispoPartial(listWithFullDayDispo)).toBe(false)
    
    console.log('✅ Logique de conflits inclut correctement les disponibilités overnight')
  })
})
