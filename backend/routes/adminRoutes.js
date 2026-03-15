const express = require("express");
const router = express.Router();

const { rolecheck } = require("../middleware/auth");
const {
  getAdminStats,
  getAllUsers,
  getUserById,
  approveUser,
  rejectUser,
} = require("../controllers/adminController");

router.get("/stats", rolecheck(["admin"]), getAdminStats);
router.get("/users", rolecheck(["admin"]), getAllUsers);
router.get("/users/:userId", rolecheck(["admin"]), getUserById);
router.put("/users/:userId/approve", rolecheck(["admin"]), approveUser);
router.put("/users/:userId/reject", rolecheck(["admin"]), rejectUser);

module.exports = router;
