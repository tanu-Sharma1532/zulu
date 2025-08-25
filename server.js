require("dotenv").config();
const express = require("express");
const sequelize = require("./config/dataBase");
const userRoutes = require("./routes/userRoutes");

const app = express();
app.use(express.json());

app.use("/api/v1/user", userRoutes);

// DB Connection Test
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to MySQL database!");
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }
})();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`⚡ Server running at http://localhost:${PORT}`);
});
