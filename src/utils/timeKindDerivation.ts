/**
 * Utilitaire centralisé pour la dérivation du timeKind depuis les données brutes
 * Assure la cohérence de l'affichage overnight dans toute l'application
 */

export type TimeKind = 'range' | 'slot' | 'full-day' | 'overnight'

export interface DisponibiliteData {
  slots?: string[]
  isFullDay?: boolean
  heure_debut?: string
  heure_fin?: string
}

/**
 * Dérive le timeKind d'affichage depuis les données brutes de disponibilité
 * RÈGLES DE PRIORITÉ :
 * 1. Slots présents → 'slot'
 * 2. Flag isFullDay → 'full-day' 
 * 3. Heures avec fin < début → 'overnight'
 * 4. Heures normales → 'range'
 * 5. Fallback → 'range'
 */
export function deriveTimeKindFromData(dispo: DisponibiliteData): TimeKind {
  // 1. Priorité aux slots si présents
  if (dispo?.slots && Array.isArray(dispo.slots) && dispo.slots.length > 0) {
    return 'slot'
  }
  
  // 2. Full-day si flag explicite
  if (dispo?.isFullDay) {
    return 'full-day'
  }
  
  // 3. Dérivation depuis les heures pour range/overnight
  const start = (dispo?.heure_debut || '').toString()
  const end = (dispo?.heure_fin || '').toString()
  if (start && end) {
    // overnight si fin < début (comparaison HH:MM lexicographique valable pour format HH:MM)
    if (end < start) {
      return 'overnight'
    }
    return 'range'
  }
  
  // 4. fallback range pour compatibilité
  return 'range'
}
