const path = require("path");
const Message = require("../models/messageModel");
const Order = require("../models/orderModel");

const CHAT_ALLOWED_STATUSES = ["accepted", "in transit", "delivered"];
async function resolveOrderForChat(orderId, userId) {
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

  const manufacturerId = order.manufacturer?.toString();
  const logisticsId = order.acceptedBy?.toString();
  const uid = userId.toString();

  if (uid !== manufacturerId && uid !== logisticsId) {
    const err = new Error("You are not a participant of this order");
    err.status = 403;
    throw err;
  }

  return {
    order,
    isClosed: order.status === "delivered",
  };
}

// List all chat-eligible orders for the logged-in user, with last message + unread count.
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({
      status: { $in: CHAT_ALLOWED_STATUSES },
      $or: [{ manufacturer: userId }, { acceptedBy: userId }],
    })
      .populate("manufacturer", "companyName email")
      .populate("acceptedBy", "companyName email")
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
          ? order.acceptedBy
          : order.manufacturer;

        return {
          orderId: order._id,
          // Use cargoType as title — adjust field name if yours differs
          orderTitle:
            order.cargoType ||
            order.title ||
            `Order #${order._id.toString().slice(-6)}`,
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

    res.json({ success: true, conversations });
  } catch (err) {
    console.error("getConversations error:", err);
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// Fetch message history for an order and mark unread messages as read.
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const { order, isClosed } = await resolveOrderForChat(orderId, userId);

    const messages = await Message.find({ orderId })
      .populate("senderId", "companyName email role")
      .sort({ createdAt: 1 });

    // Mark all messages sent to this user as read
    await Message.updateMany(
      { orderId, receiverId: userId, isRead: false },
      { $set: { isRead: true } },
    );

    res.json({
      success: true,
      messages,
      isClosed,
      orderStatus: order.status,
      participants: {
        manufacturer: order.manufacturer,
        logistics: order.acceptedBy,
      },
    });
  } catch (err) {
    console.error("getMessages error:", err);
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

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

    const { getIO } = require("../websocket");
    const io = getIO();
    if (io) {
      io.to(`chat_${orderId}`).emit("message_received", message);
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error("sendMessage error:", err);
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// Total unread message count across all orders — used for the navbar badge.
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      isRead: false,
    });
    res.json({ success: true, count });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getConversations, getMessages, sendMessage, getUnreadCount };
