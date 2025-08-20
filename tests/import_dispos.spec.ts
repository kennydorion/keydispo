import { describe, it, expect } from 'vitest'
import { excelTimeToHHMM, normalizeDate, deterministicId } from '../tools/import_dispos'

describe('excelTimeToHHMM', () => {
  it('converts excel fraction to HH:MM', () => {
    expect(excelTimeToHHMM(0.5)).toBe('12:00')
    expect(excelTimeToHHMM(0.25)).toBe('06:00')
  })
  it('accepts string HH:MM', () => {
    expect(excelTimeToHHMM('8:30')).toBe('08:30')
  })
})

describe('deterministicId', () => {
  it('builds id from tenant/nom/prenom/date', () => {
    const id = deterministicId('t1', { tenantId: 't1', nom: 'Doe', prenom: 'Jane', date: '2025-08-13' })
    expect(id).toContain('t1')
    expect(id).toContain('doe')
    expect(id).toContain('jane')
    expect(id).toContain('2025-08-13')
  })
})

describe('normalizeDate', () => {
  it('parses ISO', () => {
    expect(normalizeDate('2025-08-13')).toBe('2025-08-13')
  })
  it('parses FR dd/mm/yyyy', () => {
    expect(normalizeDate('13/08/2025')).toBe('2025-08-13')
  })
})
