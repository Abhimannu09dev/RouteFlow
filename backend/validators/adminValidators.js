import { z } from "zod";

export const rejectUserSchema = z.object({
  reason: z
    .string({ required_error: "Rejection reason is required" })
    .trim()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(500, "Rejection reason must be at most 500 characters"),
});

export const updateTicketSchema = z
  .object({
    status: z
      .enum(["open", "in-progress", "resolved"], {
        message: "Status must be one of: open, in-progress, resolved",
      })
      .optional(),

    adminReply: z
      .string()
      .trim()
      .min(5, "Admin reply must be at least 5 characters")
      .max(2000, "Admin reply must be at most 2000 characters")
      .optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.adminReply !== undefined,
    { message: "At least one of status or adminReply must be provided" }
  );
