import { ref, reactive } from 'vue'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  runTransaction,
  onSnapshot,
  query,
  where
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { AuthService } from './auth'
import type { 
  BatchSelection, 
  CellLock, 
  PresenceInfo,
  CreneauHoraire 
} from '../types/planning'
import { LOCK_DURATION_MS, CRENEAUX_QUART_HEURE } from '../types/planning'

export class PlanningInteractionService {
  private static instance: PlanningInteractionService | null = null
  
  private isSelecting = ref(false)
  private selectedCells = ref<Set<string>>(new Set())
  private selectionStart = ref<{ collaborateurId: string; date: string } | null>(null)
  private lockedCells = reactive<Map<string, CellLock>>(new Map())
  private activeUsers = reactive<Map<string, PresenceInfo>>(new Map())
  private unsubscribeFunctions: (() => void)[] = []

  static getInstance(): PlanningInteractionService {
    if (!this.instance) {
      this.instance = new PlanningInteractionService()
    }
    return this.instance
  }

  private constructor() {
    this.setupPresenceTracking()
    this.setupLockTracking()
    this.setupAutoCleanup()
  }

  private getCellKey(collaborateurId: string, date: string): string {
    return `${collaborateurId}-${date}`
  }

  // === SÉLECTION EN BATCH ===
  
  startSelection(collaborateurId: string, date: string, event: MouseEvent) {
    event.preventDefault()
    
    this.isSelecting.value = true
    this.selectedCells.value.clear()
    this.selectionStart.value = { collaborateurId, date }
    
    const cellKey = this.getCellKey(collaborateurId, date)
    this.selectedCells.value.add(cellKey)
    
    // Verrouiller la cellule de départ
    this.lockCell(collaborateurId, date)
  }

  updateSelection(collaborateurId: string, date: string) {
    if (!this.isSelecting.value || !this.selectionStart.value) return

    const start = this.selectionStart.value
    
    // Sélection rectangulaire ou linéaire selon le même collaborateur ou non
    if (collaborateurId === start.collaborateurId) {
      // Même collaborateur : sélection de dates
      this.selectDateRange(collaborateurId, start.date, date)
    } else {
      // Différents collaborateurs : sélection rectangulaire
      this.selectRectangularArea(start, { collaborateurId, date })
    }
  }

  private selectDateRange(collaborateurId: string, startDate: string, endDate: string) {
    this.selectedCells.value.clear()
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const [earlierDate, laterDate] = start <= end ? [start, end] : [end, start]
    
    const current = new Date(earlierDate)
    while (current <= laterDate) {
      const dateStr = current.toISOString().split('T')[0]
      const cellKey = this.getCellKey(collaborateurId, dateStr)
      this.selectedCells.value.add(cellKey)
      current.setDate(current.getDate() + 1)
    }
  }

  private selectRectangularArea(
    start: { collaborateurId: string; date: string },
    end: { collaborateurId: string; date: string }
  ) {
    // Pour l'instant, on ne fait que la sélection de date pour le même collaborateur
    // La sélection rectangulaire multi-collaborateurs est plus complexe
    this.selectDateRange(start.collaborateurId, start.date, end.date)
  }

  endSelection(): string[] {
    this.isSelecting.value = false
    const selectedArray = Array.from(this.selectedCells.value)
    this.selectedCells.value.clear()
    this.selectionStart.value = null
    
    return selectedArray
  }

  cancelSelection() {
    this.isSelecting.value = false
    this.selectedCells.value.clear()
    this.selectionStart.value = null
    
    // Déverrouiller toutes les cellules verrouillées par cet utilisateur
    this.unlockAllUserCells()
  }

  getSelectedCells(): Set<string> {
    return this.selectedCells.value
  }

  // === GESTION DES DISPONIBILITÉS EN BATCH ===

