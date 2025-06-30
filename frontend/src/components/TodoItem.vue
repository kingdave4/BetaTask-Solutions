<template>
  <li class="todo-card" :class="{ completed: todo.isCompleted }">
    <div class="todo-details">
      <div class="todo-header">
        <span class="todo-title">
          <span v-if="todo.recurring && todo.recurring.interval" class="recurring-icon" title="Recurring Task">🔄</span>
          {{ todo.title }}
        </span>
        <span class="priority-badge" :class="getPriorityClass(todo.priority)">
          {{ getPriorityText(todo.priority) }}
        </span>
      </div>
      <p v-if="todo.description" class="todo-description">{{ todo.description }}</p>
      
      <!-- Category and Tags Section -->
      <div v-if="todo.category || (todo.tags && todo.tags.length > 0)" class="todo-tags-section">
        <div v-if="todo.category" class="todo-category">
          <span class="category-badge" :style="{ borderColor: getCategoryColor(todo.category) }">
            {{ getCategoryIcon(todo.category) }} {{ getCategoryName(todo.category) }}
          </span>
        </div>
        <div v-if="todo.tags && todo.tags.length > 0" class="todo-tags">
          <span v-for="tag in todo.tags" :key="tag.id || tag" class="tag-badge" :style="{ backgroundColor: getTagColor(tag) }">
            {{ getTagName(tag) }}
          </span>
        </div>
      </div>
      
      <!-- Subtasks Section -->
      <div v-if="todo.subtasks && todo.subtasks.length > 0" class="subtasks-section">
        <div class="subtasks-header">
          <span class="subtasks-title">📋 Subtasks</span>
          <span class="subtasks-progress">{{ completedSubtasksCount }}/{{ todo.subtasks.length }} completed</span>
        </div>
        <div class="subtasks-list">
          <div 
            v-for="(subtask, index) in todo.subtasks" 
            :key="subtask.id" 
            class="subtask-item"
            :class="{ 'completed': subtask.isCompleted }"
          >
            <label class="subtask-checkbox-label">
              <input
                type="checkbox"
                :checked="subtask.isCompleted"
                @change="toggleSubtask(index)"
                class="subtask-checkbox"
                :disabled="todo.isCompleted"
              />
              <span class="subtask-text">{{ subtask.title }}</span>
            </label>
          </div>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
      </div>

      <div class="todo-meta-info">
        <span v-if="todo.dueDate">Due: {{ formatDate(todo.dueDate) }}</span>
        <span v-if="todo.recurring && todo.recurring.interval" class="recurring-indicator">
          🔄 Repeats {{ formatRecurrence(todo.recurring) }}
        </span>
        <span v-if="todo.recurringParentId && !todo.isRecurringParent" class="recurring-instance">
          📅 Instance {{ todo.recurringOccurrence || 1 }} of recurring task
        </span>
        <span>Added: {{ formatDate(todo.createdAt) }}, {{ formatTime(todo.createdAt) }}</span>
      </div>
    </div>
    <div class="todo-actions">
      <button @click="handleToggleComplete" class="complete-btn">
        {{ todo.isCompleted ? "Mark Incomplete" : "Mark Complete" }}
      </button>
      <button @click="handleReminders" class="reminders-btn" :disabled="todo.isCompleted">
        ⏰ Reminders
      </button>
      <button @click="handleDelete" class="delete-btn">Delete</button>
      <button @click="handleEdit" class="edit-btn" :disabled="todo.isCompleted">Edit</button>
    </div>
  </li>
</template>

<script setup>
import { computed } from "vue";
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

