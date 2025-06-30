<template>
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <h2>{{ todo ? 'Edit Task' : 'Add New Task' }}</h2>
      <form @submit.prevent="handleSubmit" class="add-form modal-form">
        <div class="form-group">
          <label for="modal-todo-title">Task Title*</label>
          <input
            type="text"
            id="modal-todo-title"
            v-model="newTodoTitle"
            placeholder="e.g., Read chapter 5..."
            class="form-input"
            aria-describedby="modal-title-error"
            required
          />
          <p v-if="titleError" id="modal-title-error" class="input-error">{{ titleError }}</p>
        </div>

        <div class="form-group">
          <label for="modal-todo-description">Description</label>
          <textarea
            id="modal-todo-description"
            v-model="newTodoDescription"
            placeholder="More details..."
            class="form-input description-input"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="modal-todo-due-date">Due Date</label>
          <input
            type="date"
            id="modal-todo-due-date"
            v-model="newTodoDueDate"
            class="form-input date-input"
          />
        </div>

        <div class="form-group">
          <label for="modal-todo-priority">Priority</label>
          <select
            id="modal-todo-priority"
            v-model="newTodoPriority"
            class="form-input priority-select"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        <!-- Recurring Task Section -->
        <div class="recurring-section">
          <h4>Recurring Task</h4>
          <div class="form-group">
            <label for="recurrence-interval">Repeat</label>
            <select id="recurrence-interval" v-model="recurringData.interval" class="form-input">
              <option :value="null">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div v-if="recurringData.interval === 'custom'" class="custom-recurrence-options">
            <div class="form-row">
              <div class="form-group">
                <label for="custom-interval-value">Repeat every</label>
                <input
                  type="number"
                  id="custom-interval-value"
                  v-model.number="recurringData.customInterval.value"
                  class="form-input"
                  min="1"
                  required
                />
              </div>
              <div class="form-group">
                <label for="custom-interval-unit">Unit</label>
                <select id="custom-interval-unit" v-model="recurringData.customInterval.unit" class="form-input" required>
                  <option value="day">Day(s)</option>
                  <option value="week">Week(s)</option>
                  <option value="month">Month(s)</option>
                  <option value="year">Year(s)</option>
                </select>
              </div>
            </div>

            <div v-if="recurringData.customInterval.unit === 'week'" class="form-group">
              <label>Repeat on</label>
              <div class="days-of-week">
                <label v-for="(day, index) in daysOfWeekOptions" :key="index">
                  <input type="checkbox" :value="index" v-model="recurringData.customInterval.daysOfWeek">
                  {{ day }}
                </label>
              </div>
            </div>

            <div v-if="recurringData.customInterval.unit === 'month'" class="form-group">
              <label for="custom-month-day">Repeat on day of the month</label>
              <input
                type="number"
                id="custom-month-day"
                v-model.number="recurringData.customInterval.dayOfMonth"
                class="form-input"
                min="1"
                max="31"
              />
            </div>

            <div v-if="recurringData.customInterval.unit === 'year'" class="form-row">
              <div class="form-group">
                <label for="custom-year-month">Month</label>
                <select id="custom-year-month" v-model.number="recurringData.customInterval.monthOfYear" class="form-input">
                  <option v-for="(month, index) in monthsOfYearOptions" :key="index" :value="index + 1">{{ month }}</option>
                </select>
              </div>
              <div class="form-group">
                <label for="custom-year-day">Day</label>
                <input
                  type="number"
                  id="custom-year-day"
                  v-model.number="recurringData.customInterval.dayOfMonth"
                  class="form-input"
                  min="1"
                  max="31"
                />
              </div>
            </div>
          </div>

          <div v-if="recurringData.interval !== null" class="form-group">
            <label for="recurrence-end">Ends</label>
            <select id="recurrence-end" v-model="recurringData.endCondition" class="form-input">
              <option value="never">Never</option>
              <option value="count">After a number of occurrences</option>
              <option value="untilDate">On a specific date</option>
            </select>
          </div>

          <div v-if="recurringData.endCondition === 'count'" class="form-group">
            <label for="recurrence-end-count">Number of occurrences</label>
            <input
              type="number"
              id="recurrence-end-count"
              v-model.number="recurringData.endCount"
              class="form-input"
              min="1"
              required
            />
          </div>

          <div v-if="recurringData.endCondition === 'untilDate'" class="form-group">
            <label for="recurrence-end-date">End date</label>
            <input
              type="date"
              id="recurrence-end-date"
              v-model="recurringData.endDate"
              class="form-input"
              required
            />
          </div>
        </div>

        <!-- Category Selection -->
        <div class="form-group">
          <label for="modal-todo-category">Category</label>
          <select
            id="modal-todo-category"
            v-model="selectedCategory"
            class="form-input priority-select"
          >
            <option value="">Select a category (optional)</option>
            <option v-for="category in predefinedCategories" :key="category.id" :value="category.id">
              {{ category.icon }} {{ category.name }}
            </option>
          </select>
        </div>

        <!-- Tags Selection -->
        <div class="form-group">
          <label class="tags-label">🏷️ Tags</label>
          <div class="tags-selection-container">
            <div class="selected-tags" v-if="selectedTags.length > 0">
              <span v-for="tag in selectedTags" :key="tag.id" class="selected-tag" :style="{ backgroundColor: tag.color }">
                {{ tag.name }}
                <button type="button" @click="removeTag(tag)" class="remove-tag-btn">×</button>
              </span>
            </div>
            <div class="tags-dropdown">
              <select v-model="tagToAdd" @change="addSelectedTag" class="form-input">
                <option value="">Add a tag...</option>
                <optgroup label="Custom Tags" v-if="availableCustomTags.length > 0">
                  <option v-for="tag in availableCustomTags" :key="tag.id" :value="tag.id">
                    {{ tag.name }}
                  </option>
                </optgroup>
              </select>
            </div>
            <p class="tags-hint">Select multiple tags to organize your task</p>
          </div>
        </div>

        <!-- Subtasks Section -->
        <div class="form-group">
          <label class="subtasks-label">Subtasks / Checklist</label>
          <div class="subtasks-container">
            <div v-for="(subtask, index) in subtasks" :key="subtask.id" class="subtask-item">
              <div class="subtask-input-container">
                <input
                  type="text"
                  v-model="subtask.title"
                  placeholder="Enter subtask..."
                  class="subtask-input"
                  @blur="updateSubtask(index)"
                />
                <button
                  type="button"
                  @click="removeSubtask(index)"
                  class="remove-subtask-btn"
                  title="Remove subtask"
                >
                  ×
                </button>
              </div>
            </div>
            <button
              type="button"
              @click="addSubtask"
              class="add-subtask-btn"
            >
              + Add Subtask
            </button>
          </div>
          <div v-if="subtasks.length > 0" class="subtask-options">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="autoCompleteOnAllSubtasks"
                class="checkbox-input"
              />
              <span class="checkbox-text">Auto-complete main task when all subtasks are done</span>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="submit" class="form-button create-button">
            {{ todo ? 'Save Changes' : 'Create' }}
          </button>
          <button type="button" @click="closeModal" class="form-button cancel-button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { db } from "../firebase";
