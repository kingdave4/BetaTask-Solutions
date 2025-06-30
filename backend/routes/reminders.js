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
      recurrence, // Add recurrence field
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
      recurrence: recurrence || null, // Store recurrence data
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

// Helper function to calculate the next occurrence date
function calculateNextOccurrence(currentDateTime, recurrence) {
  const currentDate = new Date(currentDateTime);
  const { interval, customInterval, endCondition, endCount, endDate } = recurrence;

  let nextDate = new Date(currentDate);

  // Calculate the next date based on the interval
  switch (interval) {
    case "daily":
      nextDate.setDate(currentDate.getDate() + 1);
      break;
    case "weekly":
      nextDate.setDate(currentDate.getDate() + 7);
      break;
    case "monthly":
      nextDate.setMonth(currentDate.getMonth() + 1);
      // Handle end of month issues (e.g., Jan 31 -> Feb 28/29)
      if (nextDate.getDate() !== currentDate.getDate()) {
          nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0); // Set to last day of the target month
      }
      break;
    case "yearly":
      nextDate.setFullYear(currentDate.getFullYear() + 1);
      // Handle leap year issues (e.g., Feb 29 -> Feb 28)
       if (nextDate.getDate() !== currentDate.getDate()) {
          nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0); // Set to last day of the target month
      }
      break;
    case "custom":
      if (!customInterval) return null; // Invalid recurrence
      const { unit, value, daysOfWeek, dayOfMonth, monthOfYear } = customInterval;
      switch (unit) {
        case "day":
          nextDate.setDate(currentDate.getDate() + value);
          break;
        case "week":
          nextDate.setDate(currentDate.getDate() + (value * 7));
          // If specific days of the week are provided, find the next valid day
          if (daysOfWeek && daysOfWeek.length > 0) {
              let foundNextDay = false;
              while (!foundNextDay) {
                  nextDate.setDate(nextDate.getDate() + 1);
                  if (daysOfWeek.includes(nextDate.getDay())) {
                      foundNextDay = true;
                  }
              }
          }
          break;
        case "month":
           nextDate.setMonth(currentDate.getMonth() + value);
           // Handle end of month issues
           if (nextDate.getDate() !== currentDate.getDate()) {
              nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
           }
           // If a specific day of the month is provided, set the date
           if (dayOfMonth !== undefined && dayOfMonth !== null) {
               const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
               nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
           }
          break;
        case "year":
          nextDate.setFullYear(currentDate.getFullYear() + value);
          // Handle leap year issues
          if (nextDate.getDate() !== currentDate.getDate()) {
              nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
          }
          // If a specific month and day are provided, set them
          if (monthOfYear !== undefined && monthOfYear !== null && dayOfMonth !== undefined && dayOfMonth !== null) {
              nextDate.setMonth(monthOfYear - 1); // Month is 0-indexed
              const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
          }
          break;
        default:
          return null; // Invalid custom interval unit
      }
      break;
    default:
      return null; // Invalid interval
  }

  // Ensure the time component is the same as the original reminder
  nextDate.setHours(currentDate.getHours());
  nextDate.setMinutes(currentDate.getMinutes());
  nextDate.setSeconds(currentDate.getSeconds());
  nextDate.setMilliseconds(currentDate.getMilliseconds());


  // Check end conditions
  if (endCondition === "untilDate" && nextDate > new Date(endDate)) {
    return null; // Recurrence ends before the next calculated date
  }

  return nextDate;
}


