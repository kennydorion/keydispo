import { describe, it, expect } from 'vitest'
import { getTemporalDisplay, resolveDispoKind } from '../src/services/planningDisplayService'

describe('Admin display: RTDB timeKind mapping for slots/range', () => {
  it('maps timeKind=fixed with slots=[midday] to slot and displays "Midi"', () => {
    const dispo: any = {
      date: '2025-09-16',
      lieu: '',
      type: 'standard', // RTDB alt type => disponible
      timeKind: 'fixed',
      slots: ['midday'],
      heure_debut: '',
      heure_fin: ''
    }

    const kind = resolveDispoKind(dispo)
    expect(kind.timeKind).toBe('slot')
    expect(kind.slots).toEqual(['midday'])

    const label = getTemporalDisplay(dispo)
    expect(label).toBe('Midi')
  })

  it('maps timeKind=flexible with hours to range and formats time', () => {
    const dispo: any = {
      date: '2025-09-16',
      lieu: 'DISPONIBLE',
      type: 'standard',
      timeKind: 'flexible',
      slots: [],
      heure_debut: '09:00',
      heure_fin: '17:00'
    }

    const kind = resolveDispoKind(dispo)
    expect(kind.timeKind).toBe('range')
    const label = getTemporalDisplay(dispo)
    expect(label).toBe('09:00-17:00')
  })

  it('maps timeKind=flexible with slots to slot and displays first slot + count', () => {
    const dispo: any = {
      date: '2025-09-16',
      lieu: '',
      type: 'standard',
      timeKind: 'flexible',
      slots: ['morning', 'midday'],
      heure_debut: '',
      heure_fin: ''
    }

    const kind = resolveDispoKind(dispo)
    expect(kind.timeKind).toBe('slot')
    const label = getTemporalDisplay(dispo)
    expect(label).toBe('Matin +1')
  })
})
