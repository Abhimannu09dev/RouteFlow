import bcrypt from "bcrypt";
import User from "../models/userModel.js";

const NOTIFICATION_KEYS = [
  "emailNotifications",
  "orderStatusUpdates",
  "bidUpdates",
  "newOrderAlerts",
  "chatMessages",
];

const getNotificationPreferences = (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, preferences: user.notificationPreferences });
  } catch (error) {
    console.error("getNotificationPreferences error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateNotificationPreferences = (req, res) => {
  try {
    const updates = {};
    for (const key of NOTIFICATION_KEYS) {
      if (typeof req.body[key] === "boolean") {
        updates[`notificationPreferences.${key}`] = req.body[key];
      }
    }

    const user = User.update(req.user.id, updates);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, preferences: user.notificationPreferences });
  } catch (error) {
    console.error("updateNotificationPreferences error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = User.findByIdWithPassword(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    User.update(user.id, { password: await bcrypt.hash(newPassword, 10) });

    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;

    const user = User.findByIdWithPassword(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect password" });

    User.update(req.user.id, { isActive: false });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({ success: true, message: "Account deactivated successfully" });
  } catch (error) {
    console.error("deactivateAccount error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getNotificationPreferences, updateNotificationPreferences, changePassword, deactivateAccount };
