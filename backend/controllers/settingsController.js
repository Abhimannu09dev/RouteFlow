import bcrypt from "bcrypt";
import User from "../models/userModel.js";

const getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "notificationPreferences",
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, preferences: user.notificationPreferences });
  } catch (err) {
    console.error("getNotificationPreferences error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateNotificationPreferences = async (req, res) => {
  try {
    const allowed = [
      "emailNotifications",
      "orderStatusUpdates",
      "bidUpdates",
      "newOrderAlerts",
      "chatMessages",
    ];

    const updates = {};
    for (const key of allowed) {
      if (typeof req.body[key] === "boolean") {
        updates[`notificationPreferences.${key}`] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true },
    ).select("notificationPreferences");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.json({ success: true, preferences: user.notificationPreferences });
  } catch (err) {
    console.error("updateNotificationPreferences error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

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
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Soft deactivate — sets isActive: false and clears the session cookie
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
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password" });
    }

    await User.findByIdAndUpdate(req.user.id, { $set: { isActive: false } });

    // Clear the auth cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ success: true, message: "Account deactivated successfully" });
  } catch (err) {
    console.error("deactivateAccount error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  getNotificationPreferences,
  updateNotificationPreferences,
  changePassword,
  deactivateAccount,
};
