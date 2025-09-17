/**
 * Service de gestion intelligente des interfaces Admin/Collaborateur
 * Détermine quelle interface afficher basé sur l'origine de connexion (sessionStorage) et le rôle utilisateur
 */

import { ref, computed } from 'vue'
import { AuthService } from './auth'

export type InterfaceType = 'admin' | 'collaborateur'
export type UserRole = 'admin' | 'editor' | 'viewer' | 'collaborateur'
export type LoginOrigin = 'admin' | 'collaborateur'

interface InterfaceState {
  currentInterface: InterfaceType
  userRole: UserRole | null
  isAuthorized: boolean
  loginOrigin: LoginOrigin | null
  userEmail?: string | null
}

const interfaceState = ref<InterfaceState>({
  currentInterface: 'admin',
  userRole: null,
  isAuthorized: false,
  loginOrigin: null,
  userEmail: null
})

/**
 * Clés pour le sessionStorage (spécifique à chaque fenêtre)
 */
const SESSION_KEYS = {
  LOGIN_ORIGIN: 'keydispo_login_origin'
}

/**
 * Gestion du sessionStorage pour l'origine de connexion
 */
function getLoginOrigin(): LoginOrigin | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(SESSION_KEYS.LOGIN_ORIGIN) as LoginOrigin | null
}

function setLoginOrigin(origin: LoginOrigin) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_KEYS.LOGIN_ORIGIN, origin)
  interfaceState.value.loginOrigin = origin
}

function clearLoginOrigin() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEYS.LOGIN_ORIGIN)
  interfaceState.value.loginOrigin = null
}

/**
 * Détermine l'interface souhaitée basée sur l'origine de connexion et l'URL
 */
function getInterfaceFromContext(path: string): InterfaceType {
  // 1. Si on est sur une page de login, utiliser l'origine selon l'URL
  if (path.includes('/login')) {
    if (path.includes('/collaborateur/login')) {
      return 'collaborateur'
    } else {
      return 'admin'
    }
  }
  
  // 2. Si URL contient /collaborateur/, priorité à l'interface collaborateur  
  if (path.includes('/collaborateur/')) {
    return 'collaborateur'
  }
  // 3. Pour toute autre route (non-collaborateur), imposer l'interface admin
  //    Ceci évite de rester bloqué en mode collaborateur si l'origine persiste en session
  return 'admin'
}

/**
 * Vérifie si l'utilisateur est autorisé à accéder à une interface
 */
function isUserAuthorized(userRole: UserRole | null, _requestedInterface: InterfaceType): boolean {
  // TEMPORAIRE : Mode permissif pour debug - tous les utilisateurs connectés ont accès
  if (!userRole) return false
  
  // En attendant de corriger les rôles, autoriser tous les rôles partout
  return true
  
  /* LOGIQUE ORIGINALE À RÉTABLIR PLUS TARD
  switch (requestedInterface) {
    case 'admin':
      // Seuls admin, editor, viewer peuvent accéder à l'interface admin
      return ['admin', 'editor', 'viewer'].includes(userRole)
    case 'collaborateur':
      // Tous les rôles peuvent accéder à l'interface collaborateur
      // (admin peut voir l'interface collaborateur s'il se connecte via ce login)
      return ['admin', 'editor', 'viewer', 'collaborateur'].includes(userRole)
    default:
      return false
  }
  */
}

/**
 * Vérifie si l'utilisateur est autorisé à accéder à une interface
 */

/**
 * Service principal de gestion des interfaces
 */
export class InterfaceManager {
  
  /**
   * Initialise le service avec le router
   */
  static initialize(router: any) {
    // Initialiser l'origine de connexion depuis sessionStorage
    const savedOrigin = getLoginOrigin()
    interfaceState.value.loginOrigin = savedOrigin
    
    // Surveiller les changements de route via le router
    router.afterEach((to: any) => {
      this.handleRouteChange(to.path, router)
    })
    
    // Initialiser avec la route courante
    if (router.currentRoute?.value?.path) {
      this.handleRouteChange(router.currentRoute.value.path, router)
    }
    
    // Surveiller les changements d'authentification
    AuthService.onAuthStateChanged((user) => {
      if (user) {
        // Obtenir le path actuel de façon sécurisée
        const currentPath = router.currentRoute?.value?.path || '/'
        this.handleUserChange(user, router, currentPath)
      } else {
        // Nettoyer l'état mais garder l'origine pour la prochaine connexion
        interfaceState.value = {
          currentInterface: 'admin',
          userRole: null,
          isAuthorized: false,
          loginOrigin: interfaceState.value.loginOrigin, // Conserver l'origine
          userEmail: null
        }
      }
    })
  }
  
