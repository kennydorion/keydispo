/**
 * Service utilitaire centralisé pour les avatars
 * 
 * Gère de manière cohérente :
 * - Génération des initiales basées sur nom/prénom
 * - Couleurs d'avatar consistantes
 * - Fallbacks appropriés
 */

/**
 * Génère les initiales à partir du nom complet
 * Priorité : nom/prénom > displayName > email (en dernier recours)
 */
export function getUserInitials(user: {
  nom?: string
  prenom?: string
  displayName?: string
  userName?: string
  email?: string
  userEmail?: string
}): string {
  // 1. Priorité : nom + prénom (données collaborateur)
  if (user.nom && user.prenom) {
    const nom = user.nom.trim()
    const prenom = user.prenom.trim()
    if (nom && prenom) {
      return (prenom[0] + nom[0]).toUpperCase()
    }
  }
  
  // 2. Si on a seulement un nom ou un prénom
  if (user.nom && !user.prenom) {
    const nom = user.nom.trim()
    if (nom.length >= 2) {
      return nom.substring(0, 2).toUpperCase()
    }
    return nom[0].toUpperCase() + nom[0].toUpperCase()
  }
  
  if (user.prenom && !user.nom) {
    const prenom = user.prenom.trim()
    if (prenom.length >= 2) {
      return prenom.substring(0, 2).toUpperCase()
    }
    return prenom[0].toUpperCase() + prenom[0].toUpperCase()
  }
  
  // 3. displayName ou userName (format "Prénom Nom")
  const fullName = user.displayName || user.userName
  if (fullName && fullName.trim()) {
    const words = fullName.trim().split(/\s+/)
    if (words.length >= 2) {
      // Plusieurs mots : première lettre du premier et dernier mot
      return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    } else if (words[0].length >= 2) {
      // Un seul mot : deux premières lettres
      return words[0].substring(0, 2).toUpperCase()
    } else {
      return words[0][0].toUpperCase() + words[0][0].toUpperCase()
    }
  }
  
  // 4. En dernier recours : email
  const email = user.email || user.userEmail
  if (email) {
    const emailPart = email.split('@')[0]
    const parts = emailPart.split(/[._-]/)
    
    if (parts.length >= 2) {
      // Séparer par ., _, ou - : prendre première lettre de chaque partie
      return (parts[0][0] + parts[1][0]).toUpperCase()
    } else if (emailPart.length >= 2) {
      // Un seul mot : deux premières lettres
      return emailPart.substring(0, 2).toUpperCase()
    } else {
      return emailPart[0].toUpperCase() + emailPart[0].toUpperCase()
    }
  }
  
  return '??'
}

/**
 * Génère une couleur d'avatar cohérente basée sur l'UID utilisateur
 */
export function getUserColor(uid: string, customColor?: string): string {
  // Si couleur personnalisée définie, l'utiliser
  if (customColor) {
    return customColor
  }
  
  // Protection contre les UID invalides
  if (!uid || typeof uid !== 'string') {
    console.warn('⚠️ getUserColor appelé avec uid invalide:', uid)
    return '#6b7280' // couleur par défaut grise
  }
  
  // Palette de couleurs cohérente et accessible
  const colors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#84cc16', // lime-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#6366f1', // indigo-500
    '#eab308', // yellow-500
  ]
  
  // Générer un hash consistant du UID
  let hash = 0
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash + uid.charCodeAt(i)) & 0xffffffff
  }
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Interface pour les données utilisateur complètes avec avatar
 */
export interface UserAvatarData {
  uid: string
  initials: string
  color: string
  displayName: string
}

/**
 * Crée les données d'avatar complètes pour un utilisateur
 */
export function createUserAvatarData(user: {
  uid: string
  nom?: string
  prenom?: string
  displayName?: string
  userName?: string
  email?: string
  userEmail?: string
}, customColor?: string): UserAvatarData {
  const initials = getUserInitials(user)
  const color = getUserColor(user.uid, customColor)
  
  // Déterminer le nom d'affichage préféré
  let displayName = ''
  if (user.nom && user.prenom) {
    displayName = `${user.prenom} ${user.nom}`
  } else if (user.displayName) {
    displayName = user.displayName
  } else if (user.userName) {
    displayName = user.userName
  } else if (user.email || user.userEmail) {
    const email = user.email || user.userEmail!
    displayName = email.split('@')[0]
  } else {
    displayName = 'Utilisateur'
  }
  
  return {
    uid: user.uid,
    initials,
    color,
    displayName: displayName.trim()
  }
}
