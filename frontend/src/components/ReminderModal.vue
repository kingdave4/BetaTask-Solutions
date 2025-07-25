<template>
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content reminder-modal">
      <div class="modal-header">
        <h2>
          <span class="reminder-icon">⏰</span>
          Manage Reminders
        </h2>
        <button @click="closeModal" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="todo-info">
          <h3>{{ todo?.title }}</h3>
          <p v-if="todo?.dueDate" class="due-date">
            Due: {{ formatDate(todo.dueDate) }}
          </p>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>


        <div v-if="reminders.length > 0" class="existing-reminders">
          <h4>Current Reminders</h4>
          <div class="reminders-list">
            <div 
              v-for="reminder in reminders" 
              :key="reminder.id" 
              class="reminder-item"
              :class="{ 'triggered': reminder.isTriggered }"
            >
              <div class="reminder-info">
                <div class="reminder-datetime">
                  <span class="reminder-date">{{ formatDate(reminder.reminderDateTime) }}</span>
                  <span class="reminder-time">{{ formatTime(reminder.reminderDateTime) }}</span>
                 </div>
                 <div v-if="reminder.recurrence" class="reminder-recurrence">
                    Repeats: {{ formatRecurrence(reminder.recurrence) }}
                 </div>
                 <div class="reminder-message">{{ reminder.message }}</div>
                 <div class="reminder-status">
                   <span v-if="reminder.isTriggered" class="status-triggered">✓ Triggered</span>
                   <span v-else class="status-pending">⏳ Pending</span>
                 </div>
               </div>
              <div class="reminder-actions">
                <button 
                  @click="editReminder(reminder)" 
                  class="edit-btn"
                  :disabled="reminder.isTriggered"
                >
                  Edit
                </button>
                <button 
                  @click="deleteReminder(reminder.id)" 
                  class="delete-btn"
                  :disabled="deleting === reminder.id"
                >
                  {{ deleting === reminder.id ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>
        </div>


        <div class="add-reminder-section">
          <h4>{{ editingReminder ? 'Edit Reminder' : 'Add New Reminder' }}</h4>
          <form @submit.prevent="submitReminder" class="reminder-form">
            <div class="form-row">
              <div class="form-group">
                <label for="reminder-date">Date</label>
                <input
                  type="date"
                  id="reminder-date"
                  v-model="newReminderDate"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label for="reminder-time">Time</label>
                <input
                  type="time"
                  id="reminder-time"
                  v-model="newReminderTime"
                  class="form-input"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="reminder-message">Custom Message (Optional)</label>
              <textarea
                id="reminder-message"
                v-model="newReminderMessage"
                placeholder="Custom reminder message..."
                class="form-input"
                rows="2"
              ></textarea>
            </div>


            <div class="recurrence-section">
              <h5>Recurrence</h5>
              <div class="form-group">
                <label for="recurrence-interval">Repeat</label>
                <select id="recurrence-interval" v-model="newReminderRecurrence.interval" class="form-input">
                  <option :value="null">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>


              <div v-if="newReminderRecurrence.interval === 'custom'" class="custom-recurrence-options">
                 <div class="form-row">
                    <div class="form-group">
                        <label for="custom-interval-value">Repeat every</label>
                        <input
                            type="number"
                            id="custom-interval-value"
                            v-model.number="newReminderRecurrence.customInterval.value"
                            class="form-input"
                            min="1"
                            required
                        />
                    </div>
                     <div class="form-group">
                        <label for="custom-interval-unit">Unit</label>
                        <select id="custom-interval-unit" v-model="newReminderRecurrence.customInterval.unit" class="form-input" required>
                            <option value="day">Day(s)</option>
                            <option value="week">Week(s)</option>
                            <option value="month">Month(s)</option>
                            <option value="year">Year(s)</option>
                        </select>
                    </div>
                 </div>


                 <div v-if="newReminderRecurrence.customInterval.unit === 'week'" class="form-group">
                     <label>Repeat on</label>
                     <div class="days-of-week">
                         <label v-for="(day, index) in daysOfWeekOptions" :key="index">
                             <input type="checkbox" :value="index" v-model="newReminderRecurrence.customInterval.daysOfWeek">
                             {{ day }}
                         </label>
                     </div>
                 </div>


                 <div v-if="newReminderRecurrence.customInterval.unit === 'month'" class="form-group">
                     <label for="custom-month-day">Repeat on day of the month</label>
                      <input
                            type="number"
                            id="custom-month-day"
                            v-model.number="newReminderRecurrence.customInterval.dayOfMonth"
                            class="form-input"
                            min="1"
                            max="31"
                        />
                 </div>


                 <div v-if="newReminderRecurrence.customInterval.unit === 'year'" class="form-row">
                     <div class="form-group">
                        <label for="custom-year-month">Month</label>
                         <select id="custom-year-month" v-model.number="newReminderRecurrence.customInterval.monthOfYear" class="form-input">
                             <option v-for="(month, index) in monthsOfYearOptions" :key="index" :value="index + 1">{{ month }}</option>
                         </select>
                     </div>
                      <div class="form-group">
                        <label for="custom-year-day">Day</label>
                         <input
                            type="number"
                            id="custom-year-day"
                            v-model.number="newReminderRecurrence.customInterval.dayOfMonth"
                            class="form-input"
                            min="1"
                            max="31"
                        />
                     </div>
                 </div>
              </div>


              <div v-if="newReminderRecurrence.interval !== null" class="form-group">
                <label for="recurrence-end">Ends</label>
                <select id="recurrence-end" v-model="newReminderRecurrence.endCondition" class="form-input">
                  <option value="never">Never</option>
                  <option value="count">After a number of occurrences</option>
                  <option value="untilDate">On a specific date</option>
                </select>
              </div>


              <div v-if="newReminderRecurrence.endCondition === 'count'" class="form-group">
                <label for="recurrence-end-count">Number of occurrences</label>
                <input
                  type="number"
                  id="recurrence-end-count"
                  v-model.number="newReminderRecurrence.endCount"
                  class="form-input"
                  min="1"
                  required
                />
              </div>

              <div v-if="newReminderRecurrence.endCondition === 'untilDate'" class="form-group">
                <label for="recurrence-end-date">End date</label>
                <input
                  type="date"
                  id="recurrence-end-date"
                  v-model="newReminderRecurrence.endDate"
                  class="form-input"
                  required
                />
              </div>
            </div>


            <div class="quick-reminders">
              <h5>Quick Reminders</h5>
              <div class="quick-buttons">
                <button 
                  type="button" 
                  @click="setQuickReminder('1hour')"
                  class="quick-btn"
                  :disabled="!todo?.dueDate"
                >
                  1 Hour Before Due
                </button>
                <button 
                  type="button" 
                  @click="setQuickReminder('1day')"
                  class="quick-btn"
                  :disabled="!todo?.dueDate"
                >
                  1 Day Before Due
                </button>
                <button 
                  type="button" 
                  @click="setQuickReminder('1week')"
                  class="quick-btn"
                  :disabled="!todo?.dueDate"
                >
                  1 Week Before Due
                </button>
              </div>
              <p v-if="!todo?.dueDate" class="quick-reminder-note">
                Set a due date on the todo to use quick reminders
              </p>
            </div>

            <div class="form-actions">
              <button 
                type="button" 
                @click="cancelEdit" 
                class="cancel-btn"
                v-if="editingReminder"
              >
                Cancel Edit
              </button>
              <button 
                type="submit" 
                class="submit-btn"
                :disabled="saving"
              >
                {{ saving ? 'Saving...' : (editingReminder ? 'Update Reminder' : 'Add Reminder') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import apiService from '../services/api'

const props = defineProps({
  showModal: {
    type: Boolean,
    required: true
  },
  todo: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close-modal', 'reminders-updated'])

const { user } = useAuth()

const reminders = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(null)
const editingReminder = ref(null)
const errorMessage = ref('')

const newReminderDate = ref('')
const newReminderTime = ref('')
const newReminderMessage = ref('')

const newReminderRecurrence = ref({
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
})

const daysOfWeekOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const monthsOfYearOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

watch(() => props.showModal, (newValue) => {
  if (newValue && props.todo) {
    fetchReminders()
    resetForm()
  }
})

const closeModal = () => {
  emit('close-modal')
  resetForm()
}

const resetForm = () => {
  newReminderDate.value = ''
  newReminderTime.value = ''
  newReminderMessage.value = ''
  editingReminder.value = null
  errorMessage.value = ''
  newReminderRecurrence.value = {
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
  }
}

const fetchReminders = async () => {
  if (!props.todo?.id || !user.value?.userId) return

  loading.value = true
  try {
    apiService.setAuthToken(user.value.token)
    reminders.value = await apiService.getReminders(props.todo.id)
  } catch (error) {
    console.error('Error fetching reminders:', error)
  } finally {
    loading.value = false
  }
}

const submitReminder = async () => {
  errorMessage.value = ''
  if (!newReminderDate.value || !newReminderTime.value) {
    errorMessage.value = 'Please select both date and time for the reminder'
    return
  }

  saving.value = true
  try {
    const reminderDateTime = `${newReminderDate.value}T${newReminderTime.value}:00`
    const reminderDate = new Date(reminderDateTime)
    const now = new Date()
    
    // Check if the reminder time is in the past
    if (reminderDate <= now) {
      const selectedDate = new Date(newReminderDate.value + 'T00:00:00')
      const todayDate = new Date(now.toISOString().split('T')[0] + 'T00:00:00')
      
      if (selectedDate < todayDate) {
        errorMessage.value = 'Cannot set reminder for a past date'
      } else if (selectedDate.getTime() === todayDate.getTime()) {
        errorMessage.value = 'Cannot set reminder for a past time today'
      } else {
        errorMessage.value = 'Cannot set reminder in the past'
      }
      saving.value = false
      return
    }
    
    apiService.setAuthToken(user.value.token)
    
    if (editingReminder.value) {
      const updatePayload = {
        reminderDateTime,
        message: newReminderMessage.value || `Reminder for: ${props.todo.title}`
      }
      await apiService.updateReminder(editingReminder.value.id, updatePayload)
    } else {
      const createPayload = {
        todoId: props.todo.id,
        reminderDateTime,
        message: newReminderMessage.value || `Reminder for: ${props.todo.title}`,
        recurrence: newReminderRecurrence.value.interval !== null ? newReminderRecurrence.value : null,
      }
      await apiService.createReminder(createPayload)
    }

    await fetchReminders()
    resetForm()
    emit('reminders-updated')
  } catch (error) {
    console.error('Error saving reminder:', error)
    errorMessage.value = error.message || 'Failed to save reminder. Please try again.'
  } finally {
    saving.value = false
  }
}

const editReminder = (reminder) => {
  editingReminder.value = reminder
  const datetime = new Date(reminder.reminderDateTime)
  newReminderDate.value = datetime.toISOString().split('T')[0]
  newReminderTime.value = datetime.toTimeString().slice(0, 5)
  newReminderMessage.value = reminder.message
  // Populate recurrence fields if they exist
  if (reminder.recurrence) {
      newReminderRecurrence.value = { ...reminder.recurrence };
      // Ensure customInterval and its properties are initialized if recurrence exists but customInterval is missing
      if (!newReminderRecurrence.value.customInterval) {
          newReminderRecurrence.value.customInterval = {
              unit: 'day',
              value: 1,
              daysOfWeek: [],
              dayOfMonth: null,
              monthOfYear: null,
          };
      } else {
           // Ensure nested properties are reactive
           newReminderRecurrence.value.customInterval = { ...newReminderRecurrence.value.customInterval };
           if (newReminderRecurrence.value.customInterval.daysOfWeek) {
               newReminderRecurrence.value.customInterval.daysOfWeek = [...newReminderRecurrence.value.customInterval.daysOfWeek];
           } else {
                newReminderRecurrence.value.customInterval.daysOfWeek = [];
           }
      }
       // Ensure endCount and endDate are reactive
       newReminderRecurrence.value.endCount = reminder.recurrence.endCount !== undefined ? reminder.recurrence.endCount : null;
       newReminderRecurrence.value.endDate = reminder.recurrence.endDate !== undefined ? reminder.recurrence.endDate : null;

  } else {
      resetForm();
  }
}

const cancelEdit = () => {
  resetForm()
}

const deleteReminder = async (reminderId) => {
  if (!confirm('Are you sure you want to delete this reminder?')) return

  deleting.value = reminderId
  try {
    apiService.setAuthToken(user.value.token)
    await apiService.deleteReminder(reminderId)
    await fetchReminders()
    emit('reminders-updated')
  } catch (error) {
    console.error('Error deleting reminder:', error)
  } finally {
    deleting.value = null
  }
}

const setQuickReminder = (type) => {
  errorMessage.value = ''
  if (!props.todo?.dueDate) {
    errorMessage.value = 'Please set a due date for this todo to use quick reminders'
    return
  }

  const dueDate = new Date(props.todo.dueDate + 'T00:00:00')
  let reminderDate = new Date(dueDate)
  const now = new Date()

  switch (type) {
    case '1hour':
      reminderDate.setHours(dueDate.getHours() - 1)
      break
    case '1day':
      reminderDate.setDate(dueDate.getDate() - 1)
      break
    case '1week':
      reminderDate.setDate(dueDate.getDate() - 7)
      break
  }

  // Check if the calculated reminder time is in the past
  if (reminderDate <= now) {
    const timeDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60)) // hours until due
    if (timeDiff <= 0) {
      errorMessage.value = 'This task is already due or overdue'
    } else if (timeDiff < 1) {
      errorMessage.value = `Task is due in less than 1 hour. You can set a manual reminder for a future time.`
    } else if (timeDiff < 24) {
      errorMessage.value = `Task is due in less than 1 day. You can set a manual reminder for a future time.`
    } else {
      errorMessage.value = 'Cannot set reminder in the past'
    }
    return
  }

  newReminderDate.value = reminderDate.toISOString().split('T')[0]
  newReminderTime.value = reminderDate.toTimeString().slice(0, 5)
  newReminderMessage.value = `${type.replace(/(\d+)/, '$1 ')} reminder for: ${props.todo.title}`
}

const formatRecurrence = (recurrence) => {
    if (!recurrence || !recurrence.interval) {
        return 'Never';
    }

    let recurrenceString = '';
    const { interval, customInterval, endCondition, endCount, endDate } = recurrence;

    switch (interval) {
        case 'daily':
            recurrenceString = 'Daily';
            break;
        case 'weekly':
            recurrenceString = 'Weekly';
            break;
        case 'monthly':
            recurrenceString = 'Monthly';
            break;
        case 'yearly':
            recurrenceString = 'Yearly';
            break;
        case 'custom':
            if (customInterval) {
                recurrenceString = `Every ${customInterval.value} ${customInterval.unit}(s)`;
                if (customInterval.unit === 'week' && customInterval.daysOfWeek && customInterval.daysOfWeek.length > 0) {
                    const sortedDays = customInterval.daysOfWeek.map(dayIndex => daysOfWeekOptions[dayIndex]).sort();
                    recurrenceString += ` on ${sortedDays.join(', ')}`;
                } else if (customInterval.unit === 'month' && customInterval.dayOfMonth !== undefined && customInterval.dayOfMonth !== null) {
                     recurrenceString += ` on day ${customInterval.dayOfMonth}`;
                } else if (customInterval.unit === 'year' && customInterval.monthOfYear !== undefined && customInterval.monthOfYear !== null && customInterval.dayOfMonth !== undefined && customInterval.dayOfMonth !== null) {
                     recurrenceString += ` on ${monthsOfYearOptions[customInterval.monthOfYear - 1]} ${customInterval.dayOfMonth}`;
                }
            } else {
                recurrenceString = 'Custom (invalid)';
            }
            break;
        default:
            recurrenceString = 'Unknown';
    }

    if (endCondition === 'count' && endCount !== undefined && endCount !== null) {
        recurrenceString += `, ends after ${endCount} occurrences`;
    } else if (endCondition === 'untilDate' && endDate) {
        recurrenceString += `, ends on ${formatDate(endDate)}`;
    }

    return recurrenceString;
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  const options = { hour: 'numeric', minute: '2-digit', hour12: true }
  return new Date(dateString).toLocaleTimeString(undefined, options)
}
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
  border-radius: 8px;
  border: 1px solid #444;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
}

.reminder-modal {
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #444;
}

.modal-header h2 {
  margin: 0;
  color: #f0f0f0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.reminder-icon {
  font-size: 1.2em;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #aaa;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 20px;
}

.todo-info {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #333;
  border-radius: 8px;
}

.todo-info h3 {
  margin: 0 0 5px 0;
  color: #f0f0f0;
}

.due-date {
  margin: 0;
  color: #42b983;
  font-size: 0.9em;
}

.error-message {
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 0.9em;
}

.existing-reminders {
  margin-bottom: 30px;
}

.existing-reminders h4 {
  color: #f0f0f0;
  margin-bottom: 15px;
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reminder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #333;
  border-radius: 8px;
  border-left: 4px solid #42b983;
}

.reminder-item.triggered {
  border-left-color: #888;
  opacity: 0.7;
}

.reminder-info {
  flex-grow: 1;
}

.reminder-datetime {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
}

.reminder-date {
  color: #42b983;
  font-weight: 600;
}

.reminder-time {
  color: #42b983;
}

.reminder-message {
  color: #ddd;
  font-size: 0.9em;
  margin-bottom: 5px;
}

.reminder-recurrence {
  font-size: 0.85em;
  color: #bbb;
  margin-top: 5px;
}

.reminder-status {
  font-size: 0.8em;
}

.status-triggered {
  color: #888;
}

.status-pending {
  color: #ffd93d;
}

.reminder-actions {
  display: flex;
  gap: 8px;
}

.reminder-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background-color 0.3s ease;
}

.edit-btn {
  background-color: #28a745;
  color: white;
}

.edit-btn:hover:not(:disabled) {
  background-color: #218838;
}

.edit-btn:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
}

.delete-btn:hover:not(:disabled) {
  background-color: #c82333;
}

.add-reminder-section h4 {
  color: #f0f0f0;
  margin-bottom: 15px;
}

.reminder-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  color: #ddd;
  font-size: 0.9em;
  font-weight: 500;
}

.form-input {
  padding: 10px;
  background-color: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: #f0f0f0;
  font-size: 0.9em;
}

.form-input:focus {
  outline: none;
  border-color: #42b983;
}

.recurrence-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #444;
}

.recurrence-section h5 {
  color: #f0f0f0;
  margin-bottom: 15px;
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

.quick-reminders {
  padding: 15px;
  background-color: #333;
  border-radius: 8px;
}

.quick-reminders h5 {
  margin: 0 0 10px 0;
  color: #f0f0f0;
}

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.quick-btn {
  padding: 8px 12px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background-color 0.3s ease;
}

.quick-btn:hover:not(:disabled) {
  background-color: #369870;
}

.quick-btn:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.quick-reminder-note {
  margin: 0;
  color: #888;
  font-size: 0.8em;
  font-style: italic;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  padding: 10px 20px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.submit-btn {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn:hover:not(:disabled) {
  background-color: #369870;
}

.submit-btn:disabled {
  background-color: #555;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .quick-buttons {
    flex-direction: column;
  }
  
  .reminder-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .reminder-actions {
    align-self: flex-end;
  }
}
</style> 