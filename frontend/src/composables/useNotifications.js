import { ref, computed, watch, onUnmounted } from "vue";
import { useAuth } from "./useAuth";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import apiService from "../services/api";

const notifications = ref([]);
const unreadCount = ref(0);
const loading = ref(false);

let unsubscribeNotifications = null;

export function useNotifications() {
  const { user } = useAuth();

  const setupNotificationListener = () => {
    if (!user.value?.userId) {
      notifications.value = [];
      unreadCount.value = 0;
      return;
    }

    loading.value = true;

    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef,
        where("userId", "==", user.value.userId),
        orderBy("createdAt", "desc"),
        limit(100)
      );

      unsubscribeNotifications = onSnapshot(
        q,
        (snapshot) => {
          const fetchedNotifications = [];
          snapshot.forEach((doc) => {
            fetchedNotifications.push({ id: doc.id, ...doc.data() });
          });

          notifications.value = fetchedNotifications;
          unreadCount.value = fetchedNotifications.filter(
            (n) => !n.isRead
          ).length;
          loading.value = false;
        },
        (error) => {
          console.error("Error listening to notifications:", error);
          loading.value = false;
        }
      );
    } catch (error) {
      console.error("Error setting up notifications listener:", error);
      loading.value = false;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      apiService.setAuthToken(user.value.token);
      await apiService.markNotificationAsRead(notificationId);
      // The real-time listener will automatically update the local state
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      apiService.setAuthToken(user.value.token);
      const unreadNotifications = notifications.value.filter((n) => !n.isRead);

      for (const notification of unreadNotifications) {
        await apiService.markNotificationAsRead(notification.id);
      }
      // The real-time listener will automatically update the local state
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      apiService.setAuthToken(user.value.token);
      await apiService.deleteNotification(notificationId);
      // The real-time listener will automatically update the local state
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Set up listener when user changes
  watch(
    () => user.value,
    (newUser) => {
      // Clean up previous listener
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
      }

      if (newUser) {
        setupNotificationListener();
      } else {
        notifications.value = [];
        unreadCount.value = 0;
      }
    },
    { immediate: true }
  );

  // Clean up listener on unmount
  onUnmounted(() => {
    if (unsubscribeNotifications) {
      unsubscribeNotifications();
    }
  });

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
