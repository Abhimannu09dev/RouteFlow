import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/userModel.js", () => ({
  default: {
    findById: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../models/orderModel.js", () => ({
  default: { count: vi.fn() },
}));

vi.mock("../models/supportTicketModel.js", () => ({
  default: {
    find: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
}));

import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import SupportTicket from "../models/supportTicketModel.js";
import {
  getAdminStats,
  getAllUsers,
  getUserById,
  approveUser,
  rejectUser,
} from "../controllers/adminController.js";
import { getAllTickets, updateTicket } from "../controllers/adminSupportController.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const mockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  companyName: "TestCo",
  email: "test@example.com",
  role: "manufacturer",
  isAccountVerified: false,
  submittedForVerification: false,
  ...overrides,
});

// ──────────────────── adminController ────────────────────

describe("getAdminStats", () => {
  beforeEach(() => {
    vi.mocked(User.count).mockReturnValue(10);
    vi.mocked(Order.count).mockReturnValue(5);
  });

  it("returns 200 with all stat fields", () => {
    const req = {} as Request;
    const res = mockRes();
    getAdminStats(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        stats: expect.objectContaining({
          totalUsers: expect.any(Number),
          pendingVerification: expect.any(Number),
          verifiedUsers: expect.any(Number),
          manufacturers: expect.any(Number),
          logistics: expect.any(Number),
          totalOrders: expect.any(Number),
          pendingOrders: expect.any(Number),
          deliveredOrders: expect.any(Number),
        }),
      })
    );
  });

  it("returns 500 on error", () => {
    vi.mocked(User.count).mockImplementation(() => { throw new Error("DB error"); });
    const req = {} as Request;
    const res = mockRes();
    getAdminStats(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
  });
});

describe("getAllUsers", () => {
  beforeEach(() => {
    vi.mocked(User.findAll).mockReturnValue([mockUser()] as never);
    vi.mocked(User.count).mockReturnValue(1);
  });

  it("returns 200 with paginated users", () => {
    const req = { query: { page: "1", limit: "10" } } as unknown as Request;
    const res = mockRes();
    getAllUsers(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, users: expect.any(Array), pagination: expect.any(Object) }));
  });

  it("filters by status=pending", () => {
    const req = { query: { status: "pending" } } as unknown as Request;
    const res = mockRes();
    getAllUsers(req, res);
    expect(User.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ submittedForVerification: true, isAccountVerified: false }),
      expect.any(Object)
    );
  });

  it("filters by role=logistics", () => {
    const req = { query: { role: "logistics" } } as unknown as Request;
    const res = mockRes();
    getAllUsers(req, res);
    expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({ role: "logistics" }), expect.any(Object));
  });

  it("filters by search term", () => {
    const req = { query: { search: "TestCo" } } as unknown as Request;
    const res = mockRes();
    getAllUsers(req, res);
    expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({ search: "TestCo" }), expect.any(Object));
  });
});

