import { describe, it, expect, vi, beforeEach } from "vitest";

//  Mocks

vi.mock("../models/orderModel.js", () => {
  const Order = vi.fn();
  Order.findOne = vi.fn();
  Order.find = vi.fn();
  Order.findOneAndUpdate = vi.fn();
  Order.countDocuments = vi.fn();
  return { default: Order };
});

vi.mock("../models/priceOfferModel.js", () => ({
  default: {
    findOne: vi.fn(),
  },
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
  getMyOrders,
  getOrderDetails,
  updateOrderStatus,
} from "../controllers/orderController.js";
import {
  notifyLogisticsNewOrder,
  notifyManufacturerStatusUpdate,
} from "../websocket/orderEvents.js";

//  Helpers

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const manufacturerReq = (body = {}, params = {}, query = {}) => ({
  user: { id: "mfg001", role: "manufacturer" },
  body,
  params,
  query,
});

const logisticsReq = (body = {}, params = {}, query = {}) => ({
  user: { id: "log001", role: "logistics" },
  body,
  params,
  query,
});

const mockOrder = (overrides = {}) => ({
  _id: "order_id_1",
  orderId: "ORD-ABC123",
  manufacturer: "mfg001",
  productDetails: "Cement bags",
  quantity: 100,
  weight: 500,
  vehicleType: "truck",
  routeFrom: "Kathmandu",
  routeTo: "Pokhara",
  status: "pending",
  logistics: null,
  save: vi.fn(),
  ...overrides,
});

//  createOrder

describe("createOrder", () => {
  it("returns 403 when a non-manufacturer tries to create an order", async () => {
    const req = logisticsReq({
      productDetails: "Goods",
      quantity: 10,
      weight: 100,
      vehicleType: "truck",
      routeFrom: "KTM",
      routeTo: "PKR",
    });
    const res = mockRes();
    await createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Only manufacturers can create orders",
      }),
    );
  });


  it("creates an order and notifies logistics on success", async () => {
    const saveMock = vi.fn().mockResolvedValue(true);
    Order.mockImplementation(function () {
      this._id = "order_id_1";
      this.orderId = "ORD-ABC123";
      this.manufacturer = "mfg001";
      this.save = saveMock;
    });
    notifyLogisticsNewOrder.mockImplementation(() => {});

    const req = manufacturerReq({
      productDetails: "Cement bags",
      quantity: 100,
      weight: 500,
      vehicleType: "truck",
      routeFrom: "Kathmandu",
      routeTo: "Pokhara",
    });
    const res = mockRes();
    await createOrder(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(notifyLogisticsNewOrder).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("returns 500 on unexpected DB error", async () => {
    Order.mockImplementation(function () {
      this.save = vi.fn().mockRejectedValue(new Error("DB crash"));
    });
    const req = manufacturerReq({
      productDetails: "Goods",
      quantity: 10,
      weight: 100,
      vehicleType: "truck",
      routeFrom: "KTM",
      routeTo: "PKR",
    });
    const res = mockRes();
    await createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

//  getAvailableOrders

describe("getAvailableOrders", () => {
  const makeChain = (orders, count) => {
    const chain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(orders),
    };
    Order.find = vi.fn().mockReturnValue(chain);
    Order.countDocuments = vi.fn().mockResolvedValue(count);
    return chain;
  };

  it("returns manufacturer's own orders with pagination", async () => {
    const orders = [mockOrder()];
    makeChain(orders, 1);

    const req = manufacturerReq({}, {}, { page: "1", limit: "10" });
    const res = mockRes();
    await getAvailableOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        orders,
        pagination: expect.objectContaining({ total: 1, page: 1, limit: 10 }),
      }),
    );
  });

  it("returns available pending orders for logistics", async () => {
    const orders = [mockOrder({ logistics: null, status: "pending" })];
    makeChain(orders, 1);

    const req = logisticsReq({}, {}, {});
    const res = mockRes();
    await getAvailableOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, orders }),
    );
  });

  it("returns 403 for unsupported role (admin)", async () => {
    const req = {
      user: { id: "adm1", role: "admin" },
      body: {},
      params: {},
      query: {},
    };
    const res = mockRes();
    await getAvailableOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 500 on DB error", async () => {
    Order.find = vi.fn().mockImplementation(() => {
      throw new Error("DB failure");
    });
    const req = manufacturerReq({}, {}, {});
    const res = mockRes();
    await getAvailableOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

//  getMyOrders

describe("getMyOrders", () => {
  const makeChain = (orders, count) => {
    const chain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(orders),
    };
    Order.find = vi.fn().mockReturnValue(chain);
    Order.countDocuments = vi.fn().mockResolvedValue(count);
    return chain;
  };

  it("returns logistics' assigned orders", async () => {
    const orders = [mockOrder({ logistics: "log001", status: "in transit" })];
    makeChain(orders, 1);
    const req = logisticsReq({}, {}, {});
    const res = mockRes();
    await getMyOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, orders }),
    );
  });

  it("returns manufacturer's orders with status filter", async () => {
    const orders = [mockOrder({ status: "delivered" })];
    makeChain(orders, 1);
    const req = manufacturerReq({}, {}, { status: "delivered" });
    const res = mockRes();
    await getMyOrders(req, res);
    expect(Order.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: "delivered" }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 403 for unsupported role", async () => {
    const req = {
      user: { id: "adm1", role: "admin" },
      body: {},
      params: {},
      query: {},
    };
    const res = mockRes();
    await getMyOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

//  getOrderDetails

describe("getOrderDetails", () => {
  it("returns 404 when order not found", async () => {
    // findOne(...).populate(...).populate(...) resolves to null
    const chain = { populate: vi.fn() };
    chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(null);
    Order.findOne = vi.fn().mockReturnValue(chain);

    const req = {
      user: { id: "mfg001", role: "manufacturer" },
      params: { orderId: "BADID" },
      body: {},
      query: {},
    };
    const res = mockRes();
    await getOrderDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Order not found" }),
    );
  });

  it("returns the order when found", async () => {
    const order = mockOrder();
    const chain = {
      populate: vi.fn().mockReturnThis(),
    };
    chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(order);
    Order.findOne = vi.fn().mockReturnValue(chain);

    const req = {
      user: { id: "mfg001", role: "manufacturer" },
      params: { orderId: "ORD-ABC123" },
      body: {},
      query: {},
    };
    const res = mockRes();
    await getOrderDetails(req, res);
    expect(Order.findOne).toHaveBeenCalledWith({ orderId: "ORD-ABC123" });
  });

  it("returns 403 if user is not a participant", async () => {
    const order = {
      _id: "order123",
      orderId: "ORD-ABC123",
      manufacturer: { _id: { toString: () => "mfg001" }, companyName: "Test MFG" },
      logistics: { _id: { toString: () => "log001" }, companyName: "Test LOG" },
      status: "accepted",
    };
    const chain = {
      populate: vi.fn().mockReturnThis(),
    };
    chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(order);
    Order.findOne = vi.fn().mockReturnValue(chain);

    const req = {
      user: { id: "unauthorized_user", role: "manufacturer" },
      params: { orderId: "ORD-ABC123" },
      body: {},
      query: {},
    };
    const res = mockRes();
    await getOrderDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not authorized" }),
    );
  });

  it("allows admin to view any order", async () => {
    const order = {
      _id: "order123",
      orderId: "ORD-ABC123",
      manufacturer: { _id: { toString: () => "mfg001" }, companyName: "Test MFG" },
      logistics: { _id: { toString: () => "log001" }, companyName: "Test LOG" },
      status: "accepted",
    };
    const chain = {
      populate: vi.fn().mockReturnThis(),
    };
    chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(order);
    Order.findOne = vi.fn().mockReturnValue(chain);

    const req = {
      user: { id: "admin001", role: "admin" },
      params: { orderId: "ORD-ABC123" },
      body: {},
      query: {},
    };
    const res = mockRes();
    await getOrderDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

//  updateOrderStatus

describe("updateOrderStatus", () => {
  it("returns 400 for invalid status", async () => {
    const req = logisticsReq(
      { status: "unknown_status" },
      { orderId: "ORD-ABC123" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Status must be one of"),
      }),
    );
  });

  it("returns 404 when order not found or user is not assigned logistics", async () => {
    const chain = {
      populate: vi.fn().mockReturnThis(),
    };
    chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(null);
    Order.findOneAndUpdate = vi.fn().mockReturnValue(chain);

    const req = logisticsReq(
      { status: "delivered" },
      { orderId: "ORD-ABC123" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updates status and notifies manufacturer on success", async () => {
    const updatedOrder = mockOrder({
      status: "delivered",
      logistics: { _id: "log001", companyName: "FastLog" },
    });
    const chain = {
      populate: vi.fn().mockReturnThis(),
    };
    chain.populate
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce(updatedOrder);
    Order.findOneAndUpdate = vi.fn().mockReturnValue(chain);
    notifyManufacturerStatusUpdate.mockImplementation(() => {});

    const req = logisticsReq(
      { status: "delivered" },
      { orderId: "ORD-ABC123" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);

    expect(notifyManufacturerStatusUpdate).toHaveBeenCalledWith(
      updatedOrder,
      "delivered",
      "FastLog",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, order: updatedOrder }),
    );
  });

  it("returns 400 when status is missing", async () => {
    const req = logisticsReq({}, { orderId: "ORD-ABC123" });
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("accepts all valid statuses", async () => {
    const validStatuses = ["accepted", "in transit", "delivered", "cancelled"];
    for (const status of validStatuses) {
      const order = mockOrder({
        status,
        logistics: { _id: "log001", companyName: "FL" },
      });
      const chain = { populate: vi.fn().mockReturnThis() };
      chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(order);
      Order.findOneAndUpdate = vi.fn().mockReturnValue(chain);
      notifyManufacturerStatusUpdate.mockImplementation(() => {});

      const req = logisticsReq({ status }, { orderId: "ORD-ABC123" });
      const res = mockRes();
      await updateOrderStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    }
  });
});
