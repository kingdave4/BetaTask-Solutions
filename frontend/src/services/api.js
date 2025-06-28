const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.refreshTokenCallback = null;
  }

  setTokenRefreshCallback(callback) {
    this.refreshTokenCallback = callback;
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

    console.log(`Making API request to: ${endpoint}`);
    console.log(`Auth token present: ${!!this.authToken}`);

    try {
      const response = await fetch(url, config);
      console.log(`Response status: ${response.status}`);

      // If we get a 401 or 403, try to refresh the token and retry
      if (
        (response.status === 401 || response.status === 403) &&
        this.refreshTokenCallback
      ) {
        console.log(
          "Authentication error detected, attempting token refresh..."
        );
        try {
          console.log("Token expired, attempting refresh...");
          const newToken = await this.refreshTokenCallback();
          this.setAuthToken(newToken);
          console.log("Token refreshed successfully, retrying request...");

          // Retry the request with the new token
          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              ...this.getAuthHeaders(),
            },
          };

          console.log("Retrying request with new token...");
          const retryResponse = await fetch(url, retryConfig);
          console.log(`Retry response status: ${retryResponse.status}`);

          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }

          const contentType = retryResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return await retryResponse.json();
          }

          return retryResponse;
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // If refresh fails, throw the original error
          throw new Error(`Authentication failed. Please log in again.`);
        }
      }

      if (!response.ok) {
        // Log the response body for debugging
        const responseText = await response.text();
        console.error(`API Error ${response.status}:`, responseText);
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
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
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
