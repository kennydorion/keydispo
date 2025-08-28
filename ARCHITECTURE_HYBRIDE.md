# 🔥 Architecture Hybride Multi-Utilisateur

## 📋 Vue d'ensemble

Cette implémentation utilise l'architecture hybride **recommandée par Firebase** pour optimiser les performances, réduire les coûts et améliorer l'expérience utilisateur en temps réel.

## 🏗️ Répartition des Responsabilités

### 🔥 **Firestore** - Données Persistantes
- **Sessions utilisateur** : Informations de connexion, métadonnées de session
- **Historique des modifications** : Audit trail, logs d'activité  
- **Verrous sécurisés** : Verrouillage persistant avec validation côté serveur
- **Configuration multi-tenant** : Isolation des données par tenant

### ⚡ **Realtime Database** - États Éphémères
- **Présence en temps réel** : Statut utilisateur (online/idle/away)
- **Survols de cellules** : Indicateurs de consultation instantanés
- **Activités temporaires** : Actions en cours, édition collaborative
- **Heartbeat** : Surveillance de la connectivité

## ✅ Avantages de cette Architecture

### 🚀 **Performance Optimale**
- **Latence très faible** pour les interactions temps réel (survols, présence)
- **Synchronisation instantanée** entre les utilisateurs connectés
- **Pas de polling** grâce aux listeners temps réel

### 💰 **Coût Optimisé**  
- **Économie Firestore** : Les survols/heartbeats n'impactent pas la facturation
- **Réduction des écritures** : Séparation données persistantes/éphémères
- **TTL automatique** : Nettoyage automatique sans coûts additionnels

### 🛡️ **Robustesse**
- **onDisconnect automatique** : Libération des verrous si l'onglet/navigateur plante
- **Récupération transparente** : Reconnexion automatique après coupure réseau
- **Isolation des pannes** : RTDB et Firestore indépendants

### 🔒 **Sécurité Renforcée**
- **Double validation** : Règles RTDB + Firestore pour les verrous
- **Prévention des conflits** : Impossible d'écraser un verrou existant
- **Audit complet** : Traçabilité dans Firestore, réactivité dans RTDB

## 📁 Structure du Code

```
src/
├── services/
│   ├── hybridMultiUserService.ts     # Service principal hybride
│   ├── hybridMultiUserPlugin.ts      # Plugin Vue 3 auto-init
│   └── firebase.ts                   # Config Firebase + RTDB
├── composables/
│   └── useHybridMultiUser.ts         # Composable réactif Vue 3
└── components/
    └── [vos composants utilisent le composable]

database.rules.json                   # Règles sécurité RTDB
firestore.rules                       # Règles sécurité Firestore
```

## 🔧 Configuration

### 1. Variables d'Environnement

Ajoutez à votre `.env.local` :

```env
# Realtime Database URL (obligatoire)
VITE_FB_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/

# Autres variables Firebase existantes...
VITE_FB_PROJECT_ID=your-project-id
VITE_FB_API_KEY=your-api-key
# ...
```

### 2. Installation du Plugin

Dans `src/main.ts` :

```typescript
import { installHybridMultiUserSystem } from '@/services/hybridMultiUserPlugin'

const app = createApp(App)

// Installation du système hybride (auto-init)
app.use(installHybridMultiUserSystem)
```

### 3. Utilisation dans les Composants

```vue
<script setup lang="ts">
import { useHybridMultiUser } from '@/composables/useHybridMultiUser'

const {
  // État
  connectedUsers,
  totalUsers,
  isActive,
  
  // Actions cellules
  hoverCell,
  unhoverCell,
  lockCell,
  unlockCell,
  
  // Requêtes
  isCellLocked,
  getCellStateClass,
  getCellTooltip
} = useHybridMultiUser()

// Exemple d'utilisation
async function onCellHover(collaborateurId: string, date: string) {
  await hoverCell(collaborateurId, date)
}

async function onCellClick(collaborateurId: string, date: string) {
  const success = await lockCell(collaborateurId, date, 'editing')
  if (!success) {
    console.warn('Cellule déjà verrouillée par un autre utilisateur')
  }
}
</script>

<template>
  <div class="planning">
    <!-- Statut utilisateurs -->
    <div class="users-status">
      {{ totalUsers }} utilisateur(s) connecté(s)
    </div>
    
    <!-- Cellules avec états temps réel -->
    <div 
      v-for="cell in cells" 
      :key="cell.id"
      :class="getCellStateClass(cell.collaborateurId, cell.date)"
      :title="getCellTooltip(cell.collaborateurId, cell.date)"
      @mouseenter="onCellHover(cell.collaborateurId, cell.date)"
      @click="onCellClick(cell.collaborateurId, cell.date)"
    >
      {{ cell.content }}
    </div>
  </div>
</template>
```

