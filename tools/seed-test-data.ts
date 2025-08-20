#!/usr/bin/env tsx
/*
  Créer des données de test pour valider l'application
*/

import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Configuration pour l'émulateur
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

const app = initializeApp({ projectId: 'keydispo-dev' })
const db = getFirestore(app)

async function seedTestData() {
  console.log('🌱 Création de données de test...')
  console.log('🔗 Connexion à l\'émulateur Firestore sur localhost:8080')
  
  const tenantId = 'keydispo'
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  
  // Créer quelques collaborateurs de test
  const collaborateurs = [
    {
      nom: 'Martin',
      prenom: 'Jean',
      metier: 'CT',
      phone: '06.12.34.56.78',
      email: 'jean.martin@keydispo.fr',
      ville: 'Paris'
    },
    {
      nom: 'Dupont',
      prenom: 'Marie',
      metier: 'CT',
      phone: '06.98.76.54.32',
      email: 'marie.dupont@keydispo.fr',
      ville: 'Lyon'
    },
    {
      nom: 'Bernard',
      prenom: 'Pierre',
      metier: 'CT',
      phone: '06.11.22.33.44',
      email: 'pierre.bernard@keydispo.fr',
      ville: 'Marseille'
    }
  ]
  
  // Créer quelques disponibilités de test
  const disponibilites = [
    {
      tenantId,
      collaborateur_nom: 'Martin',
      collaborateur_prenom: 'Jean',
      collaborateur_email: 'jean.martin@keydispo.fr',
      collaborateur_type: 'CT',
      date: today.toISOString().split('T')[0],
      lieu: 'DISPONIBLE',
      heure_debut: '08:00',
      heure_fin: '17:00',
      status: 'disponible'
    },
    {
      tenantId,
      collaborateur_nom: 'Dupont',
      collaborateur_prenom: 'Marie',
      collaborateur_email: 'marie.dupont@keydispo.fr',
      collaborateur_type: 'CT',
      date: today.toISOString().split('T')[0],
      lieu: 'FOI YAMBA',
      heure_debut: '09:00',
      heure_fin: '18:00',
      status: 'affecte'
    },
    {
      tenantId,
      collaborateur_nom: 'Bernard',
      collaborateur_prenom: 'Pierre',
      collaborateur_email: 'pierre.bernard@keydispo.fr',
      collaborateur_type: 'CT',
      date: tomorrow.toISOString().split('T')[0],
      lieu: 'SOUS BALME',
      heure_debut: '07:30',
      heure_fin: '16:30',
      status: 'affecte'
    }
  ]
  
  try {
    // Insérer les disponibilités
    const batch = db.batch()
    
    disponibilites.forEach((dispo, index) => {
      const id = `${dispo.collaborateur_nom.toLowerCase()}_${dispo.collaborateur_prenom.toLowerCase()}_${dispo.date}`
      const docRef = db.collection('dispos').doc(id)
      batch.set(docRef, {
        ...dispo,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      })
    })
    
    await batch.commit()
    
    console.log(`✅ ${disponibilites.length} disponibilités créées`)
    console.log(`📅 Dates: ${today.toISOString().split('T')[0]} et ${tomorrow.toISOString().split('T')[0]}`)
    console.log('🚀 Vous pouvez maintenant tester l\'application sur http://localhost:3000')
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error)
  }
}

seedTestData().then(() => process.exit(0)).catch(console.error)
