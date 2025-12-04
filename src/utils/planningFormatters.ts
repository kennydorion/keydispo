/**
 * planningFormatters - Fonctions de formatage pour le planning
 * Fonctions pures sans dépendances Vue
 */

import { toDateStr } from '@/utils/dateHelpers'
import { formatPhone as formatPhoneUtil } from '@/utils/phoneFormatter'

/**
 * Formate une date pour l'affichage dans le planning
 */
export function formatDate(d: Date): string {
  return toDateStr(d)
}

/**
 * Formate une date pour l'affichage dans la modale
 * Utilise T12:00:00 pour éviter les problèmes de timezone
 */
export function formatModalDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formate un numéro de téléphone
 */
export function formatPhone(phone: string): string {
  return formatPhoneUtil(phone)
}

/**
 * Capitalise la première lettre d'une chaîne
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Génère un nom de mois formaté à partir d'une date
 */
export function getMonthLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const monthName = date.toLocaleDateString('fr-FR', { 
    month: 'long', 
    year: 'numeric' 
  })
  return capitalize(monthName)
}
