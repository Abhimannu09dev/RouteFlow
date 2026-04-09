import { Router } from "express";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  changePassword,
  deactivateAccount,
} from "../controllers/settingsController.js";
import validate from "../middleware/validate.js";
import {
  notificationPreferencesSchema,
  changePasswordSchema,
  deactivateAccountSchema,
} from "../validators/settingsValidators.js";

const router = Router();

router.get("/notifications", getNotificationPreferences);
router.put(
  "/notifications",
  validate(notificationPreferencesSchema),
  updateNotificationPreferences,
);
router.put("/change-password", validate(changePasswordSchema), changePassword);
router.delete("/account", validate(deactivateAccountSchema), deactivateAccount);

export default router;
