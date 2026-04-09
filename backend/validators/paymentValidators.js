import { z } from "zod";

// Both Khalti and eSewa initiation just require a MongoDB ObjectId string
export const initiatePaymentSchema = z.object({
  orderId: z
    .string({ required_error: "Order ID is required" })
    .min(1, "Order ID is required")
    .regex(/^[a-f\d]{24}$/i, "Invalid Order ID format"),
});
