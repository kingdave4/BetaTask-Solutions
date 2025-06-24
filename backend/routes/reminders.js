const express = require("express");
const { db } = require("../firebase-admin");
const auth = require("../middleware/auth");
const schedule = require("node-schedule");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

router.get("/todo/:todoId", auth, async (req, res) => {
  try {
    const { todoId } = req.params;
    const userId = req.userId;

    const todoRef = db.collection("todos").doc(todoId);
    const todoDoc = await todoRef.get();

    if (!todoDoc.exists || todoDoc.data().userId !== userId) {
      return res.status(404).json({ message: "Todo not found" });
    }

    const remindersRef = db.collection("reminders");
    const snapshot = await remindersRef
      .where("todoId", "==", todoId)
      .where("userId", "==", userId)
      .orderBy("reminderDateTime", "asc")
      .get();

    const reminders = [];
    snapshot.forEach((doc) => {
      reminders.push({ id: doc.id, ...doc.data() });
    });

    res.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ message: "Failed to fetch reminders" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const {
      todoId,
      reminderDateTime,
      reminderType = "notification",
      message,
    } = req.body;
    const userId = req.userId;

    if (!todoId || !reminderDateTime) {
      return res.status(400).json({
        message: "Todo ID and reminder date/time are required",
      });
    }

    const todoRef = db.collection("todos").doc(todoId);
    const todoDoc = await todoRef.get();

    if (!todoDoc.exists || todoDoc.data().userId !== userId) {
      return res.status(404).json({ message: "Todo not found" });
    }

    const reminderData = {
      id: uuidv4(),
      todoId,
      userId,
      reminderDateTime: new Date(reminderDateTime).toISOString(),
      reminderType,
      message: message || `Reminder for: ${todoDoc.data().title}`,
      isTriggered: false,
      createdAt: new Date().toISOString(),
    };

    await db.collection("reminders").doc(reminderData.id).set(reminderData);

    scheduleReminder(reminderData);

    res.status(201).json(reminderData);
  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({ message: "Failed to create reminder" });
  }
});

router.put("/:reminderId", auth, async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { reminderDateTime, reminderType, message } = req.body;
    const userId = req.userId;

    const reminderRef = db.collection("reminders").doc(reminderId);
    const reminderDoc = await reminderRef.get();

    if (!reminderDoc.exists || reminderDoc.data().userId !== userId) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    const updateData = {};
    if (reminderDateTime)
      updateData.reminderDateTime = new Date(reminderDateTime).toISOString();
    if (reminderType) updateData.reminderType = reminderType;
    if (message) updateData.message = message;
    updateData.updatedAt = new Date().toISOString();

    await reminderRef.update(updateData);

    if (scheduledJobs.has(reminderId)) {
      scheduledJobs.get(reminderId).cancel();
      scheduledJobs.delete(reminderId);
    }

    const updatedReminder = {
      id: reminderId,
      ...reminderDoc.data(),
      ...updateData,
    };
    scheduleReminder(updatedReminder);

    res.json(updatedReminder);
  } catch (error) {
    console.error("Error updating reminder:", error);
    res.status(500).json({ message: "Failed to update reminder" });
  }
});

router.delete("/:reminderId", auth, async (req, res) => {
  try {
    const { reminderId } = req.params;
    const userId = req.userId;

    const reminderRef = db.collection("reminders").doc(reminderId);
    const reminderDoc = await reminderRef.get();

    if (!reminderDoc.exists || reminderDoc.data().userId !== userId) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    await reminderRef.delete();

    if (scheduledJobs.has(reminderId)) {
      scheduledJobs.get(reminderId).cancel();
      scheduledJobs.delete(reminderId);
    }

    res.json({ message: "Reminder deleted successfully" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({ message: "Failed to delete reminder" });
  }
});

router.get("/notifications", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, unreadOnly = false } = req.query;

    let query = db
      .collection("notifications")
      .where("userId", "==", userId);

    query = query.orderBy("createdAt", "desc").limit(parseInt(limit));

    const snapshot = await query.get();
    let notifications = [];

    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    if (unreadOnly === "true") {
      notifications = notifications.filter(n => n.isRead === false);
    }

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.patch("/notifications/:notificationId/read", auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    const notificationRef = db.collection("notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists || notificationDoc.data().userId !== userId) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await notificationRef.update({
      isRead: true,
      readAt: new Date().toISOString(),
    });

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

router.delete("/notifications/:notificationId", auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    const notificationRef = db.collection("notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists || notificationDoc.data().userId !== userId) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await notificationRef.delete();
    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

const scheduledJobs = new Map();

function scheduleReminder(reminder) {
  const reminderDate = new Date(reminder.reminderDateTime);

  if (reminderDate <= new Date()) {
    return;
  }

  const job = schedule.scheduleJob(reminderDate, async () => {
    try {
      const notificationData = {
        id: uuidv4(),
        userId: reminder.userId,
        todoId: reminder.todoId,
        reminderId: reminder.id,
        title: "Task Reminder",
        message: reminder.message,
        type: "reminder",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await db
        .collection("notifications")
        .doc(notificationData.id)
        .set(notificationData);

      await db.collection("reminders").doc(reminder.id).update({
        isTriggered: true,
        triggeredAt: new Date().toISOString(),
      });

      scheduledJobs.delete(reminder.id);
    } catch (error) {
      console.error(`Error triggering reminder ${reminder.id}:`, error);
    }
  });

  scheduledJobs.set(reminder.id, job);
}

// Initialize existing reminders on server start
async function initializeReminders() {
  try {
    const snapshot = await db
      .collection("reminders")
      .where("isTriggered", "==", false)
      .get();

    snapshot.forEach((doc) => {
      const reminder = { id: doc.id, ...doc.data() };
      scheduleReminder(reminder);
    });

  } catch (error) {
    console.error("Error initializing reminders:", error);
  }
}

initializeReminders();

module.exports = router;
