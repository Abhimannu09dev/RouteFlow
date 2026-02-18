const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOtpEmail, sendEmail } = require("../utils/mailer");

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// Function to create user
async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    // validation of data through backend
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Check if user exits
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(409).json({ error: "User already exists" });
      }

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

      return res.status(200).json({
        message: "OTP resent to email",
        success: true,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();

    const user = new User({
      name,
      email,
      role,
      password: hashedPassword,
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

    res.status(201).json({
      message: "User created. OTP sent to email",
      success: true,
    });
  } catch (error) {
    console.error("Error creating user", error.message);
    return res
      .status(400)
      .json({ error: error.message || "Error creating user" });
  }
}

// Function to login the user
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;
    // validation of data through backend
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email is required" });
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
      return res.status(403).json({ error: "Email not verified" });
    }
    // Check if the password is valid or not
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Mismatched password" });
    }

    const userDetails = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const payload = { userID: user._id, role: user.role };
    console.log("payload:", payload);

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successfull",
      token: token,
      user: userDetails,
    });
  } catch (error) {
    console.error("Error logging in", error.message);
    res.status(500).json({ error: "Failed to log in. Please try again!" });
  }
}

async function verifyOtp(req, res) {
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

    const otpHash = hashOtp(otp);
    if (otpHash !== user.otpHash) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP", error.message);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
}

async function resendOtp(req, res) {
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

    return res.status(200).json({
      message: "OTP resent to email",
      success: true,
    });
  } catch (error) {
    console.error("Error resending OTP", error.message);
    return res.status(500).json({ error: "Failed to resend OTP" });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    user.resetTokenHash = resetTokenHash;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL}/auth/create-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 28px;">RouteFlow</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Password Reset Request</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <p style="color: #333; font-size: 16px;">Hello ${user.name},</p>
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
      return res.status(500).json({
        error: "Failed to send reset email. Please try again later.",
      });
    }

    return res.status(200).json({
      message:
        "If an account exists, a password reset link will be sent to the email",
      success: true,
    });
  } catch (error) {
    console.error("Error in forgot password:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to process password reset request" });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        error: "Token, password, and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    // Hash the token to find the user
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetTokenHash,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired reset token",
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}

module.exports = {
  createUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
};
