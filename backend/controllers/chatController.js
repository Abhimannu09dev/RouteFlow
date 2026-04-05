import path from "path";
import Message from "../models/messageModel.js";
import Order from "../models/orderModel.js";
import { getIO } from "../websocket/index.js";

const CHAT_ALLOWED_STATUSES = ["accepted", "in transit", "delivered"];

// Verify the requesting user is a participant and chat is accessible for this order
const resolveOrderForChat = async (orderId, userId) => {
  const order = await Order.findById(orderId);
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

  const uid = userId.toString();
  if (
    uid !== order.manufacturer?.toString() &&
    uid !== order.logistics?.toString()
  ) {
    const err = new Error("You are not a participant of this order");
    err.status = 403;
    throw err;
  }

  return { order, isClosed: order.status === "delivered" };
};

// List all chat-eligible orders for the logged-in user with last message and unread count
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({
      status: { $in: CHAT_ALLOWED_STATUSES },
      $or: [{ manufacturer: userId }, { logistics: userId }],
    })
      .populate("manufacturer", "companyName email")
      .populate("logistics", "companyName email")
      .sort({ updatedAt: -1 });

    const conversations = await Promise.all(
      orders.map(async (order) => {
        const lastMessage = await Message.findOne({ orderId: order._id })
          .sort({ createdAt: -1 })
          .populate("senderId", "companyName");

        const unreadCount = await Message.countDocuments({
          orderId: order._id,
          receiverId: userId,
          isRead: false,
        });

        const isManufacturer =
          order.manufacturer?._id?.toString() === userId.toString();
        const otherParty = isManufacturer
          ? order.logistics
          : order.manufacturer;

        return {
          orderId: order._id,
          orderTitle:
            order.productDetails ||
            `Order #${order.orderId || order._id.toString().slice(-6)}`,
          orderStatus: order.status,
          isClosed: order.status === "delivered",
          otherParty,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                fileType: lastMessage.fileType,
                fileName: lastMessage.fileName,
                sentAt: lastMessage.createdAt,
                senderName: lastMessage.senderId?.companyName,
              }
            : null,
          unreadCount,
        };
      }),
    );

    return res.json({ success: true, conversations });
  } catch (error) {
    console.error("getConversations error:", error);
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// Fetch message history for an order and mark unread messages as read
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const { order, isClosed } = await resolveOrderForChat(orderId, userId);

    const messages = await Message.find({ orderId })
      .populate("senderId", "companyName email role")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { orderId, receiverId: userId, isRead: false },
      { $set: { isRead: true } },
    );

    return res.json({
      success: true,
      messages,
      isClosed,
      orderStatus: order.status,
      participants: {
        manufacturer: order.manufacturer,
        logistics: order.logistics,
      },
    });
  } catch (error) {
    console.error("getMessages error:", error);
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// Send a file/image message (plain text goes through Socket.io for real-time delivery)
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { content, receiverId } = req.body;

    const { isClosed } = await resolveOrderForChat(orderId, userId);

    if (isClosed) {
      return res.status(403).json({
        success: false,
        message: "This chat is closed because the order has been delivered",
      });
    }
    if (!receiverId) {
      return res
        .status(400)
        .json({ success: false, message: "receiverId is required" });
    }

    let fileUrl = null;
    let fileType = null;
    let fileName = null;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
      const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      const ext = path.extname(req.file.originalname).toLowerCase();
      fileType = imageExts.includes(ext) ? "image" : "document";
    }

    if (!content?.trim() && !fileUrl) {
      return res.status(400).json({
        success: false,
        message: "Message content or file is required",
      });
    }

    const message = await Message.create({
      orderId,
      senderId: userId,
      receiverId,
      content: content?.trim() || "",
      fileUrl,
      fileType,
      fileName,
    });

    await message.populate("senderId", "companyName email role");

    const io = getIO();
    if (io) io.to(`chat_${orderId}`).emit("message_received", message);

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// Get total unread message count across all orders — used for the navbar badge
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      isRead: false,
    });
    return res.json({ success: true, count });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getConversations, getMessages, sendMessage, getUnreadCount };
