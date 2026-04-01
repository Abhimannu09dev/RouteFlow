import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/messageModel.js";
import Order from "../models/orderModel.js";

let io = null;

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

  // Auth middleware — verify JWT from cookie
  io.use((socket, next) => {
    try {
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
    socket.join(socket.userRole);

    // Client emits: { orderId }
    socket.on("join_chat", async ({ orderId }) => {
      try {
        if (!orderId) return;

        const order = await Order.findById(orderId);
        if (!order) return;

        const allowedStatuses = ["accepted", "in transit", "delivered"];
        if (!allowedStatuses.includes(order.status)) return;

        const manufacturerId = order.manufacturer?.toString();
        const logisticsId = order.logistics?.toString();
        const uid = userId.toString();

        // Only the two participants may join this chat room
        if (uid !== manufacturerId && uid !== logisticsId) return;

        socket.join(`chat_${orderId}`);
        console.log(`User ${userId} joined chat room for order ${orderId}`);
      } catch (err) {
        console.error("join_chat error:", err);
      }
    });

    //  Chat: leave a chat room
    socket.on("leave_chat", ({ orderId }) => {
      if (!orderId) return;
      socket.leave(`chat_${orderId}`);
    });

    socket.on("send_message", async ({ orderId, receiverId, content }) => {
      try {
        if (!orderId || !receiverId || !content?.trim()) return;

        const order = await Order.findById(orderId);
        if (!order) return;

        // Reject if order is delivered (chat closed)
        if (order.status === "delivered") {
          socket.emit("chat_error", {
            message: "Chat is closed for delivered orders",
          });
          return;
        }

        const allowedStatuses = ["accepted", "in transit"];
        if (!allowedStatuses.includes(order.status)) {
          socket.emit("chat_error", { message: "Chat not available" });
          return;
        }

        const manufacturerId = order.manufacturer?.toString();
        const logisticsId = order.logistics?.toString();
        const uid = userId.toString();

        if (uid !== manufacturerId && uid !== logisticsId) {
          socket.emit("chat_error", { message: "Not authorized" });
          return;
        }

        // Persist message to MongoDB
        const message = await Message.create({
          orderId,
          senderId: userId,
          receiverId,
          content: content.trim(),
        });

        await message.populate("senderId", "companyName email role");
        io.to(`chat_${orderId}`).emit("message_received", message);
      } catch (err) {
        console.error("send_message socket error:", err);
        socket.emit("chat_error", { message: "Failed to send message" });
      }
    });

    //  Chat: mark messages as read
    socket.on("mark_read", async ({ orderId }) => {
      try {
        if (!orderId) return;
        await Message.updateMany(
          { orderId, receiverId: userId, isRead: false },
          { $set: { isRead: true } },
        );
        // Notify the sender their messages were read
        const order = await Order.findById(orderId).select(
          "manufacturer logistics",
        );
        if (!order) return;
        const uid = userId.toString();
        const otherId =
          order.manufacturer?.toString() === uid
            ? order.logistics?.toString()
            : order.manufacturer?.toString();
        if (otherId) {
          const otherSocketId = userSocketMap[otherId];
          if (otherSocketId) {
            io.to(otherSocketId).emit("messages_read", { orderId });
          }
        }
      } catch (err) {
        console.error("mark_read socket error:", err);
      }
    });

    //  Chat: close chat when order is delivered
    socket.on("disconnect", () => {
      delete userSocketMap[userId];
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

//  Notification helpers
const notifyUser = (userId, notification) => {
  if (!io) return;
  const socketId = userSocketMap[userId?.toString()];
  if (socketId) {
    io.to(socketId).emit("notification", notification);
  }
};

const notifyRole = (role, notification) => {
  if (!io) return;
  io.to(role).emit("notification", notification);
};

const closeChatRoom = (orderId) => {
  if (!io) return;
  io.to(`chat_${orderId}`).emit("chat_closed", {
    orderId,
    message: "This order has been delivered. The chat is now closed.",
  });
};

const getIO = () => io;

export { initWebSocket, notifyUser, notifyRole, closeChatRoom, getIO };
