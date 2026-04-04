import mongoose from "mongoose";
import { Schema } from "mongoose";

const priceOfferSchema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  orderId: {
    type: String,
    required: true,
  },
  logistics: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  proposedPrice: {
    type: Number,
    required: true,
    min: 1,
  },
  currency: {
    type: String,
    default: "NPR",
  },
  estimatedDeliveryDays: {
    type: Number,
    required: true,
    min: 1,
  },
  note: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "withdrawn"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

priceOfferSchema.index({ order: 1, logistics: 1 }, { unique: true });

export default mongoose.model("PriceOffer", priceOfferSchema);
