const PriceOffer = require("../models/priceOfferModel");
const Order = require("../models/orderModel");
const {
  notifyManufacturerNewBid,
  notifyLogisticsBidAccepted,
  notifyLogisticsBidRejected,
} = require("../websocket/orderEvents");

//  Submit a price offer (logistics only)
async function submitOffer(req, res) {
  try {
    if (req.user.role !== "logistics") {
      return res.status(403).json({
        success: false,
        message: "Only logistics companies can submit price offers",
      });
    }

    const { orderId } = req.params;
    const { proposedPrice, estimatedDeliveryDays, note } = req.body;

    if (!proposedPrice || proposedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid proposed price is required",
      });
    }
    if (!estimatedDeliveryDays || estimatedDeliveryDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Estimated delivery days is required",
      });
    }

    const order = await Order.findOne({
      orderId,
      status: "pending",
      logistics: null,
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or no longer available for bidding",
      });
    }

    const existingOffer = await PriceOffer.findOne({
      order: order._id,
      logistics: req.user.id,
    });

    if (existingOffer) {
      if (existingOffer.status === "withdrawn") {
        existingOffer.proposedPrice = proposedPrice;
        existingOffer.estimatedDeliveryDays = estimatedDeliveryDays;
        existingOffer.note = note || "";
        existingOffer.status = "pending";
        existingOffer.updatedAt = new Date();
        await existingOffer.save();

        const populated = await existingOffer.populate(
          "logistics",
          "companyName email",
        );
        return res.status(200).json({
          success: true,
          message: "Price offer resubmitted",
          offer: populated,
        });
      }

      return res.status(409).json({
        success: false,
        message: "You have already submitted an offer for this order.",
      });
    }

    const offer = new PriceOffer({
      order: order._id,
      orderId: order.orderId,
      logistics: req.user.id,
      proposedPrice,
      estimatedDeliveryDays,
      note: note || "",
    });

    await offer.save();

    const populated = await offer.populate("logistics", "companyName email");

    // Notify the manufacturer of the new bid
    notifyManufacturerNewBid(order, offer, populated.logistics.companyName);

    return res.status(201).json({
      success: true,
      message: "Price offer submitted successfully",
      offer: populated,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
}

//  Get offers for an order
async function getOffers(req, res) {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Manufacturer — only their own orders
    if (
      req.user.role === "manufacturer" &&
      order.manufacturer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view offers on your own orders",
      });
    }

    // Logistics — only their own offer
    if (req.user.role === "logistics") {
      const myOffer = await PriceOffer.findOne({
        order: order._id,
        logistics: req.user.id,
      }).populate("logistics", "companyName email");

      return res
        .status(200)
        .json({ success: true, offers: myOffer ? [myOffer] : [] });
    }

    // Manufacturer gets all non-withdrawn offers
    const offers = await PriceOffer.find({
      order: order._id,
      status: { $ne: "withdrawn" },
    })
      .populate("logistics", "companyName email companyLogo contactNumber")
      .sort({ proposedPrice: 1 });

    return res
      .status(200)
      .json({ success: true, offers, orderStatus: order.status });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
}

//  Update own offer (logistics only)
async function updateOffer(req, res) {
  try {
    if (req.user.role !== "logistics") {
      return res.status(403).json({
        success: false,
        message: "Only logistics companies can update offers",
      });
    }

    const { offerId } = req.params;
    const { proposedPrice, estimatedDeliveryDays, note } = req.body;

    const offer = await PriceOffer.findOne({
      _id: offerId,
      logistics: req.user.id,
    });
    if (!offer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }
    if (offer.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot update an offer that is already ${offer.status}`,
      });
    }

    if (proposedPrice !== undefined) offer.proposedPrice = proposedPrice;
    if (estimatedDeliveryDays !== undefined)
      offer.estimatedDeliveryDays = estimatedDeliveryDays;
    if (note !== undefined) offer.note = note;
    offer.updatedAt = new Date();
    await offer.save();

    const populated = await offer.populate("logistics", "companyName email");
    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      offer: populated,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
}

//  Withdraw own offer (logistics only)
async function withdrawOffer(req, res) {
  try {
    if (req.user.role !== "logistics") {
      return res.status(403).json({
        success: false,
        message: "Only logistics companies can withdraw offers",
      });
    }

    const { offerId } = req.params;
    const offer = await PriceOffer.findOne({
      _id: offerId,
      logistics: req.user.id,
    });

    if (!offer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }
    if (offer.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw an offer that is already ${offer.status}`,
      });
    }

    offer.status = "withdrawn";
    offer.updatedAt = new Date();
    await offer.save();

    return res
      .status(200)
      .json({ success: true, message: "Offer withdrawn successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
}

//  Accept an offer (manufacturer only)
async function acceptOffer(req, res) {
  try {
    if (req.user.role !== "manufacturer") {
      return res.status(403).json({
        success: false,
        message: "Only manufacturers can accept price offers",
      });
    }

    const { orderId, offerId } = req.params;

    const order = await Order.findOne({
      orderId,
      status: "pending",
      manufacturer: req.user.id,
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found, already accepted, or you do not own this order",
      });
    }

    const offer = await PriceOffer.findOne({
      _id: offerId,
      order: order._id,
      status: "pending",
    });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found or no longer available",
      });
    }

    // Assign logistics and confirm order
    order.logistics = offer.logistics;
    order.status = "accepted";
    order.updatedAt = new Date();
    await order.save();

    // Accept this offer
    offer.status = "accepted";
    offer.updatedAt = new Date();
    await offer.save();

    // Reject all other pending offers and notify them
    const rejectedOffers = await PriceOffer.find({
      order: order._id,
      _id: { $ne: offerId },
      status: "pending",
    });

    await PriceOffer.updateMany(
      { order: order._id, _id: { $ne: offerId }, status: "pending" },
      { status: "rejected", updatedAt: new Date() },
    );

    // Notify winning logistics
    notifyLogisticsBidAccepted(offer, order);

    // Notify each rejected logistics
    rejectedOffers.forEach((rejected) => {
      notifyLogisticsBidRejected(
        rejected.logistics,
        order.orderId,
        rejected.proposedPrice,
      );
    });

    const populatedOffer = await offer.populate(
      "logistics",
      "companyName email",
    );
    const populatedOrder = await order.populate([
      { path: "manufacturer", select: "companyName email" },
      { path: "logistics", select: "companyName email" },
    ]);

    return res.status(200).json({
      success: true,
      message: `Offer from ${populatedOffer.logistics.companyName} accepted. Order confirmed.`,
      order: populatedOrder,
      offer: populatedOffer,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
}

module.exports = {
  submitOffer,
  getOffers,
  updateOffer,
  withdrawOffer,
  acceptOffer,
};
