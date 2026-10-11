import { Router } from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController.js";

const router = Router();

router.get("/", getNotifications);
router.put("/:notificationId/read", markAsRead);
router.put("/read-all", markAllAsRead);

export default router;
