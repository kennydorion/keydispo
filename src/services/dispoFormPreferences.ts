/**
 * Service pour mémoriser les dernières configurations de formulaire de disponibilité
 * Permet de remplir automatiquement les formulaires avec les dernières valeurs utilisées
 */

interface DispoFormPreferences {
  type: 'mission' | 'disponible' | 'indisponible'
  timeKind: 'range' | 'slot' | 'full-day' | 'overnight'
  heure_debut: string
  heure_fin: string
  lieu: string
  slots: string[]
}

const STORAGE_KEY = 'keydispo_form_preferences'

// Valeurs par défaut si aucune préférence n'est sauvegardée
const DEFAULT_PREFERENCES: DispoFormPreferences = {
  type: 'disponible',
  timeKind: 'full-day',
  heure_debut: '09:00',
  heure_fin: '17:00',
  lieu: '',
  slots: []
}

/**
 * Récupère les dernières préférences de formulaire sauvegardées
 */
export function getLastFormPreferences(): DispoFormPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Valider que toutes les propriétés requises sont présentes
      if (
        parsed.type &&
        parsed.timeKind &&
        parsed.heure_debut &&
        parsed.heure_fin !== undefined &&
        parsed.lieu !== undefined &&
        Array.isArray(parsed.slots)
      ) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Impossible de charger les préférences de formulaire:', error)
  }
  
  return { ...DEFAULT_PREFERENCES }
}

/**
 * Sauvegarde les préférences de formulaire
 */
export function saveFormPreferences(preferences: Partial<DispoFormPreferences>): void {
  try {
    // Récupérer les préférences actuelles et les fusionner
    const current = getLastFormPreferences()
    const updated: DispoFormPreferences = {
      type: preferences.type ?? current.type,
      timeKind: preferences.timeKind ?? current.timeKind,
      heure_debut: preferences.heure_debut ?? current.heure_debut,
      heure_fin: preferences.heure_fin ?? current.heure_fin,
      lieu: preferences.lieu ?? current.lieu,
      slots: preferences.slots ?? current.slots
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.warn('Impossible de sauvegarder les préférences de formulaire:', error)
  }
}

/**
 * Réinitialise les préférences aux valeurs par défaut
 */
export function resetFormPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Impossible de réinitialiser les préférences de formulaire:', error)
  }
}
