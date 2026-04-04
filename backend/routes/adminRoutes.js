import { Router } from "express";

import { rolecheck } from "../middleware/auth.js";
import {
  getAdminStats,
  getAllUsers,
  getUserById,
  approveUser,
  rejectUser,
} from "../controllers/adminController.js";
import {
  getAllTickets,
  updateTicket,
} from "../controllers/adminSupportController.js";

const router = Router();

router.get("/stats", rolecheck(["admin"]), getAdminStats);
router.get("/users", rolecheck(["admin"]), getAllUsers);
router.get("/users/:userId", rolecheck(["admin"]), getUserById);
router.put("/users/:userId/approve", rolecheck(["admin"]), approveUser);
router.put("/users/:userId/reject", rolecheck(["admin"]), rejectUser);
router.get("/support-tickets", rolecheck(["admin"]), getAllTickets);
router.put("/support-tickets/:ticketId", rolecheck(["admin"]), updateTicket);

export default router;
