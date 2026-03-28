const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

// Map of userId -> socket.id for targeted notifications
const userSocketMap = {};

function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        process.env.FRONTEND_URL || "http://localhost:3000",
      ],
      credentials: true,
    },
  });

  //  Auth middleware — verify JWT from cookie or handshake auth 
  io.use((socket, next) => {
    try {
      // Try cookie first, then handshake auth token
      const cookieHeader = socket.handshake.headers.cookie || "";
      const tokenFromCookie = cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];

      const token = tokenFromCookie || socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    userSocketMap[userId] = socket.id;
    console.log(`Socket connected: user ${userId} (${socket.userRole})`);

    // Join role-based room for broadcast notifications
    socket.join(socket.userRole); // "manufacturer" or "logistics"

    socket.on("disconnect", () => {
      delete userSocketMap[userId];
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

function notifyUser(userId, notification) {
  if (!io) return;
  const socketId = userSocketMap[userId?.toString()];
  if (socketId) {
    io.to(socketId).emit("notification", notification);
  }
}

function notifyRole(role, notification) {
  if (!io) return;
  io.to(role).emit("notification", notification);
}

function getIO() {
  return io;
}

module.exports = { initWebSocket, notifyUser, notifyRole, getIO };
