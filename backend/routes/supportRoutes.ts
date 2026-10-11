import { Router } from "express";
import { createTicket, getMyTickets } from "../controllers/supportController.js";
import validate from "../middleware/validate.js";
import { createTicketSchema } from "../validators/supportValidators.js";

const router: ReturnType<typeof Router> = Router();

router.post("/", validate(createTicketSchema), createTicket);
router.get("/my-tickets", getMyTickets);

export default router;
