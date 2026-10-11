import type { Request, Response } from "express";
import SupportTicket from "../models/supportTicketModel.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";
import type { TicketStatus, TicketCategory } from "../types/index.js";

const VALID_STATUSES: TicketStatus[] = ["open", "in-progress", "resolved"];

export const getAllTickets = (req: Request, res: Response): void => {
  try {
    const { status, category } = req.query as { status?: TicketStatus; category?: TicketCategory };
    const { page, limit, skip } = parsePagination(req.query);

    const filter: { status?: TicketStatus; category?: TicketCategory } = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tickets = SupportTicket.find(filter, { limit, skip });
    const total = SupportTicket.count(filter);

    res.status(200).json({ success: true, tickets, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error("getAllTickets error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateTicket = (req: Request, res: Response): void => {
  try {
    const { ticketId } = req.params as { ticketId: string };
    const { status, adminReply } = req.body as { status?: TicketStatus; adminReply?: string };

    if (status && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status" });
      return;
    }

    const updates: Parameters<typeof SupportTicket.update>[1] = {};
    if (status) updates.status = status;
    if (adminReply?.trim()) {
      updates.adminReply = adminReply.trim();
      updates.repliedAt = new Date().toISOString();
      if (!status) updates.status = "in-progress";
    }

    const ticket = SupportTicket.update(parseInt(ticketId, 10), updates);
    if (!ticket) { res.status(404).json({ success: false, message: "Ticket not found" }); return; }

    res.status(200).json({ success: true, ticket });
  } catch (error) {
    console.error("updateTicket error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