const props = defineProps({
  todo: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["edit-todo", "manage-reminders"]);

const completedSubtasksCount = computed(() => {
  if (!props.todo.subtasks) return 0;
  return props.todo.subtasks.filter(subtask => subtask.isCompleted).length;
});

const progressPercentage = computed(() => {
  if (!props.todo.subtasks || props.todo.subtasks.length === 0) return 0;
  return Math.round((completedSubtasksCount.value / props.todo.subtasks.length) * 100);
});

const allSubtasksCompleted = computed(() => {
  if (!props.todo.subtasks || props.todo.subtasks.length === 0) return false;
  return completedSubtasksCount.value === props.todo.subtasks.length;
});

function formatDate(dateString) {
  if (!dateString) return "";
  const options = { year: "numeric", month: "short", day: "numeric" };
  const date = new Date(dateString.includes("T") ? dateString : dateString + "T00:00:00");
  return date.toLocaleDateString(undefined, options);
}

function formatTime(dateString) {
  if (!dateString) return "";
  const options = { hour: "numeric", minute: "2-digit", hour12: true };
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, options);
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

// Categories and Tags helper functions
const predefinedCategories = {
  'work': { name: 'Work', icon: '💼', color: '#1e90ff' },
  'personal': { name: 'Personal', icon: '👤', color: '#ff6b6b' },
  'home': { name: 'Home', icon: '🏠', color: '#4ecdc4' },
  'shopping': { name: 'Shopping', icon: '🛒', color: '#45b7d1' },
  'health': { name: 'Health', icon: '🏥', color: '#96ceb4' },
  'finance': { name: 'Finance', icon: '💰', color: '#feca57' },
  'education': { name: 'Education', icon: '📚', color: '#ff9ff3' },
  'travel': { name: 'Travel', icon: '✈️', color: '#54a0ff' }
};

function getCategoryIcon(categoryId) {
  return predefinedCategories[categoryId]?.icon || '📁';
}

function getCategoryName(categoryId) {
  return predefinedCategories[categoryId]?.name || categoryId;
}

function getCategoryColor(categoryId) {
  return predefinedCategories[categoryId]?.color || '#42b983';
}

function getTagName(tag) {
  if (typeof tag === 'string') return tag;
  return tag?.name || 'Unknown Tag';
}

function getTagColor(tag) {
  if (typeof tag === 'string') return '#42b983';
  return tag?.color || '#42b983';
}

const toggleSubtask = async (index) => {
  try {
    const updatedSubtasks = [...props.todo.subtasks];
    updatedSubtasks[index].isCompleted = !updatedSubtasks[index].isCompleted;
    
    const todoRef = doc(db, "todos", props.todo.id);
    const updateData = { subtasks: updatedSubtasks };
    
    // Check if auto-completion is enabled and all subtasks are now completed
    const allCompleted = updatedSubtasks.every(subtask => subtask.isCompleted);
    if (props.todo.autoCompleteOnAllSubtasks && allCompleted && !props.todo.isCompleted) {
      updateData.isCompleted = true;
    }
    
    await updateDoc(todoRef, updateData);
  } catch (e) {
    console.error("Error toggling subtask: ", e);
  }
};

const handleToggleComplete = async () => {
  try {
    const todoRef = doc(db, "todos", props.todo.id);
    const updateData = {
      isCompleted: !props.todo.isCompleted,
    };
    
    // If marking as incomplete, also mark all subtasks as incomplete
    if (props.todo.isCompleted && props.todo.subtasks) {
      const updatedSubtasks = props.todo.subtasks.map(subtask => ({
        ...subtask,
        isCompleted: false
      }));
      updateData.subtasks = updatedSubtasks;
    }
    
    await updateDoc(todoRef, updateData);
  } catch (e) {
    console.error("Error toggling todo completion: ", e);
  }
};

const handleDelete = async () => {
  try {
    await deleteDoc(doc(db, "todos", props.todo.id));
  } catch (e) {
    console.error("Error deleting todo: ", e);
  }
};

const handleEdit = () => {
  emit("edit-todo", props.todo.id);
};

const handleReminders = () => {
  emit("manage-reminders", props.todo);
};

const formatRecurrence = (recurring) => {
  if (!recurring || !recurring.interval) {
    return 'Never';
  }

  const daysOfWeekOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsOfYearOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let recurrenceString = '';
  const { interval, customInterval, endCondition, endCount, endDate } = recurring;

  switch (interval) {
    case 'daily':
      recurrenceString = 'daily';
      break;
    case 'weekly':
      recurrenceString = 'weekly';
      break;
    case 'monthly':
      recurrenceString = 'monthly';
      break;
    case 'yearly':
      recurrenceString = 'yearly';
      break;
    case 'custom':
      if (customInterval) {
        recurrenceString = `every ${customInterval.value} ${customInterval.unit}(s)`;
        if (customInterval.unit === 'week' && customInterval.daysOfWeek && customInterval.daysOfWeek.length > 0) {
          const sortedDays = customInterval.daysOfWeek.map(dayIndex => daysOfWeekOptions[dayIndex]).sort();
          recurrenceString += ` on ${sortedDays.join(', ')}`;
        } else if (customInterval.unit === 'month' && customInterval.dayOfMonth !== undefined && customInterval.dayOfMonth !== null) {
          recurrenceString += ` on day ${customInterval.dayOfMonth}`;
        } else if (customInterval.unit === 'year' && customInterval.monthOfYear !== undefined && customInterval.monthOfYear !== null && customInterval.dayOfMonth !== undefined && customInterval.dayOfMonth !== null) {
          recurrenceString += ` on ${monthsOfYearOptions[customInterval.monthOfYear - 1]} ${customInterval.dayOfMonth}`;
        }
      } else {
        recurrenceString = 'custom (invalid)';
      }
      break;
    default:
      recurrenceString = 'unknown';
  }

  if (endCondition === 'count' && endCount !== undefined && endCount !== null) {
    recurrenceString += `, ends after ${endCount} occurrences`;
  } else if (endCondition === 'untilDate' && endDate) {
    recurrenceString += `, ends on ${formatDate(endDate)}`;
  }

  return recurrenceString;
};
</script>


<style scoped>
.todo-card {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 20px 25px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 15px;
  transition: background-color 0.3s ease;
}

.todo-details {
  flex-grow: 1;
  margin-right: 15px;
}

.todo-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.todo-title {
  font-weight: 600;
  font-size: 1.3em;
  color: #f0f0f0;
  word-break: break-word;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recurring-icon {
  color: #42b983;
  font-size: 0.8em;
  opacity: 0.8;
}

.priority-badge {
  font-size: 0.7em;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.priority-high {
  background-color: #ff6b6b;
  color: white;
}

.priority-medium {
  background-color: #ffd93d;
  color: #333;
}

.priority-low {
  background-color: #6bcf7f;
  color: white;
}

.todo-description {
  font-size: 1em;
  color: #bbb;
  margin-bottom: 10px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Subtasks Styles */
.subtasks-section {
  margin: 15px 0;
  padding: 15px;
  background-color: #333;
  border-radius: 6px;
  border-left: 4px solid #42b983;
}

.subtasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.subtasks-title {
  font-weight: 600;
  color: #42b983;
  font-size: 0.95em;
}

.subtasks-progress {
  font-size: 0.8em;
  color: #999;
  background-color: #444;
  padding: 2px 8px;
  border-radius: 10px;
}

.subtasks-list {
  margin-bottom: 12px;
}

.subtask-item {
  margin-bottom: 8px;
  transition: opacity 0.3s ease;
}

.subtask-item.completed {
  opacity: 0.7;
}

.subtask-checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.9em;
}

.subtask-checkbox {
  accent-color: #42b983;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.subtask-text {
  color: #ddd;
  user-select: none;
  line-height: 1.4;
}

.subtask-item.completed .subtask-text {
  text-decoration: line-through;
  color: #888;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background-color: #444;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #42b983, #6bcf7f);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.todo-meta-info {
  font-size: 0.85em;
  color: #888;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recurring-indicator {
  color: #42b983 !important;
  font-weight: 500;
  background-color: rgba(66, 185, 131, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  align-self: flex-start;
}

.recurring-instance {
  color: #ffd93d !important;
  font-weight: 500;
  background-color: rgba(255, 217, 61, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  align-self: flex-start;
}

.todo-tags-section {
  margin: 12px 0;
}

.todo-category {
  margin-bottom: 8px;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1.5px solid;
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.05);
  color: #e0e0e0;
  font-size: 0.85em;
  font-weight: 500;
  text-transform: capitalize;
}

.todo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  color: white;
  font-size: 0.75em;
  font-weight: 500;
  text-transform: capitalize;
  opacity: 0.9;
}

.todo-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  align-self: center;
}
.todo-actions button {
  padding: 8px 15px;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  white-space: nowrap;
}
.complete-btn {
  background-color: transparent;
  color: #ccc;
}
.complete-btn:hover {
  background-color: #3a3a3a;
  border-color: #666;
}
.delete-btn {
  background-color: #d9534f;
  color: white;
  border: 1px solid #d43f3a;
}
.delete-btn:hover {
  background-color: #c9302c;
  border-color: #ac2925;
}
.edit-btn {
  background-color: #28a745;
  color: white;
  border: 1px solid #218838;
}
.edit-btn:hover {
  background-color: #218838;
  border-color: #1e7e34;
}
.edit-btn:disabled {
  opacity: 0.1;
  cursor: not-allowed;
}
.reminders-btn {
  background-color: #ffd93d;
  color: #333;
  border: 1px solid #ffcd00;
}
.reminders-btn:hover:not(:disabled) {
  background-color: #ffcd00;
  border-color: #e6b800;
}
.reminders-btn:disabled {
  opacity: 0.1;
  cursor: not-allowed;
}
.todo-card.completed {
  background-color: #222;
  border-left: 5px solid #42b983;
  padding-left: 20px;
}
.todo-card.completed .todo-title,
.todo-card.completed .todo-description {
  text-decoration: line-through;
  color: #777;
}
.todo-card.completed .todo-meta-info {
  color: #666;
}
.todo-card.completed .priority-badge {
  opacity: 0.7;
}

/* Completed task subtasks styling */
.todo-card.completed .subtasks-section {
  opacity: 0.6;
}

.todo-card.completed .subtask-checkbox {
  pointer-events: none;
}

@media (max-width: 768px) {
  .todo-card {
    flex-direction: column;
    align-items: stretch;
  }
  
  .todo-details {
    margin-right: 0;
    margin-bottom: 15px;
  }
  
  .todo-actions {
    align-self: stretch;
    justify-content: center;
  }
  
  .subtasks-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>
