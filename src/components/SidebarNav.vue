<template>
  <nav class="sidebar" aria-label="Navigation principale">
    <div class="sidebar-logo">
      <img src="/keyplacementlogo.svg" alt="Key Placement" />
    </div>
    <ul class="sidebar-list">
      <li v-for="item in items" :key="item.path">
        <router-link :to="item.path" class="sidebar-link" :class="{active: $route.path.startsWith(item.path)}" :aria-current="$route.path.startsWith(item.path) ? 'page' : undefined">
          <span class="sidebar-icon material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
          <span class="sidebar-label">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { InterfaceManager } from '../services/interfaceManager'
const $route = useRoute()
const items = computed(() => InterfaceManager.navigationItems.value)
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: linear-gradient(145deg, #3b4252 0%, #434c5e 100%);
  border-radius: 20px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 32px 0 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 92vh;
  margin: 20px 0 20px 20px;
  position: relative;
  overflow: hidden;
}

.sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}
.sidebar-logo img {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  margin-bottom: 36px;
  box-shadow: 
    0 8px 32px rgba(37, 99, 235, 0.3),
    0 0 0 3px rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease;
}

.sidebar-logo img:hover {
  transform: scale(1.05);
}
.sidebar-list {
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-radius: 12px;
  color: #d8dee9;
  font-weight: 500;
  font-size: 0.95rem;
  text-decoration: none;
  margin: 3px 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  position: relative;
  overflow: hidden;
}

.sidebar-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(33, 150, 243, 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.sidebar-link:hover,
.sidebar-link:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  color: #eceff4;
  transform: translateX(4px);
}

.sidebar-link:hover::before {
  opacity: 1;
}

.sidebar-link.active {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 
    0 8px 25px rgba(37, 99, 235, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}

.sidebar-link.active::before {
  opacity: 0;
}
.sidebar-icon {
  font-size: 22px;
  color: inherit;
  transition: transform 0.3s ease;
}

.sidebar-link:hover .sidebar-icon,
.sidebar-link.active .sidebar-icon {
  transform: scale(1.1);
}

.sidebar-label {
  flex: 1;
  white-space: nowrap;
  position: relative;
  z-index: 1;
}
</style>
