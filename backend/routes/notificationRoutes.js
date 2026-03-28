const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

// auth applied in routes/index.js

router.get("/", getNotifications);
router.put("/:notificationId/read", markAsRead);
router.put("/read-all", markAllAsRead);

module.exports = router;
