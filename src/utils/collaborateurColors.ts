/**
 * Couleurs prédéfinies pour les collaborateurs
 * Utilisées dans le planning pour l'aide visuelle
 */

export interface CollaborateurColor {
  name: string
  value: string
  label: string
}

export const COLLABORATEUR_COLORS: CollaborateurColor[] = [
  {
    name: 'blue',
    value: '#3B82F6',
    label: 'Bleu'
  },
  {
    name: 'green',
    value: '#10B981',
    label: 'Vert'
  },
  {
    name: 'purple',
    value: '#8B5CF6',
    label: 'Violet'
  },
  {
    name: 'orange',
    value: '#F59E0B',
    label: 'Orange'
  }
]

export const DEFAULT_COLOR = '#6B7280' // Gris par défaut

/**
 * Récupère une couleur par son nom
 */
export function getColorByName(name: string): string {
  const color = COLLABORATEUR_COLORS.find(c => c.name === name)
  return color?.value || DEFAULT_COLOR
}

/**
 * Récupère le nom d'une couleur par sa valeur
 */
export function getColorName(value: string): string {
  const color = COLLABORATEUR_COLORS.find(c => c.value === value)
  return color?.name || 'default'
}

/**
 * Génère une couleur aléatoire parmi les prédéfinies
 */
export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * COLLABORATEUR_COLORS.length)
  return COLLABORATEUR_COLORS[randomIndex].value
}
