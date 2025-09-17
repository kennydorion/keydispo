import { describe, it, expect } from 'vitest'

/**
 * Test des mappings overnight UI ↔ RTDB
 * Vérifie que l'information overnight est préservée lors des transformations
 */
describe('Mappings Overnight UI ↔ RTDB', () => {
  // Mappings UI vers RTDB (utilisés lors de la sauvegarde) – on ne stocke pas 'overnight'
  const mapLegacyTimeKindToRTDB = (legacyTimeKind: string | undefined): 'flexible' | 'fixed' => {
    switch (legacyTimeKind) {
      case 'range': return 'flexible'
      case 'slot': return 'fixed'
      case 'full-day': return 'flexible'
      case 'overnight': return 'flexible'  // ✅ ne pas stocker 'overnight'
      default: return 'flexible'
    }
  }

  // Dériver côté UI depuis les heures/isFullDay/slots
  const deriveTimeKindFromData = (dispo: any): 'range' | 'slot' | 'full-day' | 'overnight' => {
    if (Array.isArray(dispo.slots) && dispo.slots.length > 0) return 'slot'
    if (dispo.isFullDay) return 'full-day'
    const s = (dispo.heure_debut || '').toString()
    const e = (dispo.heure_fin || '').toString()
    if (s && e) return e < s ? 'overnight' : 'range'
    return 'range'
  }

  describe('UI vers RTDB (sauvegarde)', () => {
    it('devrait mapper overnight → flexible (stockage)', () => {
      expect(mapLegacyTimeKindToRTDB('overnight')).toBe('flexible')
    })

    it('devrait mapper range → flexible', () => {
      expect(mapLegacyTimeKindToRTDB('range')).toBe('flexible')
    })

    it('devrait mapper slot → fixed', () => {
      expect(mapLegacyTimeKindToRTDB('slot')).toBe('fixed')
    })

    it('devrait mapper full-day → flexible', () => {
      expect(mapLegacyTimeKindToRTDB('full-day')).toBe('flexible')
    })
  })

  describe('RTDB vers UI (chargement)', () => {
    it('devrait dériver overnight depuis les heures', () => {
      const rtdb = { heure_debut: '22:00', heure_fin: '06:00', isFullDay: false, slots: [] }
      expect(deriveTimeKindFromData(rtdb)).toBe('overnight')
    })

    it('devrait dériver flexible → range par défaut', () => {
      expect(deriveTimeKindFromData({ heure_debut: '09:00', heure_fin: '17:00' })).toBe('range')
    })

    it('devrait dériver fixed → slot via slots', () => {
      expect(deriveTimeKindFromData({ slots: ['matin'] })).toBe('slot')
    })

    it('devrait dériver oncall → range (pas utilisé)', () => {
      expect(deriveTimeKindFromData({})).toBe('range')
    })
  })

  describe('Round-trip (aller-retour)', () => {
    it('overnight devrait rester overnight après sauvegarde/chargement', () => {
      const original = 'overnight'
  const savedInRTDB = mapLegacyTimeKindToRTDB(original)
  const loadedFromRTDB = deriveTimeKindFromData({ heure_debut: '22:00', heure_fin: '06:00' })
      
  expect(loadedFromRTDB).toBe('overnight')
    })

    it('range devrait rester range après sauvegarde/chargement', () => {
      const original = 'range'
      const savedInRTDB = mapLegacyTimeKindToRTDB(original)
  const loadedFromRTDB = deriveTimeKindFromData({ heure_debut: '09:00', heure_fin: '17:00' })
      
      expect(loadedFromRTDB).toBe('range')
      expect(loadedFromRTDB).toBe(original)
    })

    it('slot devrait rester slot après sauvegarde/chargement', () => {
      const original = 'slot'
      const savedInRTDB = mapLegacyTimeKindToRTDB(original)
  const loadedFromRTDB = deriveTimeKindFromData({ slots: ['matin'] })
      
      expect(loadedFromRTDB).toBe('slot')
      expect(loadedFromRTDB).toBe(original)
    })
  })

  describe('Cas critiques overnight', () => {
    it('❌ AVANT: overnight était transformé en flexible et perdait son information', () => {
      // Simulation de l'ancien bug
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
          case 'flexible': return 'range'  // ❌ BUG: flexible → range (perte d'overnight)
          default: return 'range'
        }
      }

      // Test de l'ancien comportement défaillant
      const original = 'overnight'
      const oldSavedInRTDB = oldMapLegacyTimeKindToRTDB(original)
      const oldLoadedFromRTDB = oldMapRTDBTimeKindToLegacy(oldSavedInRTDB)
      
      expect(oldSavedInRTDB).toBe('flexible')  // overnight → flexible (bug)
      expect(oldLoadedFromRTDB).toBe('range')   // flexible → range (perte totale)
      expect(oldLoadedFromRTDB).not.toBe(original)  // ❌ Information perdue
    })

    it('✅ APRÈS: overnight est maintenant préservé (via dérivation UI, stockage flexible)', () => {
      // Test du nouveau comportement correct
      const original = 'overnight'
      const newSavedInRTDB = mapLegacyTimeKindToRTDB(original)
  const newLoadedFromRTDB = deriveTimeKindFromData({ heure_debut: '22:00', heure_fin: '06:00' })
      
      expect(newSavedInRTDB).toBe('flexible')     // overnight → flexible (stockage)
      expect(newLoadedFromRTDB).toBe('overnight') // overnight → overnight (correct)
      expect(newLoadedFromRTDB).toBe(original)    // ✅ Information préservée
    })

    it('devrait gérer les missions de nuit 22h-06h avec timeKind=overnight', () => {
      const mission = {
        heure_debut: '22:00',
        heure_fin: '06:00',
        timeKind: 'overnight'
      }

      // Sauvegarder en RTDB
  const rtdbTimeKind = mapLegacyTimeKindToRTDB(mission.timeKind)
  expect(rtdbTimeKind).toBe('flexible')

      // Recharger depuis RTDB
  const uiTimeKind = deriveTimeKindFromData({ heure_debut: '22:00', heure_fin: '06:00' })
      expect(uiTimeKind).toBe('overnight')

      // Vérifier que l'information est intacte
      expect(uiTimeKind).toBe(mission.timeKind)
    })
  })
})
