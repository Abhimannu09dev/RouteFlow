import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/orderModel.js", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findByOrderId: vi.fn(),
    updateByOrderId: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock("../models/priceOfferModel.js", () => ({
  default: { findOne: vi.fn() },
}));

vi.mock("../websocket/orderEvents.js", () => ({
  notifyLogisticsNewOrder: vi.fn(),
  notifyManufacturerOrderAccepted: vi.fn(),
  notifyManufacturerStatusUpdate: vi.fn(),
}));

import Order from "../models/orderModel.js";
import {
  createOrder,
  getAvailableOrders,
  getOrderDetails,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { notifyLogisticsNewOrder, notifyManufacturerStatusUpdate } from "../websocket/orderEvents.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const manufacturerReq = (body: Record<string, unknown> = {}, params: Record<string, string> = {}, query: Record<string, string> = {}) =>
  ({ user: { id: 1, role: "manufacturer" }, body, params, query }) as unknown as Request;

const logisticsReq = (body: Record<string, unknown> = {}, params: Record<string, string> = {}, query: Record<string, string> = {}) =>
  ({ user: { id: 2, role: "logistics" }, body, params, query }) as unknown as Request;

const mockOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  orderId: "ORD-ABC123",
  manufacturer: { id: 1, companyName: "TestMfg", email: "mfg@test.com" },
  productDetails: "Cement bags",
  quantity: 100,
  weight: 500,
  vehicleType: "truck",
  routeFrom: "Kathmandu",
  routeTo: "Pokhara",
  status: "pending",
  logistics: null,
  ...overrides,
});

describe("createOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Order.create).mockReturnValue(mockOrder() as never);
  });

  it("returns 403 if user is not a manufacturer", () => {
    const req = logisticsReq({ productDetails: "stuff", quantity: 10, weight: 100 });
    const res = mockRes();
    createOrder(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("creates an order and returns 201 for manufacturer", () => {
    const req = manufacturerReq({ productDetails: "Cement bags", quantity: 100, weight: 500, vehicleType: "truck", routeFrom: "Kathmandu", routeTo: "Pokhara" });
    const res = mockRes();
    createOrder(req, res);
    expect(Order.create).toHaveBeenCalled();
    expect(notifyLogisticsNewOrder).toHaveBeenCalled();
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(201);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe("getAvailableOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Order.find).mockReturnValue([] as never);
    vi.mocked(Order.count).mockReturnValue(0);
  });

  it("returns orders for manufacturer", () => {
    const req = manufacturerReq({}, {}, { page: "1", limit: "10" });
    const res = mockRes();
    getAvailableOrders(req, res);
    expect(Order.find).toHaveBeenCalledWith(expect.objectContaining({ manufacturerId: 1 }), expect.any(Object));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });

  it("returns pending orders with no logistics for logistics user", () => {
    const req = logisticsReq({}, {}, { page: "1", limit: "10" });
    const res = mockRes();
    getAvailableOrders(req, res);
    expect(Order.find).toHaveBeenCalledWith(expect.objectContaining({ logisticsNull: true, status: "pending" }), expect.any(Object));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });
});

describe("getOrderDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when order not found", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(null);
    const req = { user: { id: 1, role: "manufacturer" }, params: { orderId: "ORD-NOTFOUND" } } as unknown as Request;
    const res = mockRes();
    getOrderDetails(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns order for the manufacturer", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(mockOrder() as never);
    const req = { user: { id: 1, role: "manufacturer" }, params: { orderId: "ORD-ABC123" } } as unknown as Request;
    const res = mockRes();
    getOrderDetails(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("returns 403 for unrelated logistics on an accepted order", () => {
    vi.mocked(Order.findByOrderId).mockReturnValue(mockOrder({ status: "accepted", logistics: { id: 2, companyName: "AssignedLog" } }) as never);
    const req = { user: { id: 99, role: "logistics" }, params: { orderId: "ORD-ABC123" } } as unknown as Request;
    const res = mockRes();
    getOrderDetails(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
  });
});

describe("updateOrderStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when status is invalid", () => {
    const req = { user: { id: 2, role: "logistics" }, params: { orderId: "ORD-ABC123" }, body: { status: "invalid" } } as unknown as Request;
    const res = mockRes();
    updateOrderStatus(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 404 if order not found or wrong logistics", () => {
    vi.mocked(Order.updateByOrderId).mockReturnValue(null);
    const req = { user: { id: 2, role: "logistics" }, params: { orderId: "ORD-ABC123" }, body: { status: "in transit" } } as unknown as Request;
    const res = mockRes();
    updateOrderStatus(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("updates order status and sends notification", () => {
    const updatedOrder = mockOrder({ status: "in transit", logistics: { id: 2, companyName: "FastLog" } });
    vi.mocked(Order.updateByOrderId).mockReturnValue(updatedOrder as never);
    const req = { user: { id: 2, role: "logistics" }, params: { orderId: "ORD-ABC123" }, body: { status: "in transit" } } as unknown as Request;
    const res = mockRes();
    updateOrderStatus(req, res);
    expect(notifyManufacturerStatusUpdate).toHaveBeenCalled();
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });
});