  async createBatchDisponibilites(
    batchData: BatchSelection,
    collaborateurData: { nom: string; prenom: string; metier: string; phone: string; email: string; ville: string }
  ): Promise<void> {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    const userId = auth.currentUser?.uid || 'anonymous'

    try {
      await runTransaction(db, async (transaction) => {
        const disposToCreate = batchData.dates.map(date => ({
          ...collaborateurData,
          date,
          lieu: batchData.lieu || '',
          heure_debut: batchData.heureDebut,
          heure_fin: batchData.heureFin,
          type: batchData.type,
          tenantId,
          version: 1,
          updatedAt: serverTimestamp(),
          updatedBy: userId
        }))

        for (const dispo of disposToCreate) {
          const docRef = doc(collection(db, 'dispos'))
          transaction.set(docRef, dispo)
        }
      })

      console.log('Disponibilités créées en batch:', batchData.dates.length)
    } catch (error) {
      console.error('Erreur création batch:', error)
      throw error
    }
  }

  // === VERROUILLAGE DES CELLULES ===

  private async lockCell(collaborateurId: string, date: string): Promise<boolean> {
    const cellKey = this.getCellKey(collaborateurId, date)
    const userId = auth.currentUser?.uid
    const tenantId = AuthService.currentTenantId || 'keydispo'

    if (!userId) return false

    try {
      const lockDoc = doc(db, `tenants/${tenantId}/locks`, cellKey)
      const lockData = {
        collaborateurId,
        date,
        lockedBy: userId,
        lockedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + LOCK_DURATION_MS)
      }

      await updateDoc(lockDoc, lockData)
      this.lockedCells.set(cellKey, lockData as CellLock)
      
      return true
    } catch (error) {
      // Si le document n'existe pas, on le crée
      try {
        await addDoc(collection(db, `tenants/${tenantId}/locks`), {
          id: cellKey,
          collaborateurId,
          date,
          lockedBy: userId,
          lockedAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + LOCK_DURATION_MS)
        })
        return true
      } catch (createError) {
        console.error('Erreur verrouillage cellule:', createError)
        return false
      }
    }
  }

  private async unlockCell(collaborateurId: string, date: string): Promise<void> {
    const cellKey = this.getCellKey(collaborateurId, date)
    const tenantId = AuthService.currentTenantId || 'keydispo'

    try {
      const lockDoc = doc(db, `tenants/${tenantId}/locks`, cellKey)
      await deleteDoc(lockDoc)
      this.lockedCells.delete(cellKey)
    } catch (error) {
      console.error('Erreur déverrouillage cellule:', error)
    }
  }

  private async unlockAllUserCells(): Promise<void> {
    const userId = auth.currentUser?.uid
    if (!userId) return

    const cellsToUnlock = Array.from(this.lockedCells.entries())
      .filter(([, lock]) => lock.lockedBy === userId)
      .map(([cellKey]) => cellKey)

    for (const cellKey of cellsToUnlock) {
      const [collaborateurId, date] = cellKey.split('-')
      await this.unlockCell(collaborateurId, date)
    }
  }

  isCellLocked(collaborateurId: string, date: string): boolean {
    const cellKey = this.getCellKey(collaborateurId, date)
    const lock = this.lockedCells.get(cellKey)
    
    if (!lock) return false
    
    // Vérifier si le verrouillage n'a pas expiré
    const now = new Date()
    const expiresAt = lock.expiresAt instanceof Date ? lock.expiresAt : new Date(lock.expiresAt.seconds * 1000)
    
    if (now > expiresAt) {
      this.lockedCells.delete(cellKey)
      return false
    }
    
    return true
  }

  getCellLockInfo(collaborateurId: string, date: string): CellLock | null {
    const cellKey = this.getCellKey(collaborateurId, date)
    return this.lockedCells.get(cellKey) || null
  }

  // === SUIVI DE PRÉSENCE ===

  private setupPresenceTracking() {
    const userId = auth.currentUser?.uid
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    if (!userId || !tenantId) return

    // Signaler sa présence
    this.updatePresence()
    
    // Mettre à jour la présence toutes les 30 secondes
    const presenceInterval = setInterval(() => {
      this.updatePresence()
    }, 30000)

    // Écouter les présences des autres utilisateurs
    const presenceQuery = query(
      collection(db, `tenants/${tenantId}/presence`),
      where('isActive', '==', true)
    )

    const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as PresenceInfo
        
        if (change.type === 'added' || change.type === 'modified') {
          this.activeUsers.set(change.doc.id, data)
        } else if (change.type === 'removed') {
          this.activeUsers.delete(change.doc.id)
        }
      })
    })

    this.unsubscribeFunctions.push(() => {
      clearInterval(presenceInterval)
      unsubscribe()
    })
  }

  private async updatePresence() {
    const userId = auth.currentUser?.uid
    const tenantId = AuthService.currentTenantId || 'keydispo'
    
    if (!userId || !tenantId) return

    try {
      const presenceDoc = doc(db, `tenants/${tenantId}/presence`, userId)
      await updateDoc(presenceDoc, {
        lastSeen: serverTimestamp(),
        isActive: true,
        currentView: 'planning'
      })
    } catch (error) {
      // Si le document n'existe pas, on le crée
      try {
        await addDoc(collection(db, `tenants/${tenantId}/presence`), {
          userId,
          userName: auth.currentUser?.displayName || 'Utilisateur',
          lastSeen: serverTimestamp(),
          isActive: true,
          currentView: 'planning'
        })
      } catch (createError) {
        console.error('Erreur mise à jour présence:', createError)
      }
    }
  }

  private setupLockTracking() {
    const tenantId = AuthService.currentTenantId || 'keydispo'
    if (!tenantId) return

    const locksQuery = collection(db, `tenants/${tenantId}/locks`)
    const unsubscribe = onSnapshot(locksQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as CellLock
        
        if (change.type === 'added' || change.type === 'modified') {
          const cellKey = this.getCellKey(data.collaborateurId, data.date)
          this.lockedCells.set(cellKey, data)
        } else if (change.type === 'removed') {
          const cellKey = this.getCellKey(data.collaborateurId, data.date)
          this.lockedCells.delete(cellKey)
        }
      })
    })

    this.unsubscribeFunctions.push(unsubscribe)
  }

  private setupAutoCleanup() {
    // Nettoyer les verrouillages expirés toutes les minutes
    const cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks()
    }, 60000)

    this.unsubscribeFunctions.push(() => clearInterval(cleanupInterval))
  }

  private cleanupExpiredLocks() {
    const now = new Date()
    const expiredLocks: string[] = []

    this.lockedCells.forEach((lock, cellKey) => {
      const expiresAt = lock.expiresAt instanceof Date ? lock.expiresAt : new Date(lock.expiresAt.seconds * 1000)
      if (now > expiresAt) {
        expiredLocks.push(cellKey)
      }
    })

    expiredLocks.forEach(cellKey => {
      this.lockedCells.delete(cellKey)
    })
  }

  // === CRÉNEAUX HORAIRES ===

  getAvailableTimeSlots(): CreneauHoraire[] {
    return CRENEAUX_QUART_HEURE
  }

  findNearestTimeSlot(time: string): string {
    const [hours, minutes] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    
    // Arrondir au quart d'heure le plus proche
    const roundedMinutes = Math.round(totalMinutes / 15) * 15
    const newHours = Math.floor(roundedMinutes / 60)
    const newMinutes = roundedMinutes % 60
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
  }

  // === NETTOYAGE ===

  cleanup() {
    this.unsubscribeFunctions.forEach(unsub => unsub())
    this.unsubscribeFunctions = []
    this.lockedCells.clear()
    this.activeUsers.clear()
    this.cancelSelection()
  }

  destroy() {
    this.cleanup()
    PlanningInteractionService.instance = null
  }
}
