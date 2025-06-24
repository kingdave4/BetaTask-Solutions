<template>
  <div class="dashboard-container">
    <!-- Personalized Greeting -->
    <div class="welcome-section">
      <h2>🌟 Welcome back, {{ userName }}!</h2>
      <p class="greeting-subtitle">Ready to tackle your goals today?</p>
    </div>

    <!-- Quick Add Section -->
    <div class="quick-add-section">
      <h3>✨ Quick Add Task</h3>
      <form @submit.prevent="quickAddTodo" class="quick-add-form">
        <input 
          v-model="quickTaskTitle" 
          type="text" 
          placeholder="What needs to be done?" 
          class="quick-add-input"
          :disabled="isAdding"
        />
        <button type="submit" class="quick-add-btn" :disabled="!quickTaskTitle.trim() || isAdding">
          {{ isAdding ? 'Adding...' : '+ Add Task' }}
        </button>
      </form>
    </div>

    <!-- Task Summary Cards -->
    <div class="dashboard-summary">
      <div class="summary-item overdue" 
           :class="{ highlight: overdueCount > 0, 'drag-over': dragOverZone === 'overdue' }"
           @drop="handleDrop($event, 'overdue')"
           @dragover="handleDragOver($event, 'overdue')"
           @dragleave="handleDragLeave">
        <div class="summary-icon">⚠️</div>
        <div class="summary-content">
          <h3>Overdue Tasks</h3>
          <p>{{ overdueCount }}</p>
        </div>
        <div class="drop-indicator" v-if="dragOverZone === 'overdue'">
          Drop to mark as overdue
        </div>
      </div>
      <div class="summary-item today" 
           :class="{ highlight: dueTodayCount > 0, 'drag-over': dragOverZone === 'today' }"
           @drop="handleDrop($event, 'today')"
           @dragover="handleDragOver($event, 'today')"
           @dragleave="handleDragLeave">
        <div class="summary-icon">📅</div>
        <div class="summary-content">
          <h3>Due Today</h3>
          <p>{{ dueTodayCount }}</p>
        </div>
        <div class="drop-indicator" v-if="dragOverZone === 'today'">
          Drop to set due today
        </div>
      </div>
      <div class="summary-item upcoming" 
           :class="{ 'drag-over': dragOverZone === 'upcoming' }"
           @drop="handleDrop($event, 'upcoming')"
           @dragover="handleDragOver($event, 'upcoming')"
           @dragleave="handleDragLeave">
        <div class="summary-icon">🚀</div>
        <div class="summary-content">
          <h3>Upcoming</h3>
          <p>{{ upcomingCount }}</p>
        </div>
        <div class="drop-indicator" v-if="dragOverZone === 'upcoming'">
          Drop to set due later
        </div>
      </div>
      <div class="summary-item completed" 
           :class="{ 'drag-over': dragOverZone === 'completed' }"
           @drop="handleDrop($event, 'completed')"
           @dragover="handleDragOver($event, 'completed')"
           @dragleave="handleDragLeave">
        <div class="summary-icon">✅</div>
        <div class="summary-content">
          <h3>Completed</h3>
          <p>{{ completedCount }}</p>
        </div>
        <div class="drop-indicator" v-if="dragOverZone === 'completed'">
          Drop to mark complete
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <!-- All Tasks (Draggable) -->
      <div class="upcoming-tasks">
        <h3>🎯 Your Tasks (Drag to Change Status)</h3>
        <div v-if="incompleteTodos.length > 0" class="tasks-list">
          <div v-for="task in incompleteTodos" 
               :key="task.id" 
               class="task-item"
               :class="{ 'being-dragged': draggedTodo && draggedTodo.id === task.id }"
               :data-task-id="task.id"
               draggable="true"
               @dragstart="handleDragStart($event, task)"
               @dragend="handleDragEnd">
            <div class="task-info">
              <span class="task-title">{{ task.title }}</span>
              <div class="task-meta">
                <span class="task-due">Due: {{ formatDate(task.dueDate) }}</span>
                <span v-if="task.subtasks && task.subtasks.length > 0" class="subtask-progress">
                  📋 {{ getCompletedSubtasksCount(task) }}/{{ task.subtasks.length }} subtasks
                </span>
              </div>
            </div>
            <div class="task-priority" :class="getPriorityClass(task.dueDate)">
              {{ getPriorityText(task.dueDate) }}
            </div>
            <div class="drag-handle">⋮⋮</div>
          </div>
        </div>
        <div v-else class="no-tasks">
          <p>🎉 No pending tasks! Add some above or you're all caught up.</p>
        </div>
        <div v-if="completedTodos.length > 0" class="completed-tasks-section">
          <h4>✅ Recently Completed</h4>
          <div class="tasks-list">
            <div v-for="task in completedTodos.slice(0, 3)" 
                 :key="task.id" 
                 class="task-item completed-task"
                 :data-task-id="task.id"
                 draggable="true"
                 @dragstart="handleDragStart($event, task)"
                 @dragend="handleDragEnd">
              <div class="task-info">
                <span class="task-title">{{ task.title }}</span>
                <span class="task-due">Completed</span>
              </div>
              <div class="task-status">✓</div>
              <div class="drag-handle">⋮⋮</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Motivational Section -->
      <div class="motivation-section">
        <h3>💪 Daily Motivation</h3>
        <div class="motivation-card">
          <p class="quote">"{{ dailyQuote }}"</p>
          <p class="productivity-tip">💡 <strong>Tip:</strong> {{ productivityTip }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
const { user } = useAuth();
const userName = computed(() => user.value?.firstName || 'User');

const todos = ref([]);
const loading = ref(true);
const error = ref(null);

const quickTaskTitle = ref('');
const isAdding = ref(false);

// Drag and drop state
const draggedTodo = ref(null);
const dragOverZone = ref(null);

// Daily quotes and tips
const quotes = [
  "The way to get started is to quit talking and begin doing. - Walt Disney",
  "Don't be afraid to give up the good to go for the great. - John D. Rockefeller",
  "Innovation distinguishes between a leader and a follower. - Steve Jobs",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "It is during our darkest moments that we must focus to see the light. - Aristotle",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "The only impossible journey is the one you never begin. - Tony Robbins"
];

const tips = [
  "Break large tasks into smaller, manageable chunks",
  "Use the Pomodoro Technique: 25 minutes of work, 5 minutes break",
  "Start your day with the most important task",
  "Set specific, measurable goals for each task",
  "Take regular breaks to maintain focus and productivity",
  "Review and prioritize your tasks at the end of each day",
  "Eliminate distractions by turning off notifications during work time"
];

const dailyQuote = computed(() => {
  const today = new Date().getDate();
  return quotes[today % quotes.length];
});

const productivityTip = computed(() => {
  const today = new Date().getDate();
  return tips[today % tips.length];
});

onMounted(() => {
  if (!user.value?.userId) {
    todos.value = [];
    loading.value = false;
    return;
  }

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
    error.value = "Failed to load tasks from Firestore.";
    loading.value = false;
  });
});

