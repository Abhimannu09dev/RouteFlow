import { describe, it, expect, vi, beforeEach } from "vitest";

//  Mocks

vi.mock("../models/supportTicketModel.js", () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import SupportTicket from "../models/supportTicketModel.js";
import {
  createTicket,
  getMyTickets,
} from "../controllers/supportController.js";

//  Helpers

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockTicket = (overrides = {}) => ({
  _id: "ticket001",
  userId: "user123",
  subject: "Payment issue",
  message: "I cannot complete my payment.",
  category: "billing",
  status: "open",
  createdAt: new Date(),
  ...overrides,
});

//  createTicket

describe("createTicket", () => {

  it.each(["general", "technical", "billing"])(
    "creates ticket successfully for valid category: %s",
    async (category) => {
      const ticket = mockTicket({ category });
      SupportTicket.create.mockResolvedValue(ticket);
      const req = {
        user: { id: "user123" },
        body: { subject: "My Issue", message: "I need help", category },
      };
      const res = mockRes();
      await createTicket(req, res);
      expect(SupportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user123", category }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, ticket }),
      );
    },
  );

  it("trims whitespace from subject and message before saving", async () => {
    const ticket = mockTicket();
    SupportTicket.create.mockResolvedValue(ticket);
    const req = {
      user: { id: "user123" },
      body: {
        subject: "  My Issue  ",
        message: "  Details  ",
        category: "general",
      },
    };
    const res = mockRes();
    await createTicket(req, res);
    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "My Issue", message: "Details" }),
    );
  });

  it("returns 500 on DB error", async () => {
    SupportTicket.create.mockRejectedValue(new Error("DB error"));
    const req = {
      user: { id: "user123" },
      body: { subject: "Issue", message: "Help", category: "general" },
    };
    const res = mockRes();
    await createTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Server error" }),
    );
  });
});

//  getMyTickets

describe("getMyTickets", () => {
  const makeChain = (tickets, count) => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(tickets),
    };
    SupportTicket.find.mockReturnValue(chain);
    SupportTicket.countDocuments.mockResolvedValue(count);
    return chain;
  };

  it("returns paginated tickets for the logged-in user", async () => {
    const tickets = [mockTicket(), mockTicket({ _id: "ticket002" })];
    makeChain(tickets, 2);

    const req = {
      user: { id: "user123" },
      query: { page: "1", limit: "10" },
    };
    const res = mockRes();
    await getMyTickets(req, res);

    expect(SupportTicket.find).toHaveBeenCalledWith({ userId: "user123" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        tickets,
        pagination: expect.objectContaining({
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        }),
      }),
    );
  });

  it("uses default pagination values (page=1, limit=10) when not provided", async () => {
    makeChain([], 0);
    const req = { user: { id: "user123" }, query: {} };
    const res = mockRes();
    await getMyTickets(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({ page: 1, limit: 10 }),
      }),
    );
  });

  it("returns empty array with correct pagination when no tickets exist", async () => {
    makeChain([], 0);
    const req = { user: { id: "user123" }, query: {} };
    const res = mockRes();
    await getMyTickets(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        tickets: [],
        pagination: expect.objectContaining({ total: 0, totalPages: 0 }),
      }),
    );
  });

  it("correctly calculates totalPages for multi-page results", async () => {
    makeChain([], 25); // 25 total with limit 10 → 3 pages
    const req = { user: { id: "user123" }, query: { page: "1", limit: "10" } };
    const res = mockRes();
    await getMyTickets(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({ totalPages: 3 }),
      }),
    );
  });

  it("returns 500 on DB error", async () => {
    SupportTicket.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error("DB crash")),
    });
    SupportTicket.countDocuments.mockResolvedValue(0);
    const req = { user: { id: "user123" }, query: {} };
    const res = mockRes();
    await getMyTickets(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Server error" }),
    );
  });
});