import { collection, addDoc, doc, setDoc, updateDoc, query, where, onSnapshot } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../composables/useAuth";

const props = defineProps({
  showModal: {
    type: Boolean,
    required: true,
  },
  todo: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close-modal", "edit-todo", "add-todo"]);

const { user, loading } = useAuth();

const newTodoTitle = ref("");
const newTodoDescription = ref("");
const newTodoDueDate = ref("");
const newTodoPriority = ref("low");
const titleError = ref("");

// Tags and Categories
const selectedCategory = ref("");
const selectedTags = ref([]);
const tagToAdd = ref("");
const customTags = ref([]);

// Predefined categories
const predefinedCategories = ref([
  { id: 'work', name: 'Work', icon: '💼', color: '#1e90ff' },
  { id: 'personal', name: 'Personal', icon: '👤', color: '#ff6b6b' },
  { id: 'home', name: 'Home', icon: '🏠', color: '#4ecdc4' },
  { id: 'shopping', name: 'Shopping', icon: '🛒', color: '#45b7d1' },
  { id: 'health', name: 'Health', icon: '🏥', color: '#96ceb4' },
  { id: 'finance', name: 'Finance', icon: '💰', color: '#feca57' },
  { id: 'education', name: 'Education', icon: '📚', color: '#ff9ff3' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#54a0ff' }
]);

// Subtasks management
const subtasks = ref([]);
const autoCompleteOnAllSubtasks = ref(true);

// Recurring task management
const recurringData = ref({
  interval: null,
  customInterval: {
    unit: 'day',
    value: 1,
    daysOfWeek: [],
    dayOfMonth: null,
    monthOfYear: null,
  },
  endCondition: 'never',
  endCount: null,
  endDate: null,
});

const daysOfWeekOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthsOfYearOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const addSubtask = () => {
  subtasks.value.push({
    id: uuidv4(),
    title: "",
    isCompleted: false,
    createdAt: new Date().toISOString()
  });
};

const removeSubtask = (index) => {
  subtasks.value.splice(index, 1);
};

const updateSubtask = (index) => {
  const subtask = subtasks.value[index];
  if (!subtask.title.trim()) {
    removeSubtask(index);
  }
};

// Tags management functions
const availableCustomTags = computed(() => {
  return customTags.value.filter(tag => 
    !selectedTags.value.some(selectedTag => selectedTag.id === tag.id)
  );
});

const addSelectedTag = () => {
  if (!tagToAdd.value) return;
  
  const tag = customTags.value.find(t => t.id === tagToAdd.value);
  if (tag && !selectedTags.value.some(t => t.id === tag.id)) {
    selectedTags.value.push(tag);
  }
  tagToAdd.value = "";
};

const removeTag = (tagToRemove) => {
  selectedTags.value = selectedTags.value.filter(tag => tag.id !== tagToRemove.id);
};

// Load custom tags
const loadCustomTags = () => {
  if (!user.value?.userId) return;
  
  const tagsRef = collection(db, 'tags');
  const q = query(tagsRef, where('userId', '==', user.value.userId));
  
  onSnapshot(q, (snapshot) => {
    const tags = [];
    snapshot.forEach((doc) => {
      tags.push({ id: doc.id, ...doc.data() });
    });
    customTags.value = tags;
  });
};

watch(
  () => props.showModal,
  (newValue) => {
    if (newValue) {
      if (props.todo) {
        newTodoTitle.value = props.todo.title;
        newTodoDescription.value = props.todo.description || "";
        newTodoDueDate.value = props.todo.dueDate || "";
        newTodoPriority.value = props.todo.priority || "low";
        selectedCategory.value = props.todo.category || "";
        selectedTags.value = props.todo.tags ? [...props.todo.tags] : [];
        subtasks.value = props.todo.subtasks ? [...props.todo.subtasks] : [];
        autoCompleteOnAllSubtasks.value = props.todo.autoCompleteOnAllSubtasks !== false;
        
        // Handle recurring data
        if (props.todo.recurring) {
          recurringData.value = { ...props.todo.recurring };
          if (!recurringData.value.customInterval) {
            recurringData.value.customInterval = {
              unit: 'day',
              value: 1,
              daysOfWeek: [],
              dayOfMonth: null,
              monthOfYear: null,
            };
          } else {
            recurringData.value.customInterval = { ...recurringData.value.customInterval };
            if (recurringData.value.customInterval.daysOfWeek) {
              recurringData.value.customInterval.daysOfWeek = [...recurringData.value.customInterval.daysOfWeek];
            } else {
              recurringData.value.customInterval.daysOfWeek = [];
            }
          }
        } else {
          resetRecurringData();
        }
      } else {
        newTodoTitle.value = "";
        newTodoDescription.value = "";
        newTodoDueDate.value = "";
        newTodoPriority.value = "low";
        selectedCategory.value = "";
        selectedTags.value = [];
        subtasks.value = [];
        autoCompleteOnAllSubtasks.value = true;
        resetRecurringData();
      }
      titleError.value = "";
      tagToAdd.value = "";
    }
  }
);

const resetRecurringData = () => {
  recurringData.value = {
    interval: null,
    customInterval: {
      unit: 'day',
      value: 1,
      daysOfWeek: [],
      dayOfMonth: null,
      monthOfYear: null,
    },
    endCondition: 'never',
    endCount: null,
    endDate: null,
  };
};

const handleSubmit = async () => {
  titleError.value = "";
  if (!newTodoTitle.value.trim()) {
    titleError.value = "Title is required";
    return;
  }

  const validSubtasks = subtasks.value.filter(subtask => subtask.title.trim());

  const todoData = {
    title: newTodoTitle.value.trim(),
    description: newTodoDescription.value.trim() || null,
    dueDate: newTodoDueDate.value || null,
    priority: newTodoPriority.value,
    category: selectedCategory.value || null,
    tags: selectedTags.value,
    createdAt: new Date().toISOString(),
    isCompleted: props.todo ? props.todo.isCompleted : false,
    userId: user.value?.userId,
    subtasks: validSubtasks,
    autoCompleteOnAllSubtasks: autoCompleteOnAllSubtasks.value,
    recurring: recurringData.value.interval !== null ? recurringData.value : null,
    isRecurringParent: recurringData.value.interval !== null,
    recurringParentId: props.todo?.recurringParentId || null,
    nextDueDate: recurringData.value.interval !== null ? calculateNextDueDate(newTodoDueDate.value, recurringData.value) : null,
  };

  if (props.todo) {
    emit("edit-todo", todoData);
  } else {
    emit("add-todo", todoData);
  }
};

const calculateNextDueDate = (currentDueDate, recurring) => {
  if (!currentDueDate || !recurring.interval) return null;
  
  const baseDate = new Date(currentDueDate);
  let nextDate = new Date(baseDate);
  
  switch (recurring.interval) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'custom':
      if (recurring.customInterval) {
        const { unit, value } = recurring.customInterval;
        switch (unit) {
          case 'day':
            nextDate.setDate(nextDate.getDate() + value);
            break;
          case 'week':
            nextDate.setDate(nextDate.getDate() + (value * 7));
            break;
          case 'month':
            nextDate.setMonth(nextDate.getMonth() + value);
            break;
          case 'year':
            nextDate.setFullYear(nextDate.getFullYear() + value);
            break;
        }
      }
      break;
  }
  
  return nextDate.toISOString().split('T')[0];
};

const closeModal = () => {
  emit("close-modal");
};

// Wait for authentication before loading tags
watch([() => user.value?.userId, loading], ([userId, isLoading]) => {
  if (!isLoading && userId) {
    loadCustomTags();
  }
}, { immediate: true });

onMounted(() => {
  // Only load if user is already authenticated
  if (user.value?.userId && !loading.value) {
    loadCustomTags();
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #252525;
  padding: 30px 40px;
  border-radius: 8px;
  border: 1px solid #444;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 25px;
  text-align: center;
  font-weight: 400;
  color: #eee;
}

.modal-form .form-group {
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
}

.modal-actions .form-button {
  padding: 10px 20px;
}

.cancel-button {
  background-color: #555;
  border-color: #444;
}
.cancel-button:hover {
  background-color: #666;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #ccc;
  font-size: 0.9em;
  font-weight: 500;
}

.form-input {
  padding: 12px 15px;
  border: 1px solid #444;
  background-color: #333;
  color: #e0e0e0;
  border-radius: 4px;
  font-size: 1em;
  width: 100%;
  box-sizing: border-box;
}
.form-input::placeholder {
  color: #888;
}

.description-input {
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
}
.date-input {
  min-width: 140px;
}

.priority-select {
  min-width: 140px;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
  padding-right: 30px;
}

.input-error {
  color: #ff8a8a;
  font-size: 0.85em;
  margin-top: 5px;
  margin-bottom: 0;
}

/* Subtasks Styles */
.subtasks-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px !important;
}

.subtasks-label::before {
  content: "📋";
  font-size: 1.1em;
}

.subtasks-container {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
}

.subtask-item {
  margin-bottom: 10px;
}

.subtask-item:last-child {
  margin-bottom: 0;
}

.subtask-input-container {
  display: flex;
  gap: 8px;
  align-items: center;
}

.subtask-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #555;
  background-color: #333;
  color: #e0e0e0;
  border-radius: 4px;
  font-size: 0.9em;
}

.subtask-input:focus {
  outline: none;
  border-color: #42b983;
}

.subtask-input::placeholder {
  color: #999;
}

.remove-subtask-btn {
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease;
}

.remove-subtask-btn:hover {
  background-color: #ff5252;
}

.add-subtask-btn {
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.9em;
  cursor: pointer;
  transition: background-color 0.3s ease;
  width: 100%;
}

.add-subtask-btn:hover {
  background-color: #369870;
}

.subtask-options {
  margin-top: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9em;
  color: #ccc;
}

.checkbox-input {
  accent-color: #42b983;
  width: 16px;
  height: 16px;
}

.checkbox-text {
  user-select: none;
}

/* Tags and Categories Styles */
.tags-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px !important;
}

.tags-selection-container {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 15px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 16px;
  color: white;
  font-size: 0.85em;
  font-weight: 500;
  text-transform: capitalize;
}

.remove-tag-btn {
  background: none;
  border: none;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.remove-tag-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.tags-dropdown {
  margin-bottom: 8px;
}

.tags-hint {
  color: #aaa;
  font-size: 0.85em;
  margin: 0;
  font-style: italic;
}

/* Form Button Styles */
.form-button {
  background-color: #42b983;
  color: white;
  border: 1px solid #42b983;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.form-button:hover {
  background-color: #369870;
  border-color: #369870;
}

.create-button {
  background-color: #42b983;
  border-color: #42b983;
}

.create-button:hover {
  background-color: #369870;
  border-color: #369870;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0 4px;
}

.tag-remove:hover {
  color: #ff6b6b;
}

/* Recurring Task Styles */
.recurring-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #444;
}

.recurring-section h4 {
  color: #f0f0f0;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recurring-section h4:before {
  content: "🔄";
  font-size: 1.1em;
}

.custom-recurrence-options {
  background-color: #2a2a2a;
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
  border: 1px solid #3a3a3a;
}

.days-of-week {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}

.days-of-week label {
  background-color: #3a3a3a;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9em;
  color: #f0f0f0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.days-of-week label:hover {
  background-color: #4a4a4a;
}

.days-of-week input[type="checkbox"] {
  margin-right: 5px;
  accent-color: #42b983;
}

.days-of-week input[type="checkbox"]:checked + span {
  font-weight: bold;
  color: #42b983;
}
</style>
