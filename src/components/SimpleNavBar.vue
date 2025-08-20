<template>
  <nav class="simple-navbar">
    <div class="navbar-container">
      <!-- Logo/Brand -->
      <div class="navbar-brand">
        <span class="brand-text">📅 KeyDispo</span>
      </div>

      <!-- Menu principal -->
      <div class="navbar-menu">
        <router-link
          v-for="item in menuItems"
          :key="item.name"
          :to="item.path"
          class="menu-item"
          :class="{ active: $route.path === item.path }"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-text">{{ item.label }}</span>
        </router-link>
      </div>

      <!-- Actions utilisateur -->
      <div class="navbar-actions">
        <button class="action-btn" @click="toggleTheme">
          <span>🌙</span>
        </button>
        
        <div class="user-menu">
          <button class="user-btn" @click="toggleUserMenu">
            <span class="user-avatar">👤</span>
            <span class="user-name">John Doe</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-item" @click="openProfile">
              <span class="item-icon">👤</span>
              Mon Profil
            </div>
            <div class="dropdown-item" @click="openSettings">
              <span class="item-icon">⚙️</span>
              Paramètres
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item logout" @click="logout">
              <span class="item-icon">🚪</span>
              Déconnexion
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showUserMenu = ref(false)

const menuItems = ref([
  { name: 'semaine', label: 'Semaine', path: '/semaine', icon: '📅' },
  { name: 'import', label: 'Import', path: '/import', icon: '📥' }
])

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const toggleTheme = () => {
  console.log('Toggle theme')
}

const openProfile = () => {
  console.log('Open profile')
  showUserMenu.value = false
}

const openSettings = () => {
  console.log('Open settings')
  showUserMenu.value = false
}

const logout = () => {
  console.log('Logout')
  showUserMenu.value = false
}

console.log('🧭 Simple NavigationBar component loaded successfully')
</script>

<style scoped>
.simple-navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 64px;
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
}

.brand-text {
  color: white;
}

.navbar-menu {
  display: flex;
  gap: 30px;
  align-items: center;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: white;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-2px);
}

.menu-item.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.menu-icon {
  font-size: 1.2rem;
}

.menu-text {
  color: white;
  font-weight: 600;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.2rem;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.user-menu {
  position: relative;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.user-avatar {
  font-size: 1.2rem;
}

.user-name {
  color: white;
  font-weight: 600;
}

.dropdown-arrow {
  font-size: 0.8rem;
  color: white;
  transition: transform 0.2s ease;
}

.user-btn:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  min-width: 200px;
  overflow: hidden;
  border: 1px solid #e1e5e9;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #2c3e50;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.dropdown-item:hover {
  background: #f8f9fa;
  color: #007bff;
  transform: translateX(4px);
}

.dropdown-item.logout {
  color: #dc3545;
}

.dropdown-item.logout:hover {
  background: #fff5f5;
  color: #dc3545;
}

.item-icon {
  font-size: 1.1rem;
}

.dropdown-divider {
  height: 1px;
  background: #e1e5e9;
  margin: 8px 0;
}

@media (max-width: 768px) {
  .navbar-container {
    padding: 0 15px;
  }
  
  .navbar-menu {
    gap: 15px;
  }
  
  .menu-item {
    padding: 8px 12px;
  }
  
  .menu-text {
    display: none;
  }
  
  .user-name {
    display: none;
  }
  
  .navbar-actions {
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .navbar-menu {
    gap: 8px;
  }
  
  .menu-item {
    padding: 6px 8px;
  }
  
  .menu-icon {
    font-size: 1.1rem;
  }
}
</style>
