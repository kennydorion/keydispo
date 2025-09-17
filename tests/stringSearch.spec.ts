import { describe, it, expect } from 'vitest'
import { normalizeString, matchesSearchHaystack } from '../src/utils/stringSearch'

describe('stringSearch utils', () => {
  it('normalizes accents and case', () => {
    expect(normalizeString('Éléonore')).toBe('eleonore')
    expect(normalizeString('FRÉDÉRIC')).toBe('frederic')
  })

  it('matches tokens regardless of accents and case', () => {
    const hay = 'Frédéric Dupont <frederic@example.com>'
    expect(matchesSearchHaystack(hay, 'fre')).toBe(true)
    expect(matchesSearchHaystack(hay, 'fr du')).toBe(true)
    expect(matchesSearchHaystack(hay, 'é dU')).toBe(true)
    expect(matchesSearchHaystack(hay, 'dup')).toBe(true)
    expect(matchesSearchHaystack(hay, 'nope')).toBe(false)
  })

  it('handles empty query as match-all', () => {
    expect(matchesSearchHaystack('anything', '')).toBe(true)
  })
})
