require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const reminderRoutes = require("./routes/reminders");
const recurringTaskRoutes = require("./routes/recurringTasks");
const auth = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/reminders", reminderRoutes);
app.use("/recurring-tasks", recurringTaskRoutes);

app.get("/", (req, res) => {
  res.send("Todo Backend is running!");
});

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  // Restart recurring task schedules on server start
  try {
    await recurringTaskRoutes.restartRecurringSchedules();
    console.log("Recurring task schedules restarted successfully");
  } catch (error) {
    console.error("Error restarting recurring schedules:", error);
  }
});

module.exports = app;
