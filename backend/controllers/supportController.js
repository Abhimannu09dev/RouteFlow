const SupportTicket = require("../models/supportTicketModel");

const VALID_CATEGORIES = ["general", "technical", "billing"];

const createTicket = async (req, res) => {
  try {
    const { subject, message, category } = req.body;

    if (!subject?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Subject is required" });
    }
    if (!message?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category" });
    }

    const ticket = await SupportTicket.create({
      userId: req.user.id,
      subject: subject.trim(),
      message: message.trim(),
      category,
    });

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error("createTicket error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    res.json({ success: true, tickets });
  } catch (err) {
    console.error("getMyTickets error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { createTicket, getMyTickets };
