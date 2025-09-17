import { describe, it, expect } from 'vitest'

type Dispo = {
  id: string
  date: string
  type: 'mission' | 'disponible' | 'indisponible'
  timeKind: 'range' | 'slot' | 'full-day' | 'overnight'
  heure_debut?: string
  heure_fin?: string
  slots?: string[]
  _cont?: 'start' | 'end'
}

const slotOrder: Record<string, number> = {
  morning: 1,
  midday: 2,
  afternoon: 3,
  evening: 4,
  night: 5,
}

function toMinutes(t?: string): number {
  if (!t) return 10_000
  const [h, m] = (t || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function assembleCellDisposForDate(current: Dispo[], previousDay: Dispo[], date: string): Dispo[] {
  const out: Dispo[] = []

  // Partie du jour (simplifiée): si range/overnight et horaires présents, marquer comme start pour le jour correspondant
  for (const d of current) {
    if ((d.timeKind === 'range' || d.timeKind === 'overnight') && d.heure_debut && d.heure_fin) {
      out.push({ ...d, _cont: 'start' })
    } else {
      out.push({ ...d })
    }
  }

  // Continuations de la veille: overnight (heure_fin < heure_debut) et slot-night
  for (const d of previousDay) {
    if ((d.timeKind === 'range' || d.timeKind === 'overnight') && d.heure_debut && d.heure_fin) {
      const s = toMinutes(d.heure_debut)
      const e = toMinutes(d.heure_fin)
      if (e < s) out.push({ ...d, date, _cont: 'end' })
    }
    if (d.timeKind === 'slot' && d.slots?.includes('night')) {
      out.push({ ...d, date, _cont: 'end' })
    }
  }

  return out
}

function sortCellDispos(a: Dispo, b: Dispo): number {
  // full-day en dernier
  const aIsFull = a.timeKind === 'full-day'
  const bIsFull = b.timeKind === 'full-day'
  if (aIsFull && !bIsFull) return 1
  if (bIsFull && !aIsFull) return -1

  // continuations d'abord (par heure de fin; slot-night = 06:00)
  const aIsCont = a._cont === 'end'
  const bIsCont = b._cont === 'end'
  const contKey = (d: Dispo) => (d.timeKind === 'slot' && d.slots?.includes('night')) ? 6 * 60 : toMinutes(d.heure_fin)
  if (aIsCont && bIsCont) return contKey(a) - contKey(b)
  if (aIsCont && !bIsCont) return -1
  if (bIsCont && !aIsCont) return 1

  // slots ensuite (ordre logique)
  const slotKey = (d: Dispo) => {
    if (d.timeKind !== 'slot' || !d.slots?.length) return 10_000
    const sorted = [...d.slots].sort((x, y) => (slotOrder[x] || 99) - (slotOrder[y] || 99))
    return slotOrder[sorted[0]] || 99
  }
  const aIsSlot = a.timeKind === 'slot'
  const bIsSlot = b.timeKind === 'slot'
  if (aIsSlot && bIsSlot) return slotKey(a) - slotKey(b)
  if (aIsSlot && !bIsSlot) return -1
  if (bIsSlot && !aIsSlot) return 1

  // ranges/overnight starts: par début
  const rangeKey = (d: Dispo) => toMinutes(d.heure_debut)
  return rangeKey(a) - rangeKey(b)
}

describe('Tri des cellules - continuations et créneaux', () => {
  it('place les continuations (overnight et slot-night) en premier, puis slots, ranges et full-day', () => {
    const date = '2025-06-26'

    const prevOvernight: Dispo = {
      id: 'prev-overnight',
      date: '2025-06-25',
      type: 'mission',
      timeKind: 'overnight',
      heure_debut: '22:00',
      heure_fin: '06:00',
    }
    const prevSlotNight: Dispo = {
      id: 'prev-slot-night',
      date: '2025-06-25',
      type: 'mission',
      timeKind: 'slot',
      slots: ['night'],
    }
    const slotMorning: Dispo = {
      id: 'slot-morning',
      date,
      type: 'disponible',
      timeKind: 'slot',
      slots: ['morning'],
    }
    const range0900: Dispo = {
      id: 'range-0900',
      date,
      type: 'mission',
      timeKind: 'range',
      heure_debut: '09:00',
      heure_fin: '12:00',
    }
    const fullDay: Dispo = {
      id: 'full-day',
      date,
      type: 'disponible',
      timeKind: 'full-day',
    }

    const assembled = assembleCellDisposForDate(
      [slotMorning, range0900, fullDay],
      [prevOvernight, prevSlotNight],
      date,
    )
    const sorted = assembled.slice().sort(sortCellDispos)

    // Les deux premiers sont des continuations (dans n'importe quel ordre)
    expect(sorted[0]._cont).toBe('end')
    expect(sorted[1]._cont).toBe('end')
    const firstTwoIds = new Set([sorted[0].id, sorted[1].id])
    expect(firstTwoIds.has('prev-overnight')).toBe(true)
    expect(firstTwoIds.has('prev-slot-night')).toBe(true)

    // Ensuite vient le slot morning, puis la range, puis le full-day
    expect(sorted[2].id).toBe('slot-morning')
    expect(sorted[3].id).toBe('range-0900')
    expect(sorted[4].id).toBe('full-day')
  })

  it('ordonne les continuations par heure de fin (slot-night traité comme 06:00)', () => {
    const date = '2025-06-26'

    const cont0500: Dispo = {
      id: 'cont-05',
      date: '2025-06-25',
      type: 'mission',
      timeKind: 'overnight',
      heure_debut: '23:00',
      heure_fin: '05:00',
      _cont: 'end',
    }
    const contSlotNight: Dispo = {
      id: 'cont-slot-night',
      date: '2025-06-25',
      type: 'mission',
      timeKind: 'slot',
      slots: ['night'],
      _cont: 'end',
    }
    const cont0700: Dispo = {
      id: 'cont-07',
      date: '2025-06-25',
      type: 'mission',
      timeKind: 'overnight',
      heure_debut: '23:30',
      heure_fin: '07:00',
      _cont: 'end',
    }

    const continuations = [cont0700, contSlotNight, cont0500]
    const sorted = continuations.slice().sort(sortCellDispos)

    // 05:00 d'abord, puis 06:00 (slot-night), puis 07:00
    expect(sorted.map(d => d.id)).toEqual(['cont-05', 'cont-slot-night', 'cont-07'])
  })
})
