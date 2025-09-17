import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { useVirtualGrid } from '../src/composables/useVirtualGrid'

describe('useVirtualGrid', () => {
  it('handles empty visibleDays by setting windowEndIndex to -1', () => {
    const dayWidth = ref(100)
    const rowHeight = ref(20)
    const visibleDays = computed(() => [] as number[])
    const rows = computed(() => [1, 2, 3])

    const vg = useVirtualGrid({ dayWidth, rowHeight, visibleDays, rows })
    const scroller = { scrollLeft: 0, clientWidth: 300, scrollTop: 0, clientHeight: 200 } as unknown as HTMLElement

    vg.recomputeWindow(scroller)
    expect(vg.windowStartIndex.value).toBe(0)
    expect(vg.windowEndIndex.value).toBe(-1)
  })

  it('handles dayWidth <= 0 by setting windowEndIndex to -1', () => {
    const dayWidth = ref(0)
    const rowHeight = ref(20)
    const visibleDays = computed(() => [0, 1, 2])
    const rows = computed(() => [1, 2, 3])

    const vg = useVirtualGrid({ dayWidth, rowHeight, visibleDays, rows })
    const scroller = { scrollLeft: 0, clientWidth: 300, scrollTop: 0, clientHeight: 200 } as unknown as HTMLElement

    vg.recomputeWindow(scroller)
    expect(vg.windowStartIndex.value).toBe(0)
    expect(vg.windowEndIndex.value).toBe(-1)
  })

  it('clamps scrollLeft beyond content width and computes indices within bounds', () => {
    const dayWidth = ref(100)
    const rowHeight = ref(20)
    const visibleDays = computed(() => Array.from({ length: 10 }, (_, i) => i))
    const rows = computed(() => Array.from({ length: 5 }, (_, i) => i))

    const vg = useVirtualGrid({ dayWidth, rowHeight, visibleDays, rows })
    // Very large scrollLeft beyond content width (contentWidth = 10 * 100 = 1000)
    const scroller = { scrollLeft: 5000, clientWidth: 300, scrollTop: 0, clientHeight: 200 } as unknown as HTMLElement

    vg.recomputeWindow(scroller)
    expect(vg.windowEndIndex.value).toBeLessThanOrEqual(visibleDays.value.length - 1)
    expect(vg.windowEndIndex.value).toBeGreaterThanOrEqual(0)
    expect(vg.windowStartIndex.value).toBeGreaterThanOrEqual(0)
    expect(vg.windowStartIndex.value).toBeLessThanOrEqual(vg.windowEndIndex.value)
  })

  it('exposes a minimal initial window when scroller is not available yet', () => {
    const dayWidth = ref(100)
    const rowHeight = ref(20)
    const visibleDays = computed(() => Array.from({ length: 30 }, (_, i) => i))
    const rows = computed(() => Array.from({ length: 10 }, (_, i) => i))

    const vg = useVirtualGrid({ dayWidth, rowHeight, visibleDays, rows })
    // Call with no scroller (e.g., first tick after mount)
    vg.recomputeWindow(undefined as unknown as HTMLElement)
    expect(vg.windowStartIndex.value).toBe(0)
    expect(vg.windowEndIndex.value).toBeGreaterThanOrEqual(0)
    expect(vg.windowEndIndex.value).toBeLessThan(visibleDays.value.length)
  })

  it('recomputeRowWindow clamps correctly for empty and non-empty rows', () => {
    // Empty rows
    const dayWidth = ref(100)
    const rowHeight = ref(20)
    const visibleDays = computed(() => [0, 1, 2])
    const rowsEmpty = computed(() => [] as number[])
    const vgEmpty = useVirtualGrid({ dayWidth, rowHeight, visibleDays, rows: rowsEmpty })
    vgEmpty.recomputeRowWindow({ scrollTop: 100, clientHeight: 100 } as unknown as HTMLElement)
    expect(vgEmpty.rowWindowStartIndex.value).toBe(0)
    expect(vgEmpty.rowWindowEndIndex.value).toBe(-1)

    // Non-empty rows
    const rows = computed(() => Array.from({ length: 50 }, (_, i) => i))
    const vg = useVirtualGrid({ dayWidth, rowHeight, visibleDays, rows })
    const scroller = { scrollTop: 400, clientHeight: 120 } as unknown as HTMLElement
    vg.recomputeRowWindow(scroller)
    expect(vg.rowWindowStartIndex.value).toBeGreaterThanOrEqual(0)
    expect(vg.rowWindowEndIndex.value).toBeGreaterThanOrEqual(vg.rowWindowStartIndex.value)
    expect(vg.rowWindowEndIndex.value).toBeLessThan(rows.value.length)
  })
})
