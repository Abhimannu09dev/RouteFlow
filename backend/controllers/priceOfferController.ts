import db from "../db/database.js";
import type { Request, Response } from "express";
import PriceOffer from "../models/priceOfferModel.js";
import Order from "../models/orderModel.js";
import type { LogisticsRef } from "../types/index.js";
import {
  notifyManufacturerNewBid,
  notifyLogisticsBidAccepted,
  notifyLogisticsBidRejected,
} from "../websocket/orderEvents.js";

function getLogisticsId(logistics: LogisticsRef | number): number {
  return typeof logistics === "object" ? logistics.id : logistics;
}

export const submitOffer = (req: Request, res: Response): void => {
  try {
    const { orderId } = req.params as { orderId: string };
    const { proposedPrice, estimatedDeliveryDays, note } = req.body as {
      proposedPrice: number;
      estimatedDeliveryDays: number;
      note?: string;
    };

    const order = Order.findByOrderId(orderId);
    if (!order || order.status !== "pending" || order.logistics) {
      res.status(404).json({ success: false, message: "Order not found or no longer available for bidding" });
      return;
    }

    const existingOffer = PriceOffer.findOne({ orderId: order.id, logisticsId: req.user.id });

    if (existingOffer) {
      if (existingOffer.status === "withdrawn") {
        const updated = PriceOffer.update(existingOffer.id, {
          proposedPrice,
          estimatedDeliveryDays,
          note: note ?? "",
          status: "pending",
        });
        res.status(200).json({ success: true, message: "Price offer resubmitted", offer: updated });
        return;
      }
      res.status(409).json({ success: false, message: "You have already submitted an offer for this order." });
      return;
    }

    const offer = PriceOffer.create({
      orderId: order.id,
      logisticsId: req.user.id,
      proposedPrice,
      estimatedDeliveryDays,
      note: note ?? "",
    });

    if (offer) {
      const logisticsName =
        typeof offer.logistics === "object"
          ? (offer.logistics.companyName ?? "")
          : "";
      notifyManufacturerNewBid(order, offer, logisticsName);
    }

    res.status(201).json({ success: true, message: "Price offer submitted successfully", offer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const getOffers = (req: Request, res: Response): void => {
  try {
    const { orderId } = req.params as { orderId: string };

    const order = Order.findByOrderId(orderId);
    if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }

    if (req.user.role === "manufacturer" && String(order.manufacturer?.id) !== String(req.user.id)) {
      res.status(403).json({ success: false, message: "You can only view offers on your own orders" });
      return;
    }

    if (req.user.role === "logistics") {
      const myOffer = PriceOffer.findOne({ orderId: order.id, logisticsId: req.user.id });
      res.status(200).json({ success: true, offers: myOffer ? [myOffer] : [] });
      return;
    }

    const offers = PriceOffer.find({ orderId: order.id, statusNe: "withdrawn" }, { sort: "po.proposed_price ASC" });
    res.status(200).json({ success: true, offers, orderStatus: order.status });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const updateOffer = (req: Request, res: Response): void => {
  try {
    const { offerId } = req.params as { offerId: string };
    const { proposedPrice, estimatedDeliveryDays, note } = req.body as {
      proposedPrice?: number;
      estimatedDeliveryDays?: number;
      note?: string;
    };

    const offerById = PriceOffer.findById(parseInt(offerId, 10));
    if (!offerById || getLogisticsId(offerById.logistics) !== req.user.id) {
      res.status(404).json({ success: false, message: "Offer not found" });
      return;
    }
    if (offerById.status !== "pending") {
      res.status(400).json({ success: false, message: `Cannot update an offer that is already ${offerById.status}` });
      return;
    }

    const updates: Parameters<typeof PriceOffer.update>[1] = {};
    if (proposedPrice !== undefined) updates.proposedPrice = proposedPrice;
    if (estimatedDeliveryDays !== undefined) updates.estimatedDeliveryDays = estimatedDeliveryDays;
    if (note !== undefined) updates.note = note;

    const updated = PriceOffer.update(offerById.id, updates);
    res.status(200).json({ success: true, message: "Offer updated successfully", offer: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const withdrawOffer = (req: Request, res: Response): void => {
  try {
    const { offerId } = req.params as { offerId: string };

    const offerById = PriceOffer.findById(parseInt(offerId, 10));
    if (!offerById || getLogisticsId(offerById.logistics) !== req.user.id) {
      res.status(404).json({ success: false, message: "Offer not found" });
      return;
    }
    if (offerById.status !== "pending") {
      res.status(400).json({ success: false, message: `Cannot withdraw an offer that is already ${offerById.status}` });
      return;
    }

    PriceOffer.update(offerById.id, { status: "withdrawn" });
    res.status(200).json({ success: true, message: "Offer withdrawn successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const acceptOffer = (req: Request, res: Response): void => {
  try {
    const { orderId, offerId } = req.params as { orderId: string; offerId: string };

    const order = Order.findByOrderId(orderId);
    if (!order || order.status !== "pending" || String(order.manufacturer?.id) !== String(req.user.id)) {
      res.status(404).json({
        success: false,
        message: "Order not found, already accepted, or you do not own this order",
      });
      return;
    }

    const offer = PriceOffer.findById(parseInt(offerId, 10));
    if (!offer || offer.order !== order.id || offer.status !== "pending") {
      res.status(404).json({ success: false, message: "Offer not found or no longer available" });
      return;
    }

    const logisticsId = getLogisticsId(offer.logistics);

    const acceptTransaction = db.transaction(() => {
      Order.update(order.id, { logisticsId, status: "accepted" });
      PriceOffer.update(offer.id, { status: "accepted" });
      PriceOffer.updateMany({ orderId: order.id, statusNe: "accepted" }, { status: "rejected" });
    });
    acceptTransaction();

    const rejectedOffers = PriceOffer.findPendingExcluding(order.id, offer.id);

    notifyLogisticsBidAccepted(offer, order);
    rejectedOffers.forEach((rejected) => {
      notifyLogisticsBidRejected(getLogisticsId(rejected.logistics), order.orderId, rejected.proposedPrice);
    });

    const updatedOrder = Order.findById(order.id);
    const updatedOffer = PriceOffer.findById(offer.id);
    const offerLogisticsName =
      updatedOffer && typeof updatedOffer.logistics === "object"
        ? (updatedOffer.logistics.companyName ?? "logistics")
        : "logistics";

    res.status(200).json({
      success: true,
      message: `Offer from ${offerLogisticsName} accepted. Order confirmed.`,
      order: updatedOrder,
      offer: updatedOffer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const getMyOffers = (req: Request, res: Response): void => {
  try {
    const offers = PriceOffer.findWithOrder({ logisticsId: req.user.id });
    res.status(200).json({ success: true, offers });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyOfferStats = (req: Request, res: Response): void => {
  try {
    const stats = PriceOffer.getStats(req.user.id);
    res.status(200).json({ success: true, stats });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