describe("getUserById", () => {
  it("returns 400 for non-integer userId", () => {
    const req = { params: { userId: "abc" } } as unknown as Request;
    const res = mockRes();
    getUserById(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 400 for userId < 1", () => {
    const req = { params: { userId: "0" } } as unknown as Request;
    const res = mockRes();
    getUserById(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when user not found", () => {
    vi.mocked(User.findById).mockReturnValue(null);
    const req = { params: { userId: "99" } } as unknown as Request;
    const res = mockRes();
    getUserById(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 404 for admin users", () => {
    vi.mocked(User.findById).mockReturnValue(mockUser({ role: "admin" }) as never);
    const req = { params: { userId: "1" } } as unknown as Request;
    const res = mockRes();
    getUserById(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 200 with user and order stats", () => {
    vi.mocked(User.findById).mockReturnValue(mockUser() as never);
    vi.mocked(Order.count).mockReturnValue(3);
    const req = { params: { userId: "1" } } as unknown as Request;
    const res = mockRes();
    getUserById(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.any(Object), orderStats: expect.objectContaining({ totalOrders: 3, activeOrders: 3 }) })
    );
  });
});

describe("approveUser", () => {
  it("returns 400 for invalid userId", () => {
    const req = { params: { userId: "bad" } } as unknown as Request;
    const res = mockRes();
    approveUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when user not found", () => {
    vi.mocked(User.findById).mockReturnValue(null);
    const req = { params: { userId: "5" } } as unknown as Request;
    const res = mockRes();
    approveUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("approves user and returns 200", () => {
    vi.mocked(User.findById).mockReturnValue(mockUser() as never);
    vi.mocked(User.update).mockReturnValue(mockUser({ isAccountVerified: true }) as never);
    const req = { params: { userId: "1" } } as unknown as Request;
    const res = mockRes();
    approveUser(req, res);
    expect(User.update).toHaveBeenCalledWith(1, expect.objectContaining({ isAccountVerified: true, submittedForVerification: false, rejectionReason: null }));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });
});

describe("rejectUser", () => {
  it("returns 400 for invalid userId", () => {
    const req = { params: { userId: "xyz" }, body: { reason: "Bad docs" } } as unknown as Request;
    const res = mockRes();
    rejectUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when user not found", () => {
    vi.mocked(User.findById).mockReturnValue(null);
    const req = { params: { userId: "5" }, body: { reason: "Invalid docs" } } as unknown as Request;
    const res = mockRes();
    rejectUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("rejects user with reason and returns 200", () => {
    vi.mocked(User.findById).mockReturnValue(mockUser() as never);
    vi.mocked(User.update).mockReturnValue(mockUser({ isAccountVerified: false, rejectionReason: "Docs unclear" }) as never);
    const req = { params: { userId: "1" }, body: { reason: "Docs unclear" } } as unknown as Request;
    const res = mockRes();
    rejectUser(req, res);
    expect(User.update).toHaveBeenCalledWith(1, expect.objectContaining({ isAccountVerified: false, rejectionReason: "Docs unclear" }));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });
});

// ──────────────────── adminSupportController ────────────────────

describe("getAllTickets", () => {
  beforeEach(() => {
    vi.mocked(SupportTicket.find).mockReturnValue([]);
    vi.mocked(SupportTicket.count).mockReturnValue(0);
  });

  it("returns 200 with paginated tickets", () => {
    const req = { query: {} } as unknown as Request;
    const res = mockRes();
    getAllTickets(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, tickets: [], pagination: expect.any(Object) }));
  });

  it("filters by status and category", () => {
    const req = { query: { status: "open", category: "billing" } } as unknown as Request;
    const res = mockRes();
    getAllTickets(req, res);
    expect(SupportTicket.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: "open", category: "billing" }),
      expect.any(Object)
    );
  });

  it("returns 500 on error", () => {
    vi.mocked(SupportTicket.find).mockImplementation(() => { throw new Error("DB error"); });
    const req = { query: {} } as unknown as Request;
    const res = mockRes();
    getAllTickets(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
  });
});

describe("updateTicket", () => {
  const mockTicket = { id: 1, subject: "Issue", status: "open", adminReply: null };

  it("returns 400 for invalid status", () => {
    const req = { params: { ticketId: "1" }, body: { status: "invalid-status" } } as unknown as Request;
    const res = mockRes();
    updateTicket(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when ticket not found", () => {
    vi.mocked(SupportTicket.update).mockReturnValue(null);
    const req = { params: { ticketId: "99" }, body: { status: "resolved" } } as unknown as Request;
    const res = mockRes();
    updateTicket(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("updates status and returns 200", () => {
    vi.mocked(SupportTicket.update).mockReturnValue({ ...mockTicket, status: "resolved" } as never);
    const req = { params: { ticketId: "1" }, body: { status: "resolved" } } as unknown as Request;
    const res = mockRes();
    updateTicket(req, res);
    expect(SupportTicket.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: "resolved" }));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });

  it("sets status to in-progress when adminReply is provided without status", () => {
    vi.mocked(SupportTicket.update).mockReturnValue({ ...mockTicket, status: "in-progress", adminReply: "We are looking into it" } as never);
    const req = { params: { ticketId: "1" }, body: { adminReply: "We are looking into it" } } as unknown as Request;
    const res = mockRes();
    updateTicket(req, res);
    expect(SupportTicket.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: "in-progress", adminReply: "We are looking into it" }));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });

  it("trims whitespace from adminReply", () => {
    vi.mocked(SupportTicket.update).mockReturnValue(mockTicket as never);
    const req = { params: { ticketId: "1" }, body: { adminReply: "  trimmed  " } } as unknown as Request;
    const res = mockRes();
    updateTicket(req, res);
    expect(SupportTicket.update).toHaveBeenCalledWith(1, expect.objectContaining({ adminReply: "trimmed" }));
  });
});
