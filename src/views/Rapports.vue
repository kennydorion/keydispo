<template>
  <div class="rapports">
      <div class="rapports-header">
        <h1>Rapports</h1>
        <p>Analyse et statistiques des disponibilités</p>
      </div>
      
      <div class="rapports-filters">
        <div class="filter-group">
          <label>Période</label>
          <select>
            <option>7 derniers jours</option>
            <option>30 derniers jours</option>
            <option>3 derniers mois</option>
            <option>Année en cours</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Collaborateur</label>
          <select>
            <option>Tous</option>
            <option>Marie Dupont</option>
            <option>Jean Martin</option>
            <option>Sophie Bernard</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Métier</label>
          <select>
            <option>Tous</option>
            <option>Développeur</option>
            <option>Designer</option>
            <option>Chef de projet</option>
          </select>
        </div>
        <button class="btn-primary">
          <span class="material-symbols-outlined">download</span>
          Export CSV
        </button>
      </div>
      
      <div class="rapports-grid">
        <div class="rapport-card">
          <div class="rapport-header">
            <h3>Taux de disponibilité par métier</h3>
            <span class="rapport-icon material-symbols-outlined">pie_chart</span>
          </div>
          <div class="rapport-chart">
            <div class="chart-donut">
              <div class="donut-segment" style="--percentage: 85; --color: #2563EB; --offset: 0;"></div>
              <div class="donut-segment" style="--percentage: 75; --color: #10B981; --offset: 85;"></div>
              <div class="donut-segment" style="--percentage: 65; --color: #f59e0b; --offset: 160;"></div>
            </div>
            <div class="chart-legend">
              <div class="legend-item">
                <div class="legend-color" style="background: #2563EB;"></div>
                <span>Développeurs (85%)</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #10B981;"></div>
                <span>Designers (75%)</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #f59e0b;"></div>
                <span>Chefs de projet (65%)</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="rapport-card">
          <div class="rapport-header">
            <h3>Évolution mensuelle</h3>
            <span class="rapport-icon material-symbols-outlined">trending_up</span>
          </div>
          <div class="rapport-content">
            <div class="metric-item">
              <div class="metric-label">Disponibilités créées</div>
              <div class="metric-value positive">+12%</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Temps de planification</div>
              <div class="metric-value negative">-8%</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Conflits résolus</div>
              <div class="metric-value positive">+24%</div>
            </div>
          </div>
        </div>
        
        <div class="rapport-card table-card">
          <div class="rapport-header">
            <h3>Top collaborateurs</h3>
            <span class="rapport-icon material-symbols-outlined">leaderboard</span>
          </div>
          <div class="rapport-table">
            <div class="table-row header">
              <div>Nom</div>
              <div>Disponibilités</div>
              <div>Taux</div>
            </div>
            <div class="table-row">
              <div class="collaborateur-cell">
                <div class="avatar">M</div>
                <span>Marie Dupont</span>
              </div>
              <div>47</div>
              <div class="taux-cell positive">92%</div>
            </div>
            <div class="table-row">
              <div class="collaborateur-cell">
                <div class="avatar">J</div>
                <span>Jean Martin</span>
              </div>
              <div>43</div>
              <div class="taux-cell positive">89%</div>
            </div>
            <div class="table-row">
              <div class="collaborateur-cell">
                <div class="avatar">S</div>
                <span>Sophie Bernard</span>
              </div>
              <div>39</div>
              <div class="taux-cell neutral">78%</div>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
// MainLayout retiré : TopNav déjà globale
</script>

<style scoped>
.rapports {
  padding: 0;
  font-family: 'Inter', 'Roboto', system-ui, sans-serif;
}
.rapports-header {
  margin-bottom: 32px;
}
.rapports-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.2;
}
.rapports-header p {
  font-size: 1.1rem;
  color: #6B7280;
  margin: 0;
}
.rapports-filters {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}
.filter-group select {
  padding: 10px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  min-width: 140px;
}
.filter-group select:focus {
  border-color: #2563EB;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #2563EB;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s;
  margin-left: auto;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.rapports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}
.rapport-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px 0 #2563eb0d;
  border: 1.5px solid #f1f5f9;
}
.rapport-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.rapport-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
.rapport-icon {
  color: #6B7280;
  font-size: 24px;
}
.rapport-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.chart-donut {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(
    #2563EB 0% 34%,
    #10B981 34% 64%,
    #f59e0b 64% 86%,
    #e5e7eb 86% 100%
  );
  position: relative;
}
.chart-donut::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: #fff;
  border-radius: 50%;
}
.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #374151;
}
.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.rapport-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.metric-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.metric-item:last-child {
  border-bottom: none;
}
.metric-label {
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
}
.metric-value {
  font-size: 1.1rem;
  font-weight: 700;
}
.metric-value.positive {
  color: #10B981;
}
.metric-value.negative {
  color: #ef4444;
}
.table-card {
  grid-column: span 2;
}
.rapport-table {
  display: flex;
  flex-direction: column;
}
.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
  gap: 16px;
}
.table-row.header {
  font-weight: 700;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}
.table-row:last-child {
  border-bottom: none;
}
.collaborateur-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 32px;
  height: 32px;
  background: #f1f5fd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563EB;
  font-weight: 700;
  font-size: 0.9rem;
}
.taux-cell {
  font-weight: 700;
}
.taux-cell.positive {
  color: #10B981;
}
.taux-cell.neutral {
  color: #f59e0b;
}
@media (max-width: 768px) {
  .rapports-filters {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-primary {
    margin-left: 0;
  }
  .rapports-grid {
    grid-template-columns: 1fr;
  }
  .table-card {
    grid-column: span 1;
  }
}
</style>
