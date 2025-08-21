<template>
  <div class="collaborateurs">
      <div class="collaborateurs-header">
        <h1>Collaborateurs</h1>
        <p>Gestion de l'équipe et des profils</p>
      </div>
      
      <div class="collaborateurs-actions">
        <div class="search-bar">
          <span class="material-symbols-outlined">search</span>
          <input type="text" placeholder="Rechercher un collaborateur..." />
        </div>
        <button class="btn-primary">
          <span class="material-symbols-outlined">person_add</span>
          Ajouter
        </button>
      </div>
      
      <div class="collaborateurs-grid">
        <div class="collaborateur-card">
          <div class="collaborateur-avatar">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div class="collaborateur-info">
            <h3>Marie Dupont</h3>
            <p>Développeuse Front-end</p>
            <div class="collaborateur-meta">
              <span class="meta-item">
                <span class="material-symbols-outlined">email</span>
                marie.dupont@example.com
              </span>
              <span class="meta-item">
                <span class="material-symbols-outlined">phone</span>
                06 12 34 56 78
              </span>
            </div>
          </div>
          <div class="collaborateur-actions">
            <button class="btn-ghost">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-ghost">
              <span class="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>
        
        <div class="collaborateur-card">
          <div class="collaborateur-avatar">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div class="collaborateur-info">
            <h3>Jean Martin</h3>
            <p>Chef de projet</p>
            <div class="collaborateur-meta">
              <span class="meta-item">
                <span class="material-symbols-outlined">email</span>
                jean.martin@example.com
              </span>
              <span class="meta-item">
                <span class="material-symbols-outlined">phone</span>
                06 98 76 54 32
              </span>
            </div>
          </div>
          <div class="collaborateur-actions">
            <button class="btn-ghost">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-ghost">
              <span class="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>
        
        <div class="collaborateur-card">
          <div class="collaborateur-avatar">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div class="collaborateur-info">
            <h3>Sophie Bernard</h3>
            <p>Designer UX/UI</p>
            <div class="collaborateur-meta">
              <span class="meta-item">
                <span class="material-symbols-outlined">email</span>
                sophie.bernard@example.com
              </span>
              <span class="meta-item">
                <span class="material-symbols-outlined">phone</span>
                06 45 67 89 12
              </span>
            </div>
          </div>
          <div class="collaborateur-actions">
            <button class="btn-ghost">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-ghost">
              <span class="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
// MainLayout retiré : TopNav déjà globale dans App.vue
</script>

<style scoped>
.collaborateurs {
  padding: 0;
  font-family: 'Inter', 'Roboto', system-ui, sans-serif;
}
.collaborateurs-header {
  margin-bottom: 32px;
}
.collaborateurs-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.2;
}
.collaborateurs-header p {
  font-size: 1.1rem;
  color: #6B7280;
  margin: 0;
}
.collaborateurs-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 16px;
  flex: 1;
  max-width: 400px;
  box-shadow: 0 1px 4px 0 #2563eb0d;
}
.search-bar span {
  color: #9CA3AF;
  font-size: 20px;
}
.search-bar input {
  border: none;
  outline: none;
  background: none;
  font-size: 1rem;
  color: #374151;
  flex: 1;
}
.search-bar input::placeholder {
  color: #9CA3AF;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #2563EB;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, transform 0.18s;
  box-shadow: 0 2px 8px 0 #2563eb22;
}
.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
.btn-ghost {
  background: none;
  border: none;
  color: #6B7280;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-ghost:hover {
  background: #f1f5f9;
  color: #2563EB;
}
.collaborateurs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
}
.collaborateur-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px 0 #2563eb0d;
  border: 1.5px solid #f1f5f9;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  transition: box-shadow 0.18s, transform 0.18s;
}
.collaborateur-card:hover {
  box-shadow: 0 8px 32px 0 #2563eb14;
  transform: translateY(-2px);
}
.collaborateur-avatar {
  width: 60px;
  height: 60px;
  background: #f1f5fd;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563EB;
  font-size: 28px;
}
.collaborateur-info {
  flex: 1;
}
.collaborateur-info h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
  line-height: 1.2;
}
.collaborateur-info p {
  font-size: 1rem;
  color: #6B7280;
  margin: 0 0 16px 0;
  font-weight: 500;
}
.collaborateur-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #6B7280;
}
.meta-item span {
  font-size: 16px;
  color: #9CA3AF;
}
.collaborateur-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
@media (max-width: 768px) {
  .collaborateurs-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .search-bar {
    max-width: none;
  }
  .collaborateurs-grid {
    grid-template-columns: 1fr;
  }
  .collaborateur-card {
    flex-direction: column;
    text-align: center;
  }
  .collaborateur-actions {
    flex-direction: row;
    justify-content: center;
  }
}
</style>
