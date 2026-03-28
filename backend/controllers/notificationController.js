const Notification = require("../models/notificationModel");

//  Get notifications for current user
async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

//  Mark single notification as read
async function markAsRead(req, res) {
  try {
    const { notificationId } = req.params;

    await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: req.user.id },
      { isRead: true },
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

//  Mark all notifications as read
async function markAllAsRead(req, res) {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true },
    );

    return res
      .status(200)
      .json({ success: true, message: "All marked as read" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead };
