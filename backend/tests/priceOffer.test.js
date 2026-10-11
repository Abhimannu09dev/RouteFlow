import { describe, it, expect, vi, beforeEach } from "vitest";

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
  default: {
    transaction: vi.fn((fn) => fn),
  },
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
  updateOffer,
  withdrawOffer,
  getMyOffers,
  getMyOfferStats,
} from "../controllers/priceOfferController.js";
import { notifyManufacturerNewBid } from "../websocket/orderEvents.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const logisticsReq = (body = {}, params = {}) => ({
  user: { id: 2, role: "logistics" },
  body,
  params,
  query: {},
});

const manufacturerReq = (body = {}, params = {}) => ({
  user: { id: 1, role: "manufacturer" },
  body,
  params,
  query: {},
});

const mockOrderDoc = (overrides = {}) => ({
  id: 1, _id: 1,
  orderId: "ORD-ABC",
  manufacturer: { id: 1, _id: 1, companyName: "TestMfg" },
  status: "pending",
  logistics: null,
  ...overrides,
});

const mockOfferDoc = (overrides = {}) => ({
  id: 1, _id: 1,
  order: 1,
  orderId: "ORD-ABC",
  logistics: { id: 2, _id: 2, companyName: "FastLog", email: "fast@log.com" },
  proposedPrice: 5000,
  estimatedDeliveryDays: 3,
  note: "",
  status: "pending",
  ...overrides,
});

// submitOffer

describe("submitOffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when order not found", () => {
    Order.findByOrderId.mockReturnValue(null);
    const req = logisticsReq({ proposedPrice: 5000, estimatedDeliveryDays: 3 }, { orderId: "ORD-NOTFOUND" });
    const res = mockRes();
    submitOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 409 when a pending offer already exists", () => {
    Order.findByOrderId.mockReturnValue(mockOrderDoc());
    PriceOffer.findOne.mockReturnValue(mockOfferDoc({ status: "pending" }));
    const req = logisticsReq({ proposedPrice: 5000, estimatedDeliveryDays: 3 }, { orderId: "ORD-ABC" });
    const res = mockRes();
    submitOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("creates a new offer when none exists", () => {
    Order.findByOrderId.mockReturnValue(mockOrderDoc());
    PriceOffer.findOne.mockReturnValue(null);
    PriceOffer.create.mockReturnValue(mockOfferDoc());
    const req = logisticsReq({ proposedPrice: 5000, estimatedDeliveryDays: 3 }, { orderId: "ORD-ABC" });
    const res = mockRes();
    submitOffer(req, res);
    expect(PriceOffer.create).toHaveBeenCalled();
    expect(notifyManufacturerNewBid).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("resubmits withdrawn offer", () => {
    Order.findByOrderId.mockReturnValue(mockOrderDoc());
    PriceOffer.findOne.mockReturnValue(mockOfferDoc({ status: "withdrawn" }));
    PriceOffer.update.mockReturnValue(mockOfferDoc({ status: "pending" }));
    const req = logisticsReq({ proposedPrice: 6000, estimatedDeliveryDays: 2 }, { orderId: "ORD-ABC" });
    const res = mockRes();
    submitOffer(req, res);
    expect(PriceOffer.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// getOffers

describe("getOffers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when order not found", () => {
    Order.findByOrderId.mockReturnValue(null);
    const req = manufacturerReq({}, { orderId: "ORD-NOTFOUND" });
    const res = mockRes();
    getOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns only own offer for logistics", () => {
    Order.findByOrderId.mockReturnValue(mockOrderDoc());
    PriceOffer.findOne.mockReturnValue(mockOfferDoc());
    const req = logisticsReq({}, { orderId: "ORD-ABC" });
    const res = mockRes();
    getOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ offers: [mockOfferDoc()] }));
  });

  it("returns all non-withdrawn offers for manufacturer", () => {
    Order.findByOrderId.mockReturnValue(mockOrderDoc());
    PriceOffer.find.mockReturnValue([mockOfferDoc()]);
    const req = manufacturerReq({}, { orderId: "ORD-ABC" });
    const res = mockRes();
    getOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// getMyOffers

describe("getMyOffers", () => {
  it("returns all offers for the logistics user", () => {
    PriceOffer.findWithOrder.mockReturnValue([mockOfferDoc()]);
    const req = logisticsReq();
    const res = mockRes();
    getMyOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, offers: [mockOfferDoc()] }));
  });
});

// getMyOfferStats

describe("getMyOfferStats", () => {
  it("returns stats", () => {
    PriceOffer.getStats.mockReturnValue({ total: 5, pending: 2, accepted: 1, rejected: 1, withdrawn: 1 });
    const req = logisticsReq();
    const res = mockRes();
    getMyOfferStats(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, stats: expect.any(Object) }));
  });
});
