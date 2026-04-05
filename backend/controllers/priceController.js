import PriceOffer from "../models/priceOfferModel.js";
import Order from "../models/orderModel.js";
import {
  notifyManufacturerNewBid,
  notifyLogisticsBidAccepted,
  notifyLogisticsBidRejected,
} from "../websocket/orderEvents.js";

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

// Submit a price offer on an order (logistics only)
const submitOffer = async (req, res) => {
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
        message: "You have already submitted an offer for this order",
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
};

// Get all offers for a specific order
// Manufacturer gets all offers; logistics gets only their own offer
const getOffers = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (
      req.user.role === "manufacturer" &&
      order.manufacturer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view offers on your own orders",
      });
    }

    if (req.user.role === "logistics") {
      const myOffer = await PriceOffer.findOne({
        order: order._id,
        logistics: req.user.id,
      }).populate("logistics", "companyName email");

      return res
        .status(200)
        .json({ success: true, offers: myOffer ? [myOffer] : [] });
    }

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
};

// Get all offers submitted by the logged-in logistics user (paginated)
const getMyOffers = async (req, res) => {
  try {
    if (req.user.role !== "logistics") {
      return res
        .status(403)
        .json({ success: false, message: "Logistics only" });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = { logistics: req.user.id };

    const [offers, total] = await Promise.all([
      PriceOffer.find(filter)
        .populate({
          path: "order",
          populate: { path: "manufacturer", select: "companyName email" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PriceOffer.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      offers,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Update a pending offer (logistics only)
const updateOffer = async (req, res) => {
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
};

// Withdraw a pending offer (logistics only)
const withdrawOffer = async (req, res) => {
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
};

// Accept an offer and assign logistics to the order (manufacturer only)
const acceptOffer = async (req, res) => {
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

    order.logistics = offer.logistics;
    order.status = "accepted";
    order.updatedAt = new Date();
    await order.save();

    offer.status = "accepted";
    offer.updatedAt = new Date();
    await offer.save();

    // Reject all other pending offers
    const rejectedOffers = await PriceOffer.find({
      order: order._id,
      _id: { $ne: offerId },
      status: "pending",
    });

    await PriceOffer.updateMany(
      { order: order._id, _id: { $ne: offerId }, status: "pending" },
      { status: "rejected", updatedAt: new Date() },
    );

    notifyLogisticsBidAccepted(offer, order);
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
};

export {
  submitOffer,
  getOffers,
  getMyOffers,
  updateOffer,
  withdrawOffer,
  acceptOffer,
};
