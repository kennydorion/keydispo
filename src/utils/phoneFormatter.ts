/**
 * Utilitaires pour le formatage des numéros de téléphone (Suisse et France)
 */

/**
 * Formate un numéro de téléphone pour l'affichage compact
 * @param phone - Le numéro de téléphone brut
 * @returns Le numéro formaté selon les standards suisses/français compacts
 */
export function formatPhone(phone: string): string {
  if (!phone) return ''
  
  // Nettoyer le numéro en gardant seulement les chiffres et le +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Conversion automatique 00 -> +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2)
  }
  
  // Numéros français (+33...)
  if (cleaned.startsWith('+33')) {
    const digits = cleaned.substring(3) // Enlever +33
    
    if (digits.length === 9) {
      // Format compact: +33 X.XX.XX.XX.XX
      return `+33 ${digits.substring(0, 1)}.${digits.substring(1, 3)}.${digits.substring(3, 5)}.${digits.substring(5, 7)}.${digits.substring(7, 9)}`
    }
  }
  
  // Numéros suisses (+41...)
  if (cleaned.startsWith('+41')) {
    const digits = cleaned.substring(3) // Enlever +41
    
    if (digits.length === 9) {
      // Format suisse compact: +41 XX.XXX.XX.XX
      return `+41 ${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 7)}.${digits.substring(7, 9)}`
    }
  }
  
  // Numéros nationaux français (01-05) et suisses (07-09, 02X, 03X, 04X)
  if (cleaned.startsWith('0') && cleaned.length === 10 && !cleaned.startsWith('00')) {
    const prefix = cleaned.substring(0, 3)
    
    // Numéros fixes suisses (021, 022, 024, 026, 027, 031, 032, 033, 034, 041, 043, 044, etc.)
    const swissFixPrefixes = ['021', '022', '024', '026', '027', '031', '032', '033', '034', '041', '043', '044', '052', '055', '056', '058', '061', '062', '071', '081', '091']
    if (swissFixPrefixes.includes(prefix)) {
      // Format suisse compact: 0XX.XXX.XX.XX  
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 8)}.${cleaned.substring(8, 10)}`
    }
    
    // Numéros mobiles suisses (076, 077, 078, 079)
    if (prefix.startsWith('07') && ['076', '077', '078', '079'].includes(prefix)) {
      // Format suisse compact: 0XX.XXX.XX.XX  
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 8)}.${cleaned.substring(8, 10)}`
    }
    
    // Numéros français (01, 02, 03, 04, 05, 06, 08, 09) - mais pas ceux déjà traités comme suisses
    const secondDigit = cleaned.charAt(1)
    if (['1', '2', '3', '4', '5', '6', '8', '9'].includes(secondDigit)) {
      // Format compact: 0X.XX.XX.XX.XX
      return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 4)}.${cleaned.substring(4, 6)}.${cleaned.substring(6, 8)}.${cleaned.substring(8, 10)}`
    }
  }
  
  // Autres formats : retourner avec points pour compacité
  if (cleaned.length >= 8) {
    return cleaned.replace(/(\d{2,3})(?=\d)/g, '$1.').replace(/\.$/, '')
  }
  
  return phone
}

/**
 * Normalise un numéro de téléphone pour stockage (format international)
 * @param phone - Le numéro de téléphone à normaliser
 * @returns Le numéro au format international
 */
export function normalizePhone(phone: string): string {
  if (!phone) return ''
  
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Conversion automatique 00 -> +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2)
  }
  
  // Déjà au format international
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  
  // Numéros français et suisses (0X... avec 10 chiffres)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    const prefix = cleaned.substring(0, 3)
    
    // Numéros fixes suisses (021, 022, etc.)
    const swissFixPrefixes = ['021', '022', '024', '026', '027', '031', '032', '033', '034', '041', '043', '044', '052', '055', '056', '058', '061', '062', '071', '081', '091']
    if (swissFixPrefixes.includes(prefix)) {
      return `+41${cleaned.substring(1)}`
    }
    
    // Numéros mobiles suisses (076, 077, 078, 079)
    if (prefix.startsWith('07') && ['076', '077', '078', '079'].includes(prefix)) {
      return `+41${cleaned.substring(1)}`
    }
    
    // Vérifier si c'est probablement français (autres 0X...)
    const secondDigit = cleaned.charAt(1)
    if (['1', '2', '3', '4', '5', '6', '8', '9'].includes(secondDigit) && !swissFixPrefixes.includes(prefix)) {
      return `+33${cleaned.substring(1)}`
    }
  }
  
  // Numéros suisses (format sans préfixe, 9 chiffres)
  if (!cleaned.startsWith('0') && cleaned.length === 9) {
    return `+41${cleaned}`
  }
  
  return phone
}

/**
 * Valide un numéro de téléphone
 * @param phone - Le numéro à valider
 * @returns true si le numéro est valide
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return true // Champ optionnel
  
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Conversion automatique 00 -> +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2)
  }
  
  // Format international français (+33 + 9 chiffres)
  if (cleaned.startsWith('+33')) {
    return cleaned.length === 12
  }
  
  // Format international suisse (+41 + 9 chiffres)
  if (cleaned.startsWith('+41')) {
    return cleaned.length === 12
  }
  
  // Format national français (0 + 9 chiffres)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return true
  }
  
  // Format sans préfixe (9 chiffres pour Suisse)
  if (!cleaned.startsWith('+') && cleaned.length === 9) {
    return true
  }
  
  return false
}

/**
 * Convertit un numéro au format href pour les liens tel:
 * @param phone - Le numéro de téléphone
 * @returns Le numéro au format pour href="tel:..."
 */
export function phoneToHref(phone: string): string {
  if (!phone) return ''
  
  const normalized = normalizePhone(phone)
  return normalized || phone.replace(/[^\d+]/g, '')
}

// Maintien de la compatibilité avec l'ancien API
export const formatSwissPhone = formatPhone
export const normalizeSwissPhone = normalizePhone
export const validateSwissPhone = validatePhone
