import SupportTicket from "../models/supportTicketModel.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const createTicket = (req, res) => {
  try {
    const { subject, message, category } = req.body;
    const ticket = SupportTicket.create({ userId: req.user.id, subject: subject.trim(), message: message.trim(), category });
    return res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error("createTicket error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyTickets = (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const tickets = SupportTicket.find({ userId: req.user.id }, { limit, skip });
    const total = SupportTicket.count({ userId: req.user.id });
    return res.status(200).json({ success: true, tickets, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error("getMyTickets error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { createTicket, getMyTickets };
