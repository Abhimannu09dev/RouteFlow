import dotenv from "dotenv";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

dotenv.config();

const app = express();
const server = http.createServer(app);

const uploadDir = path.resolve("uploads");

// CORS options
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    process.env.FRONTEND_URL || "http://localhost:3000",
  ],
  credentials: true,
};

// Imports
import { auth } from "./middleware/auth.js";
import { initWebSocket } from "./websocket/index.js";
import User from "./models/userModel.js";
import routes from "./routes/index.js";

// App config
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Serve uploads folder (FIXED)
app.use("/uploads", express.static(uploadDir));

// Test route
app.get("/", (req, res) => {
  res.send("RouteFlow API is running");
});

// Auth route
app.get("/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "companyName email role isAccountVerified submittedForVerification",
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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

// Logout
app.post("/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false, // set true in production (HTTPS)
    sameSite: "lax",
  });

  res.status(200).json({ message: "Logged out successfully" });
});

// Routes
app.use("/", routes);

// DB + Server start
if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    // Initialize WebSocket
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });
