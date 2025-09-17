<template>
  <div
    class="excel-cell"
    :data-day-date="day.date"
    :data-day-index="absDayIndex"
    :data-row-index="rowIndex"
    :data-cell-id="`${collabId}_${day.date}`"
    :data-today="day.isToday ? 'true' : 'false'"
    :data-initials="hoveringInitials"
    :class="normalizedClasses"
    :style="{ width: dayWidth + 'px', '--hovering-user-color': hoveringColor }"
    @click.stop="(e) => emit('cell-click', e)"
    @mousedown.stop="(e) => emit('cell-mousedown', e)"
    @mouseenter="(e) => emit('cell-mouseenter', e)"
    @mouseleave="() => emit('cell-mouseleave')"
    @mouseup="() => emit('cell-mouseup')"
  >
    <div v-if="locked" class="cell-lock-overlay">
      <va-icon name="lock" class="lock-icon" />
    </div>

    <div class="dispo-bars" :class="dispoBarsLayoutClass">
      <template v-for="dispo in getCellDisposSorted(collabId, day.date)" :key="(dispo as any).id || (dispo as any)._key">
}

.excel-cell.weekend {
  background: rgba(158, 158, 158, 0.05);
}

.excel-cell.has-dispos {
  background: rgba(76, 175, 80, 0.05);
}

.excel-cell.selected {
  background: rgba(33, 150, 243, 0.2);
  border: 2px solid #2196F3;
  z-index: 10;
}

.excel-cell.locked {
  background: rgba(244, 67, 54, 0.1);
  border-color: #f44336;
}

.excel-cell.has-presence {
  background: rgba(156, 39, 176, 0.1);
}

.excel-cell.loading-placeholder {
  background: #f5f5f5;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.excel-cell.week-boundary-right {
  border-right: 2px solid #666;
}

.cell-lock-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 20;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.cell-presence-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 15;
}

.presence-initials-container {
  display: flex;
  gap: 1px;
}

.presence-initial {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 600;
  color: white;
  border: 1px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.cell-content {
  flex: 1;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.empty-cell {
  flex: 1;
}

.dispo-bar {
  background: #4CAF50;
  color: white;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  min-height: 14px;
  display: flex;
  align-items: center;
  overflow: hidden;
  transition: all 0.2s ease;
}

.dispo-bar:hover {
  transform: scale(1.02);
  z-index: 10;
}

.dispo-disponible {
  background: #4CAF50;
}

.dispo-mission {
  background: #FF9800;
}

.dispo-indisponible {
  background: #f44336;
}

.continuation-start {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  position: relative;
}

.continuation-start::after {
  content: '→';
  position: absolute;
  right: -1px;
  font-size: 8px;
}

.continuation-end {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  position: relative;
}

.continuation-end::before {
  content: '←';
  position: absolute;
  left: -1px;
  font-size: 8px;
}

.dispo-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.dispo-time {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dispo-lieu {
  font-size: 8px;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Responsive pour mobile */
@media (max-width: 768px) {
  .excel-cell {
    min-width: 80px;
  }
  
  .dispo-bar {
    font-size: 9px;
    padding: 1px 2px;
    min-height: 12px;
  }
  
  .cell-lock-indicator,
  .presence-initial {
    width: 14px;
    height: 14px;
    font-size: 7px;
  }
}
</style>
