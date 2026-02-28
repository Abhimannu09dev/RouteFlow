const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
  orderId: { type: String, required: true, unique: true },
  manufacturer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  logistics: { type: Schema.Types.ObjectId, ref: "User", default: null },
  productDetails: { type: String, required: true },
  quantity: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "in transit", "delivered", "cancelled"],
    default: "pending",
  },
  routeForm: { type: String },
  routeTo: { type: String },
  additionalInfo: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
