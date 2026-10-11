import db from "../db/database.js";
import PriceOffer from "../models/priceOfferModel.js";
import Order from "../models/orderModel.js";
import {
  notifyManufacturerNewBid,
  notifyLogisticsBidAccepted,
  notifyLogisticsBidRejected,
} from "../websocket/orderEvents.js";

const submitOffer = (req, res) => {
  try {
    const { orderId } = req.params;
    const { proposedPrice, estimatedDeliveryDays, note } = req.body;

    const order = Order.findByOrderId(orderId);
    if (!order || order.status !== "pending" || order.logistics) {
      return res.status(404).json({ success: false, message: "Order not found or no longer available for bidding" });
    }

    const existingOffer = PriceOffer.findOne({ orderId: order.id, logisticsId: req.user.id });

    if (existingOffer) {
      if (existingOffer.status === "withdrawn") {
        const updated = PriceOffer.update(existingOffer.id, { proposedPrice, estimatedDeliveryDays, note: note || "", status: "pending" });
        return res.status(200).json({ success: true, message: "Price offer resubmitted", offer: updated });
      }
      return res.status(409).json({ success: false, message: "You have already submitted an offer for this order." });
    }

    const offer = PriceOffer.create({ orderId: order.id, logisticsId: req.user.id, proposedPrice, estimatedDeliveryDays, note: note || "" });

    notifyManufacturerNewBid(order, offer, offer.logistics?.companyName);

    return res.status(201).json({ success: true, message: "Price offer submitted successfully", offer });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getOffers = (req, res) => {
  try {
    const { orderId } = req.params;

    const order = Order.findByOrderId(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (req.user.role === "manufacturer" && String(order.manufacturer?.id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only view offers on your own orders" });
    }

    if (req.user.role === "logistics") {
      const myOffer = PriceOffer.findOne({ orderId: order.id, logisticsId: req.user.id });
      return res.status(200).json({ success: true, offers: myOffer ? [myOffer] : [] });
    }

    const offers = PriceOffer.find({ orderId: order.id, statusNe: "withdrawn" }, { sort: "po.proposed_price ASC" });
    return res.status(200).json({ success: true, offers, orderStatus: order.status });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const updateOffer = (req, res) => {
  try {
    const { offerId } = req.params;
    const { proposedPrice, estimatedDeliveryDays, note } = req.body;

    const offerById = PriceOffer.findById(parseInt(offerId, 10));
    if (!offerById || String(offerById.logistics?.id ?? offerById.logistics) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }
    if (offerById.status !== "pending") {
      return res.status(400).json({ success: false, message: `Cannot update an offer that is already ${offerById.status}` });
    }

    const updates = {};
    if (proposedPrice !== undefined) updates.proposedPrice = proposedPrice;
    if (estimatedDeliveryDays !== undefined) updates.estimatedDeliveryDays = estimatedDeliveryDays;
    if (note !== undefined) updates.note = note;

    const updated = PriceOffer.update(offerById.id, updates);
    return res.status(200).json({ success: true, message: "Offer updated successfully", offer: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const withdrawOffer = (req, res) => {
  try {
    const { offerId } = req.params;

    const offerById = PriceOffer.findById(parseInt(offerId, 10));
    if (!offerById || String(offerById.logistics?.id ?? offerById.logistics) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }
    if (offerById.status !== "pending") {
      return res.status(400).json({ success: false, message: `Cannot withdraw an offer that is already ${offerById.status}` });
    }

    PriceOffer.update(offerById.id, { status: "withdrawn" });
    return res.status(200).json({ success: true, message: "Offer withdrawn successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const acceptOffer = (req, res) => {
  try {
    const { orderId, offerId } = req.params;

    const order = Order.findByOrderId(orderId);
    if (!order || order.status !== "pending" || String(order.manufacturer?.id) !== String(req.user.id)) {
      return res.status(404).json({
        success: false,
        message: "Order not found, already accepted, or you do not own this order",
      });
    }

    const offer = PriceOffer.findById(parseInt(offerId, 10));
    if (!offer || offer.order !== order.id || offer.status !== "pending") {
      return res.status(404).json({ success: false, message: "Offer not found or no longer available" });
    }

    const logisticsId = offer.logistics?.id ?? offer.logistics;

    const acceptTransaction = db.transaction(() => {
      Order.update(order.id, { logisticsId, status: "accepted" });
      PriceOffer.update(offer.id, { status: "accepted" });
      PriceOffer.updateMany({ orderId: order.id, statusNe: "accepted" }, { status: "rejected" });
    });
    acceptTransaction();

    const rejectedOffers = PriceOffer.findPendingExcluding(order.id, offer.id);

    notifyLogisticsBidAccepted(offer, order);
    rejectedOffers.forEach((rejected) => {
      const rLogisticsId = rejected.logistics?.id ?? rejected.logistics;
      notifyLogisticsBidRejected(rLogisticsId, order.orderId, rejected.proposedPrice);
    });

    const updatedOrder = Order.findById(order.id);
    const updatedOffer = PriceOffer.findById(offer.id);

    return res.status(200).json({
      success: true,
      message: `Offer from ${updatedOffer.logistics?.companyName ?? "logistics"} accepted. Order confirmed.`,
      order: updatedOrder,
      offer: updatedOffer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getMyOffers = (req, res) => {
  try {
    const offers = PriceOffer.findWithOrder({ logisticsId: req.user.id });
    return res.status(200).json({ success: true, offers });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyOfferStats = (req, res) => {
  try {
    const stats = PriceOffer.getStats(req.user.id);
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { submitOffer, getOffers, updateOffer, withdrawOffer, acceptOffer, getMyOffers, getMyOfferStats };
