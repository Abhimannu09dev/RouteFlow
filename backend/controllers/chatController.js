import path from "path";
import Message from "../models/messageModel.js";
import Order from "../models/orderModel.js";
import { getIO } from "../websocket/index.js";

const CHAT_ALLOWED_STATUSES = ["accepted", "in transit", "delivered"];

const resolveOrderForChat = (orderId, userId) => {
  const order = Order.findById(parseInt(orderId, 10));
  if (!order) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  if (!CHAT_ALLOWED_STATUSES.includes(order.status)) {
    const err = new Error("Chat is not available for this order status");
    err.status = 403;
    throw err;
  }

  const uid = String(userId);
  if (String(order.manufacturer?.id) !== uid && String(order.logistics?.id) !== uid) {
    const err = new Error("You are not a participant of this order");
    err.status = 403;
    throw err;
  }

  return { order, isClosed: order.status === "delivered" };
};

const getConversations = (req, res) => {
  try {
    const userId = req.user.id;

    const orders = Order.findForParticipant(userId, CHAT_ALLOWED_STATUSES);
    const unreadMap = Message.unreadByOrder(userId);

    const conversations = orders.map((order) => {
      const isManufacturer = String(order.manufacturer?.id) === String(userId);
      const otherParty = isManufacturer ? order.logistics : order.manufacturer;

      const msgs = Message.findByOrderId(order.id);
      const lastMsg = msgs[msgs.length - 1] ?? null;

      return {
        orderId: order.id,
        orderTitle: order.productDetails || `Order #${order.orderId}`,
        orderStatus: order.status,
        isClosed: order.status === "delivered",
        otherParty,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          fileType: lastMsg.fileType,
          fileName: lastMsg.fileName,
          sentAt: lastMsg.createdAt,
          senderName: lastMsg.sender?.companyName ?? null,
        } : null,
        unreadCount: unreadMap.get(order.id) || 0,
      };
    });

    return res.json({ success: true, conversations });
  } catch (error) {
    console.error("getConversations error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Server error" });
  }
};

const getMessages = (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const { order, isClosed } = resolveOrderForChat(orderId, userId);

    const messages = Message.findByOrderId(order.id);
    Message.markRead(order.id, userId);

    return res.json({
      success: true,
      messages,
      isClosed,
      orderStatus: order.status,
      participants: { manufacturer: order.manufacturer, logistics: order.logistics },
    });
  } catch (error) {
    console.error("getMessages error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Server error" });
  }
};

const sendMessage = (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { content } = req.body;

    const { order, isClosed } = resolveOrderForChat(orderId, userId);

    if (isClosed) {
      return res.status(403).json({ success: false, message: "This chat is closed because the order has been delivered" });
    }

    const uid = String(userId);
    const manufacturerId = String(order.manufacturer?.id);
    const logisticsId = String(order.logistics?.id);
    const derivedReceiverId = uid === manufacturerId ? logisticsId : manufacturerId;

    if (!derivedReceiverId || derivedReceiverId === "undefined") {
      return res.status(400).json({ success: false, message: "Unable to determine receiver" });
    }

    let fileUrl = null;
    let fileType = null;
    let fileName = null;

    if (req.file) {
      fileUrl = `/uploads/${userId}/${req.file.filename}`;
      fileName = req.file.originalname;
      fileType = req.file.mimetype.startsWith("image/") ? "image" : "document";
    }

    if (!content?.trim() && !fileUrl) {
      return res.status(400).json({ success: false, message: "Message content or file is required" });
    }

    const message = Message.create({
      orderId: order.id,
      senderId: userId,
      receiverId: parseInt(derivedReceiverId, 10),
      content: content?.trim() || "",
      fileUrl,
      fileType,
      fileName,
    });

    const io = getIO();
    if (io) io.to(`chat_${order.id}`).emit("message_received", message);

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Server error" });
  }
};

const getUnreadCount = (req, res) => {
  try {
    const count = Message.countUnread(req.user.id);
    return res.json({ success: true, count });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getConversations, getMessages, sendMessage, getUnreadCount };
