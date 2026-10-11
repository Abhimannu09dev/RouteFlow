import { describe, it, expect, vi, beforeEach } from "vitest";

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
  default: {
    findById: vi.fn(),
    findByOrderId: vi.fn(),
  },
}));

vi.mock("../models/priceOfferModel.js", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("../models/userModel.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import { getPaymentStatus, getMyPayments } from "../controllers/paymentController.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockPayment = (overrides = {}) => ({
  id: 1, _id: 1,
  orderId: 1,
  payerId: 1,
  receiverId: 2,
  amount: 5000,
  gateway: "khalti",
  status: "completed",
  createdAt: new Date().toISOString(),
  ...overrides,
});

const mockOrder = (overrides = {}) => ({
  id: 1, _id: 1,
  status: "delivered",
  manufacturer: { id: 1, _id: 1 },
  logistics: { id: 2, _id: 2 },
  ...overrides,
});

// getPaymentStatus

describe("getPaymentStatus", () => {
  beforeEach(() => {
    Order.findById.mockReturnValue(mockOrder());
  });

  it("returns 200 with null when no payment record exists", () => {
    Payment.findOne.mockReturnValue(null);
    const req = { params: { orderId: "1" }, user: { id: 1, role: "manufacturer" } };
    const res = mockRes();
    getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, payment: null }));
  });

  it("returns the most recent payment for an order", () => {
    const payment = mockPayment();
    Payment.findOne.mockReturnValue(payment);
    const req = { params: { orderId: "1" }, user: { id: 1, role: "manufacturer" } };
    const res = mockRes();
    getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, payment }));
  });

  it("returns 403 for an unrelated user", () => {
    Payment.findOne.mockReturnValue(null);
    const req = { params: { orderId: "1" }, user: { id: 99, role: "logistics" } };
    const res = mockRes();
    getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 when order is not found", () => {
    Order.findById.mockReturnValue(null);
    const req = { params: { orderId: "999" }, user: { id: 1, role: "manufacturer" } };
    const res = mockRes();
    getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// getMyPayments

describe("getMyPayments", () => {
  it("returns paginated payments for the logged-in user", () => {
    Payment._findAllWithJoins.mockReturnValue([mockPayment()]);
    Payment.count.mockReturnValue(1);
    const req = { user: { id: 1, role: "manufacturer" }, query: {} };
    const res = mockRes();
    getMyPayments(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, payments: [mockPayment()] }));
  });
});
