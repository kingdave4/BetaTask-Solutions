const express = require("express");
const { db } = require("../firebase-admin");
const auth = require("../middleware/auth");
const schedule = require("node-schedule");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Store scheduled jobs
const scheduledRecurringJobs = new Map();

// Helper function to calculate next due date
function calculateNextDueDate(currentDueDate, recurring) {
  if (!currentDueDate || !recurring.interval) return null;

  const baseDate = new Date(currentDueDate);
  let nextDate = new Date(baseDate);

  switch (recurring.interval) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case "custom":
      if (recurring.customInterval) {
        const { unit, value } = recurring.customInterval;
        switch (unit) {
          case "day":
            nextDate.setDate(nextDate.getDate() + value);
            break;
          case "week":
            nextDate.setDate(nextDate.getDate() + value * 7);
            break;
          case "month":
            nextDate.setMonth(nextDate.getMonth() + value);
            break;
          case "year":
            nextDate.setFullYear(nextDate.getFullYear() + value);
            break;
        }
      }
      break;
  }

  return nextDate.toISOString().split("T")[0];
}

// Helper function to check if recurring task should end
function shouldEndRecurring(recurring, currentOccurrence, currentDate) {
  if (recurring.endCondition === "never") {
    return false;
  }

  if (recurring.endCondition === "count") {
    return currentOccurrence >= recurring.endCount;
  }

  if (recurring.endCondition === "untilDate") {
    return new Date(currentDate) >= new Date(recurring.endDate);
  }

  return false;
}

// Helper function to create next recurring task instance
async function createNextRecurringInstance(originalTask, userId) {
  try {
    const nextDueDate = calculateNextDueDate(
      originalTask.dueDate,
      originalTask.recurring
    );
    if (!nextDueDate) return;

    // Check if we should stop recurring
    const currentOccurrence = (originalTask.recurringOccurrence || 0) + 1;
    if (
      shouldEndRecurring(originalTask.recurring, currentOccurrence, nextDueDate)
    ) {
      // Remove the recurring schedule
      if (scheduledRecurringJobs.has(originalTask.id)) {
        scheduledRecurringJobs.get(originalTask.id).cancel();
        scheduledRecurringJobs.delete(originalTask.id);
      }
      return;
    }

    // Create new task instance
    const newTaskId = uuidv4();
    const newTask = {
      ...originalTask,
      id: newTaskId,
      dueDate: nextDueDate,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      recurringParentId: originalTask.recurringParentId || originalTask.id,
      recurringOccurrence: currentOccurrence,
      subtasks: originalTask.subtasks
        ? originalTask.subtasks.map((subtask) => ({
            ...subtask,
            id: uuidv4(),
            isCompleted: false,
          }))
        : [],
    };

    // Save to Firestore
    await db.collection("todos").doc(newTaskId).set(newTask);

    // Schedule the next instance
    scheduleNextRecurringTask(newTask, userId);

    console.log(
      `Created recurring task instance: ${newTaskId} for ${nextDueDate}`
    );
  } catch (error) {
    console.error("Error creating next recurring instance:", error);
  }
}

// Helper function to schedule the next recurring task
function scheduleNextRecurringTask(task, userId) {
  if (!task.dueDate || !task.recurring) return;

  const dueDate = new Date(task.dueDate + "T00:00:00");

  // Schedule job to create next instance at due date
  const job = schedule.scheduleJob(dueDate, async () => {
    await createNextRecurringInstance(task, userId);
  });

  if (job) {
    scheduledRecurringJobs.set(task.id, job);
    console.log(`Scheduled recurring task ${task.id} for ${dueDate}`);
  }
}

// POST /recurring-tasks - Create a recurring task schedule
router.post("/", auth, async (req, res) => {
  try {
    const { todoData, userId } = req.body;

    if (!todoData || !todoData.recurring || !todoData.recurring.interval) {
      return res.status(400).json({ message: "Invalid recurring task data" });
    }

    if (userId !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Schedule the recurring task
    scheduleNextRecurringTask(todoData, userId);

    res.status(201).json({
      message: "Recurring task scheduled successfully",
      taskId: todoData.id,
    });
  } catch (error) {
    console.error("Error creating recurring task schedule:", error);
    res
      .status(500)
      .json({ message: "Failed to create recurring task schedule" });
  }
});

// PUT /recurring-tasks/:todoId - Update a recurring task schedule
router.put("/:todoId", auth, async (req, res) => {
  try {
    const { todoId } = req.params;
    const { todoData, userId } = req.body;

    if (userId !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Cancel existing schedule
    if (scheduledRecurringJobs.has(todoId)) {
      scheduledRecurringJobs.get(todoId).cancel();
      scheduledRecurringJobs.delete(todoId);
    }

    // If still recurring, create new schedule
    if (todoData.recurring && todoData.recurring.interval) {
      scheduleNextRecurringTask(todoData, userId);
    }

    res.json({
      message: "Recurring task schedule updated successfully",
      taskId: todoId,
    });
  } catch (error) {
    console.error("Error updating recurring task schedule:", error);
    res
      .status(500)
      .json({ message: "Failed to update recurring task schedule" });
  }
});

// DELETE /recurring-tasks/:todoId - Remove a recurring task schedule
router.delete("/:todoId", auth, async (req, res) => {
  try {
    const { todoId } = req.params;

    // Cancel the scheduled job
    if (scheduledRecurringJobs.has(todoId)) {
      scheduledRecurringJobs.get(todoId).cancel();
      scheduledRecurringJobs.delete(todoId);
    }

    res.json({
      message: "Recurring task schedule removed successfully",
      taskId: todoId,
    });
  } catch (error) {
    console.error("Error removing recurring task schedule:", error);
    res
      .status(500)
      .json({ message: "Failed to remove recurring task schedule" });
  }
});

// Function to restart all recurring schedules on server start
async function restartRecurringSchedules() {
  try {
    const snapshot = await db
      .collection("todos")
      .where("recurring.interval", "!=", null)
      .where("isRecurringParent", "==", true)
      .get();

    snapshot.forEach((doc) => {
      const taskData = doc.data();
      if (taskData.userId) {
        scheduleNextRecurringTask(taskData, taskData.userId);
      }
    });

    console.log(`Restarted ${snapshot.size} recurring task schedules`);
  } catch (error) {
    console.error("Error restarting recurring schedules:", error);
  }
}

// Export the restart function for use in server.js
router.restartRecurringSchedules = restartRecurringSchedules;

module.exports = router;
