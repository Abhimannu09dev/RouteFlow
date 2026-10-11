import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import Message from "../models/messageModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import type { Notification, UserRole } from "../types/index.js";

// ponytail: in-memory socket map — for horizontal scaling, replace with @socket.io/redis-adapter

interface AuthSocket extends Socket {
  userId: number;
  userRole: UserRole;
}

interface JwtPayload {
  id: number;
  role: UserRole;
}

let io: Server | null = null;
const userSocketMap = new Map<number, Set<string>>();

export function initWebSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        process.env["FRONTEND_URL"] ?? "http://localhost:3000",
      ],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers["cookie"] ?? "";
      const tokenFromCookie = cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];
      const token = tokenFromCookie ?? (socket.handshake.auth as Record<string, unknown>)["token"] as string | undefined;
      if (!token) { next(new Error("Authentication required")); return; }
      const decoded = jwt.verify(token, process.env["JWT_SECRET"] as string) as JwtPayload;
      const user = User.findById(decoded.id);
      if (!user?.isActive) { next(new Error("Account is deactivated")); return; }
      (socket as AuthSocket).userId = decoded.id;
      (socket as AuthSocket).userRole = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AuthSocket;
    const userId = socket.userId;
    if (!userSocketMap.has(userId)) userSocketMap.set(userId, new Set());
    userSocketMap.get(userId)!.add(socket.id); // eslint-disable-line @typescript-eslint/no-non-null-assertion
    console.log(`Socket connected: user ${userId} (${socket.userRole})`);
    void socket.join(socket.userRole);

    socket.on("join_chat", ({ orderId }: { orderId: string | number }) => {
      try {
        if (!orderId) return;
        const order = Order.findById(parseInt(String(orderId), 10));
        if (!order) return;

        const allowedStatuses = ["accepted", "in transit", "delivered"] as const;
        if (!allowedStatuses.includes(order.status as (typeof allowedStatuses)[number])) return;

        const manufacturerId = String(order.manufacturer?.id);
        const logisticsId = String(order.logistics?.id);
        const uid = String(userId);

        if (uid !== manufacturerId && uid !== logisticsId) return;

        void socket.join(`chat_${order.id}`);
        console.log(`User ${userId} joined chat room for order ${order.id}`);
      } catch (err) {
        console.error("join_chat error:", err);
      }
    });

    socket.on("leave_chat", ({ orderId }: { orderId: string | number }) => {
      if (!orderId) return;
      void socket.leave(`chat_${orderId}`);
    });

    socket.on("send_message", ({ orderId, content }: { orderId: string | number; content: unknown }) => {
      try {
        if (!orderId || typeof content !== "string" || !content.trim()) return;

        const order = Order.findById(parseInt(String(orderId), 10));
        if (!order) return;

        if (order.status === "delivered") {
          socket.emit("chat_error", { message: "Chat is closed for delivered orders" });
          return;
        }

        const allowedStatuses = ["accepted", "in transit"] as const;
        if (!allowedStatuses.includes(order.status as (typeof allowedStatuses)[number])) {
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

        const derivedReceiverId =
          uid === manufacturerId ? parseInt(logisticsId, 10) : parseInt(manufacturerId, 10);
        if (!derivedReceiverId) {
          socket.emit("chat_error", { message: "Unable to determine receiver" });
          return;
        }

        const message = Message.create({
          orderId: order.id,
          senderId: userId,
          receiverId: derivedReceiverId,
          content: content.trim(),
        });
        // io is guaranteed non-null here (we're inside io.on("connection"))
        io?.to(`chat_${order.id}`).emit("message_received", message);
      } catch (err) {
        console.error("send_message socket error:", err);
        socket.emit("chat_error", { message: "Failed to send message" });
      }
    });

    socket.on("mark_read", ({ orderId }: { orderId: string | number }) => {
      try {
        if (!orderId) return;
        const oid = parseInt(String(orderId), 10);
        Message.markRead(oid, userId);

        const order = Order.findById(oid);
        if (!order) return;
        const uid = String(userId);
        const otherId =
          String(order.manufacturer?.id) === uid
            ? String(order.logistics?.id)
            : String(order.manufacturer?.id);
        if (otherId) {
          const otherSockets = userSocketMap.get(parseInt(otherId, 10));
          if (otherSockets && otherSockets.size > 0) {
            [...otherSockets].forEach((sid) =>
              io?.to(sid).emit("messages_read", { orderId: oid }),
            );
          }
        }
      } catch (err) {
        console.error("mark_read socket error:", err);
      }
    });

    socket.on("disconnect", () => {
      const sockets = userSocketMap.get(userId);
      sockets?.delete(socket.id);
      if (sockets?.size === 0) userSocketMap.delete(userId);
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

export function notifyUser(userId: number, notification: Notification): void {
  if (!io) return;
  const sockets = userSocketMap.get(userId);
  if (sockets && sockets.size > 0) {
    sockets.forEach((socketId) => io?.to(socketId).emit("notification", notification));
  } else {
    console.warn(`notifyUser: no socket found for user ${userId}`);
  }
}

export function notifyRole(role: UserRole, notification: Notification): void {
  if (!io) return;
  io.to(role).emit("notification", notification);
}

export function closeChatRoom(orderId: number): void {
  if (!io) return;
  io.to(`chat_${orderId}`).emit("chat_closed", {
    orderId,
    message: "This order has been delivered. The chat is now closed.",
  });
}

export function getIO(): Server | null {
  return io;
}
