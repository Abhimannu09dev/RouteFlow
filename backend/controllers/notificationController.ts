import type { Request, Response } from "express";
import Notification from "../models/notificationModel.js";

export const getNotifications = (req: Request, res: Response): void => {
  try {
    const notifications = Notification.find({ recipientId: req.user.id });
    const unreadCount = Notification.countUnread(req.user.id);
    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const markAsRead = (req: Request, res: Response): void => {
  try {
    const { notificationId } = req.params as { notificationId: string };
    Notification.markRead(parseInt(notificationId, 10), req.user.id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const markAllAsRead = (req: Request, res: Response): void => {
  try {
    Notification.markAllRead(req.user.id);
    res.status(200).json({ success: true, message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};
