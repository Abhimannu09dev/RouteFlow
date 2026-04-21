import { describe, it, expect, vi, beforeEach } from "vitest";

//  Mocks

vi.mock("../models/priceOfferModel.js", () => {
  const PriceOffer = vi.fn();
  PriceOffer.findOne = vi.fn();
  PriceOffer.find = vi.fn();
  PriceOffer.updateMany = vi.fn();
  return { default: PriceOffer };
});

vi.mock("../models/orderModel.js", () => ({
  default: {
    findOne: vi.fn(),
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
  acceptOffer,
  getMyOffers,
} from "../controllers/priceOfferController.js";
import {
  notifyManufacturerNewBid,
  notifyLogisticsBidAccepted,
  notifyLogisticsBidRejected,
} from "../websocket/orderEvents.js";

//  Helpers

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const logisticsReq = (body = {}, params = {}) => ({
  user: { id: "log001", role: "logistics" },
  body,
  params,
  query: {},
});

const manufacturerReq = (body = {}, params = {}) => ({
  user: { id: "mfg001", role: "manufacturer" },
  body,
  params,
  query: {},
});

const mockOrderDoc = (overrides = {}) => ({
  _id: "order_obj_id",
  orderId: "ORD-ABC",
  manufacturer: "mfg001",
  status: "pending",
  logistics: null,
  save: vi.fn(),
  populate: vi.fn(),
  ...overrides,
});

const mockOfferDoc = (overrides = {}) => ({
  _id: "offer_id_1",
  order: "order_obj_id",
  orderId: "ORD-ABC",
  logistics: "log001",
  proposedPrice: 5000,
  estimatedDeliveryDays: 3,
  note: "",
  status: "pending",
  updatedAt: new Date(),
  save: vi.fn(),
  populate: vi.fn().mockResolvedValue({
    logistics: { _id: "log001", companyName: "FastLog", email: "fast@log.com" },
    proposedPrice: 5000,
  }),
  ...overrides,
});

//  submitOffer

describe("submitOffer", () => {
  it("returns 403 when non-logistics tries to submit", async () => {
    const req = manufacturerReq(
      { proposedPrice: 5000, estimatedDeliveryDays: 3 },
      { orderId: "ORD-ABC" },
    );
    const res = mockRes();
    await submitOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Only logistics companies can submit price offers",
      }),
    );
  });

  it("returns 400 when proposedPrice is missing or zero", async () => {
    const req = logisticsReq(
      { proposedPrice: 0, estimatedDeliveryDays: 3 },
      { orderId: "ORD-ABC" },
    );
    const res = mockRes();
    await submitOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "A valid proposed price is required",
      }),
    );
  });

  it("returns 400 when estimatedDeliveryDays is missing", async () => {
    const req = logisticsReq(
      { proposedPrice: 5000, estimatedDeliveryDays: 0 },
      { orderId: "ORD-ABC" },
    );
    const res = mockRes();
    await submitOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Estimated delivery days is required",
      }),
    );
  });

  it("returns 404 when order not found or unavailable", async () => {
    Order.findOne.mockResolvedValue(null);
    const req = logisticsReq(
      { proposedPrice: 5000, estimatedDeliveryDays: 3 },
      { orderId: "BAD-ID" },
    );
    const res = mockRes();
    await submitOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Order not found or no longer available for bidding",
      }),
    );
  });

  it("returns 409 when logistics has already submitted an active offer", async () => {
    Order.findOne.mockResolvedValue(mockOrderDoc());
    PriceOffer.findOne.mockResolvedValue(mockOfferDoc({ status: "pending" }));
    const req = logisticsReq(
      { proposedPrice: 5000, estimatedDeliveryDays: 3 },
      { orderId: "ORD-ABC" },
    );
    const res = mockRes();
    await submitOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "You have already submitted an offer for this order.",
      }),
    );
  });

  it("resubmits a previously withdrawn offer", async () => {
    const order = mockOrderDoc();
    Order.findOne.mockResolvedValue(order);
    const existingOffer = mockOfferDoc({ status: "withdrawn" });
    PriceOffer.findOne.mockResolvedValue(existingOffer);

    const req = logisticsReq(
      { proposedPrice: 6000, estimatedDeliveryDays: 4, note: "Updated" },
      { orderId: "ORD-ABC" },
    );
    const res = mockRes();
    await submitOffer(req, res);

    expect(existingOffer.save).toHaveBeenCalled();
    expect(existingOffer.proposedPrice).toBe(6000);
    expect(existingOffer.status).toBe("pending");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Price offer resubmitted" }),
    );
  });

  it("creates a new offer and notifies manufacturer", async () => {
    const order = mockOrderDoc();
    Order.findOne.mockResolvedValue(order);
    PriceOffer.findOne.mockResolvedValue(null); // No existing offer

    const saveMock = vi.fn().mockResolvedValue(true);
    const populateMock = vi.fn().mockResolvedValue({
      logistics: {
        _id: "log001",
        companyName: "FastLog",
        email: "fast@log.com",
      },
      proposedPrice: 5000,
      orderId: "order_obj_id",
    });
    PriceOffer.mockImplementation(function () {
      this.save = saveMock;
      this.populate = populateMock;
      this.orderId = "order_obj_id";
      this.proposedPrice = 5000;
      this.logistics = "log001";
    });
    notifyManufacturerNewBid.mockImplementation(() => {});

    const req = logisticsReq(
      { proposedPrice: 5000, estimatedDeliveryDays: 3 },
      { orderId: "ORD-ABC" },
    );
    const res = mockRes();
    await submitOffer(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(notifyManufacturerNewBid).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Price offer submitted successfully",
      }),
    );
  });
});

