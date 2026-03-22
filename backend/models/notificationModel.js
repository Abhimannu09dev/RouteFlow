const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "new_bid", // manufacturer: logistics submitted a bid
      "bid_accepted", // logistics: their bid was accepted (won)
      "bid_rejected", // logistics: their bid was rejected
      "order_accepted", // manufacturer: logistics directly accepted their order
      "new_order", // logistics: new order available
      "status_update", // manufacturer: order status changed
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  orderId: { type: String }, // for linking to the order
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
