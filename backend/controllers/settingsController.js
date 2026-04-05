import bcrypt from "bcrypt";
import User from "../models/userModel.js";

const NOTIFICATION_KEYS = [
  "emailNotifications",
  "orderStatusUpdates",
  "bidUpdates",
  "newOrderAlerts",
  "chatMessages",
];

// Get notification preferences for the logged-in user
const getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "notificationPreferences",
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res
      .status(200)
      .json({ success: true, preferences: user.notificationPreferences });
  } catch (error) {
    console.error("getNotificationPreferences error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update notification preferences (only boolean fields are accepted)
const updateNotificationPreferences = async (req, res) => {
  try {
    const updates = {};
    for (const key of NOTIFICATION_KEYS) {
      if (typeof req.body[key] === "boolean") {
        updates[`notificationPreferences.${key}`] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true },
    ).select("notificationPreferences");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res
      .status(200)
      .json({ success: true, preferences: user.notificationPreferences });
  } catch (error) {
    console.error("updateNotificationPreferences error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Change password — requires current password verification
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New passwords do not match" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    const user = await User.findById(req.user.id).select("password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Soft-deactivate account — requires password confirmation, clears auth cookie
const deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to deactivate account",
      });
    }

    const user = await User.findById(req.user.id).select("password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password" });
    }

    await User.findByIdAndUpdate(req.user.id, { $set: { isActive: false } });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res
      .status(200)
      .json({ success: true, message: "Account deactivated successfully" });
  } catch (error) {
    console.error("deactivateAccount error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  getNotificationPreferences,
  updateNotificationPreferences,
  changePassword,
  deactivateAccount,
};