//  getOffers

describe("getOffers", () => {
  it("returns 404 when order not found", async () => {
    Order.findOne.mockResolvedValue(null);
    const req = {
      user: { id: "mfg001", role: "manufacturer" },
      params: { orderId: "BAD" },
      body: {},
      query: {},
    };
    const res = mockRes();
    await getOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 when manufacturer tries to view another manufacturer's order offers", async () => {
    Order.findOne.mockResolvedValue(
      mockOrderDoc({ manufacturer: "other_mfg" }),
    );
    const req = {
      user: { id: "mfg001", role: "manufacturer" },
      params: { orderId: "ORD-ABC" },
      body: {},
      query: {},
    };
    const res = mockRes();
    await getOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns logistics' own offer only", async () => {
    const order = mockOrderDoc();
    Order.findOne.mockResolvedValue(order);
    const myOffer = mockOfferDoc();
    PriceOffer.findOne = vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue(myOffer),
    });

    const req = logisticsReq({}, { orderId: "ORD-ABC" });
    const res = mockRes();
    await getOffers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, offers: [myOffer] }),
    );
  });

  it("returns empty array when logistics has no offer for this order", async () => {
    Order.findOne.mockResolvedValue(mockOrderDoc());
    PriceOffer.findOne = vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue(null),
    });
    const req = logisticsReq({}, { orderId: "ORD-ABC" });
    const res = mockRes();
    await getOffers(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ offers: [] }),
    );
  });

  it("returns all non-withdrawn offers for a manufacturer", async () => {
    const order = mockOrderDoc({ manufacturer: "mfg001" });
    Order.findOne.mockResolvedValue(order);
    const offers = [
      mockOfferDoc(),
      mockOfferDoc({ _id: "offer2", logistics: "log002" }),
    ];
    PriceOffer.find = vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockResolvedValue(offers),
    });

    const req = {
      user: { id: "mfg001", role: "manufacturer" },
      params: { orderId: "ORD-ABC" },
      body: {},
      query: {},
    };
    const res = mockRes();
    await getOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, offers }),
    );
  });
});

//  updateOffer

describe("updateOffer", () => {
  it("returns 403 for non-logistics users", async () => {
    const req = manufacturerReq({ proposedPrice: 4000 }, { offerId: "offer1" });
    const res = mockRes();
    await updateOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 when offer not found", async () => {
    PriceOffer.findOne = vi.fn().mockResolvedValue(null);
    const req = logisticsReq({ proposedPrice: 4000 }, { offerId: "bad_id" });
    const res = mockRes();
    await updateOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when offer is not in pending state", async () => {
    PriceOffer.findOne = vi
      .fn()
      .mockResolvedValue(mockOfferDoc({ status: "accepted" }));
    const req = logisticsReq({ proposedPrice: 4000 }, { offerId: "offer1" });
    const res = mockRes();
    await updateOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot update an offer that is already accepted",
      }),
    );
  });

  it("updates offer fields and returns 200", async () => {
    const offer = mockOfferDoc({ status: "pending" });
    PriceOffer.findOne = vi.fn().mockResolvedValue(offer);

    const req = logisticsReq(
      { proposedPrice: 4500, estimatedDeliveryDays: 5, note: "Revised" },
      { orderId: "ORD-ABC", offerId: "offer1" },
    );
    const res = mockRes();
    await updateOffer(req, res);

    expect(offer.proposedPrice).toBe(4500);
    expect(offer.estimatedDeliveryDays).toBe(5);
    expect(offer.note).toBe("Revised");
    expect(offer.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Offer updated successfully" }),
    );
  });
});

//  withdrawOffer

