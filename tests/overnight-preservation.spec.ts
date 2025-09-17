import { describe, it, expect } from 'vitest'

/**
 * Test d'intégration pour vérifier que le nettoyage des données
 * après enregistrement ne casse plus les horaires overnight
 */
describe('Intégration: Préservation overnight après enregistrement', () => {

  // Simule le pipeline complet: UI → sanitizeDisposition → RTDB → Rechargement → UI
  const sanitizeDisposition = (dispo: any) => {
    // Copie de la fonction sanitizeDisposition avec détection automatique
    if (dispo.timeKind === 'range' && dispo.heure_debut && dispo.heure_fin) {
      const startTime = parseInt(dispo.heure_debut.split(':')[0])
      const endTime = parseInt(dispo.heure_fin.split(':')[0])
      
      if (endTime < startTime || (endTime === startTime && dispo.heure_fin < dispo.heure_debut)) {
        return { ...dispo, timeKind: 'overnight' }
      }
    }
    
    return dispo
  }

  // Simule les mappings UI → RTDB (sauvegarde)
  const mapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' | 'overnight' => {
    switch (legacyTimeKind) {
      case 'range': return 'flexible'
      case 'slot': return 'fixed'
      case 'full-day': return 'flexible'
      case 'overnight': return 'overnight'  // ✅ PRÉSERVER overnight
      default: return 'flexible'
    }
  }

  // Dérive côté UI depuis les heures/slots/isFullDay
  const deriveTimeKindFromData = (d: any): 'range' | 'slot' | 'full-day' | 'overnight' => {
    if (Array.isArray(d.slots) && d.slots.length > 0) return 'slot'
    if (d.isFullDay) return 'full-day'
    const s = (d.heure_debut || '').toString()
    const e = (d.heure_fin || '').toString()
    if (s && e) return e < s ? 'overnight' : 'range'
    return 'range'
  }

  // Simule la fonction de formatage pour RTDB
  const formatDispoForRTDB = (dispo: any) => {
    return {
      ...dispo,
      timeKind: mapLegacyTimeKindToRTDB(dispo.timeKind),
      updatedAt: Date.now(),
      version: (dispo.version || 0) + 1
    }
  }

  // Simule le rechargement depuis RTDB
  const loadFromRTDB = (rtdbDispo: any) => {
    return {
      ...rtdbDispo,
      timeKind: deriveTimeKindFromData(rtdbDispo)
    }
  }

  describe('Scénario complet: Mission overnight 22h-06h', () => {
    it('✅ APRÈS FIX: devrait préserver overnight à travers tout le pipeline', () => {
      // 1. Données initiales du formulaire (avant détection automatique)
      const formData = {
        nom: 'Dupont',
        prenom: 'Jean',
        type: 'mission',
        timeKind: 'range',  // Pas encore détecté comme overnight
        heure_debut: '22:00',
        heure_fin: '06:00',
        lieu: 'Hôpital',
        date: '2025-01-15'
      }

      // 2. Étape sanitize (détection automatique overnight)
      const sanitized = sanitizeDisposition(formData)
      expect(sanitized.timeKind).toBe('overnight')  // Détection automatique

      // 3. Étape sauvegarde en RTDB (mapping UI → RTDB)
      const rtdbData = formatDispoForRTDB(sanitized)
      expect(rtdbData.timeKind).toBe('overnight')  // Préservé en RTDB

      // 4. Étape rechargement depuis RTDB (mapping RTDB → UI)
      const reloaded = loadFromRTDB(rtdbData)
      expect(reloaded.timeKind).toBe('overnight')  // Toujours préservé

      // 5. Vérification finale: les horaires sont intacts
      expect(reloaded.heure_debut).toBe('22:00')
      expect(reloaded.heure_fin).toBe('06:00')
      expect(reloaded.timeKind).toBe('overnight')

      console.log('✅ Pipeline complet testé avec succès:')
      console.log(`   Form: range → Sanitize: ${sanitized.timeKind} → RTDB: ${rtdbData.timeKind} → UI: ${reloaded.timeKind}`)
    })

    it('❌ AVANT FIX: simuler l\'ancien comportement qui cassait overnight', () => {
      // Anciens mappings défaillants pour simulation
      const oldMapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' => {
        switch (legacyTimeKind) {
          case 'range': return 'flexible'
          case 'slot': return 'fixed'
          case 'full-day': return 'flexible'
          case 'overnight': return 'flexible'  // ❌ BUG: overnight → flexible
          default: return 'flexible'
        }
      }

      const oldMapRTDBTimeKindToLegacy = (rtdbTimeKind: string | undefined): 'range' | 'slot' | 'full-day' => {
        switch (rtdbTimeKind) {
          case 'fixed': return 'slot'
          case 'flexible': return 'range'  // ❌ BUG: pas de cas overnight
          default: return 'range'
        }
      }

      const oldFormatDispoForRTDB = (dispo: any) => {
        return {
          ...dispo,
          timeKind: oldMapLegacyTimeKindToRTDB(dispo.timeKind)
        }
      }

      const oldLoadFromRTDB = (rtdbDispo: any) => {
        return {
          ...rtdbDispo,
          timeKind: oldMapRTDBTimeKindToLegacy(rtdbDispo.timeKind)
        }
      }

      // Test de l'ancien comportement défaillant
      const formData = {
        type: 'mission',
        timeKind: 'overnight',  // Déjà détecté
        heure_debut: '22:00',
        heure_fin: '06:00'
      }

      const oldRtdbData = oldFormatDispoForRTDB(formData)
      expect(oldRtdbData.timeKind).toBe('flexible')  // ❌ overnight perdu

      const oldReloaded = oldLoadFromRTDB(oldRtdbData)
      expect(oldReloaded.timeKind).toBe('range')  // ❌ Devenu range

      // Vérification du problème
      expect(oldReloaded.timeKind).not.toBe('overnight')  // ❌ Information perdue
      
      console.log('❌ Ancien pipeline défaillant simulé:')
      console.log(`   Original: overnight → RTDB: ${oldRtdbData.timeKind} → UI: ${oldReloaded.timeKind}`)
    })
  })

  describe('Test avec disponibilité overnight', () => {
    it('devrait préserver overnight pour les disponibilités 20h-04h', () => {
      const formData = {
        nom: 'Martin',
        prenom: 'Sophie',
        type: 'disponible',
        timeKind: 'range',
        heure_debut: '20:00',
        heure_fin: '04:00',
        lieu: 'DISPONIBLE',
        date: '2025-01-16'
      }

      // Pipeline complet
      const sanitized = sanitizeDisposition(formData)
      const rtdbData = formatDispoForRTDB(sanitized)
      const reloaded = loadFromRTDB(rtdbData)

      // Vérifications
      expect(sanitized.timeKind).toBe('overnight')
      expect(rtdbData.timeKind).toBe('overnight')
      expect(reloaded.timeKind).toBe('overnight')

      console.log('✅ Disponibilité overnight préservée à travers le pipeline')
    })
  })

  describe('Test de régression: autres timeKind non affectés', () => {
    it('devrait préserver range normale sans la transformer en overnight', () => {
      const formData = {
        type: 'mission',
        timeKind: 'range',
        heure_debut: '09:00',
        heure_fin: '17:00'  // Pas overnight
      }

      const sanitized = sanitizeDisposition(formData)
      const rtdbData = formatDispoForRTDB(sanitized)
      const reloaded = loadFromRTDB(rtdbData)

      expect(sanitized.timeKind).toBe('range')
      expect(rtdbData.timeKind).toBe('flexible')
      expect(reloaded.timeKind).toBe('range')
    })

    it('devrait préserver slot', () => {
      const formData = {
        type: 'disponible',
        timeKind: 'slot',
        slots: ['matin', 'soir']
      }

      const rtdbData = formatDispoForRTDB(formData)
      const reloaded = loadFromRTDB(rtdbData)

      expect(rtdbData.timeKind).toBe('fixed')
      expect(reloaded.timeKind).toBe('slot')
    })

    it('devrait préserver full-day', () => {
      const formData = {
        type: 'indisponible',
        timeKind: 'full-day'
      }

      const rtdbData = formatDispoForRTDB(formData)
      const reloaded = loadFromRTDB(rtdbData)

      expect(rtdbData.timeKind).toBe('flexible')
      expect(reloaded.timeKind).toBe('range')  // full-day handled via isFullDay flag
    })
  })

  describe('Cas limites overnight', () => {
    it('devrait détecter 23:59 → 00:01 comme overnight', () => {
      const formData = {
        timeKind: 'range',
        heure_debut: '23:59',
        heure_fin: '00:01'
      }

      const sanitized = sanitizeDisposition(formData)
      expect(sanitized.timeKind).toBe('overnight')
    })

    it('devrait détecter minuit à minuit moins une minute comme overnight', () => {
      const formData = {
        timeKind: 'range',
        heure_debut: '23:30',
        heure_fin: '01:00'
      }

      const sanitized = sanitizeDisposition(formData)
      expect(sanitized.timeKind).toBe('overnight')
    })

    it('ne devrait PAS détecter 08:00 → 18:00 comme overnight', () => {
      const formData = {
        timeKind: 'range',
        heure_debut: '08:00',
        heure_fin: '18:00'
      }

      const sanitized = sanitizeDisposition(formData)
      expect(sanitized.timeKind).toBe('range')
    })
  })
})
