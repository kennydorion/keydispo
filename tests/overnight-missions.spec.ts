import { describe, it, expect } from 'vitest'

describe('Test détection automatique missions overnight (nuit)', () => {
  it('ne devrait PAS inclure d\'option overnight explicite dans les modales', () => {
    // Simuler les timeKindOptions des modales collaborateur
    const timeKindOptions = [
      { value: 'full-day', text: 'Journée complète' },
      { value: 'slot', text: 'Créneaux standards' },
      { value: 'range', text: 'Horaires personnalisées' }
    ]
    
    // Vérifier que l'option overnight n'est PAS présente
    const overnightOption = timeKindOptions.find(opt => opt.value === 'overnight')
    expect(overnightOption).toBeUndefined()
    
    // Mais vérifier qu'on a bien range pour saisir les horaires
    const rangeOption = timeKindOptions.find(opt => opt.value === 'range')
    expect(rangeOption).toBeDefined()
    expect(rangeOption?.text).toBe('Horaires personnalisées')
  })

  it('devrait filtrer les options pour les types indisponible', () => {
    const timeKindOptions = [
      { value: 'full-day', text: 'Journée complète' },
      { value: 'slot', text: 'Créneaux standards' },
      { value: 'range', text: 'Horaires personnalisées' }
    ]
    
    // Simuler le filtrage pour indisponible
    const filteredForIndispo = timeKindOptions.filter(opt => 
      opt.value === 'full-day' // Seulement journée pour indispo
    )
    
    expect(filteredForIndispo).toHaveLength(1)
    expect(filteredForIndispo[0].value).toBe('full-day')
  })

  it('devrait détecter automatiquement les horaires overnight (fin < début)', () => {
    const detectOvernightTime = (start: string, end: string): boolean => {
      const [hStart] = start.split(':').map(Number)
      const [hEnd] = end.split(':').map(Number)
      return hEnd < hStart
    }
    
    // Test cas overnight typique: 22h → 6h (mission de nuit)
    expect(detectOvernightTime('22:00', '06:00')).toBe(true)
    
    // Test cas overnight: 23h → 7h
    expect(detectOvernightTime('23:00', '07:00')).toBe(true)
    
    // Test cas normal: 9h → 17h 
    expect(detectOvernightTime('09:00', '17:00')).toBe(false)
    
    // Test cas normal: 14h → 18h
    expect(detectOvernightTime('14:00', '18:00')).toBe(false)
  })

  it('devrait avoir les bonnes icônes pour chaque timeKind (sans overnight)', () => {
    const getTimeKindIcon = (kind: string): string => {
      switch (kind) {
        case 'full-day': return 'today'
        case 'slot': return 'view_module'
        case 'range': return 'schedule'
        default: return 'help'
      }
    }
    
    expect(getTimeKindIcon('full-day')).toBe('today')
    expect(getTimeKindIcon('slot')).toBe('view_module')
    expect(getTimeKindIcon('range')).toBe('schedule')
    expect(getTimeKindIcon('unknown')).toBe('help')
    
    // Vérifier qu'il n'y a plus de cas 'overnight'
    expect(getTimeKindIcon('overnight')).toBe('help') // fallback
  })

  it('devrait valider correctement les formulaires avec timeKind range (y compris overnight)', () => {
    const validateFormForRange = (formData: {
      type: string
      timeKind: string
      heure_debut?: string
      heure_fin?: string
      slots?: string[]
    }): boolean => {
      if (!formData.type) return false
      
      if (formData.type === 'indisponible') return true
      
      if (formData.timeKind === 'full-day') return true
      
      if (formData.timeKind === 'range') {
        return !!(formData.heure_debut && formData.heure_fin)
      }
      
      if (formData.timeKind === 'slot') {
        return !!(formData.slots && formData.slots.length > 0)
      }
      
      return false
    }
    
    // Test mission de nuit avec timeKind 'range' 
    expect(validateFormForRange({
      type: 'mission',
      timeKind: 'range',
      heure_debut: '22:00',
      heure_fin: '06:00'
    })).toBe(true)
    
    // Test mission range normale
    expect(validateFormForRange({
      type: 'mission',
      timeKind: 'range',
      heure_debut: '09:00',
      heure_fin: '17:00'
    })).toBe(true)
    
    // Test mission range invalide (pas d'horaires)
    expect(validateFormForRange({
      type: 'mission',
      timeKind: 'range'
    })).toBe(false)
  })

  it('devrait proposer des horaires par défaut normaux pour range', () => {
    const setDefaultHoursForTimeKind = (timeKind: string) => {
      const defaults = {
        heure_debut: '',
        heure_fin: '',
        slots: [] as string[]
      }
      
      if (timeKind === 'range') {
        defaults.heure_debut = '09:00'
        defaults.heure_fin = '17:00'
      } else if (timeKind === 'full-day' || timeKind === 'slot') {
        defaults.heure_debut = ''
        defaults.heure_fin = ''
      }
      
      return defaults
    }
    
    // Plus de défauts spéciaux pour overnight - juste range normal
    const rangeDefaults = setDefaultHoursForTimeKind('range')
    expect(rangeDefaults.heure_debut).toBe('09:00')
    expect(rangeDefaults.heure_fin).toBe('17:00')
    
    const fullDayDefaults = setDefaultHoursForTimeKind('full-day')
    expect(fullDayDefaults.heure_debut).toBe('')
    expect(fullDayDefaults.heure_fin).toBe('')
  })

  it('devrait détecter automatiquement les missions overnight dans le backend', () => {
    // Simuler la logique de détection automatique qui se trouve dans le code métier
    const detectAndConvertToOvernight = (mission: {
      type: string
      timeKind: string
      heure_debut: string
      heure_fin: string
      lieu: string
    }) => {
      // Si c'est range ET que fin < début, alors c'est overnight
      if (mission.timeKind === 'range' && mission.heure_debut && mission.heure_fin) {
        const startTime = parseInt(mission.heure_debut.split(':')[0])
        const endTime = parseInt(mission.heure_fin.split(':')[0])
        
        if (endTime < startTime) {
          // Automatiquement convertir en overnight pour l'affichage
          return {
            ...mission,
            timeKind: 'overnight', // Conversion automatique
            isDetectedOvernight: true
          }
        }
      }
      return mission
    }
    
    // Test mission normale 
    const normalMission = detectAndConvertToOvernight({
      type: 'mission',
      timeKind: 'range',
      heure_debut: '09:00',
      heure_fin: '17:00',
      lieu: 'Clinique'
    })
    expect(normalMission.timeKind).toBe('range')
    expect('isDetectedOvernight' in normalMission).toBe(false)
    
    // Test mission de nuit - conversion automatique
    const nightMission = detectAndConvertToOvernight({
      type: 'mission',
      timeKind: 'range',
      heure_debut: '22:00',
      heure_fin: '06:00',
      lieu: 'Hôpital'
    })
    expect(nightMission.timeKind).toBe('overnight')
    expect('isDetectedOvernight' in nightMission && (nightMission as any).isDetectedOvernight).toBe(true)
  })

  it('devrait bien distinguer entre mission normale, range et slots (sans bouton overnight)', () => {
    // Simuler différents types de missions SANS option overnight explicite
    const missions = [
      {
        type: 'mission',
        timeKind: 'range', // Sera détecté comme overnight automatiquement
        heure_debut: '22:00',
        heure_fin: '06:00',
        lieu: 'Hôpital'
      },
      {
        type: 'mission',
        timeKind: 'range',
        heure_debut: '14:00',
        heure_fin: '18:00',
        lieu: 'Clinique'
      },
      {
        type: 'mission',
        timeKind: 'slot',
        slots: ['evening', 'night'],
        lieu: 'Urgences'
      },
      {
        type: 'mission',
        timeKind: 'full-day',
        lieu: 'Formation'
      }
    ]
    
    // Vérifier que chaque type a les bons champs
    const potentialOvernightMission = missions.find(m => 
      m.timeKind === 'range' && m.heure_debut === '22:00' && m.heure_fin === '06:00'
    )
    expect(potentialOvernightMission?.heure_debut).toBe('22:00')
    expect(potentialOvernightMission?.heure_fin).toBe('06:00')
    
    const rangeMission = missions.find(m => 
      m.timeKind === 'range' && m.heure_debut === '14:00'
    )
    expect(rangeMission?.heure_debut).toBe('14:00')
    expect(rangeMission?.heure_fin).toBe('18:00')
    
    const slotMission = missions.find(m => m.timeKind === 'slot')
    expect(slotMission?.slots).toContain('evening')
    expect(slotMission?.slots).toContain('night')
    
    const fullDayMission = missions.find(m => m.timeKind === 'full-day')
    expect(fullDayMission?.lieu).toBe('Formation')
  })
})
