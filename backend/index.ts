import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";

dotenv.config();

import "./db/database.js";

const app = express();
const server = http.createServer(app);

const uploadDir = path.resolve("uploads");

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    process.env["FRONTEND_URL"] ?? "http://localhost:3000",
  ],
  credentials: true,
};

import { auth } from "./middleware/auth.js";
import { initWebSocket } from "./websocket/index.js";
import User from "./models/userModel.js";
import routes from "./routes/index.js";

const PORT = process.env["PORT"] ?? 5000;
const JWT_SECRET = process.env["JWT_SECRET"];

app.use(cookieParser());
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.get("/uploads/:userId/:filename", auth, (req: Request, res: Response): void => {
  const { userId, filename } = req.params as { userId: string; filename: string };
  const requestingUserId = String(req.user.id);
  const isAdmin = req.user.role === "admin";

  if (requestingUserId !== userId && !isAdmin) {
    res.status(403).json({ success: false, message: "Not authorized" });
    return;
  }

  const filePath = path.join(uploadDir, userId, filename);
  if (!filePath.startsWith(uploadDir + path.sep)) {
    res.status(400).json({ success: false, message: "Invalid file path" });
    return;
  }
  res.sendFile(filePath, (err?: Error) => {
    if (err) res.status(404).json({ success: false, message: "File not found" });
  });
});

app.get("/", (_req: Request, res: Response): void => {
  res.send("RouteFlow API is running");
});

app.get("/auth/me", auth, (req: Request, res: Response): void => {
  try {
    const user = User.findById(req.user.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    res.status(200).json({
      id: user.id,
      companyName: user.companyName,
      email: user.email,
      role: user.role,
      isAccountVerified: user.isAccountVerified,
      submittedForVerification: user.submittedForVerification,
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/auth/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: process.env["NODE_ENV"] === "production" ? "none" : "lax",
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

  // Keep Render free-tier awake: ping own health endpoint every 5 min
  if (process.env["NODE_ENV"] === "production") {
    const selfUrl = process.env["SELF_URL"] ?? `http://localhost:${PORT}`;
    setInterval(() => {
      fetch(`${selfUrl}/`).catch(() => {});
    }, 5 * 60 * 1000);
  }
});
