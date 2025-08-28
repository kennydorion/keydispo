/**
 * Service de notifications multi-utilisateur - Phase 4
 * 
 * Gère les notifications temps réel pour les événements multi-utilisateur :
 * - Connexions/déconnexions d'utilisateurs
 * - Conflits de cellules
 * - Activités importantes
 */

import { ref, computed } from 'vue'
import { useToast } from 'vuestic-ui'
import { useSessionDisplay } from './sessionDisplayService'

// ==========================================
// TYPES
// ==========================================

export interface Notification {
  id: string
  type: 'user-join' | 'user-leave' | 'cell-conflict' | 'session-expired' | 'info'
  title: string
  message: string
  timestamp: Date
  userId?: string
  userName?: string
  persistent?: boolean
  action?: {
    label: string
    handler: () => void
  }
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  lastNotification: Date | null
}

// ==========================================
// SERVICE DE NOTIFICATIONS
// ==========================================

class MultiUserNotificationService {
  private notifications = ref<Notification[]>([])
  private unreadCount = ref(0)
  private isEnabled = ref(true)
  private toast = useToast()
  
  // État des utilisateurs pour détecter les changements
  private lastUserCount = 0
  private knownUsers = new Set<string>()
  
  constructor() {
    this.setupUserWatchers()
  }

  /**
   * Initialiser le service de notifications
   */
  init() {
    console.log('🔔 Service de notifications multi-utilisateur initialisé')
    this.isEnabled.value = true
    this.notifications.value = []
    this.unreadCount.value = 0
  }

  /**
   * Surveiller les changements d'utilisateurs
   */
  private setupUserWatchers() {
    const sessionDisplay = useSessionDisplay()
    
    // Surveiller les changements d'utilisateurs
    computed(() => {
      const users = sessionDisplay.users.value || []
      const currentCount = users.length
      const currentUserIds = new Set(users.map(u => u.uid))
      
      // Détection de nouveaux utilisateurs
      if (this.lastUserCount > 0) { // Éviter notifications au démarrage
        // Utilisateurs qui se connectent
        const newUsers = users.filter(u => !this.knownUsers.has(u.uid))
        newUsers.forEach(user => {
          this.notifyUserJoin(user.displayName, user.uid)
        })
        
        // Utilisateurs qui se déconnectent
        const leftUserIds = Array.from(this.knownUsers).filter(uid => !currentUserIds.has(uid))
        leftUserIds.forEach(uid => {
          // On ne peut pas récupérer le nom car l'utilisateur n'est plus dans la liste
          this.notifyUserLeave('Utilisateur', uid)
        })
      }
      
      this.lastUserCount = currentCount
      this.knownUsers = currentUserIds
    })
  }

  /**
   * Notification : utilisateur se connecte
   */
  private notifyUserJoin(userName: string, userId: string) {
    if (!this.isEnabled.value) return
    
    const notification: Notification = {
      id: `join-${userId}-${Date.now()}`,
      type: 'user-join',
      title: 'Nouvel utilisateur',
      message: `${userName} s'est connecté au planning`,
      timestamp: new Date(),
      userId,
      userName
    }
    
    this.addNotification(notification)
    
    // Toast notification
    this.toast.notify({
      message: notification.message,
      color: 'success',
      duration: 3000,
      position: 'top-right'
    })
  }

  /**
   * Notification : utilisateur se déconnecte
   */
  private notifyUserLeave(userName: string, userId: string) {
    if (!this.isEnabled.value) return
    
    const notification: Notification = {
      id: `leave-${userId}-${Date.now()}`,
      type: 'user-leave',
      title: 'Utilisateur déconnecté',
      message: `${userName} a quitté le planning`,
      timestamp: new Date(),
      userId,
      userName
    }
    
    this.addNotification(notification)
    
    // Toast notification
    this.toast.notify({
      message: notification.message,
      color: 'info',
      duration: 2000,
      position: 'top-right'
    })
  }

  /**
   * Notification : conflit de cellule
   */
  notifyCellConflict(cellId: string, otherUserName: string) {
    if (!this.isEnabled.value) return
    
    const notification: Notification = {
      id: `conflict-${cellId}-${Date.now()}`,
      type: 'cell-conflict',
      title: 'Conflit détecté',
      message: `${otherUserName} modifie déjà cette cellule`,
      timestamp: new Date(),
      userName: otherUserName,
      persistent: true,
      action: {
        label: 'Voir cellule',
        handler: () => this.highlightCell(cellId)
      }
    }
    
    this.addNotification(notification)
    
    // Toast notification avec action
    this.toast.notify({
      message: notification.message,
      color: 'warning',
      duration: 5000,
      position: 'top-right'
    })
  }

  /**
   * Notification : session expirée
   */
  notifySessionExpired() {
    if (!this.isEnabled.value) return
    
    const notification: Notification = {
      id: `expired-${Date.now()}`,
      type: 'session-expired',
      title: 'Session expirée',
      message: 'Votre session a expiré. Reconnexion automatique...',
      timestamp: new Date(),
      persistent: true
    }
    
    this.addNotification(notification)
    
    this.toast.notify({
      message: notification.message,
      color: 'warning',
      duration: 4000,
      position: 'top-right'
    })
  }

  /**
   * Notification générale
   */
  notify(type: Notification['type'], title: string, message: string, options?: {
    persistent?: boolean
    userId?: string
    userName?: string
    action?: Notification['action']
  }) {
    if (!this.isEnabled.value) return
    
    const notification: Notification = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      ...options
    }
    
    this.addNotification(notification)
    
    const colorMap = {
      'user-join': 'success',
      'user-leave': 'info', 
      'cell-conflict': 'warning',
      'session-expired': 'warning',
      'info': 'info'
    }
    
    this.toast.notify({
      message: notification.message,
      color: colorMap[type] || 'info',
      duration: 3000,
      position: 'top-right'
    })
  }

  /**
   * Ajouter une notification
   */
  private addNotification(notification: Notification) {
    this.notifications.value.unshift(notification)
    this.unreadCount.value++
    
    // Limiter à 50 notifications
    if (this.notifications.value.length > 50) {
      this.notifications.value = this.notifications.value.slice(0, 50)
    }
    
    console.log(`🔔 Notification: ${notification.title} - ${notification.message}`)
  }

  /**
   * Marquer une notification comme lue
   */
  markAsRead(notificationId: string) {
    const notification = this.notifications.value.find(n => n.id === notificationId)
    if (notification) {
      this.unreadCount.value = Math.max(0, this.unreadCount.value - 1)
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  markAllAsRead() {
    this.unreadCount.value = 0
  }

  /**
   * Supprimer une notification
   */
  removeNotification(notificationId: string) {
    const index = this.notifications.value.findIndex(n => n.id === notificationId)
    if (index !== -1) {
      this.notifications.value.splice(index, 1)
      this.unreadCount.value = Math.max(0, this.unreadCount.value - 1)
    }
  }

  /**
   * Vider toutes les notifications
   */
  clearAll() {
    this.notifications.value = []
    this.unreadCount.value = 0
  }

  /**
   * Activer/désactiver les notifications
   */
  setEnabled(enabled: boolean) {
    this.isEnabled.value = enabled
    console.log(`🔔 Notifications ${enabled ? 'activées' : 'désactivées'}`)
  }

  /**
   * Mettre en surbrillance une cellule (helper pour actions)
   */
  private highlightCell(cellId: string) {
    // Cette fonction pourrait être implémentée pour scroller vers la cellule
    console.log(`🎯 Mise en surbrillance cellule: ${cellId}`)
  }

  // ==========================================
  // GETTERS
  // ==========================================

  get allNotifications() {
    return this.notifications.value
  }

  get recentNotifications() {
    return this.notifications.value.slice(0, 10)
  }

  get unreadNotifications() {
    return this.notifications.value.slice(0, this.unreadCount.value)
  }

  get stats(): NotificationStats {
    const notifications = this.notifications.value
    const byType: Record<string, number> = {}
    
    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1
    })
    
    return {
      total: notifications.length,
      unread: this.unreadCount.value,
      byType,
      lastNotification: notifications[0]?.timestamp || null
    }
  }

  get isNotificationsEnabled() {
    return this.isEnabled.value
  }
}

// ==========================================
// COMPOSABLE
// ==========================================

export function useMultiUserNotifications() {
  return {
    notifications: computed(() => notificationService.allNotifications),
    recentNotifications: computed(() => notificationService.recentNotifications),
    unreadNotifications: computed(() => notificationService.unreadNotifications),
    unreadCount: computed(() => notificationService.stats.unread),
    stats: computed(() => notificationService.stats),
    isEnabled: computed(() => notificationService.isNotificationsEnabled),
    
    // Actions
    markAsRead: (id: string) => notificationService.markAsRead(id),
    markAllAsRead: () => notificationService.markAllAsRead(),
    removeNotification: (id: string) => notificationService.removeNotification(id),
    clearAll: () => notificationService.clearAll(),
    setEnabled: (enabled: boolean) => notificationService.setEnabled(enabled),
    notify: (type: Notification['type'], title: string, message: string, options?: any) => 
      notificationService.notify(type, title, message, options),
    notifyCellConflict: (cellId: string, userName: string) => 
      notificationService.notifyCellConflict(cellId, userName)
  }
}

// ==========================================
// INSTANCE SINGLETON
// ==========================================

export const notificationService = new MultiUserNotificationService()

// Auto-initialisation
notificationService.init()

// Gestion globale des erreurs multi-utilisateur
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('session') || event.reason?.message?.includes('user')) {
      notificationService.notify(
        'session-expired',
        'Erreur de session',
        'Un problème de session utilisateur a été détecté',
        { persistent: true }
      )
    }
  })
}
