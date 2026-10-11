import { Router } from "express";
import { getConversations, getMessages, sendMessage, getUnreadCount } from "../controllers/chatController.js";
import { upload } from "../middleware/upload.js";

const router: ReturnType<typeof Router> = Router();

router.get("/conversations", getConversations);
router.get("/unread-count", getUnreadCount);
router.get("/:orderId/messages", getMessages);
router.post("/:orderId/send", upload.single("file"), sendMessage);

export default router;