## 🧪 Tests et Validation

### Test Interactif
```bash
# Ouvrir la page de test
open http://localhost:3000/test-hybrid-architecture.html
```

### Test Multi-Onglets
```bash
# 1. Démarrer les émulateurs
firebase emulators:start

# 2. Démarrer l'app
npm run dev

# 3. Ouvrir plusieurs onglets sur /semaine
# 4. Tester survols, clics, verrous entre onglets
```

### Validation Architecture
```bash
# Exécuter la validation complète
./test-hybrid-architecture.sh
```

## 📊 Monitoring et Debug

### Stats en Temps Réel
```typescript
import { hybridMultiUserService } from '@/services/hybridMultiUserService'

// Obtenir les statistiques
const stats = hybridMultiUserService.getStats()
console.log('📊 Stats:', {
  sessions: stats.sessions,      // Nombre de sessions Firestore
  presences: stats.presences,    // Nombre de présences RTDB  
  activities: stats.activities,  // Activités en cours
  locks: stats.locks            // Verrous actifs
})
```

### Logs de Debug
```typescript
// Activer les logs détaillés
localStorage.setItem('DEBUG_HYBRID_MULTIUSER', 'true')

// Les logs apparaîtront dans la console :
// 🚀 Initialisation service hybride...
// 📝 Session Firestore créée: session_xxx
// ⚡ Présence RTDB configurée avec onDisconnect
// 🔒 Cellule verrouillée: collaborateur_date
```

## 🚀 Déploiement

### 1. Déployer les Règles
```bash
# Déployer Firestore et Realtime Database
firebase deploy --only firestore:rules,database
```

### 2. Activer Realtime Database
1. Console Firebase → Realtime Database
2. Créer la base de données
3. Choisir région (même que Firestore recommandé)
4. Mode "Verrouillé" initialement

### 3. Variables Production
```env
# Production .env
VITE_FB_DATABASE_URL=https://your-prod-project-default-rtdb.firebaseio.com/
VITE_FB_PROJECT_ID=your-prod-project
# ... autres variables prod
```

## 🎯 Bonnes Pratiques

### Performance
- ✅ Utilisez `onDisconnect()` pour tous les états éphémères
- ✅ Limitez les données RTDB aux états temporaires (<1MB)
- ✅ Préférez Firestore pour l'historique et l'audit
- ✅ Implémentez des TTL pour le nettoyage automatique

### Sécurité  
- ✅ Validez côté serveur avec les règles Firebase
- ✅ Isolez les tenants dans les chemins de données
- ✅ Authentifiez toutes les opérations
- ✅ Loggez les actions sensibles dans Firestore

### Évolutivité
- ✅ Séparez les concerns (persistant vs éphémère)
- ✅ Utilisez des composables pour la réutilisabilité  
- ✅ Structurez les données par tenant/feature
- ✅ Monitinez les métriques de performance

## 🛠️ Résolution de Problèmes

### Erreur "Firebase App already exists (duplicate-app)"

**Problème** : Cette erreur peut survenir lors du développement avec Vite HMR.

**Solutions implémentées** :
- Protection singleton avec cache global `window.__FIREBASE_APP__`
- Vérification préalable avec `getApps()` avant initialisation
- Redirection de l'ancien `src/firebase.ts` vers `src/services/firebase.ts`
- Gestion robuste des cas d'erreur avec fallback

**Code de protection** :
```typescript
// Dans src/services/firebase.ts
if (window.__FIREBASE_APP__) {
  app = window.__FIREBASE_APP__
} else {
  const existingApps = getApps()
  if (existingApps.length > 0) {
    app = existingApps[0]
  } else {
    app = initializeApp(firebaseConfig)
  }
  window.__FIREBASE_APP__ = app
}
```

## 🤝 Contribution

Cette architecture hybride suit les **bonnes pratiques officielles Firebase** pour les applications collaboratives temps réel. Elle est optimisée pour :

- 📱 **Multi-plateforme** : Web, mobile, desktop
- 🌍 **Multi-tenant** : Isolation complète entre organisations  
- ⚡ **Temps réel** : Synchronisation sub-seconde
- 💰 **Cost-effective** : Optimisation des coûts Firebase

---

**🔥 Architecture Hybride = Performance + Économie + Robustesse**
