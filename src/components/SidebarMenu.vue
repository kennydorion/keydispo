<template>
  <nav class="sidebar">
    <ul>
      <li>
        <span class="material-icons">home</span>
        <span>Accueil</span>
      </li>
      <li class="active">
        <span class="material-icons">calendar_view_week</span>
        <span>Planning</span>
      </li>
      <li>
        <span class="material-icons">people</span>
        <span>Collaborateurs</span>
      </li>
      <li>
        <span class="material-icons">business</span>
        <span>Clients</span>
      </li>
      <li>
        <span class="material-icons">settings</span>
        <span>Paramètres</span>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.sidebar {
  width: 200px;
  padding-top: 60px;
  background: #fafafa;
  border-right: 1px solid #e5e5e5;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  overflow-y: auto;
}
.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.sidebar li.active,
.sidebar li:hover {
  background: #e0e7ff;
}
.material-icons {
  font-size: 1.3rem;
}
</style>