describe("withdrawOffer", () => {
  it("returns 403 for non-logistics users", async () => {
    const req = manufacturerReq({}, { offerId: "offer1" });
    const res = mockRes();
    await withdrawOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 when offer not found", async () => {
    PriceOffer.findOne = vi.fn().mockResolvedValue(null);
    const req = logisticsReq({}, { offerId: "bad_id" });
    const res = mockRes();
    await withdrawOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when offer is not pending", async () => {
    PriceOffer.findOne = vi
      .fn()
      .mockResolvedValue(mockOfferDoc({ status: "accepted" }));
    const req = logisticsReq({}, { orderId: "ORD-ABC", offerId: "offer1" });
    const res = mockRes();
    await withdrawOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot withdraw an offer that is already accepted",
      }),
    );
  });

  it("sets status to withdrawn and returns 200", async () => {
    const offer = mockOfferDoc({ status: "pending" });
    PriceOffer.findOne = vi.fn().mockResolvedValue(offer);
    const req = logisticsReq({}, { orderId: "ORD-ABC", offerId: "offer1" });
    const res = mockRes();
    await withdrawOffer(req, res);

    expect(offer.status).toBe("withdrawn");
    expect(offer.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Offer withdrawn successfully" }),
    );
  });
});

//  acceptOffer

describe("acceptOffer", () => {
  beforeEach(() => {
    notifyLogisticsBidAccepted.mockImplementation(() => {});
    notifyLogisticsBidRejected.mockImplementation(() => {});
  });

  it("returns 403 for non-manufacturer users", async () => {
    const req = logisticsReq({}, { orderId: "ORD-ABC", offerId: "offer1" });
    const res = mockRes();
    await acceptOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 when order not found or manufacturer mismatch", async () => {
    Order.findOne.mockResolvedValue(null);
    const req = manufacturerReq({}, { orderId: "ORD-ABC", offerId: "offer1" });
    const res = mockRes();
    await acceptOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Order not found"),
      }),
    );
  });

  it("returns 404 when offer not found", async () => {
    Order.findOne.mockResolvedValue(mockOrderDoc({ manufacturer: "mfg001" }));
    PriceOffer.findOne = vi.fn().mockResolvedValue(null);
    const req = manufacturerReq(
      {},
      { orderId: "ORD-ABC", offerId: "bad_offer" },
    );
    const res = mockRes();
    await acceptOffer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Offer not found or no longer available",
      }),
    );
  });

  it("accepts offer: assigns logistics, rejects other offers, notifies parties", async () => {
    const order = mockOrderDoc({ manufacturer: "mfg001" });
    const offer = mockOfferDoc({ status: "pending", logistics: "log001" });
    const otherOffer = mockOfferDoc({
      _id: "offer2",
      logistics: "log002",
      status: "pending",
    });

    order.populate = vi.fn().mockResolvedValue({
      ...order,
      manufacturer: { companyName: "MfgCo", email: "mfg@co.com" },
      logistics: { companyName: "FastLog", email: "fast@log.com" },
    });
    offer.populate = vi.fn().mockResolvedValue({
      ...offer,
      logistics: {
        _id: "log001",
        companyName: "FastLog",
        email: "fast@log.com",
      },
    });

    Order.findOne.mockResolvedValue(order);
    PriceOffer.findOne = vi.fn().mockResolvedValue(offer);
    PriceOffer.find = vi.fn().mockResolvedValue([otherOffer]);
    PriceOffer.updateMany = vi.fn().mockResolvedValue({ nModified: 1 });

    const req = manufacturerReq(
      {},
      { orderId: "ORD-ABC", offerId: "offer_id_1" },
    );
    const res = mockRes();
    await acceptOffer(req, res);

    expect(order.logistics).toBe("log001");
    expect(order.status).toBe("accepted");
    expect(order.save).toHaveBeenCalled();
    expect(offer.status).toBe("accepted");
    expect(offer.save).toHaveBeenCalled();
    expect(PriceOffer.updateMany).toHaveBeenCalled();
    expect(notifyLogisticsBidAccepted).toHaveBeenCalledWith(offer, order);
    expect(notifyLogisticsBidRejected).toHaveBeenCalledWith(
      otherOffer.logistics,
      order.orderId,
      otherOffer.proposedPrice,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

//  getMyOffers

describe("getMyOffers", () => {
  it("returns 403 for non-logistics users", async () => {
    const req = manufacturerReq({}, {});
    const res = mockRes();
    await getMyOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns all offers for the logged-in logistics user", async () => {
    const offers = [mockOfferDoc(), mockOfferDoc({ _id: "offer2" })];
    PriceOffer.find = vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockResolvedValue(offers),
    });
    const req = logisticsReq({}, {});
    const res = mockRes();
    await getMyOffers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, offers }),
    );
  });
});