const overdueCount = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  return todos.value.filter(todo => 
    !todo.isCompleted && 
    todo.dueDate && 
    todo.dueDate < todayString
  ).length;
});

const dueTodayCount = computed(() => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  return todos.value.filter(todo => 
    !todo.isCompleted && 
    todo.dueDate && 
    todo.dueDate === todayString
  ).length;
});

const upcomingCount = computed(() => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  return todos.value.filter(todo => 
    !todo.isCompleted && 
    todo.dueDate && 
    todo.dueDate > todayString
  ).length;
});

const completedCount = computed(() => {
  return todos.value.filter(todo => todo.isCompleted).length;
});

const incompleteTodos = computed(() => {
  return todos.value
    .filter(todo => !todo.isCompleted)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
});

const completedTodos = computed(() => {
  return todos.value
    .filter(todo => todo.isCompleted)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Most recent first
});

const upcomingTasks = computed(() => {
  const now = new Date();
  return todos.value
    .filter(todo => !todo.isCompleted && todo.dueDate && new Date(todo.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);
});

const formatDate = (dateString) => {
  if (!dateString) return 'No Due Date';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const getCompletedSubtasksCount = (task) => {
  if (!task.subtasks) return 0;
  return task.subtasks.filter(subtask => subtask.isCompleted).length;
};

const getPriorityClass = (dueDate) => {
  if (!dueDate) return 'no-priority';
  
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  if (dueDate < todayString) return 'high-priority';
  if (dueDate === todayString) return 'due-today-priority';
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  if (dueDate === tomorrowString) return 'medium-priority';
  
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysString = threeDaysFromNow.toISOString().split('T')[0];
  
  if (dueDate <= threeDaysString) return 'medium-priority';
  return 'low-priority';
};

const getPriorityText = (dueDate) => {
  if (!dueDate) return 'No Priority';
  
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  if (dueDate < todayString) return 'Overdue';
  if (dueDate === todayString) return 'Today';
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  if (dueDate === tomorrowString) return 'Tomorrow';
  
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysString = threeDaysFromNow.toISOString().split('T')[0];
  
  if (dueDate <= threeDaysString) return 'Soon';
  return 'Later';
};


const quickAddTodo = async () => {
  if (!quickTaskTitle.value.trim() || isAdding.value) return;

  isAdding.value = true;

  try {
    const newTodoId = uuidv4();
    const newTodo = {
      id: newTodoId,
      title: quickTaskTitle.value.trim(),
      description: '',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      userId: user.value?.userId,
      subtasks: [],
      autoCompleteOnAllSubtasks: true,
    };

    const todoRef = doc(db, "todos", newTodoId);
    await setDoc(todoRef, newTodo);
    quickTaskTitle.value = '';
  } catch (err) {
    error.value = "Failed to add task.";
  } finally {
    isAdding.value = false;
  }
};

// Drag and Drop functions
const handleDragStart = (event, todo) => {
  draggedTodo.value = todo;
  event.dataTransfer.effectAllowed = 'move';
  
  event.target.style.opacity = '0.5';
};

const handleDragEnd = (event) => {
  event.target.style.opacity = '1';
  draggedTodo.value = null;
  dragOverZone.value = null;
};

const handleDragOver = (event, zone) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  dragOverZone.value = zone;
};

const handleDragLeave = () => {
  dragOverZone.value = null;
};

const handleDrop = async (event, targetZone) => {
  event.preventDefault();
  dragOverZone.value = null;
  
  if (!draggedTodo.value) return;
  
  const todo = draggedTodo.value;
  let updatePayload = {};
  
  switch (targetZone) {
    case 'completed':
      updatePayload = { isCompleted: true };
      break;
    case 'today':
      updatePayload = { 
        isCompleted: false,
        dueDate: new Date().toISOString().split('T')[0]
      };
      break;
    case 'upcoming':
      updatePayload = { 
        isCompleted: false,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
      };
      break;
    case 'overdue':
      updatePayload = { 
        isCompleted: false,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Yesterday
      };
      break;
  }
  
  const taskElement = document.querySelector(`[data-task-id="${todo.id}"]`);
  if (taskElement) {
    taskElement.style.opacity = '0.5';
  }
  
  try {
    const todoRef = doc(db, "todos", todo.id);
    await updateDoc(todoRef, updatePayload);
    draggedTodo.value = null;
  } catch (err) {
    error.value = "Failed to update task. Please try again.";
  } finally {
    const taskElement = document.querySelector(`[data-task-id="${todo.id}"]`);
    if (taskElement) {
      taskElement.style.opacity = '1';
    }
  }
};

const getCurrentTaskStatus = (todo) => {
  if (todo.isCompleted) return 'completed';
  
  if (!todo.dueDate) return 'upcoming';
  
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  if (todo.dueDate < todayString) return 'overdue';
  if (todo.dueDate === todayString) return 'today';
  return 'upcoming';
};



</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.welcome-section h2 {
  margin: 0 0 10px 0;
  font-size: 2.2em;
  font-weight: 600;
}

.greeting-subtitle {
  margin: 0;
  font-size: 1.1em;
  opacity: 0.9;
}

.quick-add-section {
  background-color: #2a2a2a;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  border: 2px solid #42b983;
}

.quick-add-section h3 {
  color: #42b983;
  margin: 0 0 15px 0;
  font-size: 1.3em;
  font-weight: 600;
}

.quick-add-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

.quick-add-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #444;
  border-radius: 8px;
  background-color: #333;
  color: #eee;
  font-size: 1em;
  transition: border-color 0.3s ease;
}

