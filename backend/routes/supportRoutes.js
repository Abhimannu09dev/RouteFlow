import { Router } from "express";
import {
  createTicket,
  getMyTickets,
} from "../controllers/supportController.js";

const router = Router();

router.post("/", createTicket);
router.get("/my-tickets", getMyTickets);

export default router;