  /**
   * Gère les changements de route
   */
  private static handleRouteChange(path: string, _router: any) {
    // Récupérer l'origine de connexion depuis sessionStorage
    const loginOrigin = getLoginOrigin()
    const userRole = interfaceState.value.userRole
    
    // Déterminer l'interface basée sur le contexte complet
  const requestedInterface = getInterfaceFromContext(path)
    const authorized = isUserAuthorized(userRole, requestedInterface)
    
    // Mettre à jour l'état SEULEMENT si l'utilisateur est connecté
    // Pour les pages de login, on garde l'interface temporaire
    if (userRole) {
      interfaceState.value.currentInterface = requestedInterface
      interfaceState.value.isAuthorized = authorized
    }
    
    interfaceState.value.loginOrigin = loginOrigin
  }  /**
   * Gère les changements d'utilisateur
   */
  private static async handleUserChange(user: any, _router: any, currentPath: string) {
    try {
      // Récupérer l'origine de connexion immédiatement
      const loginOrigin = getLoginOrigin()
      interfaceState.value.loginOrigin = loginOrigin
  interfaceState.value.userEmail = (user?.email || '').toLowerCase()
      
      // Récupérer le rôle utilisateur depuis AuthService (méthode testée)
      const tenantUser = await AuthService.getUserRole(user.uid)
      let userRole = tenantUser?.role as UserRole || null
      
      // ÉLÉVATION IMMÉDIATE: si l'email est admin mais le rôle n'est pas 'admin', corriger
      if (user?.email) {
        const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
          .split(',')
          .map((e: string) => e.trim())
        if (adminEmails.includes(user.email) && userRole !== 'admin') {
          try {
            await AuthService.updateUserRole(user.uid, 'admin')
            userRole = 'admin'
          } catch (e) {
            console.warn('⚠️ Impossible d\'élever le rôle à admin, utilisation du rôle courant:', e)
          }
        }
      }

      // Si aucun rôle trouvé, créer automatiquement un rôle selon le contexte
      if (!userRole && user.email) {
        const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim())
        
        // Pour les emails admin définis
        if (adminEmails.includes(user.email)) {
          try {
            await AuthService.updateUserRole(user.uid, 'admin')
            userRole = 'admin'
          } catch (error) {
            console.error('❌ Erreur création rôle admin automatique:', error)
          }
        }
        // Pour les connexions via l'interface collaborateur
        else if (loginOrigin === 'collaborateur' || currentPath.includes('/collaborateur/')) {
          try {
            await AuthService.updateUserRole(user.uid, 'collaborateur')
            userRole = 'collaborateur'
          } catch (error) {
            console.error('❌ Erreur création rôle collaborateur automatique:', error)
            // Fallback : assigner temporairement le rôle collaborateur
            userRole = 'collaborateur'
          }
        }
      }
      
      interfaceState.value.userRole = userRole
      
      // FORCER la mise à jour de l'interface basée sur le contexte après connexion
  const requestedInterface = getInterfaceFromContext(currentPath)
      const authorized = isUserAuthorized(userRole, requestedInterface)
      
      interfaceState.value.currentInterface = requestedInterface
      interfaceState.value.isAuthorized = authorized
      
      // Redirection automatique UNIQUEMENT depuis une page de login
      if (currentPath.includes('/login')) {
        try {
          // 1) Respecter un éventuel redirect défini par le guard
          const redirectQuery = (_router.currentRoute?.value?.query?.redirect as string) || ''
          if (redirectQuery) {
            await _router.push(redirectQuery)
            return
          }

          // 2) Choix par interface demandée / origine
          if (interfaceState.value.currentInterface === 'collaborateur' || interfaceState.value.loginOrigin === 'collaborateur') {
            // Route dédiée collaborateur
            const target = '/collaborateur/planning'
            await _router.push(target)
          } else {
            const target = '/dashboard'
            await _router.push(target)
          }
        } catch (e) {
          console.warn('⚠️ Redirection post-login ignorée (probable navigation redondante):', e)
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du rôle:', error)
      interfaceState.value.userRole = null
      interfaceState.value.isAuthorized = false
    }
  }
  
  /**
   * Force l'accès à l'interface collaborateur
   * SANS redirection - juste mise à jour de l'interface
   */
  static forceCollaborateurInterface() {
    setLoginOrigin('collaborateur')
    interfaceState.value.currentInterface = 'collaborateur'
  }
  
  /**
   * Force l'accès à l'interface admin
   * SANS redirection - juste mise à jour de l'interface
   */
  static forceAdminInterface() {
    setLoginOrigin('admin')
    interfaceState.value.currentInterface = 'admin'
  }
  
  /**
   * Nettoie l'origine de connexion (déconnexion)
   */
  static clearLoginOrigin() {
    clearLoginOrigin()
  }
  
  /**
   * Marque l'origine de connexion manuellement
   */
  static setLoginOrigin(origin: LoginOrigin) {
    setLoginOrigin(origin)
  }
  
  /**
   * Obtient l'origine de connexion actuelle
   */
  static getLoginOrigin(): LoginOrigin | null {
    return getLoginOrigin()
  }
  
  /**
   * Force temporairement l'affichage d'une interface sans changer l'origine
   * Utilisé pour les pages de login
   */
  static setTemporaryInterface(interfaceType: InterfaceType) {
    interfaceState.value.currentInterface = interfaceType
  }
  
  /**
   * Getters réactifs
   */
  static get currentInterface() {
    return computed(() => interfaceState.value.currentInterface)
  }
  
  static get userRole() {
    return computed(() => interfaceState.value.userRole)
  }
  
  static get isAuthorized() {
    return computed(() => interfaceState.value.isAuthorized)
  }
  
  static get isAdminInterface() {
    return computed(() => interfaceState.value.currentInterface === 'admin')
  }
  
  static get isCollaborateurInterface() {
    return computed(() => interfaceState.value.currentInterface === 'collaborateur')
  }
  
  static get canAccessAdminFeatures() {
    return computed(() => {
      const role = interfaceState.value.userRole
  // 1) Interface Admin visible => activer les fonctionnalités admin pour l'UI
  //    (les règles de sécurité backend restent en place)
  if (interfaceState.value.currentInterface === 'admin') return true

  // 2) Rôle explicite
  if (role && ['admin', 'editor'].includes(role)) return true

  // 3) Fallback UI: autoriser les emails admins définis dans l'env
  const email = (interfaceState.value.userEmail || '').toLowerCase()
  return !!email && AuthService.adminEmails.includes(email)
    })
  }
  
  static get navigationItems() {
    return computed(() => {
      const isCollabInterface = interfaceState.value.currentInterface === 'collaborateur'
      const role = interfaceState.value.userRole
      
      if (isCollabInterface) {
        // Interface collaborateur - navigation simplifiée
        return [
          { path: '/collaborateur/planning', label: 'Mon Planning', icon: 'calendar_today' },
          { path: '/collaborateur/dashboard', label: 'Tableau de bord', icon: 'dashboard' }
        ]
      } else {
        // Interface admin - navigation complète basée sur les permissions
        const items = [
          { path: '/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
          { path: '/semaine', label: 'Planning', icon: 'calendar_month' }
        ]
        
        // Affichage des outils d'admin si l'interface admin est active
        // ou si l'utilisateur a un rôle admin/editor, ou email admin déclaré.
        const isAdminInterface = interfaceState.value.currentInterface === 'admin'
        const isAdminOrEditor = !!role && ['admin', 'editor'].includes(role)
        const isAdminEmail = !!(interfaceState.value.userEmail || '') && AuthService.adminEmails.includes((interfaceState.value.userEmail || '').toLowerCase())
        const showAdminTools = isAdminInterface || isAdminOrEditor || isAdminEmail

        if (showAdminTools) {
          // Exposer également l'entrée "Mon planning" (vue collaborateur)
          // pour permettre aux administrateurs d'accéder à l'interface collaborateur
          items.push(
            { path: '/collaborateur/planning', label: 'Mon planning', icon: 'calendar_today' }
          )
          
          items.push(
            { path: '/collaborateurs', label: 'Collaborateurs', icon: 'people' },
            { path: '/import', label: 'Import', icon: 'upload_file' }
          )
        }
        
        if (role === 'admin') {
          items.push({ path: '/parametres', label: 'Paramètres', icon: 'settings' })
        }
        
        return items
      }
    })
  }
}

// Exports pour la compatibilité
export const {
  currentInterface,
  userRole,
  isAuthorized,
  isAdminInterface,
  isCollaborateurInterface,
  canAccessAdminFeatures,
  navigationItems
} = InterfaceManager
