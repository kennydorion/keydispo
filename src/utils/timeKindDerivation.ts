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
 * 3. Heures présentes → 'range'
 * 4. Fallback → 'range'
 * 
 * NOTE: 'overnight' n'est JAMAIS dérivé automatiquement.
 * C'est un choix explicite de l'utilisateur (bouton "Nuit").
 * Overnight = journée complète affichée comme "Nuit" (pas de plage horaire sur 2 jours).
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
  
  // 3. Range si heures présentes (peu importe si fin < début)
  const start = (dispo?.heure_debut || '').toString()
  const end = (dispo?.heure_fin || '').toString()
  if (start && end) {
    return 'range'
  }
  
  // 4. fallback range pour compatibilité
  return 'range'
}
