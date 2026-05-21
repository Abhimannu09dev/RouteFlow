import { describe, it, expect, vi, beforeEach } from "vitest";

import Order from "../models/orderModel.js";

vi.mock("../models/paymentModel.js", () => ({
  default: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock("../models/orderModel.js", () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("../models/priceOfferModel.js", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import {
  getPaymentStatus,
  getMyPayments,
} from "../controllers/paymentController.js";

//  Helpers

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockPayment = (overrides = {}) => ({
  _id: "pay001",
  orderId: "order_obj_1",
  payerId: "mfg001",
  receiverId: "log001",
  amount: 5000,
  gateway: "khalti",
  status: "completed",
  createdAt: new Date(),
  ...overrides,
});

//  getPaymentStatus

describe("getPaymentStatus", () => {
  beforeEach(() => {
    Order.findById.mockResolvedValue({
      manufacturer: { toString: () => "mfg001" },
      logistics: { toString: () => "log001" },
    });
  });

  it("returns 200 with null when no payment record exists", async () => {
    Payment.findOne.mockReturnValue({ sort: vi.fn().mockResolvedValue(null) });
    const req = {
      params: { orderId: "order_obj_1" },
      user: { id: "mfg001" },
      query: {},
    };
    const res = mockRes();
    await getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, payment: null }),
    );
  });

  it("returns the most recent payment for an order", async () => {
    const payment = mockPayment();
    Payment.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(payment),
    });
    const req = {
      params: { orderId: "order_obj_1" },
      user: { id: "mfg001" },
      query: {},
    };
    const res = mockRes();
    await getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, payment }),
    );
  });

  it("returns 500 on DB error", async () => {
    Payment.findOne.mockReturnValue({
      sort: vi.fn().mockRejectedValue(new Error("DB error")),
    });
    const req = {
      params: { orderId: "order_obj_1" },
      user: { id: "mfg001" },
      query: {},
    };
    const res = mockRes();
    await getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 403 if user is not a participant", async () => {
    Order.findById.mockResolvedValue({
      manufacturer: { toString: () => "mfg001" },
      logistics: { toString: () => "log001" },
    });
    const req = {
      params: { orderId: "order_obj_1" },
      user: { id: "unauthorized_user" },
      query: {},
    };
    const res = mockRes();
    await getPaymentStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

//  getMyPayments

describe("getMyPayments", () => {
  const makeChain = (payments, count) => {
    const chain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(payments),
    };
    Payment.find.mockReturnValue(chain);
    Payment.countDocuments.mockResolvedValue(count);
    return chain;
  };

  it("returns paginated payments for the logged-in user", async () => {
    const payments = [mockPayment(), mockPayment({ _id: "pay002" })];
    makeChain(payments, 2);

    const req = {
      user: { id: "mfg001", role: "manufacturer" },
      query: { page: "1", limit: "10" },
      params: {},
    };
    const res = mockRes();
    await getMyPayments(req, res);

    expect(Payment.find).toHaveBeenCalledWith({
      $or: [{ payerId: "mfg001" }, { receiverId: "mfg001" }],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        payments,
        pagination: expect.objectContaining({ total: 2, page: 1, limit: 10 }),
      }),
    );
  });

  it("uses default pagination when no query params provided", async () => {
    makeChain([], 0);
    const req = {
      user: { id: "mfg001", role: "manufacturer" },
      query: {},
      params: {},
    };
    const res = mockRes();
    await getMyPayments(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({ page: 1, limit: 10 }),
      }),
    );
  });

  it("returns 500 on DB error", async () => {
    const chain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error("DB crash")),
    };
    Payment.find.mockReturnValue(chain);
    Payment.countDocuments.mockResolvedValue(0);
    const req = {
      user: { id: "mfg001", role: "manufacturer" },
      query: {},
      params: {},
    };
    const res = mockRes();
    await getMyPayments(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
