const express = require("express");
const router = express.Router();
const {
  getNotificationPreferences,
  updateNotificationPreferences,
  changePassword,
  deactivateAccount,
} = require("../controllers/settingsController");

router.get("/notifications", getNotificationPreferences);
router.put("/notifications", updateNotificationPreferences);
router.put("/change-password", changePassword);
router.delete("/account", deactivateAccount);

module.exports = router;
