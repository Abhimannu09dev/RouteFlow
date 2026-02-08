const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOtpEmail } = require("../utils/mailer");

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
      await sendOtpEmail(email, otp);

      return res.status(200).json({
        message: "OTP resent to email",
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
    await sendOtpEmail(email, otp);

    res.status(201).json({
      message: "User created. OTP sent to email",
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
    };

    const payload = { userID: user._id };
    console.log(payload);

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successfull",
      token: token,
      user: userDetails,
    });
  } catch (error) {
    console.error("Error logging in");
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
    await sendOtpEmail(email, otp);

    return res.status(200).json({ message: "OTP resent to email" });
  } catch (error) {
    console.error("Error resending OTP", error.message);
    return res.status(500).json({ error: "Failed to resend OTP" });
  }
}
module.exports = {
  createUser,
  loginUser,
  verifyOtp,
  resendOtp,
};
