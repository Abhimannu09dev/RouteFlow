import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";

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
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const mockTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: 1,
  subject: "Payment issue",
  message: "I cannot complete my payment.",
  category: "billing",
  status: "open",
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("createTicket", () => {
  it.each(["general", "technical", "billing"])(
    "creates ticket successfully for valid category: %s",
    (category) => {
      const ticket = mockTicket({ category });
      vi.mocked(SupportTicket.create).mockReturnValue(ticket as never);
      const req = { user: { id: 1 }, body: { subject: "My Issue", message: "I need help", category } } as unknown as Request;
      const res = mockRes();
      createTicket(req, res);
      expect(SupportTicket.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, category }));
      expect(vi.mocked(res.status)).toHaveBeenCalledWith(201);
      expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, ticket }));
    },
  );

  it("trims whitespace from subject and message before saving", () => {
    vi.mocked(SupportTicket.create).mockReturnValue(mockTicket() as never);
    const req = { user: { id: 1 }, body: { subject: "  My Issue  ", message: "  Details  ", category: "general" } } as unknown as Request;
    const res = mockRes();
    createTicket(req, res);
    expect(SupportTicket.create).toHaveBeenCalledWith(expect.objectContaining({ subject: "My Issue", message: "Details" }));
  });

  it("returns 500 on DB error", () => {
    vi.mocked(SupportTicket.create).mockImplementation(() => { throw new Error("DB error"); });
    const req = { user: { id: 1 }, body: { subject: "Issue", message: "Help", category: "general" } } as unknown as Request;
    const res = mockRes();
    createTicket(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Server error" }));
  });
});

describe("getMyTickets", () => {
  it("returns paginated tickets for the logged-in user", () => {
    const tickets = [mockTicket(), mockTicket({ id: 2 })];
    vi.mocked(SupportTicket.find).mockReturnValue(tickets as never);
    vi.mocked(SupportTicket.count).mockReturnValue(2);
    const req = { user: { id: 1 }, query: { page: "1", limit: "10" } } as unknown as Request;
    const res = mockRes();
    getMyTickets(req, res);
    expect(SupportTicket.find).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }), expect.any(Object));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      tickets,
      pagination: expect.objectContaining({ total: 2, page: 1, limit: 10, totalPages: 1 }),
    }));
  });

  it("uses default pagination values (page=1, limit=10) when not provided", () => {
    vi.mocked(SupportTicket.find).mockReturnValue([] as never);
    vi.mocked(SupportTicket.count).mockReturnValue(0);
    const req = { user: { id: 1 }, query: {} } as unknown as Request;
    const res = mockRes();
    getMyTickets(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ pagination: expect.objectContaining({ page: 1, limit: 10 }) }));
  });

  it("correctly calculates totalPages for multi-page results", () => {
    vi.mocked(SupportTicket.find).mockReturnValue([] as never);
    vi.mocked(SupportTicket.count).mockReturnValue(25);
    const req = { user: { id: 1 }, query: { page: "1", limit: "10" } } as unknown as Request;
    const res = mockRes();
    getMyTickets(req, res);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ pagination: expect.objectContaining({ totalPages: 3 }) }));
  });

  it("returns 500 on DB error", () => {
    vi.mocked(SupportTicket.find).mockImplementation(() => { throw new Error("DB crash"); });
    vi.mocked(SupportTicket.count).mockReturnValue(0);
    const req = { user: { id: 1 }, query: {} } as unknown as Request;
    const res = mockRes();
    getMyTickets(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Server error" }));
  });
});
