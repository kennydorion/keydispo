<template>
  <header class="header">
    <div class="logo">
      <span class="material-icons">calendar_month</span>
      <span class="app-name">KeyDispo</span>
    </div>
    <div class="user-menu">
      <span class="material-icons">account_circle</span>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 5;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 1.2rem;
}
.user-menu {
  display: flex;
  align-items: center;
}
.material-icons {
  font-size: 1.6rem;
}
</style>
