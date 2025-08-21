<template>
  <div class="parametres">
      <div class="parametres-header">
        <h1>Paramètres</h1>
        <p>Configuration et préférences de l'application</p>
      </div>
      
      <div class="parametres-grid">
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">person</span>
              <h3>Profil utilisateur</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="form-group">
              <label>Nom complet</label>
              <input type="text" value="Marie Dupont" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" value="marie.dupont@exemple.com" />
            </div>
            <div class="form-group">
              <label>Téléphone</label>
              <input type="tel" value="+33 6 12 34 56 78" />
            </div>
            <div class="form-group">
              <label>Rôle</label>
              <select disabled>
                <option>Administrateur</option>
              </select>
            </div>
            <button class="btn-secondary">Modifier le profil</button>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">notifications</span>
              <h3>Notifications</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Nouvelles disponibilités</div>
                <div class="setting-desc">Recevoir une notification lors de nouvelles disponibilités</div>
              </div>
              <div class="toggle">
                <input type="checkbox" id="notif-dispo" checked />
                <label for="notif-dispo"></label>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Modifications</div>
                <div class="setting-desc">Être alerté des modifications de planning</div>
              </div>
              <div class="toggle">
                <input type="checkbox" id="notif-modif" checked />
                <label for="notif-modif"></label>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Rappels quotidiens</div>
                <div class="setting-desc">Résumé quotidien des disponibilités du jour</div>
              </div>
              <div class="toggle">
                <input type="checkbox" id="notif-rappel" />
                <label for="notif-rappel"></label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">palette</span>
              <h3>Préférences d'affichage</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="form-group">
              <label>Format de date</label>
              <select>
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>
            <div class="form-group">
              <label>Format d'heure</label>
              <select>
                <option>24 heures</option>
                <option>12 heures (AM/PM)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Langue</label>
              <select>
                <option>Français</option>
                <option>English</option>
                <option>Español</option>
              </select>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Mode sombre</div>
                <div class="setting-desc">Interface avec thème sombre</div>
              </div>
              <div class="toggle">
                <input type="checkbox" id="dark-mode" />
                <label for="dark-mode"></label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">security</span>
              <h3>Sécurité</h3>
            </div>
          </div>
          <div class="parametre-content">
            <button class="btn-outline">Changer le mot de passe</button>
            <button class="btn-outline">Sessions actives</button>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">Authentification à deux facteurs</div>
                <div class="setting-desc">Sécurité renforcée pour votre compte</div>
              </div>
              <div class="toggle">
                <input type="checkbox" id="two-factor" />
                <label for="two-factor"></label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">group</span>
              <h3>Gestion de l'équipe</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="team-stats">
              <div class="stat-item">
                <div class="stat-value">12</div>
                <div class="stat-label">Collaborateurs</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">3</div>
                <div class="stat-label">Administrateurs</div>
              </div>
            </div>
            <button class="btn-primary">Inviter un collaborateur</button>
            <button class="btn-outline">Gérer les rôles</button>
          </div>
        </div>
        
        <div class="parametre-card">
          <div class="parametre-header">
            <div class="parametre-title">
              <span class="parametre-icon material-symbols-outlined">download</span>
              <h3>Données et export</h3>
            </div>
          </div>
          <div class="parametre-content">
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">Export complet</div>
                <div class="export-desc">Télécharger toutes les données</div>
              </div>
              <button class="btn-outline small">CSV</button>
            </div>
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">Sauvegarde mensuelle</div>
                <div class="export-desc">Archive des données du mois</div>
              </div>
              <button class="btn-outline small">ZIP</button>
            </div>
            <button class="btn-danger">Supprimer toutes les données</button>
          </div>
        </div>
      </div>
      
      <div class="parametres-footer">
        <button class="btn-primary large">Sauvegarder les modifications</button>
        <button class="btn-outline large">Annuler</button>
      </div>
  </div>
</template>

<script setup lang="ts">
// MainLayout retiré : TopNav déjà globale
</script>

<style scoped>
.parametres {
  padding: 0;
  font-family: 'Inter', 'Roboto', system-ui, sans-serif;
}
.parametres-header {
  margin-bottom: 32px;
}
.parametres-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.2;
}
.parametres-header p {
  font-size: 1.1rem;
  color: #6B7280;
  margin: 0;
}
.parametres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}
.parametre-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px 0 #2563eb0d;
  border: 1.5px solid #f1f5f9;
}
.parametre-header {
  margin-bottom: 20px;
}
.parametre-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.parametre-icon {
  color: #2563EB;
  font-size: 24px;
}
.parametre-title h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
.parametre-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}
.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 0.95rem;
  outline: none;
}
.form-group input:focus,
.form-group select:focus {
  border-color: #2563EB;
}
.form-group select:disabled {
  background: #f9fafb;
  color: #6B7280;
  cursor: not-allowed;
}
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-info {
  flex: 1;
}
.setting-label {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}
.setting-desc {
  font-size: 0.9rem;
  color: #6B7280;
}
.toggle {
  position: relative;
}
.toggle input {
  display: none;
}
.toggle label {
  width: 44px;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  display: block;
}
.toggle label::after {
  content: '';
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}
.toggle input:checked + label {
  background: #2563EB;
}
.toggle input:checked + label::after {
  transform: translateX(20px);
}
.btn-primary,
.btn-secondary,
.btn-outline,
.btn-danger {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  border: none;
  outline: none;
}
.btn-primary {
  background: #2563EB;
  color: #fff;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-secondary {
  background: #f1f5f9;
  color: #374151;
}
.btn-secondary:hover {
  background: #e2e8f0;
}
.btn-outline {
  background: transparent;
  color: #374151;
  border: 1.5px solid #e5e7eb;
}
.btn-outline:hover {
  background: #f9fafb;
  border-color: #2563EB;
  color: #2563EB;
}
.btn-danger {
  background: #ef4444;
  color: #fff;
}
.btn-danger:hover {
  background: #dc2626;
}
.btn-outline.small {
  padding: 6px 12px;
  font-size: 0.85rem;
}
.team-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}
.stat-item {
  text-align: center;
}
.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: #2563EB;
  line-height: 1;
}
.stat-label {
  font-size: 0.9rem;
  color: #6B7280;
  margin-top: 4px;
}
.export-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.export-item:last-child {
  border-bottom: none;
  margin-bottom: 16px;
}
.export-info {
  flex: 1;
}
.export-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}
.export-desc {
  font-size: 0.9rem;
  color: #6B7280;
}
.parametres-footer {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1.5px solid #f1f5f9;
}
.btn-primary.large,
.btn-outline.large {
  padding: 12px 24px;
  font-size: 1rem;
}
@media (max-width: 768px) {
  .parametres-grid {
    grid-template-columns: 1fr;
  }
  .parametres-footer {
    flex-direction: column;
  }
  .team-stats {
    justify-content: center;
  }
}
</style>
