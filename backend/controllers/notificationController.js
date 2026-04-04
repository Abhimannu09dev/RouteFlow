import Notification from "../models/notificationModel.js";

// Get the latest 50 notifications for the logged-in user
const getNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50),
      Notification.countDocuments({ recipient: req.user.id, isRead: false }),
    ]);

    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: req.user.id },
      { isRead: true },
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Mark all notifications as read for the logged-in user
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true },
    );

    return res
      .status(200)
      .json({ success: true, message: "All marked as read" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export { getNotifications, markAsRead, markAllAsRead };
