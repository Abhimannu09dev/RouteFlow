import type { Request, Response } from "express";
import Message from "../models/messageModel.js";
import Order from "../models/orderModel.js";
import { getIO } from "../websocket/index.js";
import type { OrderStatus, MessageFileType } from "../types/index.js";

const CHAT_ALLOWED_STATUSES: OrderStatus[] = ["accepted", "in transit", "delivered"];

class ChatError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function resolveOrderForChat(
  orderId: string,
  userId: number,
): { order: ReturnType<typeof Order.findById> & object; isClosed: boolean } {
  const order = Order.findById(parseInt(orderId, 10));
  if (!order) throw new ChatError("Order not found", 404);
  if (!CHAT_ALLOWED_STATUSES.includes(order.status)) throw new ChatError("Chat is not available for this order status", 403);

  const uid = String(userId);
  if (String(order.manufacturer?.id) !== uid && String(order.logistics?.id) !== uid) {
    throw new ChatError("You are not a participant of this order", 403);
  }

  return { order, isClosed: order.status === "delivered" };
}

export const getConversations = (req: Request, res: Response): void => {
  try {
    const { id: userId } = req.user;

    const orders = Order.findForParticipant(userId, CHAT_ALLOWED_STATUSES);
    const unreadMap = Message.unreadByOrder(userId);

    const conversations = orders.map((order) => {
      const isManufacturer = String(order.manufacturer?.id) === String(userId);
      const otherParty = isManufacturer ? order.logistics : order.manufacturer;

      const msgs = Message.findByOrderId(order.id);
      const lastMsg = msgs[msgs.length - 1] ?? null;

      return {
        orderId: order.id,
        orderTitle: order.productDetails ?? `Order #${order.orderId}`,
        orderStatus: order.status,
        isClosed: order.status === "delivered",
        otherParty,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              fileType: lastMsg.fileType,
              fileName: lastMsg.fileName,
              sentAt: lastMsg.createdAt,
              senderName: lastMsg.sender?.companyName ?? null,
            }
          : null,
        unreadCount: unreadMap.get(order.id) ?? 0,
      };
    });

    res.json({ success: true, conversations });
  } catch (error) {
    console.error("getConversations error:", error);
    if (error instanceof ChatError) {
      res.status(error.status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server error" });
    }
  }
};

export const getMessages = (req: Request, res: Response): void => {
  try {
    const { id: userId } = req.user;
    const { orderId } = req.params as { orderId: string };

    const { order, isClosed } = resolveOrderForChat(orderId, userId);

    const messages = Message.findByOrderId(order.id);
    Message.markRead(order.id, userId);

    res.json({
      success: true,
      messages,
      isClosed,
      orderStatus: order.status,
      participants: { manufacturer: order.manufacturer, logistics: order.logistics },
    });
  } catch (error) {
    console.error("getMessages error:", error);
    if (error instanceof ChatError) {
      res.status(error.status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server error" });
    }
  }
};

export const sendMessage = (req: Request, res: Response): void => {
  try {
    const { id: userId } = req.user;
    const { orderId } = req.params as { orderId: string };
    const { content } = req.body as { content?: string };

    const { order, isClosed } = resolveOrderForChat(orderId, userId);

    if (isClosed) {
      res.status(403).json({ success: false, message: "This chat is closed because the order has been delivered" });
      return;
    }

    const uid = String(userId);
    const manufacturerId = String(order.manufacturer?.id);
    const logisticsId = String(order.logistics?.id);
    const derivedReceiverId = uid === manufacturerId ? logisticsId : manufacturerId;

    if (!derivedReceiverId || derivedReceiverId === "undefined") {
      res.status(400).json({ success: false, message: "Unable to determine receiver" });
      return;
    }

    let fileUrl: string | null = null;
    let fileType: MessageFileType | null = null;
    let fileName: string | null = null;

    const uploadedFile = req.file;
    if (uploadedFile) {
      fileUrl = `/uploads/${userId}/${uploadedFile.filename}`;
      fileName = uploadedFile.originalname;
      fileType = uploadedFile.mimetype.startsWith("image/") ? "image" : "document";
    }

    if (!content?.trim() && !fileUrl) {
      res.status(400).json({ success: false, message: "Message content or file is required" });
      return;
    }

    const message = Message.create({
      orderId: order.id,
      senderId: userId,
      receiverId: parseInt(derivedReceiverId, 10),
      content: content?.trim() ?? "",
      fileUrl,
      fileType,
      fileName,
    });

    const io = getIO();
    if (io) io.to(`chat_${order.id}`).emit("message_received", message);

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("sendMessage error:", error);
    if (error instanceof ChatError) {
      res.status(error.status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server error" });
    }
  }
};

export const getUnreadCount = (req: Request, res: Response): void => {
  try {
    const count = Message.countUnread(req.user.id);
    res.json({ success: true, count });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
