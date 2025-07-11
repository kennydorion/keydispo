<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { collection, onSnapshot, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const props = defineProps({
  view: {
    type: String,
    default: 'table', // 'table' or 'day'
  },
});

const search = ref('');
const collaborators = ref([]); // [{id, name}]
const days = ref([]); // array of dates as strings
const planning = ref({}); // {day: {collabId: {status, time, location}}}
const selectedDay = ref('');

const showAddCollabModal = ref(false);
const newCollabName = ref('');
const showAddClientModal = ref(false);
const newClientName = ref('');

let unsubscribeCollaborators;
let unsubscribePlanning;

onMounted(() => {
  // listen to collaborators
  unsubscribeCollaborators = onSnapshot(
    collection(db, 'collaborators'),
    (snapshot) => {
      collaborators.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  );

  // listen to planning days
  unsubscribePlanning = onSnapshot(collection(db, 'planning'), (snapshot) => {
    const data = {};
    const dayList = [];
    snapshot.forEach((docSnap) => {
      data[docSnap.id] = docSnap.data();
      dayList.push(docSnap.id);
    });
    days.value = dayList.sort();
    planning.value = data;
    if (!selectedDay.value && days.value.length) {
      selectedDay.value = days.value[0];
    }
  });
});

onUnmounted(() => {
  if (typeof unsubscribeCollaborators === 'function') {
    unsubscribeCollaborators();
  }
  if (typeof unsubscribePlanning === 'function') {
    unsubscribePlanning();
  }
});

const filteredCollaborators = computed(() => {
  if (!search.value) return collaborators.value;
  return collaborators.value.filter((c) =>
    c.name.toLowerCase().includes(search.value.toLowerCase())
  );
});

async function toggleStatus(day, collab) {
  const dayDoc = doc(db, 'planning', day);
  const dayData = planning.value[day] || {};
  const current = dayData[collab.id] || { status: 'dispo' };
  const newStatus = current.status === 'dispo' ? 'indispo' : 'dispo';
  const updated = { ...dayData, [collab.id]: { ...current, status: newStatus } };
  try {
    await setDoc(dayDoc, updated, { merge: true });
  } catch (err) {
    console.error('Failed to update status:', err);
    alert('Erreur lors de la mise à jour du statut.');
  }
}

async function addCollaborator() {
  const name = newCollabName.value.trim();
  if (!name) return;
  try {
    await addDoc(collection(db, 'collaborators'), { name });
    newCollabName.value = '';
    showAddCollabModal.value = false;
  } catch (err) {
    console.error('Failed to add collaborator:', err);
    alert('Erreur lors de l\'ajout du collaborateur.');
  }
}

async function addClient() {
  const name = newClientName.value.trim();
  if (!name) return;
  try {
    await addDoc(collection(db, 'clients'), { name });
    newClientName.value = '';
    showAddClientModal.value = false;
  } catch (err) {
    console.error('Failed to add client:', err);
    alert('Erreur lors de l\'ajout du client.');
  }
}
</script>


<template>
  <div class="search-bar">
    <input v-model="search" placeholder="Rechercher" />
    <button @click="showAddCollabModal = true">Ajouter un collaborateur</button>
    <button @click="showAddClientModal = true">Ajouter un client</button>
  </div>
  <div class="board" :class="view">
    <div class="collab-column">
      <div class="collab" v-for="c in filteredCollaborators" :key="c.id">
        {{ c.name }}
      </div>
    </div>
    <div class="days" v-if="view === 'table'">
      <div class="day" v-for="d in days" :key="d">
        <div class="day-header">{{ d }}</div>
        <div
          class="cell"
          v-for="c in filteredCollaborators"
          :key="c.id"
          @click="toggleStatus(d, c)"
          :class="planning[d]?.[c.id]?.status"
        >
          {{ planning[d]?.[c.id]?.status || '' }}
        </div>
      </div>
    </div>
    <div class="day-view" v-else>
      <div class="day-header" v-for="d in days" :key="d" @click="selectedDay = d">
        {{ d }}
      </div>
      <div v-if="days.length">
        <div
          class="cell"
          v-for="c in filteredCollaborators"
          :key="c.id"
          @click="toggleStatus(selectedDay, c)"
          :class="planning[selectedDay]?.[c.id]?.status"
        >
          {{ planning[selectedDay]?.[c.id]?.status || '' }}
        </div>
      </div>
    </div>
  </div>
  <div v-if="showAddCollabModal" class="modal">
    <div class="modal-content">
      <h3>Ajouter un collaborateur</h3>
      <input v-model="newCollabName" placeholder="Nom" />
      <button @click="addCollaborator">Enregistrer</button>
      <button @click="showAddCollabModal = false">Annuler</button>
    </div>
  </div>
  <div v-if="showAddClientModal" class="modal">
    <div class="modal-content">
      <h3>Ajouter un client</h3>
      <input v-model="newClientName" placeholder="Nom" />
      <button @click="addClient">Enregistrer</button>
      <button @click="showAddClientModal = false">Annuler</button>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  overflow-x: auto;
}
.collab-column {
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 2;
  min-width: 120px;
  border-right: 1px solid #ccc;
}
.collab {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}
.days {
  display: flex;
}
.day {
  min-width: 120px;
  border-right: 1px solid #ccc;
}
.day-header {
  font-weight: bold;
  text-align: center;
  padding: 4px;
  background: #f3f3f3;
  border-bottom: 1px solid #ccc;
  position: sticky;
  top: 0;
  z-index: 1;
}
.cell {
  height: 32px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.8rem;
}
.cell.dispo {
  background-color: #d4edda;
}
.cell.indispo {
  background-color: #f8d7da;
}
.search-bar {
  padding: 8px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 3;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.modal-content {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
