import SupportTicket from "../models/supportTicketModel.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const VALID_STATUSES = ["open", "in-progress", "resolved"];

const getAllTickets = (req, res) => {
  try {
    const { status, category } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tickets = SupportTicket.find(filter, { limit, skip });
    const total = SupportTicket.count(filter);

    return res.status(200).json({ success: true, tickets, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error("getAllTickets error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateTicket = (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, adminReply } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updates = {};
    if (status) updates.status = status;
    if (adminReply?.trim()) {
      updates.adminReply = adminReply.trim();
      updates.repliedAt = new Date().toISOString();
      if (!status) updates.status = "in-progress";
    }

    const ticket = SupportTicket.update(parseInt(ticketId, 10), updates);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    console.error("updateTicket error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getAllTickets, updateTicket };
