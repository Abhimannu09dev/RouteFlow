import path from "path";
import mongoose from "mongoose";
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
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const orders = await Order.aggregate([
      // 1. Match chat-eligible orders
      {
        $match: {
          status: { $in: CHAT_ALLOWED_STATUSES },
          $or: [
            { manufacturer: userId },
            { logistics: userId }
          ]
        }
      },

      // 2. $lookup last message
      {
        $lookup: {
          from: "messages",
          let: { orderId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$orderId", "$$orderId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "lastMessage"
        }
      },

      // 3. $unwind - preserve null for orders with no messages
      {
        $unwind: {
          path: "$lastMessage",
          preserveNullAndEmptyArrays: true
        }
      },

      // 4. $lookup sender details
      {
        $lookup: {
          from: "users",
          let: { senderId: "$lastMessage.senderId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$senderId"] } } },
            { $project: { companyName: 1 } }
          ],
          as: "messageSender"
        }
      },

      // 5. $lookup manufacturer
      {
        $lookup: {
          from: "users",
          localField: "manufacturer",
          foreignField: "_id",
          pipeline: [{ $project: { companyName: 1, email: 1 } }],
          as: "manufacturer"
        }
      },

      // 6. $lookup logistics (may be null)
      {
        $lookup: {
          from: "users",
          let: { logisticsId: "$logistics" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$logisticsId"] } } },
            { $project: { companyName: 1, email: 1 } }
          ],
          as: "logistics"
        }
      },

      // 7. $project - reshape to final output
      {
        $project: {
          _id: 1,
          orderId: 1,
          productDetails: 1,
          status: 1,
          manufacturer: { $arrayElemAt: ["$manufacturer", 0] },
          logistics: { $arrayElemAt: ["$logistics", 0] },
          lastMessage: {
            $cond: {
              if: { $ifNull: ["$lastMessage.content", false] },
              then: {
                content: "$lastMessage.content",
                fileType: "$lastMessage.fileType",
                fileName: "$lastMessage.fileName",
                sentAt: "$lastMessage.createdAt",
                senderName: { $arrayElemAt: ["$messageSender.companyName", 0] }
              },
              else: "$$REMOVE"
            }
          }
        }
      },

      // 8. Sort with fallback
      { $sort: { updatedAt: -1, _id: -1 } }
    ]);

    // 9. Get unread counts in separate aggregation
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: userId,
          isRead: false
        }
      },
      {
        $group: {
          _id: "$orderId",
          count: { $sum: 1 }
        }
      }
    ]);

    const unreadMap = new Map(
      unreadCounts.map(c => [c._id.toString(), c.count])
    );

    // 10. Build final response
    const conversations = orders.map(order => {
      const isManufacturer = order.manufacturer?._id?.toString() === userId.toString();
      const otherParty = isManufacturer ? order.logistics : order.manufacturer;

      return {
        orderId: order._id,
        orderTitle: order.productDetails || `Order #${order.orderId || order._id.toString().slice(-6)}`,
        orderStatus: order.status,
        isClosed: order.status === "delivered",
        otherParty,
        lastMessage: order.lastMessage || null,
        unreadCount: unreadMap.get(order._id.toString()) || 0
      };
    });

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
    const { content } = req.body;

    const { order, isClosed } = await resolveOrderForChat(orderId, userId);

    if (isClosed) {
      return res.status(403).json({
        success: false,
        message: "This chat is closed because the order has been delivered",
      });
    }

    const derivedReceiverId =
      userId === order.manufacturer.toString()
        ? order.logistics?.toString()
        : order.manufacturer.toString();

    if (!derivedReceiverId) {
      return res.status(400).json({
        success: false,
        message: "Unable to determine receiver",
      });
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
      return res.status(400).json({
        success: false,
        message: "Message content or file is required",
      });
    }

    const message = await Message.create({
      orderId,
      senderId: userId,
      receiverId: derivedReceiverId,
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
