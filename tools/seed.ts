#!/usr/bin/env ts-node
import fs from 'node:fs'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function main() {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080'
  initializeApp({ projectId: 'keydispo-local' })
  const db = getFirestore()

  const raw = fs.readFileSync('firebase-seed.json', 'utf8')
  const seed = JSON.parse(raw)
  if (seed.dispos) {
    const batch = db.batch()
    for (const [id, data] of Object.entries<any>(seed.dispos)) {
      batch.set(db.collection('dispos').doc(id), data, { merge: true })
    }
    await batch.commit()
    console.log('✅ Seed dispos importé')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
