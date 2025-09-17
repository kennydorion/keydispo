import { ref as rtdbRef, get as rtdbGet, set as rtdbSet, update as rtdbUpdate, runTransaction } from 'firebase/database'
import { rtdb } from './firebase'

export type RegistrationCodeStatus = 'active' | 'used' | 'revoked' | 'expired'

export interface RegistrationCode {
  code: string
  tenantId: string
  collaborateurId: string
  createdAt: number
  createdBy: string
  expiresAt?: number
  status: RegistrationCodeStatus
  usedAt?: number
  usedBy?: string
  revokedAt?: number
  revokedBy?: string
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateHumanCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length)
    out += CODE_ALPHABET[idx]
  }
  return out
}

export class RegistrationCodesService {
  static async generateForCollaborateur(
    tenantId: string,
    collaborateurId: string,
    createdBy: string,
    opts?: { length?: number; expiresInDays?: number }
  ): Promise<RegistrationCode> {
    const length = opts?.length ?? 8
    const expiresInDays = opts?.expiresInDays ?? 7
    const now = Date.now()
    const expiresAt = expiresInDays > 0 ? now + expiresInDays * 24 * 60 * 60 * 1000 : undefined

    // Tenter plusieurs codes jusqu'à trouver un code libre
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateHumanCode(length)
      const codeRef = rtdbRef(rtdb, `tenants/${tenantId}/activationCodes/${code}`)
      const snap = await rtdbGet(codeRef)
      if (!snap.exists()) {
        const payload: RegistrationCode = {
          code,
          tenantId,
          collaborateurId,
          createdAt: now,
          createdBy,
          expiresAt,
          status: 'active'
        }

        await rtdbSet(codeRef, payload)

        // Index léger côté collaborateur pour lecture simple
        const collabRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
        await rtdbUpdate(collabRef, {
          registrationCode: code,
          registrationStatus: 'active',
          registrationExpiresAt: expiresAt ?? null,
          updatedAt: now
        })

        return payload
      }
    }
    throw new Error("Impossible de générer un code unique, réessayez")
  }

  static async getCode(tenantId: string, code: string): Promise<RegistrationCode | null> {
    const codeRef = rtdbRef(rtdb, `tenants/${tenantId}/activationCodes/${code}`)
    const snap = await rtdbGet(codeRef)
    if (!snap.exists()) return null
    return snap.val() as RegistrationCode
  }

  static async revoke(tenantId: string, code: string, revokedBy: string): Promise<void> {
    const now = Date.now()
    const codeRef = rtdbRef(rtdb, `tenants/${tenantId}/activationCodes/${code}`)
    await runTransaction(codeRef, (current: any) => {
      if (!current) return current
      if (current.status !== 'active') return current
      return { ...current, status: 'revoked', revokedAt: now, revokedBy }
    })

    // Mettre à jour l'index côté collaborateur si présent
    const codeData = await this.getCode(tenantId, code)
    if (codeData?.collaborateurId) {
      const collabRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs/${codeData.collaborateurId}`)
      await rtdbUpdate(collabRef, {
        registrationStatus: 'revoked',
        updatedAt: now
      })
    }
  }

  static async consumeAndLink(
    tenantId: string,
    code: string,
    usedByUid: string
  ): Promise<{ collaborateurId: string }> {
    const now = Date.now()
    const codeRef = rtdbRef(rtdb, `tenants/${tenantId}/activationCodes/${code}`)

    let collaborateurId: string | null = null

    // Transaction pour marquer le code utilisé de manière atomique
    await runTransaction(codeRef, (current: any) => {
      if (!current) return current
      const expired = current.expiresAt && now > current.expiresAt
      if (current.status !== 'active' || expired) {
        return current // pas de changement, échec
      }
      collaborateurId = current.collaborateurId
      return { ...current, status: expired ? 'expired' : 'used', usedAt: now, usedBy: usedByUid }
    })

    if (!collaborateurId) {
      // Relire pour distinguer les cas
      const latest = await this.getCode(tenantId, code)
      if (!latest) throw new Error('Code invalide')
      if (latest.status === 'used') throw new Error('Code déjà utilisé')
      if (latest.status === 'revoked') throw new Error('Code révoqué')
      if (latest.expiresAt && now > latest.expiresAt) throw new Error('Code expiré')
      throw new Error('Code non valide')
    }

  // Lier l'utilisateur au collaborateur côté RTDB
    const collabRtdbRef = rtdbRef(rtdb, `tenants/${tenantId}/collaborateurs/${collaborateurId}`)
    await rtdbUpdate(collabRtdbRef, {
      userId: usedByUid,
      registrationStatus: 'used',
      updatedAt: now
    })

    // Mettre à jour le user du tenant avec l'ID collaborateur en RTDB
    const userRef = rtdbRef(rtdb, `tenants/${tenantId}/users/${usedByUid}`)
    const userSnap = await rtdbGet(userRef)
    if (userSnap.exists()) {
      await rtdbUpdate(userRef, { collaborateurId, updatedAt: now })
    } else {
      await rtdbSet(userRef, { collaborateurId, updatedAt: now, role: 'viewer' })
    }

    return { collaborateurId }
  }
}

export const registrationCodesService = RegistrationCodesService
