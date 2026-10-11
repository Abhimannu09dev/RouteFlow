import type { Request, Response } from "express";
import SupportTicket from "../models/supportTicketModel.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";
import type { TicketCategory } from "../types/index.js";

export const createTicket = (req: Request, res: Response): void => {
  try {
    const { subject, message, category } = req.body as { subject: string; message: string; category: TicketCategory };
    const ticket = SupportTicket.create({ userId: req.user.id, subject: subject.trim(), message: message.trim(), category });
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error("createTicket error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyTickets = (req: Request, res: Response): void => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const tickets = SupportTicket.find({ userId: req.user.id }, { limit, skip });
    const total = SupportTicket.count({ userId: req.user.id });
    res.status(200).json({ success: true, tickets, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error("getMyTickets error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
