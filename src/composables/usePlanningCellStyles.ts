/**
 * usePlanningCellStyles.ts
 * 
 * Composable gérant les classes et styles CSS des cellules du planning :
 * - Classes de type (disponible, mission, indisponible)
 * - Classes de continuation overnight
 * - Styles des barres de disponibilité
 * - Icônes et labels des types
 */

// Types
interface Disponibilite {
  id?: string
  collaborateurId?: string
  date?: string
  type?: string
  timeKind?: string
  slots?: string[]
  heure_debut?: string
  heure_fin?: string
  lieu?: string
  isFullDay?: boolean
  _cont?: 'start' | 'middle' | 'end'
  [key: string]: any
}

interface ResolvedKind {
  type: string
  timeKind: string
  slots: string[]
}

interface UsePlanningCellStylesOptions {
  resolveDispoKind: (dispo: Disponibilite) => ResolvedKind
  getCellDispos: (collaborateurId: string, date: string) => Disponibilite[]
}

// Labels des slots
const SLOT_LABELS: Record<string, string> = {
  morning: 'Matin',
  midday: 'Midi',
  afternoon: 'Après-midi',
  evening: 'Soir',
  night: 'Nuit'
}

export function usePlanningCellStyles(options: UsePlanningCellStylesOptions) {
  const { resolveDispoKind, getCellDispos } = options

  // === CLASSES DE TYPE ===

  /**
   * Retourne la classe CSS pour le type de dispo
   */
  function getDispoTypeClass(dispo: Partial<Disponibilite>): string {
    const k = resolveDispoKind(dispo as Disponibilite)
    switch (k.type) {
      case 'mission': return 'type-mission'
      case 'indisponible': return 'type-indisponible'
      case 'disponible': return 'type-disponible'
      default: return 'type-disponible'
    }
  }

  /**
   * Retourne la classe CSS pour la continuation overnight
   */
  function getDispoContinuationClass(dispo: Partial<Disponibilite> & { _cont?: 'start' | 'end' }, cellDate: string): string {
    if (!dispo._cont) return ''
    if (dispo._cont === 'start') return 'continuation-start'
    if (dispo._cont === 'end') return 'continuation-end'
    return ''
  }

  /**
   * Retourne la classe CSS globale de la cellule
   */
  function getCellKindClass(collaborateurId: string, date: string): string {
    const dispos = getCellDispos(collaborateurId, date)
    if (!dispos.length) return ''
    
    // Priorité: indisponible > mission > disponible
    let hasIndispo = false
    let hasMission = false
    let hasDispo = false
    
    for (const d of dispos) {
      const k = resolveDispoKind(d)
      if (k.type === 'indisponible') hasIndispo = true
      else if (k.type === 'mission') hasMission = true
      else if (k.type === 'disponible') hasDispo = true
    }
    
    if (hasIndispo) return 'cell-indisponible'
    if (hasMission) return 'cell-mission'
    if (hasDispo) return 'cell-disponible'
    return ''
  }

  // === CLASSES DE CARTE ===

  /**
   * Retourne les classes CSS pour une carte de dispo
   */
  function getDispoCardClass(dispo: Disponibilite): string {
    const k = resolveDispoKind(dispo)
    return `dispo-card dispo-${k.type} timekind-${k.timeKind}`
  }

  /**
   * Retourne le style inline pour une carte de dispo
   */
  function getDispoCardStyle(_dispo: Disponibilite): Record<string, string> {
    return {}
  }

  // === ICÔNES ET LABELS ===

  /**
   * Retourne l'icône Material pour le type de dispo
   */
  function getDispoTypeIcon(dispo: Disponibilite): string {
    const k = resolveDispoKind(dispo)
    switch (k.type) {
      case 'mission': return 'work'
      case 'indisponible': return 'block'
      case 'disponible': return 'check_circle'
      default: return 'help'
    }
  }

  /**
   * Retourne le label du type de dispo
   */
  function getDispoTypeLabel(dispo: Disponibilite): string {
    const k = resolveDispoKind(dispo)
    switch (k.type) {
      case 'mission': return 'Mission'
      case 'indisponible': return 'Indisponible'
      case 'disponible': return 'Disponible'
      default: return 'Inconnu'
    }
  }

  // === AFFICHAGE TEMPOREL ===

  /**
   * Retourne l'affichage temporel d'une dispo
   */
  function getTemporalDisplay(dispo: Disponibilite, _cellDate: string): string {
    const k = resolveDispoKind(dispo)
    
    if (k.timeKind === 'full-day') {
      return 'Journée'
    }
    
    if (k.timeKind === 'slot' && k.slots?.length) {
      return k.slots.map(s => SLOT_LABELS[s] || s).join(', ')
    }
    
    if ((k.timeKind === 'range' || k.timeKind === 'overnight') && dispo.heure_debut && dispo.heure_fin) {
      return `${dispo.heure_debut} - ${dispo.heure_fin}`
    }
    
    return ''
  }

  /**
   * Retourne le titre complet pour la barre de dispo (tooltip)
   */
  function getDispoBarTitle(dispo: Disponibilite, _cellDate: string): string {
    const k = resolveDispoKind(dispo)
    const parts: string[] = []
    
    // Type
    parts.push(getDispoTypeLabel(dispo))
    
    // Lieu
    if (dispo.lieu) {
      parts.push(`@ ${dispo.lieu}`)
    }
    
    // Horaires
    const temporal = getTemporalDisplay(dispo, _cellDate)
    if (temporal) {
      parts.push(temporal)
    }
    
    return parts.join(' • ')
  }

  // === DÉTECTION OVERNIGHT ===

  /**
   * Vérifie si c'est une continuation overnight (venant de la veille)
   */
  function isOvernightContinuation(dispo: Partial<Disponibilite> & { _cont?: 'start' | 'end' }, _cellDate: string): boolean {
    return dispo._cont === 'end'
  }

  /**
   * Vérifie si c'est le début d'une dispo overnight
   */
  function isOvernightStart(dispo: Partial<Disponibilite> & { _cont?: 'start' | 'end' }, _cellDate: string): boolean {
    return dispo._cont === 'start'
  }

  /**
   * Vérifie si les heures indiquent un overnight (fin < début)
   */
  function isOvernightTime(start?: string, end?: string): boolean {
    if (!start || !end) return false
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    return toMin(end) < toMin(start)
  }

  return {
    // Classes
    getDispoTypeClass,
    getDispoContinuationClass,
    getCellKindClass,
    getDispoCardClass,
    getDispoCardStyle,
    
    // Icônes et labels
    getDispoTypeIcon,
    getDispoTypeLabel,
    
    // Affichage temporel
    getTemporalDisplay,
    getDispoBarTitle,
    
    // Détection overnight
    isOvernightContinuation,
    isOvernightStart,
    isOvernightTime,
    
    // Constants
    SLOT_LABELS
  }
}
