import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/supportTicketModel.js", () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    count: vi.fn(),
  },
}));

import SupportTicket from "../models/supportTicketModel.js";
import { createTicket, getMyTickets } from "../controllers/supportController.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockTicket = (overrides = {}) => ({
  id: 1, _id: 1,
  userId: 1,
  subject: "Payment issue",
  message: "I cannot complete my payment.",
  category: "billing",
  status: "open",
  createdAt: new Date().toISOString(),
  ...overrides,
});

// createTicket

describe("createTicket", () => {
  it.each(["general", "technical", "billing"])(
    "creates ticket successfully for valid category: %s",
    (category) => {
      const ticket = mockTicket({ category });
      SupportTicket.create.mockReturnValue(ticket);
      const req = { user: { id: 1 }, body: { subject: "My Issue", message: "I need help", category } };
      const res = mockRes();
      createTicket(req, res);
      expect(SupportTicket.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, category }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, ticket }));
    },
  );

  it("trims whitespace from subject and message before saving", () => {
    SupportTicket.create.mockReturnValue(mockTicket());
    const req = { user: { id: 1 }, body: { subject: "  My Issue  ", message: "  Details  ", category: "general" } };
    const res = mockRes();
    createTicket(req, res);
    expect(SupportTicket.create).toHaveBeenCalledWith(expect.objectContaining({ subject: "My Issue", message: "Details" }));
  });

  it("returns 500 on DB error", () => {
    SupportTicket.create.mockImplementation(() => { throw new Error("DB error"); });
    const req = { user: { id: 1 }, body: { subject: "Issue", message: "Help", category: "general" } };
    const res = mockRes();
    createTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Server error" }));
  });
});

// getMyTickets

describe("getMyTickets", () => {
  it("returns paginated tickets for the logged-in user", () => {
    const tickets = [mockTicket(), mockTicket({ id: 2 })];
    SupportTicket.find.mockReturnValue(tickets);
    SupportTicket.count.mockReturnValue(2);
    const req = { user: { id: 1 }, query: { page: "1", limit: "10" } };
    const res = mockRes();
    getMyTickets(req, res);
    expect(SupportTicket.find).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }), expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      tickets,
      pagination: expect.objectContaining({ total: 2, page: 1, limit: 10, totalPages: 1 }),
    }));
  });

  it("uses default pagination values (page=1, limit=10) when not provided", () => {
    SupportTicket.find.mockReturnValue([]);
    SupportTicket.count.mockReturnValue(0);
    const req = { user: { id: 1 }, query: {} };
    const res = mockRes();
    getMyTickets(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pagination: expect.objectContaining({ page: 1, limit: 10 }) }));
  });

  it("correctly calculates totalPages for multi-page results", () => {
    SupportTicket.find.mockReturnValue([]);
    SupportTicket.count.mockReturnValue(25);
    const req = { user: { id: 1 }, query: { page: "1", limit: "10" } };
    const res = mockRes();
    getMyTickets(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pagination: expect.objectContaining({ totalPages: 3 }) }));
  });

  it("returns 500 on DB error", () => {
    SupportTicket.find.mockImplementation(() => { throw new Error("DB crash"); });
    SupportTicket.count.mockReturnValue(0);
    const req = { user: { id: 1 }, query: {} };
    const res = mockRes();
    getMyTickets(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Server error" }));
  });
});
