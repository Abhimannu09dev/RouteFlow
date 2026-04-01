import { Router } from "express";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  changePassword,
  deactivateAccount,
} from "../controllers/settingsController.js";

const router = Router();

router.get("/notifications", getNotificationPreferences);
router.put("/notifications", updateNotificationPreferences);
router.put("/change-password", changePassword);
router.delete("/account", deactivateAccount);

export default router;
