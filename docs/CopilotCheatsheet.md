# Copilot Chat – mini-cheatsheet

Cible le contexte: @workspace, @terminal, @editor, @git

Exemples
- @workspace Analyse le repo et propose les fichiers manquants (import_dispos, firebase config, vue Semaine).
- @terminal Donne la suite de commandes pour lancer émulateurs + import dry-run.
- Montre-moi le diff complet pour ajouter firestore.rules et firebase.json.
- Donne l'intégralité de tools/import_dispos.ts avec imports, types, CLI.
- /fix L’import plante si l’onglet est nommé autrement que Dispos. Rends le nom d’onglet paramétrable.

Prompts utiles
- Parser Excel
  « Écris une fonction parseWorkbook(filePath, sheet='Dispos') qui retourne un tableau normalisé {nom, prenom, metier, phone, email, ville, date, lieu, heure_debut, heure_fin} en détectant dynamiquement les entêtes FR. Tests unitaires inclus. »
- Import idempotent
  « Ajoute upsertDispos(records, tenantId) avec batch 500, docId déterministe (tenantId + collaborateur + date), set({merge:true}). Retourne stats (écrits/ignorés). »
- Émulateur toggle
  « Dans firebase.ts, ajoute un switch VITE_USE_EMULATOR: si true, connectFirestoreEmulator(db, 'localhost', 8080) et connectAuthEmulator(auth, 'http://localhost:9099'). »
- Vue Semaine
  « Crée Semaine.vue avec requêtes limitées à la semaine (start <= date <= end), UI d’édition inline, transaction Firestore avec champ version. »
- Règles & index
  « Donne firestore.rules et firestore.indexes.json complets pour requêtes (tenantId, date, collaborateurId/lieu). »
- Coûts minimisés
  « Audite les lectures/écritures actuelles et propose des optimisations (requêtes, cache, pagination, lazy collaborators). »
