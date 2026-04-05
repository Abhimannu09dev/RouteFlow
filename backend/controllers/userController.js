import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { sendOtpEmail, sendEmail } from "../utils/mailer.js";

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Register a new user and send OTP
const createUser = async (req, res) => {
  try {
    const { companyName, email, password, role } = req.body;

    if (!companyName?.trim()) {
      return res.status(400).json({ error: "Company name is required" });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(409).json({ error: "User already exists" });
      }

      // Resend OTP for unverified users
      const otp = generateOtp();
      existingUser.otpHash = hashOtp(otp);
      existingUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await existingUser.save();

      try {
        await sendOtpEmail(email, otp);
      } catch (emailError) {
        console.error("Email sending failed:", emailError.message);
        return res.status(500).json({
          error:
            "Failed to send OTP. Please check your email configuration or try again later.",
        });
      }

      return res
        .status(200)
        .json({ success: true, message: "OTP resent to email" });
    }

    const otp = generateOtp();
    const user = new User({
      companyName,
      email,
      role,
      password: await bcrypt.hash(password, 10),
      isVerified: false,
      otpHash: hashOtp(otp),
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    await user.save();

    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      return res.status(500).json({
        error:
          "Failed to send OTP. Please check your email configuration or try again later.",
      });
    }

    return res
      .status(201)
      .json({ success: true, message: "User created. OTP sent to email" });
  } catch (error) {
    console.error("Error creating user:", error.message);
    return res
      .status(400)
      .json({ error: error.message || "Error creating user" });
  }
};

// Login with email and password
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Email not found" });
    }
    if (!user.isVerified) {
      return res.status(403).json({ error: "Account not verified" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Mismatched password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to log in. Please try again!" });
  }
};

// Verify OTP and activate account
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.isVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }
    if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }
    if (hashOtp(otp) !== user.otpHash) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
};

// Resend OTP to email
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.isVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    const otp = generateOtp();
    user.otpHash = hashOtp(otp);
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      return res.status(500).json({
        error:
          "Failed to send OTP. Please check your email configuration or try again later.",
      });
    }

    return res
      .status(200)
      .json({ success: true, message: "OTP resent to email" });
  } catch (error) {
    console.error("Error resending OTP:", error.message);
    return res.status(500).json({ error: "Failed to resend OTP" });
  }
};

// Send password reset link to email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({
        message:
          "If an account exists, a password reset link will be sent to the email",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/auth/create-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 28px;">RouteFlow</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Password Reset Request</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <p style="color: #333; font-size: 16px;">Hello ${user.companyName},</p>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">
            This link expires in 1 hour. If you didn't request this reset, please ignore this email.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Or copy and paste this link in your browser:<br>
            <span style="word-break: break-all; color: #667eea;">${resetLink}</span>
          </p>
        </div>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #999;">
          <p style="margin: 0;">© 2025 RouteFlow. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      await sendEmail(
        email,
        "Reset Your Password - RouteFlow",
        `Click this link to reset your password: ${resetLink}`,
        htmlContent,
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      return res
        .status(500)
        .json({ error: "Failed to send reset email. Please try again later." });
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account exists, a password reset link will be sent to the email",
    });
  } catch (error) {
    console.error("Error in forgot password:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to process password reset request" });
  }
};

// Reset password using token from email link
const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ error: "Token, password, and confirm password are required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    const user = await User.findOne({
      resetTokenHash,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};

export {
  createUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
};
