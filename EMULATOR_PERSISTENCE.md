# Persistance des données des émulateurs Firebase (Auth, Firestore, RTDB)

Ce projet est déjà configuré pour conserver vos données d'émulateur entre les redémarrages.

## TL;DR
- Dossier de persistance: `./emulator-data`
- Démarrage avec import + export auto: `scripts/start-full-dev.sh`
- Sauvegarde manuelle: `npm run emu:save`
- État actuel: `npm run emu:status`

## Scripts utiles
- `npm run emulators:persist`
  - Démarre les émulateurs avec `--import=./emulator-data --export-on-exit=./emulator-data`
- `npm run emu:save`
  - Sauvegarde à chaud via l’API du Hub (port 4400) sans arrêter.
- `npm run emu:status`
  - Affiche l’état des données sauvegardées (Auth/Firestore/RTDB).
- `npm run emu:clean`
  - Supprime la sauvegarde locale (demande confirmation).
- `npm run emu:export`
  - Export classique via CLI Firebase.

## Notes
- Les ports des émulateurs sont définis dans `firebase.json` (Auth 9199, Firestore 8180, RTDB 9200, UI 4101, Hub 4400).
- Le script `scripts/start-full-dev.sh` gère l’arrêt propre et déclenche l’export auto.
- Si vous changez de `projectId`, mettez à jour `VITE_FB_PROJECT_ID` pour que les sauvegardes utilisent le bon nom de projet.

## Problèmes fréquents
- “Je perds mes comptes et mes données à chaque reboot”
  - Assurez-vous d’utiliser soit `npm run emulators:persist`, soit `scripts/start-full-dev.sh`, et pas un démarrage manuel des émulateurs sans `--import/--export-on-exit`.
- “La commande save dit que l’émulateur n’est pas en cours”
  - Le Hub doit être accessible sur `localhost:4400`. Vérifiez que les émulateurs tournent et que `firebase.json` n’a pas désactivé le Hub.

---

Bon dev.
