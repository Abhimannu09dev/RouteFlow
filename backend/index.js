require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { auth } = require("./middleware/auth");
const User = require("./models/userModel");

const { initWebSocket } = require("./websocket");
const routes = require("./routes");

// App Setup
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      process.env.FRONTEND_URL || "http://localhost:3000",
    ],
    credentials: true,
  }),
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Basic Route
app.get("/", (req, res) => {
  res.send("RouteFlow API is running");
});

app.get("/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "companyName email role isAccountVerified submittedForVerification",
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({
      id: user._id,
      companyName: user.companyName,
      email: user.email,
      role: user.role,
      isAccountVerified: user.isAccountVerified,
      submittedForVerification: user.submittedForVerification,
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.use("/", routes);

// Logout
app.post("/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

// Database + Server Start
if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    initWebSocket(server);
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });
