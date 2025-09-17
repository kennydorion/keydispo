<template>
  <section class="guide">
    <header class="guide-header">
      <h1>Guide de l’administrateur</h1>
      <p class="subtitle">Utilisation du planning, gestion des collaborateurs et bonnes pratiques</p>
    </header>

    <aside class="toc">
      <h2>Sommaire</h2>
      <nav>
        <a href="#navigation">Navigation</a>
        <a href="#filtres">Filtres du planning</a>
        <a href="#edition">Édition des disponibilités</a>
        <a href="#verrous">Présence & verrous</a>
        <a href="#raccourcis">Raccourcis utiles</a>
        <a href="#import-export">Imports & exports</a>
        <a href="#multi-tenant">Multi-tenant & rôles</a>
        <a href="#faq">FAQ</a>
      </nav>
    </aside>

    <main class="guide-content">
      <section id="navigation">
        <h2>Navigation</h2>
        <ul>
          <li>Tableau de bord: vue d’ensemble avec liens rapides.</li>
          <li>Planning: visualiser et filtrer les disponibilités par semaine.</li>
          <li>Collaborateurs: créer, modifier et consulter les fiches.</li>
          <li>Import: importer un fichier Excel pour alimenter les disponibilités.</li>
          <li>Paramètres: réglages de l’espace et préférences.</li>
        </ul>
      </section>

      <section id="filtres">
        <h2>Filtres du planning</h2>
        <ul>
          <li>Recherche par nom, email, métier, ville.</li>
          <li>Plage de dates: semaine active, navigation avec les flèches.</li>
          <li>Lieu: filtrer par lieu d’affectation (texte exact ou partiel).</li>
          <li>Status: disponibles, indisponibles, missions.</li>
        </ul>
        <p class="tip">Astuce: les résultats s’affichent immédiatement, sans interaction supplémentaire.</p>
      </section>

      <section id="edition">
        <h2>Édition des disponibilités</h2>
        <ul>
          <li>Cliquer sur une cellule pour ajouter/modifier un créneau.</li>
          <li>Glisser pour étendre/réduire une plage horaire.</li>
          <li>Suppression par le menu d’actions de la cellule.</li>
          <li>Conflits: la dernière version gagne, avec protection optimiste.</li>
        </ul>
        <p>Les mises à jour critiques passent par des transactions Firestore pour garantir la cohérence.</p>
      </section>

      <section id="verrous">
        <h2>Présence & verrous</h2>
        <ul>
          <li>Présence en temps réel: voyez qui est connecté et où il édite.</li>
          <li>Soft-lock de 2 minutes: empêche les collisions d’édition sur une cellule.</li>
          <li>Libération automatique du verrou si l’utilisateur quitte ou est inactif.</li>
        </ul>
      </section>

      <section id="raccourcis">
        <h2>Raccourcis utiles</h2>
        <ul>
          <li>←/→: naviguer entre les semaines.</li>
          <li>Ctrl/Cmd + F: focus sur la barre de recherche.</li>
          <li>Échap: fermer les menus ouverts.</li>
        </ul>
      </section>

      <section id="import-export">
        <h2>Imports & exports</h2>
        <ul>
          <li>Import Excel: adapter votre fichier au format attendu puis importer via la page Import.</li>
          <li>Exports CSV/PDF: depuis la vue Planning filtrée.</li>
          <li>Validation: une vérification est effectuée côté client avant écriture.</li>
        </ul>
      </section>

      <section id="multi-tenant">
        <h2>Multi-tenant & rôles</h2>
        <ul>
          <li>Données cloisonnées par tenantId: vous ne voyez que votre espace.</li>
          <li>Rôles: admin (tout), editor (édition), viewer (lecture).</li>
          <li>Règles Firestore strictes: l’accès s’effectue selon votre rôle.</li>
        </ul>
      </section>

      <section id="faq">
        <h2>FAQ</h2>
        <details>
          <summary>Je ne vois pas un collaborateur dans le planning</summary>
          <p>Vérifiez les filtres actifs (nom, lieu, statut). Réinitialisez si besoin.</p>
        </details>
        <details>
          <summary>Le verrou d’édition reste</summary>
          <p>Attendez 2 minutes ou rechargez. Le verrou est libéré automatiquement.</p>
        </details>
        <details>
          <summary>Import refusé</summary>
          <p>Vérifiez le format des colonnes (dates et heures). Consultez la page Import.</p>
        </details>
      </section>
    </main>
  </section>
  
</template>

<script setup lang="ts">
// Vue statique d’aide admin. Protéger l’accès via meta route (requiresAuth + interface: 'admin').
</script>

<style scoped>
.guide {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  padding: 24px;
}

.guide-header {
  grid-column: 1 / -1;
  padding: 12px 0 8px;
}

.guide-header h1 {
  margin: 0 0 6px;
  font-weight: 800;
}

.subtitle {
  margin: 0;
  color: var(--dark-text-secondary);
}

.toc {
  position: sticky;
  top: 84px; /* 64px navbar + marge */
  align-self: start;
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--dark-surface);
}

.toc h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.toc nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toc a {
  color: var(--dark-text-secondary);
  text-decoration: none;
  padding: 8px 10px;
  border-radius: 8px;
}

.toc a:hover {
  background: var(--dark-surface-secondary);
  color: var(--primary-color);
}

.guide-content {
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  padding: 20px;
  background: var(--dark-surface);
}

.guide-content section + section {
  margin-top: 28px;
  padding-top: 12px;
  border-top: 1px dashed var(--dark-border);
}

.guide-content h2 {
  margin-top: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip {
  margin-top: 6px;
  color: var(--primary-color);
  font-size: 0.95rem;
}

@media (max-width: 960px) {
  .guide {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .toc {
    position: static;
    order: 2;
  }
}
</style>
