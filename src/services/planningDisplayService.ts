/**
 * Service partagé pour l'affichage unifié des disponibilités
 * entre le planning admin et le planning collaborateur
 */

export interface DisponibiliteDisplay {
  id?: string
  date: string
  lieu: string
  heure_debut?: string
  heure_fin?: string
  type?: 'mission' | 'disponible' | 'indisponible'
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight'
  slots?: string[]
  [key: string]: any // Pour flexibilité
}

/**
 * Détermine le type et les propriétés d'une disponibilité
 */
export function resolveDispoKind(dispo: DisponibiliteDisplay) {
  // 1) Normalisation du type (RTDB -> legacy)
  const lieu = (dispo.lieu || '').toUpperCase().trim()

  // Mapper les types alternatifs RTDB vers les types legacy utilisés par l'UI
  const altToLegacy: Record<string, 'mission' | 'disponible' | 'indisponible'> = {
    standard: 'disponible',
    maintenance: 'indisponible',
    urgence: 'mission',
    formation: 'mission'
  }

  // Prendre en compte que dispo.type peut être un type legacy ou un type RTDB alternatif
  const rawType = (dispo as any).type as string | undefined
  let type: 'mission' | 'disponible' | 'indisponible'

  // 2.1 Déterminer une inférence depuis le lieu
  const inferredFromLieu: 'mission' | 'disponible' | 'indisponible' | null =
    (lieu === 'INDISPONIBLE' || lieu === 'INDISPO') ? 'indisponible'
    : (lieu && lieu !== 'DISPONIBLE' && lieu !== 'DISPO') ? 'mission'
    : null

  // 2.2 Déterminer mapping depuis type alternatif RTDB
  const mappedAlt: 'mission' | 'disponible' | 'indisponible' | null = rawType && altToLegacy[rawType]
    ? altToLegacy[rawType]
    : null

  // 2.3 Résolution par priorité:
  //  - legacy explicite (mission/indisponible/disponible)
  //  - inférence lieu (mission/indisponible via lieu non vide)
  //  - alt RTDB (standard/maintenance/urgence/formation)
  //  - défaut: disponible
  if (rawType && (rawType === 'mission' || rawType === 'disponible' || rawType === 'indisponible')) {
    type = rawType
  } else if (inferredFromLieu) {
    type = inferredFromLieu
  } else if (mappedAlt) {
    type = mappedAlt
  } else {
    type = 'disponible'
  }

  // 2) Détection/Mappage du timeKind (RTDB -> affichage)
  let timeKind: 'range' | 'slot' | 'full-day' | 'overnight' = 'full-day'
  let slots: string[] = []

  const rawTimeKind = (dispo as any).timeKind as string | undefined
  const providedSlots = Array.isArray((dispo as any).slots) ? ((dispo as any).slots as string[]) : []

  if (rawTimeKind) {
    // Conversion depuis les valeurs RTDB possibles
    switch (rawTimeKind) {
      case 'range':
      case 'slot':
      case 'full-day':
      case 'overnight':
        timeKind = rawTimeKind
        break
      case 'fixed':
        // fixed: nous l'utilisons pour persister les créneaux (slots)
        // S'il y a des slots fournis, considérer comme 'slot', sinon fallback sur 'range' (heures)
        if (providedSlots.length > 0) {
          timeKind = 'slot'
        } else if (dispo.heure_debut && dispo.heure_fin) {
          timeKind = 'range'
        } else {
          timeKind = 'range'
        }
        break
      case 'flexible':
        // flexible: utilisé pour les plages horaires et la journée complète
        if (dispo.heure_debut && dispo.heure_fin) {
          // Range simple (pas de détection overnight automatique)
          if ((dispo.heure_debut === '00:00') && (dispo.heure_fin === '23:59' || dispo.heure_fin === '24:00' || dispo.heure_fin === '00:00')) {
            timeKind = 'full-day'
          } else {
            timeKind = 'range'
          }
        } else if (providedSlots.length > 0) {
          timeKind = 'slot'
        } else {
          timeKind = 'full-day'
        }
        break
      case 'oncall':
        timeKind = 'full-day'
        break
      default:
        // Fallback: tenter d'inférer via heures
        timeKind = (dispo.heure_debut && dispo.heure_fin) ? 'range' : 'full-day'
    }
    slots = providedSlots
  } else if (dispo.heure_debut && dispo.heure_fin) {
    // Vérifier si c'est une journée complète
    const debut = dispo.heure_debut.slice(0, 5)
    const fin = dispo.heure_fin.slice(0, 5)

    if ((debut === '00:00') && (fin === '23:59' || fin === '24:00' || fin === '00:00')) {
      timeKind = 'full-day'
    } else {
      // Range simple (pas de détection overnight automatique)
      timeKind = 'range'
    }
  }

  return { type, timeKind, slots }
}

