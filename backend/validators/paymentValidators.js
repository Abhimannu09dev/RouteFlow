import { z } from "zod";

export const initiatePaymentSchema = z.object({
  orderId: z.coerce.number().int().positive("Order ID must be a positive integer"),
});
