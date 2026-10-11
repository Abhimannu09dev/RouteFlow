import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import User from "../models/userModel.js";

const NOTIFICATION_KEYS = [
  "emailNotifications",
  "orderStatusUpdates",
  "bidUpdates",
  "newOrderAlerts",
  "chatMessages",
] as const;

export const getNotificationPreferences = (req: Request, res: Response): void => {
  try {
    const user = User.findById(req.user.id);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    res.status(200).json({ success: true, preferences: user.notificationPreferences });
  } catch (error) {
    console.error("getNotificationPreferences error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateNotificationPreferences = (req: Request, res: Response): void => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, boolean> = {};
    for (const key of NOTIFICATION_KEYS) {
      if (typeof body[key] === "boolean") {
        updates[`notificationPreferences.${key}`] = body[key];
      }
    }

    const user = User.update(req.user.id, updates);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }

    res.status(200).json({ success: true, preferences: user.notificationPreferences });
  } catch (error) {
    console.error("updateNotificationPreferences error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    const user = User.findByIdWithPassword(req.user.id);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) { res.status(400).json({ success: false, message: "Current password is incorrect" }); return; }

    User.update(user.id, { password: await bcrypt.hash(newPassword, 10) });
    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deactivateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body as { password: string };

    const user = User.findByIdWithPassword(req.user.id);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) { res.status(400).json({ success: false, message: "Incorrect password" }); return; }

    User.update(req.user.id, { isActive: false });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: process.env["NODE_ENV"] === "production" ? "none" : "lax",
    });

    res.status(200).json({ success: true, message: "Account deactivated successfully" });
  } catch (error) {
    console.error("deactivateAccount error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
