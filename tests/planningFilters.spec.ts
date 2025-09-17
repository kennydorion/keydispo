import { describe, it, expect } from 'vitest'
import {
  eachDateInRange,
  getDayStatus,
  hasExplicitIndispoInRange,
  hasLieuInRange,
  isAvailableInRange,
  isAvailableOnDate,
  toDateStr,
  type DispoLike,
} from '../src/utils/planningFilters'

const resolveKind = (d: DispoLike) => {
  const t = (d.type || '').toLowerCase()
  if (t === 'mission') return { type: 'mission' as const, timeKind: d.timeKind, slots: d.slots }
  if (t === 'indisponible') return { type: 'indisponible' as const, timeKind: d.timeKind, slots: d.slots }
  return { type: 'disponible' as const, timeKind: d.timeKind, slots: d.slots }
}

const canonLieu = (s: string) => s.trim().toLowerCase()

describe('planningFilters utils', () => {
  it('toDateStr formats correctly', () => {
    expect(toDateStr(new Date('2025-01-05T00:00:00Z'))).toBe('2025-01-05')
  })

  it('eachDateInRange enumerates closed interval', () => {
    expect(eachDateInRange('2025-01-01', '2025-01-03')).toEqual(['2025-01-01','2025-01-02','2025-01-03'])
    // reversed order
    expect(eachDateInRange('2025-01-03', '2025-01-01')).toEqual(['2025-01-01','2025-01-02','2025-01-03'])
  })

  it('availability and status across ranges', () => {
    const map = new Map<string, DispoLike[]>()
    map.set('c1@2025-01-01', [{ type: 'disponible', timeKind: 'full-day' }])
    map.set('c1@2025-01-02', [{ type: 'disponible', timeKind: 'full-day' }])
    map.set('c1@2025-01-03', [{ type: 'indisponible', timeKind: 'full-day' }])

    const get = (id: string, date: string) => map.get(`${id}@${date}`) || []

    expect(getDayStatus('c1','2025-01-01', get, resolveKind)).toBe('disponible')
    expect(getDayStatus('c1','2025-01-03', get, resolveKind)).toBe('indisponible')
    expect(isAvailableOnDate('c1','2025-01-02', get, resolveKind)).toBe(true)

    // Entire range must be available
    expect(isAvailableInRange('c1','2025-01-01','2025-01-02', get, resolveKind)).toBe(true)
    expect(isAvailableInRange('c1','2025-01-01','2025-01-03', get, resolveKind)).toBe(false)
    expect(hasExplicitIndispoInRange('c1','2025-01-01','2025-01-03', get, resolveKind)).toBe(true)
  })

  it('hasLieuInRange matches canonicalized lieux', () => {
    const map = new Map<string, DispoLike[]>()
    map.set('c1@2025-02-01', [{ type: 'disponible', timeKind: 'full-day', lieu: 'Paris' }])
    map.set('c1@2025-02-02', [{ type: 'indisponible', timeKind: 'full-day' }])
    map.set('c1@2025-02-03', [{ type: 'disponible', timeKind: 'full-day', lieu: 'Lyon' }])

    const get = (id: string, date: string) => map.get(`${id}@${date}`) || []

    // Paris exists on 2025-02-01 only
    expect(hasLieuInRange('c1','paris','2025-02-01','2025-02-03', get, canonLieu)).toBe(true)
    // Bordeaux not present
    expect(hasLieuInRange('c1','bordeaux','2025-02-01','2025-02-03', get, canonLieu)).toBe(false)
    // Empty requested lieu -> passthrough
    expect(hasLieuInRange('c1','', '2025-02-01','2025-02-03', get, canonLieu)).toBe(true)
  })
})
