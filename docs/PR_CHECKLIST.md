# Checklist PR – KeyDispo

- [ ] Règles Firestore testées en émulateur (read/write selon rôle, delete admin)
- [ ] Requêtes Firestore limitées à la semaine affichée (date >= start && date <= end)
- [ ] Index nécessaires en place (tenantId+date+collaborateurId / tenantId+date+lieu)
- [ ] Pas de secrets commités (utiliser VITE_* et variables d’env Netlify)
- [ ] UI: gestion de conflits via champ `version` + transaction + message utilisateur
- [ ] Import: idempotent (docId déterministe), `set({merge:true})`, batch <= 500
- [ ] Scripts Yarn OK (dev, build, preview, emulators, import:dry, import:run)
- [ ] Lint OK (ESLint + Prettier), Tests OK (Vitest)
- [ ] Docs mises à jour (README, USAGE, Cheatsheet Copilot)
