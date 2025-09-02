# 🧹 Plan de Nettoyage Firestore

## ✅ Services Firestore Légitimes (À Garder)
- `src/services/auth.ts` - Authentification et gestion utilisateurs
- `src/services/userPreferences.ts` - Préférences utilisateur 
- `src/services/userColorsService.ts` - Couleurs utilisateur
- `src/services/multiUserService.ts` - Sessions multi-utilisateur
- `src/services/presenceService.ts` - Présence utilisateur
- `src/services/cellStateService.ts` - État des cellules
- `src/services/firestoreListenerManager.ts` - Manager des listeners
- `src/services/firebase.ts` - Configuration Firebase

## ✅ Fichiers Supprimés (Obsolètes)
- [x] `src/views/PlanningModerne.vue` - Non utilisé dans les routes
- [x] `src/features/import/importToFirestore.ts` - Import Firestore obsolète
- [x] `src/services/infiniteScroll.ts` - Devrait utiliser RTDB
- [x] `src/services/planningInteraction.ts` - Devrait utiliser RTDB
- [x] `src/services/realtimeSync.ts` - Redondant avec RTDB

## 🔧 Fichiers à Nettoyer (Supprimer imports inutiles)
- [ ] `src/views/SemaineVirtualClean.vue` - Import `doc, onSnapshot` mais usage légitime pour préférences
- [ ] `src/services/collaborateursV2.ts` - Devrait être 100% RTDB maintenant

## 🚨 À Vérifier (Usage mixte)
- `src/views/ModifierCollaborateur.vue` - Import pour permissions (OK)
- `src/views/DetailCollaborateur.vue` - À vérifier
- `src/views/ListeCollaborateurs.vue` - À vérifier

## 📊 Utilitaires Monitoring (Garder temporairement)
- `src/utils/firestoreReadCounter.ts`
- `src/utils/emergencyFirestoreCache.ts`
- `src/services/emergencyOptimization.ts`
