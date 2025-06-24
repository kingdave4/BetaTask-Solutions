const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      return response;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Authentication methods
  setAuthToken(token) {
    this.authToken = token;
  }

  getAuthHeaders() {
    const headers = this.authToken
      ? { Authorization: `Bearer ${this.authToken}` }
      : {};
    return headers;
  }

  // Reminder API methods
  async getReminders(todoId) {
    return this.request(`/reminders/todo/${todoId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async createReminder(reminderData) {
    return this.request("/reminders", {
      method: "POST",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reminderData),
    });
  }

  async updateReminder(reminderId, reminderData) {
    return this.request(`/reminders/${reminderId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(reminderData),
    });
  }

  async deleteReminder(reminderId) {
    return this.request(`/reminders/${reminderId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  // Notification API methods
  async getNotifications(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/reminders/notifications?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/reminders/notifications/${notificationId}/read`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async deleteNotification(notificationId) {
    return this.request(`/reminders/notifications/${notificationId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }
}

export default new ApiService();