function scheduleReminder(reminder) {
  const reminderDate = new Date(reminder.reminderDateTime);
  const now = new Date();

  // If the reminder date is in the past and it's a recurring reminder,
  // calculate the next occurrence from *now* and schedule that instead.
  if (reminderDate <= now && reminder.recurrence) {
      let nextOccurrenceDate = new Date(reminder.reminderDateTime);
      let shouldSchedule = false;
      let occurrenceCount = reminder.occurrenceCount || 0; // Get current count

      // Calculate the next occurrence date that is in the future
      while (nextOccurrenceDate <= now) {
          const calculatedDate = calculateNextOccurrence(nextOccurrenceDate.toISOString(), reminder.recurrence);
          if (!calculatedDate) {
              shouldSchedule = false; // Cannot calculate next occurrence
              break;
          }
          nextOccurrenceDate = calculatedDate;
          occurrenceCount++; // Increment count for each skipped occurrence

          // Check end conditions while calculating future occurrences
          if (reminder.recurrence.endCondition === "untilDate" && nextOccurrenceDate > new Date(reminder.recurrence.endDate)) {
              shouldSchedule = false;
              break;
          }
           if (reminder.recurrence.endCondition === "count" && occurrenceCount >= reminder.recurrence.endCount) {
               shouldSchedule = false;
               break;
           }

          shouldSchedule = true; // Found a future occurrence
      }


      if (shouldSchedule) {
          console.log(`Reminder ${reminder.id} was in the past, scheduling next occurrence at ${nextOccurrenceDate.toISOString()}`);
          // Update the existing reminder with the next occurrence date and updated count
          db.collection("reminders").doc(reminder.id).update({
              reminderDateTime: nextOccurrenceDate.toISOString(),
              isTriggered: false, // Reset triggered status
              occurrenceCount: occurrenceCount, // Update occurrence count
              // Keep recurrence data
          })
          .then(() => {
              // Reschedule the updated reminder
              scheduleReminder({ ...reminder, reminderDateTime: nextOccurrenceDate.toISOString(), isTriggered: false, occurrenceCount: occurrenceCount });
          })
          .catch(error => console.error(`Error updating reminder ${reminder.id} for next occurrence:`, error));
      } else {
           console.log(`Recurring reminder ${reminder.id} has no future occurrences.`);
           // Mark the reminder as ended
            db.collection("reminders").doc(reminder.id).update({
                isTriggered: true, // Mark the last one as triggered (even if it was in the past)
                triggeredAt: new Date().toISOString(),
                recurrence: null, // Remove recurrence data
            }).catch(error => console.error(`Error marking ended recurring reminder ${reminder.id}:`, error));
      }
      return; // Don't schedule the past date
  } else if (reminderDate <= now && !reminder.recurrence) {
      // If it's a non-recurring reminder in the past, just return.
      return;
  }


  // Schedule the reminder for the calculated or original future date
  const job = schedule.scheduleJob(reminderDate, async () => {
    try {
      // Fetch the latest reminder data in case it was updated
      const reminderDoc = await db.collection("reminders").doc(reminder.id).get();
      if (!reminderDoc.exists) {
          console.log(`Reminder ${reminder.id} not found, cancelling job.`);
          scheduledJobs.delete(reminder.id);
          return;
      }
      const currentReminder = { id: reminderDoc.id, ...reminderDoc.data() };


      const notificationData = {
        id: uuidv4(),
        userId: currentReminder.userId,
        todoId: currentReminder.todoId,
        reminderId: currentReminder.id,
        title: "Task Reminder",
        message: currentReminder.message,
        type: "reminder",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await db
        .collection("notifications")
        .doc(notificationData.id)
        .set(notificationData);

      // If it's a recurring reminder, calculate the next occurrence and update the document
      if (currentReminder.recurrence) {
        const nextOccurrenceDate = calculateNextOccurrence(currentReminder.reminderDateTime, currentReminder.recurrence);

        let shouldContinueRecurrence = true;
        let nextOccurrenceCount = (currentReminder.occurrenceCount || 0) + 1; // Increment count for the next instance

        // Check end conditions
        if (currentReminder.recurrence.endCondition === "count") {
            if (nextOccurrenceCount > currentReminder.recurrence.endCount) {
                shouldContinueRecurrence = false;
            }
        }

        if (currentReminder.recurrence.endCondition === "untilDate" && nextOccurrenceDate && new Date(nextOccurrenceDate) > new Date(currentReminder.recurrence.endDate)) {
             shouldContinueRecurrence = false;
        }

        if (!nextOccurrenceDate) {
             shouldContinueRecurrence = false; // Cannot calculate next date
        }


        if (shouldContinueRecurrence) {
             console.log(`Scheduling next occurrence for reminder ${currentReminder.id} at ${nextOccurrenceDate.toISOString()}`);
             // Update the existing reminder with the next occurrence date and reset triggered status
             await db.collection("reminders").doc(currentReminder.id).update({
                 reminderDateTime: nextOccurrenceDate.toISOString(),
                 isTriggered: false, // Reset triggered status
                 triggeredAt: null, // Clear triggered time
                 occurrenceCount: nextOccurrenceCount, // Update occurrence count
             });
             // Reschedule the updated reminder
             scheduleReminder({ ...currentReminder, reminderDateTime: nextOccurrenceDate.toISOString(), isTriggered: false, triggeredAt: null, occurrenceCount: nextOccurrenceCount });
        } else {
             console.log(`Recurring reminder ${currentReminder.id} ended.`);
             // Mark the reminder as ended or delete it
             await db.collection("reminders").doc(currentReminder.id).update({
                 isTriggered: true, // Mark the last one as triggered
                 triggeredAt: new Date().toISOString(),
                 recurrence: null, // Remove recurrence data
             });
        }
      } else {
          // For non-recurring reminders, just mark as triggered
           await db.collection("reminders").doc(currentReminder.id).update({
             isTriggered: true,
             triggeredAt: new Date().toISOString(),
           });
      }


      scheduledJobs.delete(currentReminder.id); // Remove the current job from the map
    } catch (error) {
      console.error(`Error triggering reminder ${reminder.id}:`, error);
    }
  });

  scheduledJobs.set(reminder.id, job);
  console.log(`Scheduled reminder ${reminder.id} for ${reminderDate.toISOString()}`);
}


function scheduleReminder(reminder) {
  const reminderDate = new Date(reminder.reminderDateTime);
  const now = new Date();

  // If the reminder date is in the past and it's a recurring reminder,
  // calculate the next occurrence from *now* and schedule that instead.
  if (reminderDate <= now && reminder.recurrence) {
      let nextOccurrenceDate = new Date(reminder.reminderDateTime);
      let shouldSchedule = false;

      // Calculate the next occurrence date that is in the future
      while (nextOccurrenceDate <= now) {
          const calculatedDate = calculateNextOccurrence(nextOccurrenceDate.toISOString(), reminder.recurrence);
          if (!calculatedDate) {
              shouldSchedule = false; // Cannot calculate next occurrence
              break;
          }
          nextOccurrenceDate = calculatedDate;

          // Check end conditions while calculating future occurrences
          if (reminder.recurrence.endCondition === "untilDate" && nextOccurrenceDate > new Date(reminder.recurrence.endDate)) {
              shouldSchedule = false;
              break;
          }
           // TODO: Implement endCount logic here as well, requires tracking occurrences.
           // For now, we'll rely on the endCount check in the job callback.

          shouldSchedule = true; // Found a future occurrence
      }


      if (shouldSchedule) {
          console.log(`Reminder ${reminder.id} was in the past, scheduling next occurrence at ${nextOccurrenceDate.toISOString()}`);
          // Update the existing reminder with the next occurrence date
          db.collection("reminders").doc(reminder.id).update({
              reminderDateTime: nextOccurrenceDate.toISOString(),
              isTriggered: false, // Reset triggered status
              // Keep recurrence data
          })
          .then(() => {
              // Reschedule the updated reminder
              scheduleReminder({ ...reminder, reminderDateTime: nextOccurrenceDate.toISOString(), isTriggered: false });
          })
          .catch(error => console.error(`Error updating reminder ${reminder.id} for next occurrence:`, error));
      } else {
           console.log(`Recurring reminder ${reminder.id} has no future occurrences.`);
           // Optionally delete the reminder if it has no future occurrences
           // db.collection("reminders").doc(reminder.id).delete().catch(error => console.error(`Error deleting ended recurring reminder ${reminder.id}:`, error));
      }
      return; // Don't schedule the past date
  } else if (reminderDate <= now && !reminder.recurrence) {
      // If it's a non-recurring reminder in the past, just return.
      return;
  }


  // Schedule the reminder for the calculated or original future date
  const job = schedule.scheduleJob(reminderDate, async () => {
    try {
      // Fetch the latest reminder data in case it was updated
      const reminderDoc = await db.collection("reminders").doc(reminder.id).get();
      if (!reminderDoc.exists) {
          console.log(`Reminder ${reminder.id} not found, cancelling job.`);
          scheduledJobs.delete(reminder.id);
          return;
      }
      const currentReminder = { id: reminderDoc.id, ...reminderDoc.data() };


      const notificationData = {
        id: uuidv4(),
        userId: currentReminder.userId,
        todoId: currentReminder.todoId,
        reminderId: currentReminder.id,
        title: "Task Reminder",
        message: currentReminder.message,
        type: "reminder",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await db
        .collection("notifications")
        .doc(notificationData.id)
        .set(notificationData);

      // If it's a recurring reminder, calculate the next occurrence and update the document
      if (currentReminder.recurrence) {
        const nextOccurrenceDate = calculateNextOccurrence(currentReminder.reminderDateTime, currentReminder.recurrence);

        let shouldContinueRecurrence = true;

        // Check end conditions
        if (currentReminder.recurrence.endCondition === "count") {
            // This requires tracking occurrences. Let's add an occurrenceCount field
            // to the reminder document.
            const currentOccurrenceCount = currentReminder.occurrenceCount || 0;
            if (currentOccurrenceCount + 1 >= currentReminder.recurrence.endCount) {
                shouldContinueRecurrence = false;
            } else {
                 // Increment occurrence count for the next instance
                 await db.collection("reminders").doc(currentReminder.id).update({
                     occurrenceCount: currentOccurrenceCount + 1
                 });
            }
        }

        if (currentReminder.recurrence.endCondition === "untilDate" && nextOccurrenceDate && new Date(nextOccurrenceDate) > new Date(currentReminder.recurrence.endDate)) {
             shouldContinueRecurrence = false;
        }

        if (!nextOccurrenceDate) {
             shouldContinueRecurrence = false; // Cannot calculate next date
        }


        if (shouldContinueRecurrence) {
             console.log(`Scheduling next occurrence for reminder ${currentReminder.id} at ${nextOccurrenceDate.toISOString()}`);
             // Update the existing reminder with the next occurrence date and reset triggered status
             await db.collection("reminders").doc(currentReminder.id).update({
                 reminderDateTime: nextOccurrenceDate.toISOString(),
                 isTriggered: false, // Reset triggered status
                 triggeredAt: null, // Clear triggered time
             });
             // Reschedule the updated reminder
             scheduleReminder({ ...currentReminder, reminderDateTime: nextOccurrenceDate.toISOString(), isTriggered: false, triggeredAt: null });
        } else {
             console.log(`Recurring reminder ${currentReminder.id} ended.`);
             // Mark the reminder as ended or delete it
             await db.collection("reminders").doc(currentReminder.id).update({
                 isTriggered: true, // Mark the last one as triggered
                 triggeredAt: new Date().toISOString(),
                 recurrence: null, // Remove recurrence data
             });
        }
      } else {
          // For non-recurring reminders, just mark as triggered
           await db.collection("reminders").doc(currentReminder.id).update({
             isTriggered: true,
             triggeredAt: new Date().toISOString(),
           });
      }


      scheduledJobs.delete(currentReminder.id); // Remove the current job from the map
    } catch (error) {
      console.error(`Error triggering reminder ${reminder.id}:`, error);
    }
  });

  scheduledJobs.set(reminder.id, job);
  console.log(`Scheduled reminder ${reminder.id} for ${reminderDate.toISOString()}`);
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
