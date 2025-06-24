<template>
  <div class="calendar-container">
    <!-- Calendar Header -->
    <div class="calendar-header">
      <div class="calendar-title">
        <h2>📅 Calendar View</h2>
        <p class="calendar-subtitle">Manage your tasks visually</p>
      </div>
      
      <!-- View Toggle -->
      <div class="view-controls">
        <button 
          v-for="view in ['month', 'week', 'day']" 
          :key="view"
          @click="currentView = view"
          :class="{ active: currentView === view }"
          class="view-btn"
        >
          {{ view.charAt(0).toUpperCase() + view.slice(1) }}
        </button>
      </div>
    </div>

    <!-- Navigation Controls -->
    <div class="calendar-nav">
      <button @click="navigateCalendar(-1)" class="nav-btn">
        ← Previous
      </button>
      <h3 class="current-period">{{ currentPeriodLabel }}</h3>
      <button @click="navigateCalendar(1)" class="nav-btn">
        Next →
      </button>
      <button @click="goToToday" class="today-btn">Today</button>
    </div>

    <!-- Calendar Content -->
    <div class="calendar-content">
      <!-- Month View -->
      <div v-if="currentView === 'month'" class="month-view">
        <div class="month-header">
          <div v-for="day in weekDays" :key="day" class="month-header-day">
            {{ day }}
          </div>
        </div>
        <div class="month-grid">
          <div 
            v-for="date in monthDates" 
            :key="date.dateKey"
            class="month-cell"
            :class="{ 
              'other-month': !date.isCurrentMonth,
              'today': date.isToday,
              'has-tasks': date.tasks.length > 0,
              'drag-over': dragOverDate === date.dateKey
            }"
            @drop="handleDrop($event, date.dateKey)"
            @dragover="handleDragOver($event, date.dateKey)"
            @dragleave="handleDragLeave"
          >
            <div class="month-cell-header">
              <span class="date-number">{{ date.day }}</span>
            </div>
            <div class="month-cell-tasks">
              <div 
                v-for="task in date.tasks.slice(0, 3)" 
                :key="task.id"
                class="month-task"
                :class="getPriorityClass(task.priority)"
                :draggable="true"
                @dragstart="handleDragStart($event, task)"
                @dragend="handleDragEnd"
                @click="openTaskDetail(task)"
              >
                <span class="task-dot"></span>
                <span class="task-text">{{ truncateText(task.title, 15) }}</span>
              </div>
              <div v-if="date.tasks.length > 3" class="more-tasks">
                +{{ date.tasks.length - 3 }} more
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Week View -->
      <div v-if="currentView === 'week'" class="week-view">
        <div class="week-header">
          <div class="time-column"></div>
          <div v-for="date in weekDates" :key="date.dateKey" class="week-header-day">
            <div class="week-day-name">{{ date.dayName }}</div>
            <div class="week-day-number" :class="{ today: date.isToday }">
              {{ date.day }}
            </div>
          </div>
        </div>
        <div class="week-grid">
          <div class="time-slots">
            <div v-for="hour in 24" :key="hour" class="time-slot">
              {{ formatHour(hour - 1) }}
            </div>
          </div>
          <div 
            v-for="date in weekDates" 
            :key="date.dateKey"
            class="week-column"
            :class="{ 'drag-over': dragOverDate === date.dateKey }"
            @drop="handleDrop($event, date.dateKey)"
            @dragover="handleDragOver($event, date.dateKey)"
            @dragleave="handleDragLeave"
          >
            <div v-for="hour in 24" :key="hour" class="week-time-slot">
              <div 
                v-for="task in getTasksForDateTime(date, hour - 1)" 
                :key="task.id"
                class="week-task"
                :class="getPriorityClass(task.priority)"
                :draggable="true"
                @dragstart="handleDragStart($event, task)"
                @dragend="handleDragEnd"
                @click="openTaskDetail(task)"
              >
                {{ task.title }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Day View -->
      <div v-if="currentView === 'day'" class="day-view">
        <div class="day-header">
          <h3>{{ selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</h3>
        </div>
        <div class="day-content">
          <div class="day-tasks-container">
            <div class="time-column">
              <div v-for="hour in 24" :key="hour" class="time-label">
                {{ formatHour(hour - 1) }}
              </div>
            </div>
            <div 
              class="day-tasks"
              :class="{ 'drag-over': dragOverDate === selectedDate.toISOString().split('T')[0] }"
              @drop="handleDrop($event, selectedDate.toISOString().split('T')[0])"
              @dragover="handleDragOver($event, selectedDate.toISOString().split('T')[0])"
              @dragleave="handleDragLeave"
            >
              <div v-for="hour in 24" :key="hour" class="day-time-slot">
                <div 
                  v-for="task in getTasksForDateTime({ dateKey: selectedDate.toISOString().split('T')[0] }, hour - 1)" 
                  :key="task.id"
                  class="day-task"
                  :class="getPriorityClass(task.priority)"
                  :draggable="true"
                  @dragstart="handleDragStart($event, task)"
                  @dragend="handleDragEnd"
                  @click="openTaskDetail(task)"
                >
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-time">{{ formatTaskTime(task) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Detail Modal -->
    <div v-if="selectedTask" class="task-detail-overlay" @click="closeTaskDetail">
      <div class="task-detail-modal" @click.stop>
        <div class="task-detail-header">
          <h3>{{ selectedTask.title }}</h3>
          <button @click="closeTaskDetail" class="close-btn">&times;</button>
        </div>
        <div class="task-detail-content">
          <p><strong>Due Date:</strong> {{ formatDate(selectedTask.dueDate) }}</p>
          <p><strong>Priority:</strong> {{ getPriorityText(selectedTask.priority) }}</p>
          <p><strong>Status:</strong> {{ selectedTask.isCompleted ? 'Completed' : 'Pending' }}</p>
          <p v-if="selectedTask.description"><strong>Description:</strong> {{ selectedTask.description }}</p>
        </div>
        <div class="task-detail-actions">
          <button @click="toggleTaskComplete(selectedTask)" class="action-btn complete-btn">
            {{ selectedTask.isCompleted ? 'Mark Incomplete' : 'Mark Complete' }}
          </button>
          <button @click="editTask(selectedTask)" class="action-btn edit-btn">Edit</button>
        </div>
      </div>
    </div>

    <!-- Drop Indicator -->
    <div v-if="dragOverDate" class="drop-indicator">
      Drop to reschedule task
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

const { user } = useAuth();

const todos = ref([]);
const loading = ref(true); // Set to true initially as we'll fetch from Firestore
const error = ref(null);

const currentView = ref('month');
const selectedDate = ref(new Date());
const draggedTask = ref(null);
const dragOverDate = ref(null);
const selectedTask = ref(null);

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const currentPeriodLabel = computed(() => {
  const date = selectedDate.value;
  switch (currentView.value) {
    case 'month':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    case 'week':
      const weekStart = getWeekStart(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    case 'day':
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    default:
      return '';
  }
});

const monthDates = computed(() => {
  const year = selectedDate.value.getFullYear();
  const month = selectedDate.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const dateKey = date.toISOString().split('T')[0];
    const isCurrentMonth = date.getMonth() === month;
    const isToday = date.toDateString() === today.toDateString();
    
    dates.push({
      date,
      dateKey,
      day: date.getDate(),
      isCurrentMonth,
      isToday,
      tasks: getTasksForDate(dateKey)
    });
  }
  
  return dates;
});

const weekDates = computed(() => {
  const weekStart = getWeekStart(selectedDate.value);
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    
    const dateKey = date.toISOString().split('T')[0];
    const isToday = date.toDateString() === today.toDateString();
    
    dates.push({
      date,
      dateKey,
      day: date.getDate(),
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      isToday,
      tasks: getTasksForDate(dateKey)
    });
  }
  
  return dates;
});

// Methods
// Fetch todos for the logged-in user using real-time listener
async function fetchTodos() {
  if (!user.value?.userId) {
    todos.value = [];
    loading.value = false;
    return;
  }
  
  loading.value = true;
  error.value = null;
  
  try {
    const todosCollectionRef = collection(db, "todos");
    const q = query(todosCollectionRef, where("userId", "==", user.value.userId));

    onSnapshot(q, (snapshot) => {
      const fetchedTodos = [];
      snapshot.forEach((doc) => {
        fetchedTodos.push({ id: doc.id, ...doc.data() });
      });
      todos.value = fetchedTodos;
      loading.value = false;
    }, (err) => {
      error.value = "Failed to load todos from Firestore.";
      loading.value = false;
    });
  } catch (err) {
    error.value = "Failed to load todos.";
    loading.value = false;
  }
}

function getTasksForDate(dateKey) {
  return todos.value.filter(todo => {
    if (!todo.dueDate) return false;
    const taskDate = new Date(todo.dueDate).toISOString().split('T')[0];
    return taskDate === dateKey;
  });
}

function getTasksForDateTime(dateObj, hour) {
  return getTasksForDate(dateObj.dateKey).filter(task => {
    return (task.id % 24) === hour;
  });
}

function getWeekStart(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return start;
}

function navigateCalendar(direction) {
  const newDate = new Date(selectedDate.value);
  
  switch (currentView.value) {
    case 'month':
      newDate.setMonth(newDate.getMonth() + direction);
      break;
    case 'week':
      newDate.setDate(newDate.getDate() + (direction * 7));
      break;
    case 'day':
      newDate.setDate(newDate.getDate() + direction);
      break;
  }
  
  selectedDate.value = newDate;
}

function goToToday() {
  selectedDate.value = new Date();
}

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'No due date';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatTaskTime(task) {
  if (!task.dueDate) return '';
  const date = new Date(task.dueDate);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

function truncateText(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function getPriorityClass(priority) {
  if (priority === 'high') return 'priority-high';
  if (priority === 'medium') return 'priority-medium';
  return 'priority-low';
}

function getPriorityText(priority) {
  if (priority === 'high') return 'High Priority';
  if (priority === 'medium') return 'Medium Priority';
  return 'Low Priority';
}

// Drag and Drop
function handleDragStart(event, task) {
  draggedTask.value = task;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', task.id.toString());
}

function handleDragEnd() {
  draggedTask.value = null;
  dragOverDate.value = null;
}

function handleDragOver(event, dateKey) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  dragOverDate.value = dateKey;
}

function handleDragLeave() {
  setTimeout(() => {
    if (!dragOverDate.value) return;
    dragOverDate.value = null;
  }, 50);
}

async function handleDrop(event, dateKey) {
  event.preventDefault();
  dragOverDate.value = null;
  
  if (!draggedTask.value) return;
  
  const newDueDate = dateKey;
  await updateTaskDueDate(draggedTask.value.id, newDueDate);
  draggedTask.value = null;
}

async function updateTaskDueDate(taskId, newDueDate) {
  try {
    const todoRef = doc(db, "todos", taskId);
    await updateDoc(todoRef, {
      dueDate: newDueDate
    });
  } catch (err) {
    error.value = "Failed to update task date.";
  }
}

// Task actions
function openTaskDetail(task) {
  selectedTask.value = task;
}

function closeTaskDetail() {
  selectedTask.value = null;
}

async function toggleTaskComplete(task) {
  try {
    const todoRef = doc(db, "todos", task.id);
    await updateDoc(todoRef, {
      isCompleted: !task.isCompleted
    });
    closeTaskDetail();
  } catch (err) {
    error.value = "Failed to update task status.";
  }
}

function editTask(task) {
  closeTaskDetail();
}

onMounted(() => {
  fetchTodos();
});

watch(user, () => {
  fetchTodos();
});
</script>

<style scoped>
.calendar-container {
  padding: 20px;
  background-color: #1a1a1a;
  color: #e0e0e0;
  min-height: 100vh;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.calendar-title h2 {
  margin: 0;
  color: #42b983;
}

.calendar-subtitle {
  margin: 5px 0 0 0;
  color: #ccc;
  font-size: 0.9em;
}

.view-controls {
  display: flex;
  gap: 5px;
}

.view-btn {
  padding: 8px 16px;
  border: 1px solid #42b983;
  background-color: transparent;
  color: #42b983;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-btn:hover,
.view-btn.active {
  background-color: #42b983;
  color: white;
}

.calendar-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.nav-btn,
.today-btn {
  padding: 8px 16px;
  border: 1px solid #555;
  background-color: #2a2a2a;
  color: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-btn:hover,
.today-btn:hover {
  background-color: #42b983;
  border-color: #42b983;
}

.current-period {
  margin: 0;
  font-size: 1.5em;
  color: #42b983;
  min-width: 250px;
  text-align: center;
}

/* Month View */
.month-view {
  background-color: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background-color: #333;
}

.month-header-day {
  padding: 15px;
  text-align: center;
  color: #42b983;
  font-weight: bold;
  border-right: 1px solid #555;
}

.month-header-day:last-child {
  border-right: none;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, minmax(120px, auto));
}

.month-cell {
  border: 1px solid #555;
  padding: 8px;
  background-color: #2a2a2a;
  transition: background-color 0.3s ease;
  cursor: pointer;
}

.month-cell:hover {
  background-color: #333;
}

.month-cell.other-month {
  background-color: #1a1a1a;
  color: #666;
}

.month-cell.today {
  background-color: #42b983;
  color: white;
}

.month-cell.drag-over {
  background-color: #42b983;
  opacity: 0.7;
}

.month-cell-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.date-number {
  font-weight: bold;
  font-size: 1.1em;
}

.month-cell-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.month-task {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.month-task:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.task-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.task-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-tasks {
  font-size: 0.7em;
  color: #888;
  padding: 2px 6px;
  text-align: center;
}

/* Week View */
.week-view {
  background-color: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.week-header {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  background-color: #333;
  border-bottom: 1px solid #555;
}

.time-column {
  background-color: #333;
}

.week-header-day {
  padding: 15px;
  text-align: center;
  border-right: 1px solid #555;
}

.week-day-name {
  color: #42b983;
  font-weight: bold;
  margin-bottom: 5px;
}

.week-day-number {
  font-size: 1.2em;
  padding: 5px;
  border-radius: 50%;
}

.week-day-number.today {
  background-color: #42b983;
  color: white;
}

.week-grid {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  max-height: 600px;
  overflow-y: auto;
}

.time-slots {
  background-color: #333;
}

.time-slot {
  height: 60px;
  padding: 5px;
  border-bottom: 1px solid #555;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  color: #888;
}

.week-column {
  border-right: 1px solid #555;
}

.week-column.drag-over {
  background-color: rgba(66, 185, 131, 0.2);
}

.week-time-slot {
  height: 60px;
  padding: 2px;
  border-bottom: 1px solid #555;
  position: relative;
}

.week-task {
  background-color: #42b983;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  cursor: pointer;
  margin-bottom: 2px;
  transition: all 0.3s ease;
}

.week-task:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

/* Day View */
.day-view {
  background-color: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.day-header {
  background-color: #333;
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #555;
}

.day-header h3 {
  margin: 0;
  color: #42b983;
}

.day-content {
  padding: 20px;
}

.day-tasks-container {
  display: grid;
  grid-template-columns: 80px 1fr;
  max-height: 600px;
  overflow-y: auto;
}

.time-label {
  height: 60px;
  padding: 5px;
  border-bottom: 1px solid #555;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;
  color: #888;
  background-color: #333;
}

.day-tasks {
  border-left: 1px solid #555;
}

.day-tasks.drag-over {
  background-color: rgba(66, 185, 131, 0.2);
}

.day-time-slot {
  height: 60px;
  padding: 5px;
  border-bottom: 1px solid #555;
  position: relative;
}

.day-task {
  background-color: #42b983;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.3s ease;
}

.day-task:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.task-title {
  font-weight: bold;
  margin-bottom: 2px;
}

.task-time {
  font-size: 0.8em;
  opacity: 0.8;
}

/* Priority Colors */
.priority-high {
  background-color: #ff6b6b !important;
}

.priority-medium {
  background-color: #ffd93d !important;
  color: #333 !important;
}

.priority-low {
  background-color: #6bcf7f !important;
}

/* Task Detail Modal */
.task-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.task-detail-modal {
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.task-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #555;
  padding-bottom: 10px;
}

.task-detail-header h3 {
  margin: 0;
  color: #42b983;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #e0e0e0;
}

.task-detail-content {
  margin-bottom: 20px;
}

.task-detail-content p {
  margin: 10px 0;
  color: #e0e0e0;
}

.task-detail-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid #42b983;
  background-color: transparent;
  color: #42b983;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background-color: #42b983;
  color: white;
}

.complete-btn {
  border-color: #6bcf7f;
  color: #6bcf7f;
}

.complete-btn:hover {
  background-color: #6bcf7f;
  color: white;
}

/* Drop Indicator */
.drop-indicator {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(66, 185, 131, 0.9);
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  pointer-events: none;
  z-index: 1000;
}

/* Responsive */
@media (max-width: 768px) {
  .calendar-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .calendar-nav {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .current-period {
    min-width: auto;
    font-size: 1.2em;
  }
  
  .month-grid {
    grid-template-rows: repeat(6, minmax(80px, auto));
  }
  
  .month-cell {
    padding: 4px;
  }
  
  .week-grid,
  .day-tasks-container {
    max-height: 400px;
  }
}
</style>