import { z } from "zod";

export const updateProfileSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(2, "Company name must be at least 2 characters")
      .max(100, "Company name must be at most 100 characters")
      .optional(),
    contactNumber: z
      .string()
      .trim()
      .regex(/^\+?[\d\s\-()]{7,20}$/, "Invalid contact number format")
      .optional(),
    panNo: z
      .string()
      .trim()
      .min(5, "PAN number must be at least 5 characters")
      .max(20, "PAN number must be at most 20 characters")
      .optional(),
    companyLocation: z
      .string()
      .trim()
      .min(2, "Company location must be at least 2 characters")
      .max(200, "Company location must be at most 200 characters")
      .optional(),
    companyDescription: z
      .string()
      .trim()
      .max(1000, "Company description must be at most 1000 characters")
      .optional(),
    companyWebsite: z.url("Invalid website URL").optional().or(z.literal("")),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No valid fields provided to update",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
