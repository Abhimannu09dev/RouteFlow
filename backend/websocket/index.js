import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/messageModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";

let io = null;

const userSocketMap = {};

// NOTE: This is an in-memory Map. For horizontal scaling (multiple Node processes,
// PM2 cluster, Kubernetes pods), replace with @socket.io/redis-adapter and a Redis
// instance. Without Redis, users connected to different processes won't receive
// real-time notifications from each other.

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

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const tokenFromCookie = cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];
      const token = tokenFromCookie || socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = User.findById(decoded.id);
      if (!user?.isActive) return next(new Error("Account is deactivated"));
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
    userSocketMap[userId].add(socket.id);
    console.log(`Socket connected: user ${userId} (${socket.userRole})`);
    socket.join(socket.userRole);

    socket.on("join_chat", ({ orderId }) => {
      try {
        if (!orderId) return;
        const order = Order.findById(parseInt(orderId, 10));
        if (!order) return;

        const allowedStatuses = ["accepted", "in transit", "delivered"];
        if (!allowedStatuses.includes(order.status)) return;

        const manufacturerId = String(order.manufacturer?.id);
        const logisticsId = String(order.logistics?.id);
        const uid = String(userId);

        if (uid !== manufacturerId && uid !== logisticsId) return;

        socket.join(`chat_${order.id}`);
        console.log(`User ${userId} joined chat room for order ${order.id}`);
      } catch (err) {
        console.error("join_chat error:", err);
      }
    });

    socket.on("leave_chat", ({ orderId }) => {
      if (!orderId) return;
      socket.leave(`chat_${orderId}`);
    });

    socket.on("send_message", ({ orderId, content }) => {
      try {
        if (!orderId || !content?.trim()) return;

        const order = Order.findById(parseInt(orderId, 10));
        if (!order) return;

        if (order.status === "delivered") {
          socket.emit("chat_error", { message: "Chat is closed for delivered orders" });
          return;
        }

        const allowedStatuses = ["accepted", "in transit"];
        if (!allowedStatuses.includes(order.status)) {
          socket.emit("chat_error", { message: "Chat not available" });
          return;
        }

        const manufacturerId = String(order.manufacturer?.id);
        const logisticsId = String(order.logistics?.id);
        const uid = String(userId);

        if (uid !== manufacturerId && uid !== logisticsId) {
          socket.emit("chat_error", { message: "Not authorized" });
          return;
        }

        const derivedReceiverId = uid === manufacturerId ? parseInt(logisticsId, 10) : parseInt(manufacturerId, 10);
        if (!derivedReceiverId) {
          socket.emit("chat_error", { message: "Unable to determine receiver" });
          return;
        }

        const message = Message.create({ orderId: order.id, senderId: userId, receiverId: derivedReceiverId, content: content.trim() });
        io.to(`chat_${order.id}`).emit("message_received", message);
      } catch (err) {
        console.error("send_message socket error:", err);
        socket.emit("chat_error", { message: "Failed to send message" });
      }
    });

    socket.on("mark_read", ({ orderId }) => {
      try {
        if (!orderId) return;
        const oid = parseInt(orderId, 10);
        Message.markRead(oid, userId);

        const order = Order.findById(oid);
        if (!order) return;
        const uid = String(userId);
        const otherId = String(order.manufacturer?.id) === uid ? String(order.logistics?.id) : String(order.manufacturer?.id);
        if (otherId) {
          const otherSockets = userSocketMap[otherId];
          if (otherSockets?.size > 0) {
            [...otherSockets].forEach((sid) => io.to(sid).emit("messages_read", { orderId: oid }));
          }
        }
      } catch (err) {
        console.error("mark_read socket error:", err);
      }
    });

    socket.on("disconnect", () => {
      userSocketMap[userId]?.delete(socket.id);
      if (userSocketMap[userId]?.size === 0) delete userSocketMap[userId];
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

const notifyUser = (userId, notification) => {
  if (!io) return;
  const sockets = userSocketMap[String(userId)];
  if (sockets && sockets.size > 0) {
    sockets.forEach((socketId) => io.to(socketId).emit("notification", notification));
  } else {
    console.warn(`notifyUser: no socket found for user ${userId}`);
  }
};

const notifyRole = (role, notification) => {
  if (!io) return;
  io.to(role).emit("notification", notification);
};

const closeChatRoom = (orderId) => {
  if (!io) return;
  io.to(`chat_${orderId}`).emit("chat_closed", { orderId, message: "This order has been delivered. The chat is now closed." });
};

const getIO = () => io;

export { initWebSocket, notifyUser, notifyRole, closeChatRoom, getIO };
