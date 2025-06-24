import { ref, computed, watch } from "vue";
import { useAuth } from "./useAuth";
import apiService from "../services/api";

const notifications = ref([]);
const unreadCount = ref(0);
const loading = ref(false);

export function useNotifications() {
  const { user } = useAuth();

  const fetchUnreadCount = async () => {
    if (!user.value?.token) {
      unreadCount.value = 0;
      return;
    }

    try {
      apiService.setAuthToken(user.value.token);
      const unreadNotifications = await apiService.getNotifications({
        unreadOnly: "true",
        limit: "100",
      });
      unreadCount.value = unreadNotifications.length;
    } catch (error) {
      unreadCount.value = 0;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      apiService.setAuthToken(user.value.token);
      await apiService.markNotificationAsRead(notificationId);

      if (unreadCount.value > 0) {
        unreadCount.value--;
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      apiService.setAuthToken(user.value.token);
      const unreadNotifications = await apiService.getNotifications({
        unreadOnly: "true",
        limit: "100",
      });

      for (const notification of unreadNotifications) {
        await apiService.markNotificationAsRead(notification.id);
      }

      unreadCount.value = 0;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  watch(
    () => user.value,
    (newUser) => {
      if (newUser) {
        fetchUnreadCount();

        const interval = setInterval(() => {
          if (user.value) {
            fetchUnreadCount();
          } else {
            clearInterval(interval);
          }
        }, 30000);

        return () => clearInterval(interval);
      } else {
        unreadCount.value = 0;
      }
    },
    { immediate: true }
  );

  return {
    notifications,
    unreadCount,
    loading,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}
