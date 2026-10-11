import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z
    .string({ error: "Subject is required" })
    .trim()
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject must be at most 200 characters"),
  message: z
    .string({ error: "Message is required" })
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be at most 2000 characters"),
  category: z.enum(["general", "technical", "billing"] as const, {
    message: "Category must be one of: general, technical, billing",
  }),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
