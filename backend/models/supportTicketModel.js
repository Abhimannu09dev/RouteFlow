const mongoose = require("mongoose");
const { Schema } = mongoose;

const supportTicketSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["general", "technical", "billing"],
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved"],
      default: "open",
    },
    adminReply: {
      type: String,
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

supportTicketSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
