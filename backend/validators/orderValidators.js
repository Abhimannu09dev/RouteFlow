import { z } from "zod";

// vehicleType is a free-text field in the model (no enum constraint)
export const createOrderSchema = z.object({
  productDetails: z
    .string({ required_error: "Product details are required" })
    .trim()
    .min(2, "Product details must be at least 2 characters")
    .max(500, "Product details must be at most 500 characters"),

  // coerce handles form-data strings like "5" → 5
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0")
    .max(1_000_000, "Quantity is too large"),

  weight: z.coerce
    .number({ invalid_type_error: "Weight must be a number" })
    .positive("Weight must be greater than 0")
    .max(1_000_000, "Weight is too large"),

  vehicleType: z
    .string({ required_error: "Vehicle type is required" })
    .trim()
    .min(2, "Vehicle type is required")
    .max(100, "Vehicle type is too long"),

  invoiceNeeded: z.coerce.boolean().optional().default(false),
  vatBillNeeded: z.coerce.boolean().optional().default(false),

  routeFrom: z
    .string({ required_error: "Route from is required" })
    .trim()
    .min(2, "Route from must be at least 2 characters")
    .max(300, "Route from is too long"),

  routeTo: z
    .string({ required_error: "Route to is required" })
    .trim()
    .min(2, "Route to must be at least 2 characters")
    .max(300, "Route to is too long"),

  additionalInfo: z
    .string()
    .max(1000, "Additional info must be at most 1000 characters")
    .optional(),

  expectedPrice: z.coerce
    .number()
    .positive("Expected price must be greater than 0")
    .max(100_000_000, "Expected price is too large")
    .optional()
    .nullable(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["accepted", "in transit", "delivered", "cancelled"], {
    required_error: "Status is required",
    message:
      "Status must be one of: accepted, in transit, delivered, cancelled",
  }),
});
