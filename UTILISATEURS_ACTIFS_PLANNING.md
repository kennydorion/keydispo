# Affichage Utilisateurs Actifs sur le Planning

## 🎯 Fonctionnalité

Affichage en temps réel des utilisateurs actifs sur le planning dans la barre d'état, à côté de l'indicateur "Temps réel". Montre qui est en train de travailler sur le planning avec leurs initiales dans des ronds colorés.

## ✨ Interface

### Localisation
- **Position** : Barre d'état système, entre "Temps réel" et "Utilisateurs connectés"
- **Icône** : 👁️ (visibility) + nombre d'utilisateurs actifs
- **Avatars** : Ronds colorés avec initiales, maximum 5 visibles + "+X" si plus

### Affichage
```
🔄 Temps réel 2    👁️ 3 actifs [AB][CD][EF]    👥 5 utilisateurs
```

## 🔧 Logique de Détection

### Utilisateurs Actifs
Un utilisateur est considéré comme "actif" s'il a :
1. **Présence active** : status 'online' dans collaborationService.presence
2. **Lock actif** : verrouillage en cours sur une cellule
3. **Sélection active** : sélection multiple en cours

### Priorités Status
- **modification** : utilisateur avec lock actif (priorité haute)
- **sélection** : utilisateur avec sélection multiple active  
- **présent** : utilisateur simplement présent/connecté

## 🎨 Design

### Avatars Actifs
```css
.active-user-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: getUserColor(userId); /* couleur unique par utilisateur */
  color: white;
  font-size: 9px;
  font-weight: 600;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  animation: subtlePulse 2s infinite; /* animation douce */
}
```

### Interactions
- **Hover** : agrandissement (scale 1.1) + ombre renforcée
- **Tooltip** : `"Nom Utilisateur - status"`
- **Animation** : pulse subtil pour indiquer l'activité

## 🔄 Mise à Jour Temps Réel

### Sources de Données
```typescript
function getActiveUsers() {
  const activeUsers = new Map()
  
  // Présence active
  collaborationService.presence.forEach(user => {
    if (user.status === 'online') {
      activeUsers.set(user.userId, { status: 'présent' })
    }
  })
  
  // Locks actifs  
  collaborationService.locks.forEach(lock => {
    activeUsers.set(lock.userId, { status: 'modification' })
  })
  
  // Sélections actives
  collaborationService.remoteSelections.forEach(selection => {
    activeUsers.set(selection.userId, { status: 'sélection' })
  })
  
  return Array.from(activeUsers.values())
}
```

### Réactivité Vue
- **Auto-update** : fonction réactive qui se met à jour automatiquement
- **Performance** : déduplication via Map pour éviter doublons
- **Priorité** : dernière activité écrase les précédentes (modification > sélection > présence)

## 🎯 Avantages Utilisateur

### Awareness Collaborative
- **Vision claire** : voir qui travaille actuellement sur le planning
- **Coordination** : éviter les conflits en sachant qui fait quoi
- **Communication** : identifier facilement les collaborateurs actifs

### Feedback Visuel
- **Temps réel** : mise à jour <100ms via Firebase RTDB
- **Distinct** : différent des "utilisateurs connectés" (sessions globales)
- **Pertinent** : focus sur l'activité planning spécifiquement

### Ergonomie
- **Non-invasif** : info compacte dans barre d'état
- **Informatif** : tooltips pour détails utilisateur
- **Esthétique** : animations subtiles et couleurs harmonieuses

## 🛠️ Architecture Technique

### Intégration Service
- **Source** : hybridMultiUserService (RTDB)
- **Listeners** : mise à jour automatique via watchers Vue
- **Performance** : calcul à la demande, pas de polling

### Composant Vue
```vue
<!-- Template -->
<div class="status-item active-users">
  <va-icon name="visibility" size="14px" />
  <span>{{ getActiveUsers().length }} actif{{ getActiveUsers().length > 1 ? 's' : '' }}</span>
  
  <div class="active-user-avatars">
    <div v-for="user in getActiveUsers().slice(0, 5)" 
         :key="user.userId"
         class="active-user-avatar"
         :style="{ backgroundColor: getUserColor(user.userId) }">
      {{ getUserInitials({ userEmail: user.userName }) }}
    </div>
  </div>
</div>
```

### Réutilisation Code
- **getUserInitials()** : même logique que cellules planning
- **getUserColor()** : couleurs consistantes dans toute l'app
- **Styles** : extension des patterns mini-avatar existants

Cette fonctionnalité améliore significativement l'awareness collaborative en montrant en temps réel qui est actif sur le planning, avec un design cohérent et des informations pertinentes.
