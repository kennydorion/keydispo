# Guide des Indicateurs de Présence - Interface Collaborateur

## 🎯 Objectif
Les indicateurs visuels permettent aux collaborateurs de voir quand des administrateurs KeyPlacement (KP) consultent ou modifient le planning.

## 📍 Position des Indicateurs

### Indicateur de Présence Admin (KP) 
- **Position** : Centre de la cellule
- **Apparence** : Cercle coloré avec "KP"
- **Taille** : 32px de diamètre
- **Animation** : Pulsation douce + légère mise à l'échelle
- **Couleur** : Variable selon l'admin (bleu, vert, orange, etc.)

### Indicateur de Verrouillage
- **Position** : Centre de la cellule
- **Apparence** : Cercle rouge avec icône 🔒
- **Taille** : 28px de diamètre
- **Fonction** : Indique qu'un autre utilisateur modifie cette cellule

### Indicateur de Sélection Multiple
- **Position** : Coin supérieur droit
- **Apparence** : Petit cercle bleu avec ✓
- **Taille** : 16px de diamètre (14px si présence)
- **Fonction** : Marque les cellules sélectionnées pour actions en lot

## 🎨 Combinaisons Visuelles

### Cellule Normale
- Bordure : Gris clair
- Fond : Blanc
- Contenu : Disponibilités du collaborateur

### Admin Surveille (Présence)
- Bordure : Couleur de l'admin (2px)
- Fond : Teinte légère de la couleur admin
- Animation : Pulsation de la bordure et boîte d'ombre
- Indicateur : "KP" centré avec couleur de l'admin

### Cellule Verrouillée
- Bordure : Rouge (2px)
- Fond : Rouge très clair
- Indicateur : 🔒 centré sur fond rouge

### Sélection Simple
- Bordure : Bleu (2px)
- Fond : Bleu très clair
- Indicateur : ✓ en haut à droite

### Sélection + Présence Admin
- Bordure : Couleur admin (3px)
- Fond : Dégradé diagonal (bleu sélection + couleur admin)
- Indicateurs : "KP" centré + ✓ réduit en coin

## 🔧 Comportement Technique

### Gestion des Z-Index
- Présence admin : z-index 1000
- Verrouillage : z-index 1000  
- Sélection normale : z-index 950
- Sélection avec présence : z-index 1100

### Animations
- **Présence** : Pulsation 2s infinie avec mise à l'échelle
- **Verrouillage** : Statique pour indiquer un blocage
- **Sélection** : Statique pour la stabilité visuelle

### Priorités Visuelles
1. **Verrouillage** = Priorité maximale (empêche l'interaction)
2. **Présence admin** = Haute priorité (information importante)  
3. **Sélection** = Priorité normale (action utilisateur)

## 🎯 Objectif UX
- **Transparence** : Le collaborateur voit l'activité des admins
- **Anonymat** : "KP" au lieu du nom réel de l'admin
- **Non-intrusif** : Indicateurs centrés ne gênent pas la lecture
- **Hiérarchie claire** : Blocage > Présence > Sélection

Test visuel disponible : http://localhost:3002/test-indicateurs.html
