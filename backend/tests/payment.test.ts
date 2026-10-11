import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/paymentModel.js", () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteById: vi.fn(),
    count: vi.fn(),
    _findAllWithJoins: vi.fn(),
  },
}));

vi.mock("../models/orderModel.js", () => ({
  default: { findById: vi.fn(), findByOrderId: vi.fn() },
}));

vi.mock("../models/priceOfferModel.js", () => ({
  default: { findOne: vi.fn() },
}));

vi.mock("../models/userModel.js", () => ({
  default: { findById: vi.fn() },
}));

import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import { getPaymentStatus, getMyPayments } from "../controllers/paymentController.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const mockPayment = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  orderId: 1,
  payerId: 1,
  receiverId: 2,
  amount: 5000,
  gateway: "khalti",
  status: "completed",
  createdAt: new Date().toISOString(),
  ...overrides,
});

const mockOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  status: "delivered",
  manufacturer: { id: 1 },
  logistics: { id: 2 },
  ...overrides,
});

describe("getPaymentStatus", () => {
  beforeEach(() => {
    vi.mocked(Order.findById).mockReturnValue(mockOrder() as never);
  });

  it("returns 200 with null when no payment record exists", () => {
    vi.mocked(Payment.findOne).mockReturnValue(null);
    const req = { params: { orderId: "1" }, user: { id: 1, role: "manufacturer" } } as unknown as Request;
    const res = mockRes();
    getPaymentStatus(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, payment: null }));
  });

  it("returns the most recent payment for an order", () => {
    const payment = mockPayment();
    vi.mocked(Payment.findOne).mockReturnValue(payment as never);
    const req = { params: { orderId: "1" }, user: { id: 1, role: "manufacturer" } } as unknown as Request;
    const res = mockRes();
    getPaymentStatus(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, payment }));
  });

  it("returns 403 for an unrelated user", () => {
    vi.mocked(Payment.findOne).mockReturnValue(null);
    const req = { params: { orderId: "1" }, user: { id: 99, role: "logistics" } } as unknown as Request;
    const res = mockRes();
    getPaymentStatus(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
  });

  it("returns 404 when order is not found", () => {
    vi.mocked(Order.findById).mockReturnValue(null);
    const req = { params: { orderId: "999" }, user: { id: 1, role: "manufacturer" } } as unknown as Request;
    const res = mockRes();
    getPaymentStatus(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });
});

describe("getMyPayments", () => {
  it("returns paginated payments for the logged-in user", () => {
    const payment = mockPayment();
    vi.mocked(Payment._findAllWithJoins).mockReturnValue([payment] as never);
    vi.mocked(Payment.count).mockReturnValue(1);
    const req = { user: { id: 1, role: "manufacturer" }, query: {} } as unknown as Request;
    const res = mockRes();
    getMyPayments(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, payments: [payment] }));
  });
});
