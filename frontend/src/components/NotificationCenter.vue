<template>
  <div class="notification-center">
    <div class="notification-header">
      <h2>
        <span class="notification-icon">🔔</span>
        Notifications
        <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      </h2>
      <div class="notification-actions">
        <button 
          @click="toggleUnreadFilter" 
          class="filter-btn"
          :class="{ active: showUnreadOnly }"
        >
          {{ showUnreadOnly ? 'Show All' : 'Unread Only' }}
        </button>
        <button 
          @click="markAllAsRead" 
          class="mark-all-btn"
          :disabled="unreadCount === 0"
        >
          Mark All Read
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Loading notifications...</p>
    </div>

    <div v-else-if="filteredNotifications.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>{{ showUnreadOnly ? 'No unread notifications' : 'No notifications yet' }}</h3>
      <p>{{ showUnreadOnly ? 'All caught up!' : 'Notifications for your task reminders will appear here.' }}</p>
    </div>

    <div v-else class="notifications-list">
      <div 
        v-for="notification in filteredNotifications" 
        :key="notification.id"
        class="notification-item"
        :class="{ 
          'unread': !notification.isRead,
          'reminder': notification.type === 'reminder'
        }"
      >
        <div class="notification-content">
          <div class="notification-type-icon">
            <span v-if="notification.type === 'reminder'">⏰</span>
            <span v-else>📌</span>
          </div>
          
          <div class="notification-details">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-meta">
              <span class="notification-time">{{ formatTimeAgo(notification.createdAt) }}</span>
              <span v-if="notification.todoId" class="notification-todo">
                <router-link :to="`/todos#${notification.todoId}`" class="todo-link">
                  View Task
                </router-link>
              </span>
            </div>
          </div>
        </div>

        <div class="notification-actions">
          <button 
            v-if="!notification.isRead"
            @click="markAsRead(notification.id)"
            class="read-btn"
            :disabled="markingRead === notification.id"
          >
            {{ markingRead === notification.id ? '...' : '✓' }}
          </button>
          <button 
            @click="deleteNotification(notification.id)"
            class="delete-btn"
            :disabled="deleting === notification.id"
          >
            {{ deleting === notification.id ? '...' : '🗑️' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useNotifications } from '../composables/useNotifications'

const { user } = useAuth()
const { 
  notifications: allNotifications, 
  loading, 
  markAsRead: globalMarkAsRead, 
  markAllAsRead: globalMarkAllAsRead,
  deleteNotification: globalDeleteNotification 
} = useNotifications()

const markingRead = ref(null)
const deleting = ref(null)
const showUnreadOnly = ref(false)

const unreadCount = computed(() => {
  return allNotifications.value.filter(n => !n.isRead).length
})

const filteredNotifications = computed(() => {
  if (showUnreadOnly.value) {
    return allNotifications.value.filter(n => !n.isRead)
  }
  return allNotifications.value
})

const markAsRead = async (notificationId) => {
  markingRead.value = notificationId
  
  try {
    await globalMarkAsRead(notificationId)
  } catch (error) {
    console.error('Error marking notification as read:', error)
  } finally {
    markingRead.value = null
  }
}

const markAllAsRead = async () => {
  try {
    await globalMarkAllAsRead()
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

const deleteNotification = async (notificationId) => {
  deleting.value = notificationId
  
  try {
    await globalDeleteNotification(notificationId)
  } catch (error) {
    console.error('Error deleting notification:', error)
  } finally {
    deleting.value = null
  }
}

const toggleUnreadFilter = () => {
  showUnreadOnly.value = !showUnreadOnly.value
}

const formatTimeAgo = (dateString) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}
</script>

<style scoped>
.notification-center {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}

.notification-header h2 {
  margin: 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.notification-icon {
  font-size: 1.2em;
}

.unread-badge {
  background-color: #dc3545;
  color: white;
  border-radius: 50%;
  padding: 2px 8px;
  font-size: 0.7em;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
}

.notification-actions {
  display: flex;
  gap: 10px;
}

.filter-btn, .mark-all-btn {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  color: #333;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s ease;
}

.filter-btn.active {
  background-color: #42b983;
  border-color: #42b983;
  color: white;
}

.filter-btn:hover, .mark-all-btn:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #999;
}

.mark-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f8f9fa;
  color: #999;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #333;
  margin-bottom: 10px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  background-color: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.notification-item.unread {
  border-left: 4px solid #42b983;
  background-color: #f8fff9;
}

.notification-item.reminder {
  border-left-color: #ffd93d;
}

.notification-content {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  flex-grow: 1;
}

.notification-type-icon {
  font-size: 1.2em;
  margin-top: 2px;
}

.notification-details {
  flex-grow: 1;
}

.notification-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.notification-message {
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.85em;
  color: #888;
}

.todo-link {
  color: #42b983;
  text-decoration: none;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: rgba(66, 185, 131, 0.1);
  transition: background-color 0.3s ease;
}

.todo-link:hover {
  background-color: rgba(66, 185, 131, 0.2);
}

.notification-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.read-btn, .delete-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
}

.read-btn {
  background-color: #28a745;
  color: white;
}

.read-btn:hover:not(:disabled) {
  background-color: #218838;
}

.delete-btn {
  background-color: #6c757d;
  color: white;
}

.delete-btn:hover:not(:disabled) {
  background-color: #5a6268;
}

.read-btn:disabled, .delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .notification-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .notification-item {
    flex-direction: column;
    gap: 15px;
  }
  
  .notification-actions {
    align-self: flex-end;
  }
  
  .notification-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style> 