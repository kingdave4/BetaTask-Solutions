require('dotenv').config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const reminderRoutes = require("./routes/reminders");
const auth = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/reminders", reminderRoutes);

app.get("/", (req, res) => {
  res.send("Todo Backend is running!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
