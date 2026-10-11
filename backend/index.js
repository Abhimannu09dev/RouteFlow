import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";

dotenv.config();

// Initialize SQLite database (creates tables and indexes on first run)
import "./db/database.js";

const app = express();
const server = http.createServer(app);

const uploadDir = path.resolve("uploads");

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    process.env.FRONTEND_URL || "http://localhost:3000",
  ],
  credentials: true,
};

import { auth } from "./middleware/auth.js";
import { initWebSocket } from "./websocket/index.js";
import User from "./models/userModel.js";
import routes from "./routes/index.js";

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cookieParser());
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.get("/uploads/:userId/:filename", auth, (req, res) => {
  const { userId, filename } = req.params;
  const requestingUserId = String(req.user.id);
  const isAdmin = req.user.role === "admin";

  if (requestingUserId !== userId && !isAdmin) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const filePath = path.join(uploadDir, userId, filename);
  if (!filePath.startsWith(uploadDir + path.sep)) {
    return res.status(400).json({ success: false, message: "Invalid file path" });
  }
  res.sendFile(filePath, (err) => {
    if (err) return res.status(404).json({ success: false, message: "File not found" });
  });
});

app.get("/", (req, res) => {
  res.send("RouteFlow API is running");
});

app.get("/auth/me", auth, (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({
      id: user.id,
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

app.post("/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

app.use("/", routes);

if (!JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

initWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
