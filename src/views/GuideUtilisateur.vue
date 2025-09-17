<template>
  <div class="guide-page">
    <!-- Header élégant similaire aux autres pages -->
    <div class="guide-header">
      <div class="header-top">
        <div class="header-brand">
          <div class="brand-icon">
            <va-icon name="menu_book" />
          </div>
          <div class="brand-content">
            <h1 class="brand-title">Guide utilisateur</h1>
            <p class="brand-subtitle">Utilisation du planning, gestion des collaborateurs et bonnes pratiques</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Conteneur principal -->
    <div class="guide-container">
      <div class="guide-layout">
        <aside class="toc">
          <h2>Sommaire</h2>
          <nav>
            <a href="#navigation">Navigation</a>
            <a href="#filtres">Filtres du planning</a>
            <a href="#selection-batch">Sélection multiple</a>
            <a href="#edition">Édition des disponibilités</a>
            <a href="#verrous">Présence & verrous</a>
            <a href="#raccourcis">Raccourcis clavier</a>
            <a href="#import">Import Excel</a>
            <a href="#multi-tenant">Multi-tenant & rôles</a>
            <a href="#faq">FAQ</a>
          </nav>
        </aside>

        <main class="guide-content">
          <section id="navigation">
            <h2>Navigation</h2>
            <ul>
              <li><strong>Tableau de bord :</strong> Vue d'ensemble avec liens rapides vers les sections principales.</li>
              <li><strong>Planning :</strong> Visualisation et édition des disponibilités en mode grille hebdomadaire.</li>
              <li><strong>Mode Collaborateur :</strong> Vue individuelle pour que chaque collaborateur gère ses disponibilités.</li>
              <li><strong>Collaborateurs :</strong> Gestion des fiches collaborateurs (création, modification, consultation).</li>
              <li><strong>Import :</strong> Interface d'import de fichiers Excel pour alimenter les disponibilités.</li>
            </ul>
          </section>

          <section id="filtres">
            <h2>Filtres du planning</h2>
            <ul>
              <li><strong>Recherche globale :</strong> Champ unique pour rechercher par nom, prénom, email ou téléphone.</li>
              <li><strong>Filtre par métier :</strong> Menu déroulant avec tous les métiers présents dans la base de données.</li>
              <li><strong>Filtre par lieu :</strong> Disponible uniquement en mode "Missions" pour filtrer par lieu d'affectation.</li>
              <li><strong>Filtre par statut :</strong> Disponible, Mission, Indisponible.</li>
              <li><strong>Période :</strong> Date de début et date de fin pour délimiter la période d'affichage.</li>
              <li><strong>Modes d'affichage :</strong> Basculer entre vue Planning globale et vue Collaborateur individuelle.</li>
            </ul>
            <p class="tip"><strong>Astuce :</strong> Les filtres se mettent à jour en temps réel. Utilisez "Effacer les filtres" pour tout réinitialiser.</p>
          </section>

          <section id="selection-batch">
            <h2>Sélection multiple et édition en lot</h2>
            <ul>
              <li><strong>Sélection simple :</strong> Maintenez Ctrl/Cmd et cliquez sur les cellules pour les sélectionner.</li>
              <li><strong>Sélection par glisser :</strong> Maintenez Ctrl/Cmd et glissez sur plusieurs cellules d'un même collaborateur.</li>
              <li><strong>Mode sélection mobile :</strong> Bouton flottant pour activer/désactiver le mode sélection sur mobile.</li>
              <li><strong>Barre de statut :</strong> Affiche le nombre de cellules sélectionnées avec option d'effacement.</li>
              <li><strong>Modal batch :</strong> Permet de modifier plusieurs dates en une seule fois (statut, horaires, lieu).</li>
              <li><strong>Verrous sur sélection :</strong> Les cellules sélectionnées sont automatiquement verrouillées pour éviter les conflits.</li>
            </ul>
            <p class="tip"><strong>Limitation :</strong> La sélection multiple ne fonctionne que pour un seul collaborateur à la fois.</p>
          </section>

          <section id="edition">
            <h2>Édition des disponibilités</h2>
            <ul>
              <li><strong>Ajout :</strong> Cliquez sur une cellule vide pour ajouter une nouvelle disponibilité.</li>
              <li><strong>Modification :</strong> Cliquez sur une cellule existante pour modifier les détails.</li>
              <li><strong>Gestion de versions :</strong> Système de versioning optimiste pour éviter les conflits.</li>
              <li><strong>Types de disponibilité :</strong> Disponible (vert), Mission (bleu), Indisponible (rouge).</li>
              <li><strong>Synchronisation temps réel :</strong> Les changements se propagent automatiquement aux autres utilisateurs.</li>
            </ul>
            <p><strong>Important :</strong> Les mises à jour critiques utilisent des transactions Firestore pour garantir la cohérence des données.</p>
          </section>

          <section id="verrous">
            <h2>Présence utilisateur & verrous</h2>
            <ul>
              <li><strong>Présence temps réel :</strong> Voyez qui est connecté et sur quelle partie du planning.</li>
              <li><strong>Soft-lock automatique :</strong> Verrous de 2 minutes sur les cellules en cours d'édition.</li>
              <li><strong>Indicateurs visuels :</strong> Bordures colorées pour identifier les cellules verrouillées par d'autres utilisateurs.</li>
              <li><strong>Libération automatique :</strong> Les verrous se libèrent automatiquement après inactivité ou déconnexion.</li>
              <li><strong>Protection des conflits :</strong> Impossible d'éditer une cellule verrouillée par un autre utilisateur.</li>
            </ul>
          </section>

          <section id="raccourcis">
            <h2>Raccourcis clavier</h2>
            <ul>
              <li><strong>Échap :</strong> Effacer toute la sélection en cours.</li>
              <li><strong>Ctrl/Cmd + clic :</strong> Activer le mode sélection multiple.</li>
              <li><strong>Ctrl/Cmd + glisser :</strong> Sélectionner plusieurs cellules par glisser-déposer.</li>
              <li><strong>Navigation :</strong> Flèches pour naviguer dans les vues (fonctionnalité limitée).</li>
            </ul>
            <p class="tip"><strong>Note :</strong> La plupart des interactions se font via l'interface tactile/souris. Les raccourcis sont principalement orientés sélection.</p>
          </section>

          <section id="import">
            <h2>Import Excel</h2>
            <ul>
              <li><strong>Format attendu :</strong> Onglet "Dispos" avec colonnes fixes (Nom, Prénom, Métier, Téléphone, Email, Ville).</li>
              <li><strong>Colonnes dynamiques :</strong> Triplets de colonnes par date (Lieu, Heure DÉBUT, Heure FIN).</li>
              <li><strong>Process d'import :</strong> Analyse → Prévisualisation → Validation → Import vers RTDB.</li>
              <li><strong>Gestion des doublons :</strong> Système de fusion intelligente basé sur les IDs déterministes.</li>
              <li><strong>Vérification :</strong> Contrôles de cohérence avant et après l'import.</li>
            </ul>
            <p class="tip"><strong>Limitation actuelle :</strong> Pas d'export CSV/PDF depuis l'interface (fonctionnalité en développement).</p>
          </section>

          <section id="multi-tenant">
            <h2>Multi-tenant & rôles</h2>
            <ul>
              <li><strong>Isolation des données :</strong> Chaque tenant a ses propres données, cloisonnées par tenantId.</li>
              <li><strong>Rôles disponibles :</strong> 
                <ul>
                  <li><strong>admin :</strong> Accès complet (gestion, édition, visualisation)</li>
                  <li><strong>editor :</strong> Édition et visualisation</li>
                  <li><strong>viewer :</strong> Visualisation uniquement</li>
                  <li><strong>collaborateur :</strong> Gestion de ses propres disponibilités</li>
                </ul>
              </li>
              <li><strong>Sécurité Firestore :</strong> Règles strictes appliquées côté serveur selon le rôle et le tenant.</li>
              <li><strong>Protection des routes :</strong> Interface adaptée selon les permissions de l'utilisateur.</li>
            </ul>
          </section>

          <section id="faq">
            <h2>FAQ</h2>
            <details>
              <summary>Je ne vois pas un collaborateur dans le planning</summary>
              <p>Vérifiez les filtres actifs (recherche, métier, statut, dates). Utilisez le bouton "Effacer les filtres" pour réinitialiser.</p>
            </details>
            <details>
              <summary>Le verrou d'édition reste bloqué</summary>
              <p>Les verrous se libèrent automatiquement après 2 minutes. En cas de problème, rechargez la page.</p>
            </details>
            <details>
              <summary>L'import Excel est refusé</summary>
              <p>Vérifiez le format : onglet "Dispos", colonnes obligatoires présentes, format des dates et heures correct.</p>
            </details>
            <details>
              <summary>La sélection multiple ne fonctionne pas</summary>
              <p>Maintenez Ctrl/Cmd lors du clic. La sélection est limitée à un seul collaborateur à la fois.</p>
            </details>
            <details>
              <summary>Je ne vois pas le filtre par lieu</summary>
              <p>Le filtre par lieu n'apparaît qu'en mode "Missions". Basculez le mode d'affichage depuis les filtres.</p>
            </details>
          </section>
        </main>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
// Vue statique d'aide admin. Protéger l'accès via meta route (requiresAuth + interface: 'admin').
</script>

<style scoped>
.guide-page {
  min-height: 100vh;
  background: #f8fafc;
}

/* Header élégant comme les autres pages */
.guide-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-top {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-icon {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-icon .va-icon {
  font-size: 24px;
  color: white;
}

.brand-content h1.brand-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: white;
}

.brand-content .brand-subtitle {
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 400;
}

/* Conteneur principal */
.guide-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.guide-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
}

/* Table des matières */
.toc {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toc h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: #374151;
  font-weight: 600;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.5rem;
}

.toc nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toc a {
  color: #4f46e5;
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  border-left: 3px solid transparent;
}

.toc a:hover {
  background: #f0f4ff;
  color: #3730a3;
  border-left-color: #667eea;
  transform: translateX(2px);
}

/* Contenu principal */
.guide-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.guide-content section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.guide-content h2 {
  margin: 0 0 1.5rem;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
  border-bottom: 3px solid #667eea;
  padding-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.guide-content h2::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #667eea;
  border-radius: 50%;
}

.guide-content ul {
  margin: 0;
  padding-left: 1.25rem;
  line-height: 1.7;
}

.guide-content li {
  margin-bottom: 0.75rem;
  color: #374151;
}

.guide-content li strong {
  color: #1f2937;
  font-weight: 600;
}

.guide-content ul ul {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.tip {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-left: 4px solid #2563eb;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0 0;
  color: #1e40af;
  font-size: 0.95rem;
}

.tip strong {
  color: #1e3a8a;
}

/* FAQ */
details {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

details:hover {
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.1);
}

summary {
  background: #f9fafb;
  padding: 1rem 1.25rem;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  list-style: none;
  position: relative;
}

summary::-webkit-details-marker {
  display: none;
}

summary::after {
  content: '▶';
  position: absolute;
  right: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  transition: transform 0.2s ease;
  color: #667eea;
  font-size: 0.8rem;
}

details[open] summary::after {
  transform: translateY(-50%) rotate(90deg);
}

summary:hover {
  background: #f0f4ff;
  color: #3730a3;
}

details p {
  padding: 1rem 1.25rem;
  margin: 0;
  color: #4b5563;
  line-height: 1.6;
  background: white;
}

details[open] summary {
  background: #e0e7ff;
  color: #3730a3;
}

/* Responsive */
@media (max-width: 768px) {
  .guide-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .toc {
    position: static;
    order: -1;
  }
  
  .guide-content section {
    padding: 1.5rem;
  }
  
  .header-top {
    padding: 0 1rem;
  }
  
  .brand-content h1.brand-title {
    font-size: 1.5rem;
  }
  
  .guide-container {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .header-top {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .guide-content section {
    padding: 1rem;
  }
}
</style>
