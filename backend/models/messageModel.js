import mongoose from "mongoose";
import { Schema } from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileType: {
      type: String,
      enum: ["image", "document", null],
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Fast message history lookup per order
messageSchema.index({ orderId: 1, createdAt: 1 });
// Fast unread count lookup per user
messageSchema.index({ receiverId: 1, isRead: 1 });

export default mongoose.model("Message", messageSchema);
