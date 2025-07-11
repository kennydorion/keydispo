<script setup>
import { ref, computed } from 'vue'

const today = new Date()
const month = ref(today.getMonth())
const year = ref(today.getFullYear())

const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const daysInMonth = computed(() => new Date(year.value, month.value + 1, 0).getDate())
const firstDay = computed(() => new Date(year.value, month.value, 1).getDay())

function prevMonth() {
  if (month.value === 0) {
    month.value = 11
    year.value--
  } else {
    month.value--
  }
}
function nextMonth() {
  if (month.value === 11) {
    month.value = 0
    year.value++
  } else {
    month.value++
  }
}

const weeks = computed(() => {
  const days = []
  for (let i = 0; i < (firstDay.value || 7) - 1; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth.value; d++) {
    days.push(d)
  }
  const w = []
  for (let i = 0; i < days.length; i += 7) {
    w.push(days.slice(i, i + 7))
  }
  return w
})
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <button @click="prevMonth">&#60;</button>
      <span>{{ monthNames[month] }} {{ year }}</span>
      <button @click="nextMonth">&#62;</button>
    </div>
    <div class="weekdays">
      <div v-for="d in ['Lu','Ma','Me','Je','Ve','Sa','Di']" :key="d" class="weekday">{{ d }}</div>
    </div>
    <div class="weeks">
      <div class="week" v-for="(week, i) in weeks" :key="i">
        <div class="day" v-for="(day, j) in week" :key="j">{{ day || '' }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  max-width: 400px;
  margin: 0 auto;
}
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.weekdays, .week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.weekday, .day {
  text-align: center;
  padding: 4px 0;
  border: 1px solid #ddd;
}
.day {
  min-height: 40px;
}
</style>
