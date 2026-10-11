import { z } from "zod";

export const notificationPreferencesSchema = z
  .object({
    emailNotifications: z.boolean().optional(),
    orderStatusUpdates: z.boolean().optional(),
    bidUpdates: z.boolean().optional(),
    newOrderAlerts: z.boolean().optional(),
    chatMessages: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one notification preference must be provided",
  });

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: "Current password is required" }).min(1, "Current password is required"),
    newPassword: strongPassword,
    confirmPassword: z.string({ error: "Confirm password is required" }).min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const deactivateAccountSchema = z.object({
  password: z.string({ error: "Password is required" }).min(1, "Password is required to deactivate account"),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeactivateAccountInput = z.infer<typeof deactivateAccountSchema>;
