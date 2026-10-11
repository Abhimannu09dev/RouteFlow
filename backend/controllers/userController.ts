import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import User from "../models/userModel.js";
import { sendOtpEmail, sendEmail } from "../utils/mailer.js";

const generateOtp = (): string => crypto.randomInt(100000, 999999).toString();
const hashOtp = (otp: string): string => crypto.createHash("sha256").update(otp).digest("hex");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName, email, password, role } = req.body as Record<string, string>;

    if (!companyName?.trim()) { res.status(400).json({ error: "Company name is required" }); return; }
    if (!email || !EMAIL_REGEX.test(email)) { res.status(400).json({ error: "Valid email is required" }); return; }
    if (!password || password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

    const existingUser = User.findByEmail(email);

    if (existingUser) {
      if (existingUser.isVerified) { res.status(409).json({ error: "User already exists" }); return; }

      const otp = generateOtp();
      User.update(existingUser.id, {
        otpHash: hashOtp(otp),
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      });

      try {
        await sendOtpEmail(email, otp);
      } catch (emailError) {
        console.error("Email sending failed:", emailError instanceof Error ? emailError.message : String(emailError));
        res.status(500).json({ error: "Failed to send OTP. Please check your email configuration or try again later." });
        return;
      }

      res.status(200).json({ success: true, message: "OTP resent to email" });
      return;
    }

    const otp = generateOtp();
    User.create({
      companyName,
      email,
      role: role as "manufacturer" | "logistics",
      password: await bcrypt.hash(password, 10),
      isVerified: false,
      otpHash: hashOtp(otp),
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error("Email sending failed:", emailError instanceof Error ? emailError.message : String(emailError));
      res.status(500).json({ error: "Failed to send OTP. Please check your email configuration or try again later." });
      return;
    }

    res.status(201).json({ success: true, message: "User created. OTP sent to email" });
  } catch (error) {
    console.error("Error creating user:", error instanceof Error ? error.message : String(error));
    res.status(400).json({ error: error instanceof Error ? error.message : "Error creating user" });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as Record<string, string>;

    if (!email || !EMAIL_REGEX.test(email)) { res.status(400).json({ error: "Valid email is required" }); return; }
    if (!password || password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

    const user = User.findByEmail(email);
    if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }
    if (!user.isVerified) { res.status(403).json({ error: "Account not verified" }); return; }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) { res.status(401).json({ error: "Invalid email or password" }); return; }

    if (!user.isActive) { res.status(403).json({ error: "Account is deactivated" }); return; }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env["JWT_SECRET"] as string, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: process.env["NODE_ENV"] === "production" ? "none" : "lax",
      maxAge: 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: { _id: user.id, companyName: user.companyName, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Error logging in:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to log in. Please try again!" });
  }
};

export const verifyOtp = (req: Request, res: Response): void => {
  try {
    const { email, otp } = req.body as Record<string, string | undefined>;

    if (!email || !otp) { res.status(400).json({ error: "Email and OTP are required" }); return; }

    const user = User.findByEmail(email);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.isVerified) { res.status(200).json({ message: "Email already verified" }); return; }
    if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
      res.status(400).json({ error: "OTP expired" });
      return;
    }
    if (hashOtp(otp) !== user.otpHash) { res.status(401).json({ error: "Invalid OTP" }); return; }

    User.update(user.id, { isVerified: true, otpHash: null, otpExpires: null });
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};

export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as Record<string, string | undefined>;

    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const user = User.findByEmail(email);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.isVerified) { res.status(200).json({ message: "Email already verified" }); return; }

    const otp = generateOtp();
    User.update(user.id, {
      otpHash: hashOtp(otp),
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error("Email sending failed:", emailError instanceof Error ? emailError.message : String(emailError));
      res.status(500).json({ error: "Failed to send OTP. Please check your email configuration or try again later." });
      return;
    }

    res.status(200).json({ success: true, message: "OTP resent to email" });
  } catch (error) {
    console.error("Error resending OTP:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to resend OTP" });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as Record<string, string | undefined>;

    if (!email || !EMAIL_REGEX.test(email)) { res.status(400).json({ error: "Valid email is required" }); return; }

    const user = User.findByEmail(email);
    if (!user) {
      res.status(200).json({ message: "If an account exists, a password reset link will be sent to the email" });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    User.update(user.id, {
      resetTokenHash: crypto.createHash("sha256").update(resetToken).digest("hex"),
      resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resetLink = `${process.env["FRONTEND_URL"]}/auth/create-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 28px;">RouteFlow</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Password Reset Request</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <p style="color: #333; font-size: 16px;">Hello ${user.companyName},</p>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #999; font-size: 12px;">This link expires in 1 hour. If you didn't request this reset, please ignore this email.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">Or copy and paste this link in your browser:<br><span style="word-break: break-all; color: #667eea;">${resetLink}</span></p>
        </div>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #999;">
          <p style="margin: 0;">© 2025 RouteFlow. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      await sendEmail(email, "Reset Your Password - RouteFlow", `Click this link to reset your password: ${resetLink}`, htmlContent);
    } catch (emailError) {
      console.error("Email sending failed:", emailError instanceof Error ? emailError.message : String(emailError));
      res.status(500).json({ error: "Failed to send reset email. Please try again later." });
      return;
    }

    res.status(200).json({ success: true, message: "If an account exists, a password reset link will be sent to the email" });
  } catch (error) {
    console.error("Error in forgot password:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to process password reset request" });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password, confirmPassword } = req.body as Record<string, string | undefined>;

    if (!token || !password || !confirmPassword) {
      res.status(400).json({ error: "Token, password, and confirm password are required" });
      return;
    }
    if (password !== confirmPassword) { res.status(400).json({ error: "Passwords do not match" }); return; }
    if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = User.findByResetToken(resetTokenHash);

    if (!user) { res.status(400).json({ error: "Invalid or expired reset token" }); return; }

    User.update(user.id, {
      password: await bcrypt.hash(password, 10),
      resetTokenHash: null,
      resetTokenExpires: null,
    });

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to reset password" });
  }
};
