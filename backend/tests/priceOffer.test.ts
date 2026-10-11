import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/priceOfferModel.js", () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findWithOrder: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findPendingExcluding: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock("../models/orderModel.js", () => ({
  default: {
    findById: vi.fn(),
    findByOrderId: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../db/database.js", () => ({
  default: { transaction: vi.fn((fn: () => void) => fn) },
}));

vi.mock("../websocket/orderEvents.js", () => ({
  notifyManufacturerNewBid: vi.fn(),
  notifyLogisticsBidAccepted: vi.fn(),
  notifyLogisticsBidRejected: vi.fn(),
}));

import PriceOffer from "../models/priceOfferModel.js";
import Order from "../models/orderModel.js";
import {
  submitOffer,
  getOffers,
  getMyOffers,
  getMyOfferStats,
} from "../controllers/priceOfferController.js";
import { notifyManufacturerNewBid } from "../websocket/orderEvents.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const logisticsReq = (body: Record<string, unknown> = {}, params: Record<string, string> = {}) =>
  ({ user: { id: 2, role: "logistics" }, body, params, query: {} }) as unknown as Request;

const manufacturerReq = (body: Record<string, unknown> = {}, params: Record<string, string> = {}) =>
  ({ user: { id: 1, role: "manufacturer" }, body, params, query: {} }) as unknown as Request;

const mockOrderDoc = (overrides: Record<string, unknown> = {}) => ({
  id: 1, orderId: "ORD-ABC",
  manufacturer: { id: 1, companyName: "TestMfg" },
  status: "pending", logistics: null,
  ...overrides,
});

const mockOfferDoc = (overrides: Record<string, unknown> = {}) => ({
  id: 1, order: 1, orderId: "ORD-ABC",
  logistics: { id: 2, companyName: "FastLog", email: "fast@log.com" },
  proposedPrice: 5000, estimatedDeliveryDays: 3, note: "", status: "pending",
  ...overrides,
});

describe("submitOffer", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 404 when order not found", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(null);
    const req = logisticsReq({ proposedPrice: 5000, estimatedDeliveryDays: 3 }, { orderId: "ORD-NOTFOUND" });
    const res = mockRes();
    submitOffer(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 409 when a pending offer already exists", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(mockOrderDoc() as never);
    vi.mocked(PriceOffer.findOne).mockReturnValue(mockOfferDoc({ status: "pending" }) as never);
    const req = logisticsReq({ proposedPrice: 5000, estimatedDeliveryDays: 3 }, { orderId: "ORD-ABC" });
    const res = mockRes();
    submitOffer(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(409);
  });

  it("creates a new offer when none exists", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(mockOrderDoc() as never);
    vi.mocked(PriceOffer.findOne).mockReturnValue(null);
    vi.mocked(PriceOffer.create).mockReturnValue(mockOfferDoc() as never);
    const req = logisticsReq({ proposedPrice: 5000, estimatedDeliveryDays: 3 }, { orderId: "ORD-ABC" });
    const res = mockRes();
    submitOffer(req, res);
    expect(PriceOffer.create).toHaveBeenCalled();
    expect(notifyManufacturerNewBid).toHaveBeenCalled();
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(201);
  });

  it("resubmits withdrawn offer", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(mockOrderDoc() as never);
    vi.mocked(PriceOffer.findOne).mockReturnValue(mockOfferDoc({ status: "withdrawn" }) as never);
    vi.mocked(PriceOffer.update).mockReturnValue(mockOfferDoc({ status: "pending" }) as never);
    const req = logisticsReq({ proposedPrice: 6000, estimatedDeliveryDays: 2 }, { orderId: "ORD-ABC" });
    const res = mockRes();
    submitOffer(req, res);
    expect(PriceOffer.update).toHaveBeenCalled();
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });
});

describe("getOffers", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 404 when order not found", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(null);
    const req = manufacturerReq({}, { orderId: "ORD-NOTFOUND" });
    const res = mockRes();
    getOffers(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns only own offer for logistics", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(mockOrderDoc() as never);
    vi.mocked(PriceOffer.findOne).mockReturnValue(mockOfferDoc() as never);
    const req = logisticsReq({}, { orderId: "ORD-ABC" });
    const res = mockRes();
    getOffers(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ offers: [mockOfferDoc()] }));
  });

  it("returns all non-withdrawn offers for manufacturer", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(mockOrderDoc() as never);
    vi.mocked(PriceOffer.find).mockReturnValue([mockOfferDoc()] as never);
    const req = manufacturerReq({}, { orderId: "ORD-ABC" });
    const res = mockRes();
    getOffers(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });
});

describe("getMyOffers", () => {
  it("returns all offers for the logistics user", () => {
    vi.mocked(PriceOffer.findWithOrder).mockReturnValue([mockOfferDoc()] as never);
    const req = logisticsReq();
    const res = mockRes();
    getMyOffers(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, offers: [mockOfferDoc()] }));
  });
});

describe("getMyOfferStats", () => {
  it("returns stats", () => {
    vi.mocked(PriceOffer.getStats).mockReturnValue({ total: 5, pending: 2, accepted: 1, rejected: 1, withdrawn: 1 });
    const req = logisticsReq();
    const res = mockRes();
    getMyOfferStats(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, stats: expect.any(Object) }));
  });
});
