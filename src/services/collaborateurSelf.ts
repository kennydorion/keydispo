import { auth } from './firebase'
import { AuthService } from './auth'
import { CollaborateursServiceV2 } from './collaborateursV2'
import { disponibilitesRTDBService, type DisponibiliteRTDB } from './disponibilitesRTDBService'
import { canonicalizeLieu, normalizeDispo } from './normalization'
import { deriveTimeKindFromData } from '../utils/timeKindDerivation'

export interface CollaborateurDisponibilite {
  id?: string
  date: string // YYYY-MM-DD
  lieu: string
  heure_debut: string
  heure_fin: string
  type?: 'disponible' | 'indisponible' | 'mission' // Types UI pour l'affichage
  timeKind?: 'range' | 'slot' | 'full-day' | 'overnight' // Types UI pour l'affichage
  slots?: string[]
  isFullDay?: boolean
  version?: number
}

export interface CollaborateurProfilLight {
  id: string
  tenantId: string
  nom: string
  prenom: string
  metier: string
  email: string | null
  phone: string | null
  ville?: string | null
  color?: string | null
}

function ensureUser() {
  const user = auth.currentUser
  if (!user) throw new Error('Utilisateur non authentifié')
  return user
}

async function resolveMyCollaborateur(): Promise<CollaborateurProfilLight> {
  const user = ensureUser()
  const tenantId = AuthService.currentTenantId || 'default'

  // Charger tous les collaborateurs depuis RTDB (rapide et trié)
  const collaborateurs = await CollaborateursServiceV2.loadCollaborateursFromRTDB(tenantId)

  // 1) Essayer par userId direct
  let me = collaborateurs.find((c: any) => (c as any).userId === user.uid)

  // 2) Fallback par email (case-insensitive)
  if (!me && user.email) {
    const emailLc = user.email.toLowerCase()
  me = collaborateurs.find((c: any) => (c.email || '').toLowerCase() === emailLc)
  }

  if (!me) throw new Error('Profil collaborateur introuvable pour cet utilisateur')

  const result = {
    id: me.id!,
    tenantId: me.tenantId,
    nom: me.nom,
    prenom: me.prenom,
    metier: me.metier,
    email: me.email || null,
    phone: me.phone || null,
    ville: (me as any).ville || null,
    color: me.color || undefined,
  }
  
  return result
}

function mapRTDBToSelf(d: DisponibiliteRTDB): CollaborateurDisponibilite {
  // Convertir les types RTDB vers les types UI
  const mapRTDBTypeToUI = (rtdbType?: string): 'disponible' | 'indisponible' | 'mission' => {
    switch (rtdbType) {
      case 'urgence': return 'mission'        // urgence = mission pour l'UI
      case 'standard': return 'disponible'    // standard = disponible pour l'UI  
      case 'maintenance': return 'indisponible' // maintenance = indisponible pour l'UI
      case 'formation': return 'disponible'   // formation = disponible pour l'UI
      default: return 'disponible'
    }
  }

  // Mapper les timeKind RTDB vers timeKind UI
  const mapRTDBTimeKindToUI = (rtdbTimeKind?: string): 'range' | 'slot' | 'full-day' | 'overnight' => {
    const lieuUpper = (d.lieu || '').toUpperCase().trim()
    if (d.isFullDay || lieuUpper === 'DISPO JOURNEE' || lieuUpper === 'DISPONIBLE JOURNEE') {
      return 'full-day'
    }
    if (d.slots && d.slots.length > 0) {
      return 'slot'
    }
    switch (rtdbTimeKind) {
      case 'flexible':
        if (d.heure_debut && d.heure_fin) return 'range'
        return 'full-day'
      case 'fixed':
        // Sans slots, considérer comme range par défaut
        return 'range'
      case 'oncall':
        return 'range'
      default:
        if (!d.heure_debut || !d.heure_fin) return 'full-day'
        return deriveTimeKindFromData(d) as 'range' | 'slot' | 'full-day' | 'overnight'
    }
  }
  
  const mappedType = mapRTDBTypeToUI(d.type)
  const mappedTimeKind = mapRTDBTimeKindToUI(d.timeKind)
  const mappedSlots = d.slots || []

  // Nettoyage des heures si c'est une journée complète
  let finalHeureDebut = d.heure_debut
  let finalHeureFin = d.heure_fin
  let finalIsFullDay = d.isFullDay || false

  if (mappedTimeKind === 'full-day') {
    finalHeureDebut = ''
    finalHeureFin = ''
    finalIsFullDay = true
  }
  
  const result = {
    id: d.id,
    date: d.date,
    lieu: d.lieu,
    heure_debut: finalHeureDebut,
    heure_fin: finalHeureFin,
    type: mappedType,
    timeKind: mappedTimeKind,
    slots: mappedSlots,
    isFullDay: finalIsFullDay,
    version: d.version,
  }
  
  return result
}

