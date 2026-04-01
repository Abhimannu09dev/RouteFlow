const express = require("express");
const router = express.Router();
const {
  createTicket,
  getMyTickets,
} = require("../controllers/supportController");

router.post("/", createTicket);
router.get("/my-tickets", getMyTickets);

module.exports = router;
