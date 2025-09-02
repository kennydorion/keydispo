<!--
  Colonne collaborateur dans le planning
  Extrait de SemaineVirtualClean.vue pour améliorer la modularité
-->
<template>
  <div 
    class="collab-sticky" 
    :style="{ 
      '--collaborateur-color': collaborateurColor,
      width: stickyLeftWidth + 'px',
      height: rowHeight + 'px'
    }"
  >
    <div class="collaborateur-color-bar"></div>
    <div class="collaborateur-content">
      <span class="metier-right" v-if="collaborateur.metier">{{ collaborateur.metier }}</span>
      <div 
        class="collaborateur-name clickable-name" 
        @click="$emit('openInfo', collaborateur)"
      >
        {{ collaborateur.prenom }} {{ collaborateur.nom }}
      </div>
      <div class="collaborateur-meta">
        <span class="location" v-if="collaborateur.ville">{{ collaborateur.ville }}</span>
      </div>
      <div class="collaborateur-extra">
        <a class="contact phone-link" v-if="collaborateur.phone" :href="`tel:${phoneToHref(collaborateur.phone)}`">
          <va-icon name="phone" size="12px" />
          <span class="text">{{ formatPhone(collaborateur.phone) }}</span>
        </a>
        <span class="contact" v-if="collaborateur.email">
          <va-icon name="email" size="12px" />
          <span class="text">{{ collaborateur.email }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatPhone as formatPhoneUtil, phoneToHref } from '../../utils/phoneFormatter'

interface Collaborateur {
  id: string
  nom: string
  prenom: string
  email?: string
  phone?: string
  metier?: string
  ville?: string
  color?: string
  [key: string]: any
}

interface Props {
  collaborateur: Collaborateur
  stickyLeftWidth: number
  rowHeight: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openInfo: [collaborateur: Collaborateur]
}>()

// Couleur du collaborateur
const collaborateurColor = computed(() => {
  return props.collaborateur.color || '#2196F3'
})

// Formatage du numéro de téléphone
function formatPhone(phone: string): string {
  return formatPhoneUtil(phone)
}
</script>

<style scoped>
.collab-sticky {
  position: sticky;
  left: 0;
  z-index: 30;
  background: white;
  border-right: 2px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0;
  overflow: hidden;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
}

.collaborateur-color-bar {
  width: 4px;
  height: 100%;
  background: var(--collaborateur-color, #2196F3);
  flex-shrink: 0;
}

.collaborateur-content {
  flex: 1;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  position: relative;
}

.metier-right {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 10px;
  color: #666;
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 4px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collaborateur-name {
  font-weight: 600;
  font-size: 13px;
  color: #1a1a1a;
  line-height: 1.2;
  margin-bottom: 2px;
  max-width: calc(100% - 90px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clickable-name {
  cursor: pointer;
  transition: color 0.2s ease;
}

.clickable-name:hover {
  color: var(--collaborateur-color, #2196F3);
  text-decoration: underline;
}

.collaborateur-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.location {
  font-size: 11px;
  color: #666;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.collaborateur-extra {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.contact {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #888;
  overflow: hidden;
}

.contact .text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.contact .va-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

/* États de survol */
.collab-sticky:hover {
  background: rgba(33, 150, 243, 0.02);
}

.collab-sticky:hover .collaborateur-color-bar {
  width: 6px;
  transition: width 0.2s ease;
}

/* Responsive pour mobile */
@media (max-width: 768px) {
  .collaborateur-content {
    padding: 6px 8px;
  }
  
  .collaborateur-name {
    font-size: 12px;
    max-width: calc(100% - 60px);
  }
  
  .metier-right {
    font-size: 9px;
    max-width: 50px;
    right: 4px;
  }
  
  .location {
    font-size: 10px;
    max-width: 80px;
  }
  
  .contact {
    font-size: 9px;
  }
  
  .contact.phone-link {
    text-decoration: none;
    color: var(--va-primary);
    padding: 2px 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .contact.phone-link:hover {
    background-color: var(--va-primary-light);
    color: var(--va-primary-dark);
    transform: translateY(-1px);
  }
  
  .contact .text {
    max-width: 80px;
  }
}

/* Animation de chargement */
.collab-sticky.loading {
  background: #f5f5f5;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
</style>
