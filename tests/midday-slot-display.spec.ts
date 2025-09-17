import { describe, it, expect } from 'vitest'
import { getTemporalDisplay } from '../src/services/planningDisplayService'

describe('Affichage créneau midday', () => {
  it('devrait afficher "Midi" pour un slot midday', () => {
    const dispo = {
      date: '2025-01-01',
      lieu: '',
      type: 'disponible',
      timeKind: 'slot',
      slots: ['midday']
    } as any
    const label = getTemporalDisplay(dispo)
    expect(label).toBe('Midi')
  })

  it('devrait afficher "Midi +1" pour deux slots (midday, afternoon)', () => {
    const dispo = {
      date: '2025-01-01',
      lieu: '',
      type: 'disponible',
      timeKind: 'slot',
      slots: ['midday', 'afternoon']
    } as any
    const label = getTemporalDisplay(dispo)
    expect(label).toBe('Midi +1')
  })
})
