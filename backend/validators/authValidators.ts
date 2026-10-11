import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const registerSchema = z.object({
  companyName: z
    .string({ error: "Company name is required" })
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be at most 100 characters"),
  email: z.email("Invalid email address").toLowerCase(),
  password: strongPassword,
  role: z.enum(["manufacturer", "logistics"] as const, {
    message: "Role must be either manufacturer or logistics",
  }),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  email: z.email("Invalid email address"),
  otp: z
    .string({ error: "OTP is required" })
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export const resendOtpSchema = z.object({
  email: z.email("Invalid email address"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string({ error: "Reset token is required" }).min(1, "Reset token is required"),
    password: strongPassword,
    confirmPassword: z.string({ error: "Confirm password is required" }).min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
