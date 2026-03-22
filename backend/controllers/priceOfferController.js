const PriceOffer = require("../models/priceOfferModel");
const Order = require("../models/orderModel");

// ── Submit a price offer
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

    // Validate required fields
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

    // Find the order — must be pending and not already assigned
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

    // Check if this logistics company already submitted an offer
    const existingOffer = await PriceOffer.findOne({
      order: order._id,
      logistics: req.user.id,
    });

    if (existingOffer) {
      // If previously withdrawn, allow resubmission by updating it
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
        message:
          "You have already submitted an offer for this order. Update your existing offer instead.",
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

    return res.status(201).json({
      success: true,
      message: "Price offer submitted successfully",
      offer: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

// ── Get all offers for an order (manufacturer only — their own orders)
async function getOffers(req, res) {
  try {
    const { orderId } = req.params;

    // Find the order and verify the requester owns it
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Manufacturer can only see offers on their own orders
    if (
      req.user.role === "manufacturer" &&
      order.manufacturer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view offers on your own orders",
      });
    }

    // Logistics can only see their own offer for this order
    if (req.user.role === "logistics") {
      const myOffer = await PriceOffer.findOne({
        order: order._id,
        logistics: req.user.id,
      }).populate("logistics", "companyName email");

      return res.status(200).json({
        success: true,
        offers: myOffer ? [myOffer] : [],
      });
    }

    const offers = await PriceOffer.find({
      order: order._id,
      status: { $ne: "withdrawn" },
    })
      .populate("logistics", "companyName email companyLogo contactNumber")
      .sort({ proposedPrice: 1 });

    return res.status(200).json({
      success: true,
      offers,
      orderStatus: order.status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

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
      logistics: req.user.id, // can only update own offer
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

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
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
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

    return res.status(200).json({
      success: true,
      message: "Offer withdrawn successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

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

    // Accept this offer — assign logistics company to the order
    order.logistics = offer.logistics;
    order.status = "accepted";
    order.updatedAt = new Date();
    await order.save();

    // Mark this offer as accepted
    offer.status = "accepted";
    offer.updatedAt = new Date();
    await offer.save();

    // Reject all other pending offers for this order
    await PriceOffer.updateMany(
      {
        order: order._id,
        _id: { $ne: offerId },
        status: "pending",
      },
      {
        status: "rejected",
        updatedAt: new Date(),
      },
    );

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

module.exports = {
  submitOffer,
  getOffers,
  updateOffer,
  withdrawOffer,
  acceptOffer,
};
