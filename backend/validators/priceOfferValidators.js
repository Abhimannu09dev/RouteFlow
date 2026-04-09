import { z } from "zod";

export const submitOfferSchema = z.object({
  proposedPrice: z.coerce
    .number({ required_error: "Proposed price is required", invalid_type_error: "Proposed price must be a number" })
    .positive("Proposed price must be greater than 0")
    .max(100_000_000, "Proposed price is too large"),

  estimatedDeliveryDays: z.coerce
    .number({ required_error: "Estimated delivery days is required", invalid_type_error: "Estimated delivery days must be a number" })
    .int("Estimated delivery days must be a whole number")
    .positive("Estimated delivery days must be greater than 0")
    .max(365, "Estimated delivery days cannot exceed 365"),

  note: z
    .string()
    .max(500, "Note must be at most 500 characters")
    .optional(),
});

export const updateOfferSchema = z
  .object({
    proposedPrice: z.coerce
      .number({ invalid_type_error: "Proposed price must be a number" })
      .positive("Proposed price must be greater than 0")
      .max(100_000_000, "Proposed price is too large")
      .optional(),

    estimatedDeliveryDays: z.coerce
      .number({ invalid_type_error: "Estimated delivery days must be a number" })
      .int("Estimated delivery days must be a whole number")
      .positive("Estimated delivery days must be greater than 0")
      .max(365, "Estimated delivery days cannot exceed 365")
      .optional(),

    note: z
      .string()
      .max(500, "Note must be at most 500 characters")
      .optional(),
  })
  .refine(
    (data) =>
      data.proposedPrice !== undefined ||
      data.estimatedDeliveryDays !== undefined ||
      data.note !== undefined,
    { message: "At least one field must be provided to update" }
  );
