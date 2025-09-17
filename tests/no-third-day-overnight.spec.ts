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

function toMinutes(t?: string): number {
  if (!t) return -1
  const [hh, mm] = t.split(':').map((v) => parseInt(v, 10))
  return (hh || 0) * 60 + (mm || 0)
}

function addDaysStr(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map((v) => parseInt(v, 10))
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + delta)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function assembleCellDisposForDate(current: Dispo[], previousDay: Dispo[], date: string): Dispo[] {
  const out: Dispo[] = []
  for (const d of current) {
    if ((d.timeKind === 'range' || d.timeKind === 'overnight') && d.heure_debut && d.heure_fin) out.push({ ...d, _cont: 'start' })
    else out.push({ ...d })
  }
  const prev = addDaysStr(date, -1)
  for (const d of previousDay) {
    if (d.date !== prev) continue
    const s = toMinutes(d.heure_debut)
    const e = toMinutes(d.heure_fin)
    if ((d.timeKind === 'range' || d.timeKind === 'overnight') && s >= 0 && e >= 0 && e < s) {
      out.push({ ...d, date, _cont: 'end' })
    }
    if (d.timeKind === 'slot' && d.slots?.includes('night')) out.push({ ...d, date, _cont: 'end' })
  }
  return out
}

describe('Pas de propagation en J+2 des overnight', () => {
  it("une overnight J→J+1 ne s'affiche pas en J+2", () => {
    const J = '2025-06-25'
    const J1 = addDaysStr(J, 1)
    const J2 = addDaysStr(J, 2)

    const overnight: Dispo = {
      id: 'ov1',
      date: J,
      type: 'mission',
      timeKind: 'overnight',
      heure_debut: '22:00',
      heure_fin: '06:00',
    }

    // J: doit contenir le start
    const jDispos = assembleCellDisposForDate([overnight], [], J)
    expect(jDispos.some(d => d.id === 'ov1' && d._cont === 'start')).toBe(true)

    // J+1: doit contenir la continuation
    const j1Dispos = assembleCellDisposForDate([], [overnight], J1)
    expect(j1Dispos.some(d => d.id === 'ov1' && d._cont === 'end')).toBe(true)

    // J+2: ne doit pas contenir l'overnight
    const j2Dispos = assembleCellDisposForDate([], [overnight], J2)
    expect(j2Dispos.some(d => d.id === 'ov1')).toBe(false)
  })
})
