<template>
  <div class="dashboard">
      <!-- En-tête du dashboard -->
      <header class="dashboard-header">
        <div class="header-content">
          <div class="header-title">
            <h1>Tableau de bord</h1>
            <p class="header-subtitle">Vue d'ensemble des disponibilités et activités</p>
          </div>
          <div class="header-actions">
            <button class="action-btn primary">
              <span class="material-icons">add</span>
              Nouvelle disponibilité
            </button>
          </div>
        </div>
      </header>
      
      <!-- Navigation rapide -->
      <div class="quick-nav">
        <div class="nav-card" @click="$router.push('/semaine')">
          <div class="nav-icon" style="background: #f59e0b22; color: #f59e0b;">
            <span class="material-icons">calendar_month</span>
          </div>
          <div class="nav-content">
            <h3>Planning</h3>
            <p>Gérer les disponibilités</p>
          </div>
        </div>
        
        <div class="nav-card" @click="$router.push('/collaborateurs')">
          <div class="nav-icon" style="background: #10b98122; color: #10B981;">
            <span class="material-icons">people</span>
          </div>
          <div class="nav-content">
            <h3>Collaborateurs</h3>
            <p>Gérer l'équipe</p>
          </div>
        </div>
        
        <div class="nav-card" @click="$router.push('/import')">
          <div class="nav-icon" style="background: #2563eb22; color: #2563EB;">
            <span class="material-icons">upload</span>
          </div>
          <div class="nav-content">
            <h3>Import</h3>
            <p>Importer des données</p>
          </div>
        </div>
        
        <div class="nav-card" @click="$router.push('/parametres')">
          <div class="nav-icon" style="background: #ef444422; color: #ef4444;">
            <span class="material-icons">settings</span>
          </div>
          <div class="nav-content">
            <h3>Paramètres</h3>
            <p>Configuration</p>
          </div>
        </div>
      </div>
      
      <div class="dashboard-grid">
        <!-- KPIs Cards -->
        <div class="kpi-card">
          <div class="kpi-icon" style="background: #2563eb22; color: #2563EB;">
            <span class="material-icons">calendar_month</span>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">127</div>
            <div class="kpi-label">Disponibilités actives</div>
          </div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-icon" style="background: #10b98122; color: #10B981;">
            <span class="material-icons">group</span>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">34</div>
            <div class="kpi-label">Collaborateurs</div>
          </div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-icon" style="background: #f59e0b22; color: #f59e0b;">
            <span class="material-icons">trending_up</span>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">78%</div>
            <div class="kpi-label">Taux d'occupation</div>
          </div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-icon" style="background: #ef444422; color: #ef4444;">
            <span class="material-icons">schedule</span>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">5</div>
            <div class="kpi-label">Conflits horaires</div>
          </div>
        </div>
        
        <!-- Chart Card -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Évolution des disponibilités</h3>
            <select class="chart-select">
              <option>7 derniers jours</option>
              <option>30 derniers jours</option>
              <option>3 derniers mois</option>
            </select>
          </div>
          <div class="chart-placeholder">
            <div class="chart-bars">
              <div class="chart-bar" style="height: 60%"></div>
              <div class="chart-bar" style="height: 80%"></div>
              <div class="chart-bar" style="height: 45%"></div>
              <div class="chart-bar" style="height: 90%"></div>
              <div class="chart-bar" style="height: 75%"></div>
              <div class="chart-bar" style="height: 55%"></div>
              <div class="chart-bar" style="height: 85%"></div>
            </div>
            <div class="chart-labels">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mer</span>
              <span>Jeu</span>
              <span>Ven</span>
              <span>Sam</span>
              <span>Dim</span>
            </div>
          </div>
        </div>
        
        <!-- Recent Activity Card -->
        <div class="activity-card">
          <div class="activity-header">
            <h3>Activité récente</h3>
            <button class="activity-btn">Voir tout</button>
          </div>
          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon" style="background: #2563eb22; color: #2563EB;">
                <span class="material-icons">person_add</span>
              </div>
              <div class="activity-content">
                <div class="activity-title">Nouveau collaborateur ajouté</div>
                <div class="activity-time">Il y a 2 heures</div>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon" style="background: #10b98122; color: #10B981;">
                <span class="material-icons">upload</span>
              </div>
              <div class="activity-content">
                <div class="activity-title">Import Excel terminé</div>
                <div class="activity-time">Il y a 5 heures</div>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon" style="background: #f59e0b22; color: #f59e0b;">
                <span class="material-icons">edit</span>
              </div>
              <div class="activity-content">
                <div class="activity-title">Planning modifié</div>
                <div class="activity-time">Hier à 14:30</div>
              </div>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
// MainLayout retiré : TopNav déjà injectée globalement dans App.vue
</script>

<style scoped>
.dashboard {
  padding: 0;
  font-family: 'Inter', 'Roboto', system-ui, sans-serif;
}

.dashboard-header {
  margin-bottom: 32px;
}

.dashboard-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: var(--dark-text-primary);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.dashboard-header p {
  font-size: 1.1rem;
  color: var(--dark-text-secondary);
  margin: 0;
}

.quick-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.nav-card {
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-card:hover {
  background: var(--dark-surface-hover);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.nav-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-content h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--dark-text-primary);
}

.nav-content p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--dark-text-secondary);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.kpi-card {
  background: var(--dark-surface);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.3);
  border: 1px solid var(--dark-border);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: box-shadow 0.18s, transform 0.18s;
}

.kpi-card:hover {
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.kpi-content {
  flex: 1;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--dark-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.kpi-label {
  font-size: 1rem;
  color: var(--dark-text-secondary);
  font-weight: 500;
}

.chart-card {
  background: var(--dark-surface);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.3);
  border: 1px solid var(--dark-border);
  grid-column: span 2;
  min-height: 320px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.chart-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--dark-text-primary);
  margin: 0;
}

.chart-select {
  padding: 8px 12px;
  border: 1px solid var(--dark-border);
  border-radius: 8px;
  background: var(--dark-surface-secondary);
  color: var(--dark-text-primary);
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
}

.chart-select:focus {
  border-color: var(--primary-color);
}

.chart-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 160px;
  margin-bottom: 16px;
  gap: 12px;
}

.chart-bar {
  background: linear-gradient(180deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border-radius: 6px 6px 0 0;
  flex: 1;
  min-height: 20px;
  transition: background 0.18s;
}

.chart-bar:hover {
  background: linear-gradient(180deg, var(--primary-hover) 0%, var(--primary-color) 100%);
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--dark-text-secondary);
  font-weight: 500;
}

.activity-card {
  background: var(--dark-surface);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.3);
  border: 1px solid var(--dark-border);
  grid-column: span 2;
}

.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.activity-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--dark-text-primary);
  margin: 0;
}

.activity-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.18s;
}

.activity-btn:hover {
  background: rgba(94, 129, 172, 0.1);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark-text-primary);
  margin-bottom: 2px;
}

.activity-time {
  font-size: 0.9rem;
  color: var(--dark-text-secondary);
}

@media (max-width: 768px) {
  .chart-card,
  .activity-card {
    grid-column: span 1;
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