export const CollaborateurSelfService = {
  async getMonProfil(): Promise<CollaborateurProfilLight> {
    return resolveMyCollaborateur()
  },

  async getMesDisponibilites(dateDebut?: string, dateFin?: string): Promise<CollaborateurDisponibilite[]> {
    const me = await resolveMyCollaborateur()
    const tenantId = me.tenantId
    // S'assurer que le service RTDB pointe sur le bon tenant
    disponibilitesRTDBService.setTenantId(tenantId)

    let dispos: DisponibiliteRTDB[]
    if (dateDebut && dateFin) {
      const all = await disponibilitesRTDBService.getDisponibilitesByDateRange(dateDebut, dateFin)
      dispos = all.filter(d => d.collaborateurId === me.id)
    } else {
      dispos = await disponibilitesRTDBService.getDisponibilitesByCollaborateur(me.id)
    }
    // Ordre stable par date puis nom dans le service sous-jacent
    return dispos.map(mapRTDBToSelf)
  },

  subscribeMesDisponibilites(
    dateDebut: string,
    dateFin: string,
    callback: (dispos: CollaborateurDisponibilite[]) => void
  ): () => void {
    let stopped = false
    let lastLogTime = 0
    // Wrapper qui résout le collaborateur puis attache le listener
    ;(async () => {
      try {
        const me = await resolveMyCollaborateur()
        disponibilitesRTDBService.setTenantId(me.tenantId)
        const listenerId = disponibilitesRTDBService.listenToDisponibilitesByDateRange(
          dateDebut,
          dateFin,
          (arr) => {
            if (stopped) return
            const myDispos = arr.filter(d => d.collaborateurId === me.id)
            // Log optimisé pour éviter le spam
            const currentTime = Date.now()
            if (!lastLogTime || currentTime - lastLogTime > 2000) {
              console.log(`🔄 Callback RTDB temps réel: ${myDispos.length} disponibilités pour ${me.nom} ${me.prenom}`)
              lastLogTime = currentTime
            }
            callback(myDispos.map(mapRTDBToSelf))
          }
        )
        if (stopped && listenerId) {
          disponibilitesRTDBService.stopListener(listenerId)
        }
      } catch (e) {
        console.error('subscribeMesDisponibilites error:', e)
      }
    })()

    return () => {
      stopped = true
      // Le listener est stoppé via stopAllListeners si nécessaire, sinon il sera GC à reload
      // On ne connaît pas ici l'ID synchronement; les listeners sont nettoyés par l'appelant quand il change de plage
      try { disponibilitesRTDBService.stopAllListeners() } catch {}
    }
  },

  async createMaDisponibilite(data: { date: string; lieu: string; heure_debut: string; heure_fin: string; timeKind?: 'slot' | 'range' | 'full-day' | 'overnight'; slots?: string[] }): Promise<string> {
    const me = await resolveMyCollaborateur()
    disponibilitesRTDBService.setTenantId(me.tenantId)

    // Normaliser et bloquer les missions (collaborateur ne peut pas créer de mission)
    const normalized = normalizeDispo({
      date: data.date,
      lieu: data.lieu,
      heure_debut: data.heure_debut,
      heure_fin: data.heure_fin,
    })
    if (normalized.type === 'mission') {
      throw new Error('Vous ne pouvez pas créer une mission. Choisissez "DISPO JOURNEE" ou "INDISPONIBLE".')
    }

    // Force les lieux statuts corrects (éviter de stocker un libellé ambigu)
    const canonLieu = canonicalizeLieu(data.lieu)

    // Cas spécial: création par créneaux (slots)
    if (data.timeKind === 'slot' || (data.slots && data.slots.length > 0)) {
      const payloadSlot: Partial<DisponibiliteRTDB> = {
        collaborateurId: me.id,
        tenantId: me.tenantId,
        nom: me.nom,
        prenom: me.prenom,
        metier: me.metier,
        phone: me.phone || '',
        email: me.email || '',
        note: '',
        date: data.date,
        lieu: '',
        heure_debut: '',
        heure_fin: '',
        type: 'standard',
        timeKind: 'fixed',
        slots: data.slots || [],
      }
      return disponibilitesRTDBService.createDisponibilite(payloadSlot)
    }

    const payload: Partial<DisponibiliteRTDB> = {
      collaborateurId: me.id,
      tenantId: me.tenantId,
      nom: me.nom,
      prenom: me.prenom,
      metier: me.metier,
      phone: me.phone || '',
      email: me.email || '',
      note: '',
      date: data.date,
      lieu: canonLieu,
      heure_debut: data.heure_debut,
      heure_fin: data.heure_fin,
      type: normalized.type === 'indisponible' ? 'maintenance' : 'standard',
      timeKind: normalized.timeKind === 'full-day' ? 'fixed' : 'flexible',
      isFullDay: normalized.timeKind === 'full-day' ? true : undefined,
    }

    return disponibilitesRTDBService.createDisponibilite(payload)
  },

  async updateMaDisponibilite(id: string, updates: Partial<CollaborateurDisponibilite>): Promise<void> {
    const me = await resolveMyCollaborateur()
    disponibilitesRTDBService.setTenantId(me.tenantId)

    // On ne peut pas changer certains champs (sécurité)
    const { collaborateurId, tenantId, nom, prenom, metier, phone, email, ...allowedUpdates } = updates as any

    const rtdbUpdates: Partial<DisponibiliteRTDB> = {}
    if (allowedUpdates.date) rtdbUpdates.date = allowedUpdates.date
    if (allowedUpdates.lieu) rtdbUpdates.lieu = canonicalizeLieu(allowedUpdates.lieu)
    if (allowedUpdates.heure_debut) rtdbUpdates.heure_debut = allowedUpdates.heure_debut
    if (allowedUpdates.heure_fin) rtdbUpdates.heure_fin = allowedUpdates.heure_fin
    if (allowedUpdates.slots) rtdbUpdates.slots = allowedUpdates.slots

    // Mode créneau: si timeKind=slot ou des slots sont fournis, on force le mapping RTDB
    const isSlotMode = allowedUpdates.timeKind === 'slot' || (rtdbUpdates.slots && rtdbUpdates.slots.length > 0)
    if (isSlotMode) {
      rtdbUpdates.timeKind = 'fixed'
      rtdbUpdates.type = 'standard'
      rtdbUpdates.isFullDay = undefined
      rtdbUpdates.heure_debut = ''
      rtdbUpdates.heure_fin = ''
    }

    // Re-normaliser pour cohérence
    if (!isSlotMode && (rtdbUpdates.lieu || rtdbUpdates.heure_debut || rtdbUpdates.heure_fin)) {
      const normalized = normalizeDispo({
        date: allowedUpdates.date || '',
        lieu: rtdbUpdates.lieu || '',
        heure_debut: rtdbUpdates.heure_debut || '',
        heure_fin: rtdbUpdates.heure_fin || '',
      })
      rtdbUpdates.type = normalized.type === 'indisponible' ? 'maintenance' : 'standard'
      rtdbUpdates.timeKind = normalized.timeKind === 'full-day' ? 'fixed' : 'flexible'
      rtdbUpdates.isFullDay = normalized.timeKind === 'full-day' ? true : undefined
    }

    await disponibilitesRTDBService.updateDisponibilite(id, rtdbUpdates)
  },

  async deleteMaDisponibilite(id: string): Promise<void> {
    const me = await resolveMyCollaborateur()
    disponibilitesRTDBService.setTenantId(me.tenantId)
    await disponibilitesRTDBService.deleteDisponibilite(id)
  }
}
