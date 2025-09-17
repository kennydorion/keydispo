export function normalizeString(input: string): string {
  if (!input) return ''
  try {
    return input
      .normalize('NFD')
      // Remove diacritics (accents)
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
  } catch {
    // Fallback for environments without Unicode property escapes
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }
}

export function matchesSearchHaystack(haystack: string, query: string): boolean {
  const h = normalizeString(haystack)
  const q = normalizeString(query).trim()
  if (!q) return true
  // All tokens must be present (AND semantics)
  const tokens = q.split(/\s+/).filter(Boolean)
  for (const t of tokens) {
    if (!h.includes(t)) return false
  }
  return true
}
