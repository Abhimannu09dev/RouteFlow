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

const {
  getAllTickets,
  updateTicket,
} = require("../controllers/adminSupportController");

router.get("/stats", rolecheck(["admin"]), getAdminStats);
router.get("/users", rolecheck(["admin"]), getAllUsers);
router.get("/users/:userId", rolecheck(["admin"]), getUserById);
router.put("/users/:userId/approve", rolecheck(["admin"]), approveUser);
router.put("/users/:userId/reject", rolecheck(["admin"]), rejectUser);
router.get("/support-tickets", rolecheck(["admin"]), getAllTickets);
router.put("/support-tickets/:ticketId", rolecheck(["admin"]), updateTicket);

module.exports = router;
