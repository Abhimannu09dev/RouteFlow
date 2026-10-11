import Notification from "../models/notificationModel.js";

const getNotifications = (req, res) => {
  try {
    const notifications = Notification.find({ recipientId: req.user.id });
    const unreadCount = Notification.countUnread(req.user.id);
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const markAsRead = (req, res) => {
  try {
    const { notificationId } = req.params;
    Notification.markRead(parseInt(notificationId, 10), req.user.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const markAllAsRead = (req, res) => {
  try {
    Notification.markAllRead(req.user.id);
    return res.status(200).json({ success: true, message: "All marked as read" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export { getNotifications, markAsRead, markAllAsRead };
