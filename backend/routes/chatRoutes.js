const express = require("express");
const router = express.Router();
const {
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
} = require("../controllers/chatController");
const upload = require("../middleware/upload");

router.get("/conversations", getConversations);
router.get("/unread-count", getUnreadCount);
router.get("/:orderId/messages", getMessages);
router.post("/:orderId/send", upload.single("file"), sendMessage);

module.exports = router;
