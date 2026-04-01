import mongoose from "mongoose";
import { Schema } from "mongoose";

const orderSchema = new Schema({
  orderId: { type: String, required: true, unique: true },
  manufacturer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  logistics: { type: Schema.Types.ObjectId, ref: "User", default: null },
  productDetails: { type: String, required: true },
  quantity: { type: Number, required: true },
  weight: { type: Number, required: true },
  vehicleType: { type: String, required: true },
  invoiceNeeded: { type: Boolean, default: false, required: true },
  vatBillNeeded: { type: Boolean, default: false, required: true },
  invoiceDocuments: { type: String },
  vatBillDocuments: { type: String },
  expectedPrice: { type: Number, default: null },
  status: {
    type: String,
    enum: ["pending", "accepted", "in transit", "delivered", "cancelled"],
    default: "pending",
  },
  routeFrom: { type: String },
  routeTo: { type: String },
  additionalInfo: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", orderSchema);