.quick-add-input:focus {
  outline: none;
  border-color: #42b983;
}

.quick-add-input::placeholder {
  color: #999;
}

.quick-add-btn {
  padding: 12px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.quick-add-btn:hover:not(:disabled) {
  background-color: #369870;
  transform: translateY(-1px);
}

.quick-add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Dashboard Summary Cards */
.dashboard-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-item {
  background-color: #2a2a2a;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.summary-item.highlight {
  border-color: #ff6b6b;
  background: linear-gradient(135deg, #2a2a2a 0%, #3a2a2a 100%);
}

.summary-item.overdue.highlight {
  border-color: #ff6b6b;
}

.summary-item.today.highlight {
  border-color: #feca57;
}

/* Drag and Drop Styles */
.summary-item.drag-over {
  border-color: #42b983 !important;
  background: linear-gradient(135deg, #42b983, #369870) !important;
  transform: scale(1.02);
  box-shadow: 0 12px 30px rgba(66, 185, 131, 0.3);
}

.drop-indicator {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #42b983;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7em;
  font-weight: 600;
  white-space: nowrap;
  z-index: 10;
}

.summary-icon {
  font-size: 2em;
  opacity: 0.8;
}

.summary-content h3 {
  color: #ccc;
  font-size: 0.9em;
  margin: 0 0 5px 0;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-content p {
  color: #eee;
  font-size: 2.2em;
  margin: 0;
  font-weight: bold;
}

/* Dashboard Content */
.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
}

@media (max-width: 768px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}

/* Upcoming Tasks */
.upcoming-tasks {
  background-color: #2a2a2a;
  padding: 25px;
  border-radius: 12px;
}

.upcoming-tasks h3 {
  color: #42b983;
  font-size: 1.3em;
  margin: 0 0 20px 0;
  font-weight: 600;
  border-bottom: 2px solid #444;
  padding-bottom: 12px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #333;
  border-radius: 8px;
  border-left: 4px solid #42b983;
  transition: all 0.3s ease;
}

.task-item:hover {
  background-color: #3a3a3a;
  transform: translateX(5px);
}

.task-item[draggable="true"] {
  cursor: grab;
  user-select: none;
  position: relative;
}

.task-item[draggable="true"]:active {
  cursor: grabbing;
}

.task-item.being-dragged {
  opacity: 0.5;
  transform: rotate(5deg);
  z-index: 1000;
}

.drag-handle {
  color: #666;
  font-size: 16px;
  font-weight: bold;
  cursor: grab;
  padding: 5px;
  border-radius: 4px;
  transition: color 0.3s ease;
}

.drag-handle:hover {
  color: #42b983;
}

.task-item:hover .drag-handle {
  color: #42b983;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.task-title {
  color: #eee;
  font-weight: 500;
  font-size: 1em;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-due {
  color: #999;
  font-size: 0.85em;
}

.subtask-progress {
  color: #42b983;
  font-size: 0.75em;
  font-weight: 500;
}

.task-priority {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-priority.high-priority {
  background-color: #ff6b6b;
  color: white;
}

.task-priority.due-today-priority {
  background-color: #ff9f43;
  color: white;
}

.task-priority.medium-priority {
  background-color: #feca57;
  color: #333;
}

.task-priority.low-priority {
  background-color: #48dbfb;
  color: #333;
}

.task-priority.no-priority {
  background-color: #666;
  color: #ccc;
}

.no-tasks {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.no-tasks p {
  margin: 0;
  font-size: 1.1em;
}

/* Motivation Section */
.motivation-section {
  background-color: #2a2a2a;
  padding: 25px;
  border-radius: 12px;
}

.motivation-section h3 {
  color: #42b983;
  font-size: 1.3em;
  margin: 0 0 20px 0;
  font-weight: 600;
  border-bottom: 2px solid #444;
  padding-bottom: 12px;
}

.motivation-card {
  background: linear-gradient(135deg, #333 0%, #3a3a3a 100%);
  padding: 20px;
  border-radius: 10px;
  border-left: 4px solid #42b983;
}

.quote {
  color: #eee;
  font-style: italic;
  font-size: 1em;
  line-height: 1.6;
  margin: 0 0 15px 0;
}

.productivity-tip {
  color: #ccc;
  margin: 0;
  font-size: 0.9em;
  line-height: 1.5;
}

.productivity-tip strong {
  color: #42b983;
}

/* Responsive Design */
@media (max-width: 600px) {
  .quick-add-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .dashboard-summary {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .summary-item {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .task-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

/* Completed Tasks Section */
.completed-tasks-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 2px solid #444;
}

.completed-tasks-section h4 {
  color: #42b983;
  font-size: 1.1em;
  margin: 0 0 15px 0;
  font-weight: 600;
}

.completed-task {
  opacity: 0.7;
  border-left-color: #42b983 !important;
}

.completed-task .task-title {
  text-decoration: line-through;
  color: #999;
}

.completed-task .task-due {
  color: #42b983;
  font-size: 0.8em;
}

.task-status {
  color: #42b983;
  font-size: 1.2em;
  font-weight: bold;
}

/* Summary item positioning for drop indicator */
.summary-item {
  position: relative;
}
</style>