import { ref } from 'vue'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { AuthService } from './auth'
import type { DisponibiliteExtended } from '../types/planning'

interface ScrollState {
  currentWeekStart: Date
  loadedWeeks: Map<string, DisponibiliteExtended[]>
  isLoading: boolean
  hasMore: {
    left: boolean
    right: boolean
  }
}

export class InfiniteScrollService {
  private static instance: InfiniteScrollService | null = null
  
  private scrollState = ref<ScrollState>({
    currentWeekStart: this.getWeekStart(new Date()),
    loadedWeeks: new Map(),
    isLoading: false,
    hasMore: {
      left: true,
      right: true
    }
  })

  private maxLoadedWeeks = 12 // Limite en mémoire pour éviter les fuites
  
  static getInstance(): InfiniteScrollService {
    if (!this.instance) {
      this.instance = new InfiniteScrollService()
    }
    return this.instance
  }

  private constructor() {
    // Charger la semaine actuelle au démarrage
    this.loadWeek(this.scrollState.value.currentWeekStart)
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lundi = début de semaine
    const weekStart = new Date(d.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  }

  private getWeekKey(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  private addWeeks(date: Date, weeks: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + (weeks * 7))
    return result
  }

  async loadWeek(weekStart: Date): Promise<DisponibiliteExtended[]> {
    const weekKey = this.getWeekKey(weekStart)
    
    // Si déjà chargée, retourner depuis le cache
    if (this.scrollState.value.loadedWeeks.has(weekKey)) {
      return this.scrollState.value.loadedWeeks.get(weekKey)!
    }

    this.scrollState.value.isLoading = true
    
    try {
      const tenantId = AuthService.currentTenantId || 'keydispo'
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const startDate = weekStart.toISOString().split('T')[0]
      const endDate = weekEnd.toISOString().split('T')[0]
      
      const disposRef = collection(db, 'dispos')
      const q = query(
        disposRef,
        where('tenantId', '==', tenantId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date'),
        orderBy('nom'),
        orderBy('prenom')
      )
      
      const snapshot = await getDocs(q)
      const disponibilites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DisponibiliteExtended[]
      
      // Stocker dans le cache
      this.scrollState.value.loadedWeeks.set(weekKey, disponibilites)
      
      // Nettoyer le cache si trop de semaines chargées
      this.cleanupCache()
      
      return disponibilites
      
    } catch (error) {
      console.error('Erreur chargement semaine:', error)
      return []
    } finally {
      this.scrollState.value.isLoading = false
    }
  }

  private cleanupCache() {
    const loadedWeeks = this.scrollState.value.loadedWeeks
    if (loadedWeeks.size <= this.maxLoadedWeeks) return

    // Garder seulement les semaines autour de la semaine actuelle
    const currentWeekTime = this.scrollState.value.currentWeekStart.getTime()
    
    const keysToDelete: string[] = []
    
    loadedWeeks.forEach((_, weekKey) => {
      const weekDate = new Date(weekKey)
      const timeDiff = Math.abs(weekDate.getTime() - currentWeekTime)
      const weeksDiff = timeDiff / (7 * 24 * 60 * 60 * 1000)
      
      // Supprimer les semaines à plus de 6 semaines de distance
      if (weeksDiff > 6) {
        keysToDelete.push(weekKey)
      }
    })
    
    keysToDelete.forEach(key => loadedWeeks.delete(key))
  }

  async scrollLeft(): Promise<DisponibiliteExtended[]> {
    if (this.scrollState.value.isLoading) return []
    
    const newWeekStart = this.addWeeks(this.scrollState.value.currentWeekStart, -1)
    this.scrollState.value.currentWeekStart = newWeekStart
    
    return await this.loadWeek(newWeekStart)
  }

  async scrollRight(): Promise<DisponibiliteExtended[]> {
    if (this.scrollState.value.isLoading) return []
    
    const newWeekStart = this.addWeeks(this.scrollState.value.currentWeekStart, 1)
    this.scrollState.value.currentWeekStart = newWeekStart
    
    return await this.loadWeek(newWeekStart)
  }

  async preloadAdjacentWeeks() {
    // Précharger la semaine précédente et suivante
    const prevWeek = this.addWeeks(this.scrollState.value.currentWeekStart, -1)
    const nextWeek = this.addWeeks(this.scrollState.value.currentWeekStart, 1)
    
    Promise.all([
      this.loadWeek(prevWeek),
      this.loadWeek(nextWeek)
    ]).catch(console.error)
  }

  getVisibleWeekData(): DisponibiliteExtended[] {
    const weekKey = this.getWeekKey(this.scrollState.value.currentWeekStart)
    return this.scrollState.value.loadedWeeks.get(weekKey) || []
  }

  getCurrentWeekStart(): Date {
    return new Date(this.scrollState.value.currentWeekStart)
  }

  getWeekDates(weekStart: Date): Date[] {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  isLoading(): boolean {
    return this.scrollState.value.isLoading
  }

  // Naviguer à une date spécifique
  async goToDate(targetDate: Date): Promise<DisponibiliteExtended[]> {
    const targetWeekStart = this.getWeekStart(targetDate)
    this.scrollState.value.currentWeekStart = targetWeekStart
    
    const data = await this.loadWeek(targetWeekStart)
    this.preloadAdjacentWeeks()
    
    return data
  }

  // Obtenir toutes les données chargées pour une plage de dates
  getDataForRange(startDate: Date, endDate: Date): DisponibiliteExtended[] {
    const allData: DisponibiliteExtended[] = []
    
    this.scrollState.value.loadedWeeks.forEach(weekData => {
      const filteredData = weekData.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= startDate && itemDate <= endDate
      })
      allData.push(...filteredData)
    })
    
    return allData.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.nom !== b.nom) return a.nom.localeCompare(b.nom)
      return a.prenom.localeCompare(b.prenom)
    })
  }

  // Nettoyer toutes les données (utile lors de la déconnexion)
  clearCache() {
    this.scrollState.value.loadedWeeks.clear()
    this.scrollState.value.currentWeekStart = this.getWeekStart(new Date())
  }
}