/**
 * Étiquettes des créneaux en français
 */
export function slotLabel(slot: string): string {
  const labels: Record<string, string> = {
    'morning': 'Matin',
    'lunch': 'Midi',
    'midday': 'Midi', // ⚠️ AJOUT: Support pour "midday" (synonyme de lunch)
    'afternoon': 'A-M',
    'evening': 'Soir',
    'night': 'Nuit'
  }
  return labels[slot] || slot
}

/**
 * Affichage temporel unifié (horaire/créneau/journée)
 */
export function getTemporalDisplay(dispo: DisponibiliteDisplay): string {
  const kind = resolveDispoKind(dispo)
  
  // 🔧 PRIORITÉ 1: Journée complète (timeKind explicite)
  if (kind.timeKind === 'full-day') {
    // Ne pas afficher de texte pour les indisponibilités journée complète
    if (kind.type === 'indisponible') {
      return '' // Pas de texte redondant
    }
    return 'Journée'
  }
  
  // 🔧 PRIORITÉ 1.5: Nuit (overtime) - afficher "Nuit" comme "Journée"
  if (kind.timeKind === 'overnight') {
    return 'Nuit'
  }
  
  // 🔧 PRIORITÉ 2: Créneaux (slots)
  if (kind.timeKind === 'slot' && kind.slots?.length > 0) {
    const validSlots = kind.slots.filter(s => s && s.trim())
    if (validSlots.length === 1) {
      return slotLabel(validSlots[0])
    } else if (validSlots.length > 1) {
      return `${slotLabel(validSlots[0])} +${validSlots.length - 1}`
    }
  }
  
  // 🔧 PRIORITÉ 3: Horaires précis (range)
  if (kind.timeKind === 'range' && dispo.heure_debut && dispo.heure_fin) {
    return formatTimeForCard(dispo)
  }
  
  // 🔧 FALLBACK: Journée par défaut
  return 'Journée'
}

/**
 * Formatage des horaires pour l'affichage
 */
export function formatTimeForCard(dispo: DisponibiliteDisplay): string {
  if (!dispo.heure_debut || !dispo.heure_fin) return ''
  
  const debut = dispo.heure_debut.slice(0, 5)
  const fin = dispo.heure_fin.slice(0, 5)
  
  // Gestion nuit (fin < début)
  const debutMin = timeToMinutes(debut)
  const finMin = timeToMinutes(fin)
  
  if (finMin < debutMin) {
    // Mission de nuit
    return `${debut}-${fin}+1`
  }
  
  return `${debut}-${fin}`
}

/**
 * Convertit une heure HH:MM en minutes
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Icône pour le type de disponibilité
 */
export function getDispoTypeIcon(dispo: DisponibiliteDisplay): string {
  const kind = resolveDispoKind(dispo)
  
  switch (kind.type) {
    case 'mission': return 'work'
    case 'indisponible': return 'block'
    case 'disponible': return 'check_circle'
    default: return 'schedule'
  }
}

/**
 * Classe CSS pour le type de disponibilité
 */
export function getDispoTypeClass(dispo: DisponibiliteDisplay): string {
  const kind = resolveDispoKind(dispo)
  return `dispo-card-${kind.type}`
}

/**
 * Couleur pour le type de disponibilité
 */
export function getDispoTypeColor(dispo: DisponibiliteDisplay): string {
  const kind = resolveDispoKind(dispo)
  
  switch (kind.type) {
    case 'mission': return '#f59e0b' // Orange
    case 'indisponible': return '#ef4444' // Rouge
    case 'disponible': return '#10b981' // Vert
    default: return '#6b7280' // Gris
  }
}

/**
 * Détermine la classe de layout pour un nombre de disponibilités
 */
export function getDispoBarsLayoutClass(dispoCount: number): string {
  if (dispoCount <= 1) return 'single'
  if (dispoCount === 2) return 'dual'
  return 'multi'
}
